import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _


class Rol(models.Model):
    id_rol = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=60, unique=True, verbose_name='Código')
    nombre = models.CharField(max_length=100, verbose_name='Nombre')
    descripcion = models.CharField(max_length=500, blank=True, null=True, verbose_name='Descripción')
    sistema = models.BooleanField(default=False, verbose_name='Es del sistema')

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class Permiso(models.Model):
    id_permiso = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=100, unique=True, verbose_name='Código')
    descripcion = models.CharField(max_length=500, blank=True, null=True, verbose_name='Descripción')

    class Meta:
        db_table = 'permisos'
        verbose_name = 'Permiso personalizado'
        verbose_name_plural = 'Permisos personalizados'
        ordering = ['codigo']

    def __str__(self):
        return self.codigo


class RolPermiso(models.Model):
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, db_column='id_rol', related_name='rol_permisos')
    permiso = models.ForeignKey(Permiso, on_delete=models.CASCADE, db_column='id_permiso', related_name='permiso_roles')

    class Meta:
        db_table = 'rol_permisos'
        unique_together = (('rol', 'permiso'),)
        verbose_name = 'Permiso de Rol'
        verbose_name_plural = 'Permisos de Roles'

    def __str__(self):
        return f"{self.rol.codigo} -> {self.permiso.codigo}"


class UsuarioManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        email = self.normalize_email(email) if email else ''
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('estado', 'activo')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, email, password, **extra_fields)


class Usuario(AbstractUser):
    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', _('Pendiente')
        ACTIVO = 'activo', _('Activo')
        SUSPENDIDO = 'suspendido', _('Suspendido')
        ELIMINADO = 'eliminado', _('Eliminado')

    id_usuario = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    nombre_visible = models.CharField(max_length=160, null=True, blank=True, verbose_name='Nombre visible')
    telefono = models.CharField(max_length=30, unique=True, null=True, blank=True, verbose_name='Teléfono')
    idioma_preferido = models.CharField(
        max_length=5,
        default='es',
        choices=[('es', 'Español'), ('qu', 'Quechua Chanka')],
        verbose_name='Idioma preferido'
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.ACTIVO,
        verbose_name='Estado de la cuenta'
    )
    verificado_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de verificación')
    ultimo_acceso_en = models.DateTimeField(null=True, blank=True, verbose_name='Último acceso')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado el')

    roles = models.ManyToManyField(
        Rol,
        through='UsuarioRol',
        through_fields=('usuario', 'rol'),
        related_name='usuarios',
        blank=True
    )

    objects = UsuarioManager()

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-creado_en']

    def __str__(self):
        nombre = self.nombre_visible or self.get_full_name() or self.username
        return f"{nombre} ({self.username})"

    @property
    def nombre_completo(self):
        return self.nombre_visible or self.get_full_name() or self.username

    def tiene_rol(self, codigo_rol):
        return self.roles.filter(codigo=codigo_rol).exists()

    def tiene_permiso(self, codigo_permiso):
        return Permiso.objects.filter(
            codigo=codigo_permiso,
            permiso_roles__rol__in=self.roles.all()
        ).exists()


class UsuarioRol(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='id_usuario', related_name='usuario_roles')
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, db_column='id_rol', related_name='rol_usuarios')
    asignado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='asignado_por',
        related_name='roles_que_asigno'
    )
    asignado_en = models.DateTimeField(auto_now_add=True, verbose_name='Asignado el')

    class Meta:
        db_table = 'usuario_roles'
        unique_together = (('usuario', 'rol'),)
        verbose_name = 'Rol de Usuario'
        verbose_name_plural = 'Roles de Usuarios'

    def __str__(self):
        return f"{self.usuario.username} -> {self.rol.nombre}"
