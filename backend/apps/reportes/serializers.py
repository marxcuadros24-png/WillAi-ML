from django.db import transaction
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
            'autoriza_publicacion',
            'evidencias',
            'validaciones',
            'creado_en',
            'sincronizado_en',
        ]
        read_only_fields = ['id_reporte', 'uuid', 'usuario', 'creado_en', 'sincronizado_en']


class CrearReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para creación rápida desde la App Móvil con foto opcional.
    Garantiza transacción atómica (Reporte -> Evidencia -> Incidente -> Vínculo).
    """
    fecha_evento = serializers.DateTimeField(required=False, default=timezone.now)
    fotografia = serializers.ImageField(required=False, write_only=True)
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
            'autoriza_publicacion',
            'comunidad',
            'fotografia',
            'evidencias_archivos',
        ]
        read_only_fields = ['id_reporte', 'uuid']

    def to_internal_value(self, data):
        # Normalizar y redondear coordenadas a 6 decimales para evitar rechazo de validación GPS (max_digits=9, decimal_places=6)
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        for campo in ('latitud', 'longitud'):
            val = mutable_data.get(campo)
            if val is not None:
                try:
                    mutable_data[campo] = f"{round(float(val), 6):.6f}"
                except (ValueError, TypeError):
                    pass
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        from apps.incidentes.models import Incidente, ReporteIncidente, HistorialIncidente
        from apps.geografia.models import Distrito

        fotografia = validated_data.pop('fotografia', None)
        archivos = validated_data.pop('evidencias_archivos', [])
        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None

        if 'fecha_evento' not in validated_data or not validated_data['fecha_evento']:
            validated_data['fecha_evento'] = timezone.now()

        with transaction.atomic():
            # 1. Crear el reporte ciudadano
            reporte = Reporte.objects.create(
                usuario=user,
                estado=Reporte.EstadoReporte.RECIBIDO,
                **validated_data
            )

            # 2. Registrar evidencia fotográfica si fue enviada
            if fotografia:
                Evidencia.objects.create(
                    reporte=reporte,
                    archivo=fotografia,
                    uri_archivo=getattr(fotografia, 'name', 'evidencia.jpg'),
                    nombre_original=getattr(fotografia, 'name', 'evidencia.jpg'),
                    mime_type=getattr(fotografia, 'content_type', 'image/jpeg'),
                    tamano_bytes=getattr(fotografia, 'size', None),
                    capturada_en=timezone.now()
                )

            for arch in archivos:
                Evidencia.objects.create(
                    reporte=reporte,
                    archivo=arch,
                    uri_archivo=getattr(arch, 'name', 'evidencia.jpg'),
                    nombre_original=getattr(arch, 'name', 'evidencia.jpg'),
                    mime_type=getattr(arch, 'content_type', 'image/jpeg'),
                    tamano_bytes=getattr(arch, 'size', None),
                    capturada_en=timezone.now()
                )

            # 3. Evitar duplicar incidentes para el mismo reporte (Requisito 2)
            if not ReporteIncidente.objects.filter(reporte=reporte).exists():
                fecha_hoy = timezone.now().strftime('%Y%m%d')
                conteo_hoy = Incidente.objects.filter(codigo__startswith=f"INC-{fecha_hoy}").count() + 1
                codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"
                while Incidente.objects.filter(codigo=codigo).exists():
                    conteo_hoy += 1
                    codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"

                comunidad = reporte.comunidad
                distrito = None
                if comunidad and hasattr(comunidad, 'distrito'):
                    distrito = comunidad.distrito
                if not distrito:
                    distrito = Distrito.objects.filter(nombre__icontains='Coracora').first()

                nombre_lugar = comunidad.nombre if comunidad else (distrito.nombre if distrito else 'Coracora')
                titulo = f"Incendio en {nombre_lugar} (Reporte #{reporte.id_reporte})"

                incidente = Incidente.objects.create(
                    codigo=codigo,
                    titulo=titulo,
                    tipo_incendio=reporte.tipo_incendio or Incidente.TipoIncendio.PASTIZAL,
                    estado=Incidente.EstadoIncidente.NUEVO,
                    prioridad=Incidente.Prioridad.ALTA,
                    latitud_referencia=reporte.latitud,
                    longitud_referencia=reporte.longitud,
                    distrito=distrito,
                    comunidad=comunidad,
                    creado_por=user,
                    detectado_en=reporte.fecha_evento or timezone.now(),
                    resumen=reporte.descripcion or f"Reporte ciudadano #{reporte.id_reporte}"
                )

                ReporteIncidente.objects.create(
                    incidente=incidente,
                    reporte=reporte,
                    tipo_vinculo=ReporteIncidente.TipoVinculo.ORIGEN,
                    vinculado_por=user
                )

                HistorialIncidente.objects.create(
                    incidente=incidente,
                    usuario=user,
                    estado_anterior=None,
                    estado_nuevo=Incidente.EstadoIncidente.NUEVO,
                    nota=f"Incidente registrado automáticamente a partir de reporte ciudadano #{reporte.id_reporte}"
                )

            return reporte


class SincronizacionItemSerializer(serializers.Serializer):
    uuid_dispositivo = serializers.CharField(max_length=36)
    uuid_registro_cliente = serializers.CharField(max_length=36)
    tipo_registro = serializers.ChoiceField(choices=['reporte', 'evidencia', 'otro'])
    datos = serializers.JSONField()
