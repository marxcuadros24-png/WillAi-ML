import base64
from django.core.files.base import ContentFile
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
    fotografia_url = serializers.SerializerMethodField(read_only=True)
    video_url = serializers.SerializerMethodField(read_only=True)
    video = serializers.SerializerMethodField(read_only=True)
    fotografia = serializers.SerializerMethodField(read_only=True)
    evidencias = EvidenciaSerializer(many=True, read_only=True)
    validaciones = ValidacionReporteSerializer(many=True, read_only=True)

    def get_fotografia_url(self, obj):
        ev = obj.evidencias.filter(tipo='fotografia').first() or obj.evidencias.first()
        if ev and ev.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(ev.archivo.url)
            return ev.archivo.url
        elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
            return ev.uri_archivo
        return None

    def get_video_url(self, obj):
        ev = obj.evidencias.filter(tipo='video').first()
        if ev and ev.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(ev.archivo.url)
            return ev.archivo.url
        elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
            return ev.uri_archivo
        return None

    def get_video(self, obj):
        return self.get_video_url(obj)

    def get_fotografia(self, obj):
        return self.get_fotografia_url(obj)

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
            'fotografia',
            'fotografia_url',
            'video',
            'video_url',
            'evidencias',
            'validaciones',
            'creado_en',
            'sincronizado_en',
        ]
        read_only_fields = ['id_reporte', 'uuid', 'usuario', 'creado_en', 'sincronizado_en']


class Base64OrFileImageField(serializers.ImageField):
    """
    Campo que admite archivos multipart estándar y cadenas codificadas en Base64
    ('data:image/jpeg;base64,...' o base64 puro).
    """
    def to_internal_value(self, data):
        if isinstance(data, str) and (data.startswith('data:image') or ';base64,' in data):
            try:
                header, base64_data = data.split(';base64,')
                ext = header.split('/')[-1].split(';')[0]
                if ext == 'jpeg':
                    ext = 'jpg'
                file_name = f"evidencia_{timezone.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
                decoded_file = base64.b64decode(base64_data)
                return ContentFile(decoded_file, name=file_name)
            except Exception as e:
                raise serializers.ValidationError(f"Error decodificando imagen base64: {e}")
        elif isinstance(data, str) and len(data) > 100 and not data.startswith('http'):
            try:
                decoded_file = base64.b64decode(data)
                file_name = f"evidencia_{timezone.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                return ContentFile(decoded_file, name=file_name)
            except Exception:
                pass
        return super().to_internal_value(data)


