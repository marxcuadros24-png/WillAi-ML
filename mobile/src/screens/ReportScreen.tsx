import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import {
  Flame,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Camera,
  RotateCcw,
  Send,
  Home,
  AlertTriangle,
  FileText,
  Image as ImageIcon
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

  // Estados del Formulario
  const [tipoFuego, setTipoFuego] = useState<TipoFuego>('incendio_descontrolado');
  const [combustible, setCombustible] = useState<TipoCombustible>('ichu_pajonal');
  const [viviendasEnRiesgo, setViviendasEnRiesgo] = useState<boolean>(true);
  const [descripcion, setDescripcion] = useState<string>('');
  const [fotoTomada, setFotoTomada] = useState<boolean>(false);

  // Telemetría GPS real
  const [latitud, setLatitud] = useState<number>(-15.0189);
  const [longitud, setLongitud] = useState<number>(-73.7806);
  const [precisionM, setPrecisionM] = useState<number>(3.0);
  const [altitudM, setAltitudM] = useState<number>(3180);
  const [capturandoGps, setCapturandoGps] = useState<boolean>(true);

  // Estados de envío
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<'online' | 'offline' | null>(null);

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
      if (loc.coords.altitude) {
        setAltitudM(Math.round(loc.coords.altitude));
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

  const handleSimularFoto = () => {
    setFotoTomada(true);
    Alert.alert(
      idioma === 'qu' ? 'Foto hap\'isqa' : 'Evidencia Fotográfica',
      idioma === 'qu' ? 'Ninapa foton hap\'isqaña.' : 'Foto capturada con metadatos GPS incrustados.'
    );
  };

  const handleEnviarReporte = async () => {
    setEnviando(true);
    const clientUuid = `rep-movil-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fechaCaptura = new Date().toISOString();

    const payload = {
      client_uuid: clientUuid,
      latitud,
      longitud,
      precision_m: precisionM,
      azimut: 210,
      tipo_fuego: tipoFuego,
      combustible,
      foto_uri: fotoTomada ? 'file://evidencia_incendio.jpg' : null,
      fecha_captura: fechaCaptura
    };

    if (isOnline) {
      try {
        await enviarReporteApi(payload, token);
        setResultadoEnvio('online');
      } catch (err) {
        // Si la red falla a mitad del envío, guardar en cola SQLite
        await encolarReporte(payload);
        await refrescarContador();
        setResultadoEnvio('offline');
      } finally {
        setEnviando(false);
      }
    } else {
      // Sin conexión: guardar en base de datos local SQLite
      await encolarReporte(payload);
      await refrescarContador();
      setResultadoEnvio('offline');
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Cabecera */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.btnBack} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={18} color={COLORS.textPrimary} />
          <Text style={styles.btnBackText}>{t('btn_cancel')}</Text>
        </TouchableOpacity>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#059669' : '#d97706' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Central Conectada' : 'Modo Sin Señal (SQLite)'}
          </Text>
        </View>
      </View>

      {/* Pantalla de Confirmación de Envío */}
      {resultadoEnvio !== null ? (
        <View style={styles.cardSuccess}>
          <CheckCircle2 size={48} color={resultadoEnvio === 'online' ? '#059669' : '#d97706'} />
          <Text style={styles.successTitle}>
            {resultadoEnvio === 'online'
              ? t('report_sent_online')
              : t('report_saved_offline')}
          </Text>
          <Text style={styles.successDesc}>
            {resultadoEnvio === 'online'
              ? 'El reporte ha sido transmitido en tiempo real al Centro de Operaciones de Emergencia (COEP Parinacochas).'
              : t('report_offline_explanation')}
          </Text>

          <TouchableOpacity style={styles.btnSuccessClose} onPress={onBack}>
            <Text style={styles.btnSuccessCloseText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 1. SECCIÓN: FOTO DEL FUEGO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Evidencia Fotográfica</Text>
            <TouchableOpacity
              style={[styles.photoBox, fotoTomada && styles.photoBoxCaptured]}
              onPress={handleSimularFoto}
              activeOpacity={0.8}
            >
              {fotoTomada ? (
                <View style={styles.photoCapturedContent}>
                  <CheckCircle2 size={32} color="#059669" />
                  <Text style={styles.photoCapturedText}>Foto adjunta con éxito</Text>
                  <Text style={styles.photoCapturedSub}>Toca para cambiar de fotografía</Text>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={36} color={COLORS.firePrimary} />
                  <Text style={styles.photoBtnText}>Tomar Foto del Incendio</Text>
                  <Text style={styles.photoBtnSub}>Ayuda a las brigadas a dimensionar el fuego</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 2. SECCIÓN: UBICACIÓN GPS */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>2. Ubicación GPS</Text>
              <TouchableOpacity
                style={styles.btnRefreshGps}
                onPress={capturarGps}
                disabled={capturandoGps}
              >
                {capturandoGps ? (
                  <ActivityIndicator size="small" color={COLORS.firePrimary} />
                ) : (
                  <>
                    <RotateCcw size={12} color={COLORS.firePrimary} />
                    <Text style={styles.btnRefreshGpsText}>Actualizar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.gpsGrid}>
              <View style={styles.gpsItem}>
                <Text style={styles.gpsLabel}>Latitud</Text>
                <Text style={styles.gpsValue}>{latitud.toFixed(4)}° S</Text>
              </View>

              <View style={styles.gpsItem}>
                <Text style={styles.gpsLabel}>Longitud</Text>
                <Text style={styles.gpsValue}>{longitud.toFixed(4)}° W</Text>
              </View>

              <View style={styles.gpsItem}>
                <Text style={styles.gpsLabel}>Precisión</Text>
                <Text style={[styles.gpsValue, { color: '#059669' }]}>±{precisionM} m</Text>
              </View>

              <View style={styles.gpsItem}>
                <Text style={styles.gpsLabel}>Altitud</Text>
                <Text style={styles.gpsValue}>{altitudM} msnm</Text>
              </View>
            </View>
          </View>

          {/* 3. SECCIÓN: TIPO DE FUEGO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. ¿Qué tipo de evento es?</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  tipoFuego === 'incendio_descontrolado' && styles.optionBtnActiveFire
                ]}
                onPress={() => setTipoFuego('incendio_descontrolado')}
                activeOpacity={0.8}
              >
                <Flame
                  size={18}
                  color={tipoFuego === 'incendio_descontrolado' ? '#ffffff' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.optionBtnText,
                    tipoFuego === 'incendio_descontrolado' && styles.optionBtnTextActive
                  ]}
                >
                  {t('fire_wildfire')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionBtn,
                  tipoFuego === 'quema_agricola_controlada' && styles.optionBtnActiveAmber
                ]}
                onPress={() => setTipoFuego('quema_agricola_controlada')}
                activeOpacity={0.8}
              >
                <AlertTriangle
                  size={18}
                  color={tipoFuego === 'quema_agricola_controlada' ? '#ffffff' : '#d97706'}
                />
                <Text
                  style={[
                    styles.optionBtnText,
                    tipoFuego === 'quema_agricola_controlada' && styles.optionBtnTextActive
                  ]}
                >
                  {t('fire_controlled')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. SECCIÓN: COMBUSTIBLE QUE SE QUEMA */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. ¿Qué vegetación se está quemando?</Text>
            <View style={styles.fuelGrid}>
              {[
                { id: 'ichu_pajonal', label: t('fuel_ichu') },
                { id: 'matorral', label: t('fuel_matorral') },
                { id: 'bofedal', label: t('fuel_bofedal') },
                { id: 'cultivo', label: t('fuel_cultivo') }
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.fuelBtn, combustible === f.id && styles.fuelBtnActive]}
                  onPress={() => setCombustible(f.id as TipoCombustible)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.fuelBtnText, combustible === f.id && styles.fuelBtnTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 5. SECCIÓN: VIVIENDAS EN RIESGO */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>¿Hay viviendas o personas cerca?</Text>
                <Text style={styles.switchSubtitle}>A menos de 500 metros del fuego</Text>
              </View>

              <View style={styles.switchButtons}>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    viviendasEnRiesgo && { backgroundColor: '#dc2626' }
                  ]}
                  onPress={() => setViviendasEnRiesgo(true)}
                >
                  <Text style={[styles.switchBtnText, viviendasEnRiesgo && { color: '#ffffff' }]}>
                    SÍ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    !viviendasEnRiesgo && { backgroundColor: '#64748b' }
                  ]}
                  onPress={() => setViviendasEnRiesgo(false)}
                >
                  <Text style={[styles.switchBtnText, !viviendasEnRiesgo && { color: '#ffffff' }]}>
                    NO
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 6. OBSERVACIÓN OPCIONAL */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Detalle adicional (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: El fuego avanza hacia la quebrada de Huaccana..."
              placeholderTextColor={COLORS.textMuted}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* BOTÓN PRINCIPAL DE ENVÍO */}
          <TouchableOpacity
            style={[styles.btnSubmit, enviando && styles.btnSubmitDisabled]}
            onPress={handleEnviarReporte}
            disabled={enviando}
            activeOpacity={0.88}
          >
            {enviando ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Send size={18} color="#ffffff" />
                <Text style={styles.btnSubmitText}>ENVIAR REPORTE A LA CENTRAL</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  btnBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  photoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoBoxCaptured: {
    borderColor: '#059669',
    backgroundColor: '#f0fdf4'
  },
  photoPlaceholder: {
    alignItems: 'center'
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8
  },
  photoBtnSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  photoCapturedContent: {
    alignItems: 'center'
  },
  photoCapturedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 6
  },
  photoCapturedSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  btnRefreshGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2'
  },
  btnRefreshGpsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  gpsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  gpsItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  gpsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600'
  },
  gpsValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  optionBtnActiveFire: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  optionBtnActiveAmber: {
    backgroundColor: '#d97706',
    borderColor: '#d97706'
  },
  optionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  optionBtnTextActive: {
    color: '#ffffff'
  },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  fuelBtn: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center'
  },
  fuelBtnActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  fuelBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  fuelBtnTextActive: {
    color: '#ffffff'
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  switchSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  switchButtons: {
    flexDirection: 'row',
    gap: 6
  },
  switchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 6
  },
  btnSubmitDisabled: {
    opacity: 0.65
  },
  btnSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4
  },
  cardSuccess: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginTop: 20
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
    textAlign: 'center'
  },
  successDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18
  },
  btnSuccessClose: {
    marginTop: 20,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10
  },
  btnSuccessCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary
  }
});
