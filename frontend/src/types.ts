export type SeveridadType = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoIncidente = 'pendiente' | 'en_combate' | 'controlado' | 'extinguido';
export type EstadoBrigada = 'disponible' | 'en_operacion' | 'en_descanso' | 'inactiva';

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
}

export interface Brigada {
  id: number;
  nombre: string;
  entidad: string;
  estado: EstadoBrigada;
  numero_efectivos: number;
  lider: string;
  telefono: string;
  recursos_asignados: string[];
  latitud?: number;
  longitud?: number;
}

export interface AlertaComunitaria {
  id: number;
  titulo: string;
  nivel: 'informativa' | 'preventiva' | 'evacuacion';
  comunidad: string;
  fecha: string;
  mensaje: string;
  confirmaciones_lectura: number;
}

export interface PrediccionVientoPaso {
  paso_hora: number;
  hora_iso: string;
  hora_label: string;
  velocidad_kmh: number;
  rafagas_kmh: number;
  direccion_viento_grados: number;
  direccion_viento_cardinal: string;
  rumbo_propagacion_grados: number;
  hacia_cardinal: string;
  riesgo_propagacion: 'bajo' | 'moderado' | 'alto' | 'critico';
  cono_dispersion: any;
}

export interface PrediccionViento12hData {
  id_prediccion: number;
  horizonte_desde?: string;
  horizonte_hasta?: string;
  nivel_pico: string;
  cono_principal_geojson: any;
  metricas_entrenamiento: {
    rmse_vectorial: number;
    r2_score: number;
    muestras_entrenamiento: number;
    muestras_validacion: number;
    algoritmo: string;
    entrenado_en: string;
  };
  pronostico_12h: PrediccionVientoPaso[];
  coordenadas: { lat: number; lon: number };
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
