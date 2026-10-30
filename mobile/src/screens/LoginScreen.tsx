import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Flame, Lock, User, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';

interface LoginScreenProps {
  onSuccess: () => void;
  onSkip: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onSkip }) => {
  const { t, idioma, setIdioma } = useTranslation();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg(err.message || 'Error al autenticar credenciales.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Selector ES / QU */}
        <View style={styles.topBar}>
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

        {/* Logo y Título */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBox}>
            <Flame size={36} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>{t('app_name')}</Text>
          <Text style={styles.brandSubtitle}>{t('app_subtitle')}</Text>
        </View>

        {/* Mensaje de Error */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Formulario */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{idioma === 'qu' ? 'Runa Suti (Usuario)' : 'Usuario'}</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.textInput}
                placeholder={idioma === 'qu' ? 'Usuario churay...' : 'Ingresa tu usuario...'}
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{idioma === 'qu' ? 'Pakasqa Simi (Contraseña)' : 'Contraseña'}</Text>
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
                  {idioma === 'qu' ? 'Yaykuy (Ingresar)' : 'Iniciar Sesión'}
                </Text>
                <ArrowRight size={16} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Continuar como Invitado / Ciudadano Anónimo */}
        <TouchableOpacity style={styles.btnSkip} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.btnSkipText}>
            {idioma === 'qu'
              ? 'Mana Qillqakuspa Yaykuy (Continuar sin cuenta)'
              : 'Continuar como Ciudadano Anónimo'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center'
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 20
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden'
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langBtnTextActive: {
    color: '#ffffff'
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: COLORS.firePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 8
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center'
  },
  formCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 18,
    gap: 16,
    marginBottom: 16
  },
  inputGroup: {
    gap: 6
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14
  },
  btnLogin: {
    backgroundColor: COLORS.firePrimary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnLoginDisabled: {
    opacity: 0.6
  },
  btnLoginText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800'
  },
  btnSkip: {
    padding: 12,
    alignItems: 'center'
  },
  btnSkipText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textDecorationLine: 'underline'
  }
});

