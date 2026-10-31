from rest_framework import serializers
from .models import (
    Incidente,
    ReporteIncidente,
    HistorialIncidente,
    AccionAtencion,
    AsignacionBrigada,
    CierreIncidente,
)
from apps.respuesta.serializers import BrigadaSerializer


class HistorialIncidenteSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_visible')

    class Meta:
        model = HistorialIncidente
        fields = [
            'id_historial',
            'estado_anterior',
            'estado_nuevo',
            'nota',
            'usuario',
            'usuario_nombre',
            'registrado_en',
        ]


class AccionAtencionSerializer(serializers.ModelSerializer):
    brigada_nombre = serializers.ReadOnlyField(source='brigada.nombre')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_visible')

    class Meta:
        model = AccionAtencion
        fields = [
            'id_accion',
            'incidente',
            'usuario',
            'usuario_nombre',
            'brigada',
            'brigada_nombre',
            'tipo_accion',
            'descripcion',
            'resultado',
            'latitud',
            'longitud',
            'iniciada_en',
            'finalizada_en',
            'registrada_en',
        ]
        read_only_fields = ['id_accion', 'registrada_en']


class AsignacionBrigadaSerializer(serializers.ModelSerializer):
    brigada_detalle = BrigadaSerializer(source='brigada', read_only=True)
    asignado_por_nombre = serializers.ReadOnlyField(source='asignado_por.nombre_visible')
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = AsignacionBrigada
        fields = [
            'id_asignacion',
            'incidente',
            'brigada',
            'brigada_detalle',
            'asignado_por',
            'asignado_por_nombre',
            'estado',
            'estado_display',
            'instrucciones',
            'asignada_en',
            'aceptada_en',
            'finalizada_en',
        ]
        read_only_fields = ['id_asignacion', 'asignada_en']


class CierreIncidenteSerializer(serializers.ModelSerializer):
    cerrado_por_nombre = serializers.ReadOnlyField(source='cerrado_por.nombre_visible')

    class Meta:
        model = CierreIncidente
        fields = [
            'id_cierre',
            'incidente',
            'cerrado_por',
            'cerrado_por_nombre',
            'motivo',
            'evidencia_uri',
            'cerrado_en',
        ]
        read_only_fields = ['id_cierre', 'cerrado_en']


class IncidenteListSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    tipo_incendio_display = serializers.CharField(source='get_tipo_incendio_display', read_only=True)
    distrito_nombre = serializers.ReadOnlyField(source='distrito.nombre')
    comunidad_nombre = serializers.ReadOnlyField(source='comunidad.nombre')
    creado_por_nombre = serializers.ReadOnlyField(source='creado_por.nombre_visible')
    brigadas_asignadas = serializers.SerializerMethodField()
    fotografia_url = serializers.SerializerMethodField()

    class Meta:
        model = Incidente
        fields = [
            'id_incidente',
            'codigo',
            'titulo',
            'tipo_incendio',
            'tipo_incendio_display',
            'estado',
            'estado_display',
            'prioridad',
            'prioridad_display',
            'latitud_referencia',
            'longitud_referencia',
            'distrito',
            'distrito_nombre',
            'comunidad',
            'comunidad_nombre',
            'creado_por_nombre',
            'resumen',
            'brigadas_asignadas',
            'fotografia_url',
            'detectado_en',
            'creado_en',
        ]

    def get_brigadas_asignadas(self, obj):
        try:
            asignaciones = obj.asignaciones_brigadas.exclude(
                estado__in=['finalizada', 'cancelada']
            ).select_related('brigada')
            return [
                {
                    'id_brigada': a.brigada.id_brigada,
                    'nombre': a.brigada.nombre,
                    'rol': a.instrucciones or 'combate_directo',
                    'estado': a.estado,
                    'latitud_base': float(a.brigada.latitud_base) if a.brigada.latitud_base else None,
                    'longitud_base': float(a.brigada.longitud_base) if a.brigada.longitud_base else None,
                }
                for a in asignaciones
            ]
        except Exception:
            return []

    def get_fotografia_url(self, obj):
        try:
            vinculo = obj.vinculos_reporte.select_related('reporte').prefetch_related('reporte__evidencias').first()
            if vinculo and vinculo.reporte:
                ev = vinculo.reporte.evidencias.filter(tipo='fotografia').first() or vinculo.reporte.evidencias.first()
                if ev and ev.archivo:
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(ev.archivo.url)
                    return ev.archivo.url
                elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
                    return ev.uri_archivo
        except Exception:
            pass
        return None


class IncidenteDetailSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    tipo_incendio_display = serializers.CharField(source='get_tipo_incendio_display', read_only=True)
    distrito_nombre = serializers.ReadOnlyField(source='distrito.nombre')
    comunidad_nombre = serializers.ReadOnlyField(source='comunidad.nombre')
    creado_por_nombre = serializers.ReadOnlyField(source='creado_por.nombre_visible')
    asignaciones_brigadas = AsignacionBrigadaSerializer(many=True, read_only=True)
    acciones = AccionAtencionSerializer(many=True, read_only=True)
    historial_estados = HistorialIncidenteSerializer(many=True, read_only=True)
    cierre = CierreIncidenteSerializer(read_only=True)
    fotografia_url = serializers.SerializerMethodField()
    fotografias = serializers.SerializerMethodField()

    class Meta:
        model = Incidente
        fields = [
            'id_incidente',
            'codigo',
            'titulo',
            'tipo_incendio',
            'tipo_incendio_display',
            'estado',
            'estado_display',
            'prioridad',
            'prioridad_display',
            'latitud_referencia',
            'longitud_referencia',
            'perimetro_geojson',
            'distrito',
            'distrito_nombre',
            'comunidad',
            'comunidad_nombre',
            'creado_por_nombre',
            'detectado_en',
            'confirmado_en',
            'cerrado_en',
            'resumen',
            'asignaciones_brigadas',
            'acciones',
            'historial_estados',
            'cierre',
            'fotografia_url',
            'fotografias',
            'creado_en',
            'actualizado_en',
        ]

    def get_fotografia_url(self, obj):
        try:
            vinculo = obj.vinculos_reporte.select_related('reporte').prefetch_related('reporte__evidencias').first()
            if vinculo and vinculo.reporte:
                ev = vinculo.reporte.evidencias.filter(tipo='fotografia').first() or vinculo.reporte.evidencias.first()
                if ev and ev.archivo:
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(ev.archivo.url)
                    return ev.archivo.url
                elif ev and ev.uri_archivo and ev.uri_archivo.startswith('http'):
                    return ev.uri_archivo
        except Exception:
            pass
        return None

    def get_fotografias(self, obj):
        urls = []
        try:
            for v in obj.vinculos_reporte.select_related('reporte').prefetch_related('reporte__evidencias').all():
                if v.reporte:
                    for ev in v.reporte.evidencias.all():
                        if ev.archivo:
                            request = self.context.get('request')
                            url = request.build_absolute_uri(ev.archivo.url) if request else ev.archivo.url
                            if url and url not in urls:
                                urls.append(url)
                        elif ev.uri_archivo and ev.uri_archivo.startswith('http') and ev.uri_archivo not in urls:
                            urls.append(ev.uri_archivo)
        except Exception:
            pass
        return urls
