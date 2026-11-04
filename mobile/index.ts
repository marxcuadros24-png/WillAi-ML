import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import type { RemoteMessage } from '@react-native-firebase/messaging';
import App from './App';

// 1. Manejador de notificaciones FCM nativo en Background / Doze Mode (Headless JS Task)
// Fuera del ciclo de vida de React y retornando estrictamente una promesa resuelta
try {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage: RemoteMessage) => {
    console.log('[FCM Background] Recibido en Doze Mode / Reposo:', remoteMessage.messageId);
    return Promise.resolve();
  });
} catch (e) {
  console.warn('FCM Background handler init error:', e);
}

// 2. Manejador de notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 3. Registro raíz de la aplicación
registerRootComponent(App);
