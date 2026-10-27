import json
from rest_framework import serializers
from .models import (
    ModeloPredictivo,
    EjecucionModelo,
    Prediccion,
    SimulacionPropagacion,
    ResultadoPropagacion,
)
from django.contrib.gis.geos import Point


class ModeloPredictivoSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = ModeloPredictivo
        fields = [
            'id_modelo',
            'nombre',
            'version',
            'algoritmo',
            'descripcion',
            'estado',
            'estado_display',
            'metricas_validacion',
            'creado_en',
        ]


class EjecucionModeloSerializer(serializers.ModelSerializer):
    modelo_nombre = serializers.ReadOnlyField(source='modelo.nombre')
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = EjecucionModelo
        fields = [
            'id_ejecucion',
            'modelo',
            'modelo_nombre',
            'incidente',
            'estado',
            'estado_display',
            'iniciado_en',
            'finalizado_en',
            'parametros',
            'resumen_error',
        ]


class PrediccionSerializer(serializers.ModelSerializer):
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)

    class Meta:
        model = Prediccion
        fields = [
            'id_prediccion',
            'ejecucion',
            'geometria_geojson',
            'horizonte_desde',
            'horizonte_hasta',
            'probabilidad',
            'nivel',
            'nivel_display',
            'incertidumbre',
            'creada_en',
        ]


class ResultadoPropagacionSerializer(serializers.ModelSerializer):
    perimetro_geojson = serializers.SerializerMethodField()

    class Meta:
        model = ResultadoPropagacion
        fields = [
            'id_resultado',
            'simulacion',
            'hora_paso',
            'area_hectareas',
            'metadatos',
            'perimetro_geojson',
            'creado_en',
        ]

    def get_perimetro_geojson(self, obj):
        if obj.perimetro:
            try:
                return json.loads(obj.perimetro.geojson)
            except Exception:
                return None
        return None


class SimulacionPropagacionSerializer(serializers.ModelSerializer):
    modelo_nombre = serializers.ReadOnlyField(source='modelo_motor.nombre')
    punto_ignicion_geojson = serializers.SerializerMethodField()
    resultados = ResultadoPropagacionSerializer(many=True, read_only=True)

    class Meta:
        model = SimulacionPropagacion
        fields = [
            'id_simulacion',
            'incidente',
            'modelo_motor',
            'modelo_nombre',
            'punto_ignicion',
            'punto_ignicion_geojson',
            'horizonte_horas',
            'estado',
            'parametros_entrada',
            'requiere_revision_humana',
            'nivel_incertidumbre',
            'errores',
            'iniciado_en',
            'finalizado_en',
            'creado_en',
            'resultados',
        ]
        read_only_fields = [
            'id_simulacion',
            'estado',
            'iniciado_en',
            'finalizado_en',
            'creado_en',
            'errores',
        ]

    def get_punto_ignicion_geojson(self, obj):
        if obj.punto_ignicion:
            try:
                return json.loads(obj.punto_ignicion.geojson)
            except Exception:
                return {"type": "Point", "coordinates": [float(obj.punto_ignicion.x), float(obj.punto_ignicion.y)]}
        return None

