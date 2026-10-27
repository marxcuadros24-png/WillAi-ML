from .base import *

DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', default='django.contrib.gis.db.backends.postgis'),
        'NAME': env('DB_NAME', default='alerta_incendios_coracora'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='123456'),
        'HOST': env('DB_HOST', default='localhost'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

# En desarrollo, ejecutar tareas Celery de forma sincrónica sin requerir Redis activo
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=True)
CELERY_TASK_EAGER_PROPAGATES = True
