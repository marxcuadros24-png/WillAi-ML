import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.geografia.models import Comunidad
from apps.incidentes.models import Incidente


class ObservacionMeteorologica(models.Model):
    id_observacion = models.BigAutoField(primary_key=True)
    proveedor = models.CharField(max_length=120, default='Open-Meteo', verbose_name='Proveedor de Datos')
    id_externo = models.CharField(max_length=180, null=True, blank=True, verbose_name='ID Externo / Timestamp Clave')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Latitud')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Longitud')
    observada_en = models.DateTimeField(verbose_name='Fecha y Hora de la Observación')
    temperatura_c = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='Temperatura (°C)')
    humedad_relativa_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name='Humedad Relativa (%)')
    viento_kmh = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, verbose_name='Velocidad del Viento (km/h)')
    direccion_viento_grados = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name='Dirección del Viento (°)')
    precipitacion_mm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Precipitación (mm)')
    datos_originales = models.JSONField(null=True, blank=True, verbose_name='Payload JSON Completo')
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrada el')

    class Meta:
        db_table = 'observaciones_meteorologicas'
        unique_together = (('proveedor', 'id_externo'),)
        verbose_name = 'Observación Meteorológica'
        verbose_name_plural = 'Observaciones Meteorológicas'
        ordering = ['-observada_en']
        indexes = [
            models.Index(fields=['observada_en'], name='idx_meteo_fecha'),
            models.Index(fields=['latitud', 'longitud'], name='idx_meteo_coords'),
        ]

    def __str__(self):
        return f"{self.proveedor} en ({self.latitud}, {self.longitud}): {self.temperatura_c}°C, {self.humedad_relativa_pct}% Hum, {self.viento_kmh} km/h"


class ZonaRiesgo(models.Model):
    class OrigenZona(models.TextChoices):
        PERIMETRO_VERIFICADO = 'perimetro_verificado', _('Perímetro Verificado')
        MODELO = 'modelo', _('Modelo Predictivo FWI / Simulación')
        EVALUACION_OPERATIVA = 'evaluacion_operativa', _('Evaluación Operativa COEP')
        OTRA = 'otra', _('Otra')

    class NivelRiesgo(models.TextChoices):
        BAJO = 'bajo', _('Bajo')
        MODERADO = 'moderado', _('Moderado')
        ALTO = 'alto', _('Alto')
        CRITICO = 'critico', _('Crítico')
        INDETERMINADO = 'indeterminado', _('Indeterminado')

    id_zona_riesgo = models.BigAutoField(primary_key=True)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_incidente',
        related_name='zonas_riesgo',
        verbose_name='Incidente Relacionado'
    )
    nombre = models.CharField(max_length=180, verbose_name='Nombre de la Zona de Riesgo')
    origen = models.CharField(max_length=40, choices=OrigenZona.choices, verbose_name='Origen de la Delimitación')
    nivel = models.CharField(max_length=30, choices=NivelRiesgo.choices, default=NivelRiesgo.INDETERMINADO, verbose_name='Nivel de Riesgo')
    geometria_geojson = models.JSONField(verbose_name='Geometría Poligonal (GeoJSON)')
    metodo = models.CharField(max_length=120, verbose_name='Método de Cálculo / Estimación')
    version_metodo = models.CharField(max_length=80, null=True, blank=True, verbose_name='Versión del Método')
    valida_desde = models.DateTimeField(verbose_name='Válida Desde')
    valida_hasta = models.DateTimeField(null=True, blank=True, verbose_name='Válida Hasta')
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='creada_por',
        verbose_name='Operador Responsable'
    )
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Creada el')

    class Meta:
        db_table = 'zonas_riesgo'
        verbose_name = 'Zona de Riesgo'
        verbose_name_plural = 'Zonas de Riesgo'
        ordering = ['-creada_en']

    def __str__(self):
        return f"{self.nombre} ({self.get_nivel_display()} - {self.get_origen_display()})"


