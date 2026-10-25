import csv
import hashlib
import io
import requests
from datetime import datetime, timezone
from django.conf import settings
from django.utils import timezone as dj_timezone
from celery import shared_task
from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital, LoteDeteccionesFirms

BBOX_CORACORA = "-74.2,-15.5,-73.0,-14.5"


@shared_task(name="importar_firms_task")
def importar_firms_task(sensor="VIIRS_NOAA20_NRT", bbox=BBOX_CORACORA, days=1, date=None):
    """
    Importa detecciones de calor REALES de NASA FIRMS vía CSV.
    Soporta sensores VIIRS (NOAA-20, NOAA-21, Suomi-NPP) y MODIS (Terra y Aqua).
    Endpoints oficiales:
      - Tiempo casi real: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{sensor}/{bbox}/{days}
      - Consulta histórica: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{sensor}/{bbox}/{days}/{date}
    """
    sensor_upper = sensor.upper()
    if "MODIS" in sensor_upper:
        nombre_sensor = "MODIS"
        plataforma_def = "Terra/Aqua"
    elif "VIIRS" in sensor_upper:
        nombre_sensor = "VIIRS"
        plataforma_def = "NOAA-20" if "NOAA20" in sensor_upper else ("NOAA-21" if "NOAA21" in sensor_upper else "Suomi-NPP")
    elif "LANDSAT" in sensor_upper:
        nombre_sensor = "LANDSAT"
        plataforma_def = "Landsat-8/9"
    else:
        nombre_sensor = sensor.split("_")[0]
        plataforma_def = "NRT"

    tipo_prod = (
        FuenteSatelital.TipoProducto.ARCHIVE
        if ("_SP" in sensor_upper or "ARCHIVE" in sensor_upper)
        else FuenteSatelital.TipoProducto.NRT
    )

    fuente, _ = FuenteSatelital.objects.get_or_create(
        codigo_producto=sensor,
        defaults={
            "proveedor": "NASA FIRMS",
            "sensor": nombre_sensor,
            "plataforma": plataforma_def,
            "tipo_producto": tipo_prod,
            "documentacion_url": "https://firms.modaps.eosdis.nasa.gov/api/area/",
        }
    )

    map_key = getattr(settings, "NASA_FIRMS_MAP_KEY", "") or ""
    if not map_key:
        return {"status": "error", "message": "NASA_FIRMS_MAP_KEY no configurada. Configure su API key real en backend/.env"}

    lote_sufijo = f"_{date}" if date else ""
    lote_id_str = f"FIRMS_{sensor}{lote_sufijo}_{dj_timezone.now().strftime('%Y%m%d_%H%M%S')}"

    lote = LoteImportacionFirms.objects.create(
        fuente=fuente,
        identificador_lote=lote_id_str,
        estado=LoteImportacionFirms.EstadoLote.INICIADO,
        bbox_geojson={"type": "BBox", "coords": bbox}
    )

    if date:
        # La API de NASA FIRMS acepta un rango de 1 a 5 días cuando se pasa fecha específica
        api_days = max(1, min(int(days), 5))
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key}/{sensor}/{bbox}/{api_days}/{date}"
    else:
        api_days = max(1, min(int(days), 10))
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key}/{sensor}/{bbox}/{api_days}"

    try:
        resp = requests.get(url, timeout=35)
        resp.raise_for_status()
        csv_data = resp.text
        if csv_data.startswith("400") or csv_data.startswith("403") or "Invalid" in csv_data:
            raise ValueError(f"Error devuelto por NASA FIRMS: {csv_data.strip()}")
    except Exception as e:
        lote.estado = LoteImportacionFirms.EstadoLote.FALLIDO
        lote.error_detalle = str(e)
        lote.finalizado_en = dj_timezone.now()
        lote.save()
        return {"status": "error", "message": str(e)}

    # Parsear CSV
    reader = csv.DictReader(io.StringIO(csv_data))
    insertadas = 0
    actualizadas = 0
    omitidas = 0
    total = 0

    for row in reader:
        total += 1
        lat_str = row.get("latitude")
        lon_str = row.get("longitude")
        acq_date_str = row.get("acq_date")
        acq_time_str = str(row.get("acq_time", "0000")).strip().zfill(4)

        if not lat_str or not lon_str or not acq_date_str:
            omitidas += 1
            continue

        try:
            lat = float(lat_str)
            lon = float(lon_str)
        except ValueError:
            omitidas += 1
            continue

        # Hash único para evitar duplicados
        clave_raw = f"{sensor}_{lat:.4f}_{lon:.4f}_{acq_date_str}_{acq_time_str}"
        clave_hash = hashlib.sha256(clave_raw.encode()).hexdigest()

        try:
            hora = int(acq_time_str[:2])
            minuto = int(acq_time_str[2:])
            fecha_obs = datetime.strptime(acq_date_str, "%Y-%m-%d").replace(
                hour=hora, minute=minuto, tzinfo=timezone.utc
            )
        except Exception:
            fecha_obs = dj_timezone.now()

        # FRP (Fire Radiative Power)
        frp = None
        if row.get("frp"):
            try:
                frp = float(row.get("frp"))
            except ValueError:
                frp = None

        # Brillo: MODIS usa 'brightness', VIIRS usa 'bright_ti4'
        brillo_val = row.get("bright_ti4") or row.get("brightness") or row.get("bright_t31")
        brillo = float(brillo_val) if brillo_val else None

        scan = float(row.get("scan")) if row.get("scan") else None
        track = float(row.get("track")) if row.get("track") else None

        # Confianza: MODIS retorna 0-100%, VIIRS retorna 'l', 'n', 'h' o 'low', 'nominal', 'high'
        raw_conf = str(row.get("confidence", "")).lower().strip()
        conf_num = None
        conf_str = "nominal"

        try:
            conf_num = float(raw_conf)
            if conf_num >= 80:
                conf_str = "high"
            elif conf_num >= 30:
                conf_str = "nominal"
            else:
                conf_str = "low"
        except (ValueError, TypeError):
            if raw_conf in ("l", "low"):
                conf_str = "low"
                conf_num = 20.0
            elif raw_conf in ("n", "nominal"):
                conf_str = "nominal"
                conf_num = 60.0
            elif raw_conf in ("h", "high"):
                conf_str = "high"
                conf_num = 95.0
            else:
                conf_str = raw_conf or "nominal"

        satelite_code = row.get("satellite") or row.get("instrument") or ""

        det, created = DeteccionSatelital.objects.update_or_create(
            clave_deteccion=clave_hash,
            defaults={
                "fuente": fuente,
                "lote_primero": lote,
                "fecha_observacion": fecha_obs,
                "latitud": lat,
                "longitud": lon,
                "frp_mw": frp,
                "confianza": conf_str,
                "confianza_numerica": conf_num,
                "brillo_kelvin": brillo,
                "scan_km": scan,
                "track_km": track,
                "dia_noche": row.get("daynight", "D"),
                "codigo_satelite": satelite_code,
                "codigo_instrumento": row.get("instrument", nombre_sensor),
                "version_producto": row.get("version", ""),
                "datos_originales": row,
            }
        )

        LoteDeteccionesFirms.objects.get_or_create(
            lote=lote,
            deteccion=det,
            defaults={"estado_fila": LoteDeteccionesFirms.EstadoFila.INSERTADA if created else LoteDeteccionesFirms.EstadoFila.EXISTENTE}
        )

        if created:
            insertadas += 1
        else:
            actualizadas += 1

    lote.estado = LoteImportacionFirms.EstadoLote.COMPLETADO
    lote.filas_recibidas = total
    lote.filas_insertadas = insertadas
    lote.filas_actualizadas = actualizadas
    lote.filas_omitidas = omitidas
    lote.finalizado_en = dj_timezone.now()
    lote.save()

    return {
        "status": "ok",
        "sensor": sensor,
        "lote": lote.identificador_lote,
        "insertadas": insertadas,
        "actualizadas": actualizadas,
        "total": total
    }


