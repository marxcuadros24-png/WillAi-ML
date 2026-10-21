from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.geografia.models import Distrito, Comunidad


class GeografiaModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.distrito = Distrito.objects.create(
            nombre='Coracora',
            provincia='Parinacochas',
            departamento='Ayacucho',
            ubigeo='050701',
            latitud_centro=-15.0189,
            longitud_centro=-73.7806
        )
        self.comunidad = Comunidad.objects.create(
            distrito=self.distrito,
            nombre='Secce',
            tipo='anexo',
            latitud=-15.0450,
            longitud=-73.7620,
            activa=True
        )

    def test_distrito_y_comunidad_str(self):
        self.assertEqual(str(self.distrito), 'Coracora (Parinacochas, Ayacucho)')
        self.assertIn('Secce', str(self.comunidad))

    def test_api_listar_distritos(self):
        response = self.client.get('/api/v1/geografia/distritos/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['nombre'], 'Coracora')

    def test_api_listar_comunidades(self):
        response = self.client.get('/api/v1/geografia/comunidades/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['distrito_nombre'], 'Coracora')
