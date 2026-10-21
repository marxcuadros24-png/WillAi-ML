# Integración de APIs: NASA FIRMS + SERFOR

> [!IMPORTANT]
> Estas **no son microservicios** — son fuentes de datos externas que tu backend Django consume directamente con `requests` + Celery tasks. No necesitas servicios intermediarios.

---

## 📡 API 1: NASA FIRMS (Detecciones satelitales de fuego)

### Datos de acceso

| Elemento | Valor |
|---|---|
| **Registro MAP_KEY** | https://firms.modaps.eosdis.nasa.gov/api/map_key/ (gratis) |
| **Endpoint base** | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{sensor}/{bbox}/{days}` |
| **Rate limit** | 5,000 transacciones / 10 minutos |
| **Formatos** | CSV (default), JSON |
| **Latencia** | NRT = ~3 horas después del paso del satélite |

### Sensores disponibles (tu esquema ya los tiene)

| Sensor | Código API | Resolución | Tu `fuentes_satelitales.codigo_producto` |
|---|---|---|---|
| MODIS (Terra/Aqua) | `MODIS_NRT` | 1 km | `MODIS_NRT` ✅ |
| VIIRS NOAA-20 | `VIIRS_NOAA20_NRT` | 375 m | `VIIRS_NOAA20_NRT` ✅ |
| VIIRS NOAA-21 | `VIIRS_NOAA21_NRT` | 375 m | `VIIRS_NOAA21_NRT` ✅ |
| VIIRS S-NPP | `VIIRS_SNPP_NRT` | 375 m | (Agregar al INSERT) |

### Bounding box para Coracora / Parinacochas / Ayacucho

```
Parinacochas (ajustado):  -74.2, -15.5, -73.0, -14.5
Ayacucho (amplio):        -75.0, -15.6, -73.0, -13.5
```

### Ejemplo de URL real

```
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/-74.2,-15.5,-73.0,-14.5/2
```

### Campos que retorna (CSV)

```
latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, 
confidence, version, bright_ti4, bright_ti5, frp, daynight, instrument
```

### Mapeo a tu modelo `detecciones_satelitales`

| Campo FIRMS API | Tu columna en BD |
|---|---|
| `latitude` | `latitud` |
| `longitude` | `longitud` |
| `latitude` + `longitude` | `ubicacion` (POINT con GeoDjango) |
| `acq_date` + `acq_time` | `fecha_observacion` |
| `frp` | `frp_mw` |
| `confidence` | `confianza` / `confianza_numerica` |
| `brightness` / `bright_ti4` | `brillo_kelvin` |
| `scan` | `scan_km` |
| `track` | `track_km` |
| `daynight` | `dia_noche` |
| `satellite` | `codigo_satelite` |
| `instrument` | `codigo_instrumento` |
| `version` | `version_producto` |
| (fila completa como dict) | `datos_originales` (JSON) |

---

## 📡 API 2: SERFOR (Focos de calor + incendios forestales Perú)

### Endpoints disponibles

#### A. Focos de calor — últimas 24h (tiempo real)
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/0/query
```

#### B. Incendios forestales activos
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/1/query
```

#### C. Focos de calor históricos
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales_Historico/MapServer/1/query
```

#### D. Alertas de incendio forestal
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales_Historico/MapServer/2/query
```

#### E. Ocurrencias de incendios forestales
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales_Historico/MapServer/4/query
```

#### F. Cicatrices de incendios (áreas quemadas)
```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales_Historico/MapServer/5/query
```

### Parámetros de consulta (ArcGIS REST API)

| Parámetro | Valor | Descripción |
|---|---|---|
| `where` | `1=1` o filtro SQL | Filtro de registros |
| `outFields` | `*` | Campos a retornar (todos) |
| `returnGeometry` | `true` | Incluir coordenadas |
| `f` | `json` o `geojson` | Formato de respuesta |
| `geometry` | `-74.2,-15.5,-73.0,-14.5` | Bounding box (filtro espacial) |
| `geometryType` | `esriGeometryEnvelope` | Tipo de geometría del filtro |
| `inSR` | `4326` | Sistema de referencia de entrada |
| `outSR` | `4326` | Sistema de referencia de salida |
| `spatialRel` | `esriSpatialRelIntersects` | Relación espacial |

### Ejemplo de URL real (focos de calor en Parinacochas)

```
https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json&geometry=-74.2,-15.5,-73.0,-14.5&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects
```

### Formato de respuesta SERFOR (JSON)

