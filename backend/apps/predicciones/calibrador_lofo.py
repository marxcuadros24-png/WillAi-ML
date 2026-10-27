r"""
Módulo de Calibración Física Leave-One-Fire-Out (LOFO) para el Simulador Elíptico Andino WillAI.

Ajusta 3 multiplicadores biofísicos:
- alfa_r0: Multiplicador de tasa base de propagación del combustible
- alfa_viento: Multiplicador de sensibilidad elíptica al viento
- alfa_pendiente: Multiplicador del empuje por pendiente andina (Rothermel / Van Wagner)

Metodología Leave-One-Fire-Out:
1. Divide los 3 incendios históricos oficiales FIRMS en 2 de entrenamiento y 1 de prueba (held-out).
2. Optimiza los parámetros con scipy.optimize.minimize (Powell / Nelder-Mead) maximizando el IoU medio de entrenamiento.
3. Evalúa los parámetros calibrados en el incendio de prueba no visto, garantizando CERO data leakage.
"""

import json
import logging
import os
from typing import Dict, Any, List, Tuple
import numpy as np
from scipy.optimize import minimize

from apps.predicciones.validador_dnbr import (
    ValidadorVerdadTerrenoDNBR,
    EVENTOS_HISTORICOS_FIRMS,
)

logger = logging.getLogger(__name__)


