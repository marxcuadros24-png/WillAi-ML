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

    def test_ml_viento_12h_task_and_api(self):
        # Probar endpoint GET de predicción a 12 horas
        response = self.client.get('/api/v1/predicciones/predicciones/viento_12h/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('pronostico_12h', response.data)
        self.assertEqual(len(response.data['pronostico_12h']), 12)
        primer_paso = response.data['pronostico_12h'][0]
        self.assertIn('velocidad_kmh', primer_paso)
        self.assertIn('direccion_viento_grados', primer_paso)
        self.assertIn('rumbo_propagacion_grados', primer_paso)
        self.assertIn('cono_dispersion', primer_paso)

        # Probar re-entrenamiento bajo demanda POST
        post_resp = self.client.post('/api/v1/predicciones/predicciones/entrenar_viento/', {})
        self.assertEqual(post_resp.status_code, status.HTTP_200_OK)
        self.assertIn('metricas', post_resp.data)
