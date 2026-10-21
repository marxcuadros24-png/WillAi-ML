from rest_framework import serializers
from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital


class FuenteSatelitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuenteSatelital
        fields = [
            'id_fuente',
            'codigo_producto',
            'proveedor',
            'sensor',
            'plataforma',
            'tipo_producto',
            'documentacion_url',
            'activa',
        ]


class LoteImportacionFirmsSerializer(serializers.ModelSerializer):
    fuente_nombre = serializers.ReadOnlyField(source='fuente.codigo_producto')

    class Meta:
        model = LoteImportacionFirms
        fields = [
            'id_lote',
            'fuente',
            'fuente_nombre',
            'identificador_lote',
            'estado',
            'filas_recibidas',
            'filas_insertadas',
            'filas_actualizadas',
            'filas_omitidas',
            'iniciado_en',
            'finalizado_en',
            'error_detalle',
        ]


class DeteccionSatelitalSerializer(serializers.ModelSerializer):
    proveedor = serializers.ReadOnlyField(source='fuente.proveedor')
    sensor = serializers.ReadOnlyField(source='fuente.sensor')
    codigo_producto = serializers.ReadOnlyField(source='fuente.codigo_producto')

    class Meta:
        model = DeteccionSatelital
        fields = [
            'id_deteccion',
            'proveedor',
            'sensor',
            'codigo_producto',
            'clave_deteccion',
            'fecha_observacion',
            'latitud',
            'longitud',
            'frp_mw',
            'confianza',
            'confianza_numerica',
            'brillo_kelvin',
            'dia_noche',
            'codigo_satelite',
            'primera_importacion_en',
        ]
