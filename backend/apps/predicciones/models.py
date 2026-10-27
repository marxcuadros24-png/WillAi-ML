from django.db import models
from django.contrib.gis.db import models as gis_models
from django.utils.translation import gettext_lazy as _
from apps.incidentes.models import Incidente


class ModeloPredictivo(models.Model):
    class EstadoModelo(models.TextChoices):
        EXPERIMENTAL = 'experimental', _('Experimental')
        VALIDADO = 'validado', _('Validado Operativo')
        RETIRADO = 'retirado', _('Retirado / Obsoleto')

    id_modelo = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=150, verbose_name='Nombre del Modelo')
    version = models.CharField(max_length=80, verbose_name='Versión')
    algoritmo = models.CharField(max_length=120, verbose_name='Algoritmo (FWI Canadian System, Random Forest, etc.)')
    descripcion = models.TextField(null=True, blank=True, verbose_name='Descripción y Alcance')
    artefacto_uri = models.CharField(max_length=1000, null=True, blank=True, verbose_name='URI del Artefacto / Pesos')
    metricas_validacion = models.JSONField(null=True, blank=True, verbose_name='Métricas de Validación (AUC, Accuracy, F1)')
    estado = models.CharField(
        max_length=30,
        choices=EstadoModelo.choices,
        default=EstadoModelo.EXPERIMENTAL,
        verbose_name='Estado del Modelo'
    )
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrado el')

    class Meta:
        db_table = 'modelos_predictivos'
        unique_together = (('nombre', 'version'),)
        verbose_name = 'Modelo Predictivo'
        verbose_name_plural = 'Modelos Predictivos'
        ordering = ['-creado_en']

    def __str__(self):
        return f"{self.nombre} v{self.version} ({self.algoritmo})"


class EjecucionModelo(models.Model):
    class EstadoEjecucion(models.TextChoices):
        PENDIENTE = 'pendiente', _('Pendiente')
        EJECUTANDO = 'ejecutando', _('Ejecutando')
        COMPLETADO = 'completado', _('Completado')
        FALLIDO = 'fallido', _('Fallido')

    id_ejecucion = models.BigAutoField(primary_key=True)
    modelo = models.ForeignKey(
        ModeloPredictivo,
        on_delete=models.CASCADE,
        db_column='id_modelo',
        related_name='ejecuciones',
        verbose_name='Modelo Predictivo'
    )
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_incidente',
        related_name='ejecuciones_modelo',
        verbose_name='Incidente Específico (opcional)'
    )
    iniciado_en = models.DateTimeField(auto_now_add=True, verbose_name='Iniciado el')
    finalizado_en = models.DateTimeField(null=True, blank=True, verbose_name='Finalizado el')
    estado = models.CharField(
        max_length=30,
        choices=EstadoEjecucion.choices,
        default=EstadoEjecucion.PENDIENTE,
        verbose_name='Estado de la Ejecución'
    )
    parametros = models.JSONField(null=True, blank=True, verbose_name='Parámetros de Entrada (JSON)')
    resumen_error = models.TextField(null=True, blank=True, verbose_name='Resumen del Error')

    class Meta:
        db_table = 'ejecuciones_modelo'
        verbose_name = 'Ejecución de Modelo'
        verbose_name_plural = 'Ejecuciones de Modelos'
        ordering = ['-iniciado_en']

    def __str__(self):
        return f"Ejecución #{self.id_ejecucion} de {self.modelo.nombre} ({self.get_estado_display()})"


class Prediccion(models.Model):
    class NivelPeligro(models.TextChoices):
        BAJO = 'bajo', _('Bajo')
        MODERADO = 'moderado', _('Moderado')
        ALTO = 'alto', _('Alto')
        CRITICO = 'critico', _('Crítico')
        INDETERMINADO = 'indeterminado', _('Indeterminado')

    id_prediccion = models.BigAutoField(primary_key=True)
    ejecucion = models.ForeignKey(
        EjecucionModelo,
        on_delete=models.CASCADE,
        db_column='id_ejecucion',
        related_name='predicciones',
        verbose_name='Ejecución de Origen'
    )
    geometria_geojson = models.JSONField(verbose_name='Geometría Afectada (GeoJSON)')
    horizonte_desde = models.DateTimeField(verbose_name='Horizonte Desde')
    horizonte_hasta = models.DateTimeField(verbose_name='Horizonte Hasta')
    probabilidad = models.DecimalField(max_digits=6, decimal_places=5, null=True, blank=True, verbose_name='Probabilidad (0 a 1)')
    nivel = models.CharField(
        max_length=30,
        choices=NivelPeligro.choices,
        default=NivelPeligro.INDETERMINADO,
        verbose_name='Nivel de Peligro FWI'
    )
    incertidumbre = models.JSONField(null=True, blank=True, verbose_name='Índices FWI y Detalles')
    creada_en = models.DateTimeField(auto_now_add=True, verbose_name='Generada el')

    class Meta:
        db_table = 'predicciones'
        verbose_name = 'Predicción de Peligro'
        verbose_name_plural = 'Predicciones de Peligro'
        ordering = ['-creada_en']
        indexes = [
            models.Index(fields=['horizonte_desde', 'horizonte_hasta'], name='idx_pred_horizonte'),
            models.Index(fields=['nivel'], name='idx_pred_nivel'),
        ]

    def __str__(self):
        return f"Predicción #{self.id_prediccion}: Peligro {self.get_nivel_display()} ({self.horizonte_desde.strftime('%d/%m')} - {self.horizonte_hasta.strftime('%d/%m')})"


