from django.contrib import admin
from .models import Donante, OfertaDonacion, ItemOfertaDonacion, AsignacionDonacion, HistorialOfertaDonacion


class ItemOfertaDonacionInline(admin.TabularInline):
    model = ItemOfertaDonacion
    extra = 1


class HistorialOfertaDonacionInline(admin.TabularInline):
    model = HistorialOfertaDonacion
    extra = 0
    readonly_fields = ('estado_anterior', 'estado_nuevo', 'comentario', 'usuario', 'ocurrido_en')


@admin.register(Donante)
class DonanteAdmin(admin.ModelAdmin):
    list_display = ('id_donante', 'nombre_publico', 'tipo_donante', 'telefono_contacto', 'verificado', 'estado')
    list_filter = ('tipo_donante', 'verificado', 'estado')
    search_fields = ('nombre_publico', 'identificador_fiscal', 'telefono_contacto')


@admin.register(OfertaDonacion)
class OfertaDonacionAdmin(admin.ModelAdmin):
    list_display = ('id_oferta', 'titulo', 'donante', 'distrito', 'modalidad_entrega', 'estado', 'creada_en')
    list_filter = ('estado', 'modalidad_entrega', 'distrito')
    search_fields = ('titulo', 'descripcion', 'donante__nombre_publico')
    inlines = [ItemOfertaDonacionInline, HistorialOfertaDonacionInline]


@admin.register(ItemOfertaDonacion)
class ItemOfertaDonacionAdmin(admin.ModelAdmin):
    list_display = ('id_item_donacion', 'nombre_item', 'oferta', 'categoria', 'cantidad_disponible', 'cantidad_ofrecida', 'unidad')
    list_filter = ('categoria', 'condicion', 'requiere_cadena_frio')
    search_fields = ('nombre_item', 'descripcion', 'oferta__titulo')


@admin.register(AsignacionDonacion)
class AsignacionDonacionAdmin(admin.ModelAdmin):
    list_display = ('id_asignacion_donacion', 'item_donacion', 'cantidad_asignada', 'incidente', 'brigada', 'entidad', 'estado', 'solicitada_en')
    list_filter = ('estado',)
    search_fields = ('item_donacion__nombre_item', 'observaciones')
