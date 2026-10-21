from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.usuarios.models import Rol, Permiso, RolPermiso, UsuarioRol

User = get_user_model()


class UsuariosModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.rol_poblador = Rol.objects.create(codigo='poblador', nombre='Poblador', sistema=True)
        self.rol_admin = Rol.objects.create(codigo='administrador', nombre='Administrador', sistema=True)
        self.permiso_reporte = Permiso.objects.create(codigo='reporte.crear', descripcion='Crear reportes')
        RolPermiso.objects.create(rol=self.rol_poblador, permiso=self.permiso_reporte)

    def test_creacion_usuario_con_roles_y_permisos(self):
        user = User.objects.create_user(
            username='juan_perez',
            email='juan@gmail.com',
            password='Password123!',
            nombre_visible='Juan Pérez'
        )
        UsuarioRol.objects.create(usuario=user, rol=self.rol_poblador)

        self.assertTrue(user.tiene_rol('poblador'))
        self.assertFalse(user.tiene_rol('administrador'))
        self.assertTrue(user.tiene_permiso('reporte.crear'))
        self.assertFalse(user.tiene_permiso('alerta.aprobar'))

    def test_registro_ciudadano_api(self):
        payload = {
            'username': 'maria_quispe',
            'password': 'PasswordSecure123!',
            'password_confirm': 'PasswordSecure123!',
            'first_name': 'María',
            'last_name': 'Quispe',
            'email': 'maria@gmail.com',
            'telefono': '987654321',
        }
        response = self.client.post('/api/v1/usuarios/registro/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username='maria_quispe')
        self.assertTrue(user.tiene_rol('poblador'))
        self.assertEqual(user.telefono, '987654321')

    def test_listar_roles_api(self):
        response = self.client.get('/api/v1/usuarios/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 2)
