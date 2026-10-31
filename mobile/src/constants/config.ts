import { Platform } from 'react-native';

/**
 * Configuración central de la App Móvil WillAI Coracora.
 */

// IP local de la computadora en la red LAN para pruebas con Expo Go en celular físico
const DEV_LAN_IP = '192.168.1.7';

export const API_BASE = Platform.select({
  web: 'http://127.0.0.1:8000/api/v1',
  default: `http://${DEV_LAN_IP}:8000/api/v1`
});

export const CANAL_NOTIFICACION_ID = 'alertas-incendios';
export const NOMBRE_CANAL_NOTIFICACION = 'Alertas de Incendios Forestales (Máxima Prioridad)';

export const COLORS = {
  // Paleta Diurna de Alto Contraste (legible bajo el sol andino >3,100 msnm)
  bgPrimary: '#f8fafc',       // Slate 50 claro
  bgSecondary: '#ffffff',     // Blanco puro para tarjetas
  bgCard: '#ffffff',
  borderSubtle: '#e2e8f0',    // Borde sutil gris claro
  borderHighlight: '#cbd5e1', // Borde reforzado

  firePrimary: '#dc2626',     // Rojo vivo de fuego / emergencia
  fireGlow: 'rgba(220, 38, 38, 0.12)',
  fireAmber: '#d97706',       // Ámbar de alerta
  fireOrange: '#ea580c',      // Naranja peligro alto
  emerald: '#059669',         // Verde esmeralda para confirmaciones
  cyan: '#0284c7',            // Azul cielo táctico
  sky: '#0ea5e9',

  textPrimary: '#0f172a',     // Carbón oscuro de máximo contraste (14:1)
  textSecondary: '#334155',   // Gris pizarra oscuro legible
  textMuted: '#64748b',       // Gris medio para textos secundarios

  dangerLow: '#059669',
  dangerModerate: '#d97706',
  dangerHigh: '#ea580c',
  dangerCritical: '#dc2626'
};

