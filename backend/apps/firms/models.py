from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.incidentes.models import Incidente


class FuenteSatelital(models.Model):
    class TipoProducto(models.TextChoices):
        NRT = 'NRT', _('Near Real-Time (~3h)')
        STANDARD = 'STANDARD', _('Standard Science Quality')
        ARCHIVE = 'ARCHIVE', _('Historical Archive')
        OTRO = 'OTRO', _('Otro')

    id_fuente = models.BigAutoField(primary_key=True)
    codigo_producto = models.CharField(max_length=80, unique=True, verbose_name='Código de Producto (VIIRS_NOAA20_NRT, etc.)')
    proveedor = models.CharField(max_length=100, default='NASA FIRMS', verbose_name='Proveedor')
    sensor = models.CharField(max_length=50, verbose_name='Sensor (VIIRS, MODIS)')
    plataforma = models.CharField(max_length=80, null=True, blank=True, verbose_name='Plataforma / Satélite (NOAA-20, Terra, Aqua)')
    tipo_producto = models.CharField(
        max_length=30,
        choices=TipoProducto.choices,
        default=TipoProducto.NRT,
        verbose_name='Tipo de Producto'
    )
    documentacion_url = models.CharField(max_length=500, null=True, blank=True, verbose_name='URL de Documentación')
    activa = models.BooleanField(default=True, verbose_name='Activa')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')

    class Meta:
        db_table = 'fuentes_satelitales'
        verbose_name = 'Fuente Satelital'
        verbose_name_plural = 'Fuentes Satelitales'
        ordering = ['proveedor', 'codigo_producto']

    def __str__(self):
        return f"{self.proveedor} - {self.sensor} ({self.codigo_producto})"


class LoteImportacionFirms(models.Model):
    class EstadoLote(models.TextChoices):
        INICIADO = 'iniciado', _('Iniciado')
        COMPLETADO = 'completado', _('Completado')
        PARCIAL = 'parcial', _('Parcial')
        FALLIDO = 'fallido', _('Fallido')

    id_lote = models.BigAutoField(primary_key=True)
    fuente = models.ForeignKey(
        FuenteSatelital,
        on_delete=models.CASCADE,
        db_column='id_fuente',
        related_name='lotes',
        verbose_name='Fuente Satelital'
    )
    identificador_lote = models.CharField(max_length=160, unique=True, verbose_name='Identificador Único del Lote')
    consulta_desde = models.DateTimeField(null=True, blank=True, verbose_name='Consulta Desde')
    consulta_hasta = models.DateTimeField(null=True, blank=True, verbose_name='Consulta Hasta')
    bbox_geojson = models.JSONField(null=True, blank=True, verbose_name='Bounding Box (GeoJSON)')
    estado = models.CharField(
        max_length=30,
        choices=EstadoLote.choices,
        default=EstadoLote.INICIADO,
        verbose_name='Estado'
    )
    filas_recibidas = models.PositiveIntegerField(default=0, verbose_name='Filas Recibidas')
    filas_insertadas = models.PositiveIntegerField(default=0, verbose_name='Filas Nuevas Insertadas')
    filas_actualizadas = models.PositiveIntegerField(default=0, verbose_name='Filas Actualizadas')
    filas_omitidas = models.PositiveIntegerField(default=0, verbose_name='Filas Omitidas')
    checksum_archivo = models.CharField(max_length=64, null=True, blank=True, verbose_name='Checksum SHA-256')
    iniciado_en = models.DateTimeField(auto_now_add=True, verbose_name='Iniciado el')
    finalizado_en = models.DateTimeField(null=True, blank=True, verbose_name='Finalizado el')
    error_detalle = models.TextField(null=True, blank=True, verbose_name='Detalle de Error')

    class Meta:
        db_table = 'lotes_importacion_firms'
        verbose_name = 'Lote de Importación FIRMS'
        verbose_name_plural = 'Lotes de Importación FIRMS'
        ordering = ['-iniciado_en']

    def __str__(self):
        return f"Lote {self.identificador_lote} ({self.get_estado_display()} - {self.filas_insertadas} insertadas)"


