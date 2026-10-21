from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.reportes.models import Reporte, ValidacionReporte
from apps.geografia.models import Distrito, Comunidad

User = get_user_model()


class ReportesModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='carlos_reportante',
            email='carlos@gmail.com',
            password='Password123!',
            nombre_visible='Carlos Reportante'
        )
        self.verificador = User.objects.create_user(
            username='ana_verificadora',
            email='ana@gmail.com',
            password='Password123!',
            nombre_visible='Ana Verificadora'
        )
        self.distrito = Distrito.objects.create(nombre='Coracora')
        self.comunidad = Comunidad.objects.create(distrito=self.distrito, nombre='Huallhua')

    def test_crear_reporte_api(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'tipo_incendio': 'forestal',
            'descripcion': 'Humo denso y llamas visibles cerca al cerro Huallhua',
            'latitud': -15.0800,
            'longitud': -73.8100,
            'precision_metros': 12.5,
            'direccion_viento': 'NE',
            'comunidad': self.comunidad.id_comunidad,
        }
        response = self.client.post('/api/v1/reportes/reportes/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reporte.objects.count(), 1)
        reporte = Reporte.objects.first()
        self.assertEqual(reporte.estado, Reporte.EstadoReporte.RECIBIDO)
        self.assertEqual(reporte.usuario, self.user)

    def test_validar_reporte_action(self):
        reporte = Reporte.objects.create(
            usuario=self.user,
            tipo_incendio=Reporte.TipoIncendio.PASTIZAL,
            fecha_evento=timezone.now(),
            latitud=-15.08,
            longitud=-73.81,
            estado=Reporte.EstadoReporte.RECIBIDO
        )
        self.client.force_authenticate(user=self.verificador)
        payload = {
            'resultado': 'validado',
            'comentario': 'Verificado con autoridades comunales, fuego activo en pastizal.'
        }
        response = self.client.post(f'/api/v1/reportes/reportes/{reporte.id_reporte}/validar/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        reporte.refresh_from_db()
        self.assertEqual(reporte.estado, Reporte.EstadoReporte.VALIDADO)
        self.assertEqual(ValidacionReporte.objects.count(), 1)
        val = ValidacionReporte.objects.first()
        self.assertEqual(val.revisor, self.verificador)
        self.assertEqual(val.resultado, 'validado')
