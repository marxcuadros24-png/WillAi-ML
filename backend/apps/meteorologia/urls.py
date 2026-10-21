from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ObservacionMeteorologicaViewSet, ZonaRiesgoViewSet, ViviendaViewSet

router = DefaultRouter()
router.register(r'observaciones', ObservacionMeteorologicaViewSet, basename='observacion')
router.register(r'zonas-riesgo', ZonaRiesgoViewSet, basename='zona-riesgo')
router.register(r'viviendas', ViviendaViewSet, basename='vivienda')

urlpatterns = [
    path('', include(router.urls)),
]
