import { API_BASE } from '../constants/config';

export interface UsuarioDto {
  id_usuario: number;
  uuid: string;
  username: string;
  first_name?: string;
  last_name?: string;
  nombre_visible?: string;
  email?: string;
  telefono?: string;
  idioma_preferido?: 'es' | 'qu';
  estado?: string;
  roles?: Array<{ id_rol: number; codigo: string; nombre: string }>;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioDto;
  mensaje?: string;
}

export interface RegistroPayload {
  username: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  nombre_visible?: string;
  email?: string;
  telefono?: string;
  idioma_preferido?: 'es' | 'qu';
}

export interface ActualizarPerfilPayload {
  first_name?: string;
  last_name?: string;
  nombre_visible?: string;
  email?: string;
  telefono?: string;
  idioma_preferido?: 'es' | 'qu';
}

export interface InsigniaItem {
  id_insignia: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono_url?: string;
  criterio?: {
    puntos?: number;
    cantidad?: number;
    tipo_actividad?: string;
  };
  activa: boolean;
  total_poseedores?: number;
}

export interface DeteccionFirmsItem {
  id_deteccion: number;
  proveedor: string;
  sensor: string;
  codigo_producto: string;
  fecha_observacion: string;
  latitud: number | string;
  longitud: number | string;
  frp_mw: number | string;
  confianza: string;
  brillo_kelvin?: string;
}

export interface FwiActualResponse {
  fecha: string;
  hora: string;
  fwi: number;
  nivel_peligro: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRITICO';
  temperatura: number;
  humedad_relativa: number;
  velocidad_viento: number;
  direccion_viento: string;
}

export interface AlertaItem {
  id_destinatario?: number;
  alerta: {
    id_alerta: number;
    uuid: string;
    tipo: string;
    prioridad: string;
    titulo: string;
    mensaje: string;
    instrucciones?: string;
    estado: string;
    emitida_en: string;
    incidente_codigo?: string;
  };
  estado_entrega: string;
  leido_en?: string;
  certeza_operador?: 'confirmado_operador' | 'satelital_automatica' | 'por_verificar';
}

/**
 * Registro de nuevo poblador o brigadista en Django.
 */
export async function registroCiudadanoApi(payload: RegistroPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/usuarios/registro/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = 'Error al registrar usuario.';
    if (typeof errorData === 'object') {
      const firstKey = Object.keys(errorData)[0];
      if (firstKey) {
        const val = errorData[firstKey];
        msg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
      }
    }
    throw new Error(msg);
  }

  return await res.json();
}

/**
 * Iniciar sesión con Token DRF.
 */
export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/usuarios/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Error al iniciar sesión (${res.status})`);
  }

  return await res.json();
}

/**
 * Consulta el perfil del usuario autenticado.
 */
export async function fetchPerfilUsuarioApi(token: string): Promise<UsuarioDto> {
  const res = await fetch(`${API_BASE}/usuarios/usuarios/me/`, {
    headers: {
      Authorization: `Token ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Error al obtener perfil (HTTP ${res.status})`);
  }

  return await res.json();
}

/**
 * Actualiza los datos de perfil del usuario en Django.
 */
export async function actualizarPerfilUsuarioApi(
  token: string,
  payload: ActualizarPerfilPayload
): Promise<UsuarioDto> {
  const res = await fetch(`${API_BASE}/usuarios/usuarios/me/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = 'Error al actualizar perfil.';
    if (typeof errorData === 'object') {
      const firstKey = Object.keys(errorData)[0];
      if (firstKey) {
        const val = errorData[firstKey];
        msg = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
      }
    }
    throw new Error(msg);
  }

  return await res.json();
}

/**
 * Consulta el catálogo de insignias cívicas de mérito desde Django.
 */
export async function fetchInsigniasCatalogoApi(): Promise<InsigniaItem[]> {
  try {
    const res = await fetch(`${API_BASE}/gamificacion/insignias/`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || data || [];
  } catch {
    return [];
  }
}

/**
 * Consulta el cuadro de honor y ranking comunitario.
 */
export async function fetchCuadroHonorApi(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/gamificacion/insignias/cuadro-honor/`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Consulta los focos satelitales NASA FIRMS reales en Parinacochas.
 */
export async function fetchFocosFirmsApi(pageSize = 25): Promise<DeteccionFirmsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/firms/detecciones/?page_size=${pageSize}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || data || [];
  } catch {
    return [];
  }
}

/**
 * Consulta el nivel de peligro FWI actual calculado con meteorología real.
 */
export async function fetchFwiActual(): Promise<FwiActualResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/predicciones/predicciones/actual/`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Consulta el buzón de alertas del usuario.
 */
export async function fetchAlertasUsuario(token?: string | null): Promise<AlertaItem[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Token ${token}`;

    const res = await fetch(`${API_BASE}/alertas/alertas/mis_alertas/`, { headers });
    if (!res.ok) {
      // Fallback a alertas públicas del portal si no hay auth
      const publicRes = await fetch(`${API_BASE}/alertas/alertas/`);
      if (!publicRes.ok) return [];
      const list = await publicRes.json();
      return (list.results || list || []).map((a: any) => ({
        alerta: a,
        estado_entrega: 'entregado',
        certeza_operador: a.aprobada_por ? 'confirmado_operador' : 'satelital_automatica'
      }));
    }

    const data = await res.json();
    return (data || []).map((d: any) => ({
      ...d,
      certeza_operador: d.alerta?.aprobada_en ? 'confirmado_operador' : 'satelital_automatica'
    }));
  } catch {
    return [];
  }
}

/**
 * Confirma la lectura de una alerta desde el móvil.
 */
export async function confirmarAlertaApi(alertaId: number, token?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/alertas/alertas/${alertaId}/confirmar/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      }
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envía un reporte directo a la API de Django.
 */
export async function enviarReporteApi(
  payload: {
    client_uuid: string;
    latitud: number;
    longitud: number;
    precision_m?: number;
    azimut?: number;
    tipo_fuego: string;
    combustible: string;
    foto_uri?: string | null;
    fecha_captura: string;
  },
  token?: string | null
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Token ${token}`;

  // Mapeo al modelo Reporte de Django
  const tipoIncendioDjango =
    payload.tipo_fuego === 'quema_agricola_controlada'
      ? 'agricola'
      : payload.combustible === 'ichu_pajonal'
      ? 'pastizal'
      : 'forestal';

  const body = {
    tipo_incendio: tipoIncendioDjango,
    fecha_evento: payload.fecha_captura,
    latitud: payload.latitud,
    longitud: payload.longitud,
    precision_metros: payload.precision_m || 10.0,
    origen: 'movil',
    descripcion: `[WillAI Móvil] Tipo: ${payload.tipo_fuego} | Combustible: ${payload.combustible} | Azimut: ${payload.azimut ?? 'N/A'}° | UUID: ${payload.client_uuid}`,
    autoriza_publicacion: false
  };

  const res = await fetch(`${API_BASE}/reportes/reportes/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Registra el token de Expo Push en PreferenciaNotificacion de Django.
 */
export async function registrarTokenPushApi(expoPushToken: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/alertas/preferencias/registrar-token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({ token: expoPushToken })
    });
    return res.ok;
  } catch {
    return false;
  }
}

