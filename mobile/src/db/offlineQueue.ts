import * as Crypto from 'expo-crypto';
import { db, initDatabase } from './database';
import { enviarReporteApi } from '../services/api';

export interface ReporteLocal {
  id?: number;
  client_uuid: string;
  latitud: number;
  longitud: number;
  precision_m?: number;
  azimut?: number;
  tipo_fuego: 'quema_agricola_controlada' | 'incendio_descontrolado';
  combustible: 'ichu_pajonal' | 'matorral' | 'bofedal' | 'cultivo';
  foto_uri?: string | null;
  video_uri?: string | null;
  fecha_captura: string;
  estado_sync?: 'pendiente' | 'sincronizando' | 'sincronizado' | 'error';
  error_mensaje?: string | null;
  intentos?: number;
}

// Asegurar que la tabla exista al importar
initDatabase();

/**
 * Guarda un reporte en la cola SQLite local con UUID v4 único para idempotencia.
 */
export function encolarReporte(
  datos: Omit<ReporteLocal, 'client_uuid' | 'fecha_captura'> & { client_uuid?: string; fecha_captura?: string }
): ReporteLocal {
  const client_uuid = datos.client_uuid || Crypto.randomUUID();
  const fecha_captura = datos.fecha_captura || new Date().toISOString();

  const query = `
    INSERT INTO reportes_pendientes (
      client_uuid, latitud, longitud, precision_m, azimut,
      tipo_fuego, combustible, foto_uri, video_uri, fecha_captura, estado_sync, intentos
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 0)
  `;

  db.runSync(query, [
    client_uuid,
    datos.latitud,
    datos.longitud,
    datos.precision_m ?? null,
    datos.azimut ?? null,
    datos.tipo_fuego,
    datos.combustible,
    datos.foto_uri ?? null,
    datos.video_uri ?? null,
    fecha_captura
  ]);

  return {
    ...datos,
    client_uuid,
    fecha_captura,
    estado_sync: 'pendiente',
    intentos: 0
  };
}

/**
 * Obtiene todos los reportes pendientes de sincronización.
 */
export function obtenerReportesPendientes(): ReporteLocal[] {
  try {
    const results = db.getAllSync<ReporteLocal>(
      `SELECT * FROM reportes_pendientes WHERE estado_sync = 'pendiente' ORDER BY id ASC`
    );
    return results || [];
  } catch (error) {
    console.error('Error al consultar reportes pendientes:', error);
    return [];
  }
}

/**
 * Cuenta cuántos reportes están en cola pendientes.
 */
export function contarReportesPendientes(): number {
  try {
    const res = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM reportes_pendientes WHERE estado_sync = 'pendiente'`
    );
    return res?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Marca un reporte como sincronizado con el backend Django.
 */
export function marcarComoSincronizado(client_uuid: string): void {
  try {
    db.runSync(
      `UPDATE reportes_pendientes SET estado_sync = 'sincronizado', error_mensaje = NULL WHERE client_uuid = ?`,
      [client_uuid]
    );
  } catch (error) {
    console.error('Error al marcar reporte como sincronizado:', error);
  }
}

/**
 * Registra un fallo de sincronización temporal e incrementa intentos.
 */
export function marcarErrorSync(client_uuid: string, error: string): void {
  try {
    const res = db.getFirstSync<{ intentos: number }>(
      `SELECT intentos FROM reportes_pendientes WHERE client_uuid = ?`,
      [client_uuid]
    );
    const nuevosIntentos = (res?.intentos ?? 0) + 1;
    // Si falló más de 3 veces, marcar como 'error' para no saturar la red ni la cola
    const nuevoEstado = nuevosIntentos >= 3 ? 'error' : 'pendiente';

    db.runSync(
      `UPDATE reportes_pendientes SET estado_sync = ?, error_mensaje = ?, intentos = ? WHERE client_uuid = ?`,
      [nuevoEstado, error, nuevosIntentos, client_uuid]
    );
  } catch (err) {
    console.error('Error al registrar fallo de sync:', err);
  }
}

/**
 * Purga de la base de datos local los reportes que ya fueron sincronizados o que superaron el límite de reintentos.
 */
export function purgarReportesAntiguos(): void {
  try {
    db.runSync(`DELETE FROM reportes_pendientes WHERE estado_sync = 'sincronizado' OR intentos >= 3`);
  } catch (err) {
    console.warn('[offlineQueue] Error al purgar reportes antiguos:', err);
  }
}

/**
 * Sincroniza la cola local contra el backend Django cuando hay conexión 2G/4G.
 */
export async function sincronizarColaOffline(token?: string | null): Promise<{
  total: number;
  sincronizados: number;
  fallidos: number;
}> {
  const pendientes = obtenerReportesPendientes();
  if (pendientes.length === 0) {
    return { total: 0, sincronizados: 0, fallidos: 0 };
  }

  let sincronizados = 0;
  let fallidos = 0;

  for (const item of pendientes) {
    const latitudRedondeada = Number(Number(item.latitud).toFixed(6));
    const longitudRedondeada = Number(Number(item.longitud).toFixed(6));

    // Preservar la imagen Base64 (data:image o base64 codificado)
    const fotoLimpia =
      item.foto_uri && (item.foto_uri.startsWith('data:image') || item.foto_uri.length > 200)
        ? item.foto_uri
        : null;

    try {
      await enviarReporteApi(
        {
          client_uuid: item.client_uuid,
          latitud: latitudRedondeada,
          longitud: longitudRedondeada,
          precision_m: item.precision_m,
          azimut: item.azimut,
          tipo_fuego: item.tipo_fuego,
          combustible: item.combustible,
          foto_uri: fotoLimpia,
          foto_base64: fotoLimpia,
          video_uri: item.video_uri || null,
          fecha_captura: item.fecha_captura
        },
        token
      );

      marcarComoSincronizado(item.client_uuid);
      sincronizados++;
    } catch (err: any) {
      console.warn(`[offlineQueue] Fallo al sincronizar reporte ${item.client_uuid}:`, err?.message || err);
      // Solo en el último intento (intentos >= 2) degradar enviando sin fotografía para asegurar las coordenadas
      if ((item.intentos || 0) >= 2 && fotoLimpia) {
        try {
          await enviarReporteApi(
            {
              client_uuid: item.client_uuid,
              latitud: latitudRedondeada,
              longitud: longitudRedondeada,
              precision_m: item.precision_m,
              azimut: item.azimut,
              tipo_fuego: item.tipo_fuego,
              combustible: item.combustible,
              foto_uri: null,
              fecha_captura: item.fecha_captura
            },
            token
          );
          marcarComoSincronizado(item.client_uuid);
          sincronizados++;
          continue;
        } catch (rescueErr: any) {
          console.warn(`[offlineQueue] Falló rescate sin foto para ${item.client_uuid}:`, rescueErr?.message || rescueErr);
        }
      }
      marcarErrorSync(item.client_uuid, err?.message || 'Error de red');
      fallidos++;
    }
  }

  return {
    total: pendientes.length,
    sincronizados,
    fallidos
  };
}

