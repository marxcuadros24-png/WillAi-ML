import os
import glob
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR is backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Read .env file
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'django-insecure-willai-default-key-change-in-production'),
    ALLOWED_HOSTS=(list, ['127.0.0.1', 'localhost', 'testserver']),
    CORS_ALLOW_ALL_ORIGINS=(bool, True),
)
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# Windows GeoDjango / GDAL / GEOS configuration
if os.name == 'nt':
    try:
        import rasterio
        rasterio_libs = os.path.abspath(os.path.join(os.path.dirname(rasterio.__file__), '..', 'rasterio.libs'))
        if os.path.isdir(rasterio_libs):
            os.add_dll_directory(rasterio_libs)
            gdal_dlls = glob.glob(os.path.join(rasterio_libs, 'gdal*.dll'))
            geos_dlls = glob.glob(os.path.join(rasterio_libs, 'geos_c*.dll'))
            if gdal_dlls:
                GDAL_LIBRARY_PATH = gdal_dlls[0]
            if geos_dlls:
                GEOS_LIBRARY_PATH = geos_dlls[0]
    except Exception:
        pass

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
]

LOCAL_APPS = [
    'apps.usuarios',
    'apps.geografia',
    'apps.respuesta',
    'apps.reportes',
    'apps.incidentes',
    'apps.firms',
    'apps.meteorologia',
    'apps.predicciones',
    'apps.alertas',
    'apps.gamificacion',
    'apps.donaciones',
    'apps.auditoria',
    'apps.panel',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Custom User Model
AUTH_USER_MODEL = 'usuarios.Usuario'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.auditoria.middleware.AuditLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# DRF Spectacular OpenAPI documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'WillAI — Sistema de Alerta Temprana de Incendios Forestales',
    'DESCRIPTION': 'API REST para monitoreo satelital, reportes ciudadanos, predicción FWI y respuesta ante incendios forestales en Coracora, Parinacochas, Ayacucho.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=True)
from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'cache-control',
    'pragma',
    'expires',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization (Perú)
LANGUAGE_CODE = 'es-pe'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static'] if (BASE_DIR / 'static').exists() else []

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Celery Configuration
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

CELERY_BEAT_SCHEDULE = {
    'importar_firms_multi_sensor_cada_3h': {
        'task': 'importar_firms_multi_sensor_task',
        'schedule': 3 * 3600,  # cada 3 horas (VIIRS + MODIS)
    },
    'importar_serfor_cada_30min': {
        'task': 'importar_serfor_task',
        'schedule': 30 * 60,  # cada 30 minutos
    },
    'importar_meteo_cada_1h': {
        'task': 'importar_openmeteo_task',
        'schedule': 3600,  # cada 1 hora
    },
    'entrenar_y_predecir_viento_cada_2h': {
        'task': 'entrenar_y_predecir_viento_task',
        'schedule': 2 * 3600,  # cada 2 horas
    },
    'calcular_fwi_cada_1h': {
        'task': 'calcular_riesgo_fwi_task',
        'schedule': 3600,  # cada 1 hora
    },
}

# External API Keys & Configuration
NASA_FIRMS_MAP_KEY = env('NASA_FIRMS_MAP_KEY', default='')
SERFOR_API_URL = env('SERFOR_API_URL', default='https://geo.serfor.gob.pe')
OPEN_METEO_API_URL = env('OPEN_METEO_API_URL', default='https://api.open-meteo.com/v1/forecast')
