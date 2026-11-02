# 🐳 Guía de Despliegue con Docker — WillAI
## Sistema de Alerta Temprana de Incendios Forestales (Coracora, Parinacochas, Ayacucho)

Esta guía explica cómo ejecutar todo el ecosistema de **WillAI** en cualquier otra máquina (Windows, Linux, macOS o Servidor Cloud) utilizando **Docker** y **Docker Compose**.

---

## 🏛️ Arquitectura de Contenedores

El archivo `docker-compose.yml` orquesta 6 servicios conectados en una red interna aislada:

| Servicio | Contenedor | Descripción | Puertos |
|---|---|---|---|
| **`db`** | `willai_db` | Base de datos espacial PostgreSQL 16 con extensión PostGIS 3.4 para cálculos geodésicos y polígonos. | `5432:5432` |
| **`redis`** | `willai_redis` | Servidor Redis 7 en memoria para caché y broker de tareas asíncronas de Celery. | `6379:6379` |
| **`backend`** | `willai_backend` | API REST Django 5.1 con GeoDjango, GDAL/GEOS, motor FWI, Simulador de Propagación y Gunicorn WSGI. | `8000:8000` |
| **`celery_worker`** | `willai_celery_worker` | Worker de Celery para descargas automáticas de NASA FIRMS (VIIRS + MODIS), SERFOR y Open-Meteo. | Interno |
| **`celery_beat`** | `willai_celery_beat` | Planificador de tareas recurrentes cada 30 min / 3 horas. | Interno |
| **`frontend`** | `willai_frontend` | Centro de Mando Táctico Web en React 19 + Vite servido a través de Nginx como proxy inverso. | `80:80`, `5173:80` |

---

## ⚡ Método 1: Ejecución Rápida en Otra Máquina (Recomendado)

Si la otra máquina tiene **Docker Desktop** (o Docker Engine en Linux) y acceso a internet para descargar las imágenes base:

### Paso 1: Copiar o Clonar el Proyecto
Copia la carpeta del proyecto a la otra máquina o clona el repositorio desde GitHub:
```bash
git clone -b predict_ML https://github.com/marxcuadros24-png/WillAi-ML.git
cd WillAi-ML
```

### Paso 2: Levantar el Sistema
Ejecuta un único comando en la raíz del proyecto:
```bash
docker compose up -d --build
```

Docker se encargará automáticamente de:
1. Construir las imágenes de backend (con GDAL/GEOS) y frontend (con Nginx).
2. Levantar PostGIS y verificar su salud (`healthcheck`).
3. Ejecutar las migraciones de Django (`python manage.py migrate`).
4. Sembrar automáticamente el superusuario administrador (`admin` / `admin12345`), brigadas, comunidades y catálogo de insignias.
5. Recolectar archivos estáticos de Django (`collectstatic`).
6. Iniciar el servidor web Nginx y el Centro de Mando Táctico.

### Paso 3: Acceder al Sistema
Abre tu navegador web en:
* **Centro de Mando Táctico Web (SPA):** [http://localhost](http://localhost) (o [http://localhost:5173](http://localhost:5173))
* **Django Admin:** [http://localhost/admin/](http://localhost/admin/) (Usuario: `admin` | Clave: `admin12345`)
* **Documentación OpenAPI / Swagger:** [http://localhost/api/docs/](http://localhost/api/docs/)
* **API REST Directa:** [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

> **Tip para Red Local (LAN):** Si la máquina es un servidor, los demás equipos o celulares en la misma red Wi-Fi pueden entrar directamente escribiendo la IP de la máquina (ej: `http://192.168.1.50`). El proxy Nginx y los endpoints se adaptan automáticamente sin errores de CORS.

---

## 📦 Método 2: Exportar Imágenes para Instalación Offline (Sin Internet)

Si la otra máquina **NO tiene conexión a internet** o deseas llevar el sistema completo en una memoria USB o disco externo:

### En la máquina actual (donde tienes Docker con internet):

1. **Construir y descargar todas las imágenes:**
   ```bash
   docker compose build
   docker compose pull db redis
   ```

2. **Empaquetar todas las imágenes en un archivo comprimido:**
   ```bash
   docker save willai-ml-backend willai-ml-frontend postgis/postgis:16-3.4 redis:7-alpine | gzip > willai_docker_completo.tar.gz
   ```

3. **Copiar a tu USB:**
   Lleva a la otra máquina:
   - El archivo `willai_docker_completo.tar.gz`
   - La carpeta del proyecto (que contiene `docker-compose.yml`, `data/`, etc.)

### En la máquina de destino (offline):

1. **Cargar las imágenes en Docker:**
   ```bash
   docker load < willai_docker_completo.tar.gz
   ```

2. **Levantar los contenedores sin necesidad de descargar nada:**
   ```bash
   docker compose up -d
   ```

---

## 🛠️ Comandos de Mantenimiento Frecuentes

```bash
# Ver el estado de todos los contenedores
docker compose ps

# Ver los logs en tiempo real de todos los servicios
docker compose logs -f

# Ver los logs solo del backend Django
docker compose logs -f backend

# Ejecutar un comando de Django (ej. importar focos NASA FIRMS manualmente)
docker compose exec backend python manage.py importar_firms --todos --days 3

# Ejecutar el calibrador local FWI del Pajonal Altoandino
docker compose exec backend python manage.py calibrar_fwi --dias 180

# Entrenar el modelo de Machine Learning de riesgo de ocurrencia
docker compose exec backend python manage.py entrenar_ocurrencia

# Crear un nuevo superusuario adicional
docker compose exec backend python manage.py createsuperuser

# Detener todos los contenedores (preservando la base de datos en los volúmenes)
docker compose stop

# Detener y apagar los contenedores
docker compose down

# Reiniciar todos los servicios
docker compose restart
```

---

## 💾 Respaldos y Restauración de Base de Datos PostGIS

### Crear una copia de seguridad de la base de datos:
```bash
docker compose exec -t db pg_dump -U postgres -d alerta_incendios_coracora -Fc > backup_coracora_$(date +%Y%m%d).dump
```

### Restaurar una copia de seguridad existente:
```bash
docker compose exec -i db pg_restore -U postgres -d alerta_incendios_coracora --clean --if-exists < ./data/backup_db_coracora_20261028.dump
```
