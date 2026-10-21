from rest_framework import viewsets, permissions
from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital
from .serializers import (
    FuenteSatelitalSerializer,
    LoteImportacionFirmsSerializer,
    DeteccionSatelitalSerializer,
)


class DeteccionSatelitalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consulta de puntos de calor satelitales (NASA FIRMS & SERFOR) para visualización en mapa móvil y web.
    """
    queryset = DeteccionSatelital.objects.select_related('fuente').all()
    serializer_class = DeteccionSatelitalSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['fuente__codigo_producto', 'fuente__proveedor', 'confianza', 'dia_noche']
    search_fields = ['clave_deteccion', 'codigo_satelite']


class LoteImportacionFirmsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Monitoreo de tareas de importación satelital.
    """
    queryset = LoteImportacionFirms.objects.select_related('fuente').all()
    serializer_class = LoteImportacionFirmsSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['estado', 'fuente']


class FuenteSatelitalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de sensores satelitales configurados.
    """
    queryset = FuenteSatelital.objects.filter(activa=True)
    serializer_class = FuenteSatelitalSerializer
    permission_classes = [permissions.AllowAny]
