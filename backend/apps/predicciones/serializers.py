from rest_framework import serializers
from .models import ModeloPredictivo, EjecucionModelo, Prediccion


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
