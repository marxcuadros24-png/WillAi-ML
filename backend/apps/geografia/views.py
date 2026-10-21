from rest_framework import viewsets, permissions
from .models import Distrito, Comunidad
from .serializers import DistritoSerializer, ComunidadSerializer


class DistritoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint para consultar distritos y sus límites geográficos.
    """
    queryset = Distrito.objects.prefetch_related('comunidades').all()
    serializer_class = DistritoSerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ['nombre', 'ubigeo']


class ComunidadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint para consultar comunidades campesinas, anexos y sectores.
    """
    queryset = Comunidad.objects.select_related('distrito').filter(activa=True)
    serializer_class = ComunidadSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['distrito', 'tipo']
    search_fields = ['nombre']
