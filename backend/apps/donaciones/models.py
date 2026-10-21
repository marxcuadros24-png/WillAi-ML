import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Donante(models.Model):
    TIPO_DONANTE_CHOICES = [
        ('persona', 'Persona Natural'),
        ('negocio', 'Negocio / Comercio'),
        ('organizacion', 'Organización / ONG'),
    ]
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('suspendido', 'Suspendido'),
    ]

    id_donante = models.BigAutoField(primary_key=True)
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='perfil_donante',
        db_column='id_usuario'
    )
    tipo_donante = models.CharField(max_length=20, choices=TIPO_DONANTE_CHOICES, default='persona')
    nombre_publico = models.CharField(max_length=180)
    identificador_fiscal = models.CharField(max_length=30, null=True, blank=True)
    telefono_contacto = models.CharField(max_length=30, null=True, blank=True)
    correo_contacto = models.EmailField(max_length=254, null=True, blank=True)
    mostrar_contacto_publico = models.BooleanField(default=False)
    verificado = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'donantes'
        verbose_name = 'Donante'
        verbose_name_plural = 'Donantes'
        ordering = ['nombre_publico']

    def __str__(self):
        return f"{self.nombre_publico} ({self.get_tipo_donante_display()})"


class OfertaDonacion(models.Model):
    MODALIDAD_ENTREGA_CHOICES = [
        ('entrega_en_punto', 'Entrega en punto de acopio'),
        ('recojo', 'Requiere recojo en domicilio / almacén'),
        ('coordinar', 'Por coordinar con el operador'),
    ]
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('pendiente_revision', 'Pendiente de Revisión'),
        ('publicada', 'Publicada / Aprobada'),
        ('reservada_parcial', 'Reservada Parcial'),
        ('reservada', 'Reservada Total'),
        ('entregada_parcial', 'Entregada Parcial'),
        ('completada', 'Completada / Entregada'),
        ('rechazada', 'Rechazada'),
        ('cancelada', 'Cancelada'),
        ('vencida', 'Vencida'),
    ]

    id_oferta = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    donante = models.ForeignKey(
        Donante,
        on_delete=models.CASCADE,
        related_name='ofertas',
        db_column='id_donante'
    )
    distrito = models.ForeignKey(
        'geografia.Distrito',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='id_distrito'
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(null=True, blank=True)
    modalidad_entrega = models.CharField(
        max_length=30,
        choices=MODALIDAD_ENTREGA_CHOICES,
        default='coordinar'
    )
    latitud_entrega = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitud_entrega = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    referencia_entrega = models.CharField(max_length=500, null=True, blank=True)
    disponible_desde = models.DateTimeField(null=True, blank=True)
    disponible_hasta = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='pendiente_revision')
    motivo_rechazo = models.CharField(max_length=500, null=True, blank=True)
    revisada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ofertas_donacion_revisadas',
        db_column='revisada_por'
    )
    revisada_en = models.DateTimeField(null=True, blank=True)
    publicada_en = models.DateTimeField(null=True, blank=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    actualizada_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ofertas_donacion'
        verbose_name = 'Oferta de Donación'
        verbose_name_plural = 'Ofertas de Donación'
        indexes = [
            models.Index(fields=['estado', 'creada_en'], name='idx_ofertas_est_fecha'),
            models.Index(fields=['distrito', 'estado'], name='idx_ofertas_dist_est'),
        ]
        ordering = ['-creada_en']

    def __str__(self):
        return f"{self.titulo} - {self.get_estado_display()} ({self.donante.nombre_publico})"


class ItemOfertaDonacion(models.Model):
    CATEGORIA_CHOICES = [
        ('viveres', 'Víveres no perecibles'),
        ('agua', 'Agua potable / Bebidas hidratantes'),
        ('herramientas', 'Herramientas (palas, batefuegos, machetes)'),
        ('proteccion_personal', 'EPP (mascarillas, guantes, botas)'),
        ('botiquin', 'Botiquín y primeros auxilios'),
        ('transporte', 'Apoyo de transporte / combustible'),
        ('alojamiento', 'Alojamiento temporal / frazadas'),
        ('comunicacion', 'Equipos de comunicación'),
        ('otro', 'Otro'),
    ]
    CONDICION_CHOICES = [
        ('nuevo', 'Nuevo'),
        ('buen_estado', 'Buen Estado'),
        ('usado', 'Usado'),
        ('perecible', 'Perecible'),
        ('no_aplica', 'No Aplica'),
        ('requiere_revision', 'Requiere Revisión'),
    ]

    id_item_donacion = models.BigAutoField(primary_key=True)
    oferta = models.ForeignKey(
        OfertaDonacion,
        on_delete=models.CASCADE,
        related_name='items',
        db_column='id_oferta'
    )
    categoria = models.CharField(max_length=30, choices=CATEGORIA_CHOICES, default='otro')
    nombre_item = models.CharField(max_length=180)
    descripcion = models.CharField(max_length=1000, null=True, blank=True)
    cantidad_ofrecida = models.DecimalField(max_digits=12, decimal_places=3)
    unidad = models.CharField(max_length=40, help_text="Ej: unidades, litros, kg, cajas")
    cantidad_disponible = models.DecimalField(max_digits=12, decimal_places=3)
    condicion = models.CharField(max_length=30, choices=CONDICION_CHOICES, default='no_aplica')
    fecha_vencimiento = models.DateField(null=True, blank=True)
    requiere_cadena_frio = models.BooleanField(default=False)
    observaciones = models.CharField(max_length=1000, null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'items_oferta_donacion'
        verbose_name = 'Ítem de Oferta de Donación'
        verbose_name_plural = 'Ítems de Ofertas de Donación'
        indexes = [
            models.Index(fields=['categoria'], name='idx_items_cat'),
            models.Index(fields=['oferta'], name='idx_items_oferta'),
        ]

    def clean(self):
        if self.cantidad_ofrecida <= 0:
            raise ValidationError("La cantidad ofrecida debe ser mayor a 0.")
        if self.cantidad_disponible < 0 or self.cantidad_disponible > self.cantidad_ofrecida:
            raise ValidationError("La cantidad disponible debe estar entre 0 y la cantidad ofrecida.")

    def __str__(self):
        return f"{self.nombre_item}: {self.cantidad_disponible}/{self.cantidad_ofrecida} {self.unidad}"


class AsignacionDonacion(models.Model):
    ESTADO_CHOICES = [
        ('solicitada', 'Solicitada'),
        ('aprobada', 'Aprobada'),
        ('preparando', 'Preparando'),
        ('en_transito', 'En Tránsito'),
        ('entregada', 'Entregada'),
        ('rechazada', 'Rechazada'),
        ('cancelada', 'Cancelada'),
    ]

    id_asignacion_donacion = models.BigAutoField(primary_key=True)
    item_donacion = models.ForeignKey(
        ItemOfertaDonacion,
        on_delete=models.CASCADE,
        related_name='asignaciones',
        db_column='id_item_donacion'
    )
    incidente = models.ForeignKey(
        'incidentes.Incidente',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='donaciones_asignadas',
        db_column='id_incidente'
    )
    brigada = models.ForeignKey(
        'respuesta.Brigada',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='donaciones_recibidas',
        db_column='id_brigada'
    )
    entidad = models.ForeignKey(
        'respuesta.Entidad',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='donaciones_recibidas',
        db_column='id_entidad'
    )
    cantidad_asignada = models.DecimalField(max_digits=12, decimal_places=3)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='solicitada')
    solicitada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='solicitudes_donacion_hechas',
        db_column='solicitada_por'
    )
    aprobada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='aprobaciones_donacion_hechas',
        db_column='aprobada_por'
    )
    solicitada_en = models.DateTimeField(auto_now_add=True)
    aprobada_en = models.DateTimeField(null=True, blank=True)
    entregada_en = models.DateTimeField(null=True, blank=True)
    comprobante_uri = models.CharField(max_length=1000, null=True, blank=True)
    observaciones = models.CharField(max_length=1000, null=True, blank=True)

    class Meta:
        db_table = 'asignaciones_donacion'
        verbose_name = 'Asignación de Donación'
        verbose_name_plural = 'Asignaciones de Donaciones'
        ordering = ['-solicitada_en']

    def clean(self):
        # Exclusividad de destino: exactamente uno debe ser NOT NULL
        destinos = [self.incidente_id, self.brigada_id, self.entidad_id]
        if sum(1 for d in destinos if d is not None) != 1:
            raise ValidationError("Debe especificar exactamente un destino: incidente, brigada o entidad.")
        if self.cantidad_asignada <= 0:
            raise ValidationError("La cantidad asignada debe ser mayor a 0.")

    def __str__(self):
        destino = self.incidente or self.brigada or self.entidad
        return f"Asignación #{self.id_asignacion_donacion} de {self.cantidad_asignada} {self.item_donacion.unidad} a {destino}"


class HistorialOfertaDonacion(models.Model):
    id_historial_oferta = models.BigAutoField(primary_key=True)
    oferta = models.ForeignKey(
        OfertaDonacion,
        on_delete=models.CASCADE,
        related_name='historial',
        db_column='id_oferta'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column='id_usuario'
    )
    estado_anterior = models.CharField(max_length=40, null=True, blank=True)
    estado_nuevo = models.CharField(max_length=40)
    comentario = models.CharField(max_length=1000, null=True, blank=True)
    ocurrido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'historial_ofertas_donacion'
        verbose_name = 'Historial de Oferta de Donación'
        verbose_name_plural = 'Historiales de Ofertas de Donación'
        ordering = ['-ocurrido_en']

    def __str__(self):
        return f"Oferta #{self.oferta_id}: {self.estado_anterior} -> {self.estado_nuevo}"
