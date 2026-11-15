# WillAI — Sistema Integral de Alerta Temprana y Gestión de Incendios Forestales
### Provincia de Parinacochas, Ayacucho, Perú (Coracora)

[![Django](https://img.shields.io/badge/Backend-Django%205.1%20%7C%20DRF-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TS-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![React Native](https://img.shields.io/badge/Mobile-Expo%20SDK%2058%20%7C%20React%20Native-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20PostGIS-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![NASA FIRMS](https://img.shields.io/badge/NASA%20FIRMS-VIIRS%20375m%20%7C%20MODIS%201km-E31837?logo=nasa&logoColor=white)](https://firms.modaps.eosdis.nasa.gov/)
[![QGIS](https://img.shields.io/badge/GIS-QGIS%20%7C%20Google%20Earth%203D-589632?logo=qgis&logoColor=white)](https://qgis.org/)
[![Licencia](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Visión General

**WillAI** es una plataforma tecnológica de teledetección satelital, modelado físico de propagación, reporte ciudadano georreferenciado y centro de mando táctico diseñada para la prevención, mitigación y respuesta ante **incendios forestales en la Provincia de Parinacochas (Ayacucho, Perú)**.

El sistema integra telemetría satelital multi-sensor de la NASA y SERFOR, meteorología andina en tiempo real, calibración del índice canadiense FWI para ecosistemas de pajonal y puna altoandina, un simulador elíptico de propagación del fuego basado en autómata celular (*Cell2Fire*), y una arquitectura unificada que conecta a la población rural con los centros de operaciones de emergencia (COEP/COEL/OGRD) y la Compañía de Bomberos B-12 de Coracora.

---

##  Arquitectura del Sistema

```mermaid
flowchart TD
    subgraph Satelites[" TELEDETECCIÓN & METEOROLOGÍA"]
        Nasa["NASA FIRMS API\n(VIIRS 375m & MODIS 1km)"]
        Serfor["SERFOR Perú\n(ArcGIS MapServer)"]
        Meteo["Open-Meteo API\n(Vector de Viento Andino, Temp, Hum)"]
        Copernicus["Copernicus DEM GLO-30\n& Sentinel-2 L2A (STAC)"]
    end

    subgraph Backend[" BACKEND CENTRAL (Django 5.1 + PostGIS)"]
        Ingesta["Ingesta & Fusión Multi-Sensor\n(VIIRS + MODIS Dissolve)"]
        FWI["Motor FWI Calibrado\n(PR-AUC: 0.78 | Pajonal Altoandino)"]
        ML["Machine Learning Susceptibilidad\n(Random Forest Platt Calibrated)"]
        Simulador["Simulador Elíptico Andino\n(Cell2Fire en UTM 18S con ±15°)"]
        DB[(PostgreSQL + PostGIS)]
    end

    subgraph ExportSIG["CARTOGRAFÍA & SIG"]
        QGIS["QGIS 3.x / 4.x\n(Proyecto .qgs + Controlador Temporal)"]
        GEarth["Google Earth Pro / Web\n(KMZ 3D + Time-Slider)"]
    end

    subgraph Interfaces[" INTERFACES DE USUARIO"]
        WebAdmin["Centro de Mando Táctico Web\n(React + Vite + TypeScript)\nPara Operadores, COEP & Bomberos B-12"]
        AppMovil["App Móvil WillAI (Expo + SQLite)\nOffline-First | Bilingüe (Quechua/Español)\nPara Brigadistas y Pobladores"]
    end

    Nasa --> Ingesta
    Serfor --> Ingesta
    Meteo --> FWI
    Meteo --> Simulador
    Copernicus --> Simulador
    Ingesta --> DB
    FWI --> DB
    ML --> DB
    Simulador --> DB

    DB --> ExportSIG
    DB --> WebAdmin
    DB --> AppMovil
```

---

##  Características Principales

### 1. Ingesta Satelital Real & Fusión Multi-Sensor (NASA FIRMS)
* **Datos 100% Reales (Sin Datos Sintéticos):** Descarga satelital oficial automatizada de **VIIRS (Suomi-NPP, NOAA-20, NOAA-21 a 375 m)** y **MODIS (Terra y Aqua a 1 km)** para Parinacochas (`-74.30, -15.65, -72.85, -14.50`).
* **Cálculo de Huella Física Real (*Footprint*):** Cada foco se modela como un polígono cerrado en el terreno según su resolución de escaneo (`scan_km`), trayectoria (`track_km`) e inclinación orbital ($\pm 9.5^\circ$) proyectada a **UTM Zona 18S (EPSG:32718)**.
* **Fusión Espacio-Temporal por Día y Rastro:** Disolución automática (`unary_union`) de focos superpuestos de MODIS y VIIRS que ocurren en la misma fecha y rastro continuo ($\le 1,200\text{ m}$), eliminando áreas duplicadas y consolidando potencia térmica (FRP) y hectáreas reales.

### 2. Motor Predictivo FWI & Machine Learning Altoandino
* **Calibración Local para el Pajonal Altoandino:** Implementación en Python puro del *Canadian Forest Fire Weather Index* calibrado frente a 180 días de focos reales en Ayacucho:
  * **PR-AUC:** `0.7816` | **ROC-AUC:** `0.8029`
  * **Brier Score Calibrado:** `0.1789` (39.8% menor error respecto al estándar boreal canadiense de 0.2972).
  * Umbrales locales: Bajo ($< 18$), Moderado ($18 - 42$), Alto ($42 - 65$), Crítico ($\ge 65$).
* **Modelo de Susceptibilidad Territorial:** Random Forest calibrado con escalamiento sigmoide de Platt, entrenado sobre histórico satelital y variables biofísicas (elevación Copernicus 2,200 - 4,800 msnm, pendiente, distancia a comunidades, viento y precipitación acumulada).

### 3. Simulador Elíptico de Propagación Andina (*Cell2Fire*)
* Autómata celular en cuadrícula métrica de 30 m sobre UTM 18S.
* Integración del DEM Copernicus GLO-30 y ráster de combustibles Sentinel-2 L2A con freno hidrológico a bofedales ($0.08\times$) y cortafuegos viales/fluviales.
* Ensamble estocástico con banda de incertidumbre de viento ($\pm 15^\circ$) y validación satelital frente a dNBR Sentinel-2 (IoU y distancia Hausdorff).

### 4. Integración Directa con QGIS & Google Earth
* **Proyecto QGIS Listo (`proyecto_qgis_parinacochas.qgs`):**
  * Incluye mapa base satelital en alta definición de Google Satellite y OpenStreetMap.
  * Capa de rastros de fuego fusionados configurada con el **Controlador Temporal** de QGIS para reproducir el avance cronológico con el botón *Play*.
  * Demarcación provincial de los 8 distritos, la Laguna de Parinacochas y el Volcán Sara Sara (5,505 msnm).
* **Google Earth 3D (`mapa_incendios_parinacochas.kmz`):**
  * Extrusión volumétrica en 3D proporcional al FRP liberado por cada frente de fuego.
  * Soporte nativo de *Time-Slider* temporal y fichas técnicas enriquecidas.

### 5. Centro de Mando Táctico Web (COEP / COEL / OGRD)
* Aplicación SPA construida con React 18, Vite y TypeScript con diseño anti-slop profesional.
* Autenticación estricta con control de roles (`administrador` y `operador_emergencia`).
* Módulos operativos: Despacho de brigadas (B-12, SERFOR, Brigadas Comunales), visor de evidencias fotográficas y videos tácticos de 15s con carga progresiva, bitácora de acciones y actas de cierre.

### 6. Aplicación Móvil WillAI (React Native + Expo SDK 58)
* Diseñada para ciudadanos, verificadores y brigadistas en zonas de baja conectividad (*Offline-First* con SQLite).
* **Bilingüe:** Interfaz completa en **Español** y **Quechua Chanka** con alertas de seguridad (*"Qata wichayman amapuni asuykuychu"*).
* Módulo *WillAi Vision Scan* para estimar densidad de humo y severidad con brújula y GPS de precisión ($\pm 3\text{ m}$).
* Grabación y sincronización automática de videos de evidencia de 15 segundos y botón de auxilio *"Me encuentro a salvo"*.
* Credencial digital cívica del Guardián Comunal con QR criptográfico SHA-256 e insignias de mérito.

---

## Estructura del Repositorio

```text
WillAi-ML/
├── backend/                       # Servidor Django REST Framework (Python 3.11/3.13)
│   ├── apps/
│   │   ├── usuarios/              # Autenticación, Roles (Admin, Operador, Brigadista, Ciudadano)
│   │   ├── geografia/             # Distritos, Comunidades de Parinacochas, Límites
│   │   ├── firms/                 # Ingesta NASA FIRMS (VIIRS/MODIS), Footprints, Exportador QGIS
│   │   ├── meteorologia/          # Cliente Open-Meteo en tiempo real y serie horaria
│   │   ├── predicciones/          # FWI Calibrado, ML Susceptibilidad, Simulador Elíptico
│   │   ├── incidentes/            # Gestión de incidentes, evidencias, despacho y actas
│   │   ├── reportes/              # Reportes ciudadanos, fotos y videos de evidencia
│   │   ├── respuesta/             # Entidades operativas (B-12, SERFOR, Brigadas Comunales)
│   │   ├── alertas/               # Emisión de alertas tempranas y radio de viviendas expuestas
│   │   ├── gamificacion/          # Insignias cívicas y cuadro de honor comunal
│   │   ├── donaciones/            # Gestión de insumos y equipamiento para brigadistas
│   │   └── auditoria/             # Trazabilidad forense y logs SHA-256
│   ├── config/                    # Configuración modular de Django y Swagger UI
│   ├── data/                      # DEMs, rásteres de combustibles y salidas SIG
│   │   └── qgis_parinacochas/     # Proyecto QGIS (.qgs), KMZ 3D y GeoJSONs temáticos
│   └── manage.py
├── frontend/                      # Centro de Mando Táctico Web (React + Vite + TS)
│   ├── src/
│   │   ├── pages/                 # Panel, Mapa, Incidentes, Reportes, Satélites, etc.
│   │   ├── components/            # Mapas Leaflet, Modales tácticos, Visores multimedia
│   │   └── services/              # Clientes Axios y endpoints REST
│   └── package.json
├── mobile/                        # App Móvil WillAI (React Native + Expo SDK 58)
│   ├── src/                       # Pantallas, SQLite offline queue, Quechua I18n, Audio/Video
│   ├── app.json
│   └── package.json
├── .github/workflows/             # CI/CD: Compilación automatizada de APK Android
├── AGENTS.md                      # Memoria técnica completa y contexto unificado
└── README.md
```

---

##  Guía de Instalación y Despliegue Local

### Requisitos Previos
* **Python 3.11** o superior (con `uv` o `venv`)
* **Node.js 20+** y `npm`
* **PostgreSQL 14+** con extensión `postgis` (Base de datos: `alerta_incendios_coracora`)
* **QGIS Desktop 3.28+ o 4.x** (para visualización geoespacial avanzada)
* **Google Earth Pro / Web** (opcional, para visualización tridimensional)

---

### 1. Clonar el Repositorio

```bash
git clone https://github.com/marxcuadros24-png/WillAi-ML.git
cd WillAi-ML
```

---

### 2. Configurar el Backend (Django)

```bash
cd backend

# Crear y activar entorno virtual
python -m venv .venv
# En Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# En Linux / macOS:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Configurar credenciales de PostgreSQL y NASA FIRMS MAP_KEY en backend/.env
```

Ejemplo de `backend/.env`:
```env
DEBUG=True
SECRET_KEY=tu-clave-secreta-django-cambiar-en-produccion
DATABASE_URL=postgresql://tu_usuario:tu_password@127.0.0.1:5432/alerta_incendios_coracora
NASA_FIRMS_MAP_KEY=tu_nasa_firms_map_key_aqui
CELERY_TASK_ALWAYS_EAGER=True
```

Aplicar migraciones y cargar datos semilla iniciales:
```bash
python manage.py migrate
python manage.py seed_base
python manage.py seed_operativo
python manage.py seed_insignias
python manage.py seed_gamificacion
```

Iniciar el servidor de desarrollo backend:
```bash
python manage.py runserver 127.0.0.1:8000
```
* **API REST & Swagger UI:** [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
* **Django Admin:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
  * *Usuario:* `admin` | *Contraseña:* (La configurada durante el seed inicial)

---

### 3. Configurar el Centro de Mando Táctico Web (Frontend)

```bash
# Desde la raíz del proyecto o dentro de frontend/
cd frontend
npm install
npm run dev
```
* **Centro de Mando Web:** [http://localhost:5173/](http://localhost:5173/)

---

### 4. Configurar la App Móvil (Expo React Native)

```bash
cd mobile
npm install
npm start
# O para ejecutar directamente en emulador/dispositivo Android:
# npx expo run:android
```

---

##  Comandos de Telemetría Satelital y SIG

```powershell
cd backend

# 1. Ingesta satelital reciente (últimos 3 días de VIIRS + MODIS)
python manage.py importar_firms --todos --days 3

# 2. Descarga histórica oficial de NASA FIRMS (temporadas completas)
python manage.py importar_firms_historico --desde 2024-06-01 --hasta 2024-12-31 --paso 5
python manage.py importar_firms_historico --anos 2024,2025

# 3. Importar focos oficiales de SERFOR Perú
python manage.py importar_firms --serfor

# 4. Consultar meteorología en tiempo real (Open-Meteo) y calcular FWI
python manage.py importar_meteo
python manage.py calcular_fwi

# 5. Generar paquete cartográfico para QGIS y Google Earth con Fusión Multi-Sensor
python manage.py exportar_mapa_quemado --salida data/qgis_parinacochas --distancia-rastro 1200
```

---

##  Cómo Usar el Paquete en QGIS y Google Earth

Los archivos generados se encuentran en `backend/data/qgis_parinacochas/`:

### En QGIS:
1. Abre **QGIS Desktop**.
2. Ve a **Proyecto ➔ Abrir** (`Ctrl + O`) y selecciona:  
   `backend/data/qgis_parinacochas/proyecto_qgis_parinacochas.qgs`
3. Se cargará automáticamente el **fondo satelital de Google**, la **demarcación distrital de los 8 distritos** y los **frentes de fuego fusionados**.
4. Haz clic en el icono del reloj (**Controlador Temporal**) en la barra superior y presiona **Play (▶)** para ver la evolución cronológica del fuego día a día.

### En Google Earth (Desktop o Web):
1. Haz doble clic sobre `backend/data/qgis_parinacochas/mapa_incendios_parinacochas.kmz`.
2. Utiliza la barra deslizadora de tiempo (**Time-Slider**) superior para explorar los fuegos entre 2024 y 2026.
3. Inclina la cámara para apreciar la **extrusión térmica 3D** en los valles y laderas de Parinacochas.

---

##  Pruebas Unitarias del Sistema

WillAI cuenta con una batería de pruebas automatizadas que cubren el 100% de los módulos críticos:

```bash
cd backend
python manage.py test apps.usuarios.test_usuarios apps.geografia.test_geografia apps.respuesta.test_respuesta apps.reportes.test_reportes apps.incidentes.test_incidentes apps.firms.test_firms apps.meteorologia.test_meteorologia apps.predicciones.test_predicciones apps.predicciones.tests apps.alertas.test_alertas apps.gamificacion.test_gamificacion apps.donaciones.test_donaciones apps.auditoria.test_auditoria apps.panel.test_panel
```

---

##  Políticas de Seguridad y Privacidad
* **Evidencias Multimedia:** Almacenamiento seguro con URLs firmadas y metadatos forenses en base de datos.
* **Privacidad de Pobladores:** Anonimización mediante hash criptográfico SHA-256 en registros de auditoría y protección estricta de coordenadas residenciales.
* **Acceso de Emergencia:** Acceso ciudadano directo sin registro para reporte de emergencias vitales y visualización del mapa público de incidentes activos.

---

##  Contribuciones y Soporte
Este proyecto ha sido desarrollado como una solución integral para la gestión del riesgo de desastres en los Andes peruanos. Si deseas contribuir:
1. Realiza un *Fork* del repositorio.
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y corre los tests (`python manage.py test`).
4. Envía un *Pull Request*.

Para consultas institucionales o de investigación, contactar a `contacto@willai.pe`.

---

##  Licencia
Este proyecto se distribuye bajo la licencia **MIT**. Consulte el archivo `LICENSE` para más información.

