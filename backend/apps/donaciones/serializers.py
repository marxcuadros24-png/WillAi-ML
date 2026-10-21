from rest_framework import serializers
from .models import Donante, OfertaDonacion, ItemOfertaDonacion, AsignacionDonacion, HistorialOfertaDonacion


class DonanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donante
        fields = [
            'id_donante',
            'usuario',
            'tipo_donante',
            'nombre_publico',
            'identificador_fiscal',
            'telefono_contacto',
            'correo_contacto',
            'mostrar_contacto_publico',
            'verificado',
            'estado',
            'creado_en'
        ]
        read_only_fields = ['id_donante', 'verificado', 'creado_en']


class ItemOfertaDonacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemOfertaDonacion
        fields = [
            'id_item_donacion',
            'oferta',
            'categoria',
            'nombre_item',
            'descripcion',
            'cantidad_ofrecida',
            'unidad',
            'cantidad_disponible',
            'condicion',
            'fecha_vencimiento',
            'requiere_cadena_frio',
            'observaciones',
            'creado_en'
        ]
        read_only_fields = ['id_item_donacion', 'creado_en']


class HistorialOfertaDonacionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre_completo')

    class Meta:
        model = HistorialOfertaDonacion
        fields = ['id_historial_oferta', 'estado_anterior', 'estado_nuevo', 'comentario', 'usuario_nombre', 'ocurrido_en']


class OfertaDonacionSerializer(serializers.ModelSerializer):
    items = ItemOfertaDonacionSerializer(many=True, read_only=True)
    historial = HistorialOfertaDonacionSerializer(many=True, read_only=True)
    donante_nombre = serializers.ReadOnlyField(source='donante.nombre_publico')
    distrito_nombre = serializers.ReadOnlyField(source='distrito.nombre')

    class Meta:
        model = OfertaDonacion
        fields = [
            'id_oferta',
            'uuid',
            'donante',
            'donante_nombre',
            'distrito',
            'distrito_nombre',
            'titulo',
            'descripcion',
            'modalidad_entrega',
            'latitud_entrega',
            'longitud_entrega',
            'referencia_entrega',
            'disponible_desde',
            'disponible_hasta',
            'estado',
            'motivo_rechazo',
            'revisada_por',
            'revisada_en',
            'publicada_en',
            'creada_en',
            'actualizada_en',
            'items',
            'historial'
        ]
        read_only_fields = [
            'id_oferta', 'uuid', 'revisada_por', 'revisada_en', 'publicada_en',
            'creada_en', 'actualizada_en'
        ]


class AsignacionDonacionSerializer(serializers.ModelSerializer):
    item_nombre = serializers.ReadOnlyField(source='item_donacion.nombre_item')
    solicitada_por_nombre = serializers.ReadOnlyField(source='solicitada_por.nombre_completo')
    aprobada_por_nombre = serializers.ReadOnlyField(source='aprobada_por.nombre_completo')

    class Meta:
        model = AsignacionDonacion
        fields = [
            'id_asignacion_donacion',
            'item_donacion',
            'item_nombre',
            'incidente',
            'brigada',
            'entidad',
            'cantidad_asignada',
            'estado',
            'solicitada_por',
            'solicitada_por_nombre',
            'aprobada_por',
            'aprobada_por_nombre',
            'solicitada_en',
            'aprobada_en',
            'entregada_en',
            'comprobante_uri',
            'observaciones'
        ]
        read_only_fields = ['id_asignacion_donacion', 'solicitada_en', 'aprobada_en', 'entregada_en']
