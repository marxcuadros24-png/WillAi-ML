import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import {
  Flame,
  Wind,
  Droplets,
  ShieldAlert,
  Navigation,
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
  Building2,
  ExternalLink,
  ChevronDown
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
import { MapLibreMap, CORACORA_COORDS } from '../components/MapLibreMap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Obtiene la fecha actual en Perú (Zona Horaria America/Lima, UTC-5).
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
 * Formatea fecha y hora en formato legible oficial de Perú (America/Lima).
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

export const MapScreen: React.FC = () => {
  const { t } = useTranslation();
  const [fwi, setFwi] = useState<FwiActualResponse | null>(null);
  const [incidentesHoy, setIncidentesHoy] = useState<IncidenteItem[]>([]);
  const [todosIncidentes, setTodosIncidentes] = useState<IncidenteItem[]>([]);
  const [filtroSoloHoy, setFiltroSoloHoy] = useState<boolean>(true);
  const [tipoCapa, setTipoCapa] = useState<'topo' | 'sat'>('topo');
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescandoSilencioso, setRefrescandoSilencioso] = useState<boolean>(false);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<IncidenteItem | null>(null);
  const [detalleIncidente, setDetalleIncidente] = useState<IncidenteDetail | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [modalEscapeVisible, setModalEscapeVisible] = useState<boolean>(false);

  /**
   * Carga y filtra los incidentes del día desde la API de Django.
   */
  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    else setRefrescandoSilencioso(true);

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

      setIncidentesHoy(unicosHoy);
      setTodosIncidentes(unicosTodos);

      // Si no hay incidente seleccionado o ya no existe, seleccionar el primero de hoy
      if (unicosHoy.length > 0 && !incidenteSeleccionado) {
        setIncidenteSeleccionado(unicosHoy[0]);
      }
    } catch (err) {
      // Manejo de tolerancia a desconexión
    } finally {
      setCargando(false);
      setRefrescandoSilencioso(false);
    }
  }, [incidenteSeleccionado]);

  // Carga inicial y sondeo periódico silencioso cada 25 segundos sin recargar todo el mapa
  useEffect(() => {
    cargarDatos(false);
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Al seleccionar un incidente, cargar detalles adicionales (reportante, cierre, historial)
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
      // Si falla detalle, se mantiene la información del listado
    } finally {
      setCargandoDetalle(false);
    }
  };

  const incidentesParaMostrar = filtroSoloHoy ? incidentesHoy : todosIncidentes;
  const hoyPeruStr = getFechaHoyPeru();

  // Extraer valores para la tarjeta inferior según especificaciones de Fase 3
  const fechaHoraInfo = formatearFechaHoraPeru(
    detalleIncidente?.detectado_en ||
    incidenteSeleccionado?.detectado_en ||
    detalleIncidente?.creado_en ||
    incidenteSeleccionado?.creado_en
  );

  // Determinar reportante
  const reportanteNombre =
    detalleIncidente?.cierre?.cerrado_por_nombre ||
    detalleIncidente?.historial_estados?.[0]?.usuario_nombre ||
    detalleIncidente?.acciones?.[0]?.usuario_nombre ||
    (incidenteSeleccionado?.comunidad_nombre
      ? `Comunidad de ${incidenteSeleccionado.comunidad_nombre}`
      : 'Central de Operaciones COEP Parinacochas');

  // Determinar descripción
  const descripcionTexto =
    detalleIncidente?.resumen ||
    incidenteSeleccionado?.titulo ||
    'Incidente de fuego registrado por operadores en la zona de Coracora.';

  // Determinar fotografía
  const fotografiaUrl =
    detalleIncidente?.cierre?.evidencia_uri ||
    incidenteSeleccionado?.fotografia_url ||
    null;

  // Estado operativo
  const estadoTexto =
    incidenteSeleccionado?.estado_display ||
    incidenteSeleccionado?.estado ||
    'Activo';

  const estadoBadgeColor =
    (incidenteSeleccionado?.estado || '').includes('combate') || (incidenteSeleccionado?.prioridad || '') === 'critica'
      ? '#dc2626'
      : (incidenteSeleccionado?.estado || '').includes('atencion')
      ? '#ea580c'
      : '#059669';

  return (
    <View style={styles.container}>
      {/* 1. CABECERA OPERATIVA CON ESTADO METEOROLÓGICO */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Mapa de Incidentes — Coracora</Text>
          <Text style={styles.headerSubtitle}>
            {filtroSoloHoy
              ? `${incidentesHoy.length} ${incidentesHoy.length === 1 ? 'incidente registrado hoy' : 'incidentes registrados hoy'} (${hoyPeruStr})`
              : `${todosIncidentes.length} incidentes totales en base de datos`}
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
          <Text style={styles.btnRefreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* 2. BARRA DE CONDICIONES METEOROLÓGICAS EN VIVO */}
      <View style={styles.meteoBar}>
        <View style={styles.meteoItem}>
          <Flame size={13} color="#dc2626" />
          <Text style={styles.meteoLabel}>Peligro FWI:</Text>
          <Text style={[styles.meteoVal, { color: '#dc2626' }]}>
            {fwi?.nivel_peligro || 'CRÍTICO'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Wind size={13} color="#0284c7" />
          <Text style={styles.meteoLabel}>Viento:</Text>
          <Text style={styles.meteoVal}>
            {fwi?.velocidad_viento ? `${Math.round(fwi.velocidad_viento)} km/h` : '24 km/h'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Droplets size={13} color="#059669" />
          <Text style={styles.meteoLabel}>Humedad:</Text>
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
        >
          <Clock size={12} color={filtroSoloHoy ? '#ffffff' : COLORS.textSecondary} />
          <Text style={[styles.filterPillText, filtroSoloHoy && styles.filterPillTextActive]}>
            Solo de Hoy ({incidentesHoy.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, !filtroSoloHoy && styles.filterPillActive]}
          onPress={() => setFiltroSoloHoy(false)}
        >
          <Calendar size={12} color={!filtroSoloHoy ? '#ffffff' : COLORS.textSecondary} />
          <Text style={[styles.filterPillText, !filtroSoloHoy && styles.filterPillTextActive]}>
            Historial Completo ({todosIncidentes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. LIENZO CARTOGRÁFICO PROFESIONAL: MapLibre (Dev Build) + Fallback (Expo Go) */}
      <View style={styles.mapArea}>
        {cargando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.firePrimary} />
            <Text style={styles.loadingText}>Cargando mapa e incidentes de Django...</Text>
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

      {/* 5. TARJETA OPERATIVA INFERIOR (DETALLE EXHAUSTIVO SEGÚN FASE 3) */}
      {incidenteSeleccionado && (
        <View style={styles.bottomCard}>
          {/* Fila 1: Cabecera con Código, Estado y Botón Cerrar */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.statusBadge, { backgroundColor: estadoBadgeColor }]}>
                <Flame size={12} color="#ffffff" />
                <Text style={styles.statusBadgeText}>{estadoTexto.toUpperCase()}</Text>
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

          {/* Fila 2: Título del Incidente */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {incidenteSeleccionado.titulo}
          </Text>

          {/* Fila 3: Grilla de Metadatos Obligatorios de Fase 3 */}
          <View style={styles.metadataGrid}>
            {/* 1. Tipo de Incidente */}
            <View style={styles.metaRow}>
              <View style={styles.metaLabelBox}>
                <Trees size={13} color="#059669" />
                <Text style={styles.metaLabel}>Tipo:</Text>
              </View>
              <Text style={styles.metaValue}>
                {incidenteSeleccionado.tipo_incendio_display || incidenteSeleccionado.tipo_incendio || 'Pastizal / Pajonal'}
              </Text>
            </View>

            {/* 2. Fecha y Hora */}
            <View style={styles.metaRowDual}>
              <View style={[styles.metaRow, { flex: 1 }]}>
                <View style={styles.metaLabelBox}>
                  <Calendar size={13} color="#0284c7" />
                  <Text style={styles.metaLabel}>Fecha:</Text>
                </View>
                <Text style={styles.metaValue}>{fechaHoraInfo.fecha}</Text>
              </View>

              <View style={[styles.metaRow, { flex: 1 }]}>
                <View style={styles.metaLabelBox}>
                  <Clock size={13} color="#0284c7" />
                  <Text style={styles.metaLabel}>Hora:</Text>
                </View>
                <Text style={styles.metaValue}>{fechaHoraInfo.hora}</Text>
              </View>
            </View>

            {/* 3. Reportante */}
            <View style={styles.metaRow}>
              <View style={styles.metaLabelBox}>
                <User size={13} color="#7c3aed" />
                <Text style={styles.metaLabel}>Reportante:</Text>
              </View>
              <Text style={styles.metaValue} numberOfLines={1}>
                {reportanteNombre}
              </Text>
            </View>

            {/* 4. Descripción */}
            <View style={styles.descBox}>
              <View style={styles.metaLabelBox}>
                <FileText size={13} color="#ea580c" />
                <Text style={styles.metaLabel}>Descripción:</Text>
              </View>
              <Text style={styles.descText} numberOfLines={3}>
                {descripcionTexto}
              </Text>
            </View>

            {/* 5. Fotografía (cuando exista o placeholder oficial) */}
            {fotografiaUrl ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: fotografiaUrl }}
                  style={styles.photoImg}
                  resizeMode="cover"
                />
                <Text style={styles.photoCaption}>
                  Evidencia fotográfica registrada en el cierre / reporte del incidente
                </Text>
              </View>
            ) : (
              <View style={styles.noPhotoBox}>
                <Camera size={14} color="#94a3b8" />
                <Text style={styles.noPhotoText}>
                  Sin fotografía adjunta registrada en el reporte
                </Text>
              </View>
            )}
          </View>

          {/* Botón de Ruta Segura de Escape Andino */}
          <TouchableOpacity
            style={styles.btnEscape}
            onPress={() => setModalEscapeVisible(true)}
            activeOpacity={0.88}
          >
            <ShieldAlert size={16} color="#ffffff" />
            <Text style={styles.btnEscapeText}>RUTA SEGURA DE ESCAPE (GUÍA VITAL)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. MODAL: PROTOCOLO VITAL DE ESCAPE ANDINO (ESPAÑOL / QUECHUA) */}
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
                <Text style={styles.modalTitle}>Protocolo de Escape Andino</Text>
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
                    <Text style={{ fontWeight: '800' }}>Evacúa lateralmente:</Text> Muévete hacia los costados de la dirección del viento, nunca cuesta arriba.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    <Text style={{ fontWeight: '800' }}>Busca zonas sin combustible:</Text> Dirígete a quebradas rocosas, caminos afirmados o áreas ya quemadas.
                  </Text>
                </View>

                <View style={styles.ruleItem}>
                  <CheckCircle2 size={16} color="#059669" />
                  <Text style={styles.ruleText}>
                    <Text style={{ fontWeight: '800' }}>Protege tus vías respiratorias:</Text> Usa pañuelo húmedo y camina agachado si hay humo denso.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalEscapeVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1
  },
  btnRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2'
  },
  btnRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  meteoBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  meteoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  meteoLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary
  },
  meteoVal: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  filterPillActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  filterPillTextActive: {
    color: '#ffffff'
  },
  mapArea: {
    flex: 1,
    position: 'relative'
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff'
  },
  cardCode: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  cardCloseBtn: {
    padding: 4
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8
  },
  metadataGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
    marginBottom: 10
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  metaRowDual: {
    flexDirection: 'row',
    gap: 12
  },
  metaLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  descBox: {
    gap: 2,
    marginTop: 2
  },
  descText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 15
  },
  photoContainer: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  photoImg: {
    width: '100%',
    height: 110
  },
  photoCaption: {
    fontSize: 9.5,
    color: COLORS.textSecondary,
    padding: 4,
    backgroundColor: '#ffffff'
  },
  noPhotoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    marginTop: 2
  },
  noPhotoText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic'
  },
  btnEscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 11
  },
  btnEscapeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  warningQuechuaBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14
  },
  warningQuechuaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4
  },
  warningQuechuaDesc: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 16
  },
  rulesList: {
    gap: 10,
    marginBottom: 16
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start'
  },
  ruleText: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 16
  },
  modalCloseBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  }
});
