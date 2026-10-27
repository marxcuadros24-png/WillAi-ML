"""
Comando de gestión Django para validar el Simulador Elíptico Andino
frente a cicatrices reales de incendios calculadas con dNBR en Sentinel-2 L2A.
"""

from django.core.management.base import BaseCommand
from apps.predicciones.validador_dnbr import ValidadorVerdadTerrenoDNBR


class Command(BaseCommand):
    help = "Evalúa la precisión del Simulador Elíptico Andino frente a Verdad Terreno (Sentinel-2 dNBR e IoU) en 3 eventos FIRMS históricos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--umbral-dnbr",
            type=float,
            default=0.12,
            help="Umbral dNBR para definir la cicatriz quemada real (default 0.12)"
        )
        parser.add_argument(
            "--radio-m",
            type=float,
            default=3500.0,
            help="Radio de ventana en metros alrededor del foco (default 3500m)"
        )

    def handle(self, *args, **options):
        umbral = options["umbral_dnbr"]
        radio = options["radio_m"]

        self.stdout.write(self.style.NOTICE(
            "\n" + "=" * 90 + "\n"
            " WILLAI - VALIDACION DE VERDAD TERRENO (SENTINEL-2 dNBR vs SIMULADOR ANDINO)\n"
            "=" * 90
        ))
        self.stdout.write(
            f"Configuracion: Umbral dNBR={umbral} | Radio de analisis={radio:.0f}m | Grilla=30m UTM 18S\n"
            "Consultando Element84 Earth Search STAC y ejecutando simulaciones...\n"
        )

        validador = ValidadorVerdadTerrenoDNBR(umbral_dnbr=umbral, radio_m=radio)
        reporte = validador.evaluar_todos(guardar_artefacto=True)

        # Encabezado de la tabla de resultados
        self.stdout.write("-" * 90)
        self.stdout.write(
            f"{'Evento / Distrito':<30} | {'Fecha':<10} | {'Area Real':<10} | {'Area Sim':<10} | {'IoU (%)':<8} | {'Dice (%)':<8} | {'Omis / Com'}"
        )
        self.stdout.write("-" * 90)

        for ev in reporte["eventos"]:
            m = ev["metricas_comparativas"]
            nombre_corto = f"{ev['nombre'][:20]} ({ev['distrito']})"
            self.stdout.write(
                f"{nombre_corto:<30} | "
                f"{ev['fecha']:<10} | "
                f"{m['area_real_ha']:>8.1f} ha | "
                f"{m['area_simulada_ha']:>8.1f} ha | "
                f"{m['iou_porcentaje']:>7.2f}% | "
                f"{m['dice_f1_porcentaje']:>7.2f}% | "
                f"{m['omision_porcentaje']:>4.1f}% / {m['comision_porcentaje']:>4.1f}%"
            )

        self.stdout.write("-" * 90)

        macro = reporte["resumen_metricas_macro"]
        self.stdout.write(self.style.SUCCESS(
            f"\n[+] RESUMEN MACRO DE PRECISION CARTOGRAFICA:\n"
            f"  * IoU Medio (Jaccard Index):     {macro['iou_medio_porcentaje']}%\n"
            f"  * Coeficiente Dice / F1-Score:    {macro['dice_f1_medio_porcentaje']}%\n"
            f"  * Error de Omision Medio:         {macro['error_omision_medio_porcentaje']}%\n"
            f"  * Error de Comision Medio:        {macro['error_comision_medio_porcentaje']}%\n"
            f"  * Calificacion de Concordancia:   {macro['calificacion_concordancia']}\n"
        ))
        self.stdout.write(self.style.NOTICE(
            "Artefacto de auditoria guardado en: backend/apps/predicciones/artefactos/validacion_dnbr_iou.json\n"
        ))
