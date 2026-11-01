import io
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.reportes.models import Reporte, Evidencia, ValidacionReporte
from apps.incidentes.models import Incidente, ReporteIncidente, HistorialIncidente

User = get_user_model()


class IncidenteSincronizacionE2ETest(TestCase):
    """
    Prueba integral de sincronización:
    Móvil (Creación con foto) -> Django (Transacción atómica) -> Centro de Control -> Aceptación/Rechazo
    """

    def setUp(self):
        self.client = APIClient()
        self.operador = User.objects.create_user(
            username='operador_test',
            email='operador@willai.pe',
            password='password123',
            nombre_visible='Operador Centro de Mando'
        )
        self.ciudadano = User.objects.create_user(
            username='ciudadano_test',
            email='ciudadano@willai.pe',
            password='password123',
            nombre_visible='Poblador Coracora'
        )

        # Generar imagen JPEG real en memoria
        img_io = io.BytesIO()
        img = Image.new('RGB', (100, 100), color=(255, 69, 0))
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        self.foto_test = SimpleUploadedFile(
            'fuego_cerro_test.jpg',
            img_io.getvalue(),
            content_type='image/jpeg'
        )

    def test_flujo_completo_registro_movil_y_aceptacion_operador(self):
        # 1. El ciudadano envía reporte desde el móvil con foto y GPS
        self.client.force_authenticate(user=self.ciudadano)
        response = self.client.post(
            '/api/v1/reportes/reportes/',
            data={
                'tipo_incendio': 'pastizal',
                'latitud': '-15.021000',
                'longitud': '-73.785000',
                'precision_metros': '4.0',
                'descripcion': 'Fuego en pastizal cerca a Huaccana observado desde camino vecinal',
                'fotografia': self.foto_test
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, 201, f"Fallo al crear reporte: {response.data}")

        # 2. Verificar que se creó el Reporte y la Evidencia
        reporte_id = response.data['id_reporte']
        reporte = Reporte.objects.get(id_reporte=reporte_id)
        self.assertEqual(reporte.usuario, self.ciudadano)
        self.assertEqual(reporte.estado, Reporte.EstadoReporte.RECIBIDO)

        evidencia = reporte.evidencias.first()
        self.assertIsNotNone(evidencia, "La evidencia fotográfica no fue creada")
        self.assertTrue(bool(evidencia.archivo), "El archivo de imagen no fue guardado")

        # 3. Verificar que se creó automáticamente el Incidente con estado NUEVO (PENDIENTE)
        vinculo = ReporteIncidente.objects.filter(reporte=reporte).first()
        self.assertIsNotNone(vinculo, "No se generó el vínculo ReporteIncidente")
        self.assertEqual(vinculo.tipo_vinculo, ReporteIncidente.TipoVinculo.ORIGEN)

        incidente = vinculo.incidente
        self.assertEqual(incidente.estado, Incidente.EstadoIncidente.NUEVO)
        self.assertEqual(float(incidente.latitud_referencia), -15.021)
        self.assertEqual(float(incidente.longitud_referencia), -73.785)
        self.assertTrue(incidente.codigo.startswith('INC-'))

        # 4. Verificar que el Centro de Control consulta la lista de incidentes y ve el nuevo incidente con su foto
        self.client.force_authenticate(user=self.operador)
        res_list = self.client.get('/api/v1/incidentes/incidentes/')
        self.assertEqual(res_list.status_code, 200)
        items = res_list.data.get('results', res_list.data)
        inc_item = next((i for i in items if i['id_incidente'] == incidente.id_incidente), None)
        self.assertIsNotNone(inc_item, "El incidente no aparece en la lista consultada por el Centro de Control")
        self.assertEqual(inc_item['estado'], 'nuevo')
        self.assertIsNotNone(inc_item['fotografia_url'], "La fotografía no está expuesta en la lista de incidentes")
        self.assertIn('.jpg', inc_item['fotografia_url'])

        # 5. Operador Acepta el Incidente (Confirmación)
        res_estado = self.client.patch(
            f'/api/v1/incidentes/incidentes/{incidente.id_incidente}/estado/',
            data={'estado': 'confirmado', 'nota': 'Humo corroborado por brigada local'},
            format='json'
        )
        self.assertEqual(res_estado.status_code, 200)

        # 6. Comprobar que tanto el Incidente como el Reporte se actualizaron coherentemente
        incidente.refresh_from_db()
        reporte.refresh_from_db()
        self.assertEqual(incidente.estado, Incidente.EstadoIncidente.CONFIRMADO)
        self.assertIsNotNone(incidente.confirmado_en)
        self.assertEqual(reporte.estado, Reporte.EstadoReporte.VALIDADO)

        # 7. Verificar bitácora de validación e historial
        val = ValidacionReporte.objects.filter(reporte=reporte).first()
        self.assertIsNotNone(val, "No se registró la ValidacionReporte")
        self.assertEqual(val.resultado, ValidacionReporte.ResultadoValidacion.VALIDADO)
        self.assertEqual(val.revisor, self.operador)

        hist = HistorialIncidente.objects.filter(incidente=incidente, estado_nuevo='confirmado').first()
        self.assertIsNotNone(hist, "No se registró el cambio en HistorialIncidente")
        self.assertEqual(hist.usuario, self.operador)

    def test_flujo_rechazo_falsa_alarma_anonimo(self):
        # 1. Un ciudadano anónimo (sin auth) envía reporte
        self.client.logout()
        response = self.client.post(
            '/api/v1/reportes/reportes/',
            data={
                'tipo_incendio': 'forestal',
                'latitud': '-15.035000',
                'longitud': '-73.772000',
                'precision_metros': '5.0',
                'descripcion': 'Columna de humo divisada a lo lejos',
            },
            format='multipart'
        )
        self.assertEqual(response.status_code, 201)

        reporte_id = response.data['id_reporte']
        reporte = Reporte.objects.get(id_reporte=reporte_id)
        # Requisito 3: Conserva correctamente su condición de anónimo
        self.assertIsNone(reporte.usuario, "El reporte anónimo no debe asignarse a ningún usuario ficticio")

        vinculo = ReporteIncidente.objects.filter(reporte=reporte).first()
        self.assertIsNotNone(vinculo)
        incidente = vinculo.incidente
        self.assertIsNone(incidente.creado_por, "El incidente anónimo debe tener creado_por=None")
        self.assertEqual(incidente.estado, Incidente.EstadoIncidente.NUEVO)

        # 2. Operador Rechaza el Incidente (Falsa alarma / descartado)
        self.client.force_authenticate(user=self.operador)
        res_estado = self.client.patch(
            f'/api/v1/incidentes/incidentes/{incidente.id_incidente}/estado/',
            data={'estado': 'descartado', 'nota': 'Verificado: era quema controlada en chacra sin riesgo'},
            format='json'
        )
        self.assertEqual(res_estado.status_code, 200)

        incidente.refresh_from_db()
        reporte.refresh_from_db()
        self.assertEqual(incidente.estado, Incidente.EstadoIncidente.DESCARTADO)
        self.assertEqual(reporte.estado, Reporte.EstadoReporte.RECHAZADO)

        val = ValidacionReporte.objects.filter(reporte=reporte).first()
        self.assertIsNotNone(val)
        self.assertEqual(val.resultado, ValidacionReporte.ResultadoValidacion.RECHAZADO)

