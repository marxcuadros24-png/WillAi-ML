from rest_framework import serializers
from .models import Distrito, Comunidad


class ComunidadSerializer(serializers.ModelSerializer):
    distrito_nombre = serializers.ReadOnlyField(source='distrito.nombre')
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Comunidad
        fields = [
            'id_comunidad',
            'distrito',
            'distrito_nombre',
            'nombre',
            'tipo',
            'tipo_display',
            'latitud',
            'longitud',
            'limite_geojson',
            'activa',
            'creado_en',
        ]


class DistritoSerializer(serializers.ModelSerializer):
    comunidades = ComunidadSerializer(many=True, read_only=True)

    class Meta:
        model = Distrito
        fields = [
            'id_distrito',
            'ubigeo',
            'nombre',
            'provincia',
            'departamento',
            'latitud_centro',
            'longitud_centro',
            'limite_geojson',
            'comunidades',
            'creado_en',
        ]
