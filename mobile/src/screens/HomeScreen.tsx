import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Wifi,
  WifiOff,
  CloudSun,
  Wind,
  Droplets,
  RotateCcw,
  Navigation,
  Crosshair,
  Bell,
  Award,
  Scan,
  Compass,
  ArrowRight
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { fetchFwiActual, fetchAlertasUsuario, FwiActualResponse, AlertaItem } from '../services/api';
import { WillAiLogo } from '../components/WillAiLogo';
import { SatelliteSyncBadge } from '../components/SatelliteSyncBadge';

interface HomeScreenProps {
  onNavigateToReport: () => void;
  onNavigateToMap: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToProfile: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToReport,
  onNavigateToMap,
  onNavigateToAlerts,
  onNavigateToProfile
}) => {
  const { t, idioma, setIdioma } = useTranslation();
  const { usuario, token, rolActivo } = useAuthStore();
  const { isOnline, pendingCount, syncing, forzarSync } = useNetworkSync();

  const [fwiData, setFwiData] = useState<FwiActualResponse | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const fwi = await fetchFwiActual();
      if (fwi) setFwiData(fwi);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [token]);

  const onRefresh = () => {
    setRefrescando(true);
    forzarSync();
    cargarDatos();
  };

  const peligroColor =
    fwiData?.nivel_peligro === 'CRITICO'
      ? COLORS.dangerCritical
      : fwiData?.nivel_peligro === 'ALTO'
      ? COLORS.dangerHigh
      : fwiData?.nivel_peligro === 'MODERADO'
      ? COLORS.dangerModerate
      : COLORS.dangerLow;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor={COLORS.firePrimary} />}
    >
      {/* 1. Header con Identidad Vectorial y Píldora Satelital */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <WillAiLogo size={38} />
          <View>
            <Text style={styles.headerTitle}>{t('app_name')}</Text>
            <Text style={styles.headerSubtitle}>{t('app_subtitle')}</Text>
          </View>
        </View>

        {/* Selector ES / QU */}
        <View style={styles.langSelector}>
          <TouchableOpacity
            style={[styles.langBtn, idioma === 'es' && styles.langBtnActive]}
            onPress={() => setIdioma('es', token)}
            activeOpacity={0.7}
          >
            <Text style={[styles.langBtnText, idioma === 'es' && styles.langBtnTextActive]}>ES</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, idioma === 'qu' && styles.langBtnActive]}
            onPress={() => setIdioma('qu', token)}
            activeOpacity={0.7}
          >
            <Text style={[styles.langBtnText, idioma === 'qu' && styles.langBtnTextActive]}>QU</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Barra de Sincronización Satelital Copernicus & NASA FIRMS */}
      <View style={styles.satelliteRow}>
        <SatelliteSyncBadge />

        <View style={styles.statusLeft}>
          {isOnline ? (
            <Wifi size={14} color={COLORS.emerald} />
          ) : (
            <WifiOff size={14} color={COLORS.fireAmber} />
          )}
          <Text style={[styles.statusText, { color: isOnline ? COLORS.emerald : COLORS.fireAmber }]}>
            {isOnline ? 'Online 4G' : 'Offline SQLite'}
          </Text>
        </View>
      </View>

      {/* Si hay reportes pendientes offline, botón de forzar sync */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={forzarSync} activeOpacity={0.75}>
          <RotateCcw size={14} color="#ffffff" />
          <Text style={styles.pendingBannerText}>
            {syncing ? t('syncing_now') : t('pending_reports_counter', { count: pendingCount })} (Toca para sincronizar)
          </Text>
        </TouchableOpacity>
      )}

      {/* 3. BOTÓN PRINCIPAL DE EMERGENCIA: WILLAI VISION SCAN */}
      <TouchableOpacity style={styles.btnEmergency} onPress={onNavigateToReport} activeOpacity={0.88}>
        <View style={styles.emergencyInner}>
          <View style={styles.emergencyIconCircle}>
            <Scan size={30} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>{t('btn_report_fire')}</Text>
            <Text style={styles.emergencySubtitle}>{t('btn_report_subtitle')}</Text>
          </View>
          <ArrowRight size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* 4. ACCESO RÁPIDO A MÓDULOS OPERATIVOS */}
      <View style={styles.quickModulesGrid}>
        {/* Módulo Mapa en Vivo */}
        <TouchableOpacity style={styles.quickModuleCard} onPress={onNavigateToMap} activeOpacity={0.8}>
          <View style={[styles.quickModuleIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Flame size={20} color="#ef4444" />
          </View>
          <Text style={styles.quickModuleTitle}>Mapa de Focos</Text>
          <Text style={styles.quickModuleSub}>Propagación Viento</Text>
        </TouchableOpacity>

        {/* Módulo Centro de Alertas */}
        <TouchableOpacity style={styles.quickModuleCard} onPress={onNavigateToAlerts} activeOpacity={0.8}>
          <View style={[styles.quickModuleIconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
            <Bell size={20} color="#38bdf8" />
          </View>
          <Text style={styles.quickModuleTitle}>Alertas Roja</Text>
          <Text style={styles.quickModuleSub}>Georadar y Socorro</Text>
        </TouchableOpacity>

        {/* Módulo Perfil & Insignias */}
        <TouchableOpacity style={styles.quickModuleCard} onPress={onNavigateToProfile} activeOpacity={0.8}>
          <View style={[styles.quickModuleIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Award size={20} color="#f59e0b" />
          </View>
          <Text style={styles.quickModuleTitle}>Insignias</Text>
          <Text style={styles.quickModuleSub}>Telemetría 48 ha</Text>
        </TouchableOpacity>
      </View>

      {/* 5. NORMA DE SEGURIDAD ANDINA */}
      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <AlertTriangle size={18} color="#ef4444" />
          <Text style={styles.safetyTitle}>{t('safety_title')}</Text>
        </View>
        <Text style={styles.safetyHighlight}>{t('do_not_climb')}</Text>
        <Text style={styles.safetyDesc}>{t('do_not_climb_desc')}</Text>
      </View>

      {/* 6. TARJETA DE PELIGRO CANADIENSE FWI */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CloudSun size={18} color="#fb923c" />
            <Text style={styles.cardTitle}>{t('fwi_title')}</Text>
          </View>
          <Text style={styles.cardHeaderSubtitle}>{t('fwi_level')}</Text>
        </View>

        {cargando && !fwiData ? (
          <ActivityIndicator color={COLORS.firePrimary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={[styles.fwiBadge, { borderColor: peligroColor, backgroundColor: `${peligroColor}15` }]}>
              <Text style={[styles.fwiNivelText, { color: peligroColor }]}>
                {fwiData?.nivel_peligro || 'CRÍTICO / EXTREMO'}
              </Text>
              <Text style={styles.fwiScoreText}>FWI {fwiData?.fwi?.toFixed(1) ?? '68.4'} • Pajonal Altoandino</Text>
            </View>

            <View style={styles.meteoGrid}>
              <View style={styles.meteoItem}>
                <Text style={styles.meteoLabel}>{t('temp')}</Text>
                <Text style={styles.meteoValue}>{fwiData?.temperatura?.toFixed(1) ?? '17.8'} °C</Text>
              </View>
              <View style={styles.meteoItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Wind size={13} color={COLORS.textSecondary} />
                  <Text style={styles.meteoLabel}>{t('wind')}</Text>
                </View>
                <Text style={styles.meteoValue}>
                  {fwiData?.velocidad_viento?.toFixed(0) ?? '24'} km/h {fwiData?.direccion_viento ?? 'SO'}
                </Text>
              </View>
              <View style={styles.meteoItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Droplets size={13} color={COLORS.textSecondary} />
                  <Text style={styles.meteoLabel}>{t('humidity')}</Text>
                </View>
                <Text style={styles.meteoValue}>{fwiData?.humedad_relativa?.toFixed(0) ?? '22'} %</Text>
              </View>
            </View>
          </>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  langBtnTextActive: {
    color: '#ffffff',
  },
  satelliteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d97706',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  pendingBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnEmergency: {
    backgroundColor: '#b91c1c',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    elevation: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emergencyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emergencyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  emergencySubtitle: {
    fontSize: 11,
    color: '#fecaca',
    marginTop: 2,
  },
  quickModulesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickModuleCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  quickModuleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickModuleTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  quickModuleSub: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  safetyTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#f87171',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  safetyHighlight: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  safetyDesc: {
    fontSize: 11.5,
    color: '#cbd5e1',
    lineHeight: 16.5,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardHeaderSubtitle: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fwiBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  fwiNivelText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fwiScoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  meteoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 10,
  },
  meteoItem: {
    alignItems: 'center',
  },
  meteoLabel: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  meteoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
