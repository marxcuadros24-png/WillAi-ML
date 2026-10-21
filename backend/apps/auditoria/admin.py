from django.contrib import admin
from .models import Auditoria


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ('id_auditoria', 'usuario', 'accion', 'entidad', 'id_registro', 'ip_hash', 'ocurrido_en')
    list_filter = ('accion', 'entidad', 'ocurrido_en')
    search_fields = ('accion', 'entidad', 'id_registro', 'usuario__username', 'ip_hash')
    readonly_fields = ('id_auditoria', 'usuario', 'accion', 'entidad', 'id_registro', 'ip_hash', 'detalles', 'ocurrido_en')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
