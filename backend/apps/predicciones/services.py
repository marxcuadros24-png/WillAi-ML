"""
Servicios de Simulación de Propagación de Incendios Forestales.
Implementa el Patrón Estrategia para desacoplar el motor de cálculo
(soportando CA_ELIPTICO_ANDINO_V1 hoy y CELL2FIRE_CPP en el futuro).
"""
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.utils import timezone
from .models import SimulacionPropagacion, ResultadoPropagacion, ModeloPredictivo
from .motor_andino import SimuladorElipticoAndino
from apps.meteorologia.models import ObservacionMeteorologica

logger = logging.getLogger(__name__)


class EstrategiaPropagacion(ABC):
    """Interfaz abstracta del Patrón Estrategia para motores de propagación de fuego."""

    @abstractmethod
    def ejecutar(self, simulacion: SimulacionPropagacion) -> Dict[int, Dict[str, Any]]:
        """
        Ejecuta la simulación y retorna un diccionario con las isócronas calculadas:
        { paso_hora: { "hora_paso": int, "perimetro": MultiPolygon, "area_hectareas": float, "metadatos": dict } }
        """
        pass


class EstrategiaElipticoAndino(EstrategiaPropagacion):
    """
    Motor celular elíptico andino en Python puro (Dijkstra 8-vecinos, viento elíptico, pendiente DEM).
    """

    def ejecutar(self, simulacion: SimulacionPropagacion) -> Dict[int, Dict[str, Any]]:
        punto = simulacion.punto_ignicion
        lat = float(punto.y)
        lon = float(punto.x)

        params = simulacion.parametros_entrada or {}

        # 1. Resolver velocidad y dirección del viento
        viento_kmh = params.get('viento_kmh')
        dir_viento = params.get('dir_viento_grados')

        if viento_kmh is None or dir_viento is None:
            # Consultar última observación real de Open-Meteo
            obs = ObservacionMeteorologica.objects.order_by('-observada_en').first()
            if obs:
                viento_kmh = float(obs.viento_kmh if obs.viento_kmh is not None else 15.0)
                dir_viento = float(obs.direccion_viento_grados if obs.direccion_viento_grados is not None else 270.0)
            else:
                viento_kmh = 15.0
                dir_viento = 270.0
        else:
            viento_kmh = float(viento_kmh)
            dir_viento = float(dir_viento)

        # 2. Resolver FFMC (Humedad de combustibles finos)
        ffmc = params.get('ffmc')
        if ffmc is None:
            # Obtener del último cálculo FWI
            from .models import Prediccion
            pred_fwi = Prediccion.objects.filter(
                ejecucion__modelo__nombre__icontains="FWI"
            ).order_by('-creada_en').first()
            if pred_fwi and pred_fwi.incertidumbre and 'ffmc' in pred_fwi.incertidumbre:
                ffmc = float(pred_fwi.incertidumbre['ffmc'])
            else:
                ffmc = 85.0
        else:
            ffmc = float(ffmc)

        import os
        from django.conf import settings

        dem_path = params.get('ruta_dem') or params.get('dem_path')
        if not dem_path or not os.path.exists(dem_path):
            # Auto-conectar GeoTIFF local de Coracora si existe en disco
            posibles_rutas = [
                settings.BASE_DIR / 'data' / 'coracora_dem_utm18s.tif',
                settings.BASE_DIR.parent / 'data' / 'coracora_dem_utm18s.tif',
            ]
            for ruta in posibles_rutas:
                if ruta.exists():
                    dem_path = str(ruta.resolve())
                    # Persistir en parametros_entrada para trazabilidad forense
                    params['ruta_dem'] = dem_path
                    simulacion.parametros_entrada = params
                    simulacion.save(update_fields=['parametros_entrada'])
                    break

        combustible_path = params.get('ruta_combustible') or params.get('combustible_path')
        if not combustible_path or not os.path.exists(combustible_path):
            posibles_rutas_comb = [
                settings.BASE_DIR / 'data' / 'coracora_combustible_utm18s.tif',
                settings.BASE_DIR.parent / 'data' / 'coracora_combustible_utm18s.tif',
            ]
            for ruta in posibles_rutas_comb:
                if ruta.exists():
                    combustible_path = str(ruta.resolve())
                    params['ruta_combustible'] = combustible_path
                    simulacion.parametros_entrada = params
                    simulacion.save(update_fields=['parametros_entrada'])
                    break

        resolucion_m = float(params.get('resolucion_m', 30.0))
        grid_size = int(params.get('grid_size', 300))

        # Determinar horizontes de tiempo (por defecto 1h, 3h, 6h o según horizonte_horas)
        max_h = max(1, int(simulacion.horizonte_horas))
        if max_h <= 1:
            horizontes = (1,)
        elif max_h <= 3:
            horizontes = (1, max_h)
        else:
            horizontes = tuple(sorted(set([1, 3, max_h])))

        ensamble_viento = bool(params.get('ensamble_viento', False))
        delta_viento = float(params.get('delta_viento_grados', 15.0))

        # Multiplicadores biofísicos calibrados LOFO (Leave-One-Fire-Out)
        # Previenen la propagación exagerada ajustando la física al mosaico andino real
        alfa_r0 = params.get('alfa_r0')
        alfa_viento = params.get('alfa_viento')
        alfa_pendiente = params.get('alfa_pendiente')

        if alfa_r0 is None or alfa_viento is None or alfa_pendiente is None:
            artefacto_3fold = settings.BASE_DIR / 'apps' / 'predicciones' / 'artefactos' / 'calibracion_lofo_3fold.json'
            if artefacto_3fold.exists():
                try:
                    import json
                    with open(artefacto_3fold, 'r', encoding='utf-8') as f_art:
                        meta_art = json.load(f_art)
                        opt_rec = meta_art.get('multiplicadores_optimos_recomendados', {})
                        if alfa_r0 is None:
                            alfa_r0 = opt_rec.get('alfa_r0', 0.495)
                        if alfa_viento is None:
                            alfa_viento = opt_rec.get('alfa_viento', 0.762)
                        if alfa_pendiente is None:
                            alfa_pendiente = opt_rec.get('alfa_pendiente', 1.0)
                except Exception:
                    pass

            alfa_r0 = float(alfa_r0 if alfa_r0 is not None else 0.495)
            alfa_viento = float(alfa_viento if alfa_viento is not None else 0.762)
            alfa_pendiente = float(alfa_pendiente if alfa_pendiente is not None else 1.0)
        else:
            alfa_r0 = float(alfa_r0)
            alfa_viento = float(alfa_viento)
            alfa_pendiente = float(alfa_pendiente)

        simulador = SimuladorElipticoAndino(
            lat=lat,
            lon=lon,
            viento_kmh=viento_kmh,
            dir_viento_grados=dir_viento,
            ffmc=ffmc,
            resolucion_m=resolucion_m,
            grid_size=grid_size,
            dem_path=dem_path,
            combustible_path=combustible_path,
            alfa_r0=alfa_r0,
            alfa_viento=alfa_viento,
            alfa_pendiente=alfa_pendiente,
            ensamble_viento=ensamble_viento,
            delta_viento_grados=delta_viento,
        )

        return simulador.simular(horizontes_horas=horizontes)


