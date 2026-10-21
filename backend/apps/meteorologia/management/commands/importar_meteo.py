from django.core.management.base import BaseCommand
from apps.meteorologia.tasks import importar_openmeteo_task, CORACORA_LAT, CORACORA_LON


class Command(BaseCommand):
    help = 'Ejecuta manualmente la importación de datos meteorológicos desde Open-Meteo'

    def add_arguments(self, parser):
        parser.add_argument('--lat', type=float, default=CORACORA_LAT, help='Latitud de consulta')
        parser.add_argument('--lon', type=float, default=CORACORA_LON, help='Longitud de consulta')

    def handle(self, *args, **options):
        lat = options['lat']
        lon = options['lon']
        self.stdout.write(self.style.NOTICE(f'Consultando meteorología en Coracora ({lat}, {lon})...'))
        res = importar_openmeteo_task(lat=lat, lon=lon)
        self.stdout.write(self.style.SUCCESS(f"Open-Meteo completado: {res}"))
