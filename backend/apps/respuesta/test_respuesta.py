from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.geografia.models import Distrito, Comunidad
from apps.respuesta.models import Entidad, Brigada


class RespuestaModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.distrito = Distrito.objects.create(
            nombre='Coracora',
            provincia='Parinacochas',
            departamento='Ayacucho'
        )
        self.comunidad = Comunidad.objects.create(
            distrito=self.distrito,
            nombre='Secce',
            tipo='anexo'
        )
        self.entidad = Entidad.objects.create(
            nombre='Compañía de Bomberos Coracora',
            tipo=Entidad.TipoEntidad.BOMBEROS,
            sigla='B-128',
            distrito=self.distrito
        )
        self.brigada = Brigada.objects.create(
            entidad=self.entidad,
            comunidad=self.comunidad,
            nombre='Brigada Forestal Puma',
            tipo=Brigada.TipoBrigada.FORESTAL,
            estado=Brigada.EstadoBrigada.DISPONIBLE
        )

    def test_entidad_y_brigada_str(self):
        self.assertIn('B-128', str(self.entidad))
        self.assertIn('Brigada Forestal Puma', str(self.brigada))

    def test_api_listar_brigadas(self):
        response = self.client.get('/api/v1/respuesta/brigadas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['nombre'], 'Brigada Forestal Puma')
