from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from .models import ModeloPredictivo, EjecucionModelo, Prediccion
from .fwi import calcular_sistema_fwi_completo
from apps.meteorologia.models import ObservacionMeteorologica

CORACORA_LAT = -15.0189
CORACORA_LON = -73.7806


@shared_task(name="calcular_riesgo_fwi_task")
def calcular_riesgo_fwi_task(lat=CORACORA_LAT, lon=CORACORA_LON):
    """
    Calcula el peligro de incendios forestales usando el Sistema Canadiense FWI
    a partir de las últimas observaciones meteorológicas de Coracora.
    """
    modelo, _ = ModeloPredictivo.objects.get_or_create(
        nombre="Sistema Canadiense FWI",
        version="1.0.0",
        defaults={
            "algoritmo": "Canadian Forest Fire Weather Index System (Van Wagner)",
            "descripcion": "Cálculo estándar internacional de peligro de incendios forestales: FFMC, DMC, DC, ISI, BUI y FWI.",
            "estado": ModeloPredictivo.EstadoModelo.VALIDADO,
            "metricas_validacion": {"escala": "Estándar CFFDRS", "area": "Parinacochas"}
        }
    )

    ejecucion = EjecucionModelo.objects.create(
        modelo=modelo,
        estado=EjecucionModelo.EstadoEjecucion.EJECUTANDO,
        parametros={"latitud": lat, "longitud": lon}
    )

    # Obtener última observación meteorológica
    obs = ObservacionMeteorologica.objects.first()
    ahora = timezone.now()

    if obs:
        temp = float(obs.temperatura_c or 20.0)
        rh = float(obs.humedad_relativa_pct or 40.0)
        viento = float(obs.viento_kmh or 15.0)
        lluvia = float(obs.precipitacion_mm or 0.0)
    else:
        # Valores climatológicos promedio por defecto si aún no hay observaciones
        temp, rh, viento, lluvia = 18.0, 45.0, 12.0, 0.0

    # Ejecutar cálculo FWI
    fwi_res = calcular_sistema_fwi_completo(
        temp=temp,
        rh=rh,
        wind=viento,
        rain=lluvia,
        month=ahora.month,
        lat=lat
    )

    # Crear polígono referencial del cuadrante de Coracora
    delta = 0.05
    geojson_area = {
        "type": "Polygon",
        "coordinates": [[
            [lon - delta, lat - delta],
            [lon + delta, lat - delta],
            [lon + delta, lat + delta],
            [lon - delta, lat + delta],
            [lon - delta, lat - delta]
        ]]
    }

    prediccion = Prediccion.objects.create(
        ejecucion=ejecucion,
        geometria_geojson=geojson_area,
        horizonte_desde=ahora,
        horizonte_hasta=ahora + timedelta(hours=24),
        probabilidad=min(1.0, round(fwi_res['fwi'] / 50.0, 4)),
        nivel=fwi_res['nivel_peligro'],
        incertidumbre=fwi_res
    )

    ejecucion.estado = EjecucionModelo.EstadoEjecucion.COMPLETADO
    ejecucion.finalizado_en = timezone.now()
    ejecucion.save()

    # Si el peligro es alto o crítico, desencadenar evaluación de viviendas y alertas
    if fwi_res['nivel_peligro'] in ['alto', 'critico']:
        try:
            from apps.alertas.tasks import evaluar_exposicion_y_alertar_task
            evaluar_exposicion_y_alertar_task.delay(id_prediccion=prediccion.id_prediccion)
        except Exception:
            pass

    return {
        "status": "ok",
        "id_prediccion": prediccion.id_prediccion,
        "fwi": fwi_res['fwi'],
        "nivel": fwi_res['nivel_peligro'],
        "indices": fwi_res
    }
