import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Line,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Text as SvgText
} from 'react-native-svg';
import {
  Flame,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  Navigation,
  Compass,
  AlertTriangle,
  X,
  MapPin,
  CheckCircle2,
  RefreshCw
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import {
  fetchFwiActual,
  fetchFocosFirmsApi,
  FwiActualResponse,
  DeteccionFirmsItem
} from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FocoMapItem {
  id: string;
  sensor: string;
  nombre: string;
  lat: number;
  lon: number;
  x: number; // Coordenada en lienzo SVG (0-100)
  y: number;
  frp: number;
  criticidad: 'critico' | 'alto' | 'moderado';
  distanciaKm: number;
  vientoDireccion: string;
}

export const MapScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [fwi, setFwi] = useState<FwiActualResponse | null>(null);
  const [focos, setFocos] = useState<FocoMapItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [focoSeleccionado, setFocoSeleccionado] = useState<FocoMapItem | null>(null);
  const [modalEscapeVisible, setModalEscapeVisible] = useState(false);

  // Focos satelitales iniciales de referencia sobre Parinacochas
  const FOCOS_DEFAULT: FocoMapItem[] = [
    {
      id: 'VIIRS-01',
      sensor: 'VIIRS (375m)',
      nombre: 'Sector Huaccana Alta',
      lat: -15.0228,
      lon: -73.7653,
      x: 58,
      y: 42,
      frp: 58.4,
      criticidad: 'critico',
      distanciaKm: 3.4,
      vientoDireccion: 'Hacia el Noreste (subiendo quebrada)'
    },
    {
      id: 'MODIS-02',
      sensor: 'MODIS (1km)',
      nombre: 'Paucaray - Quebrada Baja',
      lat: -15.0800,
      lon: -73.8100,
      x: 34,
      y: 68,
      frp: 28.1,
      criticidad: 'alto',
      distanciaKm: 6.2,
      vientoDireccion: 'Hacia ladera este'
    },
    {
      id: 'VIIRS-03',
      sensor: 'VIIRS (375m)',
      nombre: 'Pajonal Secce / Chumpi',
      lat: -14.9950,
      lon: -73.7200,
      x: 75,
      y: 28,
      frp: 16.5,
      criticidad: 'moderado',
      distanciaKm: 8.9,
      vientoDireccion: 'Hacia cumbre rocosa'
    }
  ];

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [fwiData, firmsData] = await Promise.all([
        fetchFwiActual(),
        fetchFocosFirmsApi(15)
      ]);

      if (fwiData) setFwi(fwiData);

      if (firmsData && firmsData.length > 0) {
        // Mapear detecciones reales de Django a coordenadas relativas del mapa
        const minLat = -15.20, maxLat = -14.90;
        const minLon = -73.95, maxLon = -73.65;

        const focosReales: FocoMapItem[] = firmsData.slice(0, 5).map((f, i) => {
          const lat = typeof f.latitud === 'string' ? parseFloat(f.latitud) : f.latitud;
          const lon = typeof f.longitud === 'string' ? parseFloat(f.longitud) : f.longitud;
          const frp = typeof f.frp_mw === 'string' ? parseFloat(f.frp_mw) : f.frp_mw || 20;

          // Normalizar x, y en porcentaje
          const normX = Math.max(15, Math.min(85, ((lon - minLon) / (maxLon - minLon)) * 100));
          const normY = Math.max(15, Math.min(85, ((maxLat - lat) / (maxLat - minLat)) * 100));

          const dist = Math.round((Math.sqrt(Math.pow((lat - -15.0189) * 111, 2) + Math.pow((lon - -73.7806) * 107, 2))) * 10) / 10;

          return {
            id: `FIRMS-${f.id_deteccion || i + 1}`,
            sensor: f.sensor || 'VIIRS',
            nombre: `Foco Satelital #${i + 1} (${f.codigo_producto || 'NASA'})`,
            lat,
            lon,
            x: normX,
            y: normY,
            frp,
            criticidad: frp > 40 ? 'critico' : frp > 20 ? 'alto' : 'moderado',
            distanciaKm: dist || 3.5,
            vientoDireccion: fwiData ? `Empuja hacia ${fwiData.direccion_viento}` : 'Viento hacia el Noreste'
          };
        });

        setFocos(focosReales);
        setFocoSeleccionado(focosReales[0]);
      } else {
        setFocos(FOCOS_DEFAULT);
        setFocoSeleccionado(FOCOS_DEFAULT[0]);
      }
    } catch {
      setFocos(FOCOS_DEFAULT);
      setFocoSeleccionado(FOCOS_DEFAULT[0]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const focoActivo = focoSeleccionado || focos[0];

  return (
    <View style={styles.container}>
      {/* 1. CABECERA METEOROLÓGICA Y ESTADO */}
      <View style={styles.headerBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('map_title')}</Text>
          <Text style={styles.headerSubtitle}>
            {focos.length} focos detectados en Parinacochas
          </Text>
        </View>

        <TouchableOpacity style={styles.btnRefresh} onPress={cargarDatos}>
          <RefreshCw size={14} color={COLORS.firePrimary} />
          <Text style={styles.btnRefreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de condiciones meteorológicas en vivo */}
      <View style={styles.meteoBar}>
        <View style={styles.meteoItem}>
          <Flame size={14} color="#dc2626" />
          <Text style={styles.meteoLabel}>Peligro FWI:</Text>
          <Text style={[styles.meteoVal, { color: '#dc2626' }]}>
            {fwi?.nivel_peligro || 'CRÍTICO'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Wind size={14} color="#0284c7" />
          <Text style={styles.meteoLabel}>Viento:</Text>
          <Text style={styles.meteoVal}>
            {fwi?.velocidad_viento ? `${Math.round(fwi.velocidad_viento)} km/h` : '24 km/h'}
          </Text>
        </View>

        <View style={styles.meteoItem}>
          <Droplets size={14} color="#059669" />
          <Text style={styles.meteoLabel}>Humedad:</Text>
          <Text style={styles.meteoVal}>
            {fwi?.humedad_relativa ? `${Math.round(fwi.humedad_relativa)}%` : '18%'}
          </Text>
        </View>
      </View>

      {/* 2. LIENZO DEL MAPA DE PARINACOCHAS */}
      <View style={styles.mapCanvasContainer}>
        {cargando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.firePrimary} />
            <Text style={styles.loadingText}>Cargando satélites NASA FIRMS...</Text>
          </View>
        ) : (
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            {/* Fondo cartográfico claro */}
            <Rect width="100" height="100" fill="#f1f5f9" />

            {/* Curvas de nivel / Relieve suave de la cordillera */}
            <Path
              d="M 0 30 Q 30 15 60 25 T 100 20 L 100 0 L 0 0 Z"
              fill="#e2e8f0"
              opacity={0.6}
            />
            <Path
              d="M 0 50 Q 40 40 70 55 T 100 45 L 100 100 L 0 100 Z"
              fill="#e2e8f0"
              opacity={0.4}
            />

            {/* Quebradas / Ríos de referencia */}
            <Path
              d="M 20 0 Q 30 40 45 60 T 55 100"
              fill="none"
              stroke="#bae6fd"
              strokeWidth="1.2"
            />
            <Path
              d="M 60 0 Q 70 30 65 70 T 80 100"
              fill="none"
              stroke="#bae6fd"
              strokeWidth="1"
            />

            {/* Etiquetas de Sectores */}
            <SvgText x="48" y="52" fill="#334155" fontSize="3.2" fontWeight="bold">
              Coracora
            </SvgText>
            <Circle cx="46" cy="51" r="1.2" fill="#0284c7" />

            <SvgText x="56" y="38" fill="#475569" fontSize="2.8">
              Huaccana
            </SvgText>
            <SvgText x="28" y="74" fill="#475569" fontSize="2.8">
              Paucaray
            </SvgText>
            <SvgText x="70" y="24" fill="#475569" fontSize="2.8">
              Chumpi
            </SvgText>
            <SvgText x="15" y="40" fill="#475569" fontSize="2.8">
              Pullo
            </SvgText>

            {/* Mi Ubicación (Punto azul pulsante) */}
            <Circle cx="46" cy="51" r="3.5" fill="rgba(2, 132, 199, 0.2)" />
            <Circle cx="46" cy="51" r="1.8" fill="#0284c7" stroke="#ffffff" strokeWidth="0.5" />

            {/* Focos Activos Satelitales */}
            {focos.map((foco) => {
              const isSelected = focoActivo?.id === foco.id;
              const color =
                foco.criticidad === 'critico'
                  ? '#dc2626'
                  : foco.criticidad === 'alto'
                  ? '#ea580c'
                  : '#d97706';

              return (
                <G key={foco.id} onPress={() => setFocoSeleccionado(foco)}>
                  {/* Halo de fuego */}
                  <Circle
                    cx={foco.x}
                    cy={foco.y}
                    r={isSelected ? 6 : 4}
                    fill={color}
                    opacity={isSelected ? 0.35 : 0.2}
                  />

                  {/* Núcleo de llama */}
                  <Circle
                    cx={foco.x}
                    cy={foco.y}
                    r={isSelected ? 3 : 2.2}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 0.8 : 0.5}
                  />

                  {/* Flecha de dirección de avance por viento */}
                  <Line
                    x1={foco.x}
                    y1={foco.y}
                    x2={foco.x + 4}
                    y2={foco.y - 4}
                    stroke="#dc2626"
                    strokeWidth="0.8"
                    strokeDasharray="1,1"
                  />
                </G>
              );
            })}
          </Svg>
        )}

        {/* Leyenda rápida flotante en esquina */}
        <View style={styles.mapLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#0284c7' }]} />
            <Text style={styles.legendText}>Tu Ubicación</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
            <Text style={styles.legendText}>Foco Activo</Text>
          </View>
        </View>
      </View>

      {/* 3. TARJETA OPERATIVA INFERIOR (DETALLE DEL FOCO MÁS PRÓXIMO) */}
      {focoActivo && (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBox}>
              <View style={styles.fireBadge}>
                <Flame size={14} color="#ffffff" />
                <Text style={styles.fireBadgeText}>{focoActivo.criticidad.toUpperCase()}</Text>
              </View>
              <Text style={styles.detailName}>{focoActivo.nombre}</Text>
            </View>

            <Text style={styles.detailDistance}>
              A {focoActivo.distanciaKm} km
            </Text>
          </View>

          {/* Información práctica para pobladores y brigadistas */}
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Compass size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailItemLabel}>Avance del Fuego:</Text>
              <Text style={styles.detailItemValue}>{focoActivo.vientoDireccion}</Text>
            </View>

            <View style={styles.detailItem}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailItemLabel}>Sensor Satelital:</Text>
              <Text style={styles.detailItemValue}>{focoActivo.sensor} • {focoActivo.frp} MW</Text>
            </View>
          </View>

          {/* Botón de Ruta Segura de Escape */}
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

      {/* MODAL: GUÍA DE EVACUACIÓN Y ESCAPE ANDINO */}
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
              {/* Advertencia Vital en Quechua */}
              <View style={styles.warningQuechuaBox}>
                <Text style={styles.warningQuechuaTitle}>
                  ¡Qata wichayman amapuni asuykuychu!
                </Text>
                <Text style={styles.warningQuechuaDesc}>
                  Ninaqa wayra qallariptin qata wichayman tawa kutitaraq utqaylla phawan. Qusñimanqa ama wichaychu, kinraykama qispiy ichu mana kanchu chayman.
                </Text>
              </View>

              {/* Reglas de Evacuación en Español */}
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
                    <Text style={{ fontWeight: '800' }}>Protege tus vías respiratorias:</Text> Usa pañuelo húmedo y camina agachado cerca al suelo si hay humo denso.
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
    backgroundColor: COLORS.bgPrimary
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  btnRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
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
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  meteoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  meteoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary
  },
  meteoVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  mapCanvasContainer: {
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
  mapLegend: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 4
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  detailTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  fireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  fireBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff'
  },
  detailName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1
  },
  detailDistance: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626'
  },
  detailGrid: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 6,
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailItemLabel: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  detailItemValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1
  },
  btnEscape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12
  },
  btnEscapeText: {
    color: '#ffffff',
    fontSize: 12.5,
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
