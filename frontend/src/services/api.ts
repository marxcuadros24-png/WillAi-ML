import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  AlertaComunitaria,
  PrediccionViento12hData,
  HistorialFirmsResponse,
  UsuarioSistema,
  RolSistema,
  CrearBrigadaPayload,
  ViviendaRural,
  CrearViviendaPayload,
  GrillaRiesgoOcurrenciaData,
  CuadroHonorData,
  SimulacionPropagacionItem,
  SimulacionGeoJSON
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
      estado: (item.estado === 'cerrado' ? 'cerrado' : (item.estado === 'en_atencion' || item.estado === 'confirmado' || item.estado === 'asignado' ? 'en_combate' : (item.estado === 'controlado' || item.estado === 'contenido' ? 'controlado' : (item.estado === 'extinguido' ? 'extinguido' : 'pendiente')))),
      latitud: parseFloat(item.latitud_referencia || -15.0189),
      longitud: parseFloat(item.longitud_referencia || -73.7806),
      comunidad: item.comunidad_nombre || 'Coracora',
      fecha_inicio: item.detectado_en || item.creado_en || 'Reciente',
      brigadas_asignadas: (item.brigadas_asignadas || []).map((b: any) => typeof b === 'string' ? b : b.nombre),
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
 * Consulta la grilla GeoJSON de probabilidad calibrada y nivel de riesgo
 * de ocurrencia estimada por el modelo Machine Learning.
 */
export async function fetchRiesgoOcurrencia(): Promise<GrillaRiesgoOcurrenciaData | null> {
  try {
    const res = await fetch(`${API_BASE}/predicciones/predicciones/riesgo_ocurrencia/`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar grilla ML de riesgo de ocurrencia:', err);
    return null;
  }
}

/**
 * Dispara el re-entrenamiento del modelo de Machine Learning de riesgo de ocurrencia
 * con los datos satelitales NASA FIRMS y meteorología real de Open-Meteo.
 */
export async function entrenarModeloOcurrencia(testRatio: number = 0.30): Promise<any> {
  const res = await fetch(`${API_BASE}/predicciones/predicciones/entrenar_ocurrencia/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_ratio: testRatio })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error en API de entrenamiento de ocurrencia: ${errText}`);
  }
  return await res.json();
}

/**
 * Consulta las métricas meteorológicas en tiempo real de Open-Meteo y el cálculo
 * de peligro de incendios FWI del Sistema Canadiense (CFFDRS).
 */
