from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncidenteViewSet, AccionAtencionViewSet

router = DefaultRouter()
router.register(r'incidentes', IncidenteViewSet, basename='incidente')
router.register(r'acciones', AccionAtencionViewSet, basename='accion')

urlpatterns = [
    path('', include(router.urls)),
]
