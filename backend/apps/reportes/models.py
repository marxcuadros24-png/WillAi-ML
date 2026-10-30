import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.geografia.models import Comunidad


class Reporte(models.Model):
    class TipoIncendio(models.TextChoices):
        FORESTAL = 'forestal', _('Forestal')
        AGRICOLA = 'agricola', _('Agrícola')
        PASTIZAL = 'pastizal', _('Pastizal / Pajonal')
        RESIDENCIAL = 'residencial', _('Residencial / Urbano')
        OTRO = 'otro', _('Otro')
        DESCONOCIDO = 'desconocido', _('Desconocido')

    class DireccionViento(models.TextChoices):
        N = 'N', _('Norte')
        NE = 'NE', _('Noreste')
        E = 'E', _('Este')
        SE = 'SE', _('Sureste')
        S = 'S', _('Sur')
        SO = 'SO', _('Suroeste')
        O = 'O', _('Oeste')
        NO = 'NO', _('Noroeste')
        DESCONOCIDA = 'desconocida', _('Desconocida / Sin Viento')

    class EstadoReporte(models.TextChoices):
        RECIBIDO = 'recibido', _('Recibido')
        PENDIENTE_REVISION = 'pendiente_revision', _('Pendiente de Revisión')
        EN_REVISION = 'en_revision', _('En Revisión')
        VALIDADO = 'validado', _('Validado')
        OBSERVADO = 'observado', _('Observado')
        RECHAZADO = 'rechazado', _('Rechazado')
        VINCULADO = 'vinculado', _('Vinculado a Incidente')
        CERRADO = 'cerrado', _('Cerrado')

    class OrigenReporte(models.TextChoices):
        WEB = 'web', _('Web')
        MOVIL = 'movil', _('App Móvil')
        OFFLINE_SINCRONIZADO = 'offline_sincronizado', _('Offline Sincronizado')
        OPERADOR = 'operador', _('Operador de Emergencia')

    id_reporte = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='reportes',
        verbose_name='Usuario Reportante'
    )
    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_comunidad',
        related_name='reportes',
        verbose_name='Comunidad Cercana'
    )
    tipo_incendio = models.CharField(
        max_length=30,
        choices=TipoIncendio.choices,
        default=TipoIncendio.DESCONOCIDO,
        verbose_name='Tipo de Incendio'
    )
    fecha_evento = models.DateTimeField(verbose_name='Fecha y Hora del Avistamiento')
    descripcion = models.TextField(null=True, blank=True, verbose_name='Descripción / Observaciones')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Latitud')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Longitud')
    precision_metros = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Precisión GPS (metros)'
    )
    direccion_viento = models.CharField(
        max_length=20,
        choices=DireccionViento.choices,
        default=DireccionViento.DESCONOCIDA,
        verbose_name='Dirección del Viento'
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoReporte.choices,
        default=EstadoReporte.RECIBIDO,
        verbose_name='Estado del Reporte'
    )
    origen = models.CharField(
        max_length=30,
        choices=OrigenReporte.choices,
        default=OrigenReporte.MOVIL,
        verbose_name='Canal de Origen'
    )
    autoriza_publicacion = models.BooleanField(
        default=False,
        verbose_name='Autoriza publicación de identidad'
    )
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrado el')
    sincronizado_en = models.DateTimeField(null=True, blank=True, verbose_name='Sincronizado el')

    class Meta:
        db_table = 'reportes'
        verbose_name = 'Reporte Ciudadano'
        verbose_name_plural = 'Reportes Ciudadanos'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['estado', 'fecha_evento'], name='idx_rep_estado_fecha'),
            models.Index(fields=['latitud', 'longitud'], name='idx_rep_lat_lon'),
        ]

    def __str__(self):
        return f"Reporte #{self.id_reporte} - {self.get_tipo_incendio_display()} ({self.get_estado_display()})"


