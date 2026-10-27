from django.core.management.base import BaseCommand
from scripts.generar_dem_coracora import generar_dem_coracora


class Command(BaseCommand):
    help = "Descarga y procesa el recorte de Copernicus DEM GLO-30 para Coracora/Parinacochas en UTM 18S"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Descargando y reproyectando DEM Copernicus GLO-30 a EPSG:32718..."))
        generar_dem_coracora()
        self.stdout.write(self.style.SUCCESS("DEM guardado en data/coracora_dem_utm18s.tif exitosamente."))
