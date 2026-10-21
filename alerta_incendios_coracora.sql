-- Alerta Incendios Coracora
-- Esquema inicial integrado para MySQL 8.0.16+ (InnoDB)
-- Recomendación: probar primero en una base de datos de desarrollo.
-- Las claves de NASA FIRMS deben permanecer en variables de entorno del backend.

CREATE DATABASE IF NOT EXISTS alerta_incendios_coracora
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE alerta_incendios_coracora;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- 1. Geografía administrativa
CREATE TABLE distritos (
  id_distrito BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ubigeo CHAR(6) NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  provincia VARCHAR(120) NOT NULL DEFAULT 'Parinacochas',
  departamento VARCHAR(120) NOT NULL DEFAULT 'Ayacucho',
  limite GEOMETRY NOT NULL SRID 4326,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SPATIAL INDEX spx_distritos_limite (limite),
  UNIQUE KEY uq_distrito_nombre (departamento, provincia, nombre)
) ENGINE=InnoDB;

CREATE TABLE comunidades (
  id_comunidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_distrito BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('comunidad_campesina','centro_poblado','anexo','sector','otro') NOT NULL DEFAULT 'otro',
  centro GEOMETRY NULL SRID 4326,
  limite GEOMETRY NULL SRID 4326,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comunidades_distrito FOREIGN KEY (id_distrito) REFERENCES distritos(id_distrito),
  UNIQUE KEY uq_comunidad_distrito_nombre (id_distrito, nombre)
) ENGINE=InnoDB;

-- 2. Usuarios, autenticación, roles y permisos
CREATE TABLE usuarios (
  id_usuario BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  nombre_visible VARCHAR(160) NULL,
  telefono VARCHAR(30) NULL,
  correo VARCHAR(254) NULL,
  password_hash VARCHAR(255) NOT NULL,
  estado ENUM('pendiente','activo','suspendido','eliminado') NOT NULL DEFAULT 'pendiente',
  verificado_en DATETIME NULL,
  ultimo_acceso_en DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_correo (correo),
  UNIQUE KEY uq_usuarios_telefono (telefono),
  INDEX idx_usuarios_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id_rol BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(500) NULL,
  sistema BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE permisos (
  id_permiso BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NULL
) ENGINE=InnoDB;

CREATE TABLE usuario_roles (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_rol BIGINT UNSIGNED NOT NULL,
  asignado_por BIGINT UNSIGNED NULL,
  asignado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_rol),
  CONSTRAINT fk_usuario_roles_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_usuario_roles_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol),
  CONSTRAINT fk_usuario_roles_asignador FOREIGN KEY (asignado_por) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE rol_permisos (
  id_rol BIGINT UNSIGNED NOT NULL,
  id_permiso BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_rol, id_permiso),
  CONSTRAINT fk_rol_permisos_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol),
  CONSTRAINT fk_rol_permisos_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso)
) ENGINE=InnoDB;

-- 3. Entidades, brigadas y personal de respuesta
CREATE TABLE entidades (
  id_entidad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(180) NOT NULL,
  tipo ENUM('municipalidad','ogrd','coel','coep','coer','serfor','bomberos','comunidad','policia','salud','otra') NOT NULL DEFAULT 'otra',
  sigla VARCHAR(40) NULL,
  telefono_operativo VARCHAR(30) NULL,
  correo_operativo VARCHAR(254) NULL,
  id_distrito BIGINT UNSIGNED NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_entidades_distrito FOREIGN KEY (id_distrito) REFERENCES distritos(id_distrito),
  INDEX idx_entidades_tipo_activa (tipo, activa)
) ENGINE=InnoDB;

CREATE TABLE brigadas (
  id_brigada BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_entidad BIGINT UNSIGNED NULL,
  id_comunidad BIGINT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('comunal','bomberos','municipal','forestal','otra') NOT NULL DEFAULT 'comunal',
  estado ENUM('disponible','ocupada','inactiva') NOT NULL DEFAULT 'disponible',
  telefono_contacto VARCHAR(30) NULL,
  base_ubicacion POINT NULL SRID 4326,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_brigadas_entidad FOREIGN KEY (id_entidad) REFERENCES entidades(id_entidad),
  CONSTRAINT fk_brigadas_comunidad FOREIGN KEY (id_comunidad) REFERENCES comunidades(id_comunidad),
  INDEX idx_brigadas_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE brigadistas (
  id_brigada BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  funcion VARCHAR(100) NOT NULL DEFAULT 'integrante',
  desde DATE NOT NULL,
  hasta DATE NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_brigada, id_usuario, desde),
  CONSTRAINT fk_brigadistas_brigada FOREIGN KEY (id_brigada) REFERENCES brigadas(id_brigada),
  CONSTRAINT fk_brigadistas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_brigadistas_usuario (id_usuario, activo)
) ENGINE=InnoDB;

