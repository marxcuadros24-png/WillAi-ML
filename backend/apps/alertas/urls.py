from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertaEmergenciaViewSet, PreferenciaNotificacionViewSet

router = DefaultRouter()
router.register(r'alertas', AlertaEmergenciaViewSet, basename='alerta')
router.register(r'preferencias', PreferenciaNotificacionViewSet, basename='preferencia')

urlpatterns = [
    path('', include(router.urls)),
]
