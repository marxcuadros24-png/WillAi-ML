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

    # Obtener última observación meteorológica real o consultar Open-Meteo
    obs = ObservacionMeteorologica.objects.first()
    if not obs:
        try:
            from apps.meteorologia.tasks import importar_openmeteo_task
            importar_openmeteo_task(lat=lat, lon=lon)
            obs = ObservacionMeteorologica.objects.first()
        except Exception:
            pass

    ahora = timezone.now()

    if obs:
        temp = float(obs.temperatura_c or 20.0)
        rh = float(obs.humedad_relativa_pct or 40.0)
        viento = float(obs.viento_kmh or 15.0)
        lluvia = float(obs.precipitacion_mm or 0.0)
        wind_dir = float(obs.direccion_viento_grados or 0.0)
        obs_dt = obs.observada_en.isoformat() if obs.observada_en else ahora.isoformat()
    else:
        temp, rh, viento, lluvia = 18.0, 45.0, 12.0, 0.0
        wind_dir = 270.0
        obs_dt = ahora.isoformat()

    # Ejecutar cálculo FWI
    fwi_res = calcular_sistema_fwi_completo(
        temp=temp,
        rh=rh,
        wind=viento,
        rain=lluvia,
        month=ahora.month,
        lat=lat
    )
    fwi_res['temp'] = temp
    fwi_res['rh'] = rh
    fwi_res['wind'] = viento
    fwi_res['rain'] = lluvia
    fwi_res['wind_dir_deg'] = wind_dir
    fwi_res['observada_en'] = obs_dt

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


@shared_task(name="entrenar_y_predecir_viento_task")
def entrenar_y_predecir_viento_task(lat=CORACORA_LAT, lon=CORACORA_LON):
    """
    Entrena el modelo de Machine Learning de propagación de viento consumiendo la API de Open-Meteo
    y genera el pronóstico vectorial horario de las próximas 12 horas.
    """
    from .ml_viento import entrenar_modelo_viento_ml

    modelo, _ = ModeloPredictivo.objects.get_or_create(
        nombre="WillAI WindProphet ML (12h)",
        version="2.1.0",
        defaults={
            "algoritmo": "Random Forest Vector Autoregression + Orographic Open-Meteo",
            "descripcion": "Predicción de magnitud vectorial u, v y dirección del viento a 12 horas con conos de dispersión de incendios para Coracora.",
            "estado": ModeloPredictivo.EstadoModelo.VALIDADO,
            "metricas_validacion": {"algoritmo": "RandomForestRegressor Multi-Output"}
        }
    )

    ejecucion = EjecucionModelo.objects.create(
        modelo=modelo,
        estado=EjecucionModelo.EstadoEjecucion.EJECUTANDO,
        parametros={"latitud": lat, "longitud": lon, "horizonte_horas": 12}
    )

    try:
        resultado_ml = entrenar_modelo_viento_ml(lat=lat, lon=lon)
    except Exception as e:
        ejecucion.estado = EjecucionModelo.EstadoEjecucion.FALLIDO
        ejecucion.resumen_error = str(e)
        ejecucion.finalizado_en = timezone.now()
        ejecucion.save()
        return {"status": "error", "error": str(e)}

    metricas = resultado_ml["metricas"]
    pronostico = resultado_ml["pronostico_12h"]

    modelo.metricas_validacion = metricas
    modelo.save()

    ahora = timezone.now()
    fin_horizonte = ahora + timedelta(hours=12)

    # Determinar el nivel pico de riesgo en las 12 horas
    niveles_orden = {"bajo": 1, "moderado": 2, "alto": 3, "critico": 4}
    max_nivel_str = max(pronostico, key=lambda p: niveles_orden.get(p["riesgo_propagacion"], 1))["riesgo_propagacion"]

    # Cono de dispersión combinado o del pico de viento
    cono_principal = pronostico[0]["cono_dispersion"]
    for p in pronostico:
        if p["riesgo_propagacion"] == max_nivel_str:
            cono_principal = p["cono_dispersion"]
            break

    prediccion = Prediccion.objects.create(
        ejecucion=ejecucion,
        geometria_geojson=cono_principal,
        horizonte_desde=ahora,
        horizonte_hasta=fin_horizonte,
        probabilidad=min(1.0, round(float(pronostico[0]["velocidad_kmh"]) / 45.0, 4)),
        nivel=max_nivel_str,
        incertidumbre={
            "tipo_prediccion": "viento_ml_12h",
            "metricas_entrenamiento": metricas,
            "pronostico_12h": pronostico,
            "coordenadas": {"lat": lat, "lon": lon}
        }
    )

    ejecucion.estado = EjecucionModelo.EstadoEjecucion.COMPLETADO
    ejecucion.finalizado_en = timezone.now()
    ejecucion.save()

    return {
        "status": "ok",
        "id_prediccion": prediccion.id_prediccion,
        "nivel_pico": max_nivel_str,
        "metricas": metricas,
        "pronostico_12h": pronostico
    }
