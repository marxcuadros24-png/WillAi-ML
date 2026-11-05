import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False


def inicializar_firebase() -> bool:
    """
    Inicializa el Firebase Admin SDK para servicios push FCM nativos.
    Busca automáticamente el archivo de credenciales de la cuenta de servicio de Firebase.
    """
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Verificar si ya existe una app de Firebase inicializada
        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        # Rutas de búsqueda de clave de cuenta de servicio
        posibles_rutas = []
        cred_setting = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
        if cred_setting:
            posibles_rutas.append(Path(cred_setting))

        base_dir = getattr(settings, 'BASE_DIR', Path('.'))
        posibles_rutas.extend([
            base_dir / 'willai-5d36b-firebase-adminsdk-fbsvc-4125178925.json',
            base_dir / 'firebase-service-account.json',
            base_dir / 'firebase-key.json',
            base_dir / 'serviceAccountKey.json',
            Path('willai-5d36b-firebase-adminsdk-fbsvc-4125178925.json'),
            Path('firebase-service-account.json'),
            Path('firebase-key.json'),
            Path('/app/willai-5d36b-firebase-adminsdk-fbsvc-4125178925.json'),
            Path('/app/firebase-service-account.json'),
        ])

        # Buscar además cualquier archivo con patrón *firebase-adminsdk*.json
        for dir_busqueda in [base_dir, Path('.'), Path('/app')]:
            if dir_busqueda.exists() and dir_busqueda.is_dir():
                for f in dir_busqueda.glob('*firebase-adminsdk*.json'):
                    if f not in posibles_rutas:
                        posibles_rutas.append(f)

        ruta_encontrada = None
        for r in posibles_rutas:
            if r.exists():
                ruta_encontrada = r
                break

        if ruta_encontrada:
            cred = credentials.Certificate(str(ruta_encontrada))
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info(f"Firebase Admin SDK inicializado exitosamente con credencial: {ruta_encontrada}")
            return True
        else:
            logger.warning(
                "Firebase Admin SDK no inicializado: no se encontró archivo de credenciales. "
                "Coloca 'willai-5d36b-firebase-adminsdk-fbsvc-4125178925.json' en backend/ o configura FIREBASE_CREDENTIALS_PATH."
            )
            return False

    except ImportError:
        logger.warning("Librería 'firebase-admin' no instalada. Ejecute: pip install firebase-admin")
        return False
    except Exception as e:
        logger.error(f"Error al inicializar Firebase Admin SDK: {e}")
        return False


def enviar_notificacion_push(
    token_dispositivo: str,
    titulo: str,
    cuerpo_mensaje: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "alerta",
    channel_id: str = "alertas-incendios-v2"
) -> Optional[str]:
    """
    Envía una notificación push 100% nativa vía Firebase Cloud Messaging (FCM).
    Configurado con prioridad máxima (Android priority 'high') y canal nativo con sonido 'alerta'.
    """
    token_limpio = (token_dispositivo or "").strip()
    if not token_limpio:
        logger.warning("Token FCM vacío o no proporcionado.")
        return None

    if not inicializar_firebase():
        logger.warning("FCM no disponible: Firebase Admin SDK no inicializado.")
        return None

    try:
        from firebase_admin import messaging

        payload_data = {str(k): str(v) for k, v in (data or {}).items()}

        mensaje = messaging.Message(
            notification=messaging.Notification(
                title=titulo,
                body=cuerpo_mensaje
            ),
            data=payload_data,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    title=titulo,
                    body=cuerpo_mensaje,
                    sound=sound,
                    channel_id=channel_id,
                    priority='max',
                    visibility='public',
                    default_vibrate_timings=True,
                    default_light_settings=True,
                )
            ),
            token=token_limpio
        )

        respuesta = messaging.send(mensaje)
        logger.info(f"Notificación FCM enviada con éxito. ID del mensaje: {respuesta}")
        return respuesta

    except Exception as e:
        logger.error(f"Error al enviar la notificación FCM: {e}")
        return None


def enviar_notificaciones_fcm_multicast(
    tokens: List[str],
    titulo: str,
    cuerpo_mensaje: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "alerta",
    channel_id: str = "alertas-incendios-v2"
) -> Dict[str, Any]:
    """
    Envía notificaciones push a múltiples dispositivos Android vía FCM en un solo envío (multicast).
    """
    if not tokens:
        return {"status": "no_tokens", "success_count": 0, "failure_count": 0}

    fcm_tokens = [t.strip() for t in tokens if t and t.strip()]

    if not fcm_tokens:
        return {"status": "no_valid_tokens", "success_count": 0, "failure_count": 0}

    if not inicializar_firebase():
        return {"status": "firebase_not_configured", "success_count": 0, "failure_count": len(fcm_tokens)}

    try:
        from firebase_admin import messaging

        payload_data = {str(k): str(v) for k, v in (data or {}).items()}

        mensaje_multi = messaging.MulticastMessage(
            tokens=fcm_tokens,
            notification=messaging.Notification(
                title=titulo,
                body=cuerpo_mensaje
            ),
            data=payload_data,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    title=titulo,
                    body=cuerpo_mensaje,
                    sound=sound,
                    channel_id=channel_id,
                    priority='max',
                    visibility='public',
                    default_vibrate_timings=True,
                    default_light_settings=True,
                )
            )
        )

        batch_response = messaging.send_each_for_multicast(mensaje_multi)
        logger.info(
            f"Multicast FCM completado: {batch_response.success_count} exitosos, "
            f"{batch_response.failure_count} fallidos de {len(fcm_tokens)} tokens."
        )
        return {
            "status": "success",
            "success_count": batch_response.success_count,
            "failure_count": batch_response.failure_count
        }

    except Exception as e:
        logger.error(f"Error enviando multicast FCM: {e}")
        return {"status": "error", "error": str(e)}


def despachar_push(
    tokens: List[str],
    titulo: str,
    cuerpo: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Punto de entrada principal para el despacho de alertas vía Google FCM.
    """
    return enviar_notificaciones_fcm_multicast(tokens, titulo, cuerpo, data)
