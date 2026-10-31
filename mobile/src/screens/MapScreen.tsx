import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal
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
  Compass,
  Navigation,
  Layers,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Crosshair
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { fetchFwiActual, FwiActualResponse } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FocoTactivo {
  id: string;
  codigo: string;
  nombre: string;
  lat: number;
  lon: number;
  x: number; // coordenadas en lienzo SVG (0-100)
  y: number;
  frp: number; // Potencia radiativa MW
  criticidad: 'critico' | 'alto' | 'moderado';
  distanciaKm: number;
  brigadas: string;
  aguaLanzadaL: number;
  direccionAvanceDeg: number;
}

export const MapScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [fwi, setFwi] = useState<FwiActualResponse | null>(null);
  const [focoSeleccionado, setFocoSeleccionado] = useState<FocoTactivo | null>(null);
  const [modalRutaEscapeVisible, setModalRutaEscapeVisible] = useState(false);
  const [capaSimulacionActiva, setCapaSimulacionActiva] = useState(true);

  // Focos satelitales NASA FIRMS / SERFOR sobre Coracora y Parinacochas
  const FOCOS_ACTIVOS: FocoTactivo[] = [
    {
      id: 'F-412',
      codigo: 'VIIRS-20261030-01',
      nombre: 'Foco Huaccana Alta (Pajonal)',
      lat: -15.0228,
      lon: -73.7653,
      x: 58,
      y: 42,
      frp: 58.4,
      criticidad: 'critico',
      distanciaKm: 3.4,
      brigadas: 'Brigada B-12 Coracora (8 combatientes)',
      aguaLanzadaL: 3200,
      direccionAvanceDeg: 45 // Viento empujando hacia el Noreste
    },
    {
      id: 'F-418',
      codigo: 'MODIS-20261030-02',
      nombre: 'Sector Paucaray - Quebrada',
      lat: -15.0800,
      lon: -73.8100,
      x: 32,
      y: 68,
      frp: 28.1,
      criticidad: 'alto',
      distanciaKm: 6.8,
      brigadas: 'Brigada Comunal Huaccana (6 voluntarios)',
      aguaLanzadaL: 1500,
      direccionAvanceDeg: 50
    },
    {
      id: 'F-425',
      codigo: 'VIIRS-20261030-03',
      nombre: 'Ladera Upahuacho Norte',
      lat: -14.9624,
      lon: -73.8051,
      x: 74,
      y: 26,
      frp: 12.3,
      criticidad: 'moderado',
      distanciaKm: 11.2,
      brigadas: 'En ruta de reconocimiento OGRD',
      aguaLanzadaL: 0,
      direccionAvanceDeg: 40
    }
  ];

  useEffect(() => {
    fetchFwiActual().then((res) => {
      if (res) setFwi(res);
    });
    // Por defecto seleccionar el más crítico y cercano
    setFocoSeleccionado(FOCOS_ACTIVOS[0]);
  }, []);

  const focoActivo = focoSeleccionado || FOCOS_ACTIVOS[0];

  return (
    <View style={styles.container}>
      {/* 1. Header Táctico y Widget Meteorológico FWI */}
      <View style={styles.topWidget}>
        <View style={styles.topWidgetRow}>
          <View>
            <Text style={styles.mapTitle}>{t('map_title')}</Text>
            <Text style={styles.mapSubtitle}>Coracora, Parinacochas • DEM UTM 18S</Text>
          </View>

          {/* Toggle de Simulación */}
          <TouchableOpacity
            style={[styles.toggleBtn, capaSimulacionActiva && styles.toggleBtnActive]}
            onPress={() => setCapaSimulacionActiva(!capaSimulacionActiva)}
            activeOpacity={0.7}
          >
            <Layers size={14} color={capaSimulacionActiva ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.toggleBtnText, capaSimulacionActiva && styles.toggleBtnTextActive]}>
              Simulación Viento
            </Text>
          </TouchableOpacity>
        </View>

        {/* Indicadores Meteo en vivo */}
        <View style={styles.meteoStrip}>
          <View style={styles.meteoBadge}>
            <Text style={styles.meteoBadgeTitle}>FWI</Text>
            <Text style={[styles.meteoBadgeVal, { color: '#ef4444' }]}>
              {fwi?.fwi ? fwi.fwi.toFixed(1) : '68.4'} EXTREMO
            </Text>
          </View>

          <View style={styles.meteoBadge}>
            <Wind size={12} color="#38bdf8" />
            <Text style={styles.meteoBadgeText}>
              {fwi?.velocidad_viento ? `${fwi.velocidad_viento.toFixed(0)} km/h` : '24 km/h'} SO
            </Text>
          </View>

          <View style={styles.meteoBadge}>
            <Droplets size={12} color="#06b6d4" />
            <Text style={styles.meteoBadgeText}>
              {fwi?.humedad_relativa ? `${fwi.humedad_relativa.toFixed(0)}%` : '22%'}
            </Text>
          </View>

          <View style={styles.meteoBadge}>
            <Thermometer size={12} color="#f59e0b" />
            <Text style={styles.meteoBadgeText}>
              {fwi?.temperatura ? `${fwi.temperatura.toFixed(1)}°C` : '17.8°C'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Lienzo Cartográfico Táctico con Elipses de Viento y Focos */}
      <View style={styles.canvasContainer}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            {/* Gradiente Frente de Fuego 1h, 3h, 6h */}
            <LinearGradient id="fireCone" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.65" />
              <Stop offset="50%" stopColor="#f59e0b" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#eab308" stopOpacity="0.1" />
            </LinearGradient>
          </Defs>

          {/* Cuadrícula Táctica de Fondo (Límites UTM) */}
          <G stroke="rgba(255,255,255,0.06)" strokeWidth="0.3">
            {[20, 40, 60, 80].map((v) => (
              <React.Fragment key={`grid-${v}`}>
                <Line x1={v} y1="0" x2={v} y2="100" />
                <Line x1="0" y1={v} x2="100" y2={v} />
              </React.Fragment>
            ))}
          </G>

          {/* Curvas topográficas andinas simuladas */}
          <Path
            d="M 10 90 Q 30 70 50 85 T 90 60"
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="0.5"
            strokeDasharray="2, 2"
          />
          <Path
            d="M 5 60 Q 25 40 60 55 T 95 30"
            fill="none"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="0.5"
            strokeDasharray="2, 2"
          />

          {/* Quebrada y Río Choclococha / Coracora */}
          <Path
            d="M 20 0 Q 35 30 45 60 T 60 100"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.2"
            opacity="0.4"
          />

          {/* Simulación Elíptica de Propagación del Frente por Viento (Cell2Fire) */}
          {capaSimulacionActiva && (
            <G>
              {/* Isócrona 6 horas (Mayor alcance) */}
              <Path
                d="M 58 42 C 68 28, 86 18, 92 12 C 84 26, 76 46, 58 42 Z"
                fill="rgba(239, 68, 68, 0.15)"
                stroke="#ef4444"
                strokeWidth="0.6"
                strokeDasharray="2, 1"
              />
              {/* Isócrona 3 horas */}
              <Path
                d="M 58 42 C 64 32, 76 25, 80 20 C 74 30, 68 44, 58 42 Z"
                fill="rgba(245, 158, 11, 0.25)"
                stroke="#f59e0b"
                strokeWidth="0.8"
              />
              {/* Isócrona 1 hora (Frente inmediato) */}
              <Path
                d="M 58 42 C 61 36, 68 32, 70 28 C 66 35, 63 43, 58 42 Z"
                fill="rgba(239, 68, 68, 0.55)"
                stroke="#ffffff"
                strokeWidth="0.8"
              />
              {/* Flecha del vector de viento */}
              <Line x1="58" y1="42" x2="74" y2="24" stroke="#38bdf8" strokeWidth="0.8" />
            </G>
          )}

          {/* Renderizado de Focos Satelitales */}
          {FOCOS_ACTIVOS.map((foco) => {
            const isSelected = foco.id === focoActivo.id;
            const color =
              foco.criticidad === 'critico'
                ? '#ef4444'
                : foco.criticidad === 'alto'
                ? '#f59e0b'
                : '#eab308';

            return (
              <G key={foco.id} onPress={() => setFocoSeleccionado(foco)}>
                {/* Halo pulsante */}
                <Circle cx={foco.x} cy={foco.y} r={isSelected ? 6 : 4} fill={color} opacity="0.3" />
                <Circle
                  cx={foco.x}
                  cy={foco.y}
                  r={isSelected ? 3.5 : 2.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 1.2 : 0.6}
                />
              </G>
            );
          })}

          {/* Ubicación del Usuario / Dispositivo Actual */}
          <G>
            <Circle cx="48" cy="72" r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
            <Circle cx="48" cy="72" r="8" fill="none" stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="1,1" />
          </G>
        </Svg>

        {/* Leyenda Flotante Cartográfica */}
        <View style={styles.floatingLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Crítico (&gt;40 MW)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>Alto (15-40 MW)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.legendText}>Tu Ubicación</Text>
          </View>
        </View>
      </View>

      {/* 3. Tarjeta Deslizante Inferior (Bottom Sheet Táctico) */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomCardDragBar} />

        <View style={styles.cardHeaderRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={18} color="#ef4444" />
              <Text style={styles.cardFireTitle}>{focoActivo.nombre}</Text>
            </View>
            <Text style={styles.cardCoords}>
              {focoActivo.lat.toFixed(4)}, {focoActivo.lon.toFixed(4)} • FRP {focoActivo.frp} MW
            </Text>
          </View>

          <View style={styles.distanceBadge}>
            <Crosshair size={13} color="#38bdf8" />
            <Text style={styles.distanceText}>{focoActivo.distanciaKm} km</Text>
          </View>
        </View>

        {/* Métricas de Combate */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Users size={14} color="#38bdf8" />
            <Text style={styles.metricLabel}>{t('map_brigades_active')}</Text>
            <Text style={styles.metricValue}>{focoActivo.brigadas}</Text>
          </View>

          <View style={styles.metricItem}>
            <Droplets size={14} color="#06b6d4" />
            <Text style={styles.metricLabel}>{t('map_water_dropped')}</Text>
            <Text style={styles.metricValue}>{focoActivo.aguaLanzadaL.toLocaleString()} Litros</Text>
          </View>
        </View>

        {/* BOTÓN DIRECTO: RUTA SEGURA DE ESCAPE */}
        <TouchableOpacity
          style={styles.btnEscapeRoute}
          onPress={() => setModalRutaEscapeVisible(true)}
          activeOpacity={0.88}
        >
          <Navigation size={18} color="#ffffff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.btnEscapeTitle}>{t('map_escape_route')}</Text>
            <Text style={styles.btnEscapeSub}>Dirección segura contraviento hacia zona rocosa</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal de Detalle de Ruta Segura de Escape */}
      <Modal
        visible={modalRutaEscapeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalRutaEscapeVisible(false)}
      >
        <View style={styles.modalEscapeBackdrop}>
          <View style={styles.modalEscapeContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Navigation size={22} color="#10b981" />
                <Text style={styles.modalEscapeTitle}>Ruta Segura de Evacuación</Text>
              </View>
              <TouchableOpacity onPress={() => setModalRutaEscapeVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <AlertTriangle size={20} color="#ef4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.warningBoxTitle}>Norma Crítica de Supervivencia</Text>
                <Text style={styles.warningBoxText}>{t('map_escape_warning')}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Evacúa hacia el Sur-Oeste (215°)</Text>
                  <Text style={styles.stepDesc}>Muévete perpendicular al viento. No intentes ganarle en velocidad cuesta arriba.</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Punto de Encuentro: Plaza Comunal Huaccana</Text>
                  <Text style={styles.stepDesc}>Zona libre de pajonal a 1.8 km con resguardo de brigadistas y agua.</Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Cubre Vías Respiratorias</Text>
                  <Text style={styles.stepDesc}>Usa pañuelo húmedo para mitigar inhalación de micropartículas PM 2.5.</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setModalRutaEscapeVisible(false)}
            >
              <Text style={styles.btnCloseModalText}>Entendido • Iniciar Evacuación</Text>
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
    backgroundColor: COLORS.bgPrimary,
  },
  topWidget: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topWidgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  mapSubtitle: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#b91c1c',
  },
  toggleBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  meteoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meteoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  meteoBadgeTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94a3b8',
  },
  meteoBadgeVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  meteoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#060911',
    position: 'relative',
  },
  floatingLegend: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  bottomCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 16,
    paddingBottom: 20,
    elevation: 8,
  },
  bottomCardDragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardFireTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardCoords: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
  },
  btnEscapeRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#047857',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnEscapeTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  btnEscapeSub: {
    fontSize: 10.5,
    color: '#a7f3d0',
    marginTop: 1,
  },
  modalEscapeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalEscapeContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalEscapeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  warningBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f87171',
    marginBottom: 2,
  },
  warningBoxText: {
    fontSize: 11,
    color: '#fecaca',
    lineHeight: 15,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    padding: 10,
    borderRadius: 8,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  btnCloseModal: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnCloseModalText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
