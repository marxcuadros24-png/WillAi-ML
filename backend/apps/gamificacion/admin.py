from django.contrib import admin
from .models import Insignia, ActividadUsuario, UsuarioInsignia


@admin.register(Insignia)
class InsigniaAdmin(admin.ModelAdmin):
    list_display = ('id_insignia', 'codigo', 'nombre', 'activa', 'creada_en')
    search_fields = ('codigo', 'nombre', 'descripcion')
    list_filter = ('activa',)


@admin.register(ActividadUsuario)
class ActividadUsuarioAdmin(admin.ModelAdmin):
    list_display = ('id_actividad', 'usuario', 'tipo_actividad', 'estado', 'ocurrida_en', 'validada_por')
    list_filter = ('estado', 'tipo_actividad')
    search_fields = ('usuario__username', 'usuario__nombre_completo', 'tipo_actividad')


@admin.register(UsuarioInsignia)
class UsuarioInsigniaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'insignia', 'desbloqueada_en', 'otorgada_por')
    list_filter = ('insignia',)
    search_fields = ('usuario__username', 'insignia__nombre')
