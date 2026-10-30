import * as SQLite from 'expo-sqlite';

/**
 * Instancia síncrona de base de datos local SQLite (Expo SDK 51+ / SDK 58).
 */
export const db = SQLite.openDatabaseSync('willai_coracora.db');

/**
 * Inicializa la tabla `reportes_pendientes` con los campos exactos requeridos.
 */
export function initDatabase(): void {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS reportes_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_uuid TEXT NOT NULL UNIQUE,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        precision_m REAL,
        azimut REAL,
        tipo_fuego TEXT NOT NULL,
        combustible TEXT NOT NULL,
        foto_uri TEXT,
        fecha_captura TEXT NOT NULL,
        estado_sync TEXT NOT NULL DEFAULT 'pendiente',
        error_mensaje TEXT,
        intentos INTEGER DEFAULT 0
      );
    `);
  } catch (error) {
    console.error('Error al inicializar tabla SQLite reportes_pendientes:', error);
  }
}