class DeteccionSatelital(models.Model):
    id_deteccion = models.BigAutoField(primary_key=True)
    fuente = models.ForeignKey(
        FuenteSatelital,
        on_delete=models.CASCADE,
        db_column='id_fuente',
        related_name='detecciones',
        verbose_name='Fuente Satelital'
    )
    lote_primero = models.ForeignKey(
        LoteImportacionFirms,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_lote_primero',
        related_name='detecciones_primeras',
        verbose_name='Primer Lote de Ingesta'
    )
    clave_deteccion = models.CharField(max_length=64, unique=True, verbose_name='Clave Hash Única de Detección')
    fecha_observacion = models.DateTimeField(verbose_name='Fecha y Hora de Observación Satelital')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Latitud')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Longitud')
    frp_mw = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True, verbose_name='Potencia Radiativa de Fuego (MW)')
    confianza = models.CharField(max_length=40, null=True, blank=True, verbose_name='Nivel de Confianza (nominal / low / high)')
    confianza_numerica = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True, verbose_name='Confianza (%)')
    brillo_kelvin = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, verbose_name='Temperatura de Brillo (K)')
    scan_km = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, verbose_name='Resolución Scan (km)')
    track_km = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, verbose_name='Resolución Track (km)')
    dia_noche = models.CharField(max_length=1, null=True, blank=True, verbose_name='Día (D) / Noche (N)')
    codigo_satelite = models.CharField(max_length=40, null=True, blank=True, verbose_name='Código Satélite')
    codigo_instrumento = models.CharField(max_length=40, null=True, blank=True, verbose_name='Código Instrumento')
    version_producto = models.CharField(max_length=80, null=True, blank=True, verbose_name='Versión del Producto')
    datos_originales = models.JSONField(null=True, blank=True, verbose_name='Datos Originales RAW (JSON)')
    primera_importacion_en = models.DateTimeField(auto_now_add=True, verbose_name='Primera Importación')
    ultima_actualizacion_en = models.DateTimeField(auto_now=True, verbose_name='Última Actualización')

    incidentes_asociados = models.ManyToManyField(
        Incidente,
        through='DeteccionIncidente',
        related_name='detecciones_satelitales',
        blank=True
    )

    class Meta:
        db_table = 'detecciones_satelitales'
        verbose_name = 'Detección Satelital (Foco de Calor)'
        verbose_name_plural = 'Detecciones Satelitales (Focos de Calor)'
        ordering = ['-fecha_observacion']
        indexes = [
            models.Index(fields=['fecha_observacion'], name='idx_det_fecha'),
            models.Index(fields=['latitud', 'longitud'], name='idx_det_coords'),
            models.Index(fields=['fuente', 'fecha_observacion'], name='idx_det_fuente_fecha'),
        ]

    def __str__(self):
        return f"Foco #{self.id_deteccion} en ({self.latitud}, {self.longitud}) - {self.fecha_observacion.strftime('%Y-%m-%d %H:%M')}"


class LoteDeteccionesFirms(models.Model):
    class EstadoFila(models.TextChoices):
        INSERTADA = 'insertada', _('Insertada')
        EXISTENTE = 'existente', _('Existente')
        ACTUALIZADA = 'actualizada', _('Actualizada')
        OMITIDA = 'omitida', _('Omitida')

    lote = models.ForeignKey(LoteImportacionFirms, on_delete=models.CASCADE, db_column='id_lote', related_name='filas')
    deteccion = models.ForeignKey(DeteccionSatelital, on_delete=models.CASCADE, db_column='id_deteccion', related_name='lotes')
    estado_fila = models.CharField(max_length=30, choices=EstadoFila.choices, default=EstadoFila.EXISTENTE)
    hash_fila = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        db_table = 'lote_detecciones_firms'
        unique_together = (('lote', 'deteccion'),)
        verbose_name = 'Vínculo Lote-Detección'
        verbose_name_plural = 'Vínculos Lotes-Detecciones'


class DeteccionIncidente(models.Model):
    class MetodoVinculo(models.TextChoices):
        MANUAL = 'manual', _('Manual por Operador')
        REGLA_ESPACIAL = 'regla_espacial', _('Proximidad Espacial Automática')
        ANALISIS_OPERATIVO = 'analisis_operativo', _('Análisis Operativo')

    deteccion = models.ForeignKey(DeteccionSatelital, on_delete=models.CASCADE, db_column='id_deteccion', related_name='vinculos_incidentes')
    incidente = models.ForeignKey(Incidente, on_delete=models.CASCADE, db_column='id_incidente', related_name='vinculos_detecciones')
    metodo_vinculo = models.CharField(max_length=40, choices=MetodoVinculo.choices, default=MetodoVinculo.MANUAL)
    vinculado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, db_column='vinculado_por')
    confianza_vinculo = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    vinculado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deteccion_incidente'
        unique_together = (('deteccion', 'incidente'),)
        verbose_name = 'Vínculo Detección-Incidente'
        verbose_name_plural = 'Vínculos Detecciones-Incidentes'

    def __str__(self):
        return f"Detección #{self.deteccion_id} -> Incidente {self.incidente.codigo}"
