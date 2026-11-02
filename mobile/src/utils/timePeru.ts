/**
 * Utilidades de Fecha y Hora oficial para Perú (UTC-5 / America/Lima).
 * No depende de librerías externas ni de ICU nativo, funciona 100% confiable en Hermes/Android.
 */

const PERU_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5 fijo sin horario de verano

/**
 * Convierte cualquier fecha ISO o timestamp a componentes de fecha en hora peruana.
 */
export function getComponentesPeru(fechaIso?: string | number | Date | null): {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  fechaYMD: string;
} {
  const d = fechaIso ? new Date(fechaIso) : new Date();
  const timeUtc = d.getTime();
  const timePeru = timeUtc + PERU_OFFSET_MS;
  const dPeru = new Date(timePeru);

  const anio = dPeru.getUTCFullYear();
  const mes = dPeru.getUTCMonth() + 1;
  const dia = dPeru.getUTCDate();
  const hora = dPeru.getUTCHours();
  const minuto = dPeru.getUTCMinutes();
  const segundo = dPeru.getUTCSeconds();

  const mesStr = mes < 10 ? `0${mes}` : `${mes}`;
  const diaStr = dia < 10 ? `0${dia}` : `${dia}`;
  const fechaYMD = `${anio}-${mesStr}-${diaStr}`;

  return { anio, mes, dia, hora, minuto, segundo, fechaYMD };
}

/**
 * Obtiene la fecha actual de hoy en Perú en formato YYYY-MM-DD.
 */
export function getFechaHoyPeru(): string {
  return getComponentesPeru().fechaYMD;
}

/**
 * Comprueba si una fecha dada corresponde al día de HOY en horario de Perú.
 */
export function esFechaDeHoyPeru(fechaIso?: string | null): boolean {
  if (!fechaIso) return false;
  const comp = getComponentesPeru(fechaIso);
  const hoy = getFechaHoyPeru();
  return comp.fechaYMD === hoy;
}

/**
 * Formatea una hora en formato amigable de 12 horas (ej: "3:45 pm").
 */
export function formatearHora12Peru(fechaIso?: string | null): string {
  if (!fechaIso) return '';
  const { hora, minuto } = getComponentesPeru(fechaIso);
  const periodo = hora >= 12 ? 'pm' : 'am';
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  const minStr = minuto < 10 ? `0${minuto}` : `${minuto}`;
  return `${hora12}:${minStr} ${periodo}`;
}

/**
 * Formatea fecha y hora en formato legible de Perú:
 * Si es hoy: "Hoy a las 3:45 pm"
 * Si es otro día: "31/10/2026 • 3:45 pm"
 */
export function formatearFechaHoraLegible(fechaIso?: string | null): string {
  if (!fechaIso) return 'Reciente';
  const comp = getComponentesPeru(fechaIso);
  const hoy = getFechaHoyPeru();
  const horaStr = formatearHora12Peru(fechaIso);

  const diaStr = comp.dia < 10 ? `0${comp.dia}` : `${comp.dia}`;
  const mesStr = comp.mes < 10 ? `0${comp.mes}` : `${comp.mes}`;

  if (comp.fechaYMD === hoy) {
    return `Hoy a las ${horaStr}`;
  }
  return `${diaStr}/${mesStr}/${comp.anio} a las ${horaStr}`;
}

/**
 * Formatea tiempo relativo respecto a la hora actual de Perú (ej: "Hace 15 min").
 */
export function formatoTiempoRelativo(fechaIso?: string | null): string {
  if (!fechaIso) return 'Reciente';
  try {
    const timestampEvento = new Date(fechaIso).getTime();
    const ahora = Date.now();
    const diffMs = ahora - timestampEvento;
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 2) return 'Justo ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHoras = Math.round(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    const diffDias = Math.round(diffHoras / 24);
    return `Hace ${diffDias} d`;
  } catch {
    return 'Reciente';
  }
}

