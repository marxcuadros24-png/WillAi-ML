export type SeveridadType = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoIncidente = 'pendiente' | 'en_combate' | 'controlado' | 'extinguido' | 'cerrado';
export type EstadoBrigada = 'disponible' | 'en_operacion' | 'en_descanso' | 'inactiva' | 'desplegada';

export interface Incidente {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  severidad: SeveridadType;
  estado: EstadoIncidente;
  latitud: number;
  longitud: number;
  comunidad: string;
  fecha_inicio: string;
  brigadas_asignadas: string[];
  viviendas_riesgo: number;
  reportado_por: string;
  origen: 'ciudadano' | 'satelital' | 'verificador';
  tipo_incendio?: string;
}

export interface FocoCalor {
  id: number;
  sensor: string; // 'MODIS', 'VIIRS', 'LANDSAT', 'MULTI_SAT'
  satelite?: string; // 'Terra', 'Aqua', 'NOAA-20', 'NOAA-21'
  latitud: number;
  longitud: number;
  fecha_hora: string;
  frp: number; // Fire Radiative Power (MW)
  confianza: string; // 'high', 'nominal', 'low'
  confianza_numerica?: number; // 0 - 100%
  brillo_kelvin?: number;
  fuente: 'NASA_FIRMS' | 'SERFOR';
  distrito: string;
}

export interface MetricasFWI {
  temperatura: number;
  humedad_relativa: number;
  velocidad_viento: number;
  direccion_viento: string;
  precipitacion: number;
  ffmc: number; // Fine Fuel Moisture Code
  dmc: number;  // Duff Moisture Code
  dc: number;   // Drought Code
  isi: number;  // Initial Spread Index
  bui: number;  // Build Up Index
  fwi: number;  // Fire Weather Index
  nivel_peligro: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' | 'Extremo';
  recomendacion: string;
  diagnostico?: string;
  probabilidad_ml?: number;
  clase_ml?: string;
  estado_combustible?: string;
}

export interface IncidenteAsignadoResumen {
  id_asignacion: number;
  id_incidente: number;
  codigo: string;
  titulo: string;
  latitud: number;
  longitud: number;
  rol: string;
  estado_asignacion: string;
  asignada_en: string;
}

export interface MiembroBrigadaDetalle {
  id_brigadista?: number;
  id_usuario: number;
  nombre: string;
  username: string;
  funcion: string;
  telefono?: string;
  activo?: boolean;
}

export interface Brigada {
  id: number;
  nombre: string;
  entidad: string;
  entidad_id?: number;
  tipo?: string;
  tipo_display?: string;
  comunidad?: string;
  comunidad_id?: number;
  estado: EstadoBrigada;
  estado_display?: string;
  numero_efectivos: number;
  lider: string;
  telefono: string;
  recursos_asignados: string[];
  latitud?: number;
  longitud?: number;
  incidente_asignado?: IncidenteAsignadoResumen | null;
  integrantes?: MiembroBrigadaDetalle[];
  creada_en?: string;
}

export interface CrearBrigadaPayload {
  nombre: string;
  tipo: 'comunal' | 'bomberos' | 'municipal' | 'forestal' | 'otra';
  comunidad_id?: number | null;
  comunidad_nombre?: string;
  telefono_contacto?: string;
  latitud_base?: number | null;
  longitud_base?: number | null;
  miembros: {
    usuario_id: number;
    funcion: string;
  }[];
}

export interface ViviendaRural {
  id: number;
  codigo: string;
  comunidad: string;
  comunidad_id?: number;
  referencia: string;
  latitud: number;
  longitud: number;
  material: string;
  material_display?: string;
  habitantes: number;
  nombre_responsable?: string;
  telefono_contacto?: string;
  verificada: boolean;
  activa: boolean;
  creado_en?: string;
}

export interface CrearViviendaPayload {
  codigo?: string;
  comunidad_id?: number | null;
  comunidad_nombre?: string;
  referencia: string;
  latitud: number;
  longitud: number;
  material_predominante?: string;
  habitantes?: number;
  nombre_responsable?: string;
  telefono_contacto?: string;
  verificada?: boolean;
}

