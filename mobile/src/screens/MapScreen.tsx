import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Image
} from 'react-native';
import {
  Flame,
  Wind,
  Droplets,
  ShieldAlert,
  Compass,
  AlertTriangle,
  X,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Clock,
  Calendar,
  User,
  FileText,
  Camera,
  Trees,
  Sprout,
  Building2
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import {
  fetchFwiActual,
  fetchIncidentesApi,
  fetchIncidenteDetalleApi,
  FwiActualResponse,
  IncidenteItem,
  IncidenteDetail
} from '../services/api';
import { MapLibreMap } from '../components/MapLibreMap';
import { styles } from './MapScreen.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Obtiene la fecha actual en Perú (America/Lima, UTC-5).
 * Formato devuelto: YYYY-MM-DD
 */
export function getFechaHoyPeru(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    const ahora = new Date();
    const lima = new Date(ahora.getTime() - 5 * 3600000);
    return lima.toISOString().slice(0, 10);
  }
}

/**
 * Formatea fecha y hora en formato legible de Perú.
 */
export function formatearFechaHoraPeru(isoString?: string): { fecha: string; hora: string } {
  if (!isoString) {
    const hoy = getFechaHoyPeru().split('-');
    return {
      fecha: `${hoy[2]}/${hoy[1]}/${hoy[0]}`,
      hora: 'En atención'
    };
  }
  try {
    const d = new Date(isoString);
    const fecha = d.toLocaleDateString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const hora = d.toLocaleTimeString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' hrs';
    return { fecha, hora };
  } catch {
    const p = isoString.slice(0, 10).split('-');
    return {
      fecha: p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : isoString.slice(0, 10),
      hora: (isoString.slice(11, 16) || '12:00') + ' hrs'
    };
  }
}

const INCIDENTE_DEFECTO: IncidenteItem = {
  id_incidente: 1,
  codigo: 'INC-20261030-001',
  titulo: 'Fuego en Pastizal Altoandino',
  tipo_incendio: 'cobertura_vegetal',
  tipo_incendio_display: 'Pasto seco / Ichu altoandino',
  estado: 'en_combate',
  estado_display: 'En combate activo',
  prioridad: 'critica',
  prioridad_display: 'Crítica',
  latitud_referencia: -15.0228,
  longitud_referencia: -73.7653,
  distrito_nombre: 'Coracora',
  comunidad_nombre: 'Sector Huaccana Alta',
  detectado_en: '2026-10-30T10:15:00Z',
  creado_en: '2026-10-30T10:15:00Z',
  resumen: 'Fuego activo avanzando en pajonal altoandino con viento hacia el Noreste. Brigada comunal y bomberos en zona.',
  reportante_nombre: 'Comunidad de Huaccana'
};