export async function fetchFWI(forzarRefresco: boolean = false): Promise<MetricasFWI> {
  try {
    let obsData: any = null;
    try {
      const resObs = await fetch(`${API_BASE}/meteorologia/observaciones/actual/`, { cache: 'no-store' });
      if (resObs.ok) obsData = await resObs.json();
    } catch {}

    const resPred = await fetch(`${API_BASE}/predicciones/predicciones/actual/${forzarRefresco ? '?refresco=1' : ''}`, { cache: 'no-store' });
    let predData: any = null;
    if (resPred.ok) predData = await resPred.json();

    const inc = predData?.incertidumbre || {};
    const ml = inc.ml_prediccion || {};
    const temp = inc.temp ?? (obsData?.temperatura_c ? parseFloat(obsData.temperatura_c) : 0);
    const rh = inc.rh ?? (obsData?.humedad_relativa_pct ? parseFloat(obsData.humedad_relativa_pct) : 0);
    const wind = inc.wind ?? (obsData?.viento_kmh ? parseFloat(obsData.viento_kmh) : 0);
    const windDirDeg = inc.wind_dir_deg ?? (obsData?.direccion_viento_grados ? parseFloat(obsData.direccion_viento_grados) : 0);
    const rain = inc.rain ?? (obsData?.precipitacion_mm ? parseFloat(obsData.precipitacion_mm) : 0);

    const fwiVal = inc.fwi ? parseFloat(inc.fwi) : 0;
    const rawNivel = (predData?.nivel || inc.nivel_peligro || 'bajo').toLowerCase();

    let nivelPeligro: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' | 'Extremo' = 'Bajo';
    if (rain > 0.0 || rh >= 75.0) {
      nivelPeligro = 'Bajo';
    } else if (rawNivel === 'critico' || fwiVal >= 21.3) {
      nivelPeligro = 'Extremo';
    } else if (rawNivel === 'alto' || fwiVal >= 11.2) {
      nivelPeligro = 'Alto';
    } else if (rawNivel === 'moderado' || fwiVal >= 5.2) {
      nivelPeligro = 'Moderado';
    } else {
      nivelPeligro = 'Bajo';
    }

    let recomendacion = 'Condiciones normales de bajo peligro.';
    if (rain > 0.0) {
      recomendacion = `🌧️ Lluvia activa en Coracora (${rain} mm). Combustible vegetal saturado; peligro de fuego nulo o mínimo.`;
    } else if (rh >= 75.0) {
      recomendacion = `💧 Alta humedad ambiental (${rh}%). Inhibición natural de focos de ignición.`;
    } else if (nivelPeligro === 'Extremo' || nivelPeligro === 'Alto') {
      recomendacion = '🔥 Alerta Meteorológica: Precaución ante viento y baja humedad en Parinacochas.';
    }

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
      recomendacion,
      diagnostico: inc.diagnostico || ml.diagnostico,
      probabilidad_ml: ml.probabilidad_pct ?? (predData?.probabilidad ? Math.round(predData.probabilidad * 100) : 0),
      clase_ml: ml.clase_ml,
      estado_combustible: ml.estado_combustible
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
    // Primero intentar desde el endpoint del Centro de Mando Táctico que incluye los integrantes
    const resPanel = await fetch('http://127.0.0.1:8000/panel/api/brigadas/', { cache: 'no-store' });
    if (resPanel.ok) {
      const data = await resPanel.json();
      if (data.success && Array.isArray(data.brigadas)) {
        return data.brigadas.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          entidad: item.entidad || 'Defensa Civil Provincial',
          entidad_id: item.entidad_id,
          tipo: item.tipo,
          tipo_display: item.tipo_display,
          comunidad: item.comunidad || 'Coracora',
          comunidad_id: item.comunidad_id,
          estado: item.estado,
          estado_display: item.estado_display,
          numero_efectivos: item.numero_efectivos || (item.integrantes ? item.integrantes.length : 6),
          lider: item.lider || 'Coordinador OGRD',
          telefono: item.telefono || '+51 966 321 445',
          recursos_asignados: item.recursos_asignados || ['Mochilas extintoras', 'Batefuegos', 'Radios portátiles'],
          latitud: item.latitud,
          longitud: item.longitud,
          incidente_asignado: item.incidente_asignado,
          integrantes: item.integrantes || [],
          creada_en: item.creada_en || ''
        }));
      }
    }

    // Fallback a API REST DRF
    const res = await fetch(`${API_BASE}/respuesta/brigadas/`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.results || (Array.isArray(data) ? data : []);

    return list.map((item: any) => {
      const rawEstado = (item.estado || '').toLowerCase();
      const hasIncidente = !!item.incidente_asignado;
      const isDesplegada = rawEstado === 'desplegada' || rawEstado === 'ocupada' || hasIncidente;
      const estado = isDesplegada ? 'desplegada' : (rawEstado === 'disponible' ? 'disponible' : 'en_descanso');

      return {
        id: item.id_brigada,
        nombre: item.nombre,
        entidad: item.entidad_nombre || 'Defensa Civil Provincial',
        entidad_id: item.entidad,
        tipo: item.tipo,
        tipo_display: item.tipo_display,
        comunidad: item.comunidad_nombre || 'Coracora',
        comunidad_id: item.comunidad,
        estado: estado,
        estado_display: item.estado_display,
        numero_efectivos: item.cantidad_integrantes || (item.integrantes ? item.integrantes.length : 6),
        lider: item.lider_nombre || 'Coordinador OGRD',
        telefono: item.telefono_contacto || '+51 966 321 445',
        recursos_asignados: ['Mochilas extintoras', 'Batefuegos', 'Radios portátiles'],
        latitud: item.latitud_base ? parseFloat(item.latitud_base) : -15.0280,
        longitud: item.longitud_base ? parseFloat(item.longitud_base) : -73.7890,
        incidente_asignado: item.incidente_asignado ? {
          id_asignacion: item.incidente_asignado.id_asignacion,
          id_incidente: item.incidente_asignado.id_incidente,
          codigo: item.incidente_asignado.codigo,
          titulo: item.incidente_asignado.titulo,
          latitud: parseFloat(item.incidente_asignado.latitud),
          longitud: parseFloat(item.incidente_asignado.longitud),
          rol: item.incidente_asignado.rol || 'combate_directo',
          estado_asignacion: item.incidente_asignado.estado_asignacion || 'asignada',
          asignada_en: item.incidente_asignado.asignada_en || ''
        } : null,
        integrantes: (item.integrantes || []).map((i: any) => ({
          id_brigadista: i.id,
          id_usuario: i.usuario,
          nombre: i.nombre_completo || i.username,
          username: i.username,
          funcion: i.funcion,
          activo: i.activo
        })),
        creada_en: item.creada_en || ''
      };
    });
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

/**
 * Consulta métricas KPI, reportes ciudadanos, donaciones y lotes satelitales
 * para el Centro de Mando Táctico y Panel Administrativo Unificado.
 */
export async function fetchDashboardCompleto(): Promise<{
  metricas: any;
  reportes: any[];
  donaciones: any[];
  lotes_satelitales: any[];
}> {
  try {
    const res = await fetch('http://127.0.0.1:8000/panel/api/datos/', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar datos completos del panel:', err);
    return {
      metricas: {
        incidentes_activos: 0,
        incidentes_en_combate: 0,
        reportes_pendientes: 0,
        brigadas_disponibles: 0,
        alertas_activas: 0,
        donaciones_pendientes: 0,
        detecciones_recientes: 0,
        fwi_score: null,
        fwi_nivel: 'MODERADO'
      },
      reportes: [],
      donaciones: [],
      lotes_satelitales: []
    };
  }
}

/**
 * Valida un reporte ciudadano (confirmado / rechazado / observado).
 */
export async function validarReporte(idReporte: number, resultado: 'validado' | 'rechazado' | 'observado', comentario: string) {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/reportes/${idReporte}/validar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultado, comentario })
  });
  if (!res.ok) throw new Error('Error al validar reporte');
  return await res.json();
}

