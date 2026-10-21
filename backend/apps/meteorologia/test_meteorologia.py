from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.meteorologia.models import ObservacionMeteorologica, ZonaRiesgo, Vivienda, ResidenteVivienda
from apps.geografia.models import Distrito, Comunidad

User = get_user_model()


class MeteorologiaModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='pedro_comunero',
            email='pedro@gmail.com',
            password='Password123!',
            nombre_visible='Pedro Comunero'
        )
        self.distrito, _ = Distrito.objects.get_or_create(
            nombre='Coracora',
            defaults={'provincia': 'Parinacochas', 'departamento': 'Ayacucho'}
        )
        self.comunidad, _ = Comunidad.objects.get_or_create(
            distrito=self.distrito,
            nombre='Muchapampa',
            defaults={'tipo': 'sector'}
        )

    def test_observacion_meteorologica_api(self):
        ObservacionMeteorologica.objects.create(
            proveedor='Open-Meteo',
            id_externo='test_openmeteo_001',
            latitud=-15.0189,
            longitud=-73.7806,
            observada_en=timezone.now(),
            temperatura_c=14.5,
            humedad_relativa_pct=42.0,
            viento_kmh=18.5,
            direccion_viento_grados=210.0,
            precipitacion_mm=0.0
        )
        response = self.client.get('/api/v1/meteorologia/observaciones/actual/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['temperatura_c']), 14.5)

    def test_registro_vivienda_y_residente(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'comunidad': self.comunidad.id_comunidad,
            'referencia': 'Casa de adobe a 200m de la escuela comunal',
            'latitud': -15.0250,
            'longitud': -73.7400,
            'precision_metros': 5.0
        }
        response = self.client.post('/api/v1/meteorologia/viviendas/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Vivienda.objects.count(), 1)
        viv = Vivienda.objects.first()
        self.assertTrue(ResidenteVivienda.objects.filter(vivienda=viv, usuario=self.user).exists())
