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
        parser.add_argument(
            "--alfa-r0",
            type=float,
            default=1.0,
            help="Multiplicador de tasa base R0 (default 1.0)"
        )
        parser.add_argument(
            "--alfa-viento",
            type=float,
            default=1.0,
            help="Multiplicador de viento (default 1.0)"
        )
        parser.add_argument(
            "--alfa-pendiente",
            type=float,
            default=1.0,
            help="Multiplicador de pendiente (default 1.0)"
        )
        parser.add_argument(
            "--usar-calibrado",
            action="store_true",
            help="Carga los multiplicadores óptimos desde calibracion_lofo_iou.json si existe"
        )
        parser.add_argument(
            "--ensamble",
            action="store_true",
            help="Habilita la banda de incertidumbre de viento (ensamble +-15 grados)"
        )
        parser.add_argument(
            "--delta-viento",
            type=float,
            default=15.0,
            help="Perturbación angular del viento en grados (default: 15.0°)"
        )

    def handle(self, *args, **options):
        import os, json
        umbral = options["umbral_dnbr"]
        radio = options["radio_m"]
        alfa_r0 = options["alfa_r0"]
        alfa_viento = options["alfa_viento"]
        alfa_pendiente = options["alfa_pendiente"]
        ensamble = options["ensamble"]
        delta_viento = options["delta_viento"]

        if options["usar_calibrado"]:
            ruta_calib = os.path.join(
                os.path.dirname(__file__), "..", "..", "artefactos", "calibracion_lofo_iou.json"
            )
            if os.path.exists(ruta_calib):
                with open(ruta_calib, "r", encoding="utf-8") as f:
                    calib_data = json.load(f)
                    opt = calib_data.get("multiplicadores_optimos", {})
                    alfa_r0 = opt.get("alfa_r0", alfa_r0)
                    alfa_viento = opt.get("alfa_viento", alfa_viento)
                    alfa_pendiente = opt.get("alfa_pendiente", alfa_pendiente)

        separador = "=" * 98
        self.stdout.write(self.style.NOTICE(
            f"\n{separador}\n"
            " WILLAI - VALIDACION DE VERDAD TERRENO (SENTINEL-2 dNBR vs SIMULADOR ANDINO)\n"
            f"{separador}"
        ))
        self.stdout.write(
            f"Configuracion: Umbral dNBR={umbral} | Radio={radio:.0f}m | Ensamble={ensamble} (+-{delta_viento}°) | Multiplicadores: R0={alfa_r0}, V={alfa_viento}, P={alfa_pendiente}\n"
            "Usando imagenes Pre-incendio (NDVI+NDMI), freno a bofedales (0.08x) y Clusters FIRMS multi-ignicion...\n"
        )

        validador = ValidadorVerdadTerrenoDNBR(umbral_dnbr=umbral, radio_m=radio)
        reporte = validador.evaluar_todos(
            guardar_artefacto=True,
            alfa_r0=alfa_r0,
            alfa_viento=alfa_viento,
            alfa_pendiente=alfa_pendiente,
            ensamble_viento=ensamble,
            delta_viento_grados=delta_viento,
        )

        # Encabezado de la tabla de resultados
        self.stdout.write("-" * 98)
        self.stdout.write(
            f"{'Evento / Distrito':<26} | {'Fecha':<10} | {'Area Real':<9} | {'Area Sim':<9} | {'IoU (%)':<8} | {'Dice':<6} | {'Hausdorff':<11} | {'Omis / Com'}"
        )
        self.stdout.write("-" * 98)

        for ev in reporte["eventos"]:
            m = ev["metricas_comparativas"]
            nombre_corto = f"{ev['nombre'][:18]} ({ev['distrito']})"
            self.stdout.write(
                f"{nombre_corto:<26} | "
                f"{ev['fecha']:<10} | "
                f"{m['area_real_ha']:>7.1f} ha | "
                f"{m['area_simulada_ha']:>7.1f} ha | "
                f"{m['iou_porcentaje']:>7.2f}% | "
                f"{m['dice_f1_porcentaje']:>5.1f}% | "
                f"{m['distancia_hausdorff_m']:>8.0f} m  | "
                f"{m['omision_porcentaje']:>4.1f}% / {m['comision_porcentaje']:>4.1f}%"
            )

        self.stdout.write("-" * 98)

        macro = reporte["resumen_metricas_macro"]
        self.stdout.write(self.style.SUCCESS(
            f"\n[+] RESUMEN MACRO DE PRECISION CARTOGRAFICA:\n"
            f"  * IoU Medio (Jaccard Index):             {macro['iou_medio_porcentaje']}%\n"
            f"  * Coeficiente Dice / F1-Score:            {macro['dice_f1_medio_porcentaje']}%\n"
            f"  * Distancia Hausdorff Frontal Media:     {macro['distancia_hausdorff_media_m']} m\n"
            f"  * Error de Omision Medio (Subestimacion): {macro['error_omision_medio_porcentaje']}%\n"
            f"  * Error de Comision Medio:                {macro['error_comision_medio_porcentaje']}%\n"
            f"  * Calificacion de Concordancia:           {macro['calificacion_concordancia']}\n"
        ))
        self.stdout.write(self.style.NOTICE(
            "Artefacto de auditoria guardado en: backend/apps/predicciones/artefactos/validacion_dnbr_iou.json\n"
        ))
