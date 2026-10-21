from rest_framework import serializers
from .models import AlertaEmergencia, PreferenciaNotificacion, DestinatarioAlerta


class PreferenciaNotificacionSerializer(serializers.ModelSerializer):
    canal_display = serializers.CharField(source='get_canal_display', read_only=True)

    class Meta:
        model = PreferenciaNotificacion
        fields = [
            'canal',
            'canal_display',
            'habilitado',
            'destino_verificado',
            'destino',
            'actualizado_en',
        ]


class AlertaEmergenciaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    incidente_codigo = serializers.ReadOnlyField(source='incidente.codigo')

    class Meta:
        model = AlertaEmergencia
        fields = [
            'id_alerta',
            'uuid',
            'incidente',
            'incidente_codigo',
            'tipo',
            'tipo_display',
            'prioridad',
            'prioridad_display',
            'titulo',
            'mensaje',
            'instrucciones',
            'estado',
            'estado_display',
            'emitida_en',
            'expira_en',
            'creada_en',
        ]
        read_only_fields = ['id_alerta', 'uuid', 'creada_en']


class DestinatarioAlertaSerializer(serializers.ModelSerializer):
    alerta = AlertaEmergenciaSerializer(read_only=True)
    canal_display = serializers.CharField(source='get_canal_display', read_only=True)
    estado_entrega_display = serializers.CharField(source='get_estado_entrega_display', read_only=True)

    class Meta:
        model = DestinatarioAlerta
        fields = [
            'id_destinatario_alerta',
            'alerta',
            'canal',
            'canal_display',
            'motivo',
            'estado_entrega',
            'estado_entrega_display',
            'enviado_en',
            'entregado_en',
            'confirmado_en',
        ]
