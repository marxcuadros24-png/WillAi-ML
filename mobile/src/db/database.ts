import * as SQLite from 'expo-sqlite';

let _dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Obtiene la instancia activa de SQLite o la inicializa si está cerrada o no existe.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!_dbInstance) {
    _dbInstance = SQLite.openDatabaseSync('willai_coracora.db');
  }
  return _dbInstance;
}

/**
 * Proxy transparente para la base de datos local SQLite.
 * Si la conexión se cerró por ciclo de vida nativo de Android (Error: Access to closed resource),
 * reabre automáticamente la base de datos sin lanzar excepciones ni romper la sincronización.
 */
export const db: SQLite.SQLiteDatabase = new Proxy({} as SQLite.SQLiteDatabase, {
  get(_target, prop) {
    const instance = getDb();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return (...args: any[]) => {
        try {
          return val.apply(instance, args);
        } catch (err: any) {
          if (
            err?.message?.includes('closed') ||
            err?.message?.includes('Access to closed resource')
          ) {
            console.warn('[SQLite] Reabriendo conexión tras cierre nativo...');
            _dbInstance = SQLite.openDatabaseSync('willai_coracora.db');
            const reloadedVal = (_dbInstance as any)[prop];
            return reloadedVal.apply(_dbInstance, args);
          }
          throw err;
        }
      };
    }
    return val;
  }
});

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