/**
 * Elimina físicamente un reporte falso, descartado o duplicado de la base de datos.
 */
export async function eliminarReporte(idReporte: number) {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/reportes/${idReporte}/eliminar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Error al eliminar reporte');
  return await res.json();
}

export interface SectorGeografico {
  id: number;
  nombre: string;
  lat: number;
  lon: number;
  referencia: string;
}

export const SECTORES_CORACORA: SectorGeografico[] = [
  { id: 1, nombre: 'Coracora Centro', lat: -15.0189, lon: -73.7806, referencia: 'Plaza Mayor y casco urbano' },
  { id: 2, nombre: 'Secce', lat: -15.0450, lon: -73.7620, referencia: 'Sector Quebrada y pastizales altos' },
  { id: 3, nombre: 'Huallhua', lat: -15.0800, lon: -73.8100, referencia: 'Cerro Huallhua y corrales' },
  { id: 4, nombre: 'Muchapampa', lat: -15.0250, lon: -73.7400, referencia: 'Camino Vecinal y matorrales' },
  { id: 5, nombre: 'Paucaray', lat: -15.1100, lon: -73.7900, referencia: 'Bosque de Eucaliptos y quebrada' },
  { id: 6, nombre: 'Huaccana', lat: -15.0620, lon: -73.8340, referencia: 'Comunidad Campesina de Huaccana' },
  { id: 7, nombre: 'Baños Termales Pumahuasi', lat: -14.9850, lon: -73.7550, referencia: 'Sector norte / interfaz termal' },
  { id: 8, nombre: 'Cerro Pumahuasi', lat: -14.9620, lon: -73.7420, referencia: 'Cumbre y pajonales rocosos' }
];

