import React, { useState } from 'react';
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
import {
  User,
  Phone,
  Lock,
  MapPin,
  Shield,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Mail
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { WillAiLogo } from '../components/WillAiLogo';
import { styles } from './RegisterScreen.styles';

interface RegisterScreenProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onEmergencyReport: () => void;
}

const COMUNIDADES_PARINACOCHAS = [
  'Coracora Centro',
  'Huaccana',
  'Paucaray',
  'Chumpi',
  'Pullo',
  'Puyusca',
  'Upahuacho',
  'Ravacayco',
  'Pacapausa',
  'Secce'
];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSuccess,
  onGoToLogin,
  onEmergencyReport
}) => {
  const { t, idioma, setIdioma } = useTranslation();
  const registro = useAuthStore((s) => s.registro);

  const [rolSeleccionado, setRolSeleccionado] = useState<'poblador' | 'brigadista'>('poblador');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [community, setCommunity] = useState(COMUNIDADES_PARINACOCHAS[0]);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    // Validaciones locales rápidas
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg(idioma === 'qu' ? 'Sutikita churay.' : 'Por favor ingresa tus nombres y apellidos.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg(idioma === 'qu' ? 'Yaykuna sutita churay.' : 'Por favor ingresa un nombre de usuario.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(idioma === 'qu' ? 'Telefonoykita churay.' : 'Por favor ingresa tu número de teléfono.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg(idioma === 'qu' ? 'Pakasqa simi 6 qillqamanta aswan kanan.' : 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg(idioma === 'qu' ? 'Pakasqa simikuna manam tupanachu.' : 'Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      const nombreVisible = `${firstName.trim()} ${lastName.trim()}`;
      await registro({
        username: username.trim().toLowerCase(),
        password,
        password_confirm: passwordConfirm,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nombre_visible: nombreVisible,
        email: email.trim() || undefined,
        telefono: phone.trim(),
        idioma_preferido: idioma
      });

      Alert.alert(
        idioma === 'qu' ? '¡Allinmi!' : '¡Perfil Creado!',
        idioma === 'qu'
          ? `Allin chaskisqa ${nombreVisible}. WillAi llikaman yaykuykiña.`
          : `Bienvenido/a ${nombreVisible}. Tu cuenta comunal ha sido registrada exitosamente.`
      );
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear el perfil. Por favor intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cabecera con selector ES/QU */}
        <View style={styles.headerRow}>
          <WillAiLogo size={36} showText={true} />

          <View style={styles.langSelector}>
            <TouchableOpacity
              style={[styles.langBtn, idioma === 'es' && styles.langBtnActive]}
              onPress={() => setIdioma('es')}
            >
              <Text style={[styles.langText, idioma === 'es' && styles.langTextActive]}>ES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, idioma === 'qu' && styles.langBtnActive]}
              onPress={() => setIdioma('qu')}
            >
              <Text style={[styles.langText, idioma === 'qu' && styles.langTextActive]}>QU</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjeta Principal de Registro */}
        <View style={styles.card}>
          <Text style={styles.title}>{t('register_title')}</Text>
          <Text style={styles.subtitle}>{t('register_subtitle')}</Text>

          {/* Selector de Rol */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleBtn, rolSeleccionado === 'poblador' && styles.roleBtnActive]}
              onPress={() => setRolSeleccionado('poblador')}
              activeOpacity={0.8}
            >
              <User size={16} color={rolSeleccionado === 'poblador' ? '#ffffff' : COLORS.textSecondary} />
              <Text style={[styles.roleBtnText, rolSeleccionado === 'poblador' && styles.roleBtnTextActive]}>
                {t('role_poblador')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, rolSeleccionado === 'brigadista' && styles.roleBtnActive]}
              onPress={() => setRolSeleccionado('brigadista')}
              activeOpacity={0.8}
            >
              <Shield size={16} color={rolSeleccionado === 'brigadista' ? '#ffffff' : COLORS.textSecondary} />
              <Text style={[styles.roleBtnText, rolSeleccionado === 'brigadista' && styles.roleBtnTextActive]}>
                {t('role_brigadista')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mensaje de Error si ocurre */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <AlertTriangle size={16} color="#dc2626" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Campos del Formulario */}
          <View style={styles.form}>
            {/* Nombres y Apellidos en fila */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('field_first_name')} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Juan"
                  placeholderTextColor={COLORS.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>{t('field_last_name')} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Quispe"
                  placeholderTextColor={COLORS.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            {/* Usuario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_username')} *</Text>
              <View style={styles.inputWithIcon}>
                <User size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputIconText}
                  placeholder="Ej: juan_quispe"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            {/* Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_phone')} *</Text>
              <View style={styles.inputWithIcon}>
                <Phone size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputIconText}
                  placeholder="Ej: 966123456"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            {/* Correo Opcional */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_email')}</Text>
              <View style={styles.inputWithIcon}>
                <Mail size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputIconText}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Comunidad / Sector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_community')} *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {COMUNIDADES_PARINACOCHAS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, community === c && styles.chipActive]}
                    onPress={() => setCommunity(c)}
                  >
                    <MapPin size={12} color={community === c ? '#ffffff' : COLORS.textSecondary} />
                    <Text style={[styles.chipText, community === c && styles.chipTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_password')} *</Text>
              <View style={styles.inputWithIcon}>
                <Lock size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputIconText}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Confirmar Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('field_password_confirm')} *</Text>
              <View style={styles.inputWithIcon}>
                <Lock size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputIconText}
                  placeholder="Repite la contraseña"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                />
              </View>
            </View>

            {/* Botón Principal de Envío */}
            <TouchableOpacity
              style={[styles.btnSubmit, cargando && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={cargando}
              activeOpacity={0.88}
            >
              {cargando ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnSubmitText}>{t('btn_create_account')}</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            {/* Enlace para volver al Login */}
            <TouchableOpacity style={styles.linkBtn} onPress={onGoToLogin}>
              <Text style={styles.linkText}>{t('btn_go_to_login')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Acceso de emergencia sin registro */}
        <TouchableOpacity
          style={styles.btnEmergency}
          onPress={onEmergencyReport}
          activeOpacity={0.85}
        >
          <Flame size={18} color="#dc2626" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.emergencyText}>Reportar fuego sin registrarse</Text>
            <Text style={styles.emergencySub}>Cualquier comunero puede avisar de inmediato con GPS</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
