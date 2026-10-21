import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.incidentes.models import Incidente
from apps.meteorologia.models import ZonaRiesgo, Vivienda


class AlertaEmergencia(models.Model):
    class TipoAlerta(models.TextChoices):
        NUEVO_INCENDIO = 'nuevo_incendio', _('Nuevo Incendio Reportado')
        RIESGO_VIVIENDA = 'riesgo_vivienda', _('Alerta de Riesgo a Viviendas')
        CAMBIO_ESTADO = 'cambio_estado', _('Actualización Operativa')
        EVACUACION = 'evacuacion', _('Orden de Evacuación Preventiva')
        PREVENCION = 'prevencion', _('Aviso Preventivo Meteorológico')
        SISTEMA = 'sistema', _('Mensaje de Sistema')
        OTRO = 'otro', _('Otro')

    class PrioridadAlerta(models.TextChoices):
        INFORMATIVA = 'informativa', _('Informativa')
        BAJA = 'baja', _('Baja')
        MEDIA = 'media', _('Media')
        ALTA = 'alta', _('Alta (Urgente)')
        CRITICA = 'critica', _('Crítica (Peligro Inminente)')

    class EstadoAlerta(models.TextChoices):
        BORRADOR = 'borrador', _('Borrador')
        PENDIENTE_APROBACION = 'pendiente_aprobacion', _('Pendiente de Aprobación')
        PROGRAMADA = 'programada', _('Programada')
        ENVIANDO = 'enviando', _('Enviando Notificaciones')
        ENVIADA = 'enviada', _('Enviada')
        CANCELADA = 'cancelada', _('Cancelada')
        EXPIRADA = 'expirada', _('Expirada')

    id_alerta = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_incidente',
        related_name='alertas',
        verbose_name='Incidente Relacionado'
    )
    zona_riesgo = models.ForeignKey(
        ZonaRiesgo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_zona_riesgo',
        related_name='alertas',
        verbose_name='Zona de Riesgo Afectada'
    )
    tipo = models.CharField(
        max_length=30,
        choices=TipoAlerta.choices,
        default=TipoAlerta.OTRO,
        verbose_name='Tipo de Alerta'
    )
    prioridad = models.CharField(
        max_length=30,
        choices=PrioridadAlerta.choices,
        default=PrioridadAlerta.MEDIA,
        verbose_name='Nivel de Prioridad'
    )
    titulo = models.CharField(max_length=200, verbose_name='Título de la Alerta')
    mensaje = models.TextField(verbose_name='Cuerpo del Mensaje')
    instrucciones = models.TextField(null=True, blank=True, verbose_name='Instrucciones para la Población / Brigadistas')
    estado = models.CharField(
        max_length=30,
        choices=EstadoAlerta.choices,
        default=EstadoAlerta.BORRADOR,
        verbose_name='Estado de Emisión'
    )
    emitida_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='emitida_por',
        related_name='alertas_emitidas',
        verbose_name='Operador Emisor'
    )
    aprobada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='aprobada_por',
        related_name='alertas_aprobadas',
        verbose_name='Autoridad Aprobador'
    )
    aprobada_en = models.DateTimeField(null=True, blank=True, verbose_name='Aprobada el')
    emitida_en = models.DateTimeField(null=True, blank=True, verbose_name='Emitida el')
    expira_en = models.DateTimeField(null=True, blank=True, verbose_name='Expira el')
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Creada el')

    class Meta:
        db_table = 'alertas_emergencia'
        verbose_name = 'Alerta de Emergencia'
        verbose_name_plural = 'Alertas de Emergencia'
        ordering = ['-creada_en']
        indexes = [
            models.Index(fields=['estado', 'prioridad'], name='idx_alt_estado_prio'),
        ]

    def __str__(self):
        return f"[{self.get_prioridad_display()}] {self.titulo} ({self.get_estado_display()})"


