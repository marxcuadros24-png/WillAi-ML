"""
Comando de gestión Django para exportar el mapa real de zonas quemadas,
huellas físicas de píxeles satelitales (VIIRS/MODIS) e isócronas cronológicas
en formatos listos para QGIS (.qgs + .geojson) y Google Earth (.kmz).
"""
import os
from django.core.management.base import BaseCommand
from apps.firms.models import DeteccionSatelital
from apps.firms.exportador_qgis import exportar_paquete_qgis_completo


class Command(BaseCommand):
    help = (
        'Exporta huellas de píxeles satelitales NASA FIRMS (VIIRS 375m y MODIS 1km), '
        'isócronas de propagación diaria y cicatrices de incendios para QGIS y Google Earth.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--salida', type=str, default='data/qgis_parinacochas',
            help='Carpeta de destino para los archivos GeoJSON, proyecto QGIS (.qgs) y Google Earth (.kmz)'
        )
        parser.add_argument(
            '--ano', '--anos', dest='anos', type=str, default=None,
            help='Años a incluir separados por coma (ej: 2024,2025,2026). Por defecto incluye todos.'
        )
        parser.add_argument(
            '--sensor', type=str, default=None,
            help='Filtrar por sensor específico (VIIRS o MODIS)'
        )
        parser.add_argument(
            '--distancia-rastro', type=float, default=1200.0,
            help='Distancia máxima en metros para unir focos vecinos del mismo rastro/frente (default: 1200m)'
        )

    def handle(self, *args, **options):
        salida = options['salida']
        anos_str = options['anos']
        sensor_filtro = options['sensor']
        distancia_rastro = options['distancia_rastro']

        qs = DeteccionSatelital.objects.select_related('fuente').all()

        anos_lista = None
        if anos_str:
            anos_lista = [int(a.strip()) for a in anos_str.split(',') if a.strip()]
            qs = qs.filter(fecha_observacion__year__in=anos_lista)

        if sensor_filtro:
            qs = qs.filter(fuente__sensor__icontains=sensor_filtro)

        total_focos = qs.count()

        if total_focos == 0:
            self.stdout.write(self.style.WARNING(
                'No se encontraron detecciones satelitales con los filtros especificados.'
            ))
            return

        self.stdout.write(self.style.NOTICE(
            f'\n{"=" * 75}\n'
            f'  WILLAI -- Cartografía Satelital con Fusión Multi-Sensor (VIIRS + MODIS)\n'
            f'  Detecciones a procesar: {total_focos} focos de calor\n'
            f'  Años: {anos_str if anos_str else "Todos los disponibles en PostgreSQL"}\n'
            f'  Umbral proximidad de rastro: {distancia_rastro} metros\n'
            f'  Directorio de salida: {os.path.abspath(salida)}\n'
            f'{"=" * 75}\n'
            f'  Ejecutando fusión de huellas por día y proximidad (UTM 18S / EPSG:32718)...'
        ))

        res = exportar_paquete_qgis_completo(
            directorio_salida=salida,
            detecciones=qs,
            anos=anos_lista,
            distancia_rastro_m=distancia_rastro
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 75}\n'
            f'  FUSIÓN Y EXPORTACIÓN COMPLETADA CON ÉXITO\n'
            f'  - Total focos individuales procesados: {res["total_detecciones"]}\n'
            f'  - Rastros de fuego fusionados por día: {res["total_rastros"]}\n'
            f'  - Frentes con coincidencia Multi-Sensor (VIIRS+MODIS): {res["multisensores"]}\n'
            f'  - Cicatrices totales consolidadas: {res["total_cicatrices"]}\n'
            f'\n'
            f'  ARCHIVOS GENERADOS EN {os.path.abspath(salida)}:\n'
            f'  1. Proyecto QGIS:          {os.path.abspath(res["proyecto_qgis"])}\n'
            f'  2. Google Earth (KMZ 3D):  {os.path.abspath(res["google_earth_kmz"])}\n'
            f'  3. Rastros Fusionados:     {os.path.abspath(res["rastros_fusionados"])}\n'
            f'  4. Cicatrices Totales:     {os.path.abspath(res["cicatrices"])}\n'
            f'  5. Isócronas de Avance:    {os.path.abspath(res["isocronas"])}\n'
            f'  6. Píxeles RAW (Detalle):  {os.path.abspath(res["pixeles_raw"])}\n'
            f'  7. Demarcación Distrital:  {os.path.abspath(res["distritos"])}\n'
            f'  8. Guía de Instrucciones:  {os.path.abspath(res["guia"])}\n'
            f'{"=" * 75}\n'
            f'  INSTRUCCIÓN PARA EL USUARIO:\n'
            f'  - Abre QGIS y haz doble clic sobre: {res["proyecto_qgis"]}\n'
            f'  - Activa el "Controlador Temporal" (icono reloj) y presiona "Play"\n'
            f'    para visualizar los rastros fusionados día a día sin solapamientos.\n'
            f'  - Para Google Earth, haz doble clic sobre: {res["google_earth_kmz"]}\n'
            f'{"=" * 75}\n'
        ))

