from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Donante, OfertaDonacion, ItemOfertaDonacion, AsignacionDonacion, HistorialOfertaDonacion
from .serializers import (
    DonanteSerializer,
    OfertaDonacionSerializer,
    ItemOfertaDonacionSerializer,
    AsignacionDonacionSerializer
)


@extend_schema_view(
    list=extend_schema(summary="Listar perfiles de donantes", tags=["Donaciones"]),
    create=extend_schema(summary="Registrar perfil de donante", tags=["Donaciones"]),
)
class DonanteViewSet(viewsets.ModelViewSet):
    queryset = Donante.objects.filter(estado='activo')
    serializer_class = DonanteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


@extend_schema_view(
    list=extend_schema(summary="Listar ofertas de donación", tags=["Donaciones"]),
    create=extend_schema(summary="Crear oferta comunitaria de donación", tags=["Donaciones"]),
)
class OfertaDonacionViewSet(viewsets.ModelViewSet):
    queryset = OfertaDonacion.objects.all().select_related('donante', 'distrito').prefetch_related('items', 'historial')
    serializer_class = OfertaDonacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        # Usuarios no-staff ven ofertas publicadas y sus propias ofertas
        return self.queryset.filter(
            models.Q(estado='publicada') | models.Q(donante__usuario=user)
        )

    @action(detail=True, methods=['post'], url_path='moderar')
    def moderar(self, request, pk=None):
        """
        Operador/Admin aprueba o rechaza una oferta de donación.
        Body: { "accion": "aprobar" | "rechazar", "motivo_rechazo": "opcional", "comentario": "opcional" }
        """
        if not request.user.is_staff:
            return Response({"error": "No tiene permisos para moderar donaciones."}, status=status.HTTP_403_FORBIDDEN)

        oferta = self.get_object()
        accion = request.data.get('accion')
        comentario = request.data.get('comentario', '')
        motivo = request.data.get('motivo_rechazo', '')

        estado_anterior = oferta.estado

        if accion == 'aprobar':
            oferta.estado = 'publicada'
            oferta.publicada_en = timezone.now()
            oferta.revisada_por = request.user
            oferta.revisada_en = timezone.now()
            oferta.save()
        elif accion == 'rechazar':
            oferta.estado = 'rechazada'
            oferta.motivo_rechazo = motivo
            oferta.revisada_por = request.user
            oferta.revisada_en = timezone.now()
            oferta.save()
        else:
            return Response({"error": "Acción inválida. Use 'aprobar' o 'rechazar'."}, status=status.HTTP_400_BAD_REQUEST)

        HistorialOfertaDonacion.objects.create(
            oferta=oferta,
            usuario=request.user,
            estado_anterior=estado_anterior,
            estado_nuevo=oferta.estado,
            comentario=comentario or f"Oferta {oferta.estado} por moderación."
        )

        return Response(OfertaDonacionSerializer(oferta).data)


@extend_schema_view(
    list=extend_schema(summary="Listar ítems ofrecidos en donación", tags=["Donaciones"]),
    create=extend_schema(summary="Agregar ítem a oferta", tags=["Donaciones"]),
)
class ItemOfertaDonacionViewSet(viewsets.ModelViewSet):
    queryset = ItemOfertaDonacion.objects.all().select_related('oferta')
    serializer_class = ItemOfertaDonacionSerializer
    permission_classes = [permissions.IsAuthenticated]


@extend_schema_view(
    list=extend_schema(summary="Listar asignaciones de donaciones a brigadas/incidentes", tags=["Donaciones"]),
    create=extend_schema(summary="Asignar donación a brigada, entidad o incidente activo", tags=["Donaciones"]),
)
class AsignacionDonacionViewSet(viewsets.ModelViewSet):
    queryset = AsignacionDonacion.objects.all().select_related('item_donacion', 'incidente', 'brigada', 'entidad')
    serializer_class = AsignacionDonacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def perform_create(self, serializer):
        item = serializer.validated_data['item_donacion']
        cantidad = serializer.validated_data['cantidad_asignada']

        if item.cantidad_disponible < cantidad:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                f"Stock insuficiente. Disponible: {item.cantidad_disponible} {item.unidad}, solicitada: {cantidad}"
            )

        # Descontar stock disponible
        item.cantidad_disponible -= cantidad
        item.save()

        # Actualizar estado de la oferta si el stock se agotó
        oferta = item.oferta
        total_disp = sum(i.cantidad_disponible for i in oferta.items.all())
        if total_disp == 0:
            oferta.estado = 'reservada'
            oferta.save()
        elif total_disp < sum(i.cantidad_ofrecida for i in oferta.items.all()):
            oferta.estado = 'reservada_parcial'
            oferta.save()

        serializer.save(solicitada_por=self.request.user)
