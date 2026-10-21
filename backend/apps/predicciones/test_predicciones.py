from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.predicciones.fwi import calcular_sistema_fwi_completo, clasificar_nivel_peligro
from apps.predicciones.tasks import calcular_riesgo_fwi_task
from apps.predicciones.models import Prediccion


class PrediccionesModelAndTasksTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_calculo_matematico_fwi(self):
        # Temperatura alta (30°C), baja humedad (20%), viento fuerte (25 km/h), sin lluvia
        res = calcular_sistema_fwi_completo(
            temp=30.0,
            rh=20.0,
            wind=25.0,
            rain=0.0,
            month=10,
            lat=-15.02
        )
        self.assertGreater(res['fwi'], 20.0)
        self.assertIn(res['nivel_peligro'], ['alto', 'critico'])

    def test_task_calcular_riesgo_fwi_and_api(self):
        res = calcular_riesgo_fwi_task()
        self.assertEqual(res['status'], 'ok')
        self.assertTrue(Prediccion.objects.filter(pk=res['id_prediccion']).exists())

        # Test API endpoint
        response = self.client.get('/api/v1/predicciones/predicciones/actual/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id_prediccion'], res['id_prediccion'])
