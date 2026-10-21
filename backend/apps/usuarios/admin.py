from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Rol, Permiso, UsuarioRol, RolPermiso


class UsuarioRolInline(admin.TabularInline):
    model = UsuarioRol
    extra = 1
    fk_name = 'usuario'
    autocomplete_fields = ['rol']


class RolPermisoInline(admin.TabularInline):
    model = RolPermiso
    extra = 1
    autocomplete_fields = ['permiso']


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'nombre_visible', 'email', 'telefono', 'estado', 'is_staff', 'creado_en')
    list_filter = ('estado', 'is_staff', 'is_superuser', 'is_active', 'creado_en')
    search_fields = ('username', 'nombre_visible', 'first_name', 'last_name', 'email', 'telefono')
    ordering = ('-creado_en',)
    inlines = [UsuarioRolInline]

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información Personal', {'fields': ('first_name', 'last_name', 'nombre_visible', 'email', 'telefono')}),
        ('Estado y Accesos', {'fields': ('estado', 'verificado_en', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas Importantes', {'fields': ('last_login', 'ultimo_acceso_en', 'creado_en', 'actualizado_en')}),
    )
    readonly_fields = ('creado_en', 'actualizado_en', 'last_login')


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'sistema', 'cantidad_usuarios')
    list_filter = ('sistema',)
    search_fields = ('codigo', 'nombre', 'descripcion')
    inlines = [RolPermisoInline]

    def cantidad_usuarios(self, obj):
        return obj.usuarios.count()
    cantidad_usuarios.short_description = 'Usuarios con este rol'


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'descripcion')
    search_fields = ('codigo', 'descripcion')


@admin.register(UsuarioRol)
class UsuarioRolAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'rol', 'asignado_por', 'asignado_en')
    list_filter = ('rol', 'asignado_en')
    search_fields = ('usuario__username', 'usuario__email', 'rol__nombre')
    autocomplete_fields = ['usuario', 'rol']
