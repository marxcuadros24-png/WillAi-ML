import { registerRootComponent } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import App from './App';

// 1. Manejador de notificaciones FCM nativo en Background / Doze Mode (Headless JS Task)
// NOTA CRÍTICA PARA EXPO GO:
// En Expo Go (StoreClient), los módulos nativos C++ de Firebase (NativeRNFBTurboApp)
// NO están compilados en el cliente estándar de Google Play / App Store.
// Intentar requerir o instanciar @react-native-firebase en Expo Go provoca el crash fatal
// "[runtime not ready]: Error: Native module NativeRNFBTurboApp is not registered".
// Por ello, Firebase nativo se omite completamente dentro de Expo Go y solo se activa en APKs standalone / builds compilados.
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo' ||
  typeof (Constants as any)?.expoVersion === 'string';

if (!isExpoGo) {
  try {
    const { TurboModuleRegistry } = require('react-native');
    const turboApp = TurboModuleRegistry?.get?.('NativeRNFBTurboApp');
    if (turboApp && typeof turboApp === 'object' && Object.keys(turboApp).length > 0) {
      const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
      const messaging = getMessaging();
      setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
        console.log('[FCM Background] Recibido en Doze Mode / Reposo:', remoteMessage?.messageId);
        return Promise.resolve();
      });
    }
  } catch (e) {
    console.warn('[FCM Background] No disponible en este entorno nativo:', e);
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
