"""
Comando de gestión Django para descarga masiva de detecciones históricas de NASA FIRMS.
Soporta hasta 730+ días (2 años) usando sensores de archivo histórico (Standard Processing) y NRT.

Sensores de archivo con cobertura histórica de NASA FIRMS:
  - MODIS_SP: Standard Processing de MODIS (Terra y Aqua) — Archivo científico completo
  - VIIRS_SNPP_SP: Standard Processing de VIIRS (Suomi-NPP) — Archivo científico 375m
  - VIIRS_NOAA20_NRT / MODIS_NRT: Tiempo casi-real para los últimos 60-90 días

Área de estudio:
  - Bounding Box oficial de la Provincia de Parinacochas (IGN / INEI Perú):
    W: -74.30, S: -15.65, E: -72.85, N: -14.50
"""
import math
import time
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.firms.tasks import importar_firms_task

# Bounding Box oficial completo de la Provincia de Parinacochas (IGN/INEI)
# minLon=-74.2572, minLat=-15.6282, maxLon=-72.8468, maxLat=-14.5072
BBOX_PARINACOCHAS = "-74.30,-15.65,-72.85,-14.50"


class Command(BaseCommand):
    help = (
        'Descarga masiva de detecciones satelitales REALES de NASA FIRMS '
        '(MODIS y VIIRS) para la Provincia de Parinacochas. '
        'Soporta hasta 730 días (2 años) usando sensores de archivo histórico (_SP).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias', type=int, default=730,
            help='Total de días hacia atrás a consultar (default: 730 para 2 años completos)'
        )
        parser.add_argument(
            '--paso', type=int, default=5,
            help='Ventana de días por consulta (máx 5 permitido por la API NASA FIRMS)'
        )
        parser.add_argument(
            '--modis-solo', action='store_true',
            help='Consultar únicamente sensores MODIS (MODIS_SP / MODIS_NRT)'
        )
        parser.add_argument(
            '--viirs-solo', action='store_true',
            help='Consultar únicamente sensores VIIRS (VIIRS_SNPP_SP / VIIRS_NOAA20_NRT)'
        )
        parser.add_argument(
            '--bbox', type=str, default=BBOX_PARINACOCHAS,
            help='Bounding Box W,S,E,N (por defecto: Provincia de Parinacochas)'
        )
        parser.add_argument(
            '--pausa', type=float, default=1.2,
            help='Segundos de pausa entre requests para respetar rate-limit de NASA (default: 1.2)'
        )
        parser.add_argument(
            '--reintentos', type=int, default=3,
            help='Número de reintentos ante error de red o API (default: 3)'
        )

    def handle(self, *args, **options):
        total_dias = max(1, options['dias'])
        paso = max(1, min(options['paso'], 5))
        bbox = options['bbox']
        pausa = options['pausa']
        max_reintentos = options['reintentos']
        ahora = timezone.now()
        hoy = ahora.date()

        # Selección de sensores según banderas del usuario
        if options['modis_solo']:
            sensores_nrt = ['MODIS_NRT']
            sensores_archivo = ['MODIS_SP']
        elif options['viirs_solo']:
            sensores_nrt = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT']
            sensores_archivo = ['VIIRS_SNPP_SP']
        else:
            # Cobertura completa multi-sensor:
            # NRT: NOAA-20 (375m), NOAA-21 (375m), Suomi-NPP (375m), MODIS Aqua/Terra (1km)
            # Archivo: Suomi-NPP SP (375m) y MODIS SP (1km)
            sensores_nrt = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT', 'MODIS_NRT']
            sensores_archivo = ['VIIRS_SNPP_SP', 'MODIS_SP']

        fecha_inicio = hoy - timedelta(days=total_dias)
        total_ventanas = math.ceil(total_dias / paso)

        self.stdout.write(self.style.NOTICE(
            f'\n{"=" * 75}\n'
            f'  NASA FIRMS -- Recopilacion Historica Oficial (Parinacochas)\n'
            f'  Rango temporal: {fecha_inicio.strftime("%Y-%m-%d")} -> {hoy.strftime("%Y-%m-%d")} '
            f'({total_dias} dias / ~{total_dias // 365}a {(total_dias % 365) // 30}m)\n'
            f'  Bounding Box: {bbox} (Provincia de Parinacochas)\n'
            f'  Ventana de consulta: {paso} dias por peticion (Limite oficial NASA API)\n'
            f'  Sensores NRT (<=120d): {sensores_nrt}\n'
            f'  Sensores Archivo SP (>=60d): {sensores_archivo}\n'
            f'  Total de ventanas estimadas: {total_ventanas}\n'
            f'{"=" * 75}\n'
        ))

        total_insertadas = 0
        total_recibidas = 0
        errores = 0
        ventana_num = 0

        cur_fecha = fecha_inicio
        inicio_tiempo = time.time()

        while cur_fecha <= hoy:
            dias_restantes = (hoy - cur_fecha).days + 1
            if dias_restantes <= 0:
                break
            dias_ventana = min(paso, dias_restantes)
            fecha_str = cur_fecha.strftime('%Y-%m-%d')
            ventana_num += 1

            # Determinar sensores activos garantizando que la zona de transición
            # (60 a 120 días, ej: Agosto) consulte ambos para no perder focos NRT recientes
            antiguedad_dias = (hoy - cur_fecha).days
            sensores_activos = []
            if antiguedad_dias <= 120:
                sensores_activos.extend(sensores_nrt)
            if antiguedad_dias >= 60:
                sensores_activos.extend(sensores_archivo)
            # Eliminar posibles duplicados conservando orden
            sensores_activos = list(dict.fromkeys(sensores_activos))

            ventana_insertadas = 0
            ventana_observadas = 0
            detalles_sensores = []

            for sensor in sensores_activos:
                exito = False
                for intento in range(1, max_reintentos + 1):
                    res = importar_firms_task(
                        sensor=sensor,
                        bbox=bbox,
                        days=dias_ventana,
                        date=fecha_str
                    )

                    if res.get('status') == 'ok':
                        ins = res.get('insertadas', 0)
                        tot = res.get('total', 0)
                        ventana_insertadas += ins
                        ventana_observadas += tot
                        total_insertadas += ins
                        total_recibidas += tot
                        exito = True
                        if tot > 0:
                            detalles_sensores.append(f"{sensor}: {ins} nuev / {tot} obs")
                        break
                    else:
                        msg_err = res.get('message', 'Error desconocido')
                        if intento < max_reintentos:
                            time.sleep(pausa * 2)
                        else:
                            self.stdout.write(self.style.ERROR(
                                f"  [X] {sensor} ({fecha_str}): {msg_err}"
                            ))
                            errores += 1

                if exito:
                    time.sleep(pausa)

            # Imprimir progreso
            progreso_pct = round((ventana_num / total_ventanas) * 100, 1)
            if ventana_observadas > 0:
                det_txt = ", ".join(detalles_sensores) if detalles_sensores else "OK"
                self.stdout.write(self.style.SUCCESS(
                    f"  [{ventana_num:03d}/{total_ventanas:03d} - {progreso_pct:>5.1f}%] "
                    f"Ventana {fecha_str} (+{dias_ventana}d) -> [*] {ventana_observadas} focos ({det_txt}) "
                    f"| Total acum: {total_insertadas:,} nuevas"
                ))
            elif ventana_num % 10 == 0 or ventana_num == total_ventanas:
                self.stdout.write(
                    f"  [{ventana_num:03d}/{total_ventanas:03d} - {progreso_pct:>5.1f}%] "
                    f"Ventana {fecha_str} (+{dias_ventana}d) -> 0 focos | Total acum: {total_insertadas:,} nuevas"
                )

            cur_fecha += timedelta(days=dias_ventana)

        duracion_seg = round(time.time() - inicio_tiempo, 1)
        duracion_min = round(duracion_seg / 60, 2)

        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 75}\n'
            f'  DESCARGA HISTORICA DE NASA FIRMS COMPLETADA EXITOSAMENTE\n'
            f'  Periodo: {fecha_inicio.strftime("%Y-%m-%d")} a {hoy.strftime("%Y-%m-%d")} ({total_dias} dias)\n'
            f'  Ventanas procesadas: {ventana_num}/{total_ventanas}\n'
            f'  Detecciones recibidas de satelites: {total_recibidas:,}\n'
            f'  Nuevos focos de calor insertados en PostgreSQL: {total_insertadas:,}\n'
            f'  Errores / fallos: {errores}\n'
            f'  Tiempo total de descarga: {duracion_seg}s ({duracion_min} min)\n'
            f'{"=" * 75}\n'
        ))
