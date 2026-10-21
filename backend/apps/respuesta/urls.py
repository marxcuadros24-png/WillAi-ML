from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EntidadViewSet, BrigadaViewSet, RecursoEmergenciaViewSet

router = DefaultRouter()
router.register(r'entidades', EntidadViewSet, basename='entidad')
router.register(r'brigadas', BrigadaViewSet, basename='brigada')
router.register(r'recursos', RecursoEmergenciaViewSet, basename='recurso')

urlpatterns = [
    path('', include(router.urls)),
]
