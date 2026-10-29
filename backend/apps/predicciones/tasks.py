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

    # 1. Siempre consultar o refrescar con la última observación real de Open-Meteo
    try:
        from apps.meteorologia.tasks import importar_openmeteo_task
        importar_openmeteo_task(lat=lat, lon=lon)
    except Exception:
        pass

    obs = ObservacionMeteorologica.objects.order_by('-observada_en').first()

    ahora = timezone.now()

    if obs:
        temp = float(obs.temperatura_c if obs.temperatura_c is not None else 18.0)
        rh = float(obs.humedad_relativa_pct if obs.humedad_relativa_pct is not None else 60.0)
        viento = float(obs.viento_kmh if obs.viento_kmh is not None else 10.0)
        lluvia = float(obs.precipitacion_mm if obs.precipitacion_mm is not None else 0.0)
        wind_dir = float(obs.direccion_viento_grados if obs.direccion_viento_grados is not None else 0.0)
        obs_dt = obs.observada_en.isoformat() if obs.observada_en else ahora.isoformat()
    else:
        temp, rh, viento, lluvia = 18.0, 50.0, 10.0, 0.0
        wind_dir = 270.0
        obs_dt = ahora.isoformat()

    # 2. Ejecutar cálculo físico estándar FWI canadiense
    fwi_res = calcular_sistema_fwi_completo(
        temp=temp,
        rh=rh,
        wind=viento,
        rain=lluvia,
        month=ahora.month,
        lat=lat
    )

    # 3. Ejecutar predicción de Machine Learning (Random Forest entrenado con AWP)
    try:
        from .ml_incendio import predecir_ignicion_ml
        ml_res = predecir_ignicion_ml(
            temperatura=temp,
            humedad=rh,
            viento=viento,
            lluvia=lluvia,
            fwi=fwi_res['fwi']
        )
    except Exception as e:
        prob_calib = fwi_res.get('probabilidad_fuego', 0.05)
        ml_res = {
            'probabilidad_fuego': prob_calib,
            'probabilidad_pct': round(prob_calib * 100, 1),
            'clase_ml': 'not fire' if fwi_res['nivel_peligro'] == 'bajo' else 'fire',
            'nivel_ml': fwi_res['nivel_peligro'],
            'estado_combustible': 'Normal',
            'diagnostico': fwi_res.get('diagnostico', ''),
            'error': str(e)
        }

    # Si hay lluvia activa o humedad saturada, el nivel de peligro combinado es bajo
    if lluvia > 0.0 or rh >= 75.0:
        nivel_final = 'bajo'
        prob_final = ml_res.get('probabilidad_fuego', 0.02)
    else:
        nivel_final = fwi_res['nivel_peligro']
        prob_final = max(ml_res.get('probabilidad_fuego', 0.0), fwi_res.get('probabilidad_fuego', 0.02))

    fwi_res['temp'] = temp
    fwi_res['rh'] = rh
    fwi_res['wind'] = viento
    fwi_res['rain'] = lluvia
    fwi_res['wind_dir_deg'] = wind_dir
    fwi_res['observada_en'] = obs_dt
    fwi_res['nivel_peligro'] = nivel_final
    fwi_res['ml_prediccion'] = ml_res

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
        probabilidad=prob_final,
        nivel=nivel_final,
        incertidumbre=fwi_res
    )

    ejecucion.estado = EjecucionModelo.EstadoEjecucion.COMPLETADO
    ejecucion.finalizado_en = timezone.now()
    ejecucion.save()

    # Si el peligro es alto o crítico, desencadenar evaluación de viviendas y alertas
    if nivel_final in ['alto', 'critico']:
        try:
            from apps.alertas.tasks import evaluar_exposicion_y_alertar_task
            evaluar_exposicion_y_alertar_task.delay(id_prediccion=prediccion.id_prediccion)
        except Exception:
            pass

    return {
        "status": "ok",
        "id_prediccion": prediccion.id_prediccion,
        "fwi": fwi_res['fwi'],
        "nivel": nivel_final,
        "probabilidad_ml": ml_res.get('probabilidad_pct', 0),
        "lluvia": lluvia,
        "humedad": rh,
        "temperatura": temp,
        "viento": viento
    }


