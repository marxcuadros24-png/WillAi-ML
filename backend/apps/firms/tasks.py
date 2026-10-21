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
def importar_firms_task(sensor="VIIRS_NOAA20_NRT", bbox=BBOX_CORACORA, days=1):
    """
    Importa detecciones de calor de NASA FIRMS vía CSV en tiempo casi real (~3h).
    Endpoint: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{sensor}/{bbox}/{days}
    """
    fuente, _ = FuenteSatelital.objects.get_or_create(
        codigo_producto=sensor,
        defaults={
            "proveedor": "NASA FIRMS",
            "sensor": sensor.split("_")[0],
            "plataforma": sensor.split("_")[1] if "_" in sensor else "NRT",
            "tipo_producto": FuenteSatelital.TipoProducto.NRT,
            "documentacion_url": "https://firms.modaps.eosdis.nasa.gov/api/area/",
        }
    )

    map_key = getattr(settings, "NASA_FIRMS_MAP_KEY", "") or ""
    lote_id_str = f"FIRMS_{sensor}_{dj_timezone.now().strftime('%Y%m%d_%H%M%S')}"

    lote = LoteImportacionFirms.objects.create(
        fuente=fuente,
        identificador_lote=lote_id_str,
        estado=LoteImportacionFirms.EstadoLote.INICIADO,
        bbox_geojson={"type": "BBox", "coords": bbox}
    )

    if not map_key:
        # Modo simulación / mock si el usuario aún no configuró su MAP_KEY gratuita
        csv_data = (
            "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n"
            f"-15.0350,-73.7650,335.4,0.38,0.36,{dj_timezone.now().strftime('%Y-%m-%d')},1830,N20,nominal,2.0NRT,295.1,14.8,D\n"
            f"-15.0820,-73.7920,342.1,0.40,0.37,{dj_timezone.now().strftime('%Y-%m-%d')},1830,N20,high,2.0NRT,298.5,22.3,D\n"
        )
    else:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{map_key}/{sensor}/{bbox}/{days}"
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            csv_data = resp.text
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
        acq_time_str = row.get("acq_time", "0000").zfill(4)

        if not lat_str or not lon_str or not acq_date_str:
            omitidas += 1
            continue

        lat = float(lat_str)
        lon = float(lon_str)

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

        frp = float(row.get("frp")) if row.get("frp") else None
        brillo = float(row.get("bright_ti4") or row.get("brightness") or 0) or None
        scan = float(row.get("scan")) if row.get("scan") else None
        track = float(row.get("track")) if row.get("track") else None

        det, created = DeteccionSatelital.objects.update_or_create(
            clave_deteccion=clave_hash,
            defaults={
                "fuente": fuente,
                "lote_primero": lote,
                "fecha_observacion": fecha_obs,
                "latitud": lat,
                "longitud": lon,
                "frp_mw": frp,
                "confianza": row.get("confidence", "nominal"),
                "brillo_kelvin": brillo,
                "scan_km": scan,
                "track_km": track,
                "dia_noche": row.get("daynight", "D"),
                "codigo_satelite": row.get("satellite", ""),
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
        "lote": lote.identificador_lote,
        "insertadas": insertadas,
        "actualizadas": actualizadas,
        "total": total
    }


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
