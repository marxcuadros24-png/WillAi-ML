from django.contrib import admin
from .models import FuenteSatelital, LoteImportacionFirms, DeteccionSatelital, LoteDeteccionesFirms, DeteccionIncidente


class DeteccionIncidenteInline(admin.TabularInline):
    model = DeteccionIncidente
    extra = 0
    autocomplete_fields = ['incidente']


@admin.register(FuenteSatelital)
class FuenteSatelitalAdmin(admin.ModelAdmin):
    list_display = ('codigo_producto', 'proveedor', 'sensor', 'plataforma', 'tipo_producto', 'activa')
    list_filter = ('proveedor', 'sensor', 'tipo_producto', 'activa')
    search_fields = ('codigo_producto', 'proveedor', 'sensor')


@admin.register(LoteImportacionFirms)
class LoteImportacionFirmsAdmin(admin.ModelAdmin):
    list_display = (
        'identificador_lote',
        'fuente',
        'estado',
        'filas_recibidas',
        'filas_insertadas',
        'filas_actualizadas',
        'iniciado_en',
        'finalizado_en',
    )
    list_filter = ('estado', 'fuente', 'iniciado_en')
    search_fields = ('identificador_lote', 'error_detalle')
    readonly_fields = ('iniciado_en', 'finalizado_en')


@admin.register(DeteccionSatelital)
class DeteccionSatelitalAdmin(admin.ModelAdmin):
    list_display = (
        'id_deteccion',
        'fuente',
        'fecha_observacion',
        'latitud',
        'longitud',
        'frp_mw',
        'confianza',
        'brillo_kelvin',
        'dia_noche',
    )
    list_filter = ('fuente', 'confianza', 'dia_noche', 'fecha_observacion')
    search_fields = ('clave_deteccion', 'codigo_satelite')
    inlines = [DeteccionIncidenteInline]
    readonly_fields = ('clave_deteccion', 'primera_importacion_en', 'ultima_actualizacion_en')


@admin.register(DeteccionIncidente)
class DeteccionIncidenteAdmin(admin.ModelAdmin):
    list_display = ('deteccion', 'incidente', 'metodo_vinculo', 'confianza_vinculo', 'vinculado_en')
    list_filter = ('metodo_vinculo', 'vinculado_en')
    autocomplete_fields = ['deteccion', 'incidente']