CREATE TABLE recursos_emergencia (
  id_recurso BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_entidad BIGINT UNSIGNED NULL,
  id_brigada BIGINT UNSIGNED NULL,
  nombre VARCHAR(150) NOT NULL,
  categoria ENUM('vehiculo','herramienta','proteccion','agua','comunicacion','botiquin','otro') NOT NULL DEFAULT 'otro',
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  estado ENUM('disponible','asignado','mantenimiento','inoperativo') NOT NULL DEFAULT 'disponible',
  ubicacion POINT NULL SRID 4326,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recursos_entidad FOREIGN KEY (id_entidad) REFERENCES entidades(id_entidad),
  CONSTRAINT fk_recursos_brigada FOREIGN KEY (id_brigada) REFERENCES brigadas(id_brigada),
  INDEX idx_recursos_estado_categoria (estado, categoria)
) ENGINE=InnoDB;

-- 4. Reportes ciudadanos, evidencias, sincronización y validación
CREATE TABLE reportes (
  id_reporte BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_comunidad BIGINT UNSIGNED NULL,
  tipo_incendio ENUM('forestal','agricola','pastizal','residencial','otro','desconocido') NOT NULL DEFAULT 'desconocido',
  fecha_evento DATETIME NOT NULL,
  descripcion TEXT NULL,
  ubicacion POINT NOT NULL SRID 4326,
  precision_metros DECIMAL(8,2) NULL,
  direccion_viento ENUM('N','NE','E','SE','S','SO','O','NO','desconocida') NOT NULL DEFAULT 'desconocida',
  estado ENUM('recibido','pendiente_revision','en_revision','validado','observado','rechazado','vinculado','cerrado') NOT NULL DEFAULT 'recibido',
  origen ENUM('web','movil','offline_sincronizado','operador') NOT NULL DEFAULT 'web',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sincronizado_en DATETIME NULL,
  CONSTRAINT fk_reportes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_reportes_comunidad FOREIGN KEY (id_comunidad) REFERENCES comunidades(id_comunidad),
  INDEX idx_reportes_estado_fecha (estado, fecha_evento),
  INDEX idx_reportes_comunidad_fecha (id_comunidad, fecha_evento),
  SPATIAL INDEX spx_reportes_ubicacion (ubicacion)
) ENGINE=InnoDB;

CREATE TABLE evidencias (
  id_evidencia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  tipo ENUM('fotografia','video','audio','documento','otro') NOT NULL DEFAULT 'fotografia',
  uri_archivo VARCHAR(1000) NOT NULL,
  nombre_original VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  tamano_bytes BIGINT UNSIGNED NULL,
  sha256 CHAR(64) NULL,
  capturada_en DATETIME NULL,
  metadatos JSON NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidencias_reporte FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte),
  INDEX idx_evidencias_reporte (id_reporte),
  UNIQUE KEY uq_evidencias_sha256 (sha256)
) ENGINE=InnoDB;

CREATE TABLE sincronizaciones (
  id_sincronizacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NOT NULL,
  uuid_dispositivo CHAR(36) NOT NULL,
  uuid_registro_cliente CHAR(36) NOT NULL,
  tipo_registro ENUM('reporte','evidencia','otro') NOT NULL,
  estado ENUM('recibido','procesando','sincronizado','error') NOT NULL DEFAULT 'recibido',
  error_detalle VARCHAR(1000) NULL,
  recibido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  procesado_en DATETIME NULL,
  CONSTRAINT fk_sincronizaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  UNIQUE KEY uq_sync_cliente (id_usuario, uuid_dispositivo, uuid_registro_cliente),
  INDEX idx_sync_estado_fecha (estado, recibido_en)
) ENGINE=InnoDB;

CREATE TABLE validaciones_reporte (
  id_validacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_revisor BIGINT UNSIGNED NOT NULL,
  resultado ENUM('pendiente','validado','observado','rechazado') NOT NULL,
  comentario TEXT NULL,
  validado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_validaciones_reporte FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte),
  CONSTRAINT fk_validaciones_revisor FOREIGN KEY (id_revisor) REFERENCES usuarios(id_usuario),
  INDEX idx_validaciones_reporte_fecha (id_reporte, validado_en)
) ENGINE=InnoDB;

-- 5. Incidentes, estados, acciones, cierre y asignaciones
CREATE TABLE incidentes (
  id_incidente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  titulo VARCHAR(200) NOT NULL,
  tipo_incendio ENUM('forestal','agricola','pastizal','residencial','otro','desconocido') NOT NULL DEFAULT 'desconocido',
  estado ENUM('nuevo','verificacion','confirmado','asignado','en_atencion','contenido','controlado','cerrado','descartado') NOT NULL DEFAULT 'nuevo',
  prioridad ENUM('baja','media','alta','critica','indeterminada') NOT NULL DEFAULT 'indeterminada',
  ubicacion_referencia POINT NOT NULL SRID 4326,
  perimetro GEOMETRY NULL SRID 4326,
  id_distrito BIGINT UNSIGNED NULL,
  id_comunidad BIGINT UNSIGNED NULL,
  detectado_en DATETIME NULL,
  confirmado_en DATETIME NULL,
  cerrado_en DATETIME NULL,
  resumen TEXT NULL,
  creado_por BIGINT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_incidentes_distrito FOREIGN KEY (id_distrito) REFERENCES distritos(id_distrito),
  CONSTRAINT fk_incidentes_comunidad FOREIGN KEY (id_comunidad) REFERENCES comunidades(id_comunidad),
  CONSTRAINT fk_incidentes_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario),
  INDEX idx_incidentes_estado_prioridad (estado, prioridad),
  INDEX idx_incidentes_fecha (detectado_en),
  SPATIAL INDEX spx_incidentes_ubicacion (ubicacion_referencia)
) ENGINE=InnoDB;

