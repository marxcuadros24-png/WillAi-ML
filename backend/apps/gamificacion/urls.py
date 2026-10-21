from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InsigniaViewSet, ActividadUsuarioViewSet

router = DefaultRouter()
router.register(r'insignias', InsigniaViewSet, basename='insignia')
router.register(r'actividades', ActividadUsuarioViewSet, basename='actividad')

urlpatterns = [
    path('', include(router.urls)),
]
