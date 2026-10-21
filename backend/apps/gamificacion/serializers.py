from rest_framework import serializers
from .models import Insignia, ActividadUsuario, UsuarioInsignia


class InsigniaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insignia
        fields = ['id_insignia', 'codigo', 'nombre', 'descripcion', 'icono_url', 'criterio', 'activa', 'creada_en']


class ActividadUsuarioSerializer(serializers.ModelSerializer):
    validador_nombre = serializers.ReadOnlyField(source='validada_por.nombre_completo')

    class Meta:
        model = ActividadUsuario
        fields = [
            'id_actividad',
            'uuid',
            'usuario',
            'tipo_actividad',
            'referencia_tipo',
            'referencia_id',
            'estado',
            'evidencia_referencia',
            'ocurrida_en',
            'validada_por',
            'validador_nombre',
            'validada_en',
            'creada_en'
        ]
        read_only_fields = ['id_actividad', 'uuid', 'estado', 'validada_por', 'validada_en', 'creada_en']


class UsuarioInsigniaSerializer(serializers.ModelSerializer):
    insignia = InsigniaSerializer(read_only=True)
    otorgada_por_nombre = serializers.ReadOnlyField(source='otorgada_por.nombre_completo')

    class Meta:
        model = UsuarioInsignia
        fields = ['insignia', 'actividad_desbloqueo', 'desbloqueada_en', 'otorgada_por', 'otorgada_por_nombre']
