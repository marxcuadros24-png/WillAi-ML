from rest_framework import serializers
from .models import Auditoria


class AuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')
    usuario_username = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = Auditoria
        fields = [
            'id_auditoria',
            'usuario',
            'usuario_username',
            'usuario_nombre',
            'accion',
            'entidad',
            'id_registro',
            'ip_hash',
            'detalles',
            'ocurrido_en'
        ]
        read_only_fields = fields
