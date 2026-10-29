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

    def test_clasificar_nivel_peligro_escalas(self):
        """
        Verifica la discriminación entre la escala Canadiense boreal y la escala Pajonal Altoandino.
        """
        from apps.predicciones.fwi import clasificar_nivel_peligro

        # FWI = 15.0: Canadiense es 'alto' (> 11.2), pero en Pajonal Altoandino es 'bajo' (< 18.0)
        self.assertEqual(clasificar_nivel_peligro(15.0, escala='canadiense'), 'alto')
        self.assertEqual(clasificar_nivel_peligro(15.0, escala='pajonal_altoandino'), 'bajo')

        # FWI = 30.0: Canadiense es 'critico' (>= 21.3), pero en Pajonal Altoandino es 'moderado' (18.0 - 42.0)
        self.assertEqual(clasificar_nivel_peligro(30.0, escala='canadiense'), 'critico')
        self.assertEqual(clasificar_nivel_peligro(30.0, escala='pajonal_altoandino'), 'moderado')

        # FWI = 50.0: Canadiense es 'critico', pero en Pajonal Altoandino es 'alto' (42.0 - 65.0)
        self.assertEqual(clasificar_nivel_peligro(50.0, escala='pajonal_altoandino'), 'alto')

        # FWI = 70.0: En ambas es 'critico'
        self.assertEqual(clasificar_nivel_peligro(70.0, escala='pajonal_altoandino'), 'critico')

        # Con lluvia activa (rain > 0) o humedad alta (rh >= 75%), siempre inhibe a 'bajo'
        self.assertEqual(clasificar_nivel_peligro(80.0, rain=2.0), 'bajo')
        self.assertEqual(clasificar_nivel_peligro(80.0, rh=80.0), 'bajo')

    def test_probabilidad_ignicion_fwi_calibrada(self):
        """
        Verifica el cálculo de probabilidad calibrada mediante Platt scaling (sigmoide numéricamente monótona).
        """
        from apps.predicciones.fwi import calcular_probabilidad_ignicion_fwi

        p_bajo = calcular_probabilidad_ignicion_fwi(10.0)
        p_medio = calcular_probabilidad_ignicion_fwi(35.0)
        p_alto = calcular_probabilidad_ignicion_fwi(70.0)

        self.assertLess(p_bajo, 0.25)
        self.assertGreater(p_alto, 0.65)
        self.assertLess(p_bajo, p_medio)
        self.assertLess(p_medio, p_alto)

        # Lluvia activa inhibe la probabilidad
        self.assertEqual(calcular_probabilidad_ignicion_fwi(80.0, rain=1.5), 0.02)
        self.assertEqual(calcular_probabilidad_ignicion_fwi(80.0, rh=85.0), 0.02)

    def test_calibrador_fwi_y_reporte_api(self):
        """
        Verifica que el CalibradorFWI compute PR-AUC, ROC-AUC y Brier Score y que el endpoint
        GET /api/v1/predicciones/predicciones/reporte_calibracion_fwi/ retorne HTTP 200.
        """
        from apps.predicciones.calibrador_fwi import CalibradorFWI

        calibrador = CalibradorFWI(dias=180)
        rep = calibrador.calibrar(guardar_artefacto=True)

        self.assertIn('metricas_evaluacion', rep)
        met = rep['metricas_evaluacion']
        self.assertGreater(met['pr_auc_average_precision'], 0.70)
        self.assertGreater(met['roc_auc'], 0.75)
        self.assertLess(met['brier_score_calibrado'], 0.22)
        self.assertGreater(met['mejora_brier_score_pct'], 20.0)

        # Probar endpoint API
        response = self.client.get('/api/v1/predicciones/predicciones/reporte_calibracion_fwi/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('metricas_evaluacion', response.data)
        self.assertIn('distribucion_contingencia', response.data)


