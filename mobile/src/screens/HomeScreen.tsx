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
  CheckCircle2,
  Clock,
  Compass
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { fetchFwiActual, fetchAlertasUsuario, confirmarAlertaApi, FwiActualResponse, AlertaItem } from '../services/api';

interface HomeScreenProps {
  onNavigateToReport: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToReport }) => {
  const { t, idioma, setIdioma } = useTranslation();
  const { usuario, token, rolActivo } = useAuthStore();
  const { isOnline, pendingCount, syncing, forzarSync } = useNetworkSync();

  const [fwiData, setFwiData] = useState<FwiActualResponse | null>(null);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [fwi, alt] = await Promise.all([
        fetchFwiActual(),
        fetchAlertasUsuario(token)
      ]);
      if (fwi) setFwiData(fwi);
      if (alt) setAlertas(alt);
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

  const handleConfirmarAlerta = async (idAlerta: number) => {
    const ok = await confirmarAlertaApi(idAlerta, token);
    if (ok) {
      setAlertas((prev) =>
        prev.map((a) =>
          a.alerta.id_alerta === idAlerta ? { ...a, estado_entrega: 'confirmado', leido_en: new Date().toISOString() } : a
        )
      );
    }
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
      {/* 1. Header con Branding y Selector ES/QU */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerIconBox}>
            <Flame size={24} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('app_name')}</Text>
            <Text style={styles.headerSubtitle}>{t('app_subtitle')}</Text>
          </View>
        </View>

        {/* Selector visible ES / QU en la cabecera */}
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

      {/* 2. Barra de Estado de Conexión + Contador Offline */}
      <View style={[styles.statusBar, isOnline ? styles.statusBarOnline : styles.statusBarOffline]}>
        <View style={styles.statusLeft}>
          {isOnline ? (
            <Wifi size={16} color={COLORS.emerald} />
          ) : (
            <WifiOff size={16} color={COLORS.fireAmber} />
          )}
          <Text style={[styles.statusText, { color: isOnline ? COLORS.emerald : COLORS.fireAmber }]}>
            {isOnline ? t('status_online') : t('status_offline')}
          </Text>
        </View>

        {pendingCount > 0 && (
          <TouchableOpacity style={styles.pendingBadge} onPress={forzarSync} activeOpacity={0.7}>
            <RotateCcw size={13} color="#ffffff" />
            <Text style={styles.pendingBadgeText}>
              {syncing ? t('syncing_now') : t('pending_reports_counter', { count: pendingCount })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Botón Gigante de Emergencia: REPORTAR INCENDIO */}
      <TouchableOpacity style={styles.btnEmergency} onPress={onNavigateToReport} activeOpacity={0.85}>
        <View style={styles.emergencyInner}>
          <View style={styles.emergencyIconCircle}>
            <Flame size={32} color="#ffffff" />
          </View>
          <View style={styles.emergencyTextContainer}>
            <Text style={styles.emergencyTitle}>{t('btn_report_fire')}</Text>
            <Text style={styles.emergencySubtitle}>{t('btn_report_subtitle')}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 4. Tarjeta Crítica de Seguridad Andina en Quechua y Español */}
      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <AlertTriangle size={18} color="#ef4444" />
          <Text style={styles.safetyTitle}>{t('safety_title')}</Text>
        </View>
        <Text style={styles.safetyHighlight}>{t('do_not_climb')}</Text>
        <Text style={styles.safetyDesc}>{t('do_not_climb_desc')}</Text>
      </View>

      {/* 5. Tarjeta de Peligro Canadiense FWI */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
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
                {fwiData?.nivel_peligro || 'MODERADO'}
              </Text>
              <Text style={styles.fwiScoreText}>FWI {fwiData?.fwi?.toFixed(1) ?? '18.4'}</Text>
            </View>

            <View style={styles.meteoGrid}>
              <View style={styles.meteoItem}>
                <Text style={styles.meteoLabel}>{t('temp')}</Text>
                <Text style={styles.meteoValue}>{fwiData?.temperatura?.toFixed(1) ?? '16.5'} °C</Text>
              </View>
              <View style={styles.meteoItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Wind size={13} color={COLORS.textSecondary} />
                  <Text style={styles.meteoLabel}>{t('wind')}</Text>
                </View>
                <Text style={styles.meteoValue}>
                  {fwiData?.velocidad_viento?.toFixed(0) ?? '22'} km/h {fwiData?.direccion_viento ?? 'SO'}
                </Text>
              </View>
              <View style={styles.meteoItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Droplets size={13} color={COLORS.textSecondary} />
                  <Text style={styles.meteoLabel}>{t('humidity')}</Text>
                </View>
                <Text style={styles.meteoValue}>{fwiData?.humedad_relativa?.toFixed(0) ?? '28'} %</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* 6. Lista de Alertas Recientes con Certeza y Adaptación por Rol */}
      <View style={styles.alertsSection}>
        <Text style={styles.sectionTitle}>{t('alerts_title')}</Text>

        {alertas.length === 0 ? (
          <View style={styles.alertsEmptyCard}>
            <ShieldCheck size={28} color={COLORS.emerald} />
            <Text style={styles.alertsEmptyText}>{t('alerts_empty')}</Text>
          </View>
        ) : (
          alertas.map((item, idx) => {
            const esLeido = item.estado_entrega === 'confirmado' || Boolean(item.leido_en);
            const esCritica = item.alerta?.prioridad === 'critica' || item.alerta?.prioridad === 'alta';

            return (
              <View key={item.alerta?.id_alerta || idx} style={[styles.alertCard, esCritica && styles.alertCardCritical]}>
                {/* Cabecera de Alerta: Certeza del Operador y Rol */}
                <View style={styles.alertHeaderRow}>
                  <View style={styles.certaintyBadge}>
                    <Text style={styles.certaintyBadgeText}>
                      {item.certeza_operador === 'confirmado_operador'
                        ? t('operator_verified')
                        : t('satellite_auto')}
                    </Text>
                  </View>

                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {rolActivo === 'brigadista' ? t('role_brigadista') : t('role_comunero')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.alertTitleText}>{item.alerta?.titulo}</Text>
                <Text style={styles.alertMessageText}>{item.alerta?.mensaje}</Text>

                {/* Instrucciones específicas por rol */}
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsText}>
                    {rolActivo === 'brigadista' ? t('instructions_brigadista') : t('instructions_comunero')}
                  </Text>
                </View>

                {/* Botón de Confirmación de Lectura */}
                <View style={styles.alertFooter}>
                  <View style={styles.alertDateRow}>
                    <Clock size={12} color={COLORS.textMuted} />
                    <Text style={styles.alertDateText}>{item.alerta?.emitida_en?.slice(0, 16) || 'Reciente'}</Text>
                  </View>

                  {esLeido ? (
                    <View style={styles.confirmedBadge}>
                      <CheckCircle2 size={13} color={COLORS.emerald} />
                      <Text style={styles.confirmedText}>{t('alert_read')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => handleConfirmarAlerta(item.alerta?.id_alerta)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.confirmBtnText}>{t('confirm_read')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.firePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff'
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary
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
    paddingVertical: 7,
    paddingHorizontal: 11
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1
  },
  statusBarOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  statusBarOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.fireAmber,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  btnEmergency: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    elevation: 6
  },
  emergencyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  emergencyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emergencyTextContainer: {
    flex: 1
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5
  },
  emergencySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2
  },
  safetyCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f87171',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  safetyHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4
  },
  safetyDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16
  },
  cardHeader: {
    marginBottom: 12
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2
  },
  fwiBadge: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  fwiNivelText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1
  },
  fwiScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2
  },
  meteoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 10
  },
  meteoItem: {
    alignItems: 'center'
  },
  meteoLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2
  },
  meteoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff'
  },
  alertsSection: {
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12
  },
  alertsEmptyCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    gap: 8
  },
  alertsEmptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  alertCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12
  },
  alertCardCritical: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  certaintyBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  certaintyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8'
  },
  roleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fbbf24'
  },
  alertTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4
  },
  alertMessageText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginBottom: 8
  },
  instructionsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.fireAmber,
    padding: 8,
    borderRadius: 4,
    marginBottom: 10
  },
  instructionsText: {
    fontSize: 11,
    color: '#e2e8f0',
    lineHeight: 16
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 8
  },
  alertDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  alertDateText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.emerald
  },
  confirmBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  confirmBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  }
});

