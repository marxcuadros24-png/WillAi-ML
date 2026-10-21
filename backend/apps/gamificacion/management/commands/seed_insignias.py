from django.core.management.base import BaseCommand
from apps.gamificacion.models import Insignia


class Command(BaseCommand):
    help = "Carga el catálogo de insignias iniciales de WillAI"

    def handle(self, *args, **options):
        insignias_data = [
            {
                'codigo': 'primer_aviso',
                'nombre': 'Primer aviso',
                'descripcion': 'Envió un primer reporte de incendio que fue validado.',
                'icono_url': 'badges/primer-aviso.svg',
                'criterio': {'tipo_actividad': 'reporte_validado', 'cantidad': 1}
            },
            {
                'codigo': 'guardian_bosque',
                'nombre': 'Guardián del bosque',
                'descripcion': 'Participó en una actividad de prevención comunal validada.',
                'icono_url': 'badges/guardian-bosque.svg',
                'criterio': {'tipo_actividad': 'prevencion_validada', 'cantidad': 1}
            },
            {
                'codigo': 'vigilante_comunal',
                'nombre': 'Vigilante comunal',
                'descripcion': 'Contribuyó con información preventiva verificada en la zona.',
                'icono_url': 'badges/vigilante-comunal.svg',
                'criterio': {'tipo_actividad': 'aporte_preventivo_validado', 'cantidad': 1}
            },
            {
                'codigo': 'comunidad_preparada',
                'nombre': 'Comunidad preparada',
                'descripcion': 'Participó en una capacitación o simulacro de incendios registrado.',
                'icono_url': 'badges/comunidad-preparada.svg',
                'criterio': {'tipo_actividad': 'capacitacion_validada', 'cantidad': 1}
            },
        ]

        creados = 0
        for data in insignias_data:
            _, created = Insignia.objects.get_or_create(
                codigo=data['codigo'],
                defaults=data
            )
            if created:
                creados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Se cargaron las insignias base con éxito. Nuevas: {creados}, Total: {len(insignias_data)}"
        ))
