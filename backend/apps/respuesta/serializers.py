from rest_framework import serializers
from .models import Entidad, Brigada, Brigadista, RecursoEmergencia


class EntidadSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    distrito_nombre = serializers.ReadOnlyField(source='distrito.nombre')

    class Meta:
        model = Entidad
        fields = [
            'id_entidad',
            'nombre',
            'tipo',
            'tipo_display',
            'sigla',
            'telefono_operativo',
            'correo_operativo',
            'distrito',
            'distrito_nombre',
            'activa',
        ]


class BrigadistaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField(source='usuario.get_full_name')
    username = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Brigadista
        fields = [
            'id',
            'brigada',
            'usuario',
            'username',
            'nombre_completo',
            'funcion',
            'desde',
            'hasta',
            'activo',
        ]


class RecursoEmergenciaSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = RecursoEmergencia
        fields = [
            'id_recurso',
            'nombre',
            'categoria',
            'categoria_display',
            'cantidad',
            'estado',
            'estado_display',
            'entidad',
            'brigada',
            'latitud',
            'longitud',
            'actualizado_en',
        ]


class BrigadaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    entidad_nombre = serializers.ReadOnlyField(source='entidad.nombre')
    comunidad_nombre = serializers.ReadOnlyField(source='comunidad.nombre')
    cantidad_integrantes = serializers.SerializerMethodField()

    class Meta:
        model = Brigada
        fields = [
            'id_brigada',
            'nombre',
            'tipo',
            'tipo_display',
            'estado',
            'estado_display',
            'entidad',
            'entidad_nombre',
            'comunidad',
            'comunidad_nombre',
            'telefono_contacto',
            'latitud_base',
            'longitud_base',
            'cantidad_integrantes',
            'creada_en',
        ]

    def get_cantidad_integrantes(self, obj):
        return obj.integrantes.filter(activo=True).count()