class CalibradorLOFO:
    """
    Calibrador de hiperparámetros biofísicos mediante validación cruzada Leave-One-Fire-Out.
    """

    def __init__(self, test_id_or_keyword: str = "UPAHUACHO", max_iter: int = 3):
        self.validador = ValidadorVerdadTerrenoDNBR(umbral_dnbr=0.12, radio_m=3500.0)
        self.max_iter = max_iter
        self.test_keyword = test_id_or_keyword.upper()

        # Partición Leave-One-Fire-Out
        self.train_eventos: List[Dict[str, Any]] = []
        self.test_evento: Dict[str, Any] = None

        for ev in EVENTOS_HISTORICOS_FIRMS:
            if self.test_keyword in ev["id_evento"].upper() or self.test_keyword in ev["distrito"].upper():
                self.test_evento = ev
            else:
                self.train_eventos.append(ev)

        # Fallback si no hubo coincidencia: el 3.º (Upahuacho) es test
        if self.test_evento is None:
            self.test_evento = EVENTOS_HISTORICOS_FIRMS[-1]
            self.train_eventos = EVENTOS_HISTORICOS_FIRMS[:-1]

    def preparar_datos_verdad_terreno(self):
        """
        Pre-extrae los polígonos reales quemados dNBR y los combustibles pre-incendio
        para evitar re-descargas repetitivas durante las iteraciones de optimización.
        """
        self.poligonos_reales = {}
        for ev in EVENTOS_HISTORICOS_FIRMS:
            poly_real, area_real, stats = self.validador.extraer_poligono_dnbr_real(ev)
            self.poligonos_reales[ev["id_evento"]] = poly_real

    def evaluar_conjunto(
        self,
        eventos: List[Dict[str, Any]],
        theta: Tuple[float, float, float],
        ensamble_viento: bool = False,
    ) -> Dict[str, Any]:
        """
        Evalúa un vector de parámetros [alfa_r0, alfa_viento, alfa_pendiente] sobre un conjunto de eventos.
        Registra IoU, Dice/F1 y Distancia Hausdorff (en metros).
        """
        alfa_r0, alfa_viento, alfa_pendiente = theta
        detalles = []
        ious = []
        dices = []
        hausdorffs = []
        omisiones = []
        comisiones = []

        for ev in eventos:
            poly_real = self.poligonos_reales[ev["id_evento"]]
            poly_sim, area_sim = self.validador.ejecutar_simulacion_evento(
                ev,
                alfa_r0=alfa_r0,
                alfa_viento=alfa_viento,
                alfa_pendiente=alfa_pendiente,
                ensamble_viento=ensamble_viento,
            )
            m = self.validador.calcular_metricas_iou(poly_sim, poly_real)
            ious.append(m["iou_porcentaje"])
            dices.append(m["dice_f1_porcentaje"])
            hausdorffs.append(m["distancia_hausdorff_m"])
            omisiones.append(m["omision_porcentaje"])
            comisiones.append(m["comision_porcentaje"])
            detalles.append({
                "id_evento": ev["id_evento"],
                "nombre": ev["nombre"],
                "area_real_ha": m["area_real_ha"],
                "area_simulada_ha": m["area_simulada_ha"],
                "iou_porcentaje": m["iou_porcentaje"],
                "dice_f1_porcentaje": m["dice_f1_porcentaje"],
                "distancia_hausdorff_m": m["distancia_hausdorff_m"],
                "omision_porcentaje": m["omision_porcentaje"],
                "comision_porcentaje": m["comision_porcentaje"],
            })

        return {
            "iou_medio": round(float(np.mean(ious)), 2),
            "dice_medio": round(float(np.mean(dices)), 2),
            "distancia_hausdorff_media_m": round(float(np.mean(hausdorffs)), 1),
            "omision_media": round(float(np.mean(omisiones)), 2),
            "comision_media": round(float(np.mean(comisiones)), 2),
            "detalles": detalles,
        }

    def calibrar(self, ensamble_viento: bool = False) -> Dict[str, Any]:
        """
        Ejecuta la calibración Leave-One-Fire-Out con scipy.optimize para el fold configurado.
        """
        self.preparar_datos_verdad_terreno()

        theta_baseline = [1.0, 1.0, 1.0]

        # 1. Rendimiento inicial (Línea Base)
        res_train_base = self.evaluar_conjunto(self.train_eventos, theta_baseline, ensamble_viento=ensamble_viento)
        res_test_base = self.evaluar_conjunto([self.test_evento], theta_baseline, ensamble_viento=ensamble_viento)

        # 2. Función de pérdida a minimizar: 1.0 - (IoU_medio / 100.0)
        historial_iteraciones = []

        def objetivo(theta):
            penalizacion = 0.0
            r0, v, p = theta
            if r0 < 0.2: penalizacion += (0.2 - r0) ** 2 * 10
            if r0 > 3.5: penalizacion += (r0 - 3.5) ** 2 * 10
            if v < 0.1: penalizacion += (0.1 - v) ** 2 * 10
            if v > 4.0: penalizacion += (v - 4.0) ** 2 * 10
            if p < 0.1: penalizacion += (0.1 - p) ** 2 * 10
            if p > 4.0: penalizacion += (p - 4.0) ** 2 * 10

            theta_clip = (
                max(0.2, min(3.5, r0)),
                max(0.1, min(4.0, v)),
                max(0.1, min(4.0, p)),
            )
            eval_res = self.evaluar_conjunto(self.train_eventos, theta_clip, ensamble_viento=ensamble_viento)
            iou_medio = eval_res["iou_medio"]
            loss = (1.0 - (iou_medio / 100.0)) + penalizacion
            historial_iteraciones.append({
                "theta": [round(float(x), 3) for x in theta_clip],
                "iou_train": iou_medio,
                "loss": round(float(loss), 4)
            })
            return loss

        # 3. Optimización numérica con Powell
        opt_res = minimize(
            objetivo,
            x0=theta_baseline,
            method="Powell",
            options={"maxiter": self.max_iter, "ftol": 0.01, "disp": False}
        )

        theta_opt = [
            round(max(0.2, min(3.5, float(opt_res.x[0]))), 3),
            round(max(0.1, min(4.0, float(opt_res.x[1]))), 3),
            round(max(0.1, min(4.0, float(opt_res.x[2]))), 3),
        ]

        # 4. Evaluación final de parámetros óptimos en Train y Test no visto
        res_train_opt = self.evaluar_conjunto(self.train_eventos, theta_opt, ensamble_viento=ensamble_viento)
        res_test_opt = self.evaluar_conjunto([self.test_evento], theta_opt, ensamble_viento=ensamble_viento)

        mejora_train = round(res_train_opt["iou_medio"] - res_train_base["iou_medio"], 2)
        mejora_test = round(res_test_opt["iou_medio"] - res_test_base["iou_medio"], 2)
        reduccion_hausdorff_test = round(
            res_test_base["distancia_hausdorff_media_m"] - res_test_opt["distancia_hausdorff_media_m"], 1
        )

        reporte = {
            "titulo": "Calibración Leave-One-Fire-Out (LOFO) del Simulador Elíptico Andino",
            "algoritmo_optimizador": "scipy.optimize.minimize (Powell)",
            "ensamble_viento": bool(ensamble_viento),
            "evento_prueba_held_out": {
                "id_evento": self.test_evento["id_evento"],
                "nombre": self.test_evento["nombre"],
                "distrito": self.test_evento["distrito"],
            },
            "eventos_entrenamiento": [
                {"id_evento": e["id_evento"], "nombre": e["nombre"], "distrito": e["distrito"]}
                for e in self.train_eventos
            ],
            "multiplicadores_base": {
                "alfa_r0": 1.0,
                "alfa_viento": 1.0,
                "alfa_pendiente": 1.0,
            },
            "multiplicadores_optimos": {
                "alfa_r0": theta_opt[0],
                "alfa_viento": theta_opt[1],
                "alfa_pendiente": theta_opt[2],
            },
            "rendimiento_entrenamiento": {
                "iou_base": res_train_base["iou_medio"],
                "iou_calibrado": res_train_opt["iou_medio"],
                "mejora_iou_puntos": mejora_train,
                "dice_calibrado": res_train_opt["dice_medio"],
                "hausdorff_base_m": res_train_base["distancia_hausdorff_media_m"],
                "hausdorff_calibrado_m": res_train_opt["distancia_hausdorff_media_m"],
                "reduccion_hausdorff_m": round(
                    res_train_base["distancia_hausdorff_media_m"] - res_train_opt["distancia_hausdorff_media_m"], 1
                ),
                "detalles": res_train_opt["detalles"],
            },
            "rendimiento_prueba_no_visto": {
                "iou_base": res_test_base["iou_medio"],
                "iou_calibrado": res_test_opt["iou_medio"],
                "mejora_iou_puntos": mejora_test,
                "dice_calibrado": res_test_opt["dice_medio"],
                "hausdorff_base_m": res_test_base["distancia_hausdorff_media_m"],
                "hausdorff_calibrado_m": res_test_opt["distancia_hausdorff_media_m"],
                "reduccion_hausdorff_m": reduccion_hausdorff_test,
                "detalles": res_test_opt["detalles"],
            },
            "total_iteraciones_evaluadas": len(historial_iteraciones),
        }

        # Guardar artefacto JSON
        ruta_artefacto = os.path.join(
            os.path.dirname(__file__), "artefactos", "calibracion_lofo_iou.json"
        )
        os.makedirs(os.path.dirname(ruta_artefacto), exist_ok=True)
        with open(ruta_artefacto, "w", encoding="utf-8") as f:
            json.dump(reporte, f, indent=2, ensure_ascii=False)

        return reporte

    def calibrar_3fold_cv(self, ensamble_viento: bool = False, max_iter: int = None) -> Dict[str, Any]:
        """
        Ejecuta el ciclo completo de validación cruzada 3-Fold Leave-One-Fire-Out (LOFO)
        rotando secuencialmente cada uno de los 3 incendios históricos como conjunto de prueba no visto:
          - Fold 1: Test = HUAC_CANA,   Train = [CHUMPI, UPAHUACHO]
          - Fold 2: Test = CHUMPI,      Train = [HUAC_CANA, UPAHUACHO]
          - Fold 3: Test = UPAHUACHO,   Train = [HUAC_CANA, CHUMPI]

        Calcula el IoU, Dice/F1 y Error de Distancia Hausdorff (en metros) por cada fold y
        consolida los promedios macro de generalización empírica sin data leakage.
        """
        self.preparar_datos_verdad_terreno()
        iter_limite = max_iter or self.max_iter

        folds_config = [
            {"keyword": "HUACCANA", "nombre": "Huac-Cana / Coracora Sur"},
            {"keyword": "CHUMPI", "nombre": "Chumpi / Incuyo"},
            {"keyword": "UPAHUACHO", "nombre": "Upahuacho / Parinacochas Norte"},
        ]

        resultados_folds = []
        ious_test_base = []
        ious_test_opt = []
        dices_test_opt = []
        hausdorff_test_base = []
        hausdorff_test_opt = []
        omisiones_test_opt = []
        thetas_optimos = []

        theta_baseline = [1.0, 1.0, 1.0]

        for i, cfg in enumerate(folds_config, 1):
            key = cfg["keyword"]
            # Particionar
            test_ev = None
            train_evs = []
            for ev in EVENTOS_HISTORICOS_FIRMS:
                if key in ev["id_evento"].upper() or key in ev["distrito"].upper():
                    test_ev = ev
                else:
                    train_evs.append(ev)

            if test_ev is None:
                continue

            # 1. Base
            res_tr_base = self.evaluar_conjunto(train_evs, theta_baseline, ensamble_viento=ensamble_viento)
            res_ts_base = self.evaluar_conjunto([test_ev], theta_baseline, ensamble_viento=ensamble_viento)

            # 2. Optimización con Powell
            def obj(theta):
                r0, v, p = theta
                pen = 0.0
                if r0 < 0.2: pen += (0.2 - r0) ** 2 * 10
                if r0 > 3.5: pen += (r0 - 3.5) ** 2 * 10
                if v < 0.1: pen += (0.1 - v) ** 2 * 10
                if v > 4.0: pen += (v - 4.0) ** 2 * 10
                if p < 0.1: pen += (0.1 - p) ** 2 * 10
                if p > 4.0: pen += (p - 4.0) ** 2 * 10

                t_clip = (
                    max(0.2, min(3.5, r0)),
                    max(0.1, min(4.0, v)),
                    max(0.1, min(4.0, p)),
                )
                ev_res = self.evaluar_conjunto(train_evs, t_clip, ensamble_viento=ensamble_viento)
                return (1.0 - (ev_res["iou_medio"] / 100.0)) + pen

            opt = minimize(
                obj,
                x0=theta_baseline,
                method="Powell",
                options={"maxiter": iter_limite, "ftol": 0.02, "disp": False}
            )

            th_opt = [
                round(max(0.2, min(3.5, float(opt.x[0]))), 3),
                round(max(0.1, min(4.0, float(opt.x[1]))), 3),
                round(max(0.1, min(4.0, float(opt.x[2]))), 3),
            ]
            thetas_optimos.append(th_opt)

            # 3. Evaluación de generalización en test
            res_tr_opt = self.evaluar_conjunto(train_evs, th_opt, ensamble_viento=ensamble_viento)
            res_ts_opt = self.evaluar_conjunto([test_ev], th_opt, ensamble_viento=ensamble_viento)

            iou_b = res_ts_base["iou_medio"]
            iou_c = res_ts_opt["iou_medio"]
            dice_c = res_ts_opt["dice_medio"]
            h_b = res_ts_base["distancia_hausdorff_media_m"]
            h_c = res_ts_opt["distancia_hausdorff_media_m"]
            omis_c = res_ts_opt["omision_media"]

            ious_test_base.append(iou_b)
            ious_test_opt.append(iou_c)
            dices_test_opt.append(dice_c)
            hausdorff_test_base.append(h_b)
            hausdorff_test_opt.append(h_c)
            omisiones_test_opt.append(omis_c)

            resultados_folds.append({
                "fold_numero": i,
                "incendio_prueba": {
                    "id_evento": test_ev["id_evento"],
                    "nombre": test_ev["nombre"],
                    "distrito": test_ev["distrito"],
                },
                "incendios_entrenamiento": [
                    {"id_evento": te["id_evento"], "distrito": te["distrito"]} for te in train_evs
                ],
                "multiplicadores_optimos": {
                    "alfa_r0": th_opt[0],
                    "alfa_viento": th_opt[1],
                    "alfa_pendiente": th_opt[2],
                },
                "entrenamiento": {
                    "iou_base": res_tr_base["iou_medio"],
                    "iou_calibrado": res_tr_opt["iou_medio"],
                    "mejora_iou": round(res_tr_opt["iou_medio"] - res_tr_base["iou_medio"], 2),
                    "hausdorff_base_m": res_tr_base["distancia_hausdorff_media_m"],
                    "hausdorff_calibrado_m": res_tr_opt["distancia_hausdorff_media_m"],
                },
                "prueba_no_vista": {
                    "iou_base": iou_b,
                    "iou_calibrado": iou_c,
                    "mejora_iou": round(iou_c - iou_b, 2),
                    "dice_calibrado": dice_c,
                    "hausdorff_base_m": h_b,
                    "hausdorff_calibrado_m": h_c,
                    "reduccion_hausdorff_m": round(h_b - h_c, 1),
                    "omision_calibrada": omis_c,
                    "comision_calibrada": res_ts_opt["comision_media"],
                    "detalles": res_ts_opt["detalles"],
                }
            })

        # Promedios macro entre los 3 folds de prueba
        media_iou_base = round(float(np.mean(ious_test_base)), 2)
        media_iou_opt = round(float(np.mean(ious_test_opt)), 2)
        media_mejora_iou = round(media_iou_opt - media_iou_base, 2)
        media_dice_opt = round(float(np.mean(dices_test_opt)), 2)
        media_h_base = round(float(np.mean(hausdorff_test_base)), 1)
        media_h_opt = round(float(np.mean(hausdorff_test_opt)), 1)
        media_reduccion_h = round(media_h_base - media_h_opt, 1)
        media_omision_opt = round(float(np.mean(omisiones_test_opt)), 2)

        # Multiplicadores óptimos promedio consolidados
        alfa_r0_prom = round(float(np.mean([t[0] for t in thetas_optimos])), 3)
        alfa_viento_prom = round(float(np.mean([t[1] for t in thetas_optimos])), 3)
        alfa_pendiente_prom = round(float(np.mean([t[2] for t in thetas_optimos])), 3)

        reporte_3fold = {
            "titulo": "Validación Cruzada 3-Fold Leave-One-Fire-Out (LOFO) del Simulador Elíptico Andino",
            "metodologia": "Leave-One-Fire-Out (3 folds rotativos sin data leakage)",
            "ensamble_viento": bool(ensamble_viento),
            "optimizador": f"scipy.optimize.minimize (Powell, maxiter={iter_limite})",
            "total_folds": len(resultados_folds),
            "resumen_macro_3fold": {
                "iou_test_base_medio_porcentaje": media_iou_base,
                "iou_test_calibrado_medio_porcentaje": media_iou_opt,
                "mejora_iou_media_puntos": media_mejora_iou,
                "dice_f1_test_calibrado_medio_porcentaje": media_dice_opt,
                "distancia_hausdorff_test_base_media_m": media_h_base,
                "distancia_hausdorff_test_calibrado_media_m": media_h_opt,
                "reduccion_distancia_hausdorff_media_m": media_reduccion_h,
                "error_omision_test_medio_porcentaje": media_omision_opt,
            },
            "multiplicadores_optimos_recomendados": {
                "alfa_r0": alfa_r0_prom,
                "alfa_viento": alfa_viento_prom,
                "alfa_pendiente": alfa_pendiente_prom,
            },
            "folds": resultados_folds,
        }

        # Guardar artefacto de la validación 3-Fold
        ruta_3fold = os.path.join(
            os.path.dirname(__file__), "artefactos", "calibracion_lofo_3fold.json"
        )
        os.makedirs(os.path.dirname(ruta_3fold), exist_ok=True)
        with open(ruta_3fold, "w", encoding="utf-8") as f:
            json.dump(reporte_3fold, f, indent=2, ensure_ascii=False)

        # También actualizar calibracion_lofo_iou.json con los parámetros recomendados del 3-Fold
        ruta_lofo_single = os.path.join(
            os.path.dirname(__file__), "artefactos", "calibracion_lofo_iou.json"
        )
        with open(ruta_lofo_single, "w", encoding="utf-8") as f:
            json.dump({
                "titulo": "Calibración LOFO 3-Fold Consolidada (Parámetros Óptimos WillAI)",
                "ensamble_viento": bool(ensamble_viento),
                "multiplicadores_base": {"alfa_r0": 1.0, "alfa_viento": 1.0, "alfa_pendiente": 1.0},
                "multiplicadores_optimos": reporte_3fold["multiplicadores_optimos_recomendados"],
                "rendimiento_macro_cv": reporte_3fold["resumen_macro_3fold"],
            }, f, indent=2, ensure_ascii=False)

        logger.info(f"Artefacto 3-Fold LOFO guardado en: {ruta_3fold}")
        return reporte_3fold
