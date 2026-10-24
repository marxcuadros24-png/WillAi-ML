from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.geografia.models import Distrito, Comunidad


class Entidad(models.Model):
    class TipoEntidad(models.TextChoices):
        MUNICIPALIDAD = 'municipalidad', _('Municipalidad')
        OGRD = 'ogrd', _('OGRD (Gestión de Riesgos)')
        COEL = 'coel', _('COEL (Local)')
        COEP = 'coep', _('COEP (Provincial)')
        COER = 'coer', _('COER (Regional)')
        SERFOR = 'serfor', _('SERFOR')
        BOMBEROS = 'bomberos', _('Bomberos')
        COMUNIDAD = 'comunidad', _('Comunidad')
        POLICIA = 'policia', _('Policía Nacional')
        SALUD = 'salud', _('Sector Salud')
        OTRA = 'otra', _('Otra')

    id_entidad = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=180, verbose_name='Nombre de la Entidad')
    tipo = models.CharField(
        max_length=40,
        choices=TipoEntidad.choices,
        default=TipoEntidad.OTRA,
        verbose_name='Tipo de Entidad'
    )
    sigla = models.CharField(max_length=40, null=True, blank=True, verbose_name='Sigla')
    telefono_operativo = models.CharField(max_length=30, null=True, blank=True, verbose_name='Teléfono Operativo')
    correo_operativo = models.EmailField(max_length=254, null=True, blank=True, verbose_name='Correo Operativo')
    distrito = models.ForeignKey(
        Distrito,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_distrito',
        related_name='entidades',
        verbose_name='Distrito'
    )
    activa = models.BooleanField(default=True, verbose_name='Activa')

    class Meta:
        db_table = 'entidades'
        verbose_name = 'Entidad de Respuesta'
        verbose_name_plural = 'Entidades de Respuesta'
        ordering = ['nombre']

    def __str__(self):
        sigla_str = f" ({self.sigla})" if self.sigla else ""
        return f"{self.nombre}{sigla_str}"


class Brigada(models.Model):
    class TipoBrigada(models.TextChoices):
        COMUNAL = 'comunal', _('Comunal')
        BOMBEROS = 'bomberos', _('Bomberos')
        MUNICIPAL = 'municipal', _('Municipal')
        FORESTAL = 'forestal', _('Forestal Especializada')
        OTRA = 'otra', _('Otra')

    class EstadoBrigada(models.TextChoices):
        DISPONIBLE = 'disponible', _('Disponible')
        OCUPADA = 'ocupada', _('Ocupada / En Operación')
        DESPLEGADA = 'desplegada', _('Desplegada en Incidente')
        INACTIVA = 'inactiva', _('Inactiva')

    id_brigada = models.BigAutoField(primary_key=True)
    entidad = models.ForeignKey(
        Entidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_entidad',
        related_name='brigadas',
        verbose_name='Entidad Perteneciente'
    )
    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_comunidad',
        related_name='brigadas',
        verbose_name='Comunidad Base'
    )
    nombre = models.CharField(max_length=150, verbose_name='Nombre de la Brigada')
    tipo = models.CharField(
        max_length=40,
        choices=TipoBrigada.choices,
        default=TipoBrigada.COMUNAL,
        verbose_name='Tipo de Brigada'
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoBrigada.choices,
        default=EstadoBrigada.DISPONIBLE,
        verbose_name='Estado'
    )
    telefono_contacto = models.CharField(max_length=30, null=True, blank=True, verbose_name='Teléfono de Contacto')
    latitud_base = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Latitud Base')
    longitud_base = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Longitud Base')
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Creada el')

    class Meta:
        db_table = 'brigadas'
        verbose_name = 'Brigada'
        verbose_name_plural = 'Brigadas'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()} - {self.get_estado_display()})"


class Brigadista(models.Model):
    brigada = models.ForeignKey(
        Brigada,
        on_delete=models.CASCADE,
        db_column='id_brigada',
        related_name='integrantes',
        verbose_name='Brigada'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='perfiles_brigadista',
        verbose_name='Usuario'
    )
    funcion = models.CharField(max_length=100, default='integrante', verbose_name='Función / Rol en Brigada')
    desde = models.DateField(verbose_name='Fecha de Inicio')
    hasta = models.DateField(null=True, blank=True, verbose_name='Fecha de Fin')
    activo = models.BooleanField(default=True, verbose_name='Activo')

    class Meta:
        db_table = 'brigadistas'
        unique_together = (('brigada', 'usuario', 'desde'),)
        verbose_name = 'Brigadista'
        verbose_name_plural = 'Brigadistas'
        ordering = ['-activo', 'brigada', 'usuario']

    def __str__(self):
        return f"{self.usuario.get_full_name() or self.usuario.username} ({self.funcion} en {self.brigada.nombre})"


class RecursoEmergencia(models.Model):
    class CategoriaRecurso(models.TextChoices):
        VEHICULO = 'vehiculo', _('Vehículo')
        HERRAMIENTA = 'herramienta', _('Herramienta (Batefuegos, Palas, etc.)')
        PROTECCION = 'proteccion', _('Equipo de Protección Personal (EPP)')
        AGUA = 'agua', _('Tanques y Equipos de Agua')
        COMUNICACION = 'comunicacion', _('Radios y Comunicación')
        BOTIQUIN = 'botiquin', _('Botiquín / Primeros Auxilios')
        OTRO = 'otro', _('Otro')

    class EstadoRecurso(models.TextChoices):
        DISPONIBLE = 'disponible', _('Disponible')
        ASIGNADO = 'asignado', _('Asignado a Operación')
        MANTENIMIENTO = 'mantenimiento', _('En Mantenimiento')
        INOPERATIVO = 'inoperativo', _('Inoperativo')

    id_recurso = models.BigAutoField(primary_key=True)
    entidad = models.ForeignKey(
        Entidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_entidad',
        related_name='recursos',
        verbose_name='Entidad Propietaria'
    )
    brigada = models.ForeignKey(
        Brigada,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_brigada',
        related_name='recursos',
        verbose_name='Brigada Asignada'
    )
    nombre = models.CharField(max_length=150, verbose_name='Nombre del Recurso')
    categoria = models.CharField(
        max_length=40,
        choices=CategoriaRecurso.choices,
        default=CategoriaRecurso.OTRO,
        verbose_name='Categoría'
    )
    cantidad = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    estado = models.CharField(
        max_length=30,
        choices=EstadoRecurso.choices,
        default=EstadoRecurso.DISPONIBLE,
        verbose_name='Estado'
    )
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Latitud Ubicación')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Longitud Ubicación')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado el')

    class Meta:
        db_table = 'recursos_emergencia'
        verbose_name = 'Recurso de Emergencia'
        verbose_name_plural = 'Recursos de Emergencia'
        ordering = ['categoria', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.cantidad} unid. - {self.get_estado_display()})"