```json
{
  "features": [
    {
      "attributes": {
        "OBJECTID": 12345,
        "LATITUDE": -15.0234,
        "LONGITUDE": -73.6891,
        "BRIGHTNESS": 312.5,
        "SCAN": 1.2,
        "TRACK": 1.1,
        "ACQ_DATE": "2026/10/20",
        "ACQ_TIME": "0430",
        "SATELLITE": "N",
        "CONFIDENCE": "nominal",
        "FRP": 8.5,
        "DAYNIGHT": "N",
        "DEPARTAMEN": "AYACUCHO",
        "PROVINCIA": "PARINACOCHAS",
        "DISTRITO": "CORACORA"
      },
      "geometry": {
        "x": -73.6891,
        "y": -15.0234
      }
    }
  ]
}
```

> [!TIP]
> **Ventaja de SERFOR:** Los datos ya vienen con `DEPARTAMEN`, `PROVINCIA` y `DISTRITO` — puedes vincular directamente con tu tabla `distritos` sin cálculos espaciales.

---

## 🐍 Implementación en Django — Código funcional

### Configuración (settings)

```python
# config/settings/base.py

# NASA FIRMS
FIRMS_MAP_KEY = env('FIRMS_MAP_KEY')  # Nunca hardcoded
FIRMS_BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
FIRMS_BBOX = '-74.2,-15.5,-73.0,-14.5'  # Parinacochas

# SERFOR
SERFOR_BASE_URL = 'https://geo.serfor.gob.pe/geoservicios/rest/services'
SERFOR_FOCOS_CALOR = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales/MapServer/0/query'
SERFOR_INCENDIOS = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales/MapServer/1/query'
SERFOR_FOCOS_HISTORICO = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales_Historico/MapServer/1/query'
SERFOR_ALERTAS = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales_Historico/MapServer/2/query'
SERFOR_OCURRENCIAS = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales_Historico/MapServer/4/query'
SERFOR_CICATRICES = f'{SERFOR_BASE_URL}/Visor/Incendios_Forestales_Historico/MapServer/5/query'
SERFOR_BBOX = '-74.2,-15.5,-73.0,-14.5'
```

### Task: Importar NASA FIRMS

```python
# apps/firms/tasks.py
import io
import csv
import hashlib
from datetime import datetime

import requests
from celery import shared_task
from django.conf import settings
from django.contrib.gis.geos import Point

from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital, LoteDeteccionesFirms


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def importar_firms(self, codigo_fuente='VIIRS_NOAA20_NRT', dias=2):
    """
    Importa detecciones de fuego de NASA FIRMS.
    Se ejecuta como Celery task — sin microservicio externo.
    """
    fuente = FuenteSatelital.objects.get(codigo_producto=codigo_fuente)

    # 1. Construir URL
    url = f"{settings.FIRMS_BASE_URL}/{settings.FIRMS_MAP_KEY}/{codigo_fuente}/{settings.FIRMS_BBOX}/{dias}"

    # 2. Crear registro de lote
    lote = LoteImportacionFirms.objects.create(
        fuente=fuente,
        identificador_lote=f"{codigo_fuente}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        consulta_desde=None,
        consulta_hasta=None,
        estado='iniciado',
    )

    try:
        # 3. Llamar a la API directamente
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # 4. Calcular checksum del archivo
        lote.checksum_archivo = hashlib.sha256(response.content).hexdigest()

        # 5. Parsear CSV
        reader = csv.DictReader(io.StringIO(response.text))
        filas = list(reader)
        lote.filas_recibidas = len(filas)

        insertadas, actualizadas, omitidas = 0, 0, 0

        for fila in filas:
            # Generar clave única para deduplicación
            clave_raw = f"{fila['latitude']}_{fila['longitude']}_{fila['acq_date']}_{fila['acq_time']}_{fila.get('satellite', '')}"
            clave = hashlib.sha256(clave_raw.encode()).hexdigest()

            # Construir POINT geoespacial
            lon = float(fila['longitude'])
            lat = float(fila['latitude'])
            ubicacion = Point(lon, lat, srid=4326)

            # Parsear fecha + hora
            fecha_obs = datetime.strptime(
                f"{fila['acq_date']} {fila['acq_time']}",
                '%Y-%m-%d %H%M'
            )

            # Upsert: crear o actualizar
            deteccion, creada = DeteccionSatelital.objects.update_or_create(
                clave_deteccion=clave,
                defaults={
                    'fuente': fuente,
                    'id_lote_primero': lote if creada else None,
                    'fecha_observacion': fecha_obs,
                    'ubicacion': ubicacion,
                    'latitud': lat,
                    'longitud': lon,
                    'frp_mw': fila.get('frp') or None,
                    'confianza': fila.get('confidence'),
                    'brillo_kelvin': fila.get('brightness') or fila.get('bright_ti4') or None,
                    'scan_km': fila.get('scan') or None,
                    'track_km': fila.get('track') or None,
                    'dia_noche': fila.get('daynight'),
                    'codigo_satelite': fila.get('satellite'),
                    'codigo_instrumento': fila.get('instrument'),
                    'version_producto': fila.get('version'),
                    'datos_originales': fila,  # JSON completo
                }
            )

            # Registrar en tabla pivote lote ↔ detección
            estado_fila = 'insertada' if creada else 'existente'
            if creada:
                insertadas += 1
            else:
                omitidas += 1

            LoteDeteccionesFirms.objects.create(
                lote=lote,
                deteccion=deteccion,
                estado_fila=estado_fila,
                hash_fila=hashlib.sha256(str(fila).encode()).hexdigest(),
            )

        # 6. Actualizar lote
        lote.filas_insertadas = insertadas
        lote.filas_actualizadas = actualizadas
        lote.filas_omitidas = omitidas
        lote.estado = 'completado'
        lote.finalizado_en = datetime.utcnow()
        lote.save()

        return {
            'lote': lote.identificador_lote,
            'recibidas': lote.filas_recibidas,
            'insertadas': insertadas,
            'omitidas': omitidas,
        }

    except requests.RequestException as exc:
        lote.estado = 'fallido'
        lote.error_detalle = str(exc)
        lote.save()
        raise self.retry(exc=exc)
```

