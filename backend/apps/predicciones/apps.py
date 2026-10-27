from django.apps import AppConfig

class PrediccionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.predicciones'
    verbose_name = 'Modelos Predictivos y Peligro FWI'

    def ready(self):
        try:
            import apps.predicciones.gis_compat
        except Exception:
            pass
