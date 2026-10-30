from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UsuarioViewSet,
    RolViewSet,
    PermisoViewSet,
    RegistroCiudadanoView,
    LoginTokenView,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'permisos', PermisoViewSet, basename='permiso')

urlpatterns = [
    path('login/', LoginTokenView.as_view(), name='login-token'),
    path('registro/', RegistroCiudadanoView.as_view(), name='registro-ciudadano'),
    path('', include(router.urls)),
]
