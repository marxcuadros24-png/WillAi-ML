from rest_framework import viewsets, permissions
from .models import Entidad, Brigada, Brigadista, RecursoEmergencia
from .serializers import EntidadSerializer, BrigadaSerializer, BrigadistaSerializer, RecursoEmergenciaSerializer


class EntidadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Directorio de entidades de primera respuesta y gestión de riesgos.
    """
    queryset = Entidad.objects.filter(activa=True).select_related('distrito')
    serializer_class = EntidadSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['tipo', 'distrito']
    search_fields = ['nombre', 'sigla']


class BrigadaViewSet(viewsets.ModelViewSet):
    """
    Gestión y consulta de brigadas forestales y comunales.
    """
    queryset = Brigada.objects.select_related('entidad', 'comunidad').prefetch_related('integrantes')
    serializer_class = BrigadaSerializer
    filterset_fields = ['tipo', 'estado', 'entidad', 'comunidad']
    search_fields = ['nombre']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class RecursoEmergenciaViewSet(viewsets.ModelViewSet):
    """
    Inventario de recursos de emergencia (vehículos, EPP, herramientas).
    """
    queryset = RecursoEmergencia.objects.select_related('entidad', 'brigada')
    serializer_class = RecursoEmergenciaSerializer
    filterset_fields = ['categoria', 'estado', 'entidad', 'brigada']
    search_fields = ['nombre']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]
