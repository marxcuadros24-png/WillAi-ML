# 🤖 WillAI — Memoria y Contexto para Agentes AI
## Sistema de Alerta Temprana de Incendios Forestales (Coracora, Parinacochas, Ayacucho)

> **ESTE ARCHIVO ES LA FUENTE DE VERDAD PARA CUALQUIER AGENTE O SESIÓN FUTURA.**
> Leer este archivo al iniciar cualquier sesión para retomar el trabajo exactamente donde se dejó.

---

## 📌 1. Visión y Alcance del Proyecto
* **Propósito:** Plataforma integral para la detección satelital temprana, predicción meteorológica de peligro (FWI), reporte ciudadano georreferenciado y coordinación de brigadas ante incendios forestales en Coracora, Parinacochas, Ayacucho, Perú.
* **Usuarios Finales & Interfaces:**
  - **Panel Web (Django Admin + Centro de Mando Táctico SPA en React/Vite/TS):** **Únicamente para Administradores y Operadores de Emergencia** (COEP/COEL/OGRD).
  - **App Móvil (React Native con Expo):** **Interfaz principal para TODOS los usuarios** (pobladores/ciudadanos, brigadistas y verificadores comunales).

---

## ⚠️ REGLA CRÍTICA OBLIGATORIA: PROHIBIDO INSPECCIONAR EL DOM EN EL NAVEGADOR
* **PROHIBICIÓN ESTRICTA:** Queda **terminantemente prohibido** utilizar herramientas de inspección del DOM (`browser_get_dom`), DevTools o subagentes de captura/serialización del DOM sobre este proyecto.
* **Causa técnica:** La vista `/mapa` contiene mapas interactivos de alta densidad (Leaflet con más de 750 focos satelitales VIIRS/MODIS, polígonos GeoJSON y círculos SVG). La serialización del DOM genera decenas de miles de nodos anidados que saturan la memoria y bloquean/congelan irremediablemente al agente.
* **Protocolo de trabajo:** Todo desarrollo, auditoría, refactorización y verificación visual se realiza **exclusivamente mediante análisis estático de código fuente** (componentes TSX, CSS, Vite) y comprobación de compilación con `npm run build`. Cero herramientas de navegador para DOM.

---

## 🏛️ 2. Stack Tecnológico Unificado (Sin Microservicios)
* **Backend:** Django 5.1.x (Python 3.13) con Django REST Framework.
* **Base de Datos:** PostgreSQL local (puerto 5432, base de datos `alerta_incendios_coracora`).
* **Cálculos Espaciales:** Coordenadas lat/lon de alta precisión, polígonos GeoJSON y distancias geodésicas (Haversine/GeoDjango). Paginación cartográfica extensible hasta 3000-5000 puntos en capa satelital (`DeteccionPagination`).
* **Tareas Asíncronas & Schedule:** Celery + Redis (en desarrollo `CELERY_TASK_ALWAYS_EAGER=True` para ejecución inmediata sin dependencias).
* **Documentación Interactiva:** OpenAPI 3.0 / Swagger UI (`drf-spectacular`) en `/api/docs/`.
* **Motor Predictivo FWI:** Implementación en Python puro del Canadian Forest Fire Weather Index (`apps/predicciones/fwi.py`) sin librerías binarias nativas externas.

---

