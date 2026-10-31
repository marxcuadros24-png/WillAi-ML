import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration
} from 'react-native';
import Svg, { Rect, Path, G, Circle, Text as SvgText } from 'react-native-svg';
import {
  User,
  Shield,
  Award,
  TreePine,
  Wind,
  Home,
  QrCode,
  Volume2,
  VolumeX,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  Flame,
  Star
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';

export const ProfileScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const { usuario, logout, rolActivo } = useAuthStore();
  const [sirenaActiva, setSirenaActiva] = useState(false);

  // Nombre de perfil preferido o usuario logueado
  const nombreVisible = usuario?.nombre_visible || 'Sofía Valenzuela';
  const identificador = usuario?.username || 'sofia.valenzuela';
  const rangoActual = 'Guardián Rango IV — Halcón Andino';
  const puntosActuales = 1850;
  const puntosObjetivo = 2500;
  const progresoPorcentaje = Math.round((puntosActuales / puntosObjetivo) * 100);

  const INSIGNIAS_TACTICAS = [
    {
      id: 'ins-01',
      icono: '🥇',
      titulo: 'Primer Ojo',
      desc: 'Primer reporte de fuego confirmado por satélite',
      completado: true,
      fecha: '15/09/2026',
    },
    {
      id: 'ins-02',
      icono: '🛰️',
      titulo: 'Centinela Satelital',
      desc: '10 focos validados con NASA FIRMS (VIIRS)',
      completado: true,
      fecha: '28/09/2026',
    },
    {
      id: 'ins-03',
      icono: '🛡️',
      titulo: 'Guardián del Valle',
      desc: '3 patrullajes en cortafuegos de Huaccana',
      completado: true,
      fecha: '12/10/2026',
    },
    {
      id: 'ins-04',
      icono: '🏃',
      titulo: 'Héroe de Evacuación',
      desc: 'Asistencia y guiado en ruta segura a 5 familias',
      completado: true,
      fecha: '24/10/2026',
    },
    {
      id: 'ins-05',
      icono: '💧',
      titulo: 'Protector del Bofedal',
      desc: 'Resguardo de humedad en humedales andinos',
      completado: false,
      progreso: '60%',
    },
  ];

  const handleToggleSirena = () => {
    if (!sirenaActiva) {
      setSirenaActiva(true);
      Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
      Alert.alert(
        '🔔 Sirena Comunitaria de Alarma Activa',
        'Baliza sonora emitida para advertir a vecinos y comunidades aledañas sobre evacuación inmediata.',
        [
          {
            text: 'Detener Sirena',
            onPress: () => {
              Vibration.cancel();
              setSirenaActiva(false);
            },
          },
        ]
      );
    } else {
      Vibration.cancel();
      setSirenaActiva(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. TARJETA DE PERFIL Y RANGO DE GUARDIÁN */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>SV</Text>
            <View style={styles.verifiedTick}>
              <CheckCircle size={14} color="#ffffff" />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{nombreVisible}</Text>
            <Text style={styles.profileRole}>
              Guardabosques Voluntaria • Brigada Huaccana
            </Text>
            <Text style={styles.profileId}>ID: PE-AYAC-2026-0842</Text>
          </View>
        </View>

        {/* Nivel y Barra de Progreso hacia el siguiente rango */}
        <View style={styles.rankBox}>
          <View style={styles.rankHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Star size={14} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.rankTitle}>{rangoActual}</Text>
            </View>
            <Text style={styles.rankPercent}>{progresoPorcentaje}%</Text>
          </View>

          {/* Barra de Progreso */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progresoPorcentaje}%` }]} />
          </View>

          <Text style={styles.xpText}>
            {puntosActuales.toLocaleString()} / {puntosObjetivo.toLocaleString()} Puntos Cívicos WillAi
          </Text>
        </View>
      </View>

      {/* 2. TELEMETRÍA DE IMPACTO AMBIENTAL */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <TreePine size={16} color="#10b981" />
          <Text style={styles.sectionTitle}>{t('telemetry_title')}</Text>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: '#10b981' }]}>48.5 ha</Text>
            <Text style={styles.telemetryLabel}>Bosque Nativo e Ichu Resguardados</Text>
          </View>

          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: '#38bdf8' }]}>14,200 kg</Text>
            <Text style={styles.telemetryLabel}>CO₂ Evitado por Alerta Temprana</Text>
          </View>

          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: '#f59e0b' }]}>18</Text>
            <Text style={styles.telemetryLabel}>Viviendas Rurales con Cortafuegos</Text>
          </View>
        </View>
      </View>

      {/* 3. COLECCIÓN DE INSIGNIAS TÁCTICAS */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Award size={16} color="#fbbf24" />
          <Text style={styles.sectionTitle}>{t('badges_title')}</Text>
        </View>

        <View style={styles.badgesList}>
          {INSIGNIAS_TACTICAS.map((ins) => (
            <View
              key={ins.id}
              style={[styles.badgeCard, !ins.completado && styles.badgeCardLocked]}
            >
              <Text style={styles.badgeEmoji}>{ins.icono}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeTitleRow}>
                  <Text style={styles.badgeTitle}>{ins.titulo}</Text>
                  {ins.completado ? (
                    <Text style={styles.badgeDate}>{ins.fecha}</Text>
                  ) : (
                    <Text style={styles.badgeProgress}>{ins.progreso}</Text>
                  )}
                </View>
                <Text style={styles.badgeDesc}>{ins.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 4. CREDENCIAL DIGITAL OFICIAL VERIFICADA */}
      <View style={styles.credentialCard}>
        <View style={styles.credentialTop}>
          <View>
            <Text style={styles.credentialGovText}>GOBIERNO REGIONAL DE AYACUCHO</Text>
            <Text style={styles.credentialTitleText}>CREDENCIAL OPERATIVA OFICIAL</Text>
          </View>
          <View style={styles.serforSeal}>
            <Text style={styles.serforSealText}>SERFOR</Text>
          </View>
        </View>

        <View style={styles.credentialBody}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.credFieldLabel}>TITULAR AUTORIZADO:</Text>
            <Text style={styles.credFieldVal}>{nombreVisible}</Text>

            <Text style={styles.credFieldLabel}>ROL / BRIGADA:</Text>
            <Text style={styles.credFieldVal}>Guardabosques Comunal B-12</Text>

            <Text style={styles.credFieldLabel}>SELLO CRIPTOGRÁFICO:</Text>
            <Text style={styles.credShaText}>SHA-256: 8a7c4f19b2e0...89a2</Text>
          </View>

          {/* Código QR Táctico Vectorial */}
          <View style={styles.qrBox}>
            <Svg width="72" height="72" viewBox="0 0 100 100">
              <Rect width="100" height="100" fill="#ffffff" rx="8" />
              {/* Marcadores QR */}
              <Rect x="10" y="10" width="26" height="26" fill="#0f172a" rx="4" />
              <Rect x="16" y="16" width="14" height="14" fill="#ffffff" />
              <Rect x="20" y="20" width="6" height="6" fill="#0f172a" />

              <Rect x="64" y="10" width="26" height="26" fill="#0f172a" rx="4" />
              <Rect x="70" y="16" width="14" height="14" fill="#ffffff" />
              <Rect x="74" y="20" width="6" height="6" fill="#0f172a" />

              <Rect x="10" y="64" width="26" height="26" fill="#0f172a" rx="4" />
              <Rect x="16" y="70" width="14" height="14" fill="#ffffff" />
              <Rect x="20" y="74" width="6" height="6" fill="#0f172a" />

              {/* Patrones de datos simulados */}
              <Rect x="44" y="14" width="10" height="8" fill="#0f172a" />
              <Rect x="44" y="30" width="16" height="8" fill="#0f172a" />
              <Rect x="70" y="44" width="18" height="10" fill="#0f172a" />
              <Rect x="44" y="66" width="22" height="12" fill="#0f172a" />
              <Rect x="74" y="72" width="12" height="12" fill="#0f172a" />
            </Svg>
            <Text style={styles.qrScanText}>Escanear COEP</Text>
          </View>
        </View>
      </View>

      {/* 5. CONTROLES TÁCTICOS: SIRENA COMUNITARIA DE ALERTA */}
      <TouchableOpacity
        style={[styles.btnSiren, sirenaActiva && styles.btnSirenActive]}
        onPress={handleToggleSirena}
        activeOpacity={0.88}
      >
        {sirenaActiva ? <VolumeX size={20} color="#ffffff" /> : <Volume2 size={20} color="#ffffff" />}
        <Text style={styles.btnSirenText}>
          {sirenaActiva ? 'DETENER SIRENA COMUNAL' : t('btn_siren_alarm')}
        </Text>
      </TouchableOpacity>

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity style={styles.btnLogout} onPress={logout} activeOpacity={0.7}>
        <LogOut size={16} color="#94a3b8" />
        <Text style={styles.btnLogoutText}>Cerrar Sesión Operativa</Text>
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
  profileHeaderCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#047857',
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  verifiedTick: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileRole: {
    fontSize: 11.5,
    color: '#34d399',
    fontWeight: '700',
    marginTop: 2,
  },
  profileId: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rankBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rankHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#f8fafc',
  },
  rankPercent: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fbbf24',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  telemetryItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  telemetryVal: {
    fontSize: 14.5,
    fontWeight: '900',
    marginBottom: 4,
  },
  telemetryLabel: {
    fontSize: 9.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 13,
    fontWeight: '600',
  },
  badgesList: {
    gap: 8,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeCardLocked: {
    opacity: 0.55,
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  badgeDate: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
  },
  badgeProgress: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  credentialCard: {
    backgroundColor: '#0c1a2e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    padding: 16,
    marginBottom: 16,
    elevation: 6,
  },
  credentialTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 189, 248, 0.3)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  credentialGovText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.8,
  },
  credentialTitleText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  serforSeal: {
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  serforSealText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
  credentialBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  credFieldLabel: {
    fontSize: 8.5,
    color: '#94a3b8',
    fontWeight: '800',
  },
  credFieldVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  credShaText: {
    fontSize: 9,
    color: '#38bdf8',
    fontFamily: 'monospace',
  },
  qrBox: {
    alignItems: 'center',
    gap: 4,
  },
  qrScanText: {
    fontSize: 8.5,
    color: '#94a3b8',
    fontWeight: '700',
  },
  btnSiren: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnSirenActive: {
    backgroundColor: '#7f1d1d',
    borderColor: '#fca5a5',
  },
  btnSirenText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },
  btnLogoutText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
