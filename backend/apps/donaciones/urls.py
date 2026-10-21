from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonanteViewSet, OfertaDonacionViewSet, ItemOfertaDonacionViewSet, AsignacionDonacionViewSet

router = DefaultRouter()
router.register(r'donantes', DonanteViewSet, basename='donante')
router.register(r'ofertas', OfertaDonacionViewSet, basename='oferta')
router.register(r'items', ItemOfertaDonacionViewSet, basename='item-donacion')
router.register(r'asignaciones', AsignacionDonacionViewSet, basename='asignacion-donacion')

urlpatterns = [
    path('', include(router.urls)),
]
