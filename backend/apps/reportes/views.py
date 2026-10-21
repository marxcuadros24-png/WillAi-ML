from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Reporte, Evidencia, Sincronizacion, ValidacionReporte
from .serializers import (
    ReporteSerializer,
    CrearReporteSerializer,
    EvidenciaSerializer,
    ValidacionReporteSerializer,
    SincronizacionItemSerializer,
)


class ReporteViewSet(viewsets.ModelViewSet):
    """
    CRUD y flujo operativo de Reportes Ciudadanos de Incendios.
    """
    queryset = Reporte.objects.select_related('usuario', 'comunidad').prefetch_related('evidencias', 'validaciones').all()
    filterset_fields = ['estado', 'tipo_incendio', 'origen', 'comunidad']
    search_fields = ['descripcion', 'usuario__nombre_visible']

    def get_serializer_class(self):
        if self.action == 'create':
            return CrearReporteSerializer
        return ReporteSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def validar(self, request, pk=None):
        """
        Endpoint para verificadores: valida, observa o rechaza un reporte.
        """
        reporte = self.get_object()
        resultado = request.data.get('resultado')
        comentario = request.data.get('comentario', '')

        if resultado not in [
            ValidacionReporte.ResultadoValidacion.VALIDADO,
            ValidacionReporte.ResultadoValidacion.OBSERVADO,
            ValidacionReporte.ResultadoValidacion.RECHAZADO
        ]:
            return Response(
                {"error": "El resultado debe ser 'validado', 'observado' o 'rechazado'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Registrar la validación
        validacion = ValidacionReporte.objects.create(
            reporte=reporte,
            revisor=request.user,
            resultado=resultado,
            comentario=comentario
        )

        # Actualizar estado del reporte
        if resultado == ValidacionReporte.ResultadoValidacion.VALIDADO:
            reporte.estado = Reporte.EstadoReporte.VALIDADO
        elif resultado == ValidacionReporte.ResultadoValidacion.OBSERVADO:
            reporte.estado = Reporte.EstadoReporte.OBSERVADO
        elif resultado == ValidacionReporte.ResultadoValidacion.RECHAZADO:
            reporte.estado = Reporte.EstadoReporte.RECHAZADO
        reporte.save(update_fields=['estado'])

        return Response(
            {
                "mensaje": f"Reporte #{reporte.id_reporte} marcado como {resultado}.",
                "validacion": ValidacionReporteSerializer(validacion).data,
                "reporte_estado": reporte.estado,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def sync_offline(self, request):
        """
        Sincronización en lote para reportes guardados en la App Móvil sin conexión.
        """
        items = request.data if isinstance(request.data, list) else [request.data]
        resultados = []

        for item in items:
            uuid_disp = item.get('uuid_dispositivo')
            uuid_reg = item.get('uuid_registro_cliente')
            tipo_reg = item.get('tipo_registro', 'reporte')
            datos = item.get('datos', {})

            if not uuid_disp or not uuid_reg:
                continue

            sync_obj, created = Sincronizacion.objects.get_or_create(
                usuario=request.user,
                uuid_dispositivo=uuid_disp,
                uuid_registro_cliente=uuid_reg,
                defaults={'tipo_registro': tipo_reg, 'estado': Sincronizacion.EstadoSync.PROCESANDO}
            )

            try:
                if tipo_reg == 'reporte':
                    serializer = CrearReporteSerializer(data=datos, context={'request': request})
                    serializer.is_valid(raise_exception=True)
                    rep = serializer.save(
                        origen=Reporte.OrigenReporte.OFFLINE_SINCRONIZADO,
                        sincronizado_en=timezone.now()
                    )
                    sync_obj.estado = Sincronizacion.EstadoSync.SINCRONIZADO
                    sync_obj.procesado_en = timezone.now()
                    sync_obj.save()

                    resultados.append({
                        "uuid_registro_cliente": uuid_reg,
                        "estado": "sincronizado",
                        "id_reporte": rep.id_reporte,
                        "uuid_servidor": str(rep.uuid),
                    })
            except Exception as e:
                sync_obj.estado = Sincronizacion.EstadoSync.ERROR
                sync_obj.error_detalle = str(e)
                sync_obj.save()
                resultados.append({
                    "uuid_registro_cliente": uuid_reg,
                    "estado": "error",
                    "detalle": str(e)
                })

        return Response({"sincronizados": resultados}, status=status.HTTP_200_OK)


class EvidenciaViewSet(viewsets.ModelViewSet):
    """
    Subida y consulta de evidencias fotográficas de incendios.
    """
    queryset = Evidencia.objects.select_related('reporte')
    serializer_class = EvidenciaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['reporte', 'tipo']
