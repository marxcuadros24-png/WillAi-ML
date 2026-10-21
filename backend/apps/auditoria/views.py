from rest_framework import viewsets, permissions
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Auditoria
from .serializers import AuditoriaSerializer


@extend_schema_view(
    list=extend_schema(summary="Consultar registros de auditoría forense (Solo Admin)", tags=["Auditoría"]),
    retrieve=extend_schema(summary="Detalle de registro de auditoría", tags=["Auditoría"]),
)
class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Bitácora de auditoría inmutable reservada para operadores de emergencia y administradores.
    """
    queryset = Auditoria.objects.all().select_related('usuario')
    serializer_class = AuditoriaSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['accion', 'entidad', 'id_registro', 'usuario']
    search_fields = ['accion', 'entidad', 'id_registro', 'usuario__username']