CREATE TABLE reporte_incidente (
  id_reporte BIGINT UNSIGNED NOT NULL,
  id_incidente BIGINT UNSIGNED NOT NULL,
  tipo_vinculo ENUM('origen','corroboracion','actualizacion','otro') NOT NULL DEFAULT 'corroboracion',
  vinculado_por BIGINT UNSIGNED NULL,
  vinculado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_reporte, id_incidente),
  CONSTRAINT fk_ri_reporte FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte),
  CONSTRAINT fk_ri_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_ri_usuario FOREIGN KEY (vinculado_por) REFERENCES usuarios(id_usuario),
  INDEX idx_ri_incidente (id_incidente)
) ENGINE=InnoDB;

CREATE TABLE historial_incidentes (
  id_historial BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_incidente BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NULL,
  estado_anterior VARCHAR(40) NULL,
  estado_nuevo VARCHAR(40) NOT NULL,
  nota TEXT NULL,
  registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_historial_incidente_fecha (id_incidente, registrado_en)
) ENGINE=InnoDB;

CREATE TABLE acciones_atencion (
  id_accion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_incidente BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NULL,
  id_brigada BIGINT UNSIGNED NULL,
  tipo_accion VARCHAR(100) NOT NULL,
  descripcion TEXT NOT NULL,
  resultado TEXT NULL,
  ubicacion POINT NULL SRID 4326,
  iniciada_en DATETIME NULL,
  finalizada_en DATETIME NULL,
  registrada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_acciones_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_acciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_acciones_brigada FOREIGN KEY (id_brigada) REFERENCES brigadas(id_brigada),
  INDEX idx_acciones_incidente_fecha (id_incidente, registrada_en)
) ENGINE=InnoDB;

CREATE TABLE asignaciones_brigada (
  id_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_incidente BIGINT UNSIGNED NOT NULL,
  id_brigada BIGINT UNSIGNED NOT NULL,
  asignado_por BIGINT UNSIGNED NULL,
  estado ENUM('asignada','aceptada','en_camino','trabajando','finalizada','cancelada') NOT NULL DEFAULT 'asignada',
  instrucciones TEXT NULL,
  asignada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  aceptada_en DATETIME NULL,
  finalizada_en DATETIME NULL,
  CONSTRAINT fk_asignaciones_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_asignaciones_brigada FOREIGN KEY (id_brigada) REFERENCES brigadas(id_brigada),
  CONSTRAINT fk_asignaciones_usuario FOREIGN KEY (asignado_por) REFERENCES usuarios(id_usuario),
  INDEX idx_asignaciones_incidente_estado (id_incidente, estado),
  INDEX idx_asignaciones_brigada_estado (id_brigada, estado)
) ENGINE=InnoDB;

CREATE TABLE cierres_incidente (
  id_cierre BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_incidente BIGINT UNSIGNED NOT NULL,
  cerrado_por BIGINT UNSIGNED NOT NULL,
  motivo TEXT NOT NULL,
  evidencia_uri VARCHAR(1000) NULL,
  cerrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cierres_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_cierres_usuario FOREIGN KEY (cerrado_por) REFERENCES usuarios(id_usuario),
  UNIQUE KEY uq_cierre_incidente (id_incidente)
) ENGINE=InnoDB;

