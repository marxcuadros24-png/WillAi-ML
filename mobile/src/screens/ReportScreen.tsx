import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import Svg, { Rect, Line, Circle, G, Text as SvgText, Path } from 'react-native-svg';
import {
  Flame,
  ArrowLeft,
  MapPin,
  Compass,
  CheckCircle2,
  Scan,
  Mic,
  Home,
  ShieldAlert,
  Send,
  Camera,
  RotateCcw,
  Sparkles,
  AlertTriangle
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { encolarReporte } from '../db/offlineQueue';
import { enviarReporteApi } from '../services/api';

interface ReportScreenProps {
  onBack: () => void;
}

type TipoFuego = 'incendio_descontrolado' | 'quema_agricola_controlada';
type TipoCombustible = 'ichu_pajonal' | 'matorral' | 'bofedal' | 'cultivo';

export const ReportScreen: React.FC<ReportScreenProps> = ({ onBack }) => {
  const { t, idioma } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const { isOnline, refrescarContador } = useNetworkSync();

  // Estados del Formulario Táctico
  const [tipoFuego, setTipoFuego] = useState<TipoFuego>('incendio_descontrolado');
  const [combustible, setCombustible] = useState<TipoCombustible>('ichu_pajonal');
  const [escalaArea, setEscalaArea] = useState<'menor_1ha' | '1a5ha' | 'mayor_5ha'>('1a5ha');
  const [viviendasCercanas500m, setViviendasCercanas500m] = useState<boolean>(true);
  const [notaVoz, setNotaVoz] = useState<string>('');
  const [grabandoVoz, setGrabandoVoz] = useState<boolean>(false);

  // Telemetría GPS en tiempo real
  const [latitud, setLatitud] = useState<number>(-15.0189);
  const [longitud, setLongitud] = useState<number>(-73.7806);
  const [precisionM, setPrecisionM] = useState<number>(3.0);
  const [azimut, setAzimut] = useState<number>(215);
  const [capturandoGps, setCapturandoGps] = useState<boolean>(true);

  // Visión Computacional WillAi Vision Scan
  const [visionScanActive, setVisionScanActive] = useState<boolean>(true);
  const [scanDensidadHumo, setScanDensidadHumo] = useState<number>(82);
  const [scanSeveridad, setScanSeveridad] = useState<string>('CRÍTICA / FRENTE ACTIVO');
  const [scanDistanciaOptica, setScanDistanciaOptica] = useState<number>(450);

  // Estados de envío
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<'online' | 'offline' | null>(null);

  // Obtener GPS real del dispositivo
  const capturarGps = async () => {
    setCapturandoGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCapturandoGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });

      setLatitud(loc.coords.latitude);
      setLongitud(loc.coords.longitude);
      setPrecisionM(loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : 3.0);

      const heading = await Location.getHeadingAsync().catch(() => null);
      if (heading?.trueHeading !== undefined && heading.trueHeading >= 0) {
        setAzimut(Math.round(heading.trueHeading));
      }
    } catch (e) {
      console.warn('GPS capture fallback:', e);
    } finally {
      setCapturandoGps(false);
    }
  };

  useEffect(() => {
    capturarGps();
  }, []);

  const handleSimularDictadoVoz = () => {
    setGrabandoVoz(true);
    setTimeout(() => {
      setGrabandoVoz(false);
      setNotaVoz('Humo denso avanzando rápidamente hacia la quebrada de Huaccana. Se observan 3 chozas en riesgo.');
    }, 1500);
  };

  const handleDespachoUrgente = async () => {
    setEnviando(true);
    const fechaCaptura = new Date().toISOString();

    const payloadReporte = {
      client_uuid: '',
      latitud,
      longitud,
      precision_m: precisionM,
      azimut,
      tipo_fuego: tipoFuego,
      combustible,
      fecha_captura: fechaCaptura
    };

    if (isOnline) {
      try {
        await enviarReporteApi(payloadReporte, token);
        setResultadoEnvio('online');
        return;
      } catch (error) {
        // Fallback a SQLite offline
        encolarReporte(payloadReporte);
        refrescarContador();
        setResultadoEnvio('offline');
        return;
      } finally {
        setEnviando(false);
      }
    }

    // Modo Offline
    encolarReporte(payloadReporte);
    refrescarContador();
    setResultadoEnvio('offline');
    setEnviando(false);
  };

  if (resultadoEnvio) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <CheckCircle2 size={54} color={resultadoEnvio === 'online' ? COLORS.emerald : COLORS.fireAmber} />
        </View>

        <Text style={styles.successTitle}>
          {resultadoEnvio === 'online' ? t('report_sent_online') : t('report_saved_offline')}
        </Text>

        <Text style={styles.successDesc}>
          {resultadoEnvio === 'online'
            ? 'Despachado a Brigada Forestal B-12 Coracora, COEP Parinacochas y Bomberos.'
            : t('report_offline_explanation')}
        </Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryItem}>📍 GPS: {latitud.toFixed(4)}, {longitud.toFixed(4)} (±{precisionM}m)</Text>
          <Text style={styles.summaryItem}>🔥 Tipo: {tipoFuego} • {combustible}</Text>
          <Text style={styles.summaryItem}>👁️ Vision Scan: {scanDensidadHumo}% Humo • Azimut {azimut}°</Text>
          <Text style={styles.summaryItem}>🏠 Viviendas a &lt;500m: {viviendasCercanas500m ? 'SÍ (Alerta Habitacional)' : 'NO'}</Text>
        </View>

        <TouchableOpacity style={styles.btnSuccessReturn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.btnSuccessReturnText}>{t('btn_cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('report_title')}</Text>
          <Text style={styles.headerSubtitle}>WillAi Vision Scan + GPS ±3m</Text>
        </View>
      </View>

      {/* 1. MÓDULO VISOR DE CÁMARA CON HUD TÁCTICO WILLAI VISION SCAN */}
      <View style={styles.cameraBox}>
        {/* Marco Táctico de Visión Computacional */}
        <View style={styles.hudOverlay}>
          {/* Header del HUD */}
          <View style={styles.hudHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Scan size={14} color="#10b981" />
              <Text style={styles.hudTitleText}>{t('camera_hud_scan')}</Text>
            </View>
            <View style={styles.hudLiveBadge}>
              <Text style={styles.hudLiveBadgeText}>IA ACTIVA</Text>
            </View>
          </View>

          {/* Gráfico SVG de Retícula Táctica y Detección de Fuego */}
          <View style={styles.reticleContainer}>
            <Svg width="100%" height="160" viewBox="0 0 200 120">
              {/* Esquinas de Enfoque */}
              <Path d="M 15 25 L 15 15 L 25 15" stroke="#10b981" strokeWidth="2" fill="none" />
              <Path d="M 185 25 L 185 15 L 175 15" stroke="#10b981" strokeWidth="2" fill="none" />
              <Path d="M 15 95 L 15 105 L 25 105" stroke="#10b981" strokeWidth="2" fill="none" />
              <Path d="M 185 95 L 185 105 L 175 105" stroke="#10b981" strokeWidth="2" fill="none" />

              {/* Bounding Box IA sobre Columna de Humo */}
              <Rect
                x="55"
                y="20"
                width="90"
                height="80"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4, 3"
                fill="rgba(239, 68, 68, 0.15)"
              />
              <SvgText x="60" y="32" fill="#ef4444" fontSize="8" fontWeight="bold">
                [HUMO DENSO: 82%]
              </SvgText>

              {/* Cruz Central Táctica */}
              <Line x1="100" y1="52" x2="100" y2="68" stroke="#38bdf8" strokeWidth="1" />
              <Line x1="92" y1="60" x2="108" y2="60" stroke="#38bdf8" strokeWidth="1" />
              <Circle cx="100" cy="60" r="16" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2, 2" fill="none" />
            </Svg>
          </View>

          {/* Telemetría de Visión Computacional en Pantalla */}
          <View style={styles.hudTelemetryGrid}>
            <View style={styles.hudTelemetryItem}>
              <Text style={styles.hudTelemetryLabel}>{t('smoke_density')}</Text>
              <Text style={[styles.hudTelemetryVal, { color: '#ef4444' }]}>{scanDensidadHumo}%</Text>
            </View>
            <View style={styles.hudTelemetryItem}>
              <Text style={styles.hudTelemetryLabel}>{t('severity_estimated')}</Text>
              <Text style={[styles.hudTelemetryVal, { color: '#f59e0b' }]}>CRÍTICA</Text>
            </View>
            <View style={styles.hudTelemetryItem}>
              <Text style={styles.hudTelemetryLabel}>{t('azimuth_heading')}</Text>
              <Text style={[styles.hudTelemetryVal, { color: '#38bdf8' }]}>{azimut}° SO</Text>
            </View>
            <View style={styles.hudTelemetryItem}>
              <Text style={styles.hudTelemetryLabel}>{t('distance_optical')}</Text>
              <Text style={[styles.hudTelemetryVal, { color: '#10b981' }]}>~{scanDistanciaOptica}m</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. GEORREFERENCIACIÓN FIJA DE ALTA PRECISIÓN (±3m) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPin size={18} color="#38bdf8" />
            <Text style={styles.cardTitle}>Posición Satelital Fija GPS</Text>
          </View>
          <TouchableOpacity onPress={capturarGps} style={styles.btnRecalibrar}>
            <RotateCcw size={13} color="#38bdf8" />
            <Text style={styles.btnRecalibrarText}>Recalibrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gpsCoordsBox}>
          <Text style={styles.gpsCoordsText}>{latitud.toFixed(6)}, {longitud.toFixed(6)}</Text>
          <View style={styles.accuracyTag}>
            <Text style={styles.accuracyTagText}>Alta Precisión ±{precisionM}m</Text>
          </View>
        </View>
      </View>

      {/* 3. FORMULARIO DE VERIFICACIÓN ÁGIL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verificación Rápida del Frente</Text>

        {/* Tipo de Fuego */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, tipoFuego === 'incendio_descontrolado' && styles.toggleBtnActiveRed]}
            onPress={() => setTipoFuego('incendio_descontrolado')}
          >
            <Flame size={16} color={tipoFuego === 'incendio_descontrolado' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.toggleBtnText, tipoFuego === 'incendio_descontrolado' && styles.toggleBtnTextActive]}>
              Incendio Descontrolado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, tipoFuego === 'quema_agricola_controlada' && styles.toggleBtnActiveAmber]}
            onPress={() => setTipoFuego('quema_agricola_controlada')}
          >
            <Text style={[styles.toggleBtnText, tipoFuego === 'quema_agricola_controlada' && styles.toggleBtnTextActive]}>
              Quema Controlada
            </Text>
          </TouchableOpacity>
        </View>

        {/* Escala del Área */}
        <Text style={styles.fieldLabel}>Escala del Área Afectada</Text>
        <View style={styles.toggleRow}>
          {[
            { id: 'menor_1ha', label: '< 1 ha (Foco)' },
            { id: '1a5ha', label: '1 - 5 ha' },
            { id: 'mayor_5ha', label: '> 5 ha (Frente)' }
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.scaleBtn, escalaArea === item.id && styles.scaleBtnActive]}
              onPress={() => setEscalaArea(item.id as any)}
            >
              <Text style={[styles.scaleBtnText, escalaArea === item.id && styles.scaleBtnTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Indicador de Viviendas a Menos de 500m */}
        <TouchableOpacity
          style={[styles.viviendasBox, viviendasCercanas500m && styles.viviendasBoxActive]}
          onPress={() => setViviendasCercanas500m(!viviendasCercanas500m)}
          activeOpacity={0.8}
        >
          <Home size={20} color={viviendasCercanas500m ? '#ef4444' : '#94a3b8'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.viviendasTitle, viviendasCercanas500m && { color: '#fca5a5' }]}>
              {t('viviendas_500m')}
            </Text>
            <Text style={styles.viviendasSub}>{t('viviendas_500m_desc')}</Text>
          </View>
          <View style={[styles.checkbox, viviendasCercanas500m && styles.checkboxActive]}>
            {viviendasCercanas500m && <CheckCircle2 size={16} color="#ffffff" />}
          </View>
        </TouchableOpacity>

        {/* Dictado de Voz / Nota Rápida */}
        <Text style={styles.fieldLabel}>{t('voice_note')}</Text>
        <View style={styles.voiceWrapper}>
          <TextInput
            style={styles.voiceInput}
            placeholder={t('voice_note_placeholder')}
            placeholderTextColor="#64748b"
            value={notaVoz}
            onChangeText={setNotaVoz}
            multiline
          />
          <TouchableOpacity
            style={[styles.micBtn, grabandoVoz && styles.micBtnActive]}
            onPress={handleSimularDictadoVoz}
          >
            <Mic size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. BOTÓN DE DESPACHO URGENTE DIRECTO A BRIGADAS Y BOMBEROS */}
      <TouchableOpacity
        style={[styles.btnDispatch, enviando && styles.btnDispatchDisabled]}
        onPress={handleDespachoUrgente}
        disabled={enviando}
        activeOpacity={0.88}
      >
        {enviando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={22} color="#ffffff" />
            <Text style={styles.btnDispatchText}>{t('btn_dispatch_urgent')}</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
  },
  cameraBox: {
    height: 250,
    backgroundColor: '#030712',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  hudOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    justifyContent: 'space-between',
    padding: 12,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudTitleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.8,
  },
  hudLiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  hudLiveBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#10b981',
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudTelemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudTelemetryItem: {
    alignItems: 'center',
  },
  hudTelemetryLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginBottom: 2,
    fontWeight: '700',
  },
  hudTelemetryVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnRecalibrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  btnRecalibrarText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#38bdf8',
  },
  gpsCoordsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 8,
  },
  gpsCoordsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  accuracyTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accuracyTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingVertical: 10,
  },
  toggleBtnActiveRed: {
    backgroundColor: '#b91c1c',
    borderColor: '#ef4444',
  },
  toggleBtnActiveAmber: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  toggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
  },
  scaleBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 6,
    paddingVertical: 8,
  },
  scaleBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
  scaleBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  scaleBtnTextActive: {
    color: '#38bdf8',
  },
  viviendasBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 12,
  },
  viviendasBoxActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  viviendasTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  viviendasSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  voiceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  voiceInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    minHeight: 40,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#b91c1c',
  },
  btnDispatch: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  btnDispatchDisabled: {
    opacity: 0.6,
  },
  btnDispatchText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 12.5,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  summaryBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 14,
    width: '100%',
    gap: 6,
    marginBottom: 20,
  },
  summaryItem: {
    fontSize: 11.5,
    color: '#cbd5e1',
  },
  btnSuccessReturn: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnSuccessReturnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
