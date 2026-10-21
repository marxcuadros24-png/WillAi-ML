# 🤖 WillAI — Memoria y Contexto para Agentes AI
## Sistema de Alerta Temprana de Incendios Forestales (Coracora, Parinacochas, Ayacucho)

> **ESTE ARCHIVO ES LA FUENTE DE VERDAD PARA CUALQUIER AGENTE O SESIÓN FUTURA.**
> Leer este archivo al iniciar cualquier sesión para retomar el trabajo exactamente donde se dejó.

---

## 📌 1. Visión y Alcance del Proyecto
* **Propósito:** Plataforma integral para la detección satelital temprana, predicción meteorológica de peligro (FWI), reporte ciudadano georreferenciado y coordinación de brigadas ante incendios forestales en Coracora, Parinacochas, Ayacucho, Perú.
* **Usuarios Finales & Interfaces:**
  - **Panel Web (Django Admin + Templates/HTMX):** **Únicamente para Administradores y Operadores de Emergencia** (COEP/COEL/OGRD).
  - **App Móvil (React Native con Expo):** **Interfaz principal para TODOS los usuarios** (pobladores/ciudadanos, brigadistas y verificadores comunales).

---

## 🏛️ 2. Stack Tecnológico Unificado (Sin Microservicios)
* **Backend:** Django 5.1.x (Python 3.13) con Django REST Framework.
* **Base de Datos:** PostgreSQL local (puerto 5432, base de datos `alerta_incendios_coracora`).
* **Cálculos Espaciales:** Coordenadas lat/lon de alta precisión, polígonos GeoJSON y distancias geodésicas (Haversine/GeoDjango).
* **Tareas Asíncronas & Schedule:** Celery + Redis (en desarrollo `CELERY_TASK_ALWAYS_EAGER=True` para ejecución inmediata sin dependencias).
* **Documentación Interactiva:** OpenAPI 3.0 / Swagger UI (`drf-spectacular`) en `/api/docs/`.
* **Motor Predictivo FWI:** Implementación en Python puro del Canadian Forest Fire Weather Index (`apps/predicciones/fwi.py`) sin librerías binarias nativas externas.

---

## 🌐 3. Integración de APIs Externas (100% Gratuitas)
1. **NASA FIRMS (Focos de calor satelitales VIIRS / MODIS):**
   - API Key del usuario: `a84d23a9aab653f18f15991290bd093e` (configurada en `backend/.env`).
   - Tarea Celery: `importar_firms_task` (cada 3 horas).
   - Comando manual: `python manage.py importar_firms --sensor VIIRS_NOAA20_NRT --days 3`.
2. **SERFOR Perú (ArcGIS MapServer de incendios oficiales):**
   - Endpoint: `https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/0/query`.
   - No requiere clave. Tarea: `importar_serfor_task` (cada 30 min).
3. **Open-Meteo (Meteorología en tiempo real e histórica):**
   - Endpoint: `https://api.open-meteo.com/v1/forecast` para Coracora (`lat=-15.0189, lon=-73.7806`).
   - No requiere clave. Tarea: `importar_openmeteo_task` (cada 1 hora).
   - Comando manual: `python manage.py importar_meteo`.

---

## 🚀 4. Estado de Ejecución por Fases

| Fase | Nombre | Estado | Resumen |
|:---:|---|:---:|---|
| **0** | **Entorno de desarrollo** | ✅ COMPLETADO | Python 3.13 en `backend/.venv`, PostgreSQL en puerto 5432, settings modular (`base`, `development`, `production`), Celery, Swagger UI. |
| **1** | **Modelos Base** | ✅ COMPLETADO | `apps.usuarios` (Usuario personalizado, Roles, Permisos, registro de ciudadanos) y `apps.geografia` (Distrito Coracora, Comunidades). Seed cargado con `python manage.py seed_base`. |
| **2** | **Core Operativo** | ✅ COMPLETADO | `apps.respuesta` (Entidades, Brigadas, Recursos), `apps.reportes` (Reportes ciudadanos con fotos, validaciones, sync offline), `apps.incidentes` (Flujo de incidentes, despacho de brigadas, bitácora de acciones, actas de cierre). |
| **3** | **APIs Externas** | ✅ COMPLETADO | `apps.firms` (NASA FIRMS autenticado con MAP_KEY real + SERFOR) y `apps.meteorologia` (Open-Meteo en vivo, catálogo de viviendas rurales, zonas de riesgo). |
| **4** | **Predicciones FWI + Alertas** | ✅ COMPLETADO | `apps.predicciones` (Motor FWI canadiense calculando FFMC, DMC, DC, ISI, BUI, FWI) y `apps.alertas` (Evaluador de viviendas expuestas, generación automática de alertas y confirmación de lectura). |
| **5** | **Complementarios** | ✅ COMPLETADO | `apps.gamificacion` (insignias, actividades comunitarias, auto-otorgamiento al validar reportes), `apps.donaciones` (ofertas moderadas, inventario de ítems, asignaciones a incidentes/brigadas), `apps.auditoria` (trazabilidad forense, hash SHA-256 anónimo de IP, middleware de logging). |
| **6** | **Panel Web Administrativo** | ✅ COMPLETADO | Centro de Mando Táctico (`/panel/`) + Django Admin (`/admin/`) con Leaflet satelital ESRI en vivo, validación de reportes con 1 clic, despacho de brigadas, acta y modal de cierre de incidentes con liberación automática de brigadas, emisión rápida de alertas comunitarias, moderación de donaciones y sincronización de APIs en tiempo real. 30 pruebas unitarias pasando al 100%. |
| **7** | **App Móvil React Native** | ⏳ SIGUIENTE | Aplicación móvil principal en Expo/React Native para todos los usuarios (ciudadanos, brigadistas y verificadores comunales). |

---

## 🛠️ 5. Comandos Clave para el Entorno

```powershell
# Activar entorno virtual
cd backend
.\.venv\Scripts\Activate.ps1

# Ejecutar chequeo del sistema
python manage.py check

# Ejecutar las 30 pruebas unitarias completas
python manage.py test apps.usuarios.test_usuarios apps.geografia.test_geografia apps.respuesta.test_respuesta apps.reportes.test_reportes apps.incidentes.test_incidentes apps.firms.test_firms apps.meteorologia.test_meteorologia apps.predicciones.test_predicciones apps.alertas.test_alertas apps.gamificacion.test_gamificacion apps.donaciones.test_donaciones apps.auditoria.test_auditoria apps.panel.test_panel

# Sembrar insignias base
python manage.py seed_insignias

# Importar datos satelitales NASA FIRMS reales
python manage.py importar_firms --bbox="-81.3,-18.4,-68.6,0.0" --days=3

# Consultar meteorología en tiempo real
python manage.py importar_meteo

# Calcular índice FWI de peligro
python manage.py calcular_fwi

# Iniciar servidor de desarrollo
python manage.py runserver 127.0.0.1:8000
```

---

## 🔑 6. Accesos y Credenciales de Desarrollo
* **Superusuario Admin:** `admin` / Contraseña: `admin12345` (Correo: `admin@willai.pe`).
* **PostgreSQL:** Base de datos `alerta_incendios_coracora`, usuario `postgres`, contraseña `123456`.
* **NASA FIRMS MAP_KEY:** `a84d23a9aab653f18f15991290bd093e`.
* **Swagger UI Docs:** `http://127.0.0.1:8000/api/docs/`.
* **Django Admin:** `http://127.0.0.1:8000/admin/`.
