from django.core.management.base import BaseCommand
from scripts.generar_combustibles_coracora import generar_raster_combustibles


class Command(BaseCommand):
    help = "Descarga escena libre de nubes Sentinel-2 L2A (Element84 Earth Search STAC) y genera coracora_combustible_utm18s.tif con R0 real"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Consultando Sentinel-2 L2A y calculando mapa de combustibles andinos (R0)..."))
        generar_raster_combustibles()
        self.stdout.write(self.style.SUCCESS("Ráster de combustibles guardado en data/coracora_combustible_utm18s.tif exitosamente."))
