import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CANAL_NOTIFICACION_ID, NOMBRE_CANAL_NOTIFICACION } from '../constants/config';
import { registrarTokenPushApi } from './api';

// Configurar cómo se comportan las notificaciones cuando la app está abierta
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
 * Inicializa el canal de notificación Android de MÁXIMA PRIORIDAD.
 */
export async function configurarCanalNotificacionesAndroid(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CANAL_NOTIFICACION_ID, {
        name: NOMBRE_CANAL_NOTIFICACION,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ef4444',
        sound: undefined,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        showBadge: true
      });
    } catch (e) {
      // Ignorar de forma segura en Expo Go cliente de desarrollo
      console.warn('Canal de notificación no soportado en Expo Go:', e);
    }
  }
}

/**
 * Solicita permisos de notificación y obtiene el token Expo Push para registrarlo en Django.
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

    // Obtener token Expo Push
    const tokenResponse = await Notifications.getExpoPushTokenAsync().catch(() => null);
    const pushToken = tokenResponse?.data || null;

    if (pushToken && authToken) {
      await registrarTokenPushApi(pushToken, authToken);
    }

    return pushToken;
  } catch (error) {
    console.warn('Error al registrar notificaciones push:', error);
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
    // Vista preventiva para comuneros con norma de seguridad andina en Quechua/Español
    const advertenciaLadera =
      idioma === 'qu'
        ? '\n⚠️ ¡Qata wichayman amapuni asuykuychu! Ayllu plazaman qispiykuychik.'
        : '\n⚠️ ¡No subas la ladera hacia el humo! Evacúa hacia la plaza comunal.';

    cuerpoMensaje = `${certezaTexto} ${alerta.mensaje}${advertenciaLadera}`;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🚨 ${alerta.titulo}`,
      body: cuerpoMensaje,
      data: {
        alertaId: alerta.id_alerta,
        rol,
        certeza: alerta.certeza_operador
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      color: '#ef4444'
    },
    trigger: null // Envío inmediato
  });
}
