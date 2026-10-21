from django.contrib import admin
from .models import ObservacionMeteorologica, ZonaRiesgo, Vivienda, ResidenteVivienda, EvaluacionExposicion


class ResidenteViviendaInline(admin.TabularInline):
    model = ResidenteVivienda
    extra = 1
    autocomplete_fields = ['usuario']


class EvaluacionExposicionInline(admin.TabularInline):
    model = EvaluacionExposicion
    extra = 0
    readonly_fields = ('nivel_riesgo', 'distancia_metros', 'evaluada_en')


@admin.register(ObservacionMeteorologica)
class ObservacionMeteorologicaAdmin(admin.ModelAdmin):
    list_display = (
        'id_observacion',
        'proveedor',
        'latitud',
        'longitud',
        'observada_en',
        'temperatura_c',
        'humedad_relativa_pct',
        'viento_kmh',
        'direccion_viento_grados',
        'precipitacion_mm',
    )
    list_filter = ('proveedor', 'observada_en')
    search_fields = ('id_externo', 'proveedor')
    readonly_fields = ('creada_en',)


@admin.register(ZonaRiesgo)
class ZonaRiesgoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel', 'origen', 'incidente', 'valida_desde', 'valida_hasta', 'creada_en')
    list_filter = ('nivel', 'origen')
    search_fields = ('nombre', 'metodo')
    autocomplete_fields = ['incidente', 'creada_por']


@admin.register(Vivienda)
class ViviendaAdmin(admin.ModelAdmin):
    list_display = ('id_vivienda', 'referencia', 'comunidad', 'latitud', 'longitud', 'verificada', 'activa')
    list_filter = ('verificada', 'activa', 'comunidad')
    search_fields = ('referencia', 'comunidad__nombre')
    autocomplete_fields = ['comunidad', 'verificada_por']
    inlines = [ResidenteViviendaInline, EvaluacionExposicionInline]


@admin.register(EvaluacionExposicion)
class EvaluacionExposicionAdmin(admin.ModelAdmin):
    list_display = ('id_evaluacion', 'vivienda', 'nivel_riesgo', 'distancia_metros', 'incidente', 'zona_riesgo', 'evaluada_en')
    list_filter = ('nivel_riesgo', 'evaluada_en')
    autocomplete_fields = ['vivienda', 'incidente', 'zona_riesgo']
