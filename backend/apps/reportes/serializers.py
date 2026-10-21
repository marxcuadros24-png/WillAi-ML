from rest_framework import serializers
from django.utils import timezone
from .models import Reporte, Evidencia, Sincronizacion, ValidacionReporte


class EvidenciaSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Evidencia
        fields = [
            'id_evidencia',
            'tipo',
            'tipo_display',
            'archivo',
            'uri_archivo',
            'nombre_original',
            'mime_type',
            'tamano_bytes',
            'sha256',
            'capturada_en',
            'metadatos',
            'creada_en',
        ]
        read_only_fields = ['id_evidencia', 'creada_en']


class ValidacionReporteSerializer(serializers.ModelSerializer):
    revisor_nombre = serializers.ReadOnlyField(source='revisor.nombre_visible')
    resultado_display = serializers.CharField(source='get_resultado_display', read_only=True)

    class Meta:
        model = ValidacionReporte
        fields = [
            'id_validacion',
            'reporte',
            'revisor',
            'revisor_nombre',
            'resultado',
            'resultado_display',
            'comentario',
            'validado_en',
        ]
        read_only_fields = ['id_validacion', 'revisor', 'validado_en']


class ReporteSerializer(serializers.ModelSerializer):
    tipo_incendio_display = serializers.CharField(source='get_tipo_incendio_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    comunidad_nombre = serializers.ReadOnlyField(source='comunidad.nombre')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_visible')
    evidencias = EvidenciaSerializer(many=True, read_only=True)
    validaciones = ValidacionReporteSerializer(many=True, read_only=True)

    class Meta:
        model = Reporte
        fields = [
            'id_reporte',
            'uuid',
            'usuario',
            'usuario_nombre',
            'comunidad',
            'comunidad_nombre',
            'tipo_incendio',
            'tipo_incendio_display',
            'fecha_evento',
            'descripcion',
            'latitud',
            'longitud',
            'precision_metros',
            'direccion_viento',
            'estado',
            'estado_display',
            'origen',
            'evidencias',
            'validaciones',
            'creado_en',
            'sincronizado_en',
        ]
        read_only_fields = ['id_reporte', 'uuid', 'usuario', 'creado_en', 'sincronizado_en']


class CrearReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para creación rápida desde la App Móvil con foto opcional.
    """
    fecha_evento = serializers.DateTimeField(required=False, default=timezone.now)
    evidencias_archivos = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Reporte
        fields = [
            'id_reporte',
            'uuid',
            'tipo_incendio',
            'fecha_evento',
            'descripcion',
            'latitud',
            'longitud',
            'precision_metros',
            'direccion_viento',
            'origen',
            'comunidad',
            'evidencias_archivos',
        ]
        read_only_fields = ['id_reporte', 'uuid']

    def create(self, validated_data):
        archivos = validated_data.pop('evidencias_archivos', [])
        user = self.context['request'].user

        if 'fecha_evento' not in validated_data or not validated_data['fecha_evento']:
            validated_data['fecha_evento'] = timezone.now()

        reporte = Reporte.objects.create(
            usuario=user,
            estado=Reporte.EstadoReporte.RECIBIDO,
            **validated_data
        )

        # Crear evidencias asociadas si se enviaron archivos
        for arch in archivos:
            Evidencia.objects.create(
                reporte=reporte,
                archivo=arch,
                uri_archivo=arch.name,
                nombre_original=arch.name,
                mime_type=getattr(arch, 'content_type', 'image/jpeg'),
                tamano_bytes=arch.size,
                capturada_en=timezone.now()
            )

        return reporte


class SincronizacionItemSerializer(serializers.Serializer):
    uuid_dispositivo = serializers.CharField(max_length=36)
    uuid_registro_cliente = serializers.CharField(max_length=36)
    tipo_registro = serializers.ChoiceField(choices=['reporte', 'evidencia', 'otro'])
    datos = serializers.JSONField()