/**
 * Crea un incidente táctico directamente desde el Centro de Mando.
 */
export async function crearIncidente(datos: {
  titulo: string;
  tipo_incendio?: string;
  prioridad?: string;
  latitud?: number;
  longitud?: number;
  id_reporte?: number;
  id_comunidad?: number;
  comunidad_nombre?: string;
}) {
  const res = await fetch('http://127.0.0.1:8000/panel/api/incidentes/crear/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error('Error al crear incidente');
  return await res.json();
}

/**
 * Actualiza el estado operativo de un incidente.
 */
export async function cambiarEstadoIncidente(idIncidente: number, estado: string, nota: string) {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/incidentes/${idIncidente}/cambiar-estado/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, nota })
  });
  if (!res.ok) throw new Error('Error al actualizar estado del incidente');
  return await res.json();
}

/**
 * Despacha una brigada al incidente de manera inmediata.
 */
export async function asignarBrigada(idIncidente: number, idBrigada: number, rolOperativo: string = 'combate_directo') {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/incidentes/${idIncidente}/asignar-brigada/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_brigada: idBrigada, rol_operativo: rolOperativo })
  });
  if (!res.ok) throw new Error('Error al asignar brigada');
  return await res.json();
}

/**
 * Cierra formalmente un incidente con acta final y libera brigadas asignadas.
 */
export async function cerrarIncidente(idIncidente: number, motivo: string, evidenciaUri: string = '') {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/incidentes/${idIncidente}/cerrar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo, evidencia_uri: evidenciaUri })
  });
  if (!res.ok) throw new Error('Error al cerrar incidente');
  return await res.json();
}

/**
 * Emite una alerta de emergencia a la población y brigadas.
 */
export async function emitirAlerta(datos: {
  titulo: string;
  mensaje: string;
  instrucciones: string;
  prioridad: string;
  tipo: string;
  id_incidente?: number;
}) {
  const res = await fetch('http://127.0.0.1:8000/panel/api/alertas/emitir/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error('Error al emitir alerta');
  return await res.json();
}

/**
 * Modera una donación solidaria comunitaria (aprobar / rechazar).
 */
export async function moderarDonacion(idOferta: number, accion: 'aprobar' | 'rechazar', comentario: string = '') {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/donaciones/${idOferta}/moderar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accion, comentario })
  });
  if (!res.ok) throw new Error('Error al moderar donación');
  return await res.json();
}

/**
 * Dispara una sincronización manual en vivo de FIRMS, Open-Meteo o cálculo FWI.
 */
export async function dispararSincronizacion(tipo: 'firms' | 'meteo' | 'fwi') {
  const res = await fetch('http://127.0.0.1:8000/panel/api/sincronizar/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo })
  });
  if (!res.ok) throw new Error('Error al disparar sincronización');
  return await res.json();
}

/**
 * Consulta la lista de usuarios y roles del sistema desde el panel.
 */
