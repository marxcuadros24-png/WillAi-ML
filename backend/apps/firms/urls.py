from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeteccionSatelitalViewSet, LoteImportacionFirmsViewSet, FuenteSatelitalViewSet

router = DefaultRouter()
router.register(r'detecciones', DeteccionSatelitalViewSet, basename='deteccion')
router.register(r'lotes', LoteImportacionFirmsViewSet, basename='lote')
router.register(r'fuentes', FuenteSatelitalViewSet, basename='fuente')

urlpatterns = [
    path('', include(router.urls)),
]
