import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


@receiver(post_save, sender='reportes.ValidacionReporte')
def on_reporte_validado(sender, instance, created, **kwargs):
    """
    Cuando un verificador comunal o COEL valida un reporte positivamente ('validado'),
    registra una ActividadUsuario comunal y evalúa otorgar la insignia 'primer_aviso'.
    """
    if instance.resultado != 'validado':
        return

    from apps.gamificacion.models import Insignia, ActividadUsuario, UsuarioInsignia

    reporte = instance.reporte
    usuario = reporte.usuario

    if not usuario:
        return

    # Registrar actividad validada
    actividad, _ = ActividadUsuario.objects.get_or_create(
        usuario=usuario,
        tipo_actividad='reporte_validado',
        referencia_tipo='reporte',
        referencia_id=reporte.id_reporte,
        defaults={
            'estado': 'validada',
            'evidencia_referencia': f"Reporte #{reporte.id_reporte} validado por {instance.revisor.nombre_completo or instance.revisor.username}",
            'ocurrida_en': reporte.creado_en or timezone.now(),
            'validada_por': instance.revisor,
            'validada_en': timezone.now(),
        }
    )

    # Otorgar insignia 'primer_aviso' si no la tiene
    try:
        insignia_primer_aviso = Insignia.objects.filter(codigo='primer_aviso', activa=True).first()
        if insignia_primer_aviso:
            if not UsuarioInsignia.objects.filter(usuario=usuario, insignia=insignia_primer_aviso).exists():
                UsuarioInsignia.objects.create(
                    usuario=usuario,
                    insignia=insignia_primer_aviso,
                    actividad_desbloqueo=actividad,
                    otorgada_por=instance.revisor
                )
                logger.info(f"🏆 Insignia 'primer_aviso' otorgada a {usuario.username} por validación de reporte #{reporte.id_reporte}")
    except Exception as e:
        logger.error(f"Error al evaluar insignia primer_aviso: {e}")