class Evidencia(models.Model):
    class TipoEvidencia(models.TextChoices):
        FOTOGRAFIA = 'fotografia', _('Fotografía')
        VIDEO = 'video', _('Video')
        AUDIO = 'audio', _('Audio')
        DOCUMENTO = 'documento', _('Documento')
        OTRO = 'otro', _('Otro')

    id_evidencia = models.BigAutoField(primary_key=True)
    reporte = models.ForeignKey(
        Reporte,
        on_delete=models.CASCADE,
        db_column='id_reporte',
        related_name='evidencias',
        verbose_name='Reporte'
    )
    tipo = models.CharField(
        max_length=30,
        choices=TipoEvidencia.choices,
        default=TipoEvidencia.FOTOGRAFIA,
        verbose_name='Tipo de Evidencia'
    )
    archivo = models.FileField(
        upload_to='evidencias/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='Archivo subido'
    )
    uri_archivo = models.CharField(max_length=1000, verbose_name='URI o URL del Archivo')
    nombre_original = models.CharField(max_length=255, null=True, blank=True, verbose_name='Nombre Original')
    mime_type = models.CharField(max_length=120, null=True, blank=True, verbose_name='MIME Type')
    tamano_bytes = models.BigIntegerField(null=True, blank=True, verbose_name='Tamaño (Bytes)')
    sha256 = models.CharField(max_length=64, null=True, blank=True, unique=True, verbose_name='Hash SHA-256')
    capturada_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Captura')
    metadatos = models.JSONField(null=True, blank=True, verbose_name='Metadatos EXIF / Dispositivo')
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Creada el')

    class Meta:
        db_table = 'evidencias'
        verbose_name = 'Evidencia'
        verbose_name_plural = 'Evidencias'
        ordering = ['creada_en']

    def __str__(self):
        return f"Evidencia #{self.id_evidencia} ({self.get_tipo_display()}) para Reporte #{self.reporte_id}"


class Sincronizacion(models.Model):
    class TipoRegistro(models.TextChoices):
        REPORTE = 'reporte', _('Reporte')
        EVIDENCIA = 'evidencia', _('Evidencia')
        OTRO = 'otro', _('Otro')

    class EstadoSync(models.TextChoices):
        RECIBIDO = 'recibido', _('Recibido')
        PROCESANDO = 'procesando', _('Procesando')
        SINCRONIZADO = 'sincronizado', _('Sincronizado')
        ERROR = 'error', _('Error')

    id_sincronizacion = models.BigAutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='sincronizaciones',
        verbose_name='Usuario'
    )
    uuid_dispositivo = models.CharField(max_length=36, verbose_name='UUID Dispositivo Móvil')
    uuid_registro_cliente = models.CharField(max_length=36, verbose_name='UUID Registro Local en Móvil')
    tipo_registro = models.CharField(
        max_length=30,
        choices=TipoRegistro.choices,
        verbose_name='Tipo de Registro'
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoSync.choices,
        default=EstadoSync.RECIBIDO,
        verbose_name='Estado de Sincronización'
    )
    error_detalle = models.CharField(max_length=1000, null=True, blank=True, verbose_name='Detalle del Error')
    recibido_en = models.DateTimeField(auto_now_add=True, verbose_name='Recibido el')
    procesado_en = models.DateTimeField(null=True, blank=True, verbose_name='Procesado el')

    class Meta:
        db_table = 'sincronizaciones'
        unique_together = (('usuario', 'uuid_dispositivo', 'uuid_registro_cliente'),)
        verbose_name = 'Sincronización Offline'
        verbose_name_plural = 'Sincronizaciones Offline'
        ordering = ['-recibido_en']

    def __str__(self):
        return f"Sync {self.tipo_registro} ({self.estado}) - {self.uuid_registro_cliente}"


class ValidacionReporte(models.Model):
    class ResultadoValidacion(models.TextChoices):
        PENDIENTE = 'pendiente', _('Pendiente')
        VALIDADO = 'validado', _('Validado (Positivo)')
        OBSERVADO = 'observado', _('Observado (Requiere más datos)')
        RECHAZADO = 'rechazado', _('Rechazado (Falsa alarma / Inválido)')

    id_validacion = models.BigAutoField(primary_key=True)
    reporte = models.ForeignKey(
        Reporte,
        on_delete=models.CASCADE,
        db_column='id_reporte',
        related_name='validaciones',
        verbose_name='Reporte'
    )
    revisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        db_column='id_revisor',
        related_name='reportes_validados',
        verbose_name='Usuario Validador'
    )
    resultado = models.CharField(
        max_length=30,
        choices=ResultadoValidacion.choices,
        verbose_name='Resultado de la Evaluación'
    )
    comentario = models.TextField(null=True, blank=True, verbose_name='Comentario / Justificación')
    validado_en = models.DateTimeField(auto_now_add=True, verbose_name='Validado el')

    class Meta:
        db_table = 'validaciones_reporte'
        verbose_name = 'Validación de Reporte'
        verbose_name_plural = 'Validaciones de Reportes'
        ordering = ['-validado_en']

    def __str__(self):
        return f"Validación #{self.id_validacion}: {self.get_resultado_display()} para Reporte #{self.reporte_id}"
