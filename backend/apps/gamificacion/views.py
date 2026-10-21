from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Insignia, ActividadUsuario, UsuarioInsignia
from .serializers import InsigniaSerializer, ActividadUsuarioSerializer, UsuarioInsigniaSerializer


@extend_schema_view(
    list=extend_schema(summary="Catálogo de insignias comunitarias", tags=["Gamificación"]),
    retrieve=extend_schema(summary="Detalle de insignia comunitaria", tags=["Gamificación"]),
)
class InsigniaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Insignia.objects.filter(activa=True)
    serializer_class = InsigniaSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema_view(
    list=extend_schema(summary="Listado de actividades comunales", tags=["Gamificación"]),
    create=extend_schema(summary="Registrar actividad preventiva o de apoyo comunal", tags=["Gamificación"]),
)
class ActividadUsuarioViewSet(viewsets.ModelViewSet):
    queryset = ActividadUsuario.objects.all().select_related('usuario', 'validada_por')
    serializer_class = ActividadUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(usuario=user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['get'], url_path='mis-insignias')
    def mis_insignias(self, request):
        """Retorna las insignias desbloqueadas por el usuario actual"""
        insignias_usuario = UsuarioInsignia.objects.filter(
            usuario=request.user
        ).select_related('insignia', 'otorgada_por')
        serializer = UsuarioInsigniaSerializer(insignias_usuario, many=True)
        return Response(serializer.data)
