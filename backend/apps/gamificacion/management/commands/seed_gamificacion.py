from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.usuarios.models import Usuario, Rol
from apps.gamificacion.models import Insignia, ActividadUsuario, UsuarioInsignia
from apps.geografia.models import Comunidad


class Command(BaseCommand):
    help = "Carga datos de prueba realistas para el Cuadro de Honor y Voluntarios de WillAI en Parinacochas"

    def handle(self, *args, **options):
        ahora = timezone.now()

        # 1. Asegurar insignias
        from django.core.management import call_command
        call_command('seed_insignias')

        ins_map = {i.codigo: i for i in Insignia.objects.all()}
        admin_user = Usuario.objects.filter(is_superuser=True).first()

        # 2. Roles
        rol_poblador, _ = Rol.objects.get_or_create(codigo='poblador', defaults={'nombre': 'Poblador Comunal'})
        rol_verificador, _ = Rol.objects.get_or_create(codigo='verificador', defaults={'nombre': 'Verificador Comunal'})
        rol_brigadista, _ = Rol.objects.get_or_create(codigo='brigadista', defaults={'nombre': 'Brigadista Forestal'})

        # 3. Voluntarios y Personas Clave de Parinacochas
        personas = [
            {
                'username': 'marcos.quispe',
                'nombre': 'Marcos Quispe Mendoza',
                'telefono': '966123401',
                'rol': rol_verificador,
                'comunidad': 'Secce',
                'insignias': ['vigilante_comunal', 'primer_aviso', 'ojo_halcon'],
                'actividades': [
                    ('verificacion_terreno', 'Inspeccion visual confirmada de columna de humo en quebrada Secce'),
                    ('reporte_validado', 'Reporte temprano de quema de rastrojos con riesgo de propagacion'),
                    ('capacitacion_validada', 'Taller de uso de la App WillAI y lectura de mapas offline')
                ]
            },
            {
                'username': 'elena.condori',
                'nombre': 'Elena Condori Huaman',
                'telefono': '966123402',
                'rol': rol_poblador,
                'comunidad': 'Huallhua',
                'insignias': ['primer_aviso', 'solidario_comunal', 'comunidad_preparada'],
                'actividades': [
                    ('reporte_validado', 'Aviso oportuno de conato de incendio en ladera Huallhua'),
                    ('donacion_apoyo', 'Coordinacion comunal de bidones de agua y viveres para brigada B-12'),
                    ('capacitacion_validada', 'Simulacro distrital de evacuacion comunal Coracora')
                ]
            },
            {
                'username': 'raul.huamani',
                'nombre': 'Cap. Raul Huamani Cardenas',
                'telefono': '966123403',
                'rol': rol_brigadista,
                'comunidad': 'Coracora Centro',
                'insignias': ['heroe_parinacochas', 'respuesta_rapida', 'guardian_bosque'],
                'actividades': [
                    ('despliegue_rapido', 'Liderazgo operativo en combate directo de incendio en pastizales'),
                    ('prevencion_validada', 'Apertura de 1.2 km de linea de defensa y cortafuegos en Pumahuasi'),
                    ('merito_excepcional', 'Coordinacion interinstitucional con OGRD y COEP Parinacochas')
                ]
            },
            {
                'username': 'juan.carlos.b',
                'nombre': 'Juan Carlos Bautista',
                'telefono': '966123404',
                'rol': rol_brigadista,
                'comunidad': 'Huaccana',
                'insignias': ['respuesta_rapida', 'guardian_bosque'],
                'actividades': [
                    ('despliegue_rapido', 'Ataque inicial con mochilas de agua en sector Huaccana'),
                    ('prevencion_validada', 'Vigilancia preventiva y ronda nocturna en bosques de queñua')
                ]
            },
            {
                'username': 'victor.paucar',
                'nombre': 'Don Victor Paucar Alata',
                'telefono': '966123405',
                'rol': rol_poblador,
                'comunidad': 'Muchapampa',
                'insignias': ['guardian_bosque', 'primer_aviso'],
                'actividades': [
                    ('prevencion_validada', 'Faena comunitaria de desbroce y limpieza de pastizal seco'),
                    ('reporte_validado', 'Alerta temprana georreferenciada de foco termico en ladera este')
                ]
            },
            {
                'username': 'lucia.ancasi',
                'nombre': 'Lucia Ancasi Pariona',
                'telefono': '966123406',
                'rol': rol_poblador,
                'comunidad': 'Paucaray',
                'insignias': ['ojo_halcon', 'comunidad_preparada'],
                'actividades': [
                    ('georreferenciacion_exacta', 'Envio de fotografias panoramicas y orientacion del viento'),
                    ('capacitacion_validada', 'Certificacion en prevencion de quemas agricolas controladas')
                ]
            }
        ]

        total_usuarios = 0
        total_insignias_otorgadas = 0
        total_actividades = 0

        for p_data in personas:
            user, created = Usuario.objects.get_or_create(
                username=p_data['username'],
                defaults={
                    'nombre_visible': p_data['nombre'],
                    'first_name': p_data['nombre'].split()[0],
                    'last_name': " ".join(p_data['nombre'].split()[1:]),
                    'telefono': p_data['telefono'],
                    'estado': Usuario.Estado.ACTIVO
                }
            )
            if created:
                user.set_password('willai2026')
                user.save()
                total_usuarios += 1

            if p_data['rol'] not in user.roles.all():
                user.roles.add(p_data['rol'])

            # Actividades
            for idx, (t_act, evid) in enumerate(p_data['actividades']):
                act, act_cre = ActividadUsuario.objects.get_or_create(
                    usuario=user,
                    tipo_actividad=t_act,
                    evidencia_referencia=evid,
                    defaults={
                        'estado': 'validada',
                        'ocurrida_en': ahora - timedelta(days=(idx + 1) * 3),
                        'validada_por': admin_user or user,
                        'validada_en': ahora - timedelta(days=(idx + 1) * 3, hours=-2),
                    }
                )
                if act_cre:
                    total_actividades += 1

            # Insignias
            for cod_ins in p_data['insignias']:
                ins = ins_map.get(cod_ins)
                if ins and not UsuarioInsignia.objects.filter(usuario=user, insignia=ins).exists():
                    UsuarioInsignia.objects.create(
                        usuario=user,
                        insignia=ins,
                        otorgada_por=admin_user or user,
                        desbloqueada_en=ahora - timedelta(days=2)
                    )
                    total_insignias_otorgadas += 1

        self.stdout.write(self.style.SUCCESS(
            f"Cuadro de Honor poblado exitosamente: "
            f"{total_usuarios} usuarios nuevos, "
            f"{total_insignias_otorgadas} insignias otorgadas, "
            f"{total_actividades} actividades validadas."
        ))
