from rest_framework import serializers
from .models import ObservacionMeteorologica, ZonaRiesgo, Vivienda, ResidenteVivienda, EvaluacionExposicion


class ObservacionMeteorologicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ObservacionMeteorologica
        fields = [
            'id_observacion',
            'proveedor',
            'id_externo',
            'latitud',
            'longitud',
            'observada_en',
            'temperatura_c',
            'humedad_relativa_pct',
            'viento_kmh',
            'direccion_viento_grados',
            'precipitacion_mm',
            'creada_en',
        ]


class ZonaRiesgoSerializer(serializers.ModelSerializer):
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    origen_display = serializers.CharField(source='get_origen_display', read_only=True)

    class Meta:
        model = ZonaRiesgo
        fields = [
            'id_zona_riesgo',
            'incidente',
            'nombre',
            'origen',
            'origen_display',
            'nivel',
            'nivel_display',
            'geometria_geojson',
            'metodo',
            'valida_desde',
            'valida_hasta',
            'creada_en',
        ]


class ViviendaSerializer(serializers.ModelSerializer):
    comunidad_nombre = serializers.ReadOnlyField(source='comunidad.nombre')

    class Meta:
        model = Vivienda
        fields = [
            'id_vivienda',
            'uuid',
            'comunidad',
            'comunidad_nombre',
            'referencia',
            'latitud',
            'longitud',
            'precision_metros',
            'verificada',
            'activa',
            'creado_en',
        ]
        read_only_fields = ['id_vivienda', 'uuid', 'verificada', 'creado_en']


class EvaluacionExposicionSerializer(serializers.ModelSerializer):
    nivel_riesgo_display = serializers.CharField(source='get_nivel_riesgo_display', read_only=True)

    class Meta:
        model = EvaluacionExposicion
        fields = [
            'id_evaluacion',
            'vivienda',
            'incidente',
            'zona_riesgo',
            'nivel_riesgo',
            'nivel_riesgo_display',
            'distancia_metros',
            'evaluada_en',
        ]
