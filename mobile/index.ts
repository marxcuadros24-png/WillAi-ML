import { registerRootComponent } from 'expo';
import { TurboModuleRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';
import App from './App';

// 1. Manejador de notificaciones FCM nativo en Background / Doze Mode (Headless JS Task)
// Solo se inicializa si el módulo nativo de Firebase está presente (EAS Build / APK standalone).
// En Expo Go, el módulo no está compilado en el cliente estándar y se omite para evitar el crash NativeRNFBTurboApp.
const hasNativeFirebase = Boolean(TurboModuleRegistry?.get?.('NativeRNFBTurboApp'));

if (hasNativeFirebase) {
  try {
    const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
    const messaging = getMessaging();
    setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
      console.log('[FCM Background] Recibido en Doze Mode / Reposo:', remoteMessage?.messageId);
      return Promise.resolve();
    });
  } catch (e) {
    console.warn('FCM Background handler init error:', e);
  }
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
