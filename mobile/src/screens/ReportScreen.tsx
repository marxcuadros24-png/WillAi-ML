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
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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
  Trash2,
  Video,
  Film,
  Clock
} from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
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


// Componente de reproducción y previsualización segura de video antes del envío
const VideoPreviewPlayer: React.FC<{ uri: string }> = ({ uri }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.videoPlayer}
      player={player}
      nativeControls
      contentFit="contain"
    />
  );
};

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

  // Estados de Evidencia de Video (Máximo estricto: 15 segundos)
  const [videoTomado, setVideoTomado] = useState<boolean>(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuracionS, setVideoDuracionS] = useState<number>(0);
  const [videoSizeMb, setVideoSizeMb] = useState<string>('0');

  // Telemetría GPS real
  const [latitud, setLatitud] = useState<number>(-15.0189);
  const [longitud, setLongitud] = useState<number>(-73.7806);
  const [precisionM, setPrecisionM] = useState<number>(3.0);
  const [altitudM, setAltitudM] = useState<number>(3180);
  const [capturandoGps, setCapturandoGps] = useState<boolean>(true);
  const [nombreLugar, setNombreLugar] = useState<string>('Coracora, Parinacochas');

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

      // Geocodificación inversa para obtener el nombre real del sector/lugar
      try {
        const geoList = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (geoList && geoList.length > 0) {
          const g = geoList[0];
          const partes = [
            g.name || g.street,
            g.district || g.subregion || g.city || 'Parinacochas',
            g.region || 'Ayacucho'
          ].filter(Boolean);
          if (partes.length > 0) {
            setNombreLugar(partes.join(', '));
          }
        }
      } catch {
        setNombreLugar('Coracora, Parinacochas, Ayacucho');
      }
    } catch (e) {
      console.warn('GPS capture fallback:', e);
    } finally {
      setCapturandoGps(false);
    }
  };

  const procesarYComprimirImagen = async (uri: string) => {
    try {
      // Redimensionar a max 1024px de ancho con compresión 0.5 JPEG -> Base64 ultraligero (~150KB)
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.5, format: SaveFormat.JPEG, base64: true }
      );
      setFotoUri(manipResult.uri);
      setFotoBase64(manipResult.base64 || null);
      setFotoTomada(true);
    } catch (e) {
      console.warn('Error comprimiendo imagen con ImageManipulator:', e);
      setFotoUri(uri);
      setFotoTomada(true);
    }
  };

  useEffect(() => {
    capturarGps();

    // Recuperar fotografía pendiente si Android cerró la actividad al abrir la cámara
    ImagePicker.getPendingResultAsync()
      .then(async (res: any) => {
        if (res && !res.canceled && 'assets' in res && res.assets && res.assets.length > 0) {
          await procesarYComprimirImagen(res.assets[0].uri);
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
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await procesarYComprimirImagen(result.assets[0].uri);
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
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await procesarYComprimirImagen(result.assets[0].uri);
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

  // 1. Grabar video con cámara real (límite automático estricto de 15 segundos)
  const handleGrabarVideoCamara = async () => {
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
        mediaTypes: ['videos'],
        videoMaxDuration: 15, // Detención automática nativa a los 15s
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_640x480,
        allowsEditing: false,
        quality: 0 // Menor resolución/bitrate posible para zonas rurales sin cobertura
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const duracionMs = asset.duration || 0;
        // Validación estricta: máx 15 segundos (+1.5s margen de metadatos)
        if (duracionMs > 16500) {
          Alert.alert(
            'Límite Excedido',
            'El video grabado dura más de 15 segundos. Por favor, graba un video de hasta 15 segundos.'
          );
          return;
        }

        const duracionS = Math.round(duracionMs / 1000) || 15;
        const sizeMb = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) : '2.0';
        setVideoUri(asset.uri);
        setVideoDuracionS(duracionS);
        setVideoSizeMb(sizeMb);
        setVideoTomado(true);
      }
    } catch (err) {
      console.warn('Error al abrir cámara de video:', err);
      Alert.alert(
        'Aviso',
        'No se pudo abrir la cámara de video directamente. ¿Deseas elegir un video de tu galería?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Abrir Galería', onPress: handleElegirVideoDeGaleria }
        ]
      );
    }
  };

  // 2. Elegir video desde galería (máx 15 segundos)
  const handleElegirVideoDeGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Se requiere permiso para ver los videos de tu teléfono.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 15,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_640x480,
        allowsEditing: false,
        quality: 0
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const duracionMs = asset.duration || 0;
        if (duracionMs > 16500) {
          Alert.alert(
            'Video demasiado largo',
            'El video seleccionado dura más de 15 segundos. Por favor selecciona un video de hasta 15 segundos.'
          );
          return;
        }

        const duracionS = Math.round(duracionMs / 1000) || 15;
        const sizeMb = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) : '2.0';
        setVideoUri(asset.uri);
        setVideoDuracionS(duracionS);
        setVideoSizeMb(sizeMb);
        setVideoTomado(true);
      }
    } catch (err) {
      console.warn('Error al abrir galería de video:', err);
    }
  };

  const handleEliminarVideo = () => {
    setVideoUri(null);
    setVideoTomado(false);
    setVideoDuracionS(0);
    setVideoSizeMb('0');
  };

  const handleEnviarReporte = async () => {
    setEnviando(true);
    const clientUuid = `rep-movil-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fechaCaptura = new Date().toISOString();

    // Preservar la ruta en disco (fotoUri) para streaming multipart y dataUri como respaldo
    const dataUri = fotoBase64 ? `data:image/jpeg;base64,${fotoBase64}` : (fotoUri || null);

    const payload = {
      client_uuid: clientUuid,
      latitud: Number(Number(latitud).toFixed(6)),
      longitud: Number(Number(longitud).toFixed(6)),
      precision_m: precisionM,
      azimut: 210,
      tipo_fuego: tipoFuego,
      combustible,
      foto_uri: fotoUri || dataUri,
      foto_base64: fotoBase64 || null,
      video_uri: videoUri || null,
      fecha_captura: fechaCaptura
    };

    if (isOnline) {
      try {
        console.log('[ReportScreen] Enviando reporte en línea a Django:', payload.client_uuid);
        await enviarReporteApi(payload, token);
        console.log('[ReportScreen] Reporte entregado con éxito a Django');
        setResultadoEnvio('online');
      } catch (err: any) {
        console.error("Fallo subida con video:", err);
        console.warn('[ReportScreen] Fallo envío directo en vivo, guardando en cola offline SQLite:', err?.message || err);
        // Guardar fielmente en SQLite con todos los adjuntos (video intacto)
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
              ? (idioma === 'qu'
                  ? 'Centralpiqa chaskirunkuñam ninapa fotonta hinaspa maypi kasqantapas.'
                  : 'Los operadores de emergencia ya recibieron tu aviso, fotografía y coordenadas GPS.')
              : (isOnline
                  ? (idioma === 'qu'
                      ? 'Celularnikipi allinta waqaychasqa kachkan. Kikinllam centralman rinqa.'
                      : 'No se pudo contactar a la central en este instante. Tu aviso y fotografía están guardados seguros y se enviarán automáticamente en segundo plano.')
                  : (idioma === 'qu'
                      ? 'Kay urqupi mana internet kanchu. Cobertura kaptinqa kikinllam centralman chayanqa.'
                      : 'En este cerro no hay señal de internet. Tu aviso y fotografía quedaron guardados de forma segura y se enviarán automáticamente apenas recuperes cobertura.'))}
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

          {/* 2. SECCIÓN: VIDEO DEL FUEGO (MÁXIMO 15 SEGUNDOS) */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>
                {idioma === 'qu' ? '2. Ninapa Videon (Max 15s)' : '2. Video del Fuego (Máx. 15s)'}
              </Text>
              <View style={styles.videoDurationBadge}>
                <Clock size={11} color="#ffffff" />
                <Text style={styles.videoDurationBadgeText}>Máx. 15s</Text>
              </View>
            </View>

            {videoTomado && videoUri ? (
              <View style={styles.photoPreviewContainer}>
                <VideoPreviewPlayer uri={videoUri} />
                <View style={styles.photoCapturedContent}>
                  <View style={styles.photoSuccessBadge}>
                    <CheckCircle2 size={18} color="#059669" />
                    <Text style={styles.photoCapturedText}>
                      {idioma === 'qu' ? `Video hap'isqa (${videoDuracionS}s)` : `Video listo (${videoDuracionS}s • ${videoSizeMb}MB)`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.photoChangeBtn}
                      onPress={handleGrabarVideoCamara}
                    >
                      <Text style={styles.photoChangeText}>Regrabar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoChangeBtn, { borderColor: '#fca5a5' }]}
                      onPress={handleEliminarVideo}
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.videoBox}>
                <View style={styles.photoPlaceholder}>
                  <Video size={38} color="#ea580c" />
                  <Text style={[styles.photoBtnText, { color: '#ea580c' }]}>
                    {idioma === 'qu' ? 'Ninata Videoy (15 segundo)' : 'Grabar Video del Fuego'}
                  </Text>
                  <Text style={styles.photoBtnSub}>
                    Muestra el avance de las llamas y humo (se detiene a los 15s)
                  </Text>

                  {/* Botones de acción: Grabar o Galería */}
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity
                      style={[styles.photoSmallBtn, { backgroundColor: '#ffedd5', borderColor: '#fed7aa' }]}
                      onPress={handleGrabarVideoCamara}
                      activeOpacity={0.8}
                    >
                      <Video size={16} color="#ea580c" />
                      <Text style={[styles.photoSmallBtnText, { color: '#ea580c' }]}>
                        {idioma === 'qu' ? 'Videota kichay' : 'Grabar Video'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoSmallBtn}
                      onPress={handleElegirVideoDeGaleria}
                      activeOpacity={0.8}
                    >
                      <Film size={16} color={COLORS.textSecondary} />
                      <Text style={styles.photoSmallBtnText}>
                        {idioma === 'qu' ? 'Galeríamanta' : 'De Galería'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* 3. SECCIÓN: TU UBICACIÓN */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>
                {idioma === 'qu' ? '2. Maypi kasqayki' : '2. Tu Ubicación'}
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

            {/* Nombre real del lugar y coordenadas */}
            <View style={styles.lugarReferenciaBox}>
              <MapPin size={22} color={COLORS.firePrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lugarNombreText}>
                  {capturandoGps
                    ? (idioma === 'qu' ? 'Maypi kasqaykita maskachkan...' : 'Detectando lugar exacto...')
                    : nombreLugar}
                </Text>
                <Text style={styles.lugarCoordsText}>
                  {latitud.toFixed(4)}° S, {longitud.toFixed(4)}° W • ±{precisionM} m • {altitudM} msnm
                </Text>
              </View>
            </View>
          </View>

          {/* 4. SECCIÓN: TIPO DE FUEGO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '4. ¿Ima nina kaytaq?' : '4. ¿Qué tipo de fuego es?'}
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

          {/* 5. SECCIÓN: QUÉ SE ESTÁ QUEMANDO */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '5. ¿Imataq rupachkan?' : '5. ¿Qué pasto o vegetación se quema?'}
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

          {/* 6. SECCIÓN: CASAS O FAMILIAS EN PELIGRO */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBox}>
                <Text style={styles.switchLabel}>
                  {idioma === 'qu' ? '6. ¿Wasikuna qayllapichu kachkan?' : '6. ¿Hay casas o corrales cerca?'}
                </Text>
                <Text style={styles.switchSub}>
                  {idioma === 'qu'
                    ? 'Wasikuna 500 metro qayllapi'
                    : 'A menos de 500 metros del fuego'}
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

          {/* 7. OBSERVACIÓN OPCIONAL */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {idioma === 'qu' ? '7. Yapasqa willakuy (munaspayki)' : '7. Algún dato más (opcional)'}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.btnSubmitText}>
                  {videoUri
                    ? (idioma === 'qu' ? 'VIDEOTA KACHACHKAN...' : 'SUBIENDO VIDEO Y AVISO...')
                    : (idioma === 'qu' ? 'KACHACHKAN...' : 'ENVIANDO AVISO...')}
                </Text>
              </View>
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