export async function fetchUsuarios(): Promise<{ usuarios: UsuarioSistema[]; roles: RolSistema[] }> {
  try {
    const res = await fetch('http://127.0.0.1:8000/panel/api/usuarios/', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar usuarios:', err);
    return { usuarios: [], roles: [] };
  }
}

export async function cambiarEstadoUsuario(idUsuario: number, estado: string): Promise<any> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/usuarios/${idUsuario}/cambiar-estado/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function asignarRolUsuario(idUsuario: number, codigoRol: string, accion: 'asignar' | 'remover'): Promise<any> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/usuarios/${idUsuario}/asignar-rol/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo_rol: codigoRol, accion })
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function crearUsuarioOperativo(payload: {
  username: string;
  email?: string;
  password?: string;
  nombre?: string;
  telefono?: string;
  codigo_rol?: string;
}): Promise<any> {
  const res = await fetch('http://127.0.0.1:8000/panel/api/usuarios/crear/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/**
 * Autenticación de Operadores y Administradores en el Centro de Mando Táctico.
 */
export async function loginApi(username: string, password: string): Promise<any> {
  const res = await fetch('http://127.0.0.1:8000/panel/api/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Credenciales incorrectas');
  }
  return data;
}

export async function logoutApi(): Promise<any> {
  try {
    const res = await fetch('http://127.0.0.1:8000/panel/api/logout/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch {
    return { success: true };
  }
}

/**
 * Crea una nueva brigada de respuesta y asigna los usuarios existentes como dotación.
 */
export async function crearBrigada(payload: CrearBrigadaPayload): Promise<{ success: boolean; id_brigada?: number; error?: string; mensaje?: string }> {
  const res = await fetch('http://127.0.0.1:8000/panel/api/brigadas/crear/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo crear la brigada');
  }
  return data;
}

/**
 * Cambia el estado operacional de una brigada (disponible, ocupada, inactiva).
 */
export async function cambiarEstadoBrigada(idBrigada: number, nuevoEstado: string): Promise<{ success: boolean; nuevo_estado?: string }> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/brigadas/${idBrigada}/cambiar-estado/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo actualizar el estado de la brigada');
  }
  return data;
}

/**
 * Actualiza la dotación de miembros de una brigada existente con usuarios del sistema.
 */
export async function asignarMiembrosBrigada(idBrigada: number, miembros: { usuario_id: number; funcion: string }[]): Promise<{ success: boolean; mensaje?: string }> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/brigadas/${idBrigada}/asignar-miembros/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ miembros })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo actualizar la dotación de la brigada');
  }
  return data;
}

/**
 * Elimina una brigada del sistema.
 */
export async function eliminarBrigada(idBrigada: number): Promise<{ success: boolean; mensaje?: string }> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/brigadas/${idBrigada}/eliminar/`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo eliminar la brigada');
  }
  return data;
}

/**
 * Consulta el padrón de viviendas rurales registradas en Coracora.
 */
export async function fetchViviendas(): Promise<ViviendaRural[]> {
  try {
    const res = await fetch('http://127.0.0.1:8000/panel/api/viviendas/', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.viviendas || [];
  } catch (err) {
    console.warn('Error al consultar viviendas rurales:', err);
    return [];
  }
}

/**
 * Registra una nueva vivienda rural manualmente desde el Centro de Mando o Mapa Táctico.
 */
export async function crearVivienda(payload: CrearViviendaPayload): Promise<{ success: boolean; id_vivienda?: number; codigo?: string; error?: string; mensaje?: string }> {
  const res = await fetch('http://127.0.0.1:8000/panel/api/viviendas/crear/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo registrar la vivienda');
  }
  return data;
}

/**
 * Edita los datos de una vivienda rural registrada.
 */
export async function editarVivienda(idVivienda: number, payload: Partial<CrearViviendaPayload>): Promise<{ success: boolean; mensaje?: string }> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/viviendas/${idVivienda}/editar/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo actualizar la vivienda');
  }
  return data;
}

/**
 * Elimina una vivienda rural del padrón.
 */
export async function eliminarVivienda(idVivienda: number): Promise<{ success: boolean; mensaje?: string }> {
  const res = await fetch(`http://127.0.0.1:8000/panel/api/viviendas/${idVivienda}/eliminar/`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'No se pudo eliminar la vivienda');
  }
  return data;
}

/**
 * Consulta el Cuadro de Honor, Ranking de colaboradores y Catálogo de insignias
 * del Sistema de Alerta Temprana WillAI Parinacochas.
 */