class EstrategiaCell2FireCPP(EstrategiaPropagacion):
    """
    Estrategia preparada para futuras integraciones de binarios nativos externos (Cell2Fire C++).
    """

    def ejecutar(self, simulacion: SimulacionPropagacion) -> Dict[int, Dict[str, Any]]:
        logger.info(f"Derivando simulación #{simulacion.id_simulacion} al motor elíptico andino como fallback seguro.")
        return EstrategiaElipticoAndino().ejecutar(simulacion)


# Registro de estrategias según el nombre del modelo
REGISTRO_ESTRATEGIAS: Dict[str, EstrategiaPropagacion] = {
    "CA_ELIPTICO_ANDINO_V1": EstrategiaElipticoAndino(),
    "ELIPTICO_ANDINO": EstrategiaElipticoAndino(),
    "CELL2FIRE_CPP": EstrategiaCell2FireCPP(),
}


def obtener_estrategia(nombre_modelo: str) -> EstrategiaPropagacion:
    """Retorna la estrategia correspondiente según el nombre o algoritmo del modelo."""
    nombre_norm = (nombre_modelo or "").upper().strip()
    for clave, estrategia in REGISTRO_ESTRATEGIAS.items():
        if clave in nombre_norm or nombre_norm in clave:
            return estrategia
    # Por defecto, usar motor elíptico andino V1
    return EstrategiaElipticoAndino()


def ejecutar_simulacion_propagacion(simulacion_id: int) -> Dict[str, Any]:
    """
    Servicio desacoplado que ejecuta la simulación de propagación usando el Patrón Estrategia.
    Actualiza el estado de la simulación y persiste los resultados en ResultadoPropagacion.
    """
    try:
        simulacion = SimulacionPropagacion.objects.select_related('modelo_motor').get(id_simulacion=simulacion_id)
    except SimulacionPropagacion.DoesNotExist:
        logger.error(f"SimulacionPropagacion #{simulacion_id} no encontrada.")
        return {"status": "error", "mensaje": f"Simulación #{simulacion_id} no existe."}

    simulacion.estado = SimulacionPropagacion.EstadoSimulacion.CORRIENDO
    simulacion.iniciado_en = timezone.now()
    simulacion.save(update_fields=['estado', 'iniciado_en'])

    try:
        estrategia = obtener_estrategia(simulacion.modelo_motor.nombre)
        resultados_pasos = estrategia.ejecutar(simulacion)

        # Persistir cada isócrona en la base de datos
        creados = []
        for hora_paso, datos in resultados_pasos.items():
            resultado, _ = ResultadoPropagacion.objects.update_or_create(
                simulacion=simulacion,
                hora_paso=hora_paso,
                defaults={
                    "perimetro": datos["perimetro"],
                    "area_hectareas": datos["area_hectareas"],
                    "metadatos": datos["metadatos"],
                }
            )
            creados.append(resultado)

        simulacion.estado = SimulacionPropagacion.EstadoSimulacion.COMPLETADO
        simulacion.finalizado_en = timezone.now()
        simulacion.errores = None
        simulacion.save(update_fields=['estado', 'finalizado_en', 'errores'])

        logger.info(f"Simulación #{simulacion_id} completada exitosamente con {len(creados)} isócronas.")
        return {
            "status": "ok",
            "id_simulacion": simulacion_id,
            "isocronas": len(creados),
            "estado": simulacion.estado,
            "requiere_revision_humana": simulacion.requiere_revision_humana,
        }

    except Exception as e:
        logger.exception(f"Error al ejecutar simulación #{simulacion_id}: {e}")
        simulacion.estado = SimulacionPropagacion.EstadoSimulacion.ERROR
        simulacion.finalizado_en = timezone.now()
        simulacion.errores = str(e)
        simulacion.save(update_fields=['estado', 'finalizado_en', 'errores'])
        return {
            "status": "error",
            "id_simulacion": simulacion_id,
            "error": str(e),
        }
