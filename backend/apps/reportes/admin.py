from django.contrib import admin
from .models import Reporte, Evidencia, Sincronizacion, ValidacionReporte


class EvidenciaInline(admin.TabularInline):
    model = Evidencia
    extra = 0
    fields = ('tipo', 'archivo', 'uri_archivo', 'nombre_original', 'tamano_bytes')


class ValidacionReporteInline(admin.TabularInline):
    model = ValidacionReporte
    extra = 0
    autocomplete_fields = ['revisor']


@admin.register(Reporte)
class ReporteAdmin(admin.ModelAdmin):
    list_display = (
        'id_reporte',
        'usuario',
        'tipo_incendio',
        'estado',
        'comunidad',
        'fecha_evento',
        'origen',
        'cantidad_evidencias',
        'creado_en',
    )
    list_filter = ('estado', 'tipo_incendio', 'origen', 'comunidad')
    search_fields = ('descripcion', 'usuario__username', 'usuario__nombre_visible')
    autocomplete_fields = ['usuario', 'comunidad']
    inlines = [EvidenciaInline, ValidacionReporteInline]
    readonly_fields = ('uuid', 'creado_en', 'sincronizado_en')

    def cantidad_evidencias(self, obj):
        return obj.evidencias.count()
    cantidad_evidencias.short_description = 'Evidencias'


@admin.register(Evidencia)
class EvidenciaAdmin(admin.ModelAdmin):
    list_display = ('id_evidencia', 'reporte', 'tipo', 'nombre_original', 'tamano_bytes', 'creada_en')
    list_filter = ('tipo', 'creada_en')
    search_fields = ('nombre_original', 'sha256', 'uri_archivo')
    autocomplete_fields = ['reporte']


@admin.register(Sincronizacion)
class SincronizacionAdmin(admin.ModelAdmin):
    list_display = ('id_sincronizacion', 'usuario', 'tipo_registro', 'estado', 'uuid_dispositivo', 'recibido_en')
    list_filter = ('estado', 'tipo_registro', 'recibido_en')
    search_fields = ('uuid_dispositivo', 'uuid_registro_cliente', 'usuario__username')
    autocomplete_fields = ['usuario']


@admin.register(ValidacionReporte)
class ValidacionReporteAdmin(admin.ModelAdmin):
    list_display = ('id_validacion', 'reporte', 'revisor', 'resultado', 'validado_en')
    list_filter = ('resultado', 'validado_en')
    search_fields = ('comentario', 'revisor__username')
    autocomplete_fields = ['reporte', 'revisor']