export async function fetchCuadroHonor(): Promise<CuadroHonorData> {
  try {
    const res = await fetch(`${API_BASE}/gamificacion/insignias/cuadro-honor/?_t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Error al consultar cuadro de honor de WillAI:', err);
    return {
      estadisticas: {
        total_voluntarios_reconocidos: 0,
        total_insignias_otorgadas: 0,
        total_actividades_validadas: 0,
        comunidad_mas_comprometida: 'Coracora',
        actualizado_en: ''
      },
      ranking: [],
      catalogo_insignias: [],
      muro_reciente: []
    };
  }
}

/**
 * Otorga manualmente una insignia honorífica a un colaborador o brigadista
 * desde el Centro de Mando Táctico.
 */
export async function otorgarInsigniaManual(payload: {
  id_usuario: number;
  codigo_insignia: string;
  motivo?: string;
}): Promise<{ status: string; mensaje: string; usuario?: string; insignia?: string; puntos_sumados?: number }> {
  const res = await fetch(`${API_BASE}/gamificacion/insignias/otorgar-insignia/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'ok') {
    throw new Error(data.error || 'No se pudo otorgar la insignia');
  }
  return data;
}

/**
 * Consulta el listado histórico de simulaciones de propagación de fuego.
 */
export async function fetchSimulaciones(): Promise<SimulacionPropagacionItem[]> {
  try {
    const res = await fetch(`${API_BASE}/predicciones/simulaciones/?_t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (err) {
    console.warn('Error al listar simulaciones de propagación:', err);
    return [];
  }
}

/**
 * Consulta las isócronas vectoriales de propagación (1h, 3h, 6h) en formato GeoJSON FeatureCollection
 * para renderizado directo en Leaflet.
 */
export async function fetchSimulacionGeoJSON(simulacionId: number): Promise<SimulacionGeoJSON | null> {
  try {
    const res = await fetch(`${API_BASE}/predicciones/simulaciones/${simulacionId}/geojson/?_t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Error al consultar GeoJSON de simulación #${simulacionId}:`, err);
    return null;
  }
}

/**
 * Dispara una nueva simulación de propagación celular elíptica andina estilo Cell2Fire
 * con aceleración por pendiente DEM (Copernicus GLO-30) y vector de viento.
 */
export async function crearSimulacionPropagacion(payload: {
  lat: number;
  lon: number;
  latitud?: number;
  longitud?: number;
  horizonte_horas?: number;
  incidente?: number;
  viento_kmh?: number;
  dir_viento_grados?: number;
  ffmc?: number;
  ruta_dem?: string;
  ruta_combustible?: string;
  grid_size?: number;
  alfa_r0?: number;
  alfa_viento?: number;
  alfa_pendiente?: number;
  ensamble_viento?: boolean;
}): Promise<SimulacionPropagacionItem> {
  const fullPayload = {
    ...payload,
    latitud: payload.lat,
    longitud: payload.lon
  };
  const res = await fetch(`${API_BASE}/predicciones/simulaciones/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || `Error al crear simulación (${res.status})`);
  }
  return await res.json();
}

/**
 * Evalúa las viviendas expuestas a menos de 5 km del perímetro de 6h de la simulación
 * y genera una alerta en estado PENDIENTE_APROBACION para validación de operadores COEP/COEL.
 */
export async function evaluarViviendasSimulacion(
  simulacionId: number,
  distanciaKm: number = 5.0
): Promise<{
  status: string;
  simulacion_id: number;
  viviendas_en_riesgo_count: number;
  viviendas: Array<{ id_vivienda: number; latitud: number; longitud: number; distancia_metros?: number }>;
  alerta_id?: number;
  estado_alerta?: string;
  requiere_confirmacion_humana: boolean;
}> {
  const res = await fetch(`${API_BASE}/alertas/alertas/evaluar_simulacion/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulacion_id: simulacionId, distancia_km: distanciaKm })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Error al evaluar viviendas (${res.status})`);
  }
  return await res.json();
}




