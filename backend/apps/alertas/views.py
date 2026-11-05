from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import AlertaEmergencia, PreferenciaNotificacion, DestinatarioAlerta
from .serializers import (
    AlertaEmergenciaSerializer,
    DestinatarioAlertaSerializer,
    PreferenciaNotificacionSerializer,
)


class AlertaEmergenciaViewSet(viewsets.ModelViewSet):
    """
    Gestión, emisión y consulta de Alertas de Emergencia para la población y brigadas.
    """
    queryset = AlertaEmergencia.objects.select_related('incidente', 'zona_riesgo').all()
    serializer_class = AlertaEmergenciaSerializer
    filterset_fields = ['tipo', 'prioridad', 'estado', 'incidente']
    search_fields = ['titulo', 'mensaje', 'instrucciones']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'mis_alertas', 'confirmar', 'evaluar_simulacion']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        alerta = serializer.save()
        if alerta.estado == AlertaEmergencia.EstadoAlerta.ENVIADA:
            self._despachar_push(alerta)

    def _despachar_push(self, alerta):
        from .push_service import despachar_push
        tokens = list(PreferenciaNotificacion.objects.filter(
            canal=PreferenciaNotificacion.Canal.PUSH,
            habilitado=True
        ).values_list('destino', flat=True))
        if tokens:
            despachar_push(
                tokens=tokens,
                titulo=f"🚨 {alerta.titulo}",
                cuerpo=alerta.mensaje,
                data={"id_alerta": alerta.id_alerta, "prioridad": alerta.prioridad}
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def mis_alertas(self, request):
        """
        Retorna el buzón de alertas recibidas por el usuario autenticado (con estado de lectura).
        """
        destinatarios = DestinatarioAlerta.objects.filter(usuario=request.user).select_related('alerta')
        serializer = DestinatarioAlertaSerializer(destinatarios, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def confirmar(self, request, pk=None):
        """
        Confirma que el usuario abrió y leyó la alerta en su aplicación móvil.
        """
        alerta = self.get_object()
        dest = DestinatarioAlerta.objects.filter(alerta=alerta, usuario=request.user).first()
        if not dest:
            return Response({"error": "Esta alerta no fue dirigida a su usuario."}, status=status.HTTP_404_NOT_FOUND)

        dest.estado_entrega = DestinatarioAlerta.EstadoEntrega.CONFIRMADO
        dest.confirmado_en = timezone.now()
        dest.save(update_fields=['estado_entrega', 'confirmado_en'])

        return Response(
            {
                "mensaje": f"Alerta '{alerta.titulo}' confirmada con éxito.",
                "confirmado_en": dest.confirmado_en
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def evaluar_simulacion(self, request):
        """
        Evalúa viviendas a menos de 5 km del perímetro de una simulación (isócrona 6h)
        dejando la alerta generada en estado PENDIENTE_APROBACION para validación humana.
        """
        from .services import evaluar_viviendas_en_riesgo_simulacion
        simulacion_id = request.data.get('simulacion_id')
        if not simulacion_id:
            return Response({"error": "Debe proporcionar 'simulacion_id'."}, status=status.HTTP_400_BAD_REQUEST)
        distancia_km = float(request.data.get('distancia_km', 5.0))
        res = evaluar_viviendas_en_riesgo_simulacion(simulacion_id, distancia_km=distancia_km)
        return Response(res, status=status.HTTP_200_OK)


class PreferenciaNotificacionViewSet(viewsets.ModelViewSet):
    """
    Configuración de canales de notificación (Push, SMS, Correo) del usuario.
    """
    serializer_class = PreferenciaNotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PreferenciaNotificacion.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['post'], url_path='registrar-token')
    def registrar_token(self, request):
        """
        Registra o actualiza de forma idempotente el token FCM Push del dispositivo.
        """
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Token requerido'}, status=status.HTTP_400_BAD_REQUEST)

        pref, _ = PreferenciaNotificacion.objects.update_or_create(
            usuario=request.user,
            canal=PreferenciaNotificacion.Canal.PUSH,
            defaults={
                'destino': token,
                'habilitado': True,
                'destino_verificado': True,
            }
        )
        return Response({
            'mensaje': 'Token push registrado exitosamente',
            'canal': pref.canal,
            'destino': pref.destino
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='test-push')
    def test_push(self, request):
        """
        Envía un push de prueba de alta prioridad al dispositivo del usuario o al token provisto.
        """
        token = request.data.get('token', '').strip()
        if not token:
            pref = PreferenciaNotificacion.objects.filter(
                usuario=request.user,
                canal=PreferenciaNotificacion.Canal.PUSH,
                habilitado=True
            ).first()
            if pref:
                token = pref.destino

        if not token:
            return Response(
                {'error': 'No hay token push registrado para este usuario ni provisto en la petición.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .push_service import despachar_push
        res = despachar_push(
            tokens=[token],
            titulo="🚨 PRUEBA DE ALERTA FORESTAL",
            cuerpo="Verificación de sonido y recepción en Doze Mode (WillAI Coracora).",
            data={"tipo": "test_push", "id_alerta": 0}
        )
        return Response(res, status=status.HTTP_200_OK)
