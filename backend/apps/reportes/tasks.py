import logging
from celery import shared_task
from .services import optimizar_video_evidencia

logger = logging.getLogger(__name__)


@shared_task(name='optimizar_video_evidencia_task')
def optimizar_video_evidencia_task(id_evidencia: int):
    """
    Tarea Celery asíncrona para procesar videos en segundo plano sin bloquear el hilo web.
    """
    logger.info(f"[Celery] Iniciando optimización ffmpeg para Evidencia #{id_evidencia}")
    return optimizar_video_evidencia(id_evidencia)