@shared_task(name="entrenar_y_generar_ocurrencia_task")
def entrenar_y_generar_ocurrencia_task(test_ratio=0.30):
    """
    Entrena el modelo de Machine Learning de riesgo de ocurrencia/susceptibilidad
    con las detecciones reales de NASA FIRMS y Open-Meteo, y genera la grilla de riesgo.
    NOTA: No emite alertas operativas automáticas para garantizar supervisión humana.
    """
    from .ml_ocurrencia import entrenar_modelo_ocurrencia, generar_grilla_riesgo_ocurrencia

    modelo, _ = ModeloPredictivo.objects.get_or_create(
        nombre="WillAI FireRisk Occurrence ML",
        version="1.0.0-parinacochas",
        defaults={
            "algoritmo": "RandomForestClassifier Calibrado (Validación Temporal)",
            "descripcion": "Estimación del riesgo de ocurrencia de incendios forestales en Parinacochas con validación temporal estricta.",
            "estado": ModeloPredictivo.EstadoModelo.VALIDADO
        }
    )

    ejecucion = EjecucionModelo.objects.create(
        modelo=modelo,
        estado=EjecucionModelo.EstadoEjecucion.EJECUTANDO,
        parametros={"test_ratio": test_ratio, "zona": "Parinacochas"}
    )

    try:
        metadata = entrenar_modelo_ocurrencia(test_ratio=test_ratio)
        grilla = generar_grilla_riesgo_ocurrencia()
    except Exception as e:
        ejecucion.estado = EjecucionModelo.EstadoEjecucion.FALLIDO
        ejecucion.resumen_error = str(e)
        ejecucion.finalizado_en = timezone.now()
        ejecucion.save()
        return {"status": "error", "error": str(e)}

    ahora = timezone.now()
    fin_horizonte = ahora + timedelta(hours=24)

    # Identificar pico de probabilidad en las celdas
    max_prob = 0.0
    nivel_max = 'bajo'
    niveles_orden = {"bajo": 1, "moderado": 2, "alto": 3, "critico": 4}
    for f in grilla.get("features", []):
        p = f.get("properties", {})
        prob = p.get("probabilidad", 0.0)
        niv = p.get("nivel_riesgo", "bajo")
        if prob > max_prob:
            max_prob = prob
        if niveles_orden.get(niv, 1) > niveles_orden.get(nivel_max, 1):
            nivel_max = niv

    prediccion = Prediccion.objects.create(
        ejecucion=ejecucion,
        geometria_geojson=grilla,
        horizonte_desde=ahora,
        horizonte_hasta=fin_horizonte,
        probabilidad=max_prob,
        nivel=nivel_max,
        incertidumbre={
            "tipo_prediccion": "ocurrencia_ml_grilla",
            "metricas": metadata.get("metricas_evaluacion_temporal", {}),
            "importancia_variables": metadata.get("importancia_variables", {}),
            "total_celdas": len(grilla.get("features", []))
        }
    )

    ejecucion.estado = EjecucionModelo.EstadoEjecucion.COMPLETADO
    ejecucion.finalizado_en = timezone.now()
    ejecucion.save()

    return {
        "status": "ok",
        "id_prediccion": prediccion.id_prediccion,
        "nivel_pico": nivel_max,
        "probabilidad_max": max_prob,
        "metricas": metadata.get("metricas_evaluacion_temporal", {}),
        "total_celdas": len(grilla.get("features", []))
    }


@shared_task(name="ejecutar_simulacion_propagacion_task")
def ejecutar_simulacion_propagacion_task(simulacion_id: int):
    """
    Tarea Celery asíncrona para calcular la propagación del fuego mediante el motor configurado.
    """
    from .services import ejecutar_simulacion_propagacion
    return ejecutar_simulacion_propagacion(simulacion_id)

