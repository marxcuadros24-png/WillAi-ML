from django.contrib import admin
from .models import ModeloPredictivo, EjecucionModelo, Prediccion


class PrediccionInline(admin.TabularInline):
    model = Prediccion
    extra = 0
    fields = ('nivel', 'probabilidad', 'horizonte_desde', 'horizonte_hasta', 'creada_en')
    readonly_fields = ('creada_en',)


@admin.register(ModeloPredictivo)
class ModeloPredictivoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'version', 'algoritmo', 'estado', 'creado_en')
    list_filter = ('estado', 'algoritmo')
    search_fields = ('nombre', 'version', 'descripcion')


@admin.register(EjecucionModelo)
class EjecucionModeloAdmin(admin.ModelAdmin):
    list_display = ('id_ejecucion', 'modelo', 'estado', 'incidente', 'iniciado_en', 'finalizado_en')
    list_filter = ('estado', 'modelo', 'iniciado_en')
    search_fields = ('modelo__nombre', 'resumen_error')
    inlines = [PrediccionInline]


@admin.register(Prediccion)
class PrediccionAdmin(admin.ModelAdmin):
    list_display = ('id_prediccion', 'nivel', 'probabilidad', 'horizonte_desde', 'horizonte_hasta', 'creada_en')
    list_filter = ('nivel', 'creada_en')
    readonly_fields = ('creada_en',)
