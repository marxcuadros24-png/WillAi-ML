from django.db import models
from django.utils.translation import gettext_lazy as _


class Distrito(models.Model):
    id_distrito = models.BigAutoField(primary_key=True)
    ubigeo = models.CharField(max_length=6, unique=True, null=True, blank=True, verbose_name='Código Ubigeo')
    nombre = models.CharField(max_length=120, verbose_name='Nombre del Distrito')
    provincia = models.CharField(max_length=120, default='Parinacochas', verbose_name='Provincia')
    departamento = models.CharField(max_length=120, default='Ayacucho', verbose_name='Departamento')
    latitud_centro = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Latitud Centro')
    longitud_centro = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Longitud Centro')
    limite_geojson = models.JSONField(null=True, blank=True, verbose_name='Límite Poligonal (GeoJSON)')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')

    class Meta:
        db_table = 'distritos'
        verbose_name = 'Distrito'
        verbose_name_plural = 'Distritos'
        unique_together = (('departamento', 'provincia', 'nombre'),)
        ordering = ['departamento', 'provincia', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.provincia}, {self.departamento})"


class Comunidad(models.Model):
    class TipoComunidad(models.TextChoices):
        COMUNIDAD_CAMPESINA = 'comunidad_campesina', _('Comunidad Campesina')
        CENTRO_POBLADO = 'centro_poblado', _('Centro Poblado')
        ANEXO = 'anexo', _('Anexo')
        SECTOR = 'sector', _('Sector')
        OTRO = 'otro', _('Otro')

    id_comunidad = models.BigAutoField(primary_key=True)
    distrito = models.ForeignKey(
        Distrito,
        on_delete=models.RESTRICT,
        db_column='id_distrito',
        related_name='comunidades',
        verbose_name='Distrito'
    )
    nombre = models.CharField(max_length=150, verbose_name='Nombre de la Comunidad')
    tipo = models.CharField(
        max_length=30,
        choices=TipoComunidad.choices,
        default=TipoComunidad.OTRO,
        verbose_name='Tipo de asentamiento'
    )
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Latitud Centro')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Longitud Centro')
    limite_geojson = models.JSONField(null=True, blank=True, verbose_name='Límite Poligonal (GeoJSON)')
    activa = models.BooleanField(default=True, verbose_name='Activa')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')

    class Meta:
        db_table = 'comunidades'
        verbose_name = 'Comunidad'
        verbose_name_plural = 'Comunidades'
        unique_together = (('distrito', 'nombre'),)
        ordering = ['distrito', 'nombre']

    def __str__(self):
        return f"{self.nombre} - {self.distrito.nombre} ({self.get_tipo_display()})"