export interface AlertaComunitaria {
  id: number;
  titulo: string;
  nivel: 'informativa' | 'preventiva' | 'evacuacion' | 'alta' | 'muy_alta';
  comunidad: string;
  fecha: string;
  mensaje: string;
  confirmaciones_lectura: number;
}

export interface HistorialMensualItem {
  mes: string;
  nombre?: string;
  total: number;
  modis: number;
  viirs: number;
  serfor: number;
  frp_promedio: number;
}

export interface HistorialFirmsResponse {
  periodo_meses: number;
  total_detecciones: number;
  historial_mensual: HistorialMensualItem[];
}

// Modelos del Panel Administrativo Integrado
export interface ReporteCiudadano {
  id: number;
  usuario: string;
  comunidad: string;
  tipo_incendio: string;
  estado: string; // 'recibido' | 'en_evaluacion' | 'confirmado' | 'validado' | 'rechazado' | 'observado'
  latitud: number;
  longitud: number;
  descripcion: string;
  fecha: string;
  evidencia_url?: string | null;
}

export interface DonacionItem {
  id: number;
  descripcion: string;
  cantidad: number;
  unidad: string;
  categoria: string;
}

export interface DonacionComunitaria {
  id: number;
  titulo: string;
  donante: string;
  estado: string; // 'pendiente' | 'publicada' | 'rechazada' | 'entregada'
  descripcion: string;
  fecha: string;
  items: DonacionItem[];
}

export interface LoteSatelital {
  id: number;
  fuente: string;
  sensor: string;
  estado: string;
  iniciado_en: string;
  registros_nuevos: number;
  registros_duplicados: number;
}

export interface MetricasKPI {
  incidentes_activos: number;
  incidentes_en_combate: number;
  reportes_pendientes: number;
  brigadas_disponibles: number;
  alertas_activas: number;
  donaciones_pendientes: number;
  detecciones_recientes: number;
  fwi_score?: number | null;
  fwi_nivel: string;
}

export interface RolSistema {
  codigo: string;
  nombre: string;
}

export interface UsuarioSistema {
  id: number;
  uuid: string;
  username: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: 'activo' | 'suspendido' | 'pendiente';
  is_staff: boolean;
  is_superuser: boolean;
  roles: string[];
  roles_codigos: string[];
  rol_principal?: 'administrador' | 'operador_emergencia' | 'movil' | string;
  is_admin?: boolean;
  is_operador?: boolean;
  insignias?: Array<{ codigo: string; nombre: string; icono: string }>;
  creado_en: string;
  ultimo_acceso: string;
}

export type RolCentroMando = 'administrador' | 'operador_emergencia';

export interface UsuarioAuth {
  id: number;
  username: string;
  nombre: string;
  email: string;
  roles: string[];
  rol_principal?: RolCentroMando;
  is_admin?: boolean;
  is_operador?: boolean;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: UsuarioAuth;
  token?: string;
  error?: string;
}

export interface CeldaRiesgoOcurrencia {
  id_celda: number;
  centro: { lat: number; lon: number };
  probabilidad: number;
  probabilidad_pct: number;
  nivel_riesgo: 'bajo' | 'moderado' | 'alto' | 'critico';
  color_hex: string;
  elevacion_m: number;
  pendiente_deg: number;
  comunidad_cercana: string;
  distancia_comunidad_km: number;
  fwi: number;
  temperatura_c: number;
  humedad_pct: number;
  viento_kmh: number;
  fuente: string;
  fecha_actualizacion: string;
}

export interface GrillaRiesgoOcurrenciaData {
  type: 'FeatureCollection';
  metadata: {
    modelo: string;
    algoritmo: string;
    zona: string;
    generado_en: string;
    total_celdas: number;
    condicion_atmosferica: {
      temperatura: number;
      humedad: number;
      viento: number;
      lluvia: number;
      fwi: number;
      inhibicion_lluvia: boolean;
    };
    metricas_modelo?: {
      random_forest_calibrado?: {
        precision: number;
        recall: number;
        f1_score: number;
        roc_auc: number;
        pr_auc: number;
        brier_score: number;
      };
      linea_base_logistic_regression?: {
        precision: number;
        recall: number;
        f1_score: number;
        roc_auc: number;
        pr_auc: number;
        brier_score: number;
      };
    };
  };
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    properties: CeldaRiesgoOcurrencia;
  }>;
}

