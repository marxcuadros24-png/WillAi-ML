"""
Comando de gestión Django para entrenar y evaluar el modelo de Machine Learning
de riesgo de ocurrencia de incendios forestales en Parinacochas.
"""
from django.core.management.base import BaseCommand
import json
from apps.predicciones.ml_ocurrencia import entrenar_modelo_ocurrencia


class Command(BaseCommand):
    help = 'Entrena el modelo de Machine Learning de riesgo de ocurrencia de incendios con datos de NASA FIRMS y Open-Meteo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-ratio',
            type=float,
            default=0.30,
            help='Proporción temporal para el conjunto de prueba (por defecto: 0.30)'
        )

    def handle(self, *args, **options):
        test_ratio = options['test_ratio']
        self.stdout.write(self.style.NOTICE(
            f"Iniciando entrenamiento con división temporal estricta (test_ratio={test_ratio})..."
        ))

        try:
            metadata = entrenar_modelo_ocurrencia(test_ratio=test_ratio)
            self.stdout.write(self.style.SUCCESS(
                f"[OK] Modelo '{metadata['nombre_modelo']}' v{metadata['version']} entrenado con exito."
            ))
            self.stdout.write(self.style.NOTICE("\n--- METRICAS COMPARATIVAS ---"))
            self.stdout.write(json.dumps(metadata['metricas_evaluacion_temporal'], indent=2))
            self.stdout.write(self.style.NOTICE("\n--- IMPORTANCIA DE VARIABLES ---"))
            self.stdout.write(json.dumps(metadata['importancia_variables'], indent=2))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"[Error] Fallo el entrenamiento: {e}"))
