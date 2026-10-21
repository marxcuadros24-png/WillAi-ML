from django.core.management.base import BaseCommand
from apps.predicciones.tasks import calcular_riesgo_fwi_task, CORACORA_LAT, CORACORA_LON


class Command(BaseCommand):
    help = 'Ejecuta el cálculo predictivo del Índice de Peligro de Incendios (FWI) para Coracora'

    def add_arguments(self, parser):
        parser.add_argument('--lat', type=float, default=CORACORA_LAT, help='Latitud de cálculo')
        parser.add_argument('--lon', type=float, default=CORACORA_LON, help='Longitud de cálculo')

    def handle(self, *args, **options):
        lat = options['lat']
        lon = options['lon']
        self.stdout.write(self.style.NOTICE(f'Calculando FWI Canadiense para Coracora ({lat}, {lon})...'))
        res = calcular_riesgo_fwi_task(lat=lat, lon=lon)
        self.stdout.write(self.style.SUCCESS(f"Resultado FWI: {res}"))