class Vivienda(models.Model):
    id_vivienda = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    comunidad = models.ForeignKey(
        Comunidad,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_comunidad',
        related_name='viviendas',
        verbose_name='Comunidad / Sector'
    )
    codigo = models.CharField(max_length=50, null=True, blank=True, verbose_name='Código Predial / Catastral')
    nombre_responsable = models.CharField(max_length=150, null=True, blank=True, verbose_name='Responsable / Propietario')
    telefono_contacto = models.CharField(max_length=30, null=True, blank=True, verbose_name='Teléfono de Contacto')
    material_predominante = models.CharField(max_length=80, default='adobe_teja', verbose_name='Material Predominante')
    habitantes = models.IntegerField(default=4, verbose_name='Cantidad de Habitantes')
    referencia = models.CharField(max_length=255, null=True, blank=True, verbose_name='Referencia de Ubicación')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Latitud')
    longitud = models.DecimalField(max_digits=9, decimal_places=6, verbose_name='Longitud')
    precision_metros = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name='Precisión GPS (m)')
    verificada = models.BooleanField(default=False, verbose_name='Verificada en Campo')
    verificada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='verificada_por',
        related_name='viviendas_verificadas',
        verbose_name='Verificador'
    )
    verificada_en = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Verificación')
    activa = models.BooleanField(default=True, verbose_name='Activa')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrada el')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizada el')

    class Meta:
        db_table = 'viviendas'
        verbose_name = 'Vivienda'
        verbose_name_plural = 'Viviendas'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['latitud', 'longitud'], name='idx_viv_coords'),
        ]

    def __str__(self):
        ref = f" - {self.referencia}" if self.referencia else ""
        return f"Vivienda #{self.id_vivienda} en {self.comunidad.nombre if self.comunidad else 'Sin comunidad'}{ref}"


class ResidenteVivienda(models.Model):
    class Relacion(models.TextChoices):
        PROPIETARIO = 'propietario', _('Propietario')
        RESIDENTE = 'residente', _('Residente Habitual')
        FAMILIAR = 'familiar', _('Familiar')
        RESPONSABLE = 'responsable', _('Responsable de Hogar')
        OTRO = 'otro', _('Otro')

    vivienda = models.ForeignKey(
        Vivienda,
        on_delete=models.CASCADE,
        db_column='id_vivienda',
        related_name='residentes',
        verbose_name='Vivienda'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='id_usuario',
        related_name='residencias',
        verbose_name='Usuario Poblador'
    )
    relacion = models.CharField(max_length=30, choices=Relacion.choices, default=Relacion.RESIDENTE, verbose_name='Relación con el inmueble')
    recibe_alertas = models.BooleanField(default=True, verbose_name='Desea recibir alertas de evacuación')
    verificado = models.BooleanField(default=False, verbose_name='Residente verificado')
    desde = models.DateTimeField(auto_now_add=True, verbose_name='Registrado desde')
    hasta = models.DateTimeField(null=True, blank=True, verbose_name='Hasta')

    class Meta:
        db_table = 'residentes_vivienda'
        unique_together = (('vivienda', 'usuario'),)
        verbose_name = 'Residente de Vivienda'
        verbose_name_plural = 'Residentes de Viviendas'

    def __str__(self):
        return f"{self.usuario.nombre_visible or self.usuario.username} ({self.get_relacion_display()}) en Vivienda #{self.vivienda_id}"


class EvaluacionExposicion(models.Model):
    class NivelRiesgo(models.TextChoices):
        BAJO = 'bajo', _('Bajo')
        MODERADO = 'moderado', _('Moderado')
        ALTO = 'alto', _('Alto (Alerta Amarilla)')
        CRITICO = 'critico', _('Crítico (Evacuación Inmediata)')
        INDETERMINADO = 'indeterminado', _('Indeterminado')

    id_evaluacion = models.BigAutoField(primary_key=True)
    vivienda = models.ForeignKey(
        Vivienda,
        on_delete=models.CASCADE,
        db_column='id_vivienda',
        related_name='evaluaciones_exposicion',
        verbose_name='Vivienda Expuesta'
    )
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_incidente',
        related_name='viviendas_expuestas',
        verbose_name='Incidente Amenazante'
    )
    zona_riesgo = models.ForeignKey(
        ZonaRiesgo,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_zona_riesgo',
        related_name='evaluaciones',
        verbose_name='Zona de Riesgo Afectante'
    )
    nivel_riesgo = models.CharField(
        max_length=30,
        choices=NivelRiesgo.choices,
        default=NivelRiesgo.INDETERMINADO,
        verbose_name='Nivel de Exposición Calculado'
    )
    distancia_metros = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Distancia al Foco/Perímetro (metros)'
    )
    evaluada_en = models.DateTimeField(auto_now_add=True, verbose_name='Evaluada el')

    class Meta:
        db_table = 'evaluaciones_exposicion'
        verbose_name = 'Evaluación de Exposición de Vivienda'
        verbose_name_plural = 'Evaluaciones de Exposición de Viviendas'
        ordering = ['-evaluada_en']

    def __str__(self):
        return f"Vivienda #{self.vivienda_id}: {self.get_nivel_riesgo_display()} (Dist: {self.distancia_metros}m)"