class PreferenciaNotificacion(models.Model):
    class Canal(models.TextChoices):
        PUSH = 'push', _('Notificación Push (App Móvil)')
        SMS = 'sms', _('Mensaje SMS')
        CORREO = 'correo', _('Correo Electrónico')
        WHATSAPP = 'whatsapp_integrado', _('WhatsApp')
        INTERNO = 'interno', _('Bandeja Interna')

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='preferencias_notificacion',
        verbose_name='Usuario'
    )
    canal = models.CharField(max_length=30, choices=Canal.choices, verbose_name='Canal de Alerta')
    habilitado = models.BooleanField(default=True, verbose_name='Habilitado')
    destino_verificado = models.BooleanField(default=False, verbose_name='Destino Verificado')
    destino = models.CharField(max_length=254, null=True, blank=True, verbose_name='Token Push, Teléfono o Correo')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado el')

    class Meta:
        db_table = 'preferencias_notificacion'
        unique_together = (('usuario', 'canal'),)
        verbose_name = 'Preferencia de Notificación'
        verbose_name_plural = 'Preferencias de Notificación'

    def __str__(self):
        return f"{self.usuario.username} - {self.get_canal_display()} ({'Activo' if self.habilitado else 'Inactivo'})"


class DestinatarioAlerta(models.Model):
    class MotivoDestino(models.TextChoices):
        SUSCRIPCION = 'suscripcion', _('Suscripción Territorial')
        VIVIENDA_EXPUESTA = 'vivienda_expuesta', _('Vivienda en Zona de Riesgo')
        BRIGADA_ASIGNADA = 'brigada_asignada', _('Brigada Asignada al Incidente')
        AUTORIDAD = 'autoridad', _('Autoridad de Protección Civil')
        OTRO = 'otro', _('Otro')

    class EstadoEntrega(models.TextChoices):
        PENDIENTE = 'pendiente', _('Pendiente')
        EN_COLA = 'en_cola', _('En Cola de Envío')
        ENVIADO = 'enviado', _('Enviado')
        ENTREGADO = 'entregado', _('Entregado al Dispositivo')
        FALLIDO = 'fallido', _('Fallido')
        CONFIRMADO = 'confirmado', _('Confirmado por el Usuario')
        NO_APLICA = 'no_aplica', _('No Aplica')

    id_destinatario_alerta = models.BigAutoField(primary_key=True)
    alerta = models.ForeignKey(
        AlertaEmergencia,
        on_delete=models.CASCADE,
        db_column='id_alerta',
        related_name='destinatarios',
        verbose_name='Alerta'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='alertas_recibidas',
        verbose_name='Usuario Destinatario'
    )
    vivienda = models.ForeignKey(
        Vivienda,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_vivienda',
        related_name='alertas_enviadas',
        verbose_name='Vivienda Vinculada'
    )
    canal = models.CharField(max_length=30, choices=PreferenciaNotificacion.Canal.choices, verbose_name='Canal de Entrega')
    motivo = models.CharField(max_length=30, choices=MotivoDestino.choices, default=MotivoDestino.OTRO, verbose_name='Motivo')
    estado_entrega = models.CharField(
        max_length=30,
        choices=EstadoEntrega.choices,
        default=EstadoEntrega.PENDIENTE,
        verbose_name='Estado de Entrega'
    )
    proveedor_mensaje_id = models.CharField(max_length=200, null=True, blank=True, verbose_name='ID de Mensaje FCM / Twilio')
    intentos = models.PositiveSmallIntegerField(default=0, verbose_name='Intentos de Envío')
    ultimo_error = models.CharField(max_length=1000, null=True, blank=True, verbose_name='Detalle de Error')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Encolado el')
    enviado_en = models.DateTimeField(null=True, blank=True, verbose_name='Enviado el')
    entregado_en = models.DateTimeField(null=True, blank=True, verbose_name='Entregado el')
    confirmado_en = models.DateTimeField(null=True, blank=True, verbose_name='Confirmado de Lectura el')

    class Meta:
        db_table = 'destinatarios_alerta'
        verbose_name = 'Destinatario de Alerta'
        verbose_name_plural = 'Destinatarios de Alertas'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['estado_entrega', 'creado_en'], name='idx_dest_est_creado'),
            models.Index(fields=['usuario', 'creado_en'], name='idx_dest_usr_creado'),
        ]

    def __str__(self):
        return f"Alerta #{self.alerta_id} -> {self.usuario.username} ({self.canal}: {self.get_estado_entrega_display()})"
