from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.predicciones.fwi import calcular_sistema_fwi_completo, clasificar_nivel_peligro
from apps.predicciones.tasks import calcular_riesgo_fwi_task
from apps.predicciones.models import Prediccion


class PrediccionesModelAndTasksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.geografia.models import Distrito, Comunidad
        from apps.meteorologia.models import ObservacionMeteorologica
        from django.utils import timezone

        dist, _ = Distrito.objects.get_or_create(
            nombre="Coracora",
            provincia="Parinacochas",
            departamento="Ayacucho",
            defaults={"latitud_centro": -15.0189, "longitud_centro": -73.7806}
        )
        Comunidad.objects.get_or_create(
            distrito=dist,
            nombre="Coracora Centro",
            defaults={"latitud": -15.0189, "longitud": -73.7806}
        )
        ObservacionMeteorologica.objects.get_or_create(
            proveedor="Open-Meteo",
            id_externo="test_obs_setup",
            defaults={
                "latitud": -15.0189,
                "longitud": -73.7806,
                "observada_en": timezone.now(),
                "temperatura_c": 22.0,
                "humedad_relativa_pct": 38.0,
                "viento_kmh": 14.0,
                "precipitacion_mm": 0.0,
                "direccion_viento_grados": 240.0
            }
        )

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

    def test_ml_ocurrencia_entrenamiento_y_evaluacion(self):
        from apps.predicciones.ml_ocurrencia import entrenar_modelo_ocurrencia
        metadata = entrenar_modelo_ocurrencia(test_ratio=0.30)
        self.assertEqual(metadata['version'], '1.0.0-parinacochas')
        self.assertIn('metricas_evaluacion_temporal', metadata)

        metricas_rf = metadata['metricas_evaluacion_temporal']['random_forest_calibrado']
        self.assertIn('roc_auc', metricas_rf)
        self.assertIn('pr_auc', metricas_rf)
        self.assertIn('f1_score', metricas_rf)
        self.assertIn('brier_score', metricas_rf)

        metricas_base = metadata['metricas_evaluacion_temporal']['linea_base_logistic_regression']
        self.assertIn('f1_score', metricas_base)
        self.assertIn('roc_auc', metricas_base)

    def test_ml_ocurrencia_grilla_endpoint_y_reentrenamiento(self):
        # 1. Probar consulta de grilla de riesgo de ocurrencia
        response = self.client.get('/api/v1/predicciones/predicciones/riesgo_ocurrencia/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'FeatureCollection')
        self.assertGreater(len(response.data['features']), 0)

        primera_celda = response.data['features'][0]
        self.assertEqual(primera_celda['type'], 'Feature')
        self.assertIn('geometry', primera_celda)
        props = primera_celda['properties']
        self.assertIn('probabilidad', props)
        self.assertGreaterEqual(props['probabilidad'], 0.0)
        self.assertLessEqual(props['probabilidad'], 1.0)
        self.assertIn(props['nivel_riesgo'], ['bajo', 'moderado', 'alto', 'critico'])
        self.assertIn('color_hex', props)
        self.assertIn('comunidad_cercana', props)

        # 2. Probar endpoint de re-entrenamiento bajo demanda
        post_resp = self.client.post('/api/v1/predicciones/predicciones/entrenar_ocurrencia/', {'test_ratio': 0.30})
        self.assertEqual(post_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(post_resp.data['nivel_pico'], 'bajo' if post_resp.data['probabilidad_max'] < 0.25 else post_resp.data['nivel_pico'])
        self.assertIn('metricas', post_resp.data)
        self.assertGreater(post_resp.data['total_celdas'], 0)