@shared_task(name="importar_firms_multi_sensor_task")
def importar_firms_multi_sensor_task(days=3, bbox=BBOX_CORACORA):
    """
    Importa periódicamente tanto VIIRS (NOAA-20 / NOAA-21) como MODIS (Aqua / Terra).
    """
    sensores = ["VIIRS_NOAA20_NRT", "MODIS_NRT"]
    resultados = {}
    for s in sensores:
        res = importar_firms_task(sensor=s, bbox=bbox, days=days)
        resultados[s] = res
    return {"status": "ok", "sensores": resultados}


@shared_task(name="importar_serfor_task")
def importar_serfor_task():
    """
    Importa focos de calor oficiales de SERFOR Perú vía ArcGIS REST MapServer.
    """
    fuente, _ = FuenteSatelital.objects.get_or_create(
        codigo_producto="SERFOR_FOCOS_PERU",
        defaults={
            "proveedor": "SERFOR",
            "sensor": "MULTI_SAT",
            "plataforma": "GeoSERFOR",
            "tipo_producto": FuenteSatelital.TipoProducto.NRT,
            "documentacion_url": "https://geo.serfor.gob.pe/geoservicios/",
        }
    )

    url = "https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/0/query"
    params = {
        "where": "DEPARTAMEN = 'AYACUCHO' OR 1=1",
        "geometry": "-74.5,-15.8,-73.0,-14.3",
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "f": "json",
        "returnGeometry": "true"
    }

    try:
        resp = requests.get(url, params=params, timeout=20)
        data = resp.json()
        features = data.get("features", [])
    except Exception as e:
        features = []

    insertadas = 0
    for feat in features:
        geom = feat.get("geometry", {})
        attrs = feat.get("attributes", {})
        lon = geom.get("x")
        lat = geom.get("y")

        if lat and lon:
            clave_raw = f"SERFOR_{lat:.4f}_{lon:.4f}_{attrs.get('FECHA', '')}"
            clave_hash = hashlib.sha256(clave_raw.encode()).hexdigest()

            _, created = DeteccionSatelital.objects.update_or_create(
                clave_deteccion=clave_hash,
                defaults={
                    "fuente": fuente,
                    "fecha_observacion": dj_timezone.now(),
                    "latitud": lat,
                    "longitud": lon,
                    "confianza": attrs.get("CONFIANZA", "alta"),
                    "datos_originales": attrs,
                }
            )
            if created:
                insertadas += 1

    return {"status": "ok", "proveedor": "SERFOR", "insertadas": insertadas}
