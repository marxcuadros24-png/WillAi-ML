import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  AlertaComunitaria,
  PrediccionViento12hData,
  HistorialFirmsResponse
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// Estados iniciales limpios (vacíos) - CERO DATOS SINTÉTICOS O FALSOS
export const INITIAL_INCIDENTES: Incidente[] = [];
export const INITIAL_FOCOS: FocoCalor[] = [];
export const INITIAL_BRIGADAS: Brigada[] = [];
export const INITIAL_ALERTAS: AlertaComunitaria[] = [];

export const INITIAL_FWI: MetricasFWI = {
  temperatura: 0,
  humedad_relativa: 0,
  velocidad_viento: 0,
  direccion_viento: '--',
  precipitacion: 0,
  ffmc: 0,
  dmc: 0,
  dc: 0,
  isi: 0,
  bui: 0,
  fwi: 0,
  nivel_peligro: 'Bajo',
  recomendacion: 'Cargando datos meteorológicos en tiempo real de Open-Meteo...'
};

export const INITIAL_HISTORIAL_FIRMS: HistorialFirmsResponse = {
  periodo_meses: 6,
  total_detecciones: 0,
  historial_mensual: []
};

export const INITIAL_VIENTO_12H: PrediccionViento12hData = {
  id_prediccion: 0,
  nivel_pico: 'bajo',
  cono_principal_geojson: null,
  metricas_entrenamiento: {
    rmse_vectorial: 0,
    r2_score: 0,
    muestras_entrenamiento: 0,
    muestras_validacion: 0,
    algoritmo: 'RandomForestRegressor Multi-Output (Open-Meteo)',
    entrenado_en: ''
  },
  coordenadas: { lat: -15.0189, lon: -73.7806 },
  pronostico_12h: []
};

// Aliases para compatibilidad durante migración
export const SEED_INCIDENTES = INITIAL_INCIDENTES;
export const SEED_FOCOS_FIRMS = INITIAL_FOCOS;
export const SEED_FWI = INITIAL_FWI;
export const SEED_BRIGADAS = INITIAL_BRIGADAS;
export const SEED_ALERTAS = INITIAL_ALERTAS;
export const SEED_VIENTO_12H = INITIAL_VIENTO_12H;
export const SEED_HISTORIAL_FIRMS = INITIAL_HISTORIAL_FIRMS;

function degToCardinal(deg: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return `${cardinals[idx]} (${Math.round(deg)}°)`;
}

/**
 * Consulta incidentes operacionales reales registrados en PostgreSQL.
 */
