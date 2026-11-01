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
import {
  esFechaDeHoyPeru,
  getFechaHoyPeru,
  formatearHora12Peru,
  formatearFechaHoraLegible
} from '../utils/timePeru';
import { styles } from './MapScreen.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [incidentesHoy, setIncidentesHoy] = useState<IncidenteItem[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescandoSilencioso, setRefrescandoSilencioso] = useState<boolean>(false);
  const [incidenteSeleccionado, setIncidenteSeleccionado] = useState<IncidenteItem | null>(null);
  const [detalleIncidente, setDetalleIncidente] = useState<IncidenteDetail | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState<boolean>(false);
  const [modalEscapeVisible, setModalEscapeVisible] = useState<boolean>(false);

  // Capa 100% Satelital permanente (sin topográfico)
  const tipoCapa = 'sat';

  /**
   * Carga y filtra únicamente los incidentes del día de hoy en Perú.
   */
  const cargarDatos = useCallback(async (silencioso = false) => {
    if (silencioso) setRefrescandoSilencioso(true);

    try {
      const [fwiData, incList] = await Promise.all([
        fetchFwiActual(),
        fetchIncidentesApi()
      ]);

      if (fwiData) setFwi(fwiData);

      // Filtrar estrictamente por fecha de HOY en horario oficial de Perú
      const incidentesDeHoy = (incList || []).filter((inc) =>
        esFechaDeHoyPeru(inc.detectado_en || inc.creado_en)
      );

      // Deduplicar marcadores por id_incidente
      const mapUnicosHoy = new Map<number, IncidenteItem>();
      incidentesDeHoy.forEach((item) => {
        if (!mapUnicosHoy.has(item.id_incidente)) {
          mapUnicosHoy.set(item.id_incidente, item);
        }
      });
      const unicosHoy = Array.from(mapUnicosHoy.values());

      setIncidentesHoy(unicosHoy);

      if (unicosHoy.length > 0) {
        setIncidenteSeleccionado((prev) =>
          prev && unicosHoy.some((u) => u.id_incidente === prev.id_incidente)
            ? prev
            : unicosHoy[0]
        );
      } else {
        setIncidenteSeleccionado(null);
      }
    } catch (err) {
      // Manejo silencioso de desconexión
    } finally {
      setCargando(false);
      setRefrescandoSilencioso(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos(false);
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

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

  const hoyPeruStr = getFechaHoyPeru();

  const fechaIsoEvento =
    detalleIncidente?.detectado_en ||
    incidenteSeleccionado?.detectado_en ||
    detalleIncidente?.creado_en ||
    incidenteSeleccionado?.creado_en;

  const horaLegible = formatearHora12Peru(fechaIsoEvento) || 'En atención';
  const fechaLegible = formatearFechaHoraLegible(fechaIsoEvento);

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
            {idioma === 'qu' ? 'Coracora Nina Mapa' : 'Mapa Satelital de Fuegos'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {idioma === 'qu'
              ? `Kunan punchaw ${incidentesHoy.length} nina rikusqa (${hoyPeruStr})`
              : incidentesHoy.length === 0
              ? `Sin fuegos reportados hoy (${hoyPeruStr})`
              : `${incidentesHoy.length} ${incidentesHoy.length === 1 ? 'fuego reportado hoy' : 'fuegos reportados hoy'} (${hoyPeruStr})`}
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

      {/* 3. AVISO DE ESTADO CUANDO NO HAY FUEGOS HOY */}
      {incidentesHoy.length === 0 && !cargando && (
        <View
          style={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            borderWidth: 1,
            borderRadius: 10,
            marginHorizontal: 12,
            marginBottom: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <Text style={{ fontSize: 12, color: '#065f46', fontWeight: '700', flex: 1 }}>
            {idioma === 'qu'
              ? 'Kunan punchawqa mana ninachu kachkan. Hawkam kachkanchik.'
              : 'Todo en calma: No se registran incendios hoy en Parinacochas.'}
          </Text>
        </View>
      )}

      {/* 4. LIENZO CARTOGRÁFICO SATELITAL */}
      <View style={styles.mapArea}>
        {cargando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.firePrimary} />
            <Text style={styles.loadingText}>
              {idioma === 'qu' ? 'Mapata kichachkan...' : 'Cargando mapa satelital...'}
            </Text>
          </View>
        ) : (
          <MapLibreMap
            incidentes={incidentesHoy}
            incidenteSeleccionado={incidenteSeleccionado}
            onSelectIncidente={handleSelectIncidente}
            tipoCapa={tipoCapa}
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
              <Text style={styles.cardCode}>
                {incidenteSeleccionado.comunidad_nombre || 'Sector Coracora'}
              </Text>
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
                <Text style={styles.metaValue}>{hoyPeruStr}</Text>
              </View>

              <View style={[styles.metaRow, { flex: 1 }]}>
                <View style={styles.metaLabelBox}>
                  <Clock size={13} color="#0284c7" />
                  <Text style={styles.metaLabel}>
                    {idioma === 'qu' ? 'Hora:' : 'Hora:'}
                  </Text>
                </View>
                <Text style={styles.metaValue}>{horaLegible}</Text>
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
