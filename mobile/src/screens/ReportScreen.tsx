import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import {
  Flame,
  ArrowLeft,
  MapPin,
  Compass,
  CheckCircle2,
  ShieldAlert,
  TreePine,
  Wheat,
  RotateCw,
  Camera
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
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const { isOnline, refrescarContador } = useNetworkSync();

  // Estados del Formulario de 3 Toques
  const [tipoFuego, setTipoFuego] = useState<TipoFuego>('incendio_descontrolado');
  const [combustible, setCombustible] = useState<TipoCombustible>('ichu_pajonal');

  // Coordenadas GPS en vivo
  const [latitud, setLatitud] = useState<number>(-15.0189);
  const [longitud, setLongitud] = useState<number>(-73.7806);
  const [precisionM, setPrecisionM] = useState<number | undefined>(8.5);
  const [azimut, setAzimut] = useState<number | undefined>(215);
  const [capturandoGps, setCapturandoGps] = useState<boolean>(true);

  // Estados de envío y éxito
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<'online' | 'offline' | null>(null);

  // Obtener GPS real del dispositivo
  const capturarGps = async () => {
    setCapturandoGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // En emulador o sin permisos, mantener coordenadas de Coracora
        setCapturandoGps(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });

      setLatitud(loc.coords.latitude);
      setLongitud(loc.coords.longitude);
      setPrecisionM(loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : 5.0);

      const heading = await Location.getHeadingAsync().catch(() => null);
      if (heading?.trueHeading !== undefined && heading.trueHeading >= 0) {
        setAzimut(Math.round(heading.trueHeading));
      }
    } catch (e) {
      console.warn('Error al obtener ubicación GPS:', e);
    } finally {
      setCapturandoGps(false);
    }
  };

  useEffect(() => {
    capturarGps();
  }, []);

  const handleEnviar = async () => {
    setEnviando(true);
    const fechaCaptura = new Date().toISOString();

    if (isOnline) {
      try {
        await enviarReporteApi(
          {
            client_uuid: '',
            latitud,
            longitud,
            precision_m: precisionM,
            azimut,
            tipo_fuego: tipoFuego,
            combustible,
            fecha_captura: fechaCaptura
          },
          token
        );
        setResultadoEnvio('online');
        return;
      } catch (error) {
        // Fallback offline si la petición web falla
        encolarReporte({
          latitud,
          longitud,
          precision_m: precisionM,
          azimut,
          tipo_fuego: tipoFuego,
          combustible,
          fecha_captura: fechaCaptura
        });
        refrescarContador();
        setResultadoEnvio('offline');
        return;
      } finally {
        setEnviando(false);
      }
    }

    // Guardado directo en SQLite si estamos offline
    encolarReporte({
      latitud,
      longitud,
      precision_m: precisionM,
      azimut,
      tipo_fuego: tipoFuego,
      combustible,
      fecha_captura: fechaCaptura
    });
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
            ? 'Las brigadas del COEP Coracora han recibido las coordenadas satelitales.'
            : t('report_offline_explanation')}
        </Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryItem}>📍 Lat: {latitud.toFixed(4)}, Lon: {longitud.toFixed(4)}</Text>
          <Text style={styles.summaryItem}>🔥 Tipo: {tipoFuego}</Text>
          <Text style={styles.summaryItem}>🌾 Vegetación: {combustible}</Text>
        </View>

        <TouchableOpacity style={styles.btnSuccessReturn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.btnSuccessReturnText}>{t('btn_cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('report_title')}</Text>
      </View>

      {/* TOQUE 1: Tipo de Fuego */}
      <View style={styles.section}>
        <Text style={styles.stepTitle}>{t('step_1_title')}</Text>
        <Text style={styles.stepSubtitle}>{t('step_1_subtitle')}</Text>

        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionCard, tipoFuego === 'incendio_descontrolado' && styles.optionCardActiveRed]}
            onPress={() => setTipoFuego('incendio_descontrolado')}
            activeOpacity={0.8}
          >
            <Flame size={24} color={tipoFuego === 'incendio_descontrolado' ? '#ef4444' : COLORS.textSecondary} />
            <Text style={styles.optionTitle}>{t('fire_wildfire')}</Text>
            <Text style={styles.optionDesc}>{t('fire_wildfire_desc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, tipoFuego === 'quema_agricola_controlada' && styles.optionCardActiveAmber]}
            onPress={() => setTipoFuego('quema_agricola_controlada')}
            activeOpacity={0.8}
          >
            <Wheat size={24} color={tipoFuego === 'quema_agricola_controlada' ? '#f59e0b' : COLORS.textSecondary} />
            <Text style={styles.optionTitle}>{t('fire_controlled')}</Text>
            <Text style={styles.optionDesc}>{t('fire_controlled_desc')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TOQUE 2: Tipo de Vegetación / Combustible */}
      <View style={styles.section}>
        <Text style={styles.stepTitle}>{t('step_2_title')}</Text>
        <Text style={styles.stepSubtitle}>{t('step_2_subtitle')}</Text>

        <View style={styles.fuelGrid}>
          {[
            { id: 'ichu_pajonal', label: t('fuel_ichu'), icon: '🌾' },
            { id: 'matorral', label: t('fuel_matorral'), icon: '🌿' },
            { id: 'bofedal', label: t('fuel_bofedal'), icon: '💧' },
            { id: 'cultivo', label: t('fuel_cultivo'), icon: '🌱' }
          ].map((fuel) => {
            const isSelected = combustible === fuel.id;
            return (
              <TouchableOpacity
                key={fuel.id}
                style={[styles.fuelBtn, isSelected && styles.fuelBtnSelected]}
                onPress={() => setCombustible(fuel.id as TipoCombustible)}
                activeOpacity={0.7}
              >
                <Text style={styles.fuelEmoji}>{fuel.icon}</Text>
                <Text style={[styles.fuelBtnText, isSelected && styles.fuelBtnTextSelected]}>{fuel.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* TOQUE 3: Posición GPS Automática */}
      <View style={styles.section}>
        <Text style={styles.stepTitle}>{t('step_3_title')}</Text>
        <Text style={styles.stepSubtitle}>{t('step_3_subtitle')}</Text>

        <View style={styles.gpsCard}>
          <View style={styles.gpsTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={18} color="#38bdf8" />
              <Text style={styles.gpsCoordText}>
                {latitud.toFixed(4)}, {longitud.toFixed(4)}
              </Text>
            </View>

            <TouchableOpacity style={styles.gpsRetryBtn} onPress={capturarGps} activeOpacity={0.7}>
              {capturandoGps ? (
                <ActivityIndicator size="small" color="#38bdf8" />
              ) : (
                <RotateCw size={14} color="#38bdf8" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.gpsMetaRow}>
            <Text style={styles.gpsMetaText}>
              {t('gps_accuracy')}: <Text style={{ color: '#ffffff', fontWeight: '700' }}>±{precisionM} m</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Compass size={13} color={COLORS.textMuted} />
              <Text style={styles.gpsMetaText}>
                {t('gps_heading')}: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{azimut}°</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Botón de Envío */}
      <TouchableOpacity
        style={[styles.btnSend, enviando && styles.btnSendDisabled]}
        onPress={handleEnviar}
        disabled={enviando}
        activeOpacity={0.85}
      >
        {enviando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Flame size={20} color="#ffffff" />
            <Text style={styles.btnSendText}>{t('btn_send_report')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnCancel} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.btnCancelText}>{t('btn_cancel')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff'
  },
  section: {
    marginBottom: 20
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2
  },
  stepSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 10
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  optionCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    gap: 6
  },
  optionCardActiveRed: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)'
  },
  optionCardActiveAmber: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)'
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff'
  },
  optionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15
  },
  fuelGrid: {
    gap: 8
  },
  fuelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 12
  },
  fuelBtnSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)'
  },
  fuelEmoji: {
    fontSize: 18
  },
  fuelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  fuelBtnTextSelected: {
    color: '#ffffff',
    fontWeight: '700'
  },
  gpsCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14
  },
  gpsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  gpsCoordText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
    fontFamily: 'monospace'
  },
  gpsRetryBtn: {
    padding: 6
  },
  gpsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 8
  },
  gpsMetaText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  btnSend: {
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4
  },
  btnSendDisabled: {
    opacity: 0.6
  },
  btnSendText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  btnCancel: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4
  },
  btnCancelText: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10
  },
  successDesc: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  summaryBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    padding: 14,
    width: '100%',
    gap: 6,
    marginBottom: 24
  },
  summaryItem: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  btnSuccessReturn: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center'
  },
  btnSuccessReturnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  }
});

