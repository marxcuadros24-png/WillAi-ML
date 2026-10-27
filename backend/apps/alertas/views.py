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
