import uuid
from django.db import models
from django.conf import settings


class Insignia(models.Model):
    id_insignia = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=60, unique=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=500)
    icono_url = models.CharField(max_length=500, null=True, blank=True)
    criterio = models.JSONField(null=True, blank=True, help_text="Criterios para desbloquear la insignia")
    activa = models.BooleanField(default=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'insignias'
        verbose_name = 'Insignia'
        verbose_name_plural = 'Insignias'
        ordering = ['id_insignia']

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class ActividadUsuario(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('validada', 'Validada'),
        ('rechazada', 'Rechazada'),
    ]

    id_actividad = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='actividades_comunales',
        db_column='id_usuario'
    )
    tipo_actividad = models.CharField(
        max_length=80,
        help_text="Ej: reporte_validado, prevencion_validada, capacitacion_validada"
    )
    referencia_tipo = models.CharField(max_length=60, null=True, blank=True)
    referencia_id = models.BigIntegerField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    evidencia_referencia = models.CharField(max_length=1000, null=True, blank=True)
    ocurrida_en = models.DateTimeField()
    validada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='actividades_validadas_por_mi',
        db_column='validada_por'
    )
    validada_en = models.DateTimeField(null=True, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'actividades_usuario'
        verbose_name = 'Actividad Comunal'
        verbose_name_plural = 'Actividades Comunales'
        indexes = [
            models.Index(fields=['usuario', 'estado', 'ocurrida_en'], name='idx_act_user_est_fecha'),
            models.Index(fields=['tipo_actividad', 'ocurrida_en'], name='idx_act_tipo_fecha'),
        ]
        ordering = ['-ocurrida_en']

    def __str__(self):
        return f"{self.usuario} - {self.tipo_actividad} ({self.estado})"


class UsuarioInsignia(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insignias_obtenidas',
        db_column='id_usuario'
    )
    insignia = models.ForeignKey(
        Insignia,
        on_delete=models.CASCADE,
        related_name='usuarios_poseedores',
        db_column='id_insignia'
    )
    actividad_desbloqueo = models.ForeignKey(
        ActividadUsuario,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='id_actividad_desbloqueo'
    )
    desbloqueada_en = models.DateTimeField(auto_now_add=True)
    otorgada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='insignias_otorgadas',
        db_column='otorgada_por'
    )

    class Meta:
        db_table = 'usuario_insignias'
        verbose_name = 'Insignia de Usuario'
        verbose_name_plural = 'Insignias de Usuarios'
        unique_together = ('usuario', 'insignia')
        ordering = ['-desbloqueada_en']

    def __str__(self):
        return f"{self.usuario} -> {self.insignia.nombre}"
