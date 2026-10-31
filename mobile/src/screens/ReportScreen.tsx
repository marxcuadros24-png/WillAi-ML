import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Image
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  Flame,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Camera,
  RotateCcw,
  Send,
  AlertTriangle,
  ImageIcon,
  Trash2
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { encolarReporte } from '../db/offlineQueue';
import { enviarReporteApi } from '../services/api';
import { styles } from './ReportScreen.styles';

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
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

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

    // Recuperar fotografía pendiente si Android cerró la actividad al abrir la cámara
    ImagePicker.getPendingResultAsync()
      .then((res: any) => {
        if (res && !res.canceled && 'assets' in res && res.assets && res.assets.length > 0) {
          setFotoUri(res.assets[0].uri);
          setFotoBase64(res.assets[0].base64 || null);
          setFotoTomada(true);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Tomar fotografía REAL con la cámara del teléfono
  const handleTomarFotoCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          idioma === 'qu' ? 'Permisota munanchik' : 'Permiso de Cámara',
          idioma === 'qu'
            ? 'Cámarata kichanaykipaq permisotam munanchik.'
            : 'Se requiere permiso para abrir la cámara de tu teléfono.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri);
        setFotoBase64(result.assets[0].base64 || null);
        setFotoTomada(true);
      }
    } catch (err) {
      console.warn('Error al abrir la cámara:', err);
      Alert.alert(
        'Aviso',
        'No se pudo abrir la cámara directamente. ¿Deseas elegir una foto de tu galería?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Abrir Galería', onPress: handleElegirDeGaleria }
        ]
      );
    }
  };

  // 2. Elegir fotografía desde la galería del teléfono
  const handleElegirDeGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Se requiere permiso para ver las fotos de tu teléfono.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri);
        setFotoBase64(result.assets[0].base64 || null);
        setFotoTomada(true);
      }
    } catch (err) {
      console.warn('Error al abrir galería:', err);
    }
  };

  const handleEliminarFoto = () => {
    setFotoUri(null);
    setFotoBase64(null);
    setFotoTomada(false);
  };

  const handleEnviarReporte = async () => {
    setEnviando(true);
    const clientUuid = `rep-movil-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fechaCaptura = new Date().toISOString();

    const dataUri = fotoBase64 ? `data:image/jpeg;base64,${fotoBase64}` : (fotoUri || null);

    const payload = {
      client_uuid: clientUuid,
      latitud: Number(Number(latitud).toFixed(6)),
      longitud: Number(Number(longitud).toFixed(6)),
      precision_m: precisionM,
      azimut: 210,
      tipo_fuego: tipoFuego,
      combustible,
      foto_uri: dataUri,
      foto_base64: fotoBase64 || null,
      fecha_captura: fechaCaptura
    };

    if (isOnline) {
      try {
        console.log('[ReportScreen] Enviando reporte en línea a Django:', payload.client_uuid);
        await enviarReporteApi(payload, token);
        console.log('[ReportScreen] Reporte entregado con éxito a Django');
        setResultadoEnvio('online');
      } catch (err: any) {
        console.warn('[ReportScreen] Fallo envío directo, encolando en SQLite:', err?.message || err);
        // Si la red falla a mitad del envío, guardar en cola SQLite
        await encolarReporte(payload);
        await refrescarContador();
        setResultadoEnvio('offline');
      } finally {
        setEnviando(false);
      }
    } else {
      // Sin conexión: guardar en base de datos local SQLite
      console.log('[ReportScreen] Sin conexión a internet, guardando en SQLite local...');
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
          <Text style={styles.btnBackText}>
            {idioma === 'qu' ? 'Kutipariy' : 'Volver'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#059669' : '#d97706' }]} />
          <Text style={styles.statusText}>
            {isOnline
              ? (idioma === 'qu' ? '🟢 Signal kachkan' : '🟢 Hay señal')
              : (idioma === 'qu' ? '🟠 Mana signalchu (celularpi)' : '🟠 Sin señal (se guarda aquí)')}
          </Text>
        </View>
      </View>

      {/* Pantalla de Confirmación de Envío */}
      {resultadoEnvio !== null ? (
        <View style={styles.cardSuccess}>
          <CheckCircle2 size={54} color={resultadoEnvio === 'online' ? '#059669' : '#d97706'} />
          <Text style={styles.successTitle}>
            {resultadoEnvio === 'online'
              ? (idioma === 'qu' ? '¡Willasqayki chayaramunña!' : '¡Aviso Enviado a la Central!')
              : (idioma === 'qu' ? '¡Celularnikipi waqaychasqaña!' : '¡Aviso Guardado en el Celular!')}
          </Text>
          <Text style={styles.successDesc}>
            {resultadoEnvio === 'online'
              ? 'la central de emergencia ya recibieron tu foto y coordenadas.'
              : 'En este cerro no hay señal de internet. Tu aviso quedó guardado de forma segura y se enviará automáticamente apenas recuperes cobertura.'}
          </Text>

          <TouchableOpacity style={styles.btnSuccessClose} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.btnSuccessCloseText}>
              {idioma === 'qu' ? 'Qallariyman kutiy' : 'Volver al Inicio'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 1. SECCIÓN: FOTO DEL FUEGO CON CÁMARA REAL */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '1. Ninapa Foton (Cámarawan hap\'iy)' : '1. Foto del Fuego (Evidencia con cámara)'}
            </Text>

            {fotoTomada && fotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: fotoUri }} style={styles.photoPreviewImage} resizeMode="cover" />
                <View style={styles.photoCapturedContent}>
                  <View style={styles.photoSuccessBadge}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={styles.photoCapturedText}>
                      {idioma === 'qu' ? 'Foto hap\'isqaña' : 'Foto adjunta con éxito'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.photoChangeBtn}
                      onPress={handleTomarFotoCamara}
                    >
                      <Text style={styles.photoChangeText}>Cambiar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoChangeBtn, { borderColor: '#fca5a5' }]}
                      onPress={handleEliminarFoto}
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.photoBox}>
                <View style={styles.photoPlaceholder}>
                  <Camera size={40} color={COLORS.firePrimary} />
                  <Text style={styles.photoBtnText}>
                    {idioma === 'qu' ? 'Ninata Fotoy' : 'Tomar Foto del Fuego'}
                  </Text>
                  <Text style={styles.photoBtnSub}>
                    Ayuda a los bomberos a saber el tamaño de las llamas
                  </Text>

                  {/* Botones de acción: Cámara o Galería */}
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={[styles.photoSmallBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
                      onPress={handleTomarFotoCamara}
                      activeOpacity={0.8}
                    >
                      <Camera size={16} color={COLORS.firePrimary} />
                      <Text style={[styles.photoSmallBtnText, { color: COLORS.firePrimary }]}>
                        {idioma === 'qu' ? 'Cámarata kichay' : 'Abrir Cámara'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoSmallBtn}
                      onPress={handleElegirDeGaleria}
                      activeOpacity={0.8}
                    >
                      <ImageIcon size={16} color={COLORS.textSecondary} />
                      <Text style={styles.photoSmallBtnText}>
                        {idioma === 'qu' ? 'Galeríamanta' : 'De Galería'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 2. SECCIÓN: UBICACIÓN GPS EN EL CERRO */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>
                {idioma === 'qu' ? '2. Maypi kasqayki (GPS)' : '2. Tu Ubicación en el Cerro (GPS)'}
              </Text>
              <TouchableOpacity
                style={styles.btnRefreshGps}
                onPress={capturarGps}
                disabled={capturandoGps}
                activeOpacity={0.8}
              >
                {capturandoGps ? (
                  <ActivityIndicator size="small" color={COLORS.firePrimary} />
                ) : (
                  <>
                    <RotateCcw size={12} color={COLORS.firePrimary} />
                    <Text style={styles.btnRefreshGpsText}>
                      {idioma === 'qu' ? 'Musuqmanta' : 'Actualizar'}
                    </Text>
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
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '3. ¿Ima nina kaytaq?' : '3. ¿Qué tipo de fuego es?'}
            </Text>
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
                  size={20}
                  color={tipoFuego === 'incendio_descontrolado' ? '#ffffff' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.optionBtnText,
                    tipoFuego === 'incendio_descontrolado' && styles.optionBtnTextActive
                  ]}
                >
                  {idioma === 'qu' ? 'Nina sinchi (Incendio)' : 'Fuego sin control'}
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
                  size={20}
                  color={tipoFuego === 'quema_agricola_controlada' ? '#ffffff' : '#d97706'}
                />
                <Text
                  style={[
                    styles.optionBtnText,
                    tipoFuego === 'quema_agricola_controlada' && styles.optionBtnTextActive
                  ]}
                >
                  {idioma === 'qu' ? 'Chacra kañay' : 'Quema de chacra'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. SECCIÓN: QUÉ SE ESTÁ QUEMANDO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '4. ¿Imataq rupachkan?' : '4. ¿Qué pasto o vegetación se quema?'}
            </Text>
            <View style={styles.fuelGrid}>
              {[
                { id: 'ichu_pajonal', label: idioma === 'qu' ? 'Chaki ichu' : 'Pasto seco / Ichu' },
                { id: 'matorral', label: idioma === 'qu' ? 'Kichka / Sachakuna' : 'Arbustos / Matorral' },
                { id: 'bofedal', label: idioma === 'qu' ? 'Uqu pampa' : 'Pasto verde / Bofedal' },
                { id: 'cultivo', label: idioma === 'qu' ? 'Chacra tarpusqa' : 'Chacra sembrada' }
              ].map((f) => {
                const active = combustible === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.fuelBtn, active && styles.fuelBtnActive]}
                    onPress={() => setCombustible(f.id as TipoCombustible)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fuelBtnText, active && styles.fuelBtnTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 5. SECCIÓN: CASAS O FAMILIAS EN PELIGRO */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBox}>
                <Text style={styles.switchLabel}>
                  {idioma === 'qu' ? '5. ¿Wasikuna qayllapichu kachkan?' : '5. ¿Hay casas o corrales cerca?'}
                </Text>
                <Text style={styles.switchSub}>
                  {idioma === 'qu'
                    ? 'Wasikuna pichqa cuadra qayllapi'
                    : 'A menos de 5 cuadras del fuego'}
                </Text>
              </View>

              <View style={styles.switchControls}>
                <TouchableOpacity
                  style={[styles.switchBtn, viviendasEnRiesgo && styles.switchBtnActive]}
                  onPress={() => setViviendasEnRiesgo(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.switchBtnText, viviendasEnRiesgo && styles.switchBtnTextActive]}>
                    {idioma === 'qu' ? 'ARÍ (SÍ)' : 'SÍ'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    !viviendasEnRiesgo && { backgroundColor: '#64748b' }
                  ]}
                  onPress={() => setViviendasEnRiesgo(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.switchBtnText, !viviendasEnRiesgo && { color: '#ffffff' }]}>
                    {idioma === 'qu' ? 'MANAM' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 6. OBSERVACIÓN OPCIONAL */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '6. Yapasqa willakuy (munaspayki)' : '6. Algún dato más (opcional)'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={idioma === 'qu' ? 'Qillqay: ninaqa Huaccana mayuman rillachkan...' : 'Ej: El fuego va hacia la quebrada de Huaccana...'}
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
                <Send size={20} color="#ffffff" />
                <Text style={styles.btnSubmitText}>
                  {idioma === 'qu' ? ' WILLAYTA KACHAY' : 'ENVIAR AVISO A WILLAI'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};