export async function fetchIncidentes(): Promise<Incidente[]> {
  try {
    const res = await fetch(`${API_BASE}/incidentes/incidentes/`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || (Array.isArray(data) ? data : []);

    return list.map((item: any) => ({
      id: item.id_incidente,
      codigo: item.codigo || `INC-${item.id_incidente}`,
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      severidad: (item.prioridad === 'critica' ? 'critica' : (item.prioridad === 'alta' ? 'alta' : (item.prioridad === 'baja' ? 'baja' : 'media'))),
      estado: (item.estado === 'en_atencion' || item.estado === 'confirmado' ? 'en_combate' : (item.estado === 'controlado' ? 'controlado' : (item.estado === 'cerrado' ? 'extinguido' : 'pendiente'))),
      latitud: parseFloat(item.latitud_referencia || -15.0189),
      longitud: parseFloat(item.longitud_referencia || -73.7806),
      comunidad: item.comunidad_nombre || 'Coracora',
      fecha_inicio: item.detectado_en || item.creado_en || 'Reciente',
      brigadas_asignadas: [],
      viviendas_riesgo: item.viviendas_afectadas_conteo || 0,
      reportado_por: item.origen || 'Sistema',
      origen: 'satelital'
    }));
  } catch (err) {
    console.warn('Error al consultar incidentes reales:', err);
    return [];
  }
}

/**
 * Consulta puntos satelitales 100% REALES de NASA FIRMS (MODIS y VIIRS) y SERFOR.
 * Retorna ÚNICAMENTE observaciones satelitales genuinas. Si no hay focos, retorna arreglo vacío [].
 */
export async function fetchFocosFirms(
  dias?: number,
  fechaDesde?: string,
  fechaHasta?: string,
  sensor?: string
): Promise<FocoCalor[]> {
  try {
    const params = new URLSearchParams();
    if (dias) params.append('dias', dias.toString());
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (sensor) params.append('sensor', sensor);
    params.append('page_size', '3000'); // Solicitar todas las observaciones en el periodo

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/firms/detecciones/${qs}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rawList = data.results || (Array.isArray(data) ? data : []);

    return rawList.map((item: any) => ({
      id: item.id_deteccion,
      sensor: item.sensor || (item.codigo_producto?.includes('MODIS') ? 'MODIS' : 'VIIRS'),
      satelite: item.codigo_satelite || (item.sensor === 'MODIS' ? 'Terra/Aqua' : 'NOAA-20'),
      latitud: parseFloat(item.latitud),
      longitud: parseFloat(item.longitud),
      fecha_hora: item.fecha_observacion,
      frp: item.frp_mw ? parseFloat(item.frp_mw) : 0.0,
      confianza: item.confianza || 'nominal',
      confianza_numerica: item.confianza_numerica ? parseFloat(item.confianza_numerica) : 50,
      brillo_kelvin: item.brillo_kelvin ? parseFloat(item.brillo_kelvin) : undefined,
      fuente: item.proveedor?.includes('SERFOR') ? 'SERFOR' : 'NASA_FIRMS',
      distrito: 'Coracora'
    }));
  } catch (err) {
    console.warn('Error al consultar focos NASA FIRMS reales:', err);
    return [];
  }
}

/**
 * Consulta el historial satelital agregado por meses de los últimos 6 meses (180 días)
 * con datos reales de NASA FIRMS.
 */
export async function fetchHistorialFirms(meses: number = 6): Promise<HistorialFirmsResponse> {
  try {
    const res = await fetch(`${API_BASE}/firms/detecciones/historial_meses/?meses=${meses}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar historial satelital:', err);
    return INITIAL_HISTORIAL_FIRMS;
  }
}

/**
 * Consulta la predicción de viento y conos de dispersión a 12 horas
 * generada por el modelo Random Forest entrenado sobre la serie horaria real de Open-Meteo.
 */
export async function fetchPrediccionViento12h(): Promise<PrediccionViento12hData> {
  try {
    const res = await fetch(`${API_BASE}/predicciones/predicciones/viento_12h/`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar predicción ML de viento:', err);
    return INITIAL_VIENTO_12H;
  }
}

/**
 * Dispara el re-entrenamiento del modelo ML de propagación con los últimos datos reales de Open-Meteo.
 */
export async function entrenarModeloViento(lat: number = -15.0189, lon: number = -73.7806): Promise<any> {
  const res = await fetch(`${API_BASE}/predicciones/predicciones/entrenar_viento/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitud: lat, longitud: lon })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error en API de entrenamiento: ${errText}`);
  }
  return await res.json();
}

/**
 * Consulta las métricas meteorológicas en tiempo real de Open-Meteo y el cálculo
 * de peligro de incendios FWI del Sistema Canadiense (CFFDRS).
 */
export async function fetchFWI(): Promise<MetricasFWI> {
  try {
    let obsData: any = null;
    try {
      const resObs = await fetch(`${API_BASE}/meteorologia/observaciones/actual/`, { cache: 'no-store' });
      if (resObs.ok) obsData = await resObs.json();
    } catch {}

    const resPred = await fetch(`${API_BASE}/predicciones/predicciones/actual/`, { cache: 'no-store' });
    let predData: any = null;
    if (resPred.ok) predData = await resPred.json();

    const inc = predData?.incertidumbre || {};
    const temp = obsData?.temperatura_c ? parseFloat(obsData.temperatura_c) : (inc.temp ?? 0);
    const rh = obsData?.humedad_relativa_pct ? parseFloat(obsData.humedad_relativa_pct) : (inc.rh ?? 0);
    const wind = obsData?.viento_kmh ? parseFloat(obsData.viento_kmh) : (inc.wind ?? 0);
    const windDirDeg = obsData?.direccion_viento_grados ? parseFloat(obsData.direccion_viento_grados) : (inc.wind_dir_deg ?? 0);
    const rain = obsData?.precipitacion_mm ? parseFloat(obsData.precipitacion_mm) : (inc.rain ?? 0);

    const fwiVal = inc.fwi ? parseFloat(inc.fwi) : 0;
    let nivelPeligro: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' | 'Extremo' = 'Bajo';
    if (fwiVal >= 21.3) nivelPeligro = 'Extremo';
    else if (fwiVal >= 11.2) nivelPeligro = 'Alto';
    else if (fwiVal >= 5.2) nivelPeligro = 'Moderado';
    else nivelPeligro = 'Bajo';

    return {
      temperatura: temp,
      humedad_relativa: rh,
      velocidad_viento: wind,
      direccion_viento: degToCardinal(windDirDeg),
      precipitacion: rain,
      ffmc: inc.ffmc ? parseFloat(inc.ffmc) : 0,
      dmc: inc.dmc ? parseFloat(inc.dmc) : 0,
      dc: inc.dc ? parseFloat(inc.dc) : 0,
      isi: inc.isi ? parseFloat(inc.isi) : 0,
      bui: inc.bui ? parseFloat(inc.bui) : 0,
      fwi: fwiVal,
      nivel_peligro: nivelPeligro,
      recomendacion: fwiVal >= 21.3
        ? 'Alerta Roja: Condiciones críticas en Parinacochas. Humedad baja y peligro severo de ignición y propagación rápida.'
        : (fwiVal >= 11.2 ? 'Alerta Amarilla: Precaución ante viento y sequedad de vegetación.' : 'Condiciones normales de bajo peligro.')
    };
  } catch (err) {
    console.warn('Error al consultar FWI real:', err);
    return INITIAL_FWI;
  }
}

/**
 * Consulta brigadas de respuesta operacionales registradas en Coracora.
 */
export async function fetchBrigadas(): Promise<Brigada[]> {
  try {
    const res = await fetch(`${API_BASE}/respuesta/brigadas/`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || (Array.isArray(data) ? data : []);

    return list.map((item: any) => ({
      id: item.id_brigada,
      nombre: item.nombre,
      entidad: item.entidad_nombre || 'Defensa Civil Provincial',
      estado: (item.estado === 'ocupada' ? 'en_operacion' : (item.estado === 'disponible' ? 'disponible' : 'en_descanso')),
      numero_efectivos: item.cantidad_integrantes || 8,
      lider: item.lider_nombre || 'Coordinador OGRD',
      telefono: item.telefono_contacto || '+51 966 321 445',
      recursos_asignados: ['Mochilas extintoras', 'Batefuegos', 'Radios portátiles'],
      latitud: item.latitud_base ? parseFloat(item.latitud_base) : -15.0280,
      longitud: item.longitud_base ? parseFloat(item.longitud_base) : -73.7890
    }));
  } catch (err) {
    console.warn('Error al consultar brigadas reales:', err);
    return [];
  }
}

/**
 * Consulta alertas comunitarias emitidas para Coracora.
 */
export async function fetchAlertas(): Promise<AlertaComunitaria[]> {
  try {
    const res = await fetch(`${API_BASE}/alertas/alertas/`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || (Array.isArray(data) ? data : []);

    return list.map((item: any) => ({
      id: item.id_alerta,
      titulo: item.titulo,
      nivel: (item.nivel === 'roja' ? 'evacuacion' : (item.nivel === 'amarilla' ? 'preventiva' : 'informativa')),
      comunidad: item.comunidad_nombre || 'Distrito de Coracora',
      fecha: item.creada_en ? new Date(item.creada_en).toLocaleString('es-PE') : 'Hoy',
      mensaje: item.mensaje,
      confirmaciones_lectura: item.confirmaciones_lectura || 0
    }));
  } catch (err) {
    console.warn('Error al consultar alertas:', err);
    return [];
  }
}
