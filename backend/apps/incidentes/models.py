from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.geografia.models import Distrito, Comunidad
from apps.respuesta.models import Brigada
from apps.reportes.models import Reporte


class Incidente(models.Model):
    class TipoIncendio(models.TextChoices):
        FORESTAL = 'forestal', _('Forestal')
        AGRICOLA = 'agricola', _('Agrícola')
        PASTIZAL = 'pastizal', _('Pastizal / Pajonal')
        RESIDENCIAL = 'residencial', _('Residencial / Urbano')
        OTRO = 'otro', _('Otro')
        DESCONOCIDO = 'desconocido', _('Desconocido')

    class EstadoIncidente(models.TextChoices):
        NUEVO = 'nuevo', _('Nuevo / Por Verificar')
        VERIFICACION = 'verificacion', _('En Verificación')
        CONFIRMADO = 'confirmado', _('Confirmado Activo')
        ASIGNADO = 'asignado', _('Brigada Asignada')
        EN_ATENCION = 'en_atencion', _('En Atención')
        EN_COMBATE = 'en_combate', _('En Combate')
        CONTENIDO = 'contenido', _('Contenido')
        CONTROLADO = 'controlado', _('Controlado')
        EXTINGUIDO = 'extinguido', _('Extinguido')
        CERRADO = 'cerrado', _('Extinguido / Cerrado')
        DESCARTADO = 'descartado', _('Descartado / Falsa Alarma')

    class Prioridad(models.TextChoices):
        BAJA = 'baja', _('Baja')
        MEDIA = 'media', _('Media')
        ALTA = 'alta', _('Alta')
        CRITICA = 'critica', _('Crítica (Riesgo a Población)')
        INDETERMINADA = 'indeterminada', _('Indeterminada')

    id_incidente = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=40, unique=True, verbose_name='Código Operativo')
    titulo = models.CharField(max_length=200, verbose_name='Título del Incidente')
    tipo_incendio = models.CharField(
        max_length=30,
        choices=TipoIncendio.choices,
        default=TipoIncendio.DESCONOCIDO,
        verbose_name='Tipo de Incendio'
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoIncidente.choices,
        default=EstadoIncidente.NUEVO,
        verbose_name='Estado del Incidente'
    )
    prioridad = models.CharField(
        max_length=30,
        choices=Prioridad.choices,
        default=Prioridad.INDETERMINADA,
        verbose_name='Nivel de Prioridad'
    )
    latitud_referencia = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Latitud Referencia')
    longitud_referencia = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Longitud Referencia')
    perimetro_geojson = models.JSONField(null=True, blank=True, verbose_name='Perímetro Afectado (GeoJSON)')
    distrito = models.ForeignKey(
        Distrito,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_distrito',
        related_name='incidentes',
        verbose_name='Distrito'
    )
    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_comunidad',
        related_name='incidentes',
        verbose_name='Comunidad'
    )
    detectado_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha y Hora de Detección')
    confirmado_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Confirmación')
    cerrado_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Cierre')
    resumen = models.TextField(null=True, blank=True, verbose_name='Resumen de la Situación')
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='creado_por',
        related_name='incidentes_creados',
        verbose_name='Operador Creador'
    )
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado el')

    reportes_vinculados = models.ManyToManyField(
        Reporte,
        through='ReporteIncidente',
        related_name='incidentes',
        blank=True
    )

    class Meta:
        db_table = 'incidentes'
        verbose_name = 'Incidente Forestal'
        verbose_name_plural = 'Incidentes Forestales'
        ordering = ['-detectado_en', '-creado_en']
        indexes = [
            models.Index(fields=['estado', 'prioridad'], name='idx_inc_estado_prio'),
            models.Index(fields=['latitud_referencia', 'longitud_referencia'], name='idx_inc_coords'),
        ]

    def __str__(self):
        return f"{self.codigo} - {self.titulo} ({self.get_estado_display()})"


class ReporteIncidente(models.Model):
    class TipoVinculo(models.TextChoices):
        ORIGEN = 'origen', _('Reporte de Origen')
        CORROBORACION = 'corroboracion', _('Corroboración / Testimonio adicional')
        ACTUALIZACION = 'actualizacion', _('Actualización de avance')
        OTRO = 'otro', _('Otro')

    reporte = models.ForeignKey(
        Reporte,
        on_delete=models.CASCADE,
        db_column='id_reporte',
        related_name='vinculos_incidente',
        verbose_name='Reporte'
    )
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.CASCADE,
        db_column='id_incidente',
        related_name='vinculos_reporte',
        verbose_name='Incidente'
    )
    tipo_vinculo = models.CharField(
        max_length=30,
        choices=TipoVinculo.choices,
        default=TipoVinculo.CORROBORACION,
        verbose_name='Tipo de Vínculo'
    )
    vinculado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='vinculado_por',
        related_name='reportes_vinculados',
        verbose_name='Operador que vinculó'
    )
    vinculado_en = models.DateTimeField(auto_now_add=True, verbose_name='Vinculado el')

    class Meta:
        db_table = 'reporte_incidente'
        unique_together = (('reporte', 'incidente'),)
        verbose_name = 'Vínculo Reporte-Incidente'
        verbose_name_plural = 'Vínculos Reportes-Incidentes'

    def __str__(self):
        return f"Reporte #{self.reporte_id} -> Incidente {self.incidente.codigo} ({self.tipo_vinculo})"


