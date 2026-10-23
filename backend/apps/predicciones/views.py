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
        Calcula o actualiza en tiempo real consumiendo Open-Meteo.
        """
        from django.utils import timezone
        refrescar = request.query_params.get('refresco') in ['1', 'true', 'True']
        pred = Prediccion.objects.filter(
            ejecucion__modelo__nombre__icontains="FWI"
        ).order_by('-creada_en').first()

        ahora = timezone.now()
        # Si no existe, si se solicita refresco o si tiene más de 20 minutos de antigüedad:
        if not pred or refrescar or (ahora - pred.creada_en).total_seconds() > 1200:
            from .tasks import calcular_riesgo_fwi_task
            try:
                res = calcular_riesgo_fwi_task()
                if res.get("id_prediccion"):
                    pred = Prediccion.objects.get(id_prediccion=res["id_prediccion"])
            except Exception:
                pass

        if not pred:
            pred = Prediccion.objects.filter(
                ejecucion__modelo__nombre__icontains="FWI"
            ).order_by('-creada_en').first() or Prediccion.objects.order_by('-creada_en').first()

        if not pred:
            return Response({"mensaje": "No hay predicciones registradas."}, status=404)
        return Response(PrediccionSerializer(pred).data)

    @action(detail=False, methods=['get'])
    def viento_12h(self, request):
        """
        Retorna la predicción vectorial de viento y conos de propagación a 12 horas
        generada por el modelo de Machine Learning consumiendo Open-Meteo.
        """
        pred = Prediccion.objects.filter(
            ejecucion__modelo__nombre__icontains="WindProphet"
        ).order_by('-creada_en').first()

        if not pred or not pred.incertidumbre or 'pronostico_12h' not in pred.incertidumbre:
            # Ejecutar inmediatamente si no existe aún
            from .tasks import entrenar_y_predecir_viento_task
            res = entrenar_y_predecir_viento_task()
            if res.get("status") == "ok":
                pred = Prediccion.objects.get(id_prediccion=res["id_prediccion"])
            else:
                return Response({"error": "No se pudo generar la predicción de viento ML."}, status=500)

        data = {
            "id_prediccion": pred.id_prediccion,
            "horizonte_desde": pred.horizonte_desde,
            "horizonte_hasta": pred.horizonte_hasta,
            "nivel_pico": pred.nivel,
            "cono_principal_geojson": pred.geometria_geojson,
            "metricas_entrenamiento": pred.incertidumbre.get("metricas_entrenamiento", {}),
            "pronostico_12h": pred.incertidumbre.get("pronostico_12h", []),
            "coordenadas": pred.incertidumbre.get("coordenadas", {"lat": -15.0189, "lon": -73.7806})
        }
        return Response(data)

    @action(detail=False, methods=['post'])
    def entrenar_viento(self, request):
        """
        Entrena bajo demanda el modelo de Machine Learning con los últimos datos de Open-Meteo
        y recalcula la propagación del viento para las próximas 12 horas.
        """
        from .tasks import entrenar_y_predecir_viento_task
        lat = float(request.data.get('latitud', -15.0189))
        lon = float(request.data.get('longitud', -73.7806))

        res = entrenar_y_predecir_viento_task(lat=lat, lon=lon)
        if res.get("status") == "ok":
            return Response({
                "mensaje": "Modelo ML de viento re-entrenado exitosamente con Open-Meteo.",
                "id_prediccion": res["id_prediccion"],
                "nivel_pico": res["nivel_pico"],
                "metricas": res["metricas"],
                "pronostico_12h": res["pronostico_12h"]
            })
        else:
            return Response({"error": res.get("error", "Error desconocido")}, status=500)


class ModeloPredictivoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Catálogo de algoritmos y modelos predictivos registrados.
    """
    queryset = ModeloPredictivo.objects.all()
    serializer_class = ModeloPredictivoSerializer
    permission_classes = [permissions.AllowAny]
