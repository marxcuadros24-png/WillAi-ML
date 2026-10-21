from django.contrib import admin
from .models import Entidad, Brigada, Brigadista, RecursoEmergencia


class BrigadistaInline(admin.TabularInline):
    model = Brigadista
    extra = 1
    autocomplete_fields = ['usuario']


class RecursoEmergenciaInline(admin.TabularInline):
    model = RecursoEmergencia
    extra = 1
    fields = ('nombre', 'categoria', 'cantidad', 'estado')


@admin.register(Entidad)
class EntidadAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'sigla', 'distrito', 'telefono_operativo', 'activa')
    list_filter = ('tipo', 'activa', 'distrito')
    search_fields = ('nombre', 'sigla', 'telefono_operativo', 'correo_operativo')
    autocomplete_fields = ['distrito']


@admin.register(Brigada)
class BrigadaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'estado', 'entidad', 'comunidad', 'telefono_contacto', 'cantidad_brigadistas')
    list_filter = ('tipo', 'estado', 'entidad')
    search_fields = ('nombre', 'telefono_contacto')
    autocomplete_fields = ['entidad', 'comunidad']
    inlines = [BrigadistaInline, RecursoEmergenciaInline]

    def cantidad_brigadistas(self, obj):
        return obj.integrantes.filter(activo=True).count()
    cantidad_brigadistas.short_description = 'Integrantes Activos'


@admin.register(Brigadista)
class BrigadistaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'brigada', 'funcion', 'desde', 'hasta', 'activo')
    list_filter = ('activo', 'brigada', 'funcion')
    search_fields = ('usuario__username', 'usuario__nombre_visible', 'brigada__nombre')
    autocomplete_fields = ['usuario', 'brigada']


@admin.register(RecursoEmergencia)
class RecursoEmergenciaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'cantidad', 'estado', 'brigada', 'entidad', 'actualizado_en')
    list_filter = ('categoria', 'estado', 'entidad', 'brigada')
    search_fields = ('nombre', 'categoria')
    autocomplete_fields = ['entidad', 'brigada']
