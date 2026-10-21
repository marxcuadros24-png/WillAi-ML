from django.contrib import admin
from .models import AlertaEmergencia, PreferenciaNotificacion, DestinatarioAlerta


class DestinatarioAlertaInline(admin.TabularInline):
    model = DestinatarioAlerta
    extra = 0
    fields = ('usuario', 'canal', 'motivo', 'estado_entrega', 'enviado_en', 'confirmado_en')
    readonly_fields = ('enviado_en', 'confirmado_en')
    autocomplete_fields = ['usuario']


@admin.register(AlertaEmergencia)
class AlertaEmergenciaAdmin(admin.ModelAdmin):
    list_display = ('id_alerta', 'titulo', 'tipo', 'prioridad', 'estado', 'emitida_en', 'expira_en')
    list_filter = ('tipo', 'prioridad', 'estado', 'emitida_en')
    search_fields = ('titulo', 'mensaje', 'instrucciones')
    autocomplete_fields = ['incidente', 'zona_riesgo', 'emitida_por', 'aprobada_por']
    inlines = [DestinatarioAlertaInline]
    readonly_fields = ('uuid', 'creada_en')


@admin.register(PreferenciaNotificacion)
class PreferenciaNotificacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'canal', 'habilitado', 'destino_verificado', 'destino', 'actualizado_en')
    list_filter = ('canal', 'habilitado', 'destino_verificado')
    search_fields = ('usuario__username', 'destino')
    autocomplete_fields = ['usuario']


@admin.register(DestinatarioAlerta)
class DestinatarioAlertaAdmin(admin.ModelAdmin):
    list_display = ('id_destinatario_alerta', 'alerta', 'usuario', 'canal', 'motivo', 'estado_entrega', 'enviado_en', 'confirmado_en')
    list_filter = ('canal', 'motivo', 'estado_entrega', 'enviado_en')
    search_fields = ('usuario__username', 'alerta__titulo')
    autocomplete_fields = ['alerta', 'usuario', 'vivienda']
