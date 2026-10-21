from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import (
    Incidente,
    ReporteIncidente,
    HistorialIncidente,
    AccionAtencion,
    AsignacionBrigada,
    CierreIncidente,
)
from .serializers import (
    IncidenteListSerializer,
    IncidenteDetailSerializer,
    AsignacionBrigadaSerializer,
    AccionAtencionSerializer,
    CierreIncidenteSerializer,
)
from apps.respuesta.models import Brigada


class IncidenteViewSet(viewsets.ModelViewSet):
    """
    Gestión operativa del ciclo de vida de los Incidentes Forestales.
    """
    queryset = Incidente.objects.select_related('distrito', 'comunidad', 'creado_por').prefetch_related(
        'asignaciones_brigadas__brigada',
        'acciones',
        'historial_estados'
    ).all()
    filterset_fields = ['estado', 'prioridad', 'tipo_incendio', 'distrito', 'comunidad']
    search_fields = ['codigo', 'titulo', 'resumen']

    def get_serializer_class(self):
        if self.action == 'list':
            return IncidenteListSerializer
        return IncidenteDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        incidente = serializer.save(creado_por=user)
        # Registrar estado inicial en historial
        HistorialIncidente.objects.create(
            incidente=incidente,
            usuario=user,
            estado_anterior=None,
            estado_nuevo=incidente.estado,
            nota="Creación inicial del incidente"
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def asignar_brigada(self, request, pk=None):
        """
        Asigna una brigada de respuesta a un incidente y cambia su estado a 'ocupada'.
        """
        incidente = self.get_object()
        brigada_id = request.data.get('id_brigada')
        instrucciones = request.data.get('instrucciones', '')

        try:
            brigada = Brigada.objects.get(pk=brigada_id)
        except Brigada.DoesNotExist:
            return Response({"error": "La brigada especificada no existe."}, status=status.HTTP_404_NOT_FOUND)

        asignacion = AsignacionBrigada.objects.create(
            incidente=incidente,
            brigada=brigada,
            asignado_por=request.user,
            instrucciones=instrucciones,
            estado=AsignacionBrigada.EstadoAsignacion.ASIGNADA
        )

        # Actualizar estado de brigada a ocupada
        brigada.estado = Brigada.EstadoBrigada.OCUPADA
        brigada.save(update_fields=['estado'])

        # Si el incidente estaba en nuevo/verificacion, avanza a 'asignado'
        if incidente.estado in [Incidente.EstadoIncidente.NUEVO, Incidente.EstadoIncidente.CONFIRMADO]:
            estado_ant = incidente.estado
            incidente.estado = Incidente.EstadoIncidente.ASIGNADO
            incidente.save(update_fields=['estado'])

            HistorialIncidente.objects.create(
                incidente=incidente,
                usuario=request.user,
                estado_anterior=estado_ant,
                estado_nuevo=incidente.estado,
                nota=f"Brigada '{brigada.nombre}' asignada a la emergencia."
            )

        return Response(
            {
                "mensaje": f"Brigada '{brigada.nombre}' asignada exitosamente al incidente {incidente.codigo}.",
                "asignacion": AsignacionBrigadaSerializer(asignacion).data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def estado(self, request, pk=None):
        """
        Actualiza el estado operativo del incidente y registra en el historial.
        """
        incidente = self.get_object()
        nuevo_estado = request.data.get('estado')
        nota = request.data.get('nota', '')

        if nuevo_estado not in Incidente.EstadoIncidente.values:
            return Response(
                {"error": f"Estado no válido. Opciones: {list(Incidente.EstadoIncidente.values)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        estado_anterior = incidente.estado
        incidente.estado = nuevo_estado

        if nuevo_estado == Incidente.EstadoIncidente.CONFIRMADO and not incidente.confirmado_en:
            incidente.confirmado_en = timezone.now()
        elif nuevo_estado == Incidente.EstadoIncidente.CERRADO and not incidente.cerrado_en:
            incidente.cerrado_en = timezone.now()

        incidente.save()

        # Registrar historial
        HistorialIncidente.objects.create(
            incidente=incidente,
            usuario=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            nota=nota
        )

        return Response(
            {
                "mensaje": f"Estado actualizado de '{estado_anterior}' a '{nuevo_estado}'.",
                "codigo": incidente.codigo,
                "estado_actual": incidente.estado
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cerrar(self, request, pk=None):
        """
        Cierra y liquida un incidente con acta/informe final.
        """
        incidente = self.get_object()
        motivo = request.data.get('motivo')
        evidencia_uri = request.data.get('evidencia_uri')

        if not motivo:
            return Response({"error": "El motivo o informe de cierre es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(incidente, 'cierre'):
            return Response({"error": "El incidente ya cuenta con un registro de cierre."}, status=status.HTTP_400_BAD_REQUEST)

        cierre = CierreIncidente.objects.create(
            incidente=incidente,
            cerrado_por=request.user,
            motivo=motivo,
            evidencia_uri=evidencia_uri
        )

        estado_ant = incidente.estado
        incidente.estado = Incidente.EstadoIncidente.CERRADO
        incidente.cerrado_en = timezone.now()
        incidente.save(update_fields=['estado', 'cerrado_en'])

        # Liberar brigadas asignadas a este incidente
        for asig in incidente.asignaciones_brigadas.filter(estado=AsignacionBrigada.EstadoAsignacion.TRABAJANDO):
            asig.estado = AsignacionBrigada.EstadoAsignacion.FINALIZADA
            asig.finalizada_en = timezone.now()
            asig.save(update_fields=['estado', 'finalizada_en'])
            asig.brigada.estado = Brigada.EstadoBrigada.DISPONIBLE
            asig.brigada.save(update_fields=['estado'])

        HistorialIncidente.objects.create(
            incidente=incidente,
            usuario=request.user,
            estado_anterior=estado_ant,
            estado_nuevo=incidente.estado,
            nota=f"Cierre definitivo del incidente: {motivo}"
        )

        return Response(
            {
                "mensaje": f"Incidente {incidente.codigo} cerrado exitosamente.",
                "cierre": CierreIncidenteSerializer(cierre).data
            },
            status=status.HTTP_200_OK
        )


class AccionAtencionViewSet(viewsets.ModelViewSet):
    """
    Registro de maniobras de campo (ataque directo, zanjas, contrafuegos) por brigadistas.
    """
    queryset = AccionAtencion.objects.select_related('incidente', 'brigada', 'usuario')
    serializer_class = AccionAtencionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['incidente', 'brigada']

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
