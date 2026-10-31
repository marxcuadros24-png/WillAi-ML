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
  Alert
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Flame,
  Lock,
  User,
  Fingerprint,
  Shield,
  ArrowRight,
  Map as MapIcon
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
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

  const [rolSeleccionado, setRolSeleccionado] = useState<'brigadista' | 'poblador'>('brigadista');
  const [username, setUsername] = useState<string>('brigada_b12');
  const [password, setPassword] = useState<string>('coracora2026');
  const [cargando, setCargando] = useState<boolean>(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then((hasHardware) => {
      if (hasHardware) {
        LocalAuthentication.isEnrolledAsync().then((isEnrolled) => {
          setBiometricAvailable(isEnrolled);
        });
      }
    });
  }, []);

  const handleSelectRol = (rol: 'brigadista' | 'poblador') => {
    setRolSeleccionado(rol);
    if (rol === 'brigadista') {
      setUsername('brigada_b12');
      setPassword('coracora2026');
    } else {
      setUsername('comunero_huaccana');
      setPassword('coracora2026');
    }
  };

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
        setCargando(true);
        await login('brigada_b12', 'coracora2026');
        onSuccess();
      }
    } catch {
      // Ignorar cancelación
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleAuth = () => {
    Alert.alert(
      'Google',
      idioma === 'qu'
        ? 'Googlewan yaykuyqa allinllañam kachkan.'
        : 'Acceso con cuenta de Google disponible.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Barra Superior con Selector Idioma */}
        <View style={styles.topBar}>
          <SatelliteSyncBadge />

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

        {/* 3. Selector de Rol */}
        <View style={styles.roleSelectorBox}>
          <TouchableOpacity
            style={[styles.roleTab, rolSeleccionado === 'brigadista' && styles.roleTabActive]}
            onPress={() => handleSelectRol('brigadista')}
            activeOpacity={0.8}
          >
            <Shield size={16} color={rolSeleccionado === 'brigadista' ? COLORS.firePrimary : COLORS.textMuted} />
            <Text style={[styles.roleTabText, rolSeleccionado === 'brigadista' && styles.roleTabTextActive]}>
              {idioma === 'qu' ? 'Bombero kani' : 'Soy Bombero'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, rolSeleccionado === 'poblador' && styles.roleTabActive]}
            onPress={() => handleSelectRol('poblador')}
            activeOpacity={0.8}
          >
            <User size={16} color={rolSeleccionado === 'poblador' ? COLORS.firePrimary : COLORS.textMuted} />
            <Text style={[styles.roleTabText, rolSeleccionado === 'poblador' && styles.roleTabTextActive]}>
              {idioma === 'qu' ? 'Comunero kani' : 'Soy Comunero'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Formulario de Inicio de Sesión */}
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
                placeholder="Ej: brigada_b12"
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

        {/* 5. Acceso con Huella Digital o Google */}
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
    </KeyboardAvoidingView>
  );
};
