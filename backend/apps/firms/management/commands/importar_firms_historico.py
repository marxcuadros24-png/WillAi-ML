from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.firms.tasks import importar_firms_task, BBOX_CORACORA


class Command(BaseCommand):
    help = 'Descarga detecciones satelitales 100% REALES de NASA FIRMS (MODIS y VIIRS) de hasta 6 meses atrás (180 días)'

    def add_arguments(self, parser):
        parser.add_argument('--dias', type=int, default=60, help='Total de días hacia atrás a consultar (hasta 180 días)')
        parser.add_argument('--paso', type=int, default=5, help='Ventana de días por consulta (máx 5 permitido por NASA)')
        parser.add_argument('--modis-solo', action='store_true', help='Consultar únicamente MODIS')
        parser.add_argument('--viirs-solo', action='store_true', help='Consultar únicamente VIIRS')

    def handle(self, *args, **options):
        total_dias = options['dias']
        paso = max(1, min(options['paso'], 5))
        ahora = timezone.now()

        sensores = []
        if options['modis_solo']:
            sensores = ['MODIS_NRT']
        elif options['viirs_solo']:
            sensores = ['VIIRS_NOAA20_NRT']
        else:
            sensores = ['MODIS_NRT', 'VIIRS_NOAA20_NRT']

        self.stdout.write(self.style.NOTICE(
            f'Consultando API oficial de NASA FIRMS para los últimos {total_dias} días (Ventanas de {paso} días)...'
        ))

        total_insertadas = 0
        total_recibidas = 0

        # Iterar hacia atrás en bloques de 'paso' días
        for offset in range(0, total_dias, paso):
            fecha_consulta = ahora - timedelta(days=offset)
            fecha_str = fecha_consulta.strftime('%Y-%m-%d')

            for sensor in sensores:
                res = importar_firms_task(
                    sensor=sensor,
                    bbox=BBOX_CORACORA,
                    days=paso,
                    date=fecha_str
                )
                if res.get('status') == 'ok':
                    ins = res.get('insertadas', 0)
                    tot = res.get('total', 0)
                    total_insertadas += ins
                    total_recibidas += tot
                    if ins > 0 or tot > 0:
                        self.stdout.write(
                            f"  [+] NASA FIRMS {sensor} ({fecha_str} - {paso}d): {ins} nuevas insertadas, {tot} observadas por satélite."
                        )
                else:
                    self.stdout.write(self.style.WARNING(
                        f"  [!] {sensor} ({fecha_str}): {res.get('message')}"
                    ))

        self.stdout.write(self.style.SUCCESS(
            f'Descarga histórica oficial completada. Total detecciones reales recibidas de NASA FIRMS: {total_recibidas}, insertadas en BD: {total_insertadas}.'
        ))
