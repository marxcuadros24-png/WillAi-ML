from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.firms.models import FuenteSatelital, DeteccionSatelital, LoteImportacionFirms
from apps.firms.tasks import importar_firms_task


class FirmsModelAndTasksTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_importar_firms_task_and_api(self):
        res = importar_firms_task(sensor="VIIRS_NOAA20_NRT", days=1)
        self.assertEqual(res['status'], 'ok')
        self.assertGreaterEqual(LoteImportacionFirms.objects.count(), 1)

        # Crear una detección para asegurar prueba completa de la API
        fuente = FuenteSatelital.objects.first()
        DeteccionSatelital.objects.get_or_create(
            clave_deteccion='test_det_hash_001',
            defaults={
                'fuente': fuente,
                'fecha_observacion': timezone.now(),
                'latitud': -15.035,
                'longitud': -73.765,
                'frp_mw': 14.5,
                'confianza': 'high'
            }
        )

        # Probar endpoint API
        response = self.client.get('/api/v1/firms/detecciones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_importar_modis_task_and_history(self):
        res = importar_firms_task(sensor="MODIS_NRT", days=3)
        self.assertEqual(res['status'], 'ok')
        fuente_modis = FuenteSatelital.objects.filter(sensor='MODIS').first()
        self.assertIsNotNone(fuente_modis)

        # Probar filtro por sensor
        resp_sensor = self.client.get('/api/v1/firms/detecciones/?sensor=MODIS')
        self.assertEqual(resp_sensor.status_code, status.HTTP_200_OK)

        # Probar endpoint de historial mensual (hasta 6 meses)
        resp_hist = self.client.get('/api/v1/firms/detecciones/historial_meses/?meses=6')
        self.assertEqual(resp_hist.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_hist.data['periodo_meses'], 6)
        self.assertIn('historial_mensual', resp_hist.data)
