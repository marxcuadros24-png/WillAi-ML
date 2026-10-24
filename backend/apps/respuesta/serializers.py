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
    integrantes = BrigadistaSerializer(many=True, read_only=True)
    incidente_asignado = serializers.SerializerMethodField()

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
            'integrantes',
            'incidente_asignado',
            'creada_en',
        ]

    def get_cantidad_integrantes(self, obj):
        return obj.integrantes.filter(activo=True).count()

    def get_incidente_asignado(self, obj):
        try:
            asignacion = obj.asignaciones.exclude(
                estado__in=['finalizada', 'cancelada']
            ).exclude(
                incidente__estado__in=['cerrado', 'extinguido']
            ).select_related('incidente').first()
            if not asignacion or not asignacion.incidente:
                return None
            inc = asignacion.incidente
            return {
                'id_asignacion': asignacion.id_asignacion,
                'id_incidente': inc.id_incidente,
                'codigo': inc.codigo,
                'titulo': inc.titulo,
                'latitud': float(inc.latitud_referencia),
                'longitud': float(inc.longitud_referencia),
                'rol': asignacion.instrucciones or 'combate_directo',
                'estado_asignacion': asignacion.estado,
                'asignada_en': asignacion.asignada_en.strftime('%Y-%m-%d %H:%M') if asignacion.asignada_en else ''
            }
        except Exception:
            return None
