from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.alertas.models import AlertaEmergencia, DestinatarioAlerta, PreferenciaNotificacion
from apps.alertas.tasks import evaluar_exposicion_y_alertar_task
from apps.meteorologia.models import Vivienda, ResidenteVivienda
from apps.geografia.models import Distrito, Comunidad

User = get_user_model()


class AlertasModelAndTasksTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='rosa_comunera',
            email='rosa@gmail.com',
            password='Password123!',
            nombre_visible='Rosa Comunera'
        )
        self.distrito, _ = Distrito.objects.get_or_create(
            nombre='Coracora',
            defaults={'provincia': 'Parinacochas', 'departamento': 'Ayacucho'}
        )
        self.comunidad, _ = Comunidad.objects.get_or_create(
            distrito=self.distrito,
            nombre='Secce',
            defaults={'tipo': 'anexo'}
        )
        self.vivienda = Vivienda.objects.create(
            comunidad=self.comunidad,
            referencia='Sector Secce Alto',
            latitud=-15.0200,
            longitud=-73.7810,
            activa=True
        )
        ResidenteVivienda.objects.create(
            vivienda=self.vivienda,
            usuario=self.user,
            relacion=ResidenteVivienda.Relacion.PROPIETARIO,
            recibe_alertas=True
        )

    def test_evaluar_exposicion_y_generar_alerta(self):
        res = evaluar_exposicion_y_alertar_task()
        self.assertEqual(res['status'], 'ok')
        self.assertGreaterEqual(res['viviendas_expuestas'], 1)
        self.assertGreaterEqual(res['destinatarios_notificados'], 1)

        # Verificar buzón de alertas del usuario
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/alertas/alertas/mis_alertas/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

        alerta_id = response.data[0]['alerta']['id_alerta']

        # Confirmar recepción de alerta desde el móvil
        conf_res = self.client.post(f'/api/v1/alertas/alertas/{alerta_id}/confirmar/')
        self.assertEqual(conf_res.status_code, status.HTTP_200_OK)

        dest = DestinatarioAlerta.objects.filter(alerta_id=alerta_id, usuario=self.user).first()
        self.assertEqual(dest.estado_entrega, DestinatarioAlerta.EstadoEntrega.CONFIRMADO)
