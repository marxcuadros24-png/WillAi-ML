from django.core.management.base import BaseCommand
from apps.gamificacion.models import Insignia


class Command(BaseCommand):
    help = "Carga el catalogo completo de insignias y reconocimientos comunitarios de WillAI"

    def handle(self, *args, **options):
        insignias_data = [
            {
                'codigo': 'primer_aviso',
                'nombre': 'Primer Aviso',
                'descripcion': 'Envio una alerta temprana de incendio que fue verificada con exito por las brigadas.',
                'icono_url': 'flame',
                'criterio': {'tipo_actividad': 'reporte_validado', 'cantidad': 1, 'puntos': 50}
            },
            {
                'codigo': 'guardian_bosque',
                'nombre': 'Guardian del Bosque',
                'descripcion': 'Participo en patrullajes o labores activas de prevencion comunal en pastizales y bosques.',
                'icono_url': 'trees',
                'criterio': {'tipo_actividad': 'prevencion_validada', 'cantidad': 1, 'puntos': 60}
            },
            {
                'codigo': 'vigilante_comunal',
                'nombre': 'Vigilante Comunal',
                'descripcion': 'Verificador comunal destacado con multiples inspecciones tecnicas confirmadas en terreno.',
                'icono_url': 'shield-check',
                'criterio': {'tipo_actividad': 'verificacion_terreno', 'cantidad': 3, 'puntos': 80}
            },
            {
                'codigo': 'comunidad_preparada',
                'nombre': 'Comunidad Preparada',
                'descripcion': 'Participo en capacitaciones, talleres y simulacros de evacuacion e incendios forestales.',
                'icono_url': 'users',
                'criterio': {'tipo_actividad': 'capacitacion_validada', 'cantidad': 1, 'puntos': 40}
            },
            {
                'codigo': 'respuesta_rapida',
                'nombre': 'Respuesta Rapida',
                'descripcion': 'Brigadista o comunero voluntario que acudio en las primeras 2 horas para contener un foco de calor.',
                'icono_url': 'zap',
                'criterio': {'tipo_actividad': 'despliegue_rapido', 'cantidad': 1, 'puntos': 90}
            },
            {
                'codigo': 'ojo_halcon',
                'nombre': 'Ojo de Halcon',
                'descripcion': 'Envio de reporte fotografico y georreferenciacion GPS de maxima precision confirmada.',
                'icono_url': 'crosshair',
                'criterio': {'tipo_actividad': 'georreferenciacion_exacta', 'cantidad': 2, 'puntos': 70}
            },
            {
                'codigo': 'solidario_comunal',
                'nombre': 'Corazon Solidario',
                'descripcion': 'Aporto agua, alimentos, herramientas de zapa o combustible para las brigadas en combate.',
                'icono_url': 'heart-handshake',
                'criterio': {'tipo_actividad': 'donacion_apoyo', 'cantidad': 1, 'puntos': 50}
            },
            {
                'codigo': 'heroe_parinacochas',
                'nombre': 'Heroe de Parinacochas',
                'descripcion': 'Maxima condecoracion comunal por valentia y liderazgo excepcional protegiendo la vida y el territorio.',
                'icono_url': 'crown',
                'criterio': {'tipo_actividad': 'merito_excepcional', 'cantidad': 1, 'puntos': 150}
            },
        ]

        nuevas = 0
        actualizadas = 0
        for data in insignias_data:
            ins, created = Insignia.objects.update_or_create(
                codigo=data['codigo'],
                defaults=data
            )
            if created:
                nuevas += 1
            else:
                actualizadas += 1

        self.stdout.write(self.style.SUCCESS(
            f"Catalogo de Insignias WillAI actualizado: {nuevas} nuevas, {actualizadas} actualizadas (Total: {len(insignias_data)})."
        ))
