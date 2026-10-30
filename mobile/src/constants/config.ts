import { Platform } from 'react-native';

/**
 * Configuración central de la App Móvil WillAI Coracora.
 */

// En emulador Android, 10.0.2.2 redirige al localhost de la máquina host.
// En iOS / Web o dispositivo físico se puede sobrescribir con la IP local de la máquina.
const DEV_MACHINE_IP = '127.0.0.1'; // Modificar a tu IP de red LAN si pruebas en celular físico

export const API_BASE = Platform.select({
  android: 'http://10.0.2.2:8000/api/v1',
  ios: `http://${DEV_MACHINE_IP}:8000/api/v1`,
  default: 'http://127.0.0.1:8000/api/v1'
});

export const CANAL_NOTIFICACION_ID = 'alertas-incendios';
export const NOMBRE_CANAL_NOTIFICACION = 'Alertas de Incendios Forestales (Máxima Prioridad)';

export const COLORS = {
  bgPrimary: '#080c14',
  bgSecondary: '#0f172a',
  bgCard: 'rgba(15, 23, 42, 0.85)',
  borderSubtle: '#1e293b',
  borderHighlight: '#334155',

  firePrimary: '#ef4444',
  fireGlow: 'rgba(239, 68, 68, 0.4)',
  fireAmber: '#f59e0b',
  fireOrange: '#ff6b00',
  emerald: '#10b981',
  cyan: '#06b6d4',
  sky: '#38bdf8',

  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  dangerLow: '#10b981',
  dangerModerate: '#f59e0b',
  dangerHigh: '#ff6b00',
  dangerCritical: '#ef4444'
};

