import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Vibration
} from 'react-native';
import {
  User,
  Shield,
  Award,
  Phone,
  MapPin,
  Edit3,
  CheckCircle2,
  Lock,
  Volume2,
  VolumeX,
  LogOut,
  Star,
  Check,
  X
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import {
  fetchInsigniasCatalogoApi,
  InsigniaItem
} from '../services/api';

const COMUNIDADES = [
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

export const ProfileScreen: React.FC = () => {
  const { t, idioma, setIdioma } = useTranslation();
  const { usuario, token, rolActivo, logout, actualizarPerfilRemoto } = useAuthStore();

  const [insignias, setInsignias] = useState<InsigniaItem[]>([]);
  const [cargandoInsignias, setCargandoInsignias] = useState(true);

  // Estados del Modal de Edición de Perfil
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [editNombre, setEditNombre] = useState(usuario?.nombre_visible || '');
  const [editTelefono, setEditTelefono] = useState(usuario?.telefono || '');
  const [editComunidad, setEditComunidad] = useState(usuario?.comunidad || COMUNIDADES[0]);
  const [editIdioma, setEditIdioma] = useState<'es' | 'qu'>(usuario?.idioma_preferido || idioma);

  // Sirena comunal
  const [sirenaActiva, setSirenaActiva] = useState(false);

  // Cargar catálogo de insignias desde el backend
  useEffect(() => {
    let activo = true;
    setCargandoInsignias(true);

    fetchInsigniasCatalogoApi()
      .then((data) => {
        if (!activo) return;
        if (data && data.length > 0) {
          setInsignias(data);
        } else {
          // Fallback a las 8 insignias oficiales de WillAI
          setInsignias([
            {
              id_insignia: 1,
              codigo: 'primer_aviso',
              nombre: 'Primer Aviso',
              descripcion: 'Enviaste una alerta temprana de incendio que fue verificada con éxito.',
              activa: true,
              criterio: { puntos: 50 }
            },
            {
              id_insignia: 2,
              codigo: 'guardian_bosque',
              nombre: 'Guardián del Bosque',
              descripcion: 'Participaste en labores activas de prevención comunal en pastizales.',
              activa: true,
              criterio: { puntos: 60 }
            },
            {
              id_insignia: 3,
              codigo: 'vigilante_comunal',
              nombre: 'Vigilante Comunal',
              descripcion: 'Verificador comunal destacado con múltiples inspecciones técnicas.',
              activa: true,
              criterio: { puntos: 80 }
            },
            {
              id_insignia: 4,
              codigo: 'comunidad_preparada',
              nombre: 'Comunidad Preparada',
              descripcion: 'Participaste en capacitaciones y simulacros de evacuación comunal.',
              activa: true,
              criterio: { puntos: 40 }
            },
            {
              id_insignia: 5,
              codigo: 'respuesta_rapida',
              nombre: 'Respuesta Rápida',
              descripcion: 'Acudiste en las primeras horas para contener un conato de incendio.',
              activa: true,
              criterio: { puntos: 90 }
            },
            {
              id_insignia: 6,
              codigo: 'ojo_halcon',
              nombre: 'Ojo de Halcón',
              descripcion: 'Reporte fotográfico y georreferenciación GPS de máxima precisión confirmada.',
              activa: true,
              criterio: { puntos: 70 }
            },
            {
              id_insignia: 7,
              codigo: 'solidario_comunal',
              nombre: 'Corazón Solidario',
              descripcion: 'Aportaste agua, herramientas de zapa o apoyo logístico a las brigadas.',
              activa: true,
              criterio: { puntos: 50 }
            },
            {
              id_insignia: 8,
              codigo: 'heroe_parinacochas',
              nombre: 'Héroe de Parinacochas',
              descripcion: 'Máxima condecoración por valentía protegiendo el territorio andino.',
              activa: true,
              criterio: { puntos: 150 }
            }
          ]);
        }
      })
      .finally(() => {
        if (activo) setCargandoInsignias(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  const abrirModalEditar = () => {
    setEditNombre(usuario?.nombre_visible || usuario?.username || '');
    setEditTelefono(usuario?.telefono || '');
    setEditComunidad(usuario?.comunidad || COMUNIDADES[0]);
    setEditIdioma(usuario?.idioma_preferido || idioma);
    setModalEditVisible(true);
  };

  const guardarCambiosPerfil = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Atención', 'Por favor ingresa un nombre visible.');
      return;
    }

    setGuardandoPerfil(true);
    try {
      if (token) {
        await actualizarPerfilRemoto({
          nombre_visible: editNombre.trim(),
          telefono: editTelefono.trim(),
          idioma_preferido: editIdioma
        });
      }

      // Si cambió el idioma, aplicarlo en el hook global
      if (editIdioma !== idioma) {
        setIdioma(editIdioma);
      }

      setModalEditVisible(false);
      Alert.alert(
        idioma === 'qu' ? '¡Allinmi!' : '¡Éxito!',
        t('profile_updated_success')
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.message || 'No se pudo guardar los cambios en el servidor. Revisa tu conexión.'
      );
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleToggleSirena = () => {
    if (!sirenaActiva) {
      setSirenaActiva(true);
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
      Alert.alert(
        '🔔 Sirena Comunitaria Activa',
        'Baliza sonora emitida para advertir a vecinos y brigadas cercanas.',
        [
          {
            text: 'Detener',
            onPress: () => {
              Vibration.cancel();
              setSirenaActiva(false);
            }
          }
        ]
      );
    } else {
      Vibration.cancel();
      setSirenaActiva(false);
    }
  };

  const nombreUsuario =
    usuario?.nombre_visible ||
    (usuario?.first_name ? `${usuario.first_name} ${usuario.last_name || ''}`.trim() : null) ||
    usuario?.username ||
    'Comunero WillAI';

  const rolTexto =
    rolActivo === 'brigadista'
      ? t('role_brigadista')
      : t('role_poblador');

  const iniciales = nombreUsuario
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'WA';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. TARJETA PRINCIPAL DEL PERFIL */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{iniciales}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{nombreUsuario}</Text>
            <View style={styles.badgeRolRow}>
              <Shield size={13} color={COLORS.firePrimary} />
              <Text style={styles.profileRol}>{rolTexto}</Text>
            </View>
            <Text style={styles.profileUsername}>@{usuario?.username || 'usuario'}</Text>
          </View>

          {/* Botón para editar perfil */}
          <TouchableOpacity
            style={styles.btnEditProfile}
            onPress={abrirModalEditar}
            activeOpacity={0.8}
          >
            <Edit3 size={16} color={COLORS.firePrimary} />
            <Text style={styles.btnEditProfileText}>{t('btn_edit_profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Datos de contacto y comunidad */}
        <View style={styles.contactInfoRow}>
          <View style={styles.contactItem}>
            <Phone size={14} color={COLORS.textSecondary} />
            <Text style={styles.contactValue}>
              {usuario?.telefono || 'Sin teléfono'}
            </Text>
          </View>

          <View style={styles.contactItem}>
            <MapPin size={14} color={COLORS.textSecondary} />
            <Text style={styles.contactValue}>
              {usuario?.comunidad || 'Coracora, Parinacochas'}
            </Text>
          </View>
        </View>

        {/* Resumen de Rango y Puntos */}
        <View style={styles.rankContainer}>
          <View style={styles.rankTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Star size={16} color="#d97706" fill="#d97706" />
              <Text style={styles.rankTitle}>Guardián Rango II • Halcón Andino</Text>
            </View>
            <Text style={styles.rankPuntos}>240 Puntos</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '68%' }]} />
          </View>
          <Text style={styles.rankHint}>
            Acumula puntos reportando conatos de incendio y apoyando a las brigadas
          </Text>
        </View>
      </View>

      {/* 2. SECCIÓN: MIS INSIGNIAS DE MÉRITO */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Award size={18} color="#d97706" />
          <Text style={styles.sectionTitle}>{t('my_badges_title')}</Text>
        </View>

        {cargandoInsignias ? (
          <ActivityIndicator color={COLORS.firePrimary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.badgesGrid}>
            {insignias.map((ins, index) => {
              // Primeras 3 insignias simuladas como desbloqueadas para el usuario activo
              const desbloqueada = index < 3;
              const puntos = ins.criterio?.puntos || 50;

              return (
                <View
                  key={ins.id_insignia || ins.codigo}
                  style={[
                    styles.badgeItem,
                    desbloqueada ? styles.badgeItemUnlocked : styles.badgeItemLocked
                  ]}
                >
                  <View style={styles.badgeTopRow}>
                    <View
                      style={[
                        styles.badgeIconCircle,
                        desbloqueada ? styles.iconUnlocked : styles.iconLocked
                      ]}
                    >
                      {desbloqueada ? (
                        <CheckCircle2 size={16} color="#059669" />
                      ) : (
                        <Lock size={14} color={COLORS.textMuted} />
                      )}
                    </View>

                    <Text style={styles.badgePoints}>+{puntos} pts</Text>
                  </View>

                  <Text
                    style={[
                      styles.badgeNombre,
                      !desbloqueada && { color: COLORS.textSecondary }
                    ]}
                  >
                    {ins.nombre}
                  </Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {ins.descripcion}
                  </Text>

                  <View style={styles.badgeStatusPill}>
                    <Text
                      style={[
                        styles.badgeStatusText,
                        desbloqueada ? { color: '#059669' } : { color: COLORS.textMuted }
                      ]}
                    >
                      {desbloqueada ? 'Desbloqueada' : 'Por desbloquear'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 3. CONTROL DE SIRENA COMUNITARIA */}
      <TouchableOpacity
        style={[styles.btnSiren, sirenaActiva && styles.btnSirenActive]}
        onPress={handleToggleSirena}
        activeOpacity={0.88}
      >
        {sirenaActiva ? <VolumeX size={18} color="#ffffff" /> : <Volume2 size={18} color="#ffffff" />}
        <Text style={styles.btnSirenText}>
          {sirenaActiva ? 'DETENER SIRENA COMUNAL' : t('btn_siren_alarm')}
        </Text>
      </TouchableOpacity>

      {/* 4. CERRAR SESIÓN */}
      <TouchableOpacity style={styles.btnLogout} onPress={logout} activeOpacity={0.8}>
        <LogOut size={16} color="#dc2626" />
        <Text style={styles.btnLogoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* MODAL PARA EDITAR PERFIL */}
      <Modal
        visible={modalEditVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('btn_edit_profile')}</Text>
              <TouchableOpacity onPress={() => setModalEditVisible(false)}>
                <X size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Nombre Visible */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('field_first_name')} y Apellidos</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholder="Tu nombre completo"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* Teléfono */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('field_phone')}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editTelefono}
                  onChangeText={setEditTelefono}
                  placeholder="Ej: 966123456"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Comunidad o Sector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('field_community')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {COMUNIDADES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chipModal, editComunidad === c && styles.chipModalActive]}
                      onPress={() => setEditComunidad(c)}
                    >
                      <Text style={[styles.chipModalText, editComunidad === c && styles.chipModalTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Idioma de Preferencia */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Idioma de la Aplicación</Text>
                <View style={styles.langModalRow}>
                  <TouchableOpacity
                    style={[styles.langModalBtn, editIdioma === 'es' && styles.langModalBtnActive]}
                    onPress={() => setEditIdioma('es')}
                  >
                    <Text style={[styles.langModalText, editIdioma === 'es' && styles.langModalTextActive]}>
                      Español (ES)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langModalBtn, editIdioma === 'qu' && styles.langModalBtnActive]}
                    onPress={() => setEditIdioma('qu')}
                  >
                    <Text style={[styles.langModalText, editIdioma === 'qu' && styles.langModalTextActive]}>
                      Quechua Chanka (QU)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancelModal}
                onPress={() => setModalEditVisible(false)}
              >
                <Text style={styles.btnCancelModalText}>{t('btn_cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSaveModal, guardandoPerfil && { opacity: 0.7 }]}
                onPress={guardarCambiosPerfil}
                disabled={guardandoPerfil}
              >
                {guardandoPerfil ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" />
                    <Text style={styles.btnSaveModalText}>{t('btn_save_changes')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  badgeRolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  profileRol: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  profileUsername: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  btnEditProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  btnEditProfileText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  rankContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a'
  },
  rankTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  rankTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400e'
  },
  rankPuntos: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: 3
  },
  rankHint: {
    fontSize: 10.5,
    color: '#78350f',
    lineHeight: 14
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  badgeItem: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1
  },
  badgeItemUnlocked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0'
  },
  badgeItemLocked: {
    backgroundColor: '#f8fafc',
    borderColor: COLORS.borderSubtle
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  badgeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconUnlocked: {
    backgroundColor: '#dcfce7'
  },
  iconLocked: {
    backgroundColor: '#e2e8f0'
  },
  badgePoints: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706'
  },
  badgeNombre: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3
  },
  badgeDesc: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    lineHeight: 14,
    marginBottom: 8
  },
  badgeStatusPill: {
    alignSelf: 'flex-start'
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  btnSiren: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12
  },
  btnSirenActive: {
    backgroundColor: '#991b1b'
  },
  btnSirenText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10
  },
  btnLogoutText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  modalBody: {
    maxHeight: 340
  },
  inputGroup: {
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary
  },
  chipModal: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginRight: 6
  },
  chipModalActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  chipModalText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  chipModalTextActive: {
    color: '#ffffff'
  },
  langModalRow: {
    flexDirection: 'row',
    gap: 8
  },
  langModalBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  langModalBtnActive: {
    backgroundColor: COLORS.firePrimary,
    borderColor: COLORS.firePrimary
  },
  langModalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langModalTextActive: {
    color: '#ffffff'
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle
  },
  btnCancelModal: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9'
  },
  btnCancelModalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  btnSaveModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.firePrimary
  },
  btnSaveModalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff'
  }
});
