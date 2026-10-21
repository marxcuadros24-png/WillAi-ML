from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import Rol, Permiso
from .serializers import (
    UsuarioPublicoSerializer,
    UsuarioDetalleSerializer,
    RegistroCiudadanoSerializer,
    RolSerializer,
    PermisoSerializer,
)

User = get_user_model()


class UsuarioViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Gestión y consulta de usuarios.
    """
    queryset = User.objects.prefetch_related('roles').filter(estado='activo')
    serializer_class = UsuarioPublicoSerializer
    lookup_field = 'uuid'

    def get_permissions(self):
        if self.action in ['me']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Retorna o actualiza el perfil del usuario autenticado.
        """
        user = request.user
        if request.method == 'PATCH':
            serializer = UsuarioDetalleSerializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = UsuarioDetalleSerializer(user)
        return Response(serializer.data)


class RegistroCiudadanoView(generics.CreateAPIView):
    """
    Registro público de nuevos pobladores / ciudadanos desde la App Móvil.
    """
    queryset = User.objects.all()
    serializer_class = RegistroCiudadanoSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        detalle = UsuarioDetalleSerializer(user)
        return Response(
            {
                "mensaje": "Usuario registrado exitosamente con rol de poblador.",
                "usuario": detalle.data
            },
            status=status.HTTP_201_CREATED
        )


class RolViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de roles del sistema.
    """
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [permissions.AllowAny]


class PermisoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de permisos disponibles.
    """
    queryset = Permiso.objects.all()
    serializer_class = PermisoSerializer
    permission_classes = [permissions.IsAdminUser]
