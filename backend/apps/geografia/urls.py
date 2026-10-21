from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DistritoViewSet, ComunidadViewSet

router = DefaultRouter()
router.register(r'distritos', DistritoViewSet, basename='distrito')
router.register(r'comunidades', ComunidadViewSet, basename='comunidad')

urlpatterns = [
    path('', include(router.urls)),
]
