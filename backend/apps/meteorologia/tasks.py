import requests
from datetime import datetime, timezone
from django.utils import timezone as dj_timezone
from celery import shared_task
from .models import ObservacionMeteorologica

CORACORA_LAT = -15.0189
CORACORA_LON = -73.7806


@shared_task(name="importar_openmeteo_task")
def importar_openmeteo_task(lat=CORACORA_LAT, lon=CORACORA_LON):
    """
    Consume datos meteorológicos horarios y actuales de Open-Meteo (gratuita, sin API key).
    Endpoint: https://api.open-meteo.com/v1/forecast
    Variables: temperature_2m, relative_humidity_2m, precipitation, wind_speed_10m, wind_direction_10m
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m",
        "timezone": "America/Lima"
    }

    try:
        resp = requests.get(url, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}

    current = data.get("current", {})
    obs_time_str = current.get("time")

    if not obs_time_str:
        return {"status": "error", "message": "No current weather block received"}

    # id_externo para unicidad
    id_externo = f"openmeteo_{lat:.4f}_{lon:.4f}_{obs_time_str}"

    try:
        obs_dt = datetime.fromisoformat(obs_time_str)
        if obs_dt.tzinfo is None:
            obs_dt = dj_timezone.make_aware(obs_dt)
    except Exception:
        obs_dt = dj_timezone.now()

    obs, created = ObservacionMeteorologica.objects.update_or_create(
        proveedor="Open-Meteo",
        id_externo=id_externo,
        defaults={
            "latitud": lat,
            "longitud": lon,
            "observada_en": obs_dt,
            "temperatura_c": current.get("temperature_2m"),
            "humedad_relativa_pct": current.get("relative_humidity_2m"),
            "precipitacion_mm": current.get("precipitation"),
            "viento_kmh": current.get("wind_speed_10m"),
            "direccion_viento_grados": current.get("wind_direction_10m"),
            "datos_originales": data,
        }
    )

    return {
        "status": "ok",
        "creado": created,
        "id_observacion": obs.id_observacion,
        "temperatura": float(obs.temperatura_c or 0),
        "humedad": float(obs.humedad_relativa_pct or 0),
        "viento": float(obs.viento_kmh or 0),
    }
