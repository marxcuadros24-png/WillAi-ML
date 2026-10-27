"""
Comando de gestión Django para calibrar los multiplicadores físicos del Simulador
mediante optimización numérica Leave-One-Fire-Out (LOFO) con scipy.optimize.
Soporta validación cruzada completa 3-Fold y banda de incertidumbre de viento (ensamble).
"""

from django.core.management.base import BaseCommand
from apps.predicciones.calibrador_lofo import CalibradorLOFO


class Command(BaseCommand):
    help = "Calibra los multiplicadores alfa (R0, viento, pendiente) con scipy.optimize Leave-One-Fire-Out para maximizar IoU y minimizar distancia Hausdorff"

    def add_arguments(self, parser):
        parser.add_argument(
            "--test-fire",
            type=str,
            default="UPAHUACHO",
            help="Incendio excluido para prueba en modo single fold (default: UPAHUACHO)"
        )
        parser.add_argument(
            "--cv-3fold",
            action="store_true",
            help="Ejecuta el ciclo completo de validación cruzada 3-Fold LOFO rotando los 3 incendios"
        )
        parser.add_argument(
            "--ensamble",
            action="store_true",
            help="Habilita la banda de incertidumbre de viento (ensamble +-15 grados)"
        )
        parser.add_argument(
            "--max-iter",
            type=int,
            default=2,
            help="Número máximo de iteraciones de optimización (default: 2)"
        )

    def handle(self, *args, **options):
        cv_3fold = options["cv_3fold"]
        ensamble = options["ensamble"]
        test_fire = options["test_fire"]
        max_iter = options["max_iter"]

        separador = "=" * 96
        self.stdout.write(self.style.NOTICE(
            f"\n{separador}\n"
            " WILLAI - CALIBRACION FISICA LEAVE-ONE-FIRE-OUT (scipy.optimize + dNBR/IoU + Hausdorff)\n"
            f"{separador}"
        ))

        calibrador = CalibradorLOFO(test_id_or_keyword=test_fire, max_iter=max_iter)

        if cv_3fold:
            self.stdout.write(
                f"Modo: Validacion Cruzada Completa 3-Fold LOFO | Ensamble Viento: {ensamble} | Max Iter: {max_iter}\n"
                "Rotando incendios de prueba (Huac-Cana, Chumpi, Upahuacho) sin fuga de informacion...\n"
            )
            rep = calibrador.calibrar_3fold_cv(ensamble_viento=ensamble, max_iter=max_iter)

            self.stdout.write("-" * 96)
            self.stdout.write(
                f"{'Fold / Incendio Prueba':<28} | {'IoU Base->Calib':<17} | {'Dice':<8} | {'Hausdorff Base->Calib':<23} | {'Omis'}"
            )
            self.stdout.write("-" * 96)

            for f in rep["folds"]:
                ev_name = f"{f['incendio_prueba']['nombre'][:24]}"
                ts = f["prueba_no_vista"]
                iou_str = f"{ts['iou_base']:.1f}% -> {ts['iou_calibrado']:.1f}%"
                h_str = f"{ts['hausdorff_base_m']:.0f}m -> {ts['hausdorff_calibrado_m']:.0f}m (-{ts['reduccion_hausdorff_m']:.0f}m)"
                self.stdout.write(
                    f"Fold {f['fold_numero']}: {ev_name:<20} | "
                    f"{iou_str:<17} | "
                    f"{ts['dice_calibrado']:>6.1f}% | "
                    f"{h_str:<23} | "
                    f"{ts['omision_calibrada']:>4.1f}%"
                )

            self.stdout.write("-" * 96)
            macro = rep["resumen_macro_3fold"]
            th_rec = rep["multiplicadores_optimos_recomendados"]

            self.stdout.write(self.style.SUCCESS(
                f"[+] RESULTADOS MACRO VALIDACION CRUZADA 3-FOLD (GENERALIZACION REAL):\n"
                f"  * IoU Medio en Prueba:             {macro['iou_test_base_medio_porcentaje']}% -> {macro['iou_test_calibrado_medio_porcentaje']}% (Mejora: {macro['mejora_iou_media_puntos']:+0.2f} pts)\n"
                f"  * Coeficiente Dice F1 Medio:        {macro['dice_f1_test_calibrado_medio_porcentaje']}%\n"
                f"  * Distancia Hausdorff Frontal:     {macro['distancia_hausdorff_test_base_media_m']} m -> {macro['distancia_hausdorff_test_calibrado_media_m']} m (Reduccion: -{macro['reduccion_distancia_hausdorff_media_m']} m)\n"
                f"  * Error de Omision Residual:       {macro['error_omision_test_medio_porcentaje']}%\n"
            ))
            self.stdout.write(
                f"  * Multiplicadores Optimos Recomendados:\n"
                f"      - alfa_R0 (combustible):       {th_rec['alfa_r0']:.3f}\n"
                f"      - alfa_viento (sensibilidad):  {th_rec['alfa_viento']:.3f}\n"
                f"      - alfa_pendiente (ladera):     {th_rec['alfa_pendiente']:.3f}\n"
            )
            self.stdout.write("-" * 96)
            self.stdout.write(self.style.NOTICE(
                "Artefacto 3-Fold guardado en: backend/apps/predicciones/artefactos/calibracion_lofo_3fold.json\n"
            ))

        else:
            self.stdout.write(
                f"Configuracion: Test Fire='{test_fire}' | Ensamble Viento: {ensamble} | Max Iter={max_iter}\n"
                "Pre-extrayendo verdad terreno y ejecutando optimizador Powell sin derivadas...\n"
            )
            rep = calibrador.calibrar(ensamble_viento=ensamble)

            th_base = rep["multiplicadores_base"]
            th_opt = rep["multiplicadores_optimos"]

            self.stdout.write("-" * 96)
            self.stdout.write(
                f"MULTIPLICADORES FISICOS CALIBRADOS:\n"
                f"  * alfa_R0 (Tasa base combustible):  {th_base['alfa_r0']:.2f} -> {th_opt['alfa_r0']:.3f}\n"
                f"  * alfa_viento (Sensibilidad viento): {th_base['alfa_viento']:.2f} -> {th_opt['alfa_viento']:.3f}\n"
                f"  * alfa_pendiente (Empuje ladera):   {th_base['alfa_pendiente']:.2f} -> {th_opt['alfa_pendiente']:.3f}\n"
            )
            self.stdout.write("-" * 96)

            r_tr = rep["rendimiento_entrenamiento"]
            self.stdout.write(self.style.SUCCESS(
                f"[+] RENDIMIENTO EN ENTRENAMIENTO ({len(rep['eventos_entrenamiento'])} incendios):\n"
                f"  * IoU Medio:             {r_tr['iou_base']}% -> {r_tr['iou_calibrado']}% (Mejora: {r_tr['mejora_iou_puntos']:+0.2f} pts)\n"
                f"  * Dice / F1:             {r_tr['dice_calibrado']}%\n"
                f"  * Distancia Hausdorff:   {r_tr['hausdorff_base_m']} m -> {r_tr['hausdorff_calibrado_m']} m (Reduccion: -{r_tr['reduccion_hausdorff_m']} m)\n"
            ))

            r_ts = rep["rendimiento_prueba_no_visto"]
            test_nombre = rep["evento_prueba_held_out"]["nombre"]
            self.stdout.write(self.style.SUCCESS(
                f"[+] RENDIMIENTO EN PRUEBA NO VISTO ({test_nombre} - CERO DATA LEAKAGE):\n"
                f"  * IoU:                   {r_ts['iou_base']}% -> {r_ts['iou_calibrado']}% (Mejora: {r_ts['mejora_iou_puntos']:+0.2f} pts)\n"
                f"  * Dice / F1:             {r_ts['dice_calibrado']}%\n"
                f"  * Distancia Hausdorff:   {r_ts['hausdorff_base_m']} m -> {r_ts['hausdorff_calibrado_m']} m (Reduccion: -{r_ts['reduccion_hausdorff_m']} m)\n"
            ))
            self.stdout.write("-" * 96)
            self.stdout.write(self.style.NOTICE(
                "Artefacto guardado en: backend/apps/predicciones/artefactos/calibracion_lofo_iou.json\n"
            ))
