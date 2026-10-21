from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ModeloPredictivo, EjecucionModelo, Prediccion
from .serializers import (
    ModeloPredictivoSerializer,
    EjecucionModeloSerializer,
    PrediccionSerializer,
)


class PrediccionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consulta de predicciones de peligro de incendio (Índice FWI) para la App Móvil y Web.
    """
    queryset = Prediccion.objects.select_related('ejecucion__modelo').all()
    serializer_class = PrediccionSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['nivel']

    @action(detail=False, methods=['get'])
    def actual(self, request):
        """
        Retorna la predicción de riesgo FWI más reciente para Coracora.
        """
        pred = Prediccion.objects.first()
        if not pred:
            return Response({"mensaje": "No hay predicciones registradas."}, status=404)
        return Response(PrediccionSerializer(pred).data)


class ModeloPredictivoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de algoritmos y modelos predictivos registrados.
    """
    queryset = ModeloPredictivo.objects.all()
    serializer_class = ModeloPredictivoSerializer
    permission_classes = [permissions.AllowAny]
