import * as SecureStore from 'expo-secure-store';

/**
 * Configuración central de la App Móvil WillAI Coracora.
 */

// URL pública activa vía Cloudflare Tunnel HTTPS
export const DEFAULT_SERVER_URL = 'https://marked-thanks-objectives-until.trycloudflare.com/api/v1';

let currentServerUrl = DEFAULT_SERVER_URL;

export const getApiBase = (): string => currentServerUrl;

export const setApiBase = async (newUrl: string): Promise<string> => {
  let cleaned = newUrl.trim().replace(/\/+$/, '');
  if (!cleaned.endsWith('/api/v1') && !cleaned.includes('/api/')) {
    cleaned = `${cleaned}/api/v1`;
  }
  currentServerUrl = cleaned;
  try {
    await SecureStore.setItemAsync('willai_custom_api_base', cleaned);
  } catch (e) {
    console.warn('Error al guardar URL de servidor en SecureStore:', e);
  }
  return currentServerUrl;
};

export const loadStoredApiBase = async (): Promise<string> => {
  try {
    const saved = await SecureStore.getItemAsync('willai_custom_api_base');
    if (saved && saved.startsWith('http')) {
      currentServerUrl = saved.trim().replace(/\/+$/, '');
      return currentServerUrl;
    }
  } catch (e) {
    console.warn('Error al cargar URL de servidor desde SecureStore:', e);
  }
  currentServerUrl = DEFAULT_SERVER_URL;
  return DEFAULT_SERVER_URL;
};

export const resetApiBase = async (): Promise<string> => {
  currentServerUrl = DEFAULT_SERVER_URL;
  try {
    await SecureStore.deleteItemAsync('willai_custom_api_base');
  } catch (e) {
    // ignorar
  }
  return DEFAULT_SERVER_URL;
};

// Compatibilidad hacia atrás
export const API_BASE = DEFAULT_SERVER_URL;

export const CANAL_NOTIFICACION_ID = 'alertas-incendios-v2';
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
