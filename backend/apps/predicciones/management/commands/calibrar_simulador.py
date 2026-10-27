"""
Comando de gestión Django para calibrar los multiplicadores físicos del Simulador
mediante optimización numérica Leave-One-Fire-Out (LOFO) con scipy.optimize.
"""

from django.core.management.base import BaseCommand
from apps.predicciones.calibrador_lofo import CalibradorLOFO


class Command(BaseCommand):
    help = "Calibra los multiplicadores alfa (R0, viento, pendiente) con scipy.optimize Leave-One-Fire-Out para maximizar IoU sin fuga de datos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--test-fire",
            type=str,
            default="UPAHUACHO",
            help="Incendio excluido para prueba (held-out test set, default: UPAHUACHO)"
        )
        parser.add_argument(
            "--max-iter",
            type=int,
            default=20,
            help="Número máximo de iteraciones de optimización (default: 20)"
        )

    def handle(self, *args, **options):
        test_fire = options["test_fire"]
        max_iter = options["max_iter"]

        self.stdout.write(self.style.NOTICE(
            "\n" + "=" * 90 + "\n"
            " WILLAI - CALIBRACION FISICA LEAVE-ONE-FIRE-OUT (scipy.optimize + dNBR/IoU)\n"
            "=" * 90
        ))
        self.stdout.write(
            f"Configuracion: Test Fire Held-Out='{test_fire}' | Max Iteraciones={max_iter}\n"
            "Pre-extrayendo verdad terreno y ejecutando optimizador Powell sin derivadas...\n"
        )

        calibrador = CalibradorLOFO(test_id_or_keyword=test_fire, max_iter=max_iter)
        rep = calibrador.calibrar()

        th_base = rep["multiplicadores_base"]
        th_opt = rep["multiplicadores_optimos"]

        self.stdout.write("-" * 90)
        self.stdout.write(
            f"MULTIPLICADORES FISICOS CALIBRADOS:\n"
            f"  * alfa_R0 (Tasa base combustible):  {th_base['alfa_r0']:.2f} -> {th_opt['alfa_r0']:.3f}\n"
            f"  * alfa_viento (Sensibilidad viento): {th_base['alfa_viento']:.2f} -> {th_opt['alfa_viento']:.3f}\n"
            f"  * alfa_pendiente (Empuje ladera):   {th_base['alfa_pendiente']:.2f} -> {th_opt['alfa_pendiente']:.3f}\n"
        )
        self.stdout.write("-" * 90)

        r_tr = rep["rendimiento_entrenamiento"]
        self.stdout.write(self.style.SUCCESS(
            f"[+] RENDIMIENTO EN ENTRENAMIENTO ({len(rep['eventos_entrenamiento'])} incendios):\n"
            f"  * IoU Medio Base:       {r_tr['iou_base']}%\n"
            f"  * IoU Medio Calibrado:  {r_tr['iou_calibrado']}% (Mejora: {r_tr['mejora_iou_puntos']:+0.2f} pts)\n"
            f"  * Dice / F1 Calibrado:  {r_tr['dice_calibrado']}%\n"
        ))

        r_ts = rep["rendimiento_prueba_no_visto"]
        test_nombre = rep["evento_prueba_held_out"]["nombre"]
        self.stdout.write(self.style.SUCCESS(
            f"[+] RENDIMIENTO EN PRUEBA NO VISTO ({test_nombre} - CERO DATA LEAKAGE):\n"
            f"  * IoU Base:             {r_ts['iou_base']}%\n"
            f"  * IoU Calibrado:        {r_ts['iou_calibrado']}% (Mejora: {r_ts['mejora_iou_puntos']:+0.2f} pts)\n"
            f"  * Dice / F1 Calibrado:  {r_ts['dice_calibrado']}%\n"
        ))
        self.stdout.write("-" * 90)
        self.stdout.write(self.style.NOTICE(
            "Artefacto guardado en: backend/apps/predicciones/artefactos/calibracion_lofo_iou.json\n"
        ))
