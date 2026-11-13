import os
import tempfile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.firms.models import FuenteSatelital, DeteccionSatelital, LoteImportacionFirms
from apps.firms.tasks import importar_firms_task
from apps.firms.footprints import (
    calcular_footprint_pixel,
    construir_geojson_pixeles,
    reconstruir_isocronas_y_cicatrices
)
from apps.firms.exportador_qgis import exportar_paquete_qgis_completo


class FirmsModelAndTasksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.fuente, _ = FuenteSatelital.objects.get_or_create(
            codigo_producto='VIIRS_SNPP_SP',
            defaults={
                'proveedor': 'NASA FIRMS',
                'sensor': 'VIIRS',
                'plataforma': 'Suomi-NPP',
                'tipo_producto': FuenteSatelital.TipoProducto.ARCHIVE
            }
        )

    def test_importar_firms_task_and_api(self):
        res = importar_firms_task(sensor="VIIRS_NOAA20_NRT", days=1)
        self.assertEqual(res['status'], 'ok')
        self.assertGreaterEqual(LoteImportacionFirms.objects.count(), 1)

        # Crear una detección para asegurar prueba completa de la API
        DeteccionSatelital.objects.get_or_create(
            clave_deteccion='test_det_hash_001',
            defaults={
                'fuente': self.fuente,
                'fecha_observacion': timezone.now(),
                'latitud': -15.035,
                'longitud': -73.765,
                'frp_mw': 14.5,
                'scan_km': 0.375,
                'track_km': 0.375,
                'dia_noche': 'D',
                'confianza': 'high'
            }
        )

        response = self.client.get('/api/v1/firms/detecciones/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_importar_modis_task_and_history(self):
        res = importar_firms_task(sensor="MODIS_NRT", days=3)
        self.assertEqual(res['status'], 'ok')
        fuente_modis = FuenteSatelital.objects.filter(sensor='MODIS').first()
        self.assertIsNotNone(fuente_modis)

        resp_sensor = self.client.get('/api/v1/firms/detecciones/?sensor=MODIS')
        self.assertEqual(resp_sensor.status_code, status.HTTP_200_OK)

        resp_hist = self.client.get('/api/v1/firms/detecciones/historial_meses/?meses=6')
        self.assertEqual(resp_hist.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_hist.data['periodo_meses'], 6)
        self.assertIn('historial_mensual', resp_hist.data)

    def test_calcular_footprint_pixel(self):
        poly_d, area_d = calcular_footprint_pixel(-73.78, -15.02, scan_km=0.55, track_km=0.68, dia_noche='D')
        self.assertTrue(poly_d.is_valid)
        self.assertEqual(len(poly_d.exterior.coords), 5)
        self.assertAlmostEqual(area_d, 37.40, places=1)

        poly_n, area_n = calcular_footprint_pixel(-73.78, -15.02, scan_km=1.0, track_km=1.0, dia_noche='N')
        self.assertTrue(poly_n.is_valid)
        self.assertAlmostEqual(area_n, 100.0, places=1)

    def test_construir_geojson_y_cicatrices(self):
        ahora = timezone.now()
        for i in range(3):
            DeteccionSatelital.objects.create(
                clave_deteccion=f'test_det_cluster_{i}',
                fuente=self.fuente,
                fecha_observacion=ahora + timezone.timedelta(hours=i * 2),
                latitud=-15.020 + (i * 0.002),
                longitud=-73.780 + (i * 0.002),
                frp_mw=25.0 + i,
                scan_km=0.4,
                track_km=0.4,
                dia_noche='D',
                confianza='high'
            )

        dets = DeteccionSatelital.objects.all()
        geojson_pix = construir_geojson_pixeles(dets)
        self.assertEqual(geojson_pix['type'], 'FeatureCollection')
        self.assertGreaterEqual(len(geojson_pix['features']), 3)

        geojson_isocronas, geojson_cicatrices = reconstruir_isocronas_y_cicatrices(dets)
        self.assertGreaterEqual(len(geojson_isocronas['features']), 1)
        self.assertGreaterEqual(len(geojson_cicatrices['features']), 1)

    def test_exportar_paquete_completo_qgis_y_api(self):
        DeteccionSatelital.objects.create(
            clave_deteccion='test_det_export_01',
            fuente=self.fuente,
            fecha_observacion=timezone.now(),
            latitud=-15.025,
            longitud=-73.785,
            frp_mw=32.0,
            scan_km=0.38,
            track_km=0.38,
            dia_noche='D',
            confianza='high'
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            res = exportar_paquete_qgis_completo(tmp_dir)
            self.assertTrue(os.path.exists(res['proyecto_qgis']))
            self.assertTrue(os.path.exists(res['google_earth_kmz']))
            self.assertTrue(os.path.exists(res['rastros_fusionados']))
            self.assertTrue(os.path.exists(res['pixeles_raw']))
            self.assertTrue(os.path.exists(res['isocronas']))
            self.assertTrue(os.path.exists(res['cicatrices']))

        # Probar endpoints API REST de exportación
        resp_rastros = self.client.get('/api/v1/firms/detecciones/rastros_fusionados/')
        self.assertEqual(resp_rastros.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_rastros.data['type'], 'FeatureCollection')

        resp_pix = self.client.get('/api/v1/firms/detecciones/geojson_pixeles/')
        self.assertEqual(resp_pix.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_pix.data['type'], 'FeatureCollection')

        resp_kmz = self.client.get('/api/v1/firms/detecciones/exportar_kmz/')
        self.assertEqual(resp_kmz.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_kmz['Content-Type'], 'application/vnd.google-earth.kmz')

        resp_qgis = self.client.get('/api/v1/firms/detecciones/exportar_qgis/')
        self.assertEqual(resp_qgis.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_qgis['Content-Type'], 'application/zip')