### Task: Importar SERFOR

```python
# apps/firms/tasks.py (continuación)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def importar_serfor_focos(self):
    """
    Importa focos de calor de SERFOR (últimas 24h).
    SERFOR usa ArcGIS REST API — responde en JSON con geometría.
    """
    params = {
        'where': '1=1',
        'outFields': '*',
        'returnGeometry': 'true',
        'f': 'json',
        'geometry': settings.SERFOR_BBOX,
        'geometryType': 'esriGeometryEnvelope',
        'inSR': '4326',
        'outSR': '4326',
        'spatialRel': 'esriSpatialRelIntersects',
    }

    try:
        response = requests.get(
            settings.SERFOR_FOCOS_CALOR,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        features = data.get('features', [])
        procesados = 0

        for feature in features:
            attrs = feature.get('attributes', {})
            geom = feature.get('geometry', {})

            lat = geom.get('y') or attrs.get('LATITUDE')
            lon = geom.get('x') or attrs.get('LONGITUDE')

            if not lat or not lon:
                continue

            # Generar clave de deduplicación
            clave_raw = f"SERFOR_{lat}_{lon}_{attrs.get('ACQ_DATE', '')}_{attrs.get('ACQ_TIME', '')}"
            clave = hashlib.sha256(clave_raw.encode()).hexdigest()

            ubicacion = Point(float(lon), float(lat), srid=4326)

            # Parsear fecha SERFOR (formato: "2026/10/20")
            fecha_str = attrs.get('ACQ_DATE', '')
            hora_str = attrs.get('ACQ_TIME', '0000')
            try:
                fecha_obs = datetime.strptime(f"{fecha_str} {hora_str}", '%Y/%m/%d %H%M')
            except ValueError:
                fecha_obs = datetime.utcnow()

            DeteccionSatelital.objects.update_or_create(
                clave_deteccion=clave,
                defaults={
                    'fuente': FuenteSatelital.objects.get_or_create(
                        codigo_producto='SERFOR_FOCOS_NRT',
                        defaults={
                            'proveedor': 'SERFOR',
                            'sensor': attrs.get('SATELLITE', 'VIIRS'),
                            'tipo_producto': 'NRT',
                        }
                    )[0],
                    'fecha_observacion': fecha_obs,
                    'ubicacion': ubicacion,
                    'latitud': lat,
                    'longitud': lon,
                    'frp_mw': attrs.get('FRP'),
                    'confianza': attrs.get('CONFIDENCE'),
                    'brillo_kelvin': attrs.get('BRIGHTNESS'),
                    'scan_km': attrs.get('SCAN'),
                    'track_km': attrs.get('TRACK'),
                    'dia_noche': attrs.get('DAYNIGHT'),
                    'codigo_satelite': attrs.get('SATELLITE'),
                    'datos_originales': attrs,  # Todo el dict original
                }
            )
            procesados += 1

        return {
            'fuente': 'SERFOR',
            'features_recibidas': len(features),
            'procesadas': procesados,
        }

    except requests.RequestException as exc:
        raise self.retry(exc=exc)


@shared_task
def importar_serfor_alertas():
    """Importa alertas de incendio forestal de SERFOR."""
    params = {
        'where': '1=1',
        'outFields': '*',
        'returnGeometry': 'true',
        'f': 'json',
        'geometry': settings.SERFOR_BBOX,
        'geometryType': 'esriGeometryEnvelope',
        'inSR': '4326',
        'outSR': '4326',
        'spatialRel': 'esriSpatialRelIntersects',
    }

    response = requests.get(settings.SERFOR_ALERTAS, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    # Procesar alertas y vincular con incidentes existentes...
    # (lógica similar, adaptada a los campos de la capa de alertas)
    return {'alertas_procesadas': len(data.get('features', []))}
```