-- 6. NASA FIRMS: fuentes, lotes, observaciones originales y asociación opcional a incidentes
CREATE TABLE fuentes_satelitales (
  id_fuente BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo_producto VARCHAR(80) NOT NULL UNIQUE,
  proveedor VARCHAR(100) NOT NULL DEFAULT 'NASA FIRMS',
  sensor VARCHAR(50) NOT NULL,
  plataforma VARCHAR(80) NULL,
  tipo_producto ENUM('NRT','STANDARD','ARCHIVE','OTRO') NOT NULL DEFAULT 'NRT',
  documentacion_url VARCHAR(500) NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE lotes_importacion_firms (
  id_lote BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_fuente BIGINT UNSIGNED NOT NULL,
  identificador_lote VARCHAR(160) NOT NULL UNIQUE,
  consulta_desde DATETIME NULL,
  consulta_hasta DATETIME NULL,
  bbox POLYGON NULL SRID 4326,
  estado ENUM('iniciado','completado','parcial','fallido') NOT NULL DEFAULT 'iniciado',
  filas_recibidas INT UNSIGNED NOT NULL DEFAULT 0,
  filas_insertadas INT UNSIGNED NOT NULL DEFAULT 0,
  filas_actualizadas INT UNSIGNED NOT NULL DEFAULT 0,
  filas_omitidas INT UNSIGNED NOT NULL DEFAULT 0,
  checksum_archivo CHAR(64) NULL,
  iniciado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_en DATETIME NULL,
  error_detalle TEXT NULL,
  CONSTRAINT fk_lotes_fuente FOREIGN KEY (id_fuente) REFERENCES fuentes_satelitales(id_fuente),
  INDEX idx_lotes_fuente_fecha (id_fuente, iniciado_en)
) ENGINE=InnoDB;

CREATE TABLE detecciones_satelitales (
  id_deteccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_fuente BIGINT UNSIGNED NOT NULL,
  id_lote_primero BIGINT UNSIGNED NULL,
  clave_deteccion CHAR(64) NOT NULL UNIQUE,
  fecha_observacion DATETIME NOT NULL,
  ubicacion POINT NOT NULL SRID 4326,
  latitud DECIMAL(9,6) NOT NULL,
  longitud DECIMAL(9,6) NOT NULL,
  frp_mw DECIMAL(12,4) NULL,
  confianza VARCHAR(40) NULL,
  confianza_numerica DECIMAL(7,3) NULL,
  brillo_kelvin DECIMAL(8,3) NULL,
  scan_km DECIMAL(8,3) NULL,
  track_km DECIMAL(8,3) NULL,
  dia_noche CHAR(1) NULL,
  codigo_satelite VARCHAR(40) NULL,
  codigo_instrumento VARCHAR(40) NULL,
  version_producto VARCHAR(80) NULL,
  datos_originales JSON NULL,
  primera_importacion_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_actualizacion_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_detecciones_fuente FOREIGN KEY (id_fuente) REFERENCES fuentes_satelitales(id_fuente),
  CONSTRAINT fk_detecciones_lote FOREIGN KEY (id_lote_primero) REFERENCES lotes_importacion_firms(id_lote),
  INDEX idx_detecciones_fecha (fecha_observacion),
  INDEX idx_detecciones_fuente_fecha (id_fuente, fecha_observacion),
  SPATIAL INDEX spx_detecciones_ubicacion (ubicacion)
) ENGINE=InnoDB;

-- Relación N:M: una detección puede reaparecer en varios lotes sin duplicar la detección.
CREATE TABLE lote_detecciones_firms (
  id_lote BIGINT UNSIGNED NOT NULL,
  id_deteccion BIGINT UNSIGNED NOT NULL,
  estado_fila ENUM('insertada','existente','actualizada','omitida') NOT NULL DEFAULT 'existente',
  hash_fila CHAR(64) NULL,
  PRIMARY KEY (id_lote, id_deteccion),
  CONSTRAINT fk_ldf_lote FOREIGN KEY (id_lote) REFERENCES lotes_importacion_firms(id_lote),
  CONSTRAINT fk_ldf_deteccion FOREIGN KEY (id_deteccion) REFERENCES detecciones_satelitales(id_deteccion),
  INDEX idx_ldf_deteccion (id_deteccion)
) ENGINE=InnoDB;

CREATE TABLE deteccion_incidente (
  id_deteccion BIGINT UNSIGNED NOT NULL,
  id_incidente BIGINT UNSIGNED NOT NULL,
  metodo_vinculo ENUM('manual','regla_espacial','analisis_operativo') NOT NULL DEFAULT 'manual',
  vinculado_por BIGINT UNSIGNED NULL,
  confianza_vinculo DECIMAL(5,4) NULL,
  vinculado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_deteccion, id_incidente),
  CONSTRAINT fk_di_deteccion FOREIGN KEY (id_deteccion) REFERENCES detecciones_satelitales(id_deteccion),
  CONSTRAINT fk_di_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_di_usuario FOREIGN KEY (vinculado_por) REFERENCES usuarios(id_usuario),
  INDEX idx_di_incidente (id_incidente)
) ENGINE=InnoDB;

-- 7. Meteorología, zonas de riesgo y evaluación de viviendas
CREATE TABLE observaciones_meteorologicas (
  id_observacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor VARCHAR(120) NOT NULL,
  id_externo VARCHAR(180) NULL,
  ubicacion POINT NOT NULL SRID 4326,
  observada_en DATETIME NOT NULL,
  temperatura_c DECIMAL(6,2) NULL,
  humedad_relativa_pct DECIMAL(5,2) NULL,
  viento_kmh DECIMAL(7,2) NULL,
  direccion_viento_grados DECIMAL(6,2) NULL,
  precipitacion_mm DECIMAL(8,2) NULL,
  datos_originales JSON NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_meteo_proveedor_externo (proveedor, id_externo),
  INDEX idx_meteo_fecha (observada_en),
  SPATIAL INDEX spx_meteo_ubicacion (ubicacion)
) ENGINE=InnoDB;

