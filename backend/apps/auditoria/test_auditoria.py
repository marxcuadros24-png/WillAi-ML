from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from apps.auditoria.models import Auditoria, hash_ip
from apps.auditoria.services import registrar_auditoria

Usuario = get_user_model()


class AuditoriaTestCase(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = Usuario.objects.create_user(
            username='admin_auditor',
            email='auditor@willai.pe',
            password='password123',
            telefono='966000111',
            nombre_visible='Auditor General',
            is_staff=True
        )

    def test_hash_ip_anonimizacion(self):
        ip = "192.168.1.100"
        hashed = hash_ip(ip)
        self.assertEqual(len(hashed), 64)  # SHA-256
        self.assertEqual(hashed, hash_ip(ip))

    def test_registrar_auditoria_con_request(self):
        request = self.factory.post('/api/v1/incidentes/')
        request.user = self.user
        request.META['REMOTE_ADDR'] = '200.48.10.50'

        registrar_auditoria(
            accion='CREAR_INCIDENTE',
            entidad='incidentes',
            id_registro='INC-001',
            request=request,
            detalles={'severidad': 'alta'}
        )

        log = Auditoria.objects.filter(accion='CREAR_INCIDENTE').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.usuario, self.user)
        self.assertEqual(log.entidad, 'incidentes')
        self.assertEqual(log.detalles.get('severidad'), 'alta')
        self.assertEqual(len(log.ip_hash), 64)