class HistorialIncidente(models.Model):
    id_historial = models.BigAutoField(primary_key=True)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.CASCADE,
        db_column='id_incidente',
        related_name='historial_estados',
        verbose_name='Incidente'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_usuario',
        related_name='cambios_incidente',
        verbose_name='Usuario Responsable'
    )
    estado_anterior = models.CharField(max_length=40, null=True, blank=True, verbose_name='Estado Anterior')
    estado_nuevo = models.CharField(max_length=40, verbose_name='Nuevo Estado')
    nota = models.TextField(null=True, blank=True, verbose_name='Nota / Motivo del cambio')
    registrado_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrado el')

    class Meta:
        db_table = 'historial_incidentes'
        verbose_name = 'Historial de Incidente'
        verbose_name_plural = 'Historiales de Incidentes'
        ordering = ['-registrado_en']

    def __str__(self):
        return f"{self.incidente.codigo}: {self.estado_anterior} -> {self.estado_nuevo}"


class AsignacionBrigada(models.Model):
    class EstadoAsignacion(models.TextChoices):
        ASIGNADA = 'asignada', _('Asignada')
        ACEPTADA = 'aceptada', _('Aceptada por Brigadista')
        EN_CAMINO = 'en_camino', _('En Desplazamiento')
        TRABAJANDO = 'trabajando', _('Operando en Terreno')
        FINALIZADA = 'finalizada', _('Misión Finalizada')
        CANCELADA = 'cancelada', _('Cancelada / Reasignada')

    id_asignacion = models.BigAutoField(primary_key=True)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.CASCADE,
        db_column='id_incidente',
        related_name='asignaciones_brigadas',
        verbose_name='Incidente'
    )
    brigada = models.ForeignKey(
        Brigada,
        on_delete=models.RESTRICT,
        db_column='id_brigada',
        related_name='asignaciones',
        verbose_name='Brigada'
    )
    asignado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='asignado_por',
        related_name='asignaciones_realizadas',
        verbose_name='Operador Asignador'
    )
    estado = models.CharField(
        max_length=30,
        choices=EstadoAsignacion.choices,
        default=EstadoAsignacion.ASIGNADA,
        verbose_name='Estado de la Asignación'
    )
    instrucciones = models.TextField(null=True, blank=True, verbose_name='Instrucciones de Despliegue')
    asignada_en = models.DateTimeField(auto_now_add=True, verbose_name='Asignada el')
    aceptada_en = models.DateTimeField(null=True, blank=True, verbose_name='Aceptada el')
    finalizada_en = models.DateTimeField(null=True, blank=True, verbose_name='Finalizada el')

    class Meta:
        db_table = 'asignaciones_brigada'
        verbose_name = 'Asignación de Brigada'
        verbose_name_plural = 'Asignaciones de Brigadas'
        ordering = ['-asignada_en']

    def __str__(self):
        return f"{self.brigada.nombre} en {self.incidente.codigo} ({self.get_estado_display()})"


class AccionAtencion(models.Model):
    id_accion = models.BigAutoField(primary_key=True)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.CASCADE,
        db_column='id_incidente',
        related_name='acciones',
        verbose_name='Incidente'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_usuario',
        related_name='acciones_registradas',
        verbose_name='Brigadista / Operador'
    )
    brigada = models.ForeignKey(
        Brigada,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_brigada',
        related_name='acciones',
        verbose_name='Brigada Ejecutora'
    )
    tipo_accion = models.CharField(max_length=100, verbose_name='Tipo de Acción (Línea de fuego, Ataque directo, etc.)')
    descripcion = models.TextField(verbose_name='Descripción de la Maniobra')
    resultado = models.TextField(null=True, blank=True, verbose_name='Resultado Observado')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Latitud Operación')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name='Longitud Operación')
    iniciada_en = models.DateTimeField(null=True, blank=True, verbose_name='Hora de Inicio')
    finalizada_en = models.DateTimeField(null=True, blank=True, verbose_name='Hora de Culminación')
    registrada_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrada el')

    class Meta:
        db_table = 'acciones_atencion'
        verbose_name = 'Acción de Atención'
        verbose_name_plural = 'Acciones de Atención'
        ordering = ['-registrada_en']

    def __str__(self):
        return f"{self.tipo_accion} en {self.incidente.codigo}"


class CierreIncidente(models.Model):
    id_cierre = models.BigAutoField(primary_key=True)
    incidente = models.OneToOneField(
        Incidente,
        on_delete=models.CASCADE,
        db_column='id_incidente',
        related_name='cierre',
        verbose_name='Incidente'
    )
    cerrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.RESTRICT,
        db_column='cerrado_por',
        related_name='incidentes_cerrados',
        verbose_name='Operador Responsable del Cierre'
    )
    motivo = models.TextField(verbose_name='Informe / Motivo de Cierre Final')
    evidencia_uri = models.CharField(max_length=1000, null=True, blank=True, verbose_name='Acta de Liquidación o Fotografía Final')
    cerrado_en = models.DateTimeField(auto_now_add=True, verbose_name='Cerrado el')

    class Meta:
        db_table = 'cierres_incidente'
        verbose_name = 'Cierre de Incidente'
        verbose_name_plural = 'Cierres de Incidentes'

    def __str__(self):
        return f"Cierre de {self.incidente.codigo} el {self.cerrado_en.strftime('%Y-%m-%d')}"
