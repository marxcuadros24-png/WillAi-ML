from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.geografia.models import Distrito, Comunidad
from apps.incidentes.models import Incidente
from apps.reportes.models import Reporte
from apps.respuesta.models import Entidad, Brigada

Usuario = get_user_model()


class PanelWebTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.distrito = Distrito.objects.create(nombre='Coracora', ubigeo='050601')
        self.comunidad = Comunidad.objects.create(distrito=self.distrito, nombre='Secce')

        # Operador de emergencia COEP
        self.operador = Usuario.objects.create_user(
            username='operador_coep',
            email='coep@willai.pe',
            password='Password123!',
            nombre_visible='Operador Centro Mando',
            is_staff=True
        )

        # Ciudadano común
        self.ciudadano = Usuario.objects.create_user(
            username='ciudadano1',
            email='ciudadano@willai.pe',
            password='Password123!',
            nombre_visible='Poblador Comunal',
            is_staff=False
        )

        # Incidente y reporte de prueba
        self.incidente = Incidente.objects.create(
            codigo='INC-2026-999',
            titulo='Incendio Cerro Huallhua',
            tipo_incendio='forestal',
            estado='confirmado',
            prioridad='alta',
            latitud_referencia=-15.0189,
            longitud_referencia=-73.7806,
            distrito=self.distrito,
            creado_por=self.operador
        )

        self.reporte = Reporte.objects.create(
            usuario=self.ciudadano,
            comunidad=self.comunidad,
            tipo_incendio='pastizal',
            fecha_evento=timezone.now(),
            latitud=-15.0200,
            longitud=-73.7820,
            estado='recibido'
        )

    def test_acceso_restringido_panel(self):
        # Ciudadano común es redirigido o rechazado
        self.client.force_login(self.ciudadano)
        res = self.client.get('/panel/')
        self.assertEqual(res.status_code, 302)

        # Operador staff tiene acceso 200 OK
        self.client.force_login(self.operador)
        res_operador = self.client.get('/panel/')
        self.assertEqual(res_operador.status_code, 200)
        self.assertContains(res_operador, 'Centro de Mando Táctico')

    def test_mapa_data_api(self):
        self.client.force_login(self.operador)
        res = self.client.get('/panel/api/mapa/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('incidentes', data)
        self.assertIn('detecciones', data)
        self.assertIn('reportes', data)
        self.assertIn('viviendas', data)
        self.assertEqual(len(data['incidentes']), 1)
        self.assertEqual(data['incidentes'][0]['codigo'], 'INC-2026-999')

    def test_validar_reporte_desde_panel(self):
        self.client.force_login(self.operador)
        res = self.client.post(f'/panel/api/reportes/{self.reporte.id_reporte}/validar/', {
            'resultado': 'validado',
            'comentario': 'Confirmado con binoculares desde torre'
        })
        self.assertEqual(res.status_code, 200)
        self.reporte.refresh_from_db()
        self.assertEqual(self.reporte.estado, 'confirmado')

    def test_cambiar_estado_incidente(self):
        self.client.force_login(self.operador)
        res = self.client.post(f'/panel/api/incidentes/{self.incidente.id_incidente}/cambiar-estado/', {
            'estado': 'controlado',
            'nota': 'Línea de defensa completada por brigadistas'
        })
        self.assertEqual(res.status_code, 200)
        self.incidente.refresh_from_db()
        self.assertEqual(self.incidente.estado, 'controlado')

    def test_cerrar_incidente_rapido(self):
        from apps.incidentes.models import CierreIncidente, AsignacionBrigada
        entidad = Entidad.objects.create(nombre="Compañía Bomberos Coracora", tipo="bomberos")
        brigada = Brigada.objects.create(entidad=entidad, nombre="Brigada Alfa", estado="desplegada")
        asig = AsignacionBrigada.objects.create(
            incidente=self.incidente,
            brigada=brigada,
            estado='trabajando',
            asignado_por=self.operador
        )

        self.client.force_login(self.operador)
        res = self.client.post(f'/panel/api/incidentes/{self.incidente.id_incidente}/cerrar/', {
            'motivo': 'Control total del fuego y guardia de cenizas completada con éxito.'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])

        self.incidente.refresh_from_db()
        self.assertEqual(self.incidente.estado, 'cerrado')
        self.assertIsNotNone(self.incidente.cerrado_en)

        # Verificar creación del acta de cierre
        cierre = CierreIncidente.objects.filter(incidente=self.incidente).first()
        self.assertIsNotNone(cierre)
        self.assertEqual(cierre.cerrado_por, self.operador)

        # Verificar liberación de brigadas
        brigada.refresh_from_db()
        self.assertEqual(brigada.estado, 'disponible')
        asig.refresh_from_db()
        self.assertEqual(asig.estado, 'finalizada')

    def test_emitir_alerta_rapida(self):
        from apps.alertas.models import AlertaEmergencia
        self.client.force_login(self.operador)
        res = self.client.post('/panel/api/alertas/emitir/', {
            'titulo': 'Alerta Roja de Evacuación Sector Huallhua',
            'mensaje': 'El viento empuja el humo hacia la quebrada norte.',
            'instrucciones': 'Evacuar hacia el coliseo municipal de Coracora.',
            'prioridad': 'muy_alta',
            'tipo': 'evacuacion',
            'id_incidente': self.incidente.id_incidente
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])

        alerta = AlertaEmergencia.objects.filter(id_alerta=data['id_alerta']).first()
        self.assertIsNotNone(alerta)
        self.assertEqual(alerta.prioridad, 'muy_alta')
        self.assertEqual(alerta.estado, 'enviada')
        self.assertEqual(alerta.emitida_por, self.operador)

    def test_moderar_donacion_rapida(self):
        from apps.donaciones.models import Donante, OfertaDonacion
        donante = Donante.objects.create(tipo_donante='persona', nombre_publico='Comunero Solidario')
        oferta = OfertaDonacion.objects.create(
            donante=donante,
            titulo='Donación de 20 palas y linternas',
            estado='pendiente'
        )

        self.client.force_login(self.operador)
        res = self.client.post(f'/panel/api/donaciones/{oferta.id_oferta}/moderar/', {
            'accion': 'aprobar',
            'comentario': 'Implementos verificados y conformes'
        })
        self.assertEqual(res.status_code, 200)
        oferta.refresh_from_db()
        self.assertEqual(oferta.estado, 'publicada')
        self.assertIsNotNone(oferta.publicada_en)

