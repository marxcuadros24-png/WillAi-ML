from django.contrib import admin
from .models import (
    Incidente,
    ReporteIncidente,
    HistorialIncidente,
    AccionAtencion,
    AsignacionBrigada,
    CierreIncidente,
)


class ReporteIncidenteInline(admin.TabularInline):
    model = ReporteIncidente
    extra = 0
    autocomplete_fields = ['reporte', 'vinculado_por']


class AsignacionBrigadaInline(admin.TabularInline):
    model = AsignacionBrigada
    extra = 0
    autocomplete_fields = ['brigada', 'asignado_por']


class AccionAtencionInline(admin.TabularInline):
    model = AccionAtencion
    extra = 0
    autocomplete_fields = ['brigada', 'usuario']


class HistorialIncidenteInline(admin.TabularInline):
    model = HistorialIncidente
    extra = 0
    readonly_fields = ('estado_anterior', 'estado_nuevo', 'nota', 'usuario', 'registrado_en')
    can_delete = False


@admin.register(Incidente)
class IncidenteAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'titulo',
        'estado',
        'prioridad',
        'tipo_incendio',
        'distrito',
        'comunidad',
        'detectado_en',
        'creado_en',
    )
    list_filter = ('estado', 'prioridad', 'tipo_incendio', 'distrito')
    search_fields = ('codigo', 'titulo', 'resumen')
    autocomplete_fields = ['distrito', 'comunidad', 'creado_por']
    inlines = [
        ReporteIncidenteInline,
        AsignacionBrigadaInline,
        AccionAtencionInline,
        HistorialIncidenteInline,
    ]
    readonly_fields = ('creado_en', 'actualizado_en')


@admin.register(ReporteIncidente)
class ReporteIncidenteAdmin(admin.ModelAdmin):
    list_display = ('reporte', 'incidente', 'tipo_vinculo', 'vinculado_por', 'vinculado_en')
    list_filter = ('tipo_vinculo', 'vinculado_en')
    search_fields = ('incidente__codigo', 'incidente__titulo')
    autocomplete_fields = ['reporte', 'incidente', 'vinculado_por']


@admin.register(HistorialIncidente)
class HistorialIncidenteAdmin(admin.ModelAdmin):
    list_display = ('incidente', 'estado_anterior', 'estado_nuevo', 'usuario', 'registrado_en')
    list_filter = ('estado_nuevo', 'registrado_en')
    search_fields = ('incidente__codigo', 'nota')
    autocomplete_fields = ['incidente', 'usuario']


@admin.register(AsignacionBrigada)
class AsignacionBrigadaAdmin(admin.ModelAdmin):
    list_display = ('incidente', 'brigada', 'estado', 'asignado_por', 'asignada_en')
    list_filter = ('estado', 'asignada_en')
    search_fields = ('incidente__codigo', 'brigada__nombre')
    autocomplete_fields = ['incidente', 'brigada', 'asignado_por']


@admin.register(AccionAtencion)
class AccionAtencionAdmin(admin.ModelAdmin):
    list_display = ('incidente', 'tipo_accion', 'brigada', 'usuario', 'registrada_en')
    list_filter = ('tipo_accion', 'registrada_en')
    search_fields = ('incidente__codigo', 'descripcion', 'tipo_accion')
    autocomplete_fields = ['incidente', 'brigada', 'usuario']


@admin.register(CierreIncidente)
class CierreIncidenteAdmin(admin.ModelAdmin):
    list_display = ('incidente', 'cerrado_por', 'cerrado_en')
    search_fields = ('incidente__codigo', 'motivo')
    autocomplete_fields = ['incidente', 'cerrado_por']
