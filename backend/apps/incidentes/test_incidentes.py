from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.incidentes.models import Incidente, AsignacionBrigada, CierreIncidente, HistorialIncidente
from apps.respuesta.models import Entidad, Brigada
from apps.geografia.models import Distrito

User = get_user_model()


class IncidentesModelAndAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.operador = User.objects.create_user(
            username='operador_willai',
            email='operador@willai.pe',
            password='Password123!',
            nombre_visible='Operador WillAI'
        )
        self.distrito = Distrito.objects.create(nombre='Coracora')
        self.entidad = Entidad.objects.create(nombre='COEP Parinacochas', distrito=self.distrito)
        self.brigada = Brigada.objects.create(
            entidad=self.entidad,
            nombre='Brigada Rápida Coracora',
            tipo=Brigada.TipoBrigada.MUNICIPAL,
            estado=Brigada.EstadoBrigada.DISPONIBLE
        )
        self.incidente = Incidente.objects.create(
            codigo='INC-2026-0001',
            titulo='Incidente Pastizal Sector Secce',
            tipo_incendio=Incidente.TipoIncendio.PASTIZAL,
            estado=Incidente.EstadoIncidente.CONFIRMADO,
            prioridad=Incidente.Prioridad.ALTA,
            latitud_referencia=-15.0450,
            longitud_referencia=-73.7620,
            distrito=self.distrito,
            creado_por=self.operador
        )

    def test_asignar_brigada_endpoint(self):
        self.client.force_authenticate(user=self.operador)
        payload = {
            'id_brigada': self.brigada.id_brigada,
            'instrucciones': 'Avanzar por vía afirmada con motobombas y cuadrilla de 6.'
        }
        response = self.client.post(f'/api/v1/incidentes/incidentes/{self.incidente.id_incidente}/asignar_brigada/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.incidente.refresh_from_db()
        self.brigada.refresh_from_db()
        self.assertEqual(self.incidente.estado, Incidente.EstadoIncidente.ASIGNADO)
        self.assertEqual(self.brigada.estado, Brigada.EstadoBrigada.OCUPADA)
        self.assertEqual(AsignacionBrigada.objects.count(), 1)

    def test_cambiar_estado_endpoint(self):
        self.client.force_authenticate(user=self.operador)
        payload = {
            'estado': 'en_atencion',
            'nota': 'Brigadas en combate directo de línea norte'
        }
        response = self.client.patch(f'/api/v1/incidentes/incidentes/{self.incidente.id_incidente}/estado/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.incidente.refresh_from_db()
        self.assertEqual(self.incidente.estado, Incidente.EstadoIncidente.EN_ATENCION)
        self.assertTrue(HistorialIncidente.objects.filter(estado_nuevo='en_atencion').exists())

    def test_cerrar_incidente_endpoint(self):
        self.client.force_authenticate(user=self.operador)
        payload = {
            'motivo': 'Incidente 100% liquidado y enfriado. No hay puntos calientes remanentes.',
            'evidencia_uri': 'https://storage.willai.pe/evidencias/cierre_0001.jpg'
        }
        response = self.client.post(f'/api/v1/incidentes/incidentes/{self.incidente.id_incidente}/cerrar/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.incidente.refresh_from_db()
        self.assertEqual(self.incidente.estado, Incidente.EstadoIncidente.CERRADO)
        self.assertIsNotNone(self.incidente.cerrado_en)
        self.assertTrue(CierreIncidente.objects.filter(incidente=self.incidente).exists())
