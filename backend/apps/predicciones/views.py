import json
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.geos import Point
from .models import (
    ModeloPredictivo,
    EjecucionModelo,
    Prediccion,
    SimulacionPropagacion,
    ResultadoPropagacion,
)
from .serializers import (
    ModeloPredictivoSerializer,
    EjecucionModeloSerializer,
    PrediccionSerializer,
    SimulacionPropagacionSerializer,
    ResultadoPropagacionSerializer,
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

    @action(detail=False, methods=['get'])
    def riesgo_ocurrencia(self, request):
        """
        Retorna la grilla GeoJSON de probabilidad calibrada y nivel de riesgo
        de ocurrencia de incendios forestales para Parinacochas / Coracora,
        evaluada por el modelo Random Forest entrenado con NASA FIRMS y Open-Meteo.
        """
        from .ml_ocurrencia import generar_grilla_riesgo_ocurrencia
        try:
            grilla = generar_grilla_riesgo_ocurrencia()
            return Response(grilla)
        except Exception as e:
            return Response({"error": f"Error al generar grilla de riesgo: {str(e)}"}, status=500)

    @action(detail=False, methods=['post'])
    def entrenar_ocurrencia(self, request):
        """
        Dispara el re-entrenamiento del modelo de Machine Learning de riesgo de ocurrencia
        utilizando las detecciones satelitales de NASA FIRMS, meteorología de Open-Meteo
        y validación temporal estricta.
        """
        from .tasks import entrenar_y_generar_ocurrencia_task
        test_ratio = float(request.data.get('test_ratio', 0.30))
        res = entrenar_y_generar_ocurrencia_task(test_ratio=test_ratio)
        if res.get("status") == "ok":
            return Response({
                "mensaje": "Modelo ML de ocurrencia re-entrenado exitosamente.",
                "id_prediccion": res["id_prediccion"],
                "nivel_pico": res["nivel_pico"],
                "probabilidad_max": res["probabilidad_max"],
                "metricas": res["metricas"],
                "total_celdas": res["total_celdas"]
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


class SimulacionPropagacionViewSet(viewsets.ModelViewSet):
    """
    Simulaciones de propagación de incendios forestales estilo Cell2Fire (modelo elíptico andino).
    Permite solicitar nuevas simulaciones y consultar las isócronas 1h, 3h, 6h en GeoJSON.
    """
    queryset = SimulacionPropagacion.objects.select_related('modelo_motor', 'incidente').prefetch_related('resultados').all()
    serializer_class = SimulacionPropagacionSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data
        lat = float(data.get('latitud', -15.0189))
        lon = float(data.get('longitud', -73.7806))
        horizonte_horas = int(data.get('horizonte_horas', 6))

        # Modelo de propagación (CA_ELIPTICO_ANDINO_V1)
        modelo_id = data.get('modelo_motor_id') or data.get('modelo_motor')
        if modelo_id:
            try:
                modelo_motor = ModeloPredictivo.objects.get(id_modelo=modelo_id)
            except ModeloPredictivo.DoesNotExist:
                modelo_motor = None
        else:
            modelo_motor = None

        if not modelo_motor:
            modelo_motor, _ = ModeloPredictivo.objects.get_or_create(
                nombre="CA_ELIPTICO_ANDINO_V1",
                version="1.0.0",
                defaults={
                    "algoritmo": "Cellular Automata Eliptico Andino con Corrección FWI y DEM",
                    "descripcion": "Propagación celular elíptica en UTM 18S con balance Rothermel, viento vectorial y aceleración por pendiente andina.",
                    "estado": ModeloPredictivo.EstadoModelo.VALIDADO,
                    "metricas_validacion": {"resolucion": "30m", "zona": "Parinacochas"}
                }
            )

        incidente_id = data.get('incidente')
        parametros = data.get('parametros_entrada', {})
        for param_key in ['viento_kmh', 'dir_viento_grados', 'ffmc', 'dem_path', 'ruta_dem', 'grid_size']:
            if param_key in data and param_key not in parametros:
                parametros[param_key] = data[param_key]

        punto = Point(lon, lat, srid=4326)

        simulacion = SimulacionPropagacion.objects.create(
            incidente_id=incidente_id,
            modelo_motor=modelo_motor,
            punto_ignicion=punto,
            horizonte_horas=horizonte_horas,
            estado=SimulacionPropagacion.EstadoSimulacion.PENDIENTE,
            parametros_entrada=parametros,
            requiere_revision_humana=True,
            nivel_incertidumbre="ALTA_SIN_CALIBRAR_DNBR",
        )

        # Disparar tarea asíncrona de Celery
        from .tasks import ejecutar_simulacion_propagacion_task
        ejecutar_simulacion_propagacion_task.delay(simulacion.id_simulacion)

        # Refrescar desde BD
        simulacion.refresh_from_db()
        serializer = self.get_serializer(simulacion)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'])
    def geojson(self, request, pk=None):
        """
        Retorna las isócronas de propagación (1h, 3h, 6h) como un FeatureCollection GeoJSON
        listo para ser renderizado en capas Leaflet en el Centro de Mando Web.
        """
        simulacion = self.get_object()
        resultados = simulacion.resultados.all().order_by('hora_paso')

        colores = {
            1: "#FBBF24",  # Amarillo 1h
            3: "#F97316",  # Naranja 3h
            6: "#EF4444",  # Rojo 6h
        }

        features = []
        for r in resultados:
            if not r.perimetro:
                continue
            geom_json = json.loads(r.perimetro.geojson)
            color = colores.get(r.hora_paso, "#B91C1C")
            features.append({
                "type": "Feature",
                "id": r.id_resultado,
                "geometry": geom_json,
                "properties": {
                    "hora_paso": r.hora_paso,
                    "area_hectareas": r.area_hectareas,
                    "etiqueta": f"Isócrona +{r.hora_paso}h ({r.area_hectareas:.1f} ha)",
                    "velocidad_max_m_min": r.metadatos.get("velocidad_maxima_m_min"),
                    "celdas_quemadas": r.metadatos.get("celdas_quemadas"),
                    "color": color,
                    "fillColor": color,
                    "fillOpacity": 0.35,
                    "weight": 2,
                }
            })

        fc = {
            "type": "FeatureCollection",
            "simulacion_id": simulacion.id_simulacion,
            "estado": simulacion.estado,
            "punto_ignicion": json.loads(simulacion.punto_ignicion.geojson) if simulacion.punto_ignicion else None,
            "requiere_revision_humana": simulacion.requiere_revision_humana,
            "features": features
        }
        return Response(fc)

