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
