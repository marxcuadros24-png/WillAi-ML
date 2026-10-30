from django.test import TestCase, Client
from django.utils import timezone
from decimal import Decimal
from apps.usuarios.models import Usuario
from apps.geografia.models import Distrito, Comunidad
from apps.reportes.models import Reporte, Evidencia
from apps.incidentes.models import Incidente, ReporteIncidente


class IncidentesPublicosApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.distrito = Distrito.objects.create(
            nombre='Coracora',
            provincia='Parinacochas',
            departamento='Ayacucho'
        )
        self.comunidad = Comunidad.objects.create(
            nombre='Secce',
            distrito=self.distrito
        )
        self.usuario_anonimo = Usuario.objects.create(
            username='vecino_privado',
            email='privado@comunidad.pe',
            telefono='+51999888777',
            nombre_visible='Juan Carlos Privado'
        )
        self.usuario_publico = Usuario.objects.create(
            username='dirigente_publico',
            email='dirigente@comunidad.pe',
            telefono='+51999111222',
            nombre_visible='Don Mateo Quispe'
        )

        # Reporte 1: NO autoriza publicación (anónimo)
        self.rep_anonimo = Reporte.objects.create(
            usuario=self.usuario_anonimo,
            comunidad=self.comunidad,
            tipo_incendio='pastizal',
            fecha_evento=timezone.now(),
            latitud=Decimal('-15.045000'),
            longitud=Decimal('-73.762000'),
            estado='validado',
            autoriza_publicacion=False
        )

        # Reporte 2: SÍ autoriza publicación
        self.rep_publico = Reporte.objects.create(
            usuario=self.usuario_publico,
            comunidad=self.comunidad,
            tipo_incendio='forestal',
            fecha_evento=timezone.now(),
            latitud=Decimal('-15.050000'),
            longitud=Decimal('-73.770000'),
            estado='validado',
            autoriza_publicacion=True
        )

        # Incidente vinculado a reporte anónimo
        self.inc_1 = Incidente.objects.create(
            codigo='INC-PUB-001',
            titulo='Foco en Pastizal Secce',
            tipo_incendio='pastizal',
            estado='en_combate',
            prioridad='alta',
            latitud_referencia=Decimal('-15.045000'),
            longitud_referencia=Decimal('-73.762000'),
            distrito=self.distrito,
            comunidad=self.comunidad
        )
        ReporteIncidente.objects.create(
            incidente=self.inc_1,
            reporte=self.rep_anonimo
        )

        # Incidente vinculado a reporte público
        self.inc_2 = Incidente.objects.create(
            codigo='INC-PUB-002',
            titulo='Frente Forestal Huallhua',
            tipo_incendio='forestal',
            estado='controlado',
            prioridad='media',
            latitud_referencia=Decimal('-15.050000'),
            longitud_referencia=Decimal('-73.770000'),
            distrito=self.distrito,
            comunidad=self.comunidad
        )
        ReporteIncidente.objects.create(
            incidente=self.inc_2,
            reporte=self.rep_publico
        )

        # Incidente descartado (falsa alarma - NO debe aparecer en API pública)
        self.inc_descartado = Incidente.objects.create(
            codigo='INC-PUB-DESCARTADO',
            titulo='Falsa Alarma Humo de Polvareda',
            tipo_incendio='otro',
            estado='descartado',
            prioridad='baja',
            latitud_referencia=Decimal('-15.010000'),
            longitud_referencia=Decimal('-73.740000'),
            distrito=self.distrito
        )

    def test_listado_publico_sin_autenticacion(self):
        """Cualquier ciudadano sin autenticación debe poder consultar la lista pública."""
        response = self.client.get('/api/v1/publico/incidentes/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('incidentes', data)
        self.assertEqual(data['total'], 2)  # Excluye el descartado

    def test_exclusion_estricta_de_incidentes_descartados(self):
        """Verifica que falsas alarmas o descartados nunca se expongan al público."""
        response = self.client.get('/api/v1/publico/incidentes/')
        codigos = [i['codigo'] for i in response.json()['incidentes']]
        self.assertNotIn('INC-PUB-DESCARTADO', codigos)

    def test_privacidad_anonima_cuando_no_autoriza_publicacion(self):
        """Verifica que NO se filtre el nombre ni datos personales si autoriza_publicacion=False."""
        response = self.client.get('/api/v1/publico/incidentes/')
        inc_1_data = next(i for i in response.json()['incidentes'] if i['codigo'] == 'INC-PUB-001')

        # Debe mostrar protección de identidad
        self.assertEqual(inc_1_data['identidad_autorizada'], False)
        self.assertIn('Anónimo', inc_1_data['reportado_por'])
        self.assertNotIn('Juan Carlos', inc_1_data['reportado_por'])
        self.assertNotIn('privado@comunidad.pe', str(inc_1_data))
        self.assertNotIn('+51999888777', str(inc_1_data))

    def test_difusion_autorizada_cuando_ciudadano_autoriza(self):
        """Verifica que SÍ se reconozca al ciudadano si autoriza_publicacion=True."""
        response = self.client.get('/api/v1/publico/incidentes/')
        inc_2_data = next(i for i in response.json()['incidentes'] if i['codigo'] == 'INC-PUB-002')

        self.assertEqual(inc_2_data['identidad_autorizada'], True)
        self.assertEqual(inc_2_data['reportado_por'], 'Don Mateo Quispe')
        # Pero NUNCA teléfonos ni correos
        self.assertNotIn('dirigente@comunidad.pe', str(inc_2_data))
        self.assertNotIn('+51999111222', str(inc_2_data))

    def test_filtros_publicos_por_estado_y_distrito(self):
        """Verifica filtrado correcto por estado y distrito."""
        # Filtro estado = activos
        res_activos = self.client.get('/api/v1/publico/incidentes/?estado=activos')
        self.assertEqual(res_activos.json()['total'], 1)
        self.assertEqual(res_activos.json()['incidentes'][0]['codigo'], 'INC-PUB-001')

        # Filtro estado = controlados
        res_controlados = self.client.get('/api/v1/publico/incidentes/?estado=controlados')
        self.assertEqual(res_controlados.json()['total'], 1)
        self.assertEqual(res_controlados.json()['incidentes'][0]['codigo'], 'INC-PUB-002')

    def test_estadisticas_publicas_del_dia(self):
        """Verifica que el endpoint de estadísticas responda con indicadores válidos."""
        response = self.client.get('/api/v1/publico/estadisticas/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('hoy', data)
        self.assertIn('sistema', data)
        self.assertIn('meteorologia', data)
        self.assertEqual(data['sistema']['total_activos'], 1)
        self.assertEqual(data['sistema']['total_controlados'], 1)

    def test_catalogo_distritos_publico(self):
        """Verifica que se devuelva el listado de distritos para los filtros."""
        response = self.client.get('/api/v1/publico/distritos/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('distritos', data)
        self.assertTrue(len(data['distritos']) >= 1)

