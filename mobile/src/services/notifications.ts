import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CANAL_NOTIFICACION_ID, NOMBRE_CANAL_NOTIFICACION } from '../constants/config';
import { registrarTokenPushApi } from './api';

// Configurar cómo se comportan las notificaciones cuando la app está abierta o en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Inicializa el canal de notificación Android de MÁXIMA PRIORIDAD con sonido personalizado y vibración.
 * Android Doze Mode: canal con AndroidImportance.MAX, sonido raw 'alerta' y visibilidad PUBLIC.
 */
export async function configurarCanalNotificacionesAndroid(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CANAL_NOTIFICACION_ID, {
        name: NOMBRE_CANAL_NOTIFICACION,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#ef4444',
        sound: 'alerta', // Identificador raw sin extensión (.wav/.mp3) en res/raw/
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Ignorar modo No Molestar en emergencias críticas
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        }
      });
    } catch (e) {
      console.warn('Canal de notificación no soportado en Expo Go:', e);
    }
  }
}

// Registro en memoria de alertas ya notificadas para evitar disparar sonido duplicado
const alertasYaNotificadas = new Set<number>();

/**
 * Emite una notificación nativa con sonido y vibración si la alerta es de emergencia y no ha sonado antes.
 */
export async function notificarNuevaAlertaSiCorresponde(alerta: {
  id_alerta: number;
  titulo: string;
  mensaje: string;
  prioridad?: string;
}): Promise<boolean> {
  if (!alerta || !alerta.id_alerta) return false;
  if (alertasYaNotificadas.has(alerta.id_alerta)) return false;

  alertasYaNotificadas.add(alerta.id_alerta);

  try {
    await configurarCanalNotificacionesAndroid();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 ALERTA: ${alerta.titulo}`,
        body: alerta.mensaje,
        sound: 'alerta', // Sonido nativo en res/raw/alerta
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500],
        data: { id_alerta: alerta.id_alerta },
      },
      trigger: {
        channelId: CANAL_NOTIFICACION_ID,
      } as any
    });
    return true;
  } catch (err) {
    console.warn('Error emitiendo notificación nativa:', err);
    return false;
  }
}

/**
 * Solicita permisos de notificación y obtiene el Device Token nativo de FCM (Firebase Cloud Messaging)
 * para registrarlo en el backend Django.
 */
export async function registrarNotificacionesPush(authToken?: string | null): Promise<string | null> {
  try {
    await configurarCanalNotificacionesAndroid();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permisos de notificación no otorgados.');
      return null;
    }

    // Obtener Device Token nativo de Google FCM
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const pushToken = typeof deviceToken?.data === 'string' ? deviceToken.data : null;

    if (pushToken && authToken) {
      await registrarTokenPushApi(pushToken, authToken);
      console.log('Token FCM nativo registrado exitosamente:', pushToken.substring(0, 15) + '...');
    }

    return pushToken;
  } catch (error) {
    console.warn('Error al registrar token FCM nativo:', error);
    return null;
  }
}

export interface DetalleAlertaNotificacion {
  id_alerta: number;
  titulo: string;
  mensaje: string;
  sector?: string;
  certeza_operador?: 'confirmado_operador' | 'satelital_automatica' | 'por_verificar';
  latitud?: number;
  longitud?: number;
  viento_kmh?: number;
  direccion_viento?: string;
}

/**
 * Emite una notificación local de emergencia adaptada según el rol y con certeza del operador.
 */
export async function emitirNotificacionAlertaLocal(
  alerta: DetalleAlertaNotificacion,
  rol: 'comunero' | 'brigadista' = 'comunero',
  idioma: 'es' | 'qu' = 'es'
): Promise<void> {
  const certezaTexto =
    alerta.certeza_operador === 'confirmado_operador'
      ? (idioma === 'qu' ? '【COEP Chiqapchasqa】' : '【Confirmado por Operador COEP】')
      : (idioma === 'qu' ? '【Quyllur Qawasqa】' : '【Detección Satelital Automática】');

  let cuerpoMensaje = '';

  if (rol === 'brigadista') {
    // Vista técnica para brigadistas forestales
    cuerpoMensaje = `${certezaTexto} ${alerta.mensaje}\n📍 Coords: (${alerta.latitud?.toFixed(4) ?? '-15.01'}, ${alerta.longitud?.toFixed(4) ?? '-73.78'}) | Viento: ${alerta.viento_kmh ?? 15} km/h ${alerta.direccion_viento ?? 'SO'}`;
  } else {
    // Vista preventiva para pobladores con norma de seguridad andina en Quechua/Español
    const advertenciaLadera =
      idioma === 'qu'
        ? '\n⚠️ ¡Qata wichayman amapuni asuykuychu! Ayllu plazaman qispiykuychik.'
        : '\n⚠️ ¡No subas la ladera hacia el humo! Evacúa hacia la plaza comunal.';

    cuerpoMensaje = `${certezaTexto} ${alerta.mensaje}${advertenciaLadera}`;
  }

  await configurarCanalNotificacionesAndroid();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 ${alerta.titulo}`,
      body: cuerpoMensaje,
      data: {
        alertaId: alerta.id_alerta,
        rol,
        certeza: alerta.certeza_operador
      },
      sound: 'alerta',
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#ef4444',
    },
    trigger: {
      channelId: CANAL_NOTIFICACION_ID,
    } as any

  });
}
