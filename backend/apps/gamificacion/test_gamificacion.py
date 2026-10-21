from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.geografia.models import Distrito, Comunidad
from apps.reportes.models import Reporte, ValidacionReporte
from apps.gamificacion.models import Insignia, ActividadUsuario, UsuarioInsignia

Usuario = get_user_model()


class GamificacionTestCase(TestCase):
    def setUp(self):
        self.distrito = Distrito.objects.create(
            ubigeo='050601',
            nombre='Coracora',
            provincia='Parinacochas',
            departamento='Ayacucho'
        )
        self.comunidad = Comunidad.objects.create(
            distrito=self.distrito,
            nombre='Secce'
        )
        self.ciudadano = Usuario.objects.create_user(
            username='comunero1',
            email='comunero@willai.pe',
            password='password123',
            telefono='966111222',
            nombre_visible='Juan Pérez'
        )
        self.verificador = Usuario.objects.create_user(
            username='verificador1',
            email='verificador@willai.pe',
            password='password123',
            telefono='966333444',
            nombre_visible='Carlos Guarda'
        )

        # Seed insignia
        self.insignia = Insignia.objects.create(
            codigo='primer_aviso',
            nombre='Primer aviso',
            descripcion='Envió un primer reporte que fue validado.',
            criterio={'tipo_actividad': 'reporte_validado', 'cantidad': 1}
        )

    def test_insignia_automatica_al_validar_reporte(self):
        # 1. El ciudadano crea un reporte
        reporte = Reporte.objects.create(
            usuario=self.ciudadano,
            comunidad=self.comunidad,
            tipo_incendio='pastizal',
            fecha_evento=timezone.now(),
            latitud=-15.0189,
            longitud=-73.7806
        )

        # 2. El verificador valida el reporte positivamente
        ValidacionReporte.objects.create(
            reporte=reporte,
            revisor=self.verificador,
            resultado='validado',
            comentario='Humo y fuego confirmados en campo'
        )

        # 3. Verificar que se creó la actividad comunal
        actividad = ActividadUsuario.objects.filter(
            usuario=self.ciudadano,
            tipo_actividad='reporte_validado'
        ).first()
        self.assertIsNotNone(actividad)
        self.assertEqual(actividad.estado, 'validada')
        self.assertEqual(actividad.validada_por, self.verificador)

        # 4. Verificar que se desbloqueó la insignia 'primer_aviso'
        usuario_insignia = UsuarioInsignia.objects.filter(
            usuario=self.ciudadano,
            insignia=self.insignia
        ).first()
        self.assertIsNotNone(usuario_insignia)
        self.assertEqual(usuario_insignia.actividad_desbloqueo, actividad)
