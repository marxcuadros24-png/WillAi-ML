from django.apps import AppConfig


class GamificacionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gamificacion'
    verbose_name = 'Gamificación Comunitaria y Reconocimiento'

    def ready(self):
        import apps.gamificacion.signals  # noqa