### Celery Beat: Polling automático

```python
# config/celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    # NASA FIRMS — cada 3 horas (datos NRT se actualizan ~4 veces/día)
    'firms-modis-3h': {
        'task': 'apps.firms.tasks.importar_firms',
        'schedule': crontab(minute=0, hour='*/3'),
        'args': ('MODIS_NRT', 1),
    },
    'firms-viirs-noaa20-3h': {
        'task': 'apps.firms.tasks.importar_firms',
        'schedule': crontab(minute=10, hour='*/3'),
        'args': ('VIIRS_NOAA20_NRT', 1),
    },
    'firms-viirs-noaa21-3h': {
        'task': 'apps.firms.tasks.importar_firms',
        'schedule': crontab(minute=20, hour='*/3'),
        'args': ('VIIRS_NOAA21_NRT', 1),
    },

    # SERFOR — cada 30 minutos (focos de calor últimas 24h)
    'serfor-focos-30min': {
        'task': 'apps.firms.tasks.importar_serfor_focos',
        'schedule': crontab(minute='*/30'),
    },

    # SERFOR alertas — cada hora
    'serfor-alertas-1h': {
        'task': 'apps.firms.tasks.importar_serfor_alertas',
        'schedule': crontab(minute=45, hour='*/1'),
    },
}
```

---

## 🔄 Flujo completo de datos

```mermaid
sequenceDiagram
    participant CB as Celery Beat
    participant CW as Celery Worker
    participant NASA as NASA FIRMS API
    participant SERFOR as SERFOR API
    participant DB as PostgreSQL + PostGIS
    participant EV as Evaluador Riesgo
    participant AL as Sistema Alertas
    participant APP as React Native

    CB->>CW: Trigger cada 3h / 30min
    
    par Importar FIRMS
        CW->>NASA: GET /api/area/csv/{key}/{sensor}/{bbox}/1
        NASA-->>CW: CSV con detecciones
        CW->>DB: Upsert detecciones_satelitales
    and Importar SERFOR
        CW->>SERFOR: GET MapServer/0/query?f=json&geometry=bbox
        SERFOR-->>CW: JSON con features
        CW->>DB: Upsert detecciones_satelitales
    end
    
    CW->>EV: Evaluar nuevas detecciones
    EV->>DB: ST_DWithin(viviendas, detección, radio)
    EV->>DB: Crear/actualizar evaluaciones_exposicion
    
    alt Viviendas en riesgo detectadas
        EV->>AL: Disparar alertas
        AL->>DB: Crear alertas_emergencia + destinatarios
        AL->>APP: Push notification (FCM)
    end
```

---

## 📋 Variables de entorno necesarias

```env
# .env
FIRMS_MAP_KEY=tu_clave_aqui_de_nasa_firms
DATABASE_URL=postgis://user:pass@localhost:5432/alerta_incendios_coracora
REDIS_URL=redis://localhost:6379/0
FCM_SERVER_KEY=tu_clave_firebase
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
```

> [!CAUTION]
> La `MAP_KEY` de NASA FIRMS **nunca** debe ir en el código fuente ni en el frontend. Solo en variables de entorno del backend. Tu esquema SQL ya lo menciona correctamente en los comentarios.

---

## ✅ Resumen

| API | Frecuencia sugerida | Tipo de integración | Complejidad |
|---|---|---|---|
| **NASA FIRMS** (3 sensores) | Cada 3 horas | CSV → parse → upsert | Baja ✅ |
| **SERFOR focos de calor** | Cada 30 min | ArcGIS REST JSON → upsert | Baja ✅ |
| **SERFOR alertas** | Cada hora | ArcGIS REST JSON → procesar | Baja ✅ |
| **SERFOR ocurrencias** | Diario | ArcGIS REST JSON → histórico | Baja ✅ |
| **SERFOR cicatrices** | Semanal | ArcGIS REST JSON → análisis | Media |

**Todo esto corre dentro de Django + Celery. Cero microservicios adicionales.**
