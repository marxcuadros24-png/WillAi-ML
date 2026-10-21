from django.core.management.base import BaseCommand
from apps.firms.tasks import importar_firms_task, importar_serfor_task, BBOX_CORACORA


class Command(BaseCommand):
    help = 'Ejecuta manualmente la importación de focos de calor satelitales (NASA FIRMS y SERFOR)'

    def add_arguments(self, parser):
        parser.add_argument('--sensor', type=str, default='VIIRS_NOAA20_NRT', help='Sensor FIRMS (VIIRS_NOAA20_NRT, MODIS_NRT, etc.)')
        parser.add_argument('--bbox', type=str, default=BBOX_CORACORA, help='Bounding Box W,S,E,N')
        parser.add_argument('--days', type=int, default=1, help='Días hacia atrás a consultar (1 a 10)')
        parser.add_argument('--serfor', action='store_true', help='Ejecutar también importación de SERFOR')

    def handle(self, *args, **options):
        sensor = options['sensor']
        bbox = options['bbox']
        days = options['days']
        incluir_serfor = options['serfor']

        self.stdout.write(self.style.NOTICE(f'Iniciando importación NASA FIRMS (Sensor: {sensor}, BBox: {bbox}, Días: {days})...'))
        res_firms = importar_firms_task(sensor=sensor, bbox=bbox, days=days)
        self.stdout.write(self.style.SUCCESS(f"FIRMS completado: {res_firms}"))

        if incluir_serfor:
            self.stdout.write(self.style.NOTICE('Iniciando importación SERFOR Perú...'))
            res_serfor = importar_serfor_task()
            self.stdout.write(self.style.SUCCESS(f"SERFOR completado: {res_serfor}"))