CREATE TABLE zonas_riesgo (
  id_zona_riesgo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_incidente BIGINT UNSIGNED NULL,
  nombre VARCHAR(180) NOT NULL,
  origen ENUM('perimetro_verificado','modelo','evaluacion_operativa','otra') NOT NULL,
  nivel ENUM('bajo','moderado','alto','critico','indeterminado') NOT NULL DEFAULT 'indeterminado',
  geometria GEOMETRY NOT NULL SRID 4326,
  metodo VARCHAR(120) NOT NULL,
  version_metodo VARCHAR(80) NULL,
  valida_desde DATETIME NOT NULL,
  valida_hasta DATETIME NULL,
  creada_por BIGINT UNSIGNED NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_zonas_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_zonas_usuario FOREIGN KEY (creada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_zonas_incidente_nivel (id_incidente, nivel),
  SPATIAL INDEX spx_zonas_geometria (geometria)
) ENGINE=InnoDB;

CREATE TABLE viviendas (
  id_vivienda BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  id_comunidad BIGINT UNSIGNED NULL,
  referencia VARCHAR(255) NULL,
  ubicacion POINT NOT NULL SRID 4326,
  precision_metros DECIMAL(8,2) NULL,
  verificada BOOLEAN NOT NULL DEFAULT FALSE,
  verificada_por BIGINT UNSIGNED NULL,
  verificada_en DATETIME NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_viviendas_comunidad FOREIGN KEY (id_comunidad) REFERENCES comunidades(id_comunidad),
  CONSTRAINT fk_viviendas_verificador FOREIGN KEY (verificada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_viviendas_comunidad (id_comunidad, activa),
  SPATIAL INDEX spx_viviendas_ubicacion (ubicacion)
) ENGINE=InnoDB;

CREATE TABLE residentes_vivienda (
  id_vivienda BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  relacion ENUM('propietario','residente','familiar','responsable','otro') NOT NULL DEFAULT 'residente',
  recibe_alertas BOOLEAN NOT NULL DEFAULT TRUE,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  desde DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hasta DATETIME NULL,
  PRIMARY KEY (id_vivienda, id_usuario),
  CONSTRAINT fk_residentes_vivienda FOREIGN KEY (id_vivienda) REFERENCES viviendas(id_vivienda),
  CONSTRAINT fk_residentes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_residentes_usuario_alertas (id_usuario, recibe_alertas)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_exposicion (
  id_evaluacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_vivienda BIGINT UNSIGNED NOT NULL,
  id_incidente BIGINT UNSIGNED NULL,
  id_zona_riesgo BIGINT UNSIGNED NULL,
  nivel_riesgo ENUM('bajo','moderado','alto','critico','indeterminado') NOT NULL DEFAULT 'indeterminado',
  distancia_metros DECIMAL(12,2) NULL,
  metodo VARCHAR(120) NOT NULL,
  version_metodo VARCHAR(80) NULL,
  evaluada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  explicacion VARCHAR(1000) NULL,
  CONSTRAINT fk_exposicion_vivienda FOREIGN KEY (id_vivienda) REFERENCES viviendas(id_vivienda),
  CONSTRAINT fk_exposicion_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_exposicion_zona FOREIGN KEY (id_zona_riesgo) REFERENCES zonas_riesgo(id_zona_riesgo),
  INDEX idx_exposicion_incidente_fecha (id_incidente, evaluada_en),
  INDEX idx_exposicion_vivienda_fecha (id_vivienda, evaluada_en),
  INDEX idx_exposicion_nivel_fecha (nivel_riesgo, evaluada_en)
) ENGINE=InnoDB;

-- 8. Alertas, preferencias, destinatarios y entregas
CREATE TABLE alertas_emergencia (
  id_alerta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  id_incidente BIGINT UNSIGNED NULL,
  id_zona_riesgo BIGINT UNSIGNED NULL,
  tipo ENUM('nuevo_incendio','riesgo_vivienda','cambio_estado','evacuacion','prevencion','sistema','otro') NOT NULL DEFAULT 'otro',
  prioridad ENUM('informativa','baja','media','alta','critica') NOT NULL DEFAULT 'media',
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  instrucciones TEXT NULL,
  estado ENUM('borrador','pendiente_aprobacion','programada','enviando','enviada','cancelada','expirada') NOT NULL DEFAULT 'borrador',
  emitida_por BIGINT UNSIGNED NULL,
  aprobada_por BIGINT UNSIGNED NULL,
  aprobada_en DATETIME NULL,
  emitida_en DATETIME NULL,
  expira_en DATETIME NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alertas_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_alertas_zona FOREIGN KEY (id_zona_riesgo) REFERENCES zonas_riesgo(id_zona_riesgo),
  CONSTRAINT fk_alertas_emisor FOREIGN KEY (emitida_por) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_alertas_aprobador FOREIGN KEY (aprobada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_alertas_estado_prioridad (estado, prioridad),
  INDEX idx_alertas_incidente_fecha (id_incidente, creada_en)
) ENGINE=InnoDB;

CREATE TABLE preferencias_notificacion (
  id_usuario BIGINT UNSIGNED NOT NULL,
  canal ENUM('push','sms','correo','whatsapp_integrado','interno') NOT NULL,
  habilitado BOOLEAN NOT NULL DEFAULT TRUE,
  destino_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  destino VARCHAR(254) NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, canal),
  CONSTRAINT fk_preferencias_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

CREATE TABLE destinatarios_alerta (
  id_destinatario_alerta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_alerta BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_vivienda BIGINT UNSIGNED NULL,
  canal ENUM('push','sms','correo','whatsapp_integrado','interno') NOT NULL,
  motivo ENUM('suscripcion','vivienda_expuesta','brigada_asignada','autoridad','otro') NOT NULL DEFAULT 'otro',
  estado_entrega ENUM('pendiente','en_cola','enviado','entregado','fallido','confirmado','no_aplica') NOT NULL DEFAULT 'pendiente',
  proveedor_mensaje_id VARCHAR(200) NULL,
  intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ultimo_error VARCHAR(1000) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en DATETIME NULL,
  entregado_en DATETIME NULL,
  confirmado_en DATETIME NULL,
  CONSTRAINT fk_dest_alerta FOREIGN KEY (id_alerta) REFERENCES alertas_emergencia(id_alerta),
  CONSTRAINT fk_dest_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_dest_vivienda FOREIGN KEY (id_vivienda) REFERENCES viviendas(id_vivienda),
  UNIQUE KEY uq_dest_alerta_usuario_canal_vivienda (id_alerta, id_usuario, canal, id_vivienda),
  INDEX idx_dest_estado_creado (estado_entrega, creado_en),
  INDEX idx_dest_usuario_fecha (id_usuario, creado_en)
) ENGINE=InnoDB;

-- 9. Logros, insignias y actividades verificadas
CREATE TABLE insignias (
  id_insignia BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(60) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  icono_url VARCHAR(500) NULL,
  criterio JSON NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE actividades_usuario (
  id_actividad BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  id_usuario BIGINT UNSIGNED NOT NULL,
  tipo_actividad VARCHAR(80) NOT NULL,
  referencia_tipo VARCHAR(60) NULL,
  referencia_id BIGINT UNSIGNED NULL,
  estado ENUM('pendiente','validada','rechazada') NOT NULL DEFAULT 'pendiente',
  evidencia_referencia VARCHAR(1000) NULL,
  ocurrida_en DATETIME NOT NULL,
  validada_por BIGINT UNSIGNED NULL,
  validada_en DATETIME NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_actividades_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_actividades_validador FOREIGN KEY (validada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_actividades_usuario_estado (id_usuario, estado, ocurrida_en),
  INDEX idx_actividades_tipo_fecha (tipo_actividad, ocurrida_en)
) ENGINE=InnoDB;

CREATE TABLE usuario_insignias (
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_insignia BIGINT UNSIGNED NOT NULL,
  id_actividad_desbloqueo BIGINT UNSIGNED NULL,
  desbloqueada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  otorgada_por BIGINT UNSIGNED NULL,
  PRIMARY KEY (id_usuario, id_insignia),
  CONSTRAINT fk_ui_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_ui_insignia FOREIGN KEY (id_insignia) REFERENCES insignias(id_insignia),
  CONSTRAINT fk_ui_actividad FOREIGN KEY (id_actividad_desbloqueo) REFERENCES actividades_usuario(id_actividad),
  CONSTRAINT fk_ui_otorgante FOREIGN KEY (otorgada_por) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- 10. Modelos predictivos y resultados
CREATE TABLE modelos_predictivos (
  id_modelo BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  version VARCHAR(80) NOT NULL,
  algoritmo VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  artefacto_uri VARCHAR(1000) NULL,
  metricas_validacion JSON NULL,
  estado ENUM('experimental','validado','retirado') NOT NULL DEFAULT 'experimental',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_modelo_version (nombre, version)
) ENGINE=InnoDB;

CREATE TABLE ejecuciones_modelo (
  id_ejecucion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_modelo BIGINT UNSIGNED NOT NULL,
  id_incidente BIGINT UNSIGNED NULL,
  iniciado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_en DATETIME NULL,
  estado ENUM('pendiente','ejecutando','completado','fallido') NOT NULL DEFAULT 'pendiente',
  parametros JSON NULL,
  resumen_error TEXT NULL,
  CONSTRAINT fk_ejec_modelo FOREIGN KEY (id_modelo) REFERENCES modelos_predictivos(id_modelo),
  CONSTRAINT fk_ejec_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  INDEX idx_ejec_modelo_fecha (id_modelo, iniciado_en),
  INDEX idx_ejec_estado_fecha (estado, iniciado_en)
) ENGINE=InnoDB;

CREATE TABLE predicciones (
  id_prediccion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ejecucion BIGINT UNSIGNED NOT NULL,
  geometria GEOMETRY NOT NULL SRID 4326,
  horizonte_desde DATETIME NOT NULL,
  horizonte_hasta DATETIME NOT NULL,
  probabilidad DECIMAL(6,5) NULL,
  nivel ENUM('bajo','moderado','alto','critico','indeterminado') NOT NULL DEFAULT 'indeterminado',
  incertidumbre JSON NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_predicciones_ejecucion FOREIGN KEY (id_ejecucion) REFERENCES ejecuciones_modelo(id_ejecucion),
  INDEX idx_predicciones_horizonte (horizonte_desde, horizonte_hasta),
  SPATIAL INDEX spx_predicciones_geometria (geometria)
) ENGINE=InnoDB;

-- 11. Auditoría
CREATE TABLE auditoria (
  id_auditoria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NULL,
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(100) NOT NULL,
  id_registro VARCHAR(100) NULL,
  ip_hash CHAR(64) NULL,
  detalles JSON NULL,
  ocurrido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_auditoria_entidad_fecha (entidad, ocurrido_en),
  INDEX idx_auditoria_usuario_fecha (id_usuario, ocurrido_en)
) ENGINE=InnoDB;



-- 12. Donaciones comunitarias de viveres, herramientas y apoyo logístico
-- Las ofertas no son recursos de emergencia disponibles hasta que sean revisadas
-- y aceptadas por un responsable autorizado.
CREATE TABLE donantes (
  id_donante BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT UNSIGNED NULL,
  tipo_donante ENUM('persona','negocio','organizacion') NOT NULL DEFAULT 'persona',
  nombre_publico VARCHAR(180) NOT NULL,
  identificador_fiscal VARCHAR(30) NULL,
  telefono_contacto VARCHAR(30) NULL,
  correo_contacto VARCHAR(254) NULL,
  mostrar_contacto_publico BOOLEAN NOT NULL DEFAULT FALSE,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  estado ENUM('activo','suspendido') NOT NULL DEFAULT 'activo',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_donantes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  UNIQUE KEY uq_donantes_usuario (id_usuario),
  INDEX idx_donantes_tipo_estado (tipo_donante, estado),
  INDEX idx_donantes_nombre (nombre_publico)
) ENGINE=InnoDB;

CREATE TABLE ofertas_donacion (
  id_oferta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  id_donante BIGINT UNSIGNED NOT NULL,
  id_distrito BIGINT UNSIGNED NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  modalidad_entrega ENUM('entrega_en_punto','recojo','coordinar') NOT NULL DEFAULT 'coordinar',
  ubicacion_entrega POINT NULL SRID 4326,
  referencia_entrega VARCHAR(500) NULL,
  disponible_desde DATETIME NULL,
  disponible_hasta DATETIME NULL,
  estado ENUM('borrador','pendiente_revision','publicada','reservada_parcial','reservada','entregada_parcial','completada','rechazada','cancelada','vencida') NOT NULL DEFAULT 'pendiente_revision',
  motivo_rechazo VARCHAR(500) NULL,
  revisada_por BIGINT UNSIGNED NULL,
  revisada_en DATETIME NULL,
  publicada_en DATETIME NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ofertas_donante FOREIGN KEY (id_donante) REFERENCES donantes(id_donante),
  CONSTRAINT fk_ofertas_distrito FOREIGN KEY (id_distrito) REFERENCES distritos(id_distrito),
  CONSTRAINT fk_ofertas_revisor FOREIGN KEY (revisada_por) REFERENCES usuarios(id_usuario),
  INDEX idx_ofertas_estado_fecha (estado, creada_en),
  INDEX idx_ofertas_distrito_estado (id_distrito, estado),
  INDEX idx_ofertas_disponibilidad (disponible_desde, disponible_hasta)
) ENGINE=InnoDB;

CREATE TABLE items_oferta_donacion (
  id_item_donacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_oferta BIGINT UNSIGNED NOT NULL,
  categoria ENUM('viveres','agua','herramientas','proteccion_personal','botiquin','transporte','alojamiento','comunicacion','otro') NOT NULL DEFAULT 'otro',
  nombre_item VARCHAR(180) NOT NULL,
  descripcion VARCHAR(1000) NULL,
  cantidad_ofrecida DECIMAL(12,3) NOT NULL,
  unidad VARCHAR(40) NOT NULL,
  cantidad_disponible DECIMAL(12,3) NOT NULL,
  condicion ENUM('nuevo','buen_estado','usado','perecible','no_aplica','requiere_revision') NOT NULL DEFAULT 'no_aplica',
  fecha_vencimiento DATE NULL,
  requiere_cadena_frio BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones VARCHAR(1000) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_oferta FOREIGN KEY (id_oferta) REFERENCES ofertas_donacion(id_oferta),
  CONSTRAINT chk_item_cantidad_ofrecida CHECK (cantidad_ofrecida > 0),
  CONSTRAINT chk_item_cantidad_disponible CHECK (cantidad_disponible >= 0 AND cantidad_disponible <= cantidad_ofrecida),
  INDEX idx_items_categoria (categoria),
  INDEX idx_items_oferta (id_oferta)
) ENGINE=InnoDB;

CREATE TABLE asignaciones_donacion (
  id_asignacion_donacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_item_donacion BIGINT UNSIGNED NOT NULL,
  id_incidente BIGINT UNSIGNED NULL,
  id_brigada BIGINT UNSIGNED NULL,
  id_entidad BIGINT UNSIGNED NULL,
  cantidad_asignada DECIMAL(12,3) NOT NULL,
  estado ENUM('solicitada','aprobada','preparando','en_transito','entregada','rechazada','cancelada') NOT NULL DEFAULT 'solicitada',
  solicitada_por BIGINT UNSIGNED NULL,
  aprobada_por BIGINT UNSIGNED NULL,
  solicitada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  aprobada_en DATETIME NULL,
  entregada_en DATETIME NULL,
  comprobante_uri VARCHAR(1000) NULL,
  observaciones VARCHAR(1000) NULL,
  CONSTRAINT fk_asig_donacion_item FOREIGN KEY (id_item_donacion) REFERENCES items_oferta_donacion(id_item_donacion),
  CONSTRAINT fk_asig_donacion_incidente FOREIGN KEY (id_incidente) REFERENCES incidentes(id_incidente),
  CONSTRAINT fk_asig_donacion_brigada FOREIGN KEY (id_brigada) REFERENCES brigadas(id_brigada),
  CONSTRAINT fk_asig_donacion_entidad FOREIGN KEY (id_entidad) REFERENCES entidades(id_entidad),
  CONSTRAINT fk_asig_donacion_solicitante FOREIGN KEY (solicitada_por) REFERENCES usuarios(id_usuario),
  CONSTRAINT fk_asig_donacion_aprobador FOREIGN KEY (aprobada_por) REFERENCES usuarios(id_usuario),
  CONSTRAINT chk_asig_donacion_un_destino CHECK (
    (id_incidente IS NOT NULL) + (id_brigada IS NOT NULL) + (id_entidad IS NOT NULL) = 1
  ),
  CONSTRAINT chk_asig_donacion_cantidad CHECK (cantidad_asignada > 0),
  INDEX idx_asig_donacion_estado_fecha (estado, solicitada_en),
  INDEX idx_asig_donacion_incidente (id_incidente),
  INDEX idx_asig_donacion_brigada (id_brigada),
  INDEX idx_asig_donacion_entidad (id_entidad)
) ENGINE=InnoDB;

CREATE TABLE historial_ofertas_donacion (
  id_historial_oferta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_oferta BIGINT UNSIGNED NOT NULL,
  id_usuario BIGINT UNSIGNED NULL,
  estado_anterior VARCHAR(40) NULL,
  estado_nuevo VARCHAR(40) NOT NULL,
  comentario VARCHAR(1000) NULL,
  ocurrido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_oferta_oferta FOREIGN KEY (id_oferta) REFERENCES ofertas_donacion(id_oferta),
  CONSTRAINT fk_hist_oferta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  INDEX idx_hist_oferta_fecha (id_oferta, ocurrido_en)
) ENGINE=InnoDB;

-- Catálogos mínimos iniciales: ejecutar una sola vez en el despliegue inicial.
INSERT IGNORE INTO roles (codigo, nombre, descripcion, sistema) VALUES
('poblador','Poblador','Reporta incidentes y recibe alertas autorizadas',TRUE),
('brigadista','Brigadista','Participa en operaciones de respuesta',TRUE),
('verificador','Verificador','Revisa y valida reportes',TRUE),
('operador_emergencia','Operador de emergencia','Gestiona incidentes y asignaciones',TRUE),
('administrador','Administrador','Administra configuración y accesos',TRUE);

INSERT IGNORE INTO permisos (codigo, descripcion) VALUES
('reporte.crear','Crear reportes ciudadanos'),
('reporte.validar','Validar reportes'),
('incidente.gestionar','Gestionar incidentes'),
('brigada.asignar','Asignar brigadas'),
('alerta.aprobar','Aprobar alertas de emergencia'),
('vivienda.ver_restringida','Acceder a ubicaciones exactas de viviendas'),
('usuario.gestionar','Gestionar usuarios y roles'),
('firms.importar','Importar datos de NASA FIRMS'),
('auditoria.consultar','Consultar auditoría'),
('donacion.publicar','Publicar ofertas de donación'),
('donacion.revisar','Revisar y moderar ofertas de donación'),
('donacion.asignar','Asignar donaciones a incidentes, brigadas o entidades'),
('donacion.confirmar_entrega','Confirmar recepción de donaciones');

INSERT IGNORE INTO fuentes_satelitales (codigo_producto, proveedor, sensor, plataforma, tipo_producto, documentacion_url) VALUES
('MODIS_NRT','NASA FIRMS','MODIS','Terra/Aqua','NRT','https://firms.modaps.eosdis.nasa.gov/api/area/'),
('VIIRS_NOAA20_NRT','NASA FIRMS','VIIRS','NOAA-20','NRT','https://firms.modaps.eosdis.nasa.gov/api/area/'),
('VIIRS_NOAA21_NRT','NASA FIRMS','VIIRS','NOAA-21','NRT','https://firms.modaps.eosdis.nasa.gov/api/area/');

INSERT IGNORE INTO insignias (codigo, nombre, descripcion, icono_url, criterio) VALUES
('primer_aviso','Primer aviso','Envió un primer reporte que fue validado.','badges/primer-aviso.svg',JSON_OBJECT('tipo_actividad','reporte_validado','cantidad',1)),
('guardian_bosque','Guardián del bosque','Participó en una actividad de prevención validada.','badges/guardian-bosque.svg',JSON_OBJECT('tipo_actividad','prevencion_validada','cantidad',1)),
('vigilante_comunal','Vigilante comunal','Contribuyó con información preventiva verificada.','badges/vigilante-comunal.svg',JSON_OBJECT('tipo_actividad','aporte_preventivo_validado','cantidad',1)),
('comunidad_preparada','Comunidad preparada','Participó en una capacitación o simulacro registrado.','badges/comunidad-preparada.svg',JSON_OBJECT('tipo_actividad','capacitacion_validada','cantidad',1));

-- Módulo de donaciones: ofertas moderadas, inventario por ítem, asignación con destino único e historial.
-- Fin del esquema. Los usuarios administrativos, permisos, geometrías distritales,
-- claves FIRMS y credenciales se configuran por un procedimiento de despliegue seguro.