## 🌐 3. Integración de APIs Externas (100% REALES — CERO DATOS SINTÉTICOS O MOCK)
1. **NASA FIRMS (Focos de calor satelitales VIIRS [375m] y MODIS [1km]):**
   - API Key real configurada en `backend/.env`: `a84d23a9aab653f18f15991290bd093e`.
   - Sensores consumidos: Archivo histórico (`VIIRS_SNPP_SP`, `MODIS_SP`) y Tiempo casi-real (`VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `MODIS_NRT`).
   - Tarea Celery: `importar_firms_multi_sensor_task` (cada 3 horas) y tarea unitaria `importar_firms_task`.
   - Descarga histórica 100% satelital: ventanas oficiales de 5 días con fecha específica hasta 2 años (730 días) en el Bounding Box provincial oficial (`[-74.30, -15.65, -72.85, -14.50]`).
   - Endpoints: `GET /api/v1/firms/detecciones/` y `GET /api/v1/firms/detecciones/historial_meses/?meses=6`.
   - Comando de importación histórica real (2 años):
     ```powershell
     python manage.py importar_firms_historico --dias 730 --paso 5
     ```
   - Comandos de importación puntual:
     - `python manage.py importar_firms --todos --days 3`
     - `python manage.py importar_firms --modis --days 5`
2. **SERFOR Perú (ArcGIS MapServer de incendios oficiales):**
   - Endpoint: `https://geo.serfor.gob.pe/geoservicios/rest/services/Visor/Incendios_Forestales/MapServer/0/query`.
   - No requiere clave. Tarea: `importar_serfor_task` (cada 30 min).
   - Comando manual: `python manage.py importar_firms --serfor`.
3. **Open-Meteo (Meteorología en tiempo real y serie horaria pasada):**
   - Endpoint: `https://api.open-meteo.com/v1/forecast` para Coracora (`lat=-15.0189, lon=-73.7806`).
   - Retries automáticos, User-Agent explícito y tolerancia a fallos.
   - Endpoint: `GET /api/v1/meteorologia/observaciones/actual/`.
   - Comando manual: `python manage.py importar_meteo`.
4. **Motor de Machine Learning de Viento (12 Horas):**
   - Implementación: `apps/predicciones/ml_viento.py` (Random Forest Multi-Output Regressor descomponiendo vectores $u, v$).
   - Consume series horarias pasadas (14 días) y de pronóstico reales de Open-Meteo.
   - Predice velocidad, dirección meteorológica, rumbo de propagación del fuego/humo ($(\theta + 180)^\circ$), ráfagas y conos GeoJSON de dispersión para las próximas 12 horas.
   - Endpoints: `GET /api/v1/predicciones/predicciones/viento_12h/` y `POST /api/v1/predicciones/predicciones/entrenar_viento/`.
   - Comando manual: `python manage.py entrenar_viento`.
5. **Motor de Machine Learning de Riesgo de Ocurrencia / Susceptibilidad Territorial:**
   - Implementación: `apps/predicciones/ml_ocurrencia.py` (RandomForestClassifier Calibrado con sigmoide/Platt scaling + comparación frente a Línea Base de Regresión Logística).
   - Prevención de fuga de información: División temporal estricta (70% días iniciales para entrenamiento, 30% cronológico final para prueba) y buffer espacial de 6 km para pseudo-negativos.
   - Variables explicativas: Temperatura máxima, humedad media, viento máximo, precipitación diaria, lluvia previa de 3 días, FWI canadiense, ISI, elevación andina real (2,200 - 4,800 msnm), pendiente y distancia a comunidades de Parinacochas.
   - Datos de entrenamiento: 1,859 detecciones históricas reales de NASA FIRMS (VIIRS + MODIS de 2 años completos) + serie histórica diaria real de Open-Meteo Archive (731 días).
   - Endpoints: `GET /api/v1/predicciones/predicciones/riesgo_ocurrencia/` y `POST /api/v1/predicciones/predicciones/entrenar_ocurrencia/`.
   - Comando manual: `python manage.py entrenar_ocurrencia --test-ratio 0.30`.
   - Visualización: Capa independiente en Leaflet (`showRiesgoOcurrencia`) con cuadrícula de 265 celdas vectoriales delimitadas cubriendo los 8 distritos de la Provincia de Parinacochas (Pullo, Coracora, Coronel Castañeda, Puyusca, Upahuacho, Chumpi, Ravacayco y Pacapausa), probabilidades calibradas, nivel de riesgo y control toggle desacoplado.

---

## 🚀 4. Estado de Ejecución por Fases

| Fase | Nombre | Estado | Resumen |
|:---:|---|:---:|---|
| **0** | **Entorno de desarrollo** | ✅ COMPLETADO | Python 3.11 en `backend/.venv` (vía `uv`), PostgreSQL en puerto 5432, settings modular, Celery, Swagger UI, scikit-learn, numpy, scipy. |
| **1** | **Modelos Base** | ✅ COMPLETADO | `apps.usuarios` (Usuario personalizado, Roles, Permisos, registro de ciudadanos) y `apps.geografia` (Distrito Coracora, Comunidades). Seed cargado con `python manage.py seed_base`. |
| **2** | **Core Operativo** | ✅ COMPLETADO | `apps.respuesta` (Entidades operativas: Bomberos B-12, SERFOR, OGRD, Brigada Comunal Huaccana; Brigadas y Recursos), `apps.reportes` (Reportes ciudadanos con fotos, validaciones, sync offline), `apps.incidentes` (Flujo de incidentes, despacho de brigadas, bitácora de acciones, actas de cierre). |
| **3** | **APIs Externas Reales** | ✅ COMPLETADO | `apps.firms` (NASA FIRMS autenticado con MAP_KEY real consumiendo **VIIRS + MODIS**, histórico real de 180 días descargado en BD y SERFOR MapServer) y `apps.meteorologia` (Open-Meteo en vivo con temperatura, humedad, viento y lluvia real de Coracora). |
| **4** | **Predicciones FWI + ML Viento 12h + Alertas** | ✅ COMPLETADO | `apps.predicciones` (Motor FWI canadiense alimentado por Open-Meteo real + **Modelo ML Random Forest a 12 horas de propagación de viento y conos de dispersión**) y `apps.alertas` (Evaluador de viviendas expuestas, generación automática de alertas y confirmación de lectura). |
| **5** | **Complementarios** | ✅ COMPLETADO | `apps.gamificacion` (insignias, actividades comunitarias, auto-otorgamiento al validar reportes), `apps.donaciones` (ofertas moderadas, inventario de ítems, asignaciones a incidentes/brigadas), `apps.auditoria` (trazabilidad forense, hash SHA-256 anónimo de IP, middleware de logging). |
| **6** | **Centro de Mando Táctico Web** | ✅ COMPLETADO | Frontend SPA desacoplado en React + Vite + TS con arquitectura modular multi-ruta (`react-router-dom`), autenticación de operadores/admin (`/login`), páginas dedicadas (`/panel`, `/mapa`, `/incidentes`, `/reportes`, `/usuarios`, `/alertas`, `/donaciones`, `/satelites`), modales tácticos operativos (despacho, cierre con acta, emisión de alerta), calibración FWI + ML anti-lluvia, diseño anti-slop (`taste-skill`) y conexión 100% a endpoints reales de PostgreSQL. |
| **7** | **App Móvil React Native** | ⏳ SIGUIENTE | Aplicación móvil principal en Expo/React Native para todos los usuarios (ciudadanos, brigadistas y verificadores comunales). |

---

## 🛠️ 5. Comandos Clave para el Entorno

```powershell
# Activar entorno virtual
cd backend
.\.venv\Scripts\Activate.ps1

# Ejecutar chequeo del sistema
python manage.py check

# Ejecutar las pruebas unitarias completas (100% passing)
python manage.py test apps.usuarios.test_usuarios apps.geografia.test_geografia apps.respuesta.test_respuesta apps.reportes.test_reportes apps.incidentes.test_incidentes apps.firms.test_firms apps.meteorologia.test_meteorologia apps.predicciones.test_predicciones apps.alertas.test_alertas apps.gamificacion.test_gamificacion apps.donaciones.test_donaciones apps.auditoria.test_auditoria apps.panel.test_panel

# Sembrar estructura geográfica base y superusuario admin
python manage.py seed_base

# Sembrar datos operacionales de Coracora (Brigadas B-12/Huallhua/OGRD/SERFOR, Incidentes, Reportes, Alertas, Donaciones)
python manage.py seed_operativo

# Sembrar catálogo oficial de 8 insignias cívicas de mérito WillAI
python manage.py seed_insignias

# Sembrar cuadro de honor, colaboradores comunales y actividades validadas
python manage.py seed_gamificacion

# Consultar meteorología en tiempo real desde Open-Meteo
python manage.py importar_meteo

# Calcular índice FWI Canadiense con datos meteorológicos reales
python manage.py calcular_fwi

# Entrenar modelo Machine Learning de viento (12 horas) con series Open-Meteo
python manage.py entrenar_viento

# Entrenar modelo Machine Learning de riesgo de ocurrencia (NASA FIRMS + Open-Meteo)
python manage.py entrenar_ocurrencia --test-ratio 0.30

# Importar datos satelitales NASA FIRMS recientes (VIIRS + MODIS)
python manage.py importar_firms --todos --days 3

# Descargar histórico oficial de 180 días (6 meses) de NASA FIRMS (MODIS + VIIRS)
python manage.py importar_firms_historico --dias 180 --paso 5

# Importar focos de calor oficiales de SERFOR Perú
python manage.py importar_firms --serfor

# Iniciar servidor backend Django
python manage.py runserver 127.0.0.1:8000

# Iniciar servidor frontend SPA (funciona desde la raíz del proyecto o dentro de frontend/)
npm run dev

# Compilar frontend para producción
npm run build
```

---

## 🔑 6. Accesos y Credenciales de Desarrollo
* **Superusuario Admin:** `admin` / Contraseña: `admin12345` (Correo: `admin@willai.pe`).
* **PostgreSQL:** Base de datos `alerta_incendios_coracora`, usuario `postgres`, contraseña `123456`.
* **NASA FIRMS MAP_KEY:** `a84d23a9aab653f18f15991290bd093e`.
* **Swagger UI Docs:** `http://127.0.0.1:8000/api/docs/`.
* **Django Admin:** `http://127.0.0.1:8000/admin/`.
* **Centro de Mando Web SPA:** `http://localhost:5173/`.
