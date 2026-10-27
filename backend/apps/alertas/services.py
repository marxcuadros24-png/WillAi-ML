"""
Servicios y helpers de evaluación de riesgo y alerta temprana ante incendios forestales.
"""
import logging
from typing import Dict, Any, List
from django.db import connection
from django.utils import timezone
from .models import AlertaEmergencia
from apps.meteorologia.models import Vivienda
from apps.predicciones.models import SimulacionPropagacion, ResultadoPropagacion
from apps.predicciones.gis_compat import is_postgis_available
import shapely
from shapely.geometry import Point as SPoint, shape
from shapely.ops import transform as geom_transform
from rasterio.warp import transform

logger = logging.getLogger(__name__)


def evaluar_viviendas_en_riesgo_simulacion(simulacion_id: int, distancia_km: float = 5.0) -> Dict[str, Any]:
    """
    Evalúa las viviendas a menos de `distancia_km` (default: 5 km) del perímetro
    de la isócrona de 6 horas de una simulación.
    Utiliza ST_DWithin de PostGIS cuando está disponible, con fallback geodésico resiliente.

    CRÍTICO DE SEGURIDAD:
    La alerta generada nace SIEMPRE en estado PENDIENTE_APROBACION (requiere confirmación
    explícita del operador de emergencia COEP/COEL antes de ser enviada al público).
    """
    try:
        simulacion = SimulacionPropagacion.objects.select_related('incidente').get(pk=simulacion_id)
    except SimulacionPropagacion.DoesNotExist:
        return {"error": f"Simulacion #{simulacion_id} no existe", "viviendas_en_riesgo_count": 0}

    # Obtener el perímetro de la isócrona más avanzada (idealmente 6h)
    resultado_6h = (
        simulacion.resultados.filter(hora_paso=6).first()
        or simulacion.resultados.order_by('-hora_paso').first()
    )

    if not resultado_6h or not resultado_6h.perimetro:
        return {
            "simulacion_id": simulacion_id,
            "viviendas_en_riesgo_count": 0,
            "mensaje": "La simulación no posee resultados o perímetros calculados.",
        }

    distancia_metros = float(distancia_km) * 1000.0
    viviendas_en_riesgo = []

    # 1. Ejecutar consulta espacial con ST_DWithin si PostGIS nativo está disponible
    # Opera en proyección métrica UTM 18S (EPSG:32718) o tipo geography (esferoide métrico)
    if is_postgis_available(connection):
        try:
            # Se utiliza ST_Transform a EPSG:32718 (UTM 18S) para garantizar distancias métricas euclidianas exactas
            sql = """
                SELECT v.id_vivienda, v.latitud, v.longitud,
                       ST_Distance(
                           ST_Transform(ST_SetSRID(ST_MakePoint(v.longitud::float8, v.latitud::float8), 4326), 32718),
                           ST_Transform(ST_GeomFromText(%s, 4326), 32718)
                       ) AS dist_m
                FROM viviendas v
                WHERE v.activa = TRUE
                  AND ST_DWithin(
                      ST_Transform(ST_SetSRID(ST_MakePoint(v.longitud::float8, v.latitud::float8), 4326), 32718),
                      ST_Transform(ST_GeomFromText(%s, 4326), 32718),
                      %s
                  )
            """
            with connection.cursor() as cur:
                wkt_perimetro = resultado_6h.perimetro.wkt
                cur.execute(sql, [wkt_perimetro, wkt_perimetro, distancia_metros])
                rows = cur.fetchall()
                for r in rows:
                    viviendas_en_riesgo.append({
                        "id_vivienda": r[0],
                        "latitud": float(r[1]),
                        "longitud": float(r[2]),
                        "distancia_metros": round(float(r[3]), 2) if r[3] is not None else None
                    })
        except Exception as e:
            logger.warning(f"Error en consulta ST_DWithin de PostGIS: {e}. Usando fallback geométrico.")
            viviendas_en_riesgo = []

    # 2. Fallback geométrico / geodésico (cuando PostGIS C-extension no está instalada en host)
    if not is_postgis_available(connection) or not viviendas_en_riesgo:
        try:
            # Proyectar perímetro a UTM 18S métrico para calcular distancias exactas en metros
            import json
            geom_json = json.loads(resultado_6h.perimetro.geojson)
            perimetro_shapely = shape(geom_json)

            def to_utm(coords):
                xs, ys = coords[:, 0], coords[:, 1]
                ux, uy = transform('EPSG:4326', 'EPSG:32718', xs, ys)
                import numpy as np
                return np.column_stack([ux, uy])

            perimetro_utm = shapely.transform(perimetro_shapely, to_utm)

            for viv in Vivienda.objects.filter(activa=True):
                # Coordenadas UTM de la vivienda
                uxs, uys = transform('EPSG:4326', 'EPSG:32718', [float(viv.longitud)], [float(viv.latitud)])
                punto_utm = SPoint(uxs[0], uys[0])
                distancia_calculada = perimetro_utm.distance(punto_utm)

                if distancia_calculada <= distancia_metros:
                    viviendas_en_riesgo.append({
                        "id_vivienda": viv.id_vivienda,
                        "latitud": float(viv.latitud),
                        "longitud": float(viv.longitud),
                        "distancia_metros": round(distancia_calculada, 2)
                    })
        except Exception as e:
            logger.error(f"Error en fallback geométrico de cálculo de distancias: {e}")

    total_afectadas = len(viviendas_en_riesgo)
    alerta_creada = None

    # Si se identificaron viviendas dentro del radio de 5km del frente de 6h:
    if total_afectadas > 0:
        titulo = f"Riesgo de Fuego a {distancia_km}km — {total_afectadas} viviendas (Isócrona {resultado_6h.hora_paso}h)"
        mensaje = (
            f"El motor de propagación prevé que en {resultado_6h.hora_paso} horas el frente de fuego "
            f"se aproxime a menos de {distancia_km} km de {total_afectadas} viviendas rurales registradas. "
            f"Esta alerta se encuentra en estado PENDIENTE DE REVISIÓN HUMANA para validación de operadores COEP/COEL."
        )

        alerta_creada = AlertaEmergencia.objects.create(
            incidente=simulacion.incidente,
            tipo=AlertaEmergencia.TipoAlerta.RIESGO_VIVIENDA,
            prioridad=AlertaEmergencia.PrioridadAlerta.ALTA,
            titulo=titulo,
            mensaje=mensaje,
            instrucciones="Verificar con brigada comunal más cercana y evaluar orden preventiva.",
            estado=AlertaEmergencia.EstadoAlerta.PENDIENTE_APROBACION,  # CRÍTICO: nunca enviada automáticamente
        )

    return {
        "status": "ok",
        "simulacion_id": simulacion_id,
        "hora_paso": resultado_6h.hora_paso,
        "distancia_km": distancia_km,
        "viviendas_en_riesgo_count": total_afectadas,
        "viviendas": viviendas_en_riesgo,
        "alerta_id": alerta_creada.id_alerta if alerta_creada else None,
        "estado_alerta": alerta_creada.estado if alerta_creada else None,
        "requiere_confirmacion_humana": True,
    }
