import logging
from .models import Auditoria, hash_ip

logger = logging.getLogger(__name__)


def registrar_auditoria(
    accion: str,
    entidad: str,
    id_registro: str = None,
    usuario=None,
    request=None,
    detalles: dict = None
):
    """
    Registra un evento de auditoría de manera desacoplada y segura.
    """
    try:
        user = usuario
        ip_anon = ""

        if request:
            if not user and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
            # Extraer IP remota
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                raw_ip = x_forwarded.split(',')[0].strip()
            else:
                raw_ip = request.META.get('REMOTE_ADDR', '')
            ip_anon = hash_ip(raw_ip)

        Auditoria.objects.create(
            usuario=user,
            accion=accion,
            entidad=entidad,
            id_registro=str(id_registro) if id_registro is not None else None,
            ip_hash=ip_anon,
            detalles=detalles or {}
        )
    except Exception as e:
        logger.error(f"Error registrando auditoría para {accion} en {entidad}: {e}")
