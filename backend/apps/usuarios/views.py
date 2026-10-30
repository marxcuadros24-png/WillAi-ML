from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
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
        token, _ = Token.objects.get_or_create(user=user)
        detalle = UsuarioDetalleSerializer(user)
        return Response(
            {
                "mensaje": "Usuario registrado exitosamente con rol de poblador.",
                "token": token.key,
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


class LoginTokenView(generics.GenericAPIView):
    """
    Inicio de sesión para App Móvil retornando Token de autenticación DRF.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {"error": "Debe proporcionar usuario y contraseña."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {"error": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.estado != 'activo':
            return Response(
                {"error": "La cuenta se encuentra inactiva o suspendida."},
                status=status.HTTP_403_FORBIDDEN
            )

        token, _ = Token.objects.get_or_create(user=user)
        detalle = UsuarioDetalleSerializer(user)

        return Response({
            "token": token.key,
            "usuario": detalle.data
        }, status=status.HTTP_200_OK)