class SimulacionPropagacion(gis_models.Model):
    class EstadoSimulacion(models.TextChoices):
        PENDIENTE = 'PENDIENTE', _('Pendiente')
        CORRIENDO = 'CORRIENDO', _('Corriendo')
        COMPLETADO = 'COMPLETADO', _('Completado')
        ERROR = 'ERROR', _('Error')

    id_simulacion = models.BigAutoField(primary_key=True)
    incidente = models.ForeignKey(
        Incidente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_incidente',
        related_name='simulaciones_propagacion',
        verbose_name='Incidente Asociado'
    )
    modelo_motor = models.ForeignKey(
        ModeloPredictivo,
        on_delete=models.PROTECT,
        db_column='id_modelo',
        related_name='simulaciones_propagacion',
        verbose_name='Modelo Motor de Propagación'
    )
    punto_ignicion = gis_models.PointField(srid=4326, verbose_name='Punto de Ignición (WGS84)')
    horizonte_horas = models.PositiveSmallIntegerField(default=6, verbose_name='Horizonte de Simulación (Horas)')
    estado = models.CharField(
        max_length=20,
        choices=EstadoSimulacion.choices,
        default=EstadoSimulacion.PENDIENTE,
        verbose_name='Estado de la Simulación'
    )
    parametros_entrada = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Parámetros de Entrada (Viento, Dirección, FFMC, DEM)'
    )
    requiere_revision_humana = models.BooleanField(
        default=True,
        verbose_name='Requiere Revisión Humana (CRÍTICO: no dispara alertas públicas sin operador)'
    )
    nivel_incertidumbre = models.CharField(
        max_length=60,
        default="ALTA_SIN_CALIBRAR_DNBR",
        verbose_name='Nivel de Incertidumbre'
    )
    errores = models.TextField(null=True, blank=True, verbose_name='Registro de Errores')
    iniciado_en = models.DateTimeField(null=True, blank=True, verbose_name='Iniciado el')
    finalizado_en = models.DateTimeField(null=True, blank=True, verbose_name='Finalizado el')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')

    class Meta:
        db_table = 'simulaciones_propagacion'
        verbose_name = 'Simulación de Propagación'
        verbose_name_plural = 'Simulaciones de Propagación'
        ordering = ['-creado_en']

    def __str__(self):
        return f"Simulación #{self.id_simulacion} ({self.modelo_motor.nombre}) - {self.estado}"


class ResultadoPropagacion(gis_models.Model):
    id_resultado = models.BigAutoField(primary_key=True)
    simulacion = models.ForeignKey(
        SimulacionPropagacion,
        on_delete=models.CASCADE,
        db_column='id_simulacion',
        related_name='resultados',
        verbose_name='Simulación de Origen'
    )
    hora_paso = models.PositiveSmallIntegerField(verbose_name='Paso Temporal (Horas: ej. 1, 3, 6)')
    perimetro = gis_models.MultiPolygonField(srid=4326, verbose_name='Perímetro Isócrona (MultiPolygon WGS84)')
    area_hectareas = models.FloatField(verbose_name='Área Estimada Quemada (ha)')
    metadatos = models.JSONField(default=dict, blank=True, verbose_name='Metadatos (Velocidad máx m/min, Celdas quemadas)')
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Registrado el')

    class Meta:
        db_table = 'resultados_propagacion'
        verbose_name = 'Resultado de Propagación'
        verbose_name_plural = 'Resultados de Propagación'
        ordering = ['simulacion', 'hora_paso']
        unique_together = (('simulacion', 'hora_paso'),)

    def __str__(self):
        return f"Isócrona {self.hora_paso}h de Simulación #{self.simulacion_id} ({self.area_hectareas:.2f} ha)"