// Modelos de Gamificación, Logros y Cuadro de Honor Comunal
export interface InsigniaCatalogo {
  id_insignia: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono_url: string;
  criterio: Record<string, any>;
  puntos: number;
  total_poseedores: number;
}

export interface InsigniaUsuarioItem {
  id_insignia: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono_url: string;
  desbloqueada_en: string;
  otorgada_por: string;
}

export interface ColaboradorRanking {
  id_usuario: number;
  posicion: number;
  username: string;
  nombre_completo: string;
  telefono: string;
  roles: string[];
  comunidad: string;
  puntos_totales: number;
  rango_honor: string;
  rango_nivel: number;
  badge_color: string;
  insignias_count: number;
  reportes_validados_count: number;
  actividades_count: number;
  insignias: InsigniaUsuarioItem[];
  ultima_actividad: string;
}

export interface MuroReconocimiento {
  id_logro: number;
  usuario_id: number;
  usuario_nombre: string;
  insignia_codigo: string;
  insignia_nombre: string;
  insignia_icono: string;
  puntos: number;
  desbloqueada_en: string;
  otorgada_por: string;
  motivo?: string;
}

export interface CuadroHonorData {
  estadisticas: {
    total_voluntarios_reconocidos: number;
    total_insignias_otorgadas: number;
    total_actividades_validadas: number;
    comunidad_mas_comprometida: string;
    actualizado_en: string;
  };
  ranking: ColaboradorRanking[];
  catalogo_insignias: InsigniaCatalogo[];
  muro_reciente: MuroReconocimiento[];
}

export interface SimulacionPropagacionItem {
  id_simulacion: number;
  incidente?: number | null;
  modelo_motor?: {
    id_modelo: number;
    nombre: string;
    version: string;
  };
  punto_ignicion: {
    lat: number;
    lon: number;
  };
  horizonte_horas: number;
  estado: 'PENDIENTE' | 'CORRIENDO' | 'COMPLETADO' | 'ERROR';
  parametros_entrada: Record<string, any>;
  requiere_revision_humana: boolean;
  nivel_incertidumbre: string;
  errores?: string | null;
  creada_en: string;
  actualizada_en: string;
  resultados_resumen?: Array<{
    hora_paso: number;
    area_hectareas: number;
  }>;
}

export interface SimulacionGeoJSON {
  type: 'FeatureCollection';
  simulacion_id: number;
  modelo_motor: string;
  estado: string;
  requiere_revision_humana: boolean;
  nivel_incertidumbre: string;
  advertencia: string;
  features: Array<{
    type: 'Feature';
    id: number;
    geometry: any;
    properties: {
      hora_paso: number;
      area_hectareas: number;
      etiqueta: string;
      velocidad_max_m_min?: number;
      celdas_quemadas?: number;
      color: string;
      fillColor: string;
      fillOpacity: number;
      peso_borde: number;
    };
  }>;
}

// Modelos del Portal Público Ciudadano
export interface IncidentePublico {
  id: number;
  codigo: string;
  titulo: string;
  resumen: string;
  tipo_incendio: string;
  tipo_incendio_display: string;
  estado: string;
  estado_display: string;
  prioridad: string;
  prioridad_display: string;
  latitud: number;
  longitud: number;
  distrito_id: number | null;
  distrito_nombre: string;
  comunidad_nombre: string;
  fecha_iso: string;
  fecha_display: string;
  fotografias: string[];
  reportado_por: string;
  identidad_autorizada: boolean;
}

export interface EstadisticasPublicas {
  hoy: {
    fecha: string;
    total: number;
    activos: number;
    controlados: number;
  };
  sistema: {
    total_activos: number;
    total_controlados: number;
    total_cerrados: number;
    total_historico: number;
    distritos_con_focos_activos: number;
  };
  meteorologia: {
    fwi_nivel: string;
    fwi_score: number | null;
    zona: string;
  };
}

export interface DistritoPublico {
  id: number;
  nombre: string;
  provincia: string;
  departamento: string;
  latitud: number | null;
  longitud: number | null;
}

export interface FiltrosPublicos {
  fecha?: string;
  distrito?: string;
  estado?: string;
  q?: string;
}