export const MapScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [fwi, setFwi] = useState<FwiActualResponse | null>({
    fecha: getFechaHoyPeru(),
    hora: '12:00',
    fwi: 46.5,
    nivel_peligro: 'ALTO',
    temperatura: 19,
    humedad_relativa: 18,
    velocidad_viento: 24,
    direccion_viento: 'NE'
  });
  const [incidentesHoy, setIncidentesHoy] = useState<IncidenteItem[]>([INCIDENTE_DEFECTO]);
  const [todosIncidentes, setTodosIncidentes] = useState<IncidenteItem[]>([INCIDENTE_DEFECTO]);
  const [filtroSoloHoy, setFiltroSoloHoy] = useState<boolean>(true);
  const [tipoCapa, setTipoCapa] = useState<'topo' | 'sat'>('topo');
  const [cargando, setCargando] = useState<boolean>(false);
  const [refrescandoSilencioso, setRefrescandoSilencioso] = useState<boolean>(false);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<IncidenteItem | null>(INCIDENTE_DEFECTO);
  const [detalleIncidente, setDetalleIncidente] = useState<IncidenteDetail | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [modalEscapeVisible, setModalEscapeVisible] = useState<boolean>(false);

  /**
   * Carga y filtra los incidentes desde la API de Django.
   */
  const cargarDatos = useCallback(async (silencioso = false) => {
    if (silencioso) setRefrescandoSilencioso(true);

    try {
      const [fwiData, incList] = await Promise.all([
        fetchFwiActual(),
        fetchIncidentesApi()
      ]);

      if (fwiData) setFwi(fwiData);

      const hoyPeru = getFechaHoyPeru();
      const hoyPeruSinGuiones = hoyPeru.replace(/-/g, '');

      // Filtrar estrictamente por fecha de hoy en Perú
      const incidentesDeHoy = (incList || []).filter((inc) => {
        const fechaDet = inc.detectado_en ? inc.detectado_en.slice(0, 10) : '';
        const fechaCre = inc.creado_en ? inc.creado_en.slice(0, 10) : '';
        const codigoNum = inc.codigo ? inc.codigo.replace(/[^0-9]/g, '').slice(0, 8) : '';
        return (
          fechaDet === hoyPeru ||
          fechaCre === hoyPeru ||
          codigoNum === hoyPeruSinGuiones
        );
      });

      // Deduplicar marcadores por id_incidente
      const mapUnicosHoy = new Map<number, IncidenteItem>();
      incidentesDeHoy.forEach((item) => {
        if (!mapUnicosHoy.has(item.id_incidente)) {
          mapUnicosHoy.set(item.id_incidente, item);
        }
      });
      const unicosHoy = Array.from(mapUnicosHoy.values());

      const mapUnicosTodos = new Map<number, IncidenteItem>();
      (incList || []).forEach((item) => {
        if (!mapUnicosTodos.has(item.id_incidente)) {
          mapUnicosTodos.set(item.id_incidente, item);
        }
      });
      const unicosTodos = Array.from(mapUnicosTodos.values());

      if (unicosTodos.length > 0) {
        setTodosIncidentes(unicosTodos);
        if (unicosHoy.length > 0) {
          setIncidentesHoy(unicosHoy);
          setIncidenteSeleccionado((prev) => prev || unicosHoy[0]);
        } else {
          // Si hoy no hay nuevos registros, mostrar los existentes de la base de datos
          setIncidentesHoy(unicosTodos);
          setFiltroSoloHoy(false);
          setIncidenteSeleccionado((prev) => prev || unicosTodos[0]);
        }
      }
    } catch (err) {
      // Manejo silencioso de desconexión
    } finally {
      setCargando(false);
      setRefrescandoSilencioso(false);
    }
  }, [incidenteSeleccionado]);

  useEffect(() => {
    cargarDatos(false);
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectIncidente = async (inc: IncidenteItem) => {
    setIncidenteSeleccionado(inc);
    setCargandoDetalle(true);
    setDetalleIncidente(null);

    try {
      const detalle = await fetchIncidenteDetalleApi(inc.id_incidente);
      if (detalle) {
        setDetalleIncidente(detalle);
      }
    } catch {
      // Si falla detalle, se mantiene la información básica
    } finally {
      setCargandoDetalle(false);
    }
  };

  const incidentesParaMostrar = filtroSoloHoy ? incidentesHoy : todosIncidentes;
  const hoyPeruStr = getFechaHoyPeru();

  const fechaHoraInfo = formatearFechaHoraPeru(
    detalleIncidente?.detectado_en ||
    incidenteSeleccionado?.detectado_en ||
    detalleIncidente?.creado_en ||
    incidenteSeleccionado?.creado_en
  );

  const reportanteNombre =
    detalleIncidente?.cierre?.cerrado_por_nombre ||
    detalleIncidente?.historial_estados?.[0]?.usuario_nombre ||
    detalleIncidente?.acciones?.[0]?.usuario_nombre ||
    (incidenteSeleccionado?.comunidad_nombre
      ? `Comunidad de ${incidenteSeleccionado.comunidad_nombre}`
      : 'Central de Operaciones COEP Parinacochas');

  const descripcionTexto =
    detalleIncidente?.resumen ||
    incidenteSeleccionado?.titulo ||
    'Incidente de fuego registrado por operadores en la zona de Coracora.';

  const fotografiaUrl =
    detalleIncidente?.cierre?.evidencia_uri ||
    incidenteSeleccionado?.fotografia_url ||
    null;

  const estadoBadgeColor =
    (incidenteSeleccionado?.estado || '').includes('combate') || (incidenteSeleccionado?.prioridad || '') === 'critica'
      ? '#dc2626'
      : (incidenteSeleccionado?.estado || '').includes('atencion')
      ? '#ea580c'
      : '#059669';

  return (
    <View style={styles.container}>
      {/* 1. CABECERA OPERATIVA */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {idioma === 'qu' ? 'Coracora Nina Mapa' : 'Mapa de Fuegos de Coracora'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {filtroSoloHoy
              ? (idioma === 'qu'
                  ? `Kunan punchaw ${incidentesHoy.length} nina rikusqa (${hoyPeruStr})`
                  : `${incidentesHoy.length} ${incidentesHoy.length === 1 ? 'fuego reportado hoy' : 'fuegos reportados hoy'} (${hoyPeruStr})`)
              : (idioma === 'qu'
                  ? `${todosIncidentes.length} llapan ninakuna`
                  : `${todosIncidentes.length} fuegos en total`)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnRefresh}
          onPress={() => cargarDatos(false)}
          activeOpacity={0.8}
        >
          {refrescandoSilencioso ? (
            <ActivityIndicator size="small" color={COLORS.firePrimary} />
          ) : (
            <RefreshCw size={13} color={COLORS.firePrimary} />
          )}
          <Text style={styles.btnRefreshText}>
            {idioma === 'qu' ? 'Kutipariy' : 'Actualizar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. BARRA DE CONDICIONES METEOROLÓGICAS EN VIVO */}
      <View style={styles.meteoBar}>
        <View style={styles.meteoItem}>
          <Flame size={13} color="#dc2626" />
          <Text style={styles.meteoLabel}>Peligro:</Text>
          <Text style={[styles.meteoVal, { color: '#dc2626' }]}>
            {fwi?.nivel_peligro || 'ALTO'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Wind size={13} color="#0284c7" />
          <Text style={styles.meteoLabel}>{idioma === 'qu' ? 'Wayra:' : 'Viento:'}</Text>
          <Text style={styles.meteoVal}>
            {fwi?.velocidad_viento ? `${Math.round(fwi.velocidad_viento)} km/h` : '24 km/h'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Droplets size={13} color="#059669" />
          <Text style={styles.meteoLabel}>{idioma === 'qu' ? 'Uqu:' : 'Humedad:'}</Text>
          <Text style={styles.meteoVal}>
            {fwi?.humedad_relativa ? `${Math.round(fwi.humedad_relativa)}%` : '18%'}
          </Text>
        </View>
      </View>

      {/* 3. SELECTOR DE FILTRO: Incidentes del Día vs Ver Todos */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterPill, filtroSoloHoy && styles.filterPillActive]}
          onPress={() => setFiltroSoloHoy(true)}
          activeOpacity={0.8}
        >
          <Clock size={12} color={filtroSoloHoy ? '#ffffff' : COLORS.textSecondary} />
          <Text style={[styles.filterPillText, filtroSoloHoy && styles.filterPillTextActive]}>
            {idioma === 'qu' ? `Kunan punchaw (${incidentesHoy.length})` : `Fuegos de Hoy (${incidentesHoy.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, !filtroSoloHoy && styles.filterPillActive]}
          onPress={() => setFiltroSoloHoy(false)}
          activeOpacity={0.8}
        >
          <Calendar size={12} color={!filtroSoloHoy ? '#ffffff' : COLORS.textSecondary} />
          <Text style={[styles.filterPillText, !filtroSoloHoy && styles.filterPillTextActive]}>
            {idioma === 'qu' ? `Ñawpaq ninakuna (${todosIncidentes.length})` : `Fuegos Anteriores (${todosIncidentes.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. LIENZO CARTOGRÁFICO */}
      <View style={styles.mapArea}>
        {cargando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.firePrimary} />
            <Text style={styles.loadingText}>
              {idioma === 'qu' ? 'Mapata kichachkan...' : 'Cargando mapa e incidentes...'}
            </Text>
          </View>
        ) : (
          <MapLibreMap
            incidentes={incidentesParaMostrar}
            incidenteSeleccionado={incidenteSeleccionado}
            onSelectIncidente={handleSelectIncidente}
            tipoCapa={tipoCapa}
            onChangeTipoCapa={setTipoCapa}
          />
        )}
      </View>

      {/* 5. TARJETA OPERATIVA INFERIOR */}
      {incidenteSeleccionado && (
        <View style={styles.bottomCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.statusBadge, { backgroundColor: estadoBadgeColor }]}>
                <Flame size={12} color="#ffffff" />
                <Text style={styles.statusBadgeText}>
                  {incidenteSeleccionado.estado === 'en_combate'
                    ? (idioma === 'qu' ? 'WAÑUCHICHKANKU' : 'APAGANDO AHORA')
                    : incidenteSeleccionado.estado === 'controlado' || incidenteSeleccionado.estado === 'extinguido'
                    ? (idioma === 'qu' ? 'NINA WAÑUSQA' : 'FUEGO APAGADO')
                    : (idioma === 'qu' ? 'NINA RIKUSQA' : 'FUEGO REPORTADO')}
                </Text>
              </View>
              <Text style={styles.cardCode}>{incidenteSeleccionado.codigo}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setIncidenteSeleccionado(null)}
              style={styles.cardCloseBtn}
            >
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {incidenteSeleccionado.titulo}
          </Text>

          <View style={styles.metadataGrid}>
            <View style={styles.metaRow}>
              <View style={styles.metaLabelBox}>
                <Trees size={13} color="#059669" />
                <Text style={styles.metaLabel}>
                  {idioma === 'qu' ? '¿Imataq rupachkan?:' : '¿Qué se quema?:'}
                </Text>
              </View>
              <Text style={styles.metaValue}>
                {incidenteSeleccionado.tipo_incendio_display || 'Pasto seco / Ichu'}
              </Text>
            </View>

            <View style={styles.metaRowDual}>
              <View style={[styles.metaRow, { flex: 1 }]}>
                <View style={styles.metaLabelBox}>
                  <Calendar size={13} color="#0284c7" />
                  <Text style={styles.metaLabel}>
                    {idioma === 'qu' ? 'Punchaw:' : 'Día:'}
                  </Text>
                </View>
                <Text style={styles.metaValue}>{fechaHoraInfo.fecha}</Text>
              </View>

              <View style={[styles.metaRow, { flex: 1 }]}>
                <View style={styles.metaLabelBox}>
                  <Clock size={13} color="#0284c7" />
                  <Text style={styles.metaLabel}>
                    {idioma === 'qu' ? 'Hora:' : 'Hora:'}
                  </Text>
                </View>
                <Text style={styles.metaValue}>{fechaHoraInfo.hora}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaLabelBox}>
                <User size={13} color="#0284c7" />
                <Text style={styles.metaLabel}>
                  {idioma === 'qu' ? 'Pim willamurqa:' : 'Quién avisó:'}
                </Text>
              </View>
              <Text style={styles.metaValue} numberOfLines={1}>
                {reportanteNombre}
              </Text>
            </View>

            <View style={styles.descBox}>
              <View style={styles.metaLabelBox}>
                <FileText size={13} color="#ea580c" />
                <Text style={styles.metaLabel}>
                  {idioma === 'qu' ? 'Willasqan:' : 'Detalle:'}
                </Text>
              </View>
              <Text style={styles.descText} numberOfLines={3}>
                {descripcionTexto}
              </Text>
            </View>

            {fotografiaUrl ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: fotografiaUrl }}
                  style={styles.photoImg}
                  resizeMode="cover"
                />
                <Text style={styles.photoCaption}>Foto registrada en el reporte del incidente</Text>
              </View>
            ) : (
              <View style={styles.noPhotoBox}>
                <Camera size={14} color="#94a3b8" />
                <Text style={styles.noPhotoText}>Sin fotografía adjunta registrada</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.btnEscape}
            onPress={() => setModalEscapeVisible(true)}
            activeOpacity={0.88}
          >
            <ShieldAlert size={16} color="#ffffff" />
            <Text style={styles.btnEscapeText}>
              {idioma === 'qu' ? 'QISPINA ÑAN (GUÍA VITAL)' : 'CAMINO SEGURO DE ESCAPE (GUÍA VITAL)'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. MODAL: PROTOCOLO VITAL DE ESCAPE ANDINO */}
      <Modal
        visible={modalEscapeVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEscapeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color="#dc2626" />
                <Text style={styles.modalTitle}>Reglas de Escape en el Cerro</Text>
              </View>
              <TouchableOpacity onPress={() => setModalEscapeVisible(false)}>
                <X size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <View style={styles.warningQuechuaBox}>
                <Text style={styles.warningQuechuaTitle}>
                  ¡Qata wichayman amapuni asuykuychu!
                </Text>
                <Text style={styles.warningQuechuaDesc}>
                  Ninaqa wayra qallariptin qata wichayman tawa kutitaraq utqaylla phawan. Qusñimanqa ama wichaychu, kinraykama qispiy ichu mana kanchu chayman.
                </Text>
              </View>

              <View style={styles.rulesList}>
                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    <Text style={{ fontWeight: '800' }}>Escapa hacia los lados:</Text> Muévete hacia los costados de la dirección del viento, nunca hacia arriba del cerro.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    <Text style={{ fontWeight: '800' }}>Busca zonas limpias:</Text> Dirígete a caminos, carreteras, ríos o piedras donde no haya pasto seco.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    <Text style={{ fontWeight: '800' }}>Cúbrete la boca:</Text> Usa un trapo mojado con agua para respirar si hay mucho humo.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalEscapeVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>
                {idioma === 'qu' ? 'Chaskiniñam (Entendido)' : 'Entendido'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
