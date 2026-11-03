import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Flame,
  Lock,
  User,
  Fingerprint,
  ArrowRight,
  Map as MapIcon,
  Server,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react-native';
import { COLORS, getApiBase, setApiBase, resetApiBase, DEFAULT_SERVER_URL } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { probarConexionApi } from '../services/api';
import { WillAiLogo } from '../components/WillAiLogo';
import { SatelliteSyncBadge } from '../components/SatelliteSyncBadge';
import { styles } from './LoginScreen.styles';

interface LoginScreenProps {
  onSuccess: () => void;
  onEmergencyReport: () => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onEmergencyReport,
  onGoToRegister
}) => {
  const { t, idioma, setIdioma } = useTranslation();
  const login = useAuthStore((s) => s.login);

  // Campos de login sin pre-llenado fijo
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado del modal de configuración de servidor
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(getApiBase());
  const [testingServer, setTestingServer] = useState<boolean>(false);
  const [serverTestResult, setServerTestResult] = useState<{ ok: boolean; mensaje: string } | null>(null);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((hasHardware) => {
      if (hasHardware) {
        LocalAuthentication.isEnrolledAsync().then((isEnrolled) => {
          setBiometricAvailable(isEnrolled);
        });
      }
    });
    setServerUrlInput(getApiBase());
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setErrorMsg(idioma === 'qu' ? 'Sutiykita, pakay simiykitapas churay.' : 'Por favor ingresa usuario y contraseña.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(
        err.message ||
        (idioma === 'qu'
          ? 'Pantaymi rikuriramun. Sutiykita qillqaykuy.'
          : 'Usuario o clave incorrecta. Verifica tus datos.')
      );
    } finally {
      setCargando(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricAvailable) {
      Alert.alert(
        idioma === 'qu' ? 'Huella mana kanchu' : 'Huella no configurada',
        idioma === 'qu'
          ? 'Celularnikipi huellaykita churaykuy.'
          : 'Configura tu huella en los ajustes de seguridad de tu teléfono.'
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: idioma === 'qu' ? 'WillAIman yaykunaykipaq dedoykita churay' : 'Coloca tu dedo para ingresar a WillAI',
        cancelLabel: idioma === 'qu' ? 'Kutipariy' : 'Cancelar'
      });

      if (result.success) {
        if (!username.trim() || !password) {
          Alert.alert(
            'Huella reconocida',
            'Por favor ingresa tus credenciales una vez para vincular la sesión biométrica.'
          );
          return;
        }
        setCargando(true);
        await login(username.trim(), password);
        onSuccess();
      }
    } catch {
      // Ignorar cancelación
    } finally {
      setCargando(false);
    }
  };

  const handleTestServer = async () => {
    setTestingServer(true);
    setServerTestResult(null);
    try {
      const res = await probarConexionApi(serverUrlInput);
      setServerTestResult({ ok: res.ok, mensaje: res.mensaje });
    } catch (err: any) {
      setServerTestResult({ ok: false, mensaje: err.message || 'Error de conexión' });
    } finally {
      setTestingServer(false);
    }
  };

  const handleSaveServer = async () => {
    if (!serverUrlInput.trim()) {
      Alert.alert('Error', 'La URL no puede estar vacía');
      return;
    }
    const finalUrl = await setApiBase(serverUrlInput);
    setServerUrlInput(finalUrl);
    setServerTestResult({ ok: true, mensaje: '¡URL de servidor guardada!' });
    setTimeout(() => {
      setShowServerModal(false);
    }, 900);
  };

  const handleResetServer = async () => {
    const defaultUrl = await resetApiBase();
    setServerUrlInput(defaultUrl);
    setServerTestResult({ ok: true, mensaje: 'Restablecido al servidor por defecto.' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Barra Superior con Selector Idioma y Config Servidor */}
        <View style={styles.topBar}>
          <SatelliteSyncBadge />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Botón Acceso Rápido a Config Servidor */}
            <TouchableOpacity
              style={styles.btnServerConfig}
              onPress={() => {
                setServerUrlInput(getApiBase());
                setServerTestResult(null);
                setShowServerModal(true);
              }}
              activeOpacity={0.75}
            >
              <Server size={14} color="#0284c7" />
              <Text style={styles.btnServerConfigText}>Servidor</Text>
            </TouchableOpacity>

            <View style={styles.langSelector}>
              <TouchableOpacity
                style={[styles.langBtn, idioma === 'es' && styles.langBtnActive]}
                onPress={() => setIdioma('es')}
              >
                <Text style={[styles.langBtnText, idioma === 'es' && styles.langBtnTextActive]}>ES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langBtn, idioma === 'qu' && styles.langBtnActive]}
                onPress={() => setIdioma('qu')}
              >
                <Text style={[styles.langBtnText, idioma === 'qu' && styles.langBtnTextActive]}>QU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Logo e Identidad */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <WillAiLogo size={46} />
          </View>
          <Text style={styles.title}>WillAI Coracora</Text>
          <Text style={styles.subtitle}>
            {idioma === 'qu' ? 'Ayllunchikpaq Ninamanta Qawapakuq' : 'Alerta Comunal contra Incendios'}
          </Text>
        </View>

        {/* 1. BOTÓN DE EMERGENCIA: REPORTAR SIN CLAVE */}
        <TouchableOpacity
          style={styles.btnEmergencyBox}
          onPress={onEmergencyReport}
          activeOpacity={0.88}
        >
          <View style={styles.btnEmergencyInner}>
            <View style={styles.btnEmergencyIconCircle}>
              <Flame size={26} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.btnEmergencyTitle}>
                {idioma === 'qu' ? '🚨 NINA UTQAYLLA WILLAY' : '🚨 AVISAR FUEGO AHORA (SIN CLAVE)'}
              </Text>
              <Text style={styles.btnEmergencySub}>
                {idioma === 'qu' ? 'Cámarawan hinaspa GPS-wan willay' : 'Toca aquí para mandar foto y ubicación urgente'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. BOTÓN: VER MAPA DIRECTAMENTE SIN INICIAR SESIÓN */}
        <TouchableOpacity
          style={styles.btnSkipToMap}
          onPress={onSuccess}
          activeOpacity={0.8}
        >
          <MapIcon size={16} color="#0284c7" />
          <Text style={styles.btnSkipToMapText}>
            {idioma === 'qu' ? 'Mapata qaway (Mana yaykuspa)' : 'Ver mapa de fuegos directamente'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {idioma === 'qu' ? 'Icha cuentaykiwan yaykuy' : 'O entra a tu cuenta'}
          </Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 3. Formulario de Inicio de Sesión Directo */}
        <View style={styles.cardForm}>
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {idioma === 'qu' ? 'Sutiyki' : 'Nombre de Usuario'}
            </Text>
            <View style={styles.inputWrapper}>
              <User size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder={idioma === 'qu' ? 'Sutiykita churay' : 'Tu usuario o número de celular'}
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {idioma === 'qu' ? 'Claveyki' : 'Contraseña'}
            </Text>
            <View style={styles.inputWrapper}>
              <Lock size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnLogin, cargando && styles.btnLoginDisabled]}
            onPress={handleLogin}
            disabled={cargando}
            activeOpacity={0.8}
          >
            {cargando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.btnLoginText}>
                  {idioma === 'qu' ? 'Yaykuy' : 'Entrar a mi Cuenta'}
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGoRegister}
            onPress={onGoToRegister}
            activeOpacity={0.75}
          >
            <Text style={styles.btnGoRegisterText}>
              {idioma === 'qu' ? '¿Manaraqchu cuentayki? Qillqakuy kaypi' : '¿No tienes cuenta? Crear una cuenta gratis'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Acceso con Huella Digital */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity
            style={styles.btnBiometric}
            onPress={handleBiometricAuth}
            activeOpacity={0.75}
          >
            <Fingerprint size={20} color="#0284c7" />
            <Text style={styles.btnBiometricText}>
              {idioma === 'qu' ? 'Dedowan yaykuy' : 'Entrar con mi Huella Digital'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Configuración y Diagnóstico del Servidor */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Server size={20} color={COLORS.cyan} />
                <Text style={styles.modalTitle}>Servidor de WillAI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Dirección de conexión con el backend de WillAI (Cloudflare Tunnel o IP local):
            </Text>

            <View style={styles.serverInputWrapper}>
              <TextInput
                style={styles.serverTextInput}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                placeholder="https://...trycloudflare.com/api/v1"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {serverTestResult && (
              <View
                style={[
                  styles.testResultBox,
                  serverTestResult.ok ? styles.testResultSuccess : styles.testResultError
                ]}
              >
                {serverTestResult.ok ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : (
                  <AlertTriangle size={16} color="#dc2626" />
                )}
                <Text
                  style={[
                    styles.testResultText,
                    serverTestResult.ok ? styles.testResultTextSuccess : styles.testResultTextError
                  ]}
                >
                  {serverTestResult.mensaje}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnTestServer}
                onPress={handleTestServer}
                disabled={testingServer}
                activeOpacity={0.8}
              >
                {testingServer ? (
                  <ActivityIndicator size="small" color="#0284c7" />
                ) : (
                  <Text style={styles.btnTestServerText}>Probar Conexión</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSaveServer}
                onPress={handleSaveServer}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSaveServerText}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnResetServer}
              onPress={handleResetServer}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color={COLORS.textMuted} />
              <Text style={styles.btnResetServerText}>Restablecer Servidor Oficial</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};
