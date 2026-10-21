from django.contrib import admin
from .models import Distrito, Comunidad


class ComunidadInline(admin.TabularInline):
    model = Comunidad
    extra = 1
    fields = ('nombre', 'tipo', 'latitud', 'longitud', 'activa')


@admin.register(Distrito)
class DistritoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'provincia', 'departamento', 'ubigeo', 'cantidad_comunidades', 'creado_en')
    list_filter = ('departamento', 'provincia')
    search_fields = ('nombre', 'ubigeo', 'provincia', 'departamento')
    inlines = [ComunidadInline]

    def cantidad_comunidades(self, obj):
        return obj.comunidades.count()
    cantidad_comunidades.short_description = 'Comunidades'


@admin.register(Comunidad)
class ComunidadAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'distrito', 'tipo', 'latitud', 'longitud', 'activa', 'creado_en')
    list_filter = ('distrito', 'tipo', 'activa')
    search_fields = ('nombre', 'distrito__nombre')
    autocomplete_fields = ['distrito']
