from django.core.management.base import BaseCommand
from apps.predicciones.tasks import entrenar_y_predecir_viento_task, CORACORA_LAT, CORACORA_LON


class Command(BaseCommand):
    help = 'Entrena el modelo de Machine Learning con Open-Meteo y genera la predicción de viento y propagación a 12 horas'

    def add_arguments(self, parser):
        parser.add_argument('--lat', type=float, default=CORACORA_LAT, help='Latitud de Coracora')
        parser.add_argument('--lon', type=float, default=CORACORA_LON, help='Longitud de Coracora')

    def handle(self, *args, **options):
        lat = options['lat']
        lon = options['lon']

        self.stdout.write(self.style.NOTICE(f'Entrenando modelo predictivo ML de viento para ({lat}, {lon}) consumiendo Open-Meteo...'))
        res = entrenar_y_predecir_viento_task(lat=lat, lon=lon)

        if res.get("status") == "ok":
            self.stdout.write(self.style.SUCCESS(f"Entrenamiento completado exitosamente."))
            self.stdout.write(f"  [+] Métricas: {res['metricas']}")
            self.stdout.write(f"  [+] Nivel pico de riesgo: {res['nivel_pico'].upper()}")
            self.stdout.write(f"  [+] ID Predicción: #{res['id_prediccion']}")
            self.stdout.write(self.style.NOTICE("Pronóstico de viento primeras 4 horas:"))
            for p in res['pronostico_12h'][:4]:
                self.stdout.write(f"    - Hora {p['paso_hora']} ({p['hora_label']}): {p['velocidad_kmh']} km/h desde {p['direccion_viento_cardinal']} ({p['direccion_viento_grados']}°) -> Propaga fuego hacia {p['hacia_cardinal']} ({p['rumbo_propagacion_grados']}°) [Riesgo: {p['riesgo_propagacion']}]")
        else:
            self.stdout.write(self.style.ERROR(f"Error al entrenar modelo: {res.get('error')}"))
