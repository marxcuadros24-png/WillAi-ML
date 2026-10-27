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

    def __init__(self, test_id_or_keyword: str = "UPAHUACHO", max_iter: int = 25):
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
        self, eventos: List[Dict[str, Any]], theta: Tuple[float, float, float]
    ) -> Dict[str, Any]:
        """
        Evalúa un vector de parámetros [alfa_r0, alfa_viento, alfa_pendiente] sobre un conjunto de eventos.
        """
        alfa_r0, alfa_viento, alfa_pendiente = theta
        detalles = []
        ious = []
        dices = []

        for ev in eventos:
            poly_real = self.poligonos_reales[ev["id_evento"]]
            poly_sim, area_sim = self.validador.ejecutar_simulacion_evento(
                ev, alfa_r0=alfa_r0, alfa_viento=alfa_viento, alfa_pendiente=alfa_pendiente
            )
            m = self.validador.calcular_metricas_iou(poly_sim, poly_real)
            ious.append(m["iou_porcentaje"])
            dices.append(m["dice_f1_porcentaje"])
            detalles.append({
                "id_evento": ev["id_evento"],
                "nombre": ev["nombre"],
                "area_real_ha": m["area_real_ha"],
                "area_simulada_ha": m["area_simulada_ha"],
                "iou_porcentaje": m["iou_porcentaje"],
                "dice_f1_porcentaje": m["dice_f1_porcentaje"],
                "omision_porcentaje": m["omision_porcentaje"],
                "comision_porcentaje": m["comision_porcentaje"],
            })

        return {
            "iou_medio": round(float(np.mean(ious)), 2),
            "dice_medio": round(float(np.mean(dices)), 2),
            "detalles": detalles,
        }

    def calibrar(self) -> Dict[str, Any]:
        """
        Ejecuta la calibración Leave-One-Fire-Out con scipy.optimize.
        """
        self.preparar_datos_verdad_terreno()

        theta_baseline = [1.0, 1.0, 1.0]

        # 1. Rendimiento inicial (Línea Base)
        res_train_base = self.evaluar_conjunto(self.train_eventos, theta_baseline)
        res_test_base = self.evaluar_conjunto([self.test_evento], theta_baseline)

        # 2. Función de pérdida a minimizar: 1.0 - (IoU_medio / 100.0)
        historial_iteraciones = []

        def objetivo(theta):
            # Penalización suave si los parámetros salen de rango biofísico razonable
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
            eval_res = self.evaluar_conjunto(self.train_eventos, theta_clip)
            iou_medio = eval_res["iou_medio"]
            loss = (1.0 - (iou_medio / 100.0)) + penalizacion
            historial_iteraciones.append({
                "theta": [round(float(x), 3) for x in theta_clip],
                "iou_train": iou_medio,
                "loss": round(float(loss), 4)
            })
            return loss

        # 3. Optimización numérica con Powell (método de direcciones conjugadas sin derivadas)
        opt_res = minimize(
            objetivo,
            x0=theta_baseline,
            method="Powell",
            options={"maxiter": self.max_iter, "disp": False}
        )

        theta_opt = [
            round(max(0.2, min(3.5, float(opt_res.x[0]))), 3),
            round(max(0.1, min(4.0, float(opt_res.x[1]))), 3),
            round(max(0.1, min(4.0, float(opt_res.x[2]))), 3),
        ]

        # 4. Evaluación final de parámetros óptimos en Train y Test no visto
        res_train_opt = self.evaluar_conjunto(self.train_eventos, theta_opt)
        res_test_opt = self.evaluar_conjunto([self.test_evento], theta_opt)

        mejora_train = round(res_train_opt["iou_medio"] - res_train_base["iou_medio"], 2)
        mejora_test = round(res_test_opt["iou_medio"] - res_test_base["iou_medio"], 2)

        reporte = {
            "titulo": "Calibración Leave-One-Fire-Out (LOFO) del Simulador Elíptico Andino",
            "algoritmo_optimizador": "scipy.optimize.minimize (Powell)",
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
                "detalles": res_train_opt["detalles"],
            },
            "rendimiento_prueba_no_visto": {
                "iou_base": res_test_base["iou_medio"],
                "iou_calibrado": res_test_opt["iou_medio"],
                "mejora_iou_puntos": mejora_test,
                "dice_calibrado": res_test_opt["dice_medio"],
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