class CrearReporteSerializer(serializers.ModelSerializer):
    """
    Serializer para creación rápida desde la App Móvil con foto opcional.
    Garantiza transacción atómica (Reporte -> Evidencia -> Incidente -> Vínculo).
    """
    fecha_evento = serializers.DateTimeField(required=False, default=timezone.now)
    fotografia = Base64OrFileImageField(required=False, write_only=True)
    fotografia_base64 = Base64OrFileImageField(required=False, write_only=True, source='fotografia')
    video = serializers.FileField(required=False, write_only=True)
    fotografia_url = serializers.SerializerMethodField(read_only=True)
    video_url = serializers.SerializerMethodField(read_only=True)
    evidencias_archivos = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False),
        write_only=True,
        required=False
    )

    def get_fotografia_url(self, obj):
        ev = obj.evidencias.filter(tipo='fotografia').first() or obj.evidencias.first()
        if ev and ev.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(ev.archivo.url)
            return ev.archivo.url
        elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
            return ev.uri_archivo
        return None

    def get_video_url(self, obj):
        ev = obj.evidencias.filter(tipo='video').first()
        if ev and ev.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(ev.archivo.url)
            return ev.archivo.url
        elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
            return ev.uri_archivo
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        v_url = self.get_video_url(instance)
        f_url = self.get_fotografia_url(instance)
        ret['video'] = v_url
        ret['video_url'] = v_url
        ret['fotografia'] = f_url
        ret['fotografia_url'] = f_url
        ret['evidencias'] = EvidenciaSerializer(instance.evidencias.all(), many=True, context=self.context).data
        return ret

    def validate_video(self, value):
        if value:
            # Tamaño máximo: 50 MB (duración máxima esperada: 15 segundos en cámaras modernas)
            max_size = 50 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError('El archivo de video no puede superar los 50 MB.')
            valid_exts = ('.mp4', '.mov', '.3gp', '.m4v', '.webm', '.avi', '.mkv')
            name = (getattr(value, 'name', '') or '').lower()
            mime = (getattr(value, 'content_type', '') or '').lower()
            es_video = any(name.endswith(ext) for ext in valid_exts) or 'video' in mime
            if not es_video:
                raise serializers.ValidationError('Formato no válido. Se admiten videos: MP4, MOV, 3GP, WEBM.')
            if not any(name.endswith(ext) for ext in valid_exts):
                value.name = f"{name or 'evidencia_video'}.mp4"
        return value

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
            'fotografia_base64',
            'fotografia_url',
            'video',
            'video_url',
            'evidencias_archivos',
        ]
        read_only_fields = ['id_reporte', 'uuid', 'fotografia_url', 'video_url']

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
        video = validated_data.pop('video', None)
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
                    tipo=Evidencia.TipoEvidencia.FOTOGRAFIA,
                    archivo=fotografia,
                    uri_archivo=getattr(fotografia, 'name', 'evidencia.jpg'),
                    nombre_original=getattr(fotografia, 'name', 'evidencia.jpg'),
                    mime_type=getattr(fotografia, 'content_type', 'image/jpeg'),
                    tamano_bytes=getattr(fotografia, 'size', None),
                    capturada_en=timezone.now()
                )

            # 3. Registrar evidencia de video si fue enviada (Archivo en disco /media/, metadatos en PostgreSQL)
            if video:
                v_name = getattr(video, 'name', 'evidencia.mp4')
                if not any(v_name.lower().endswith(ext) for ext in ('.mp4', '.mov', '.3gp', '.webm', '.m4v', '.avi', '.mkv')):
                    v_name = f"{v_name}.mp4"
                v_mime = getattr(video, 'content_type', 'video/mp4')
                if not v_mime or v_mime == 'application/octet-stream':
                    if v_name.lower().endswith('.mov'):
                        v_mime = 'video/quicktime'
                    elif v_name.lower().endswith('.3gp'):
                        v_mime = 'video/3gpp'
                    elif v_name.lower().endswith('.webm'):
                        v_mime = 'video/webm'
                    else:
                        v_mime = 'video/mp4'

                ev_video = Evidencia.objects.create(
                    reporte=reporte,
                    tipo=Evidencia.TipoEvidencia.VIDEO,
                    archivo=video,
                    uri_archivo=v_name,
                    nombre_original=v_name,
                    mime_type=v_mime,
                    tamano_bytes=getattr(video, 'size', None),
                    capturada_en=timezone.now()
                )

                # Optimizar video con ffmpeg (480p, sin audio, max 15s, faststart web)
                try:
                    from apps.reportes.services import optimizar_video_evidencia
                    optimizar_video_evidencia(ev_video.id_evidencia)
                except Exception as opt_err:
                    import logging
                    logging.getLogger(__name__).warning(f"No se pudo optimizar video #{ev_video.id_evidencia}: {opt_err}")

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

            # 4. Vincular o crear automáticamente un Incidente operativo
            if not ReporteIncidente.objects.filter(reporte=reporte).exists():
                fecha_hoy = timezone.now().strftime('%Y%m%d')
                conteo_hoy = Incidente.objects.filter(codigo__startswith=f"INC-{fecha_hoy}").count() + 1
                codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"
                while Incidente.objects.filter(codigo=codigo).exists():
                    conteo_hoy += 1
                    codigo = f"INC-{fecha_hoy}-{conteo_hoy:03d}"

                comunidad = reporte.comunidad
                distrito = comunidad.distrito if (comunidad and hasattr(comunidad, 'distrito')) else Distrito.objects.filter(nombre__icontains='Coracora').first()
                nombre_lugar = comunidad.nombre if comunidad else (distrito.nombre if distrito else 'Coracora')
                titulo = f"Incendio en {nombre_lugar} (Reporte #{reporte.id_reporte})"

                tipo_map = {
                    'pastizal': Incidente.TipoIncendio.PASTIZAL,
                    'forestal': Incidente.TipoIncendio.FORESTAL,
                    'agricola': Incidente.TipoIncendio.AGRICOLA,
                    'residencial': Incidente.TipoIncendio.RESIDENCIAL,
                    'otro': Incidente.TipoIncendio.OTRO,
                }
                tipo_inc = tipo_map.get(reporte.tipo_incendio, Incidente.TipoIncendio.PASTIZAL)

                incidente = Incidente.objects.create(
                    codigo=codigo,
                    titulo=titulo,
                    tipo_incendio=tipo_inc,
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
