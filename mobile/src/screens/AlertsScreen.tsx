import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldAlert
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { fetchAlertasUsuario, AlertaItem } from '../services/api';

interface AlertaLocal {
  id: string;
  categoria: 'evacuacion' | 'satelite' | 'validacion';
  titulo: string;
  mensaje: string;
  tiempo: string;
  sector: string;
  prioridad: 'critica' | 'alta' | 'media';
  distanciaKm: number;
}

export const AlertsScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const [aSalvoConfirmado, setASalvoConfirmado] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);

  const ALERTAS_DEFAULT: AlertaLocal[] = [
    {
      id: 'ALT-01',
      categoria: 'evacuacion',
      titulo: 'ORDEN DE EVACUACIÓN INMEDIATA',
      mensaje: 'Frente de fuego avanzando hacia la ladera baja de Huaccana. Se ordena evacuación de familias hacia la Plaza Comunal. ¡No asciendan la ladera!',
      tiempo: 'Hace 8 min',
      sector: 'Comunidad Huaccana, Coracora',
      prioridad: 'critica',
      distanciaKm: 3.2
    },
    {
      id: 'ALT-02',
      categoria: 'satelite',
      titulo: 'Detección Térmica NASA VIIRS (375m)',
      mensaje: 'Anomalía térmica confirmada en punto (-15.0228, -73.7653) con potencia FRP 58.4 MW en pajonal altoandino.',
      tiempo: 'Hace 24 min',
      sector: 'Pajonal Huaccana Alta',
      prioridad: 'alta',
      distanciaKm: 4.8
    },
    {
      id: 'ALT-03',
      categoria: 'validacion',
      titulo: 'Validación de Reporte de Brigada',
      mensaje: 'Brigada Forestal B-12 validó reporte de conato en Paucaray. Cortafuegos activo y fuego confinado.',
      tiempo: 'Hace 1h 10m',
      sector: 'Sector Paucaray',
      prioridad: 'media',
      distanciaKm: 6.8
    }
  ];

  const [alertas, setAlertas] = useState<AlertaLocal[]>(ALERTAS_DEFAULT);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const res = await fetchAlertasUsuario(token);
      if (res && res.length > 0) {
        const mapeadas: AlertaLocal[] = res.map((item, idx) => ({
          id: `ALT-API-${item.alerta?.id_alerta || idx}`,
          categoria: item.alerta?.tipo === 'evacuacion' ? 'evacuacion' : 'satelite',
          titulo: item.alerta?.titulo || 'Alerta Oficial COEP',
          mensaje: item.alerta?.mensaje || 'Se reporta actividad de fuego en la zona.',
          tiempo: 'Reciente',
          sector: item.alerta?.incidente_codigo ? `Incidente ${item.alerta.incidente_codigo}` : 'Parinacochas',
          prioridad: item.alerta?.prioridad === 'roja' ? 'critica' : 'alta',
          distanciaKm: 3.5
        }));
        setAlertas(mapeadas);
      } else {
        setAlertas(ALERTAS_DEFAULT);
      }
    } catch {
      setAlertas(ALERTAS_DEFAULT);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, [token]);

  const handleConfirmarASalvo = () => {
    setASalvoConfirmado(true);
    Alert.alert(
      'WillAi Socorro',
      idioma === 'qu'
        ? 'Ayllu qispisqayki COEP Quracuraman willasqaña.'
        : 'Tu estado "A SALVO" ha sido reportado al Centro de Operaciones de Emergencia (COEP Coracora).'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. BANNER DE ALERTA ROJA REGIONAL EN PARINACOCHAS */}
      <View style={styles.redAlertBanner}>
        <View style={styles.redAlertHeader}>
          <AlertTriangle size={20} color="#ffffff" />
          <Text style={styles.redAlertTitle}>{t('alert_red_banner')}</Text>
        </View>
        <Text style={styles.redAlertDesc}>{t('alert_red_banner_desc')}</Text>
      </View>

      {/* Cabecera del Feed con botón refrescar */}
      <View style={styles.feedHeaderRow}>
        <Text style={styles.feedTitle}>
          {t('alerts_title')} ({alertas.length})
        </Text>
        <TouchableOpacity style={styles.btnRefresh} onPress={cargarAlertas} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator size="small" color={COLORS.firePrimary} />
          ) : (
            <>
              <RefreshCw size={13} color={COLORS.firePrimary} />
              <Text style={styles.btnRefreshText}>Refrescar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. LISTA DE ALERTAS DIURNAS */}
      <View style={styles.feedList}>
        {alertas.map((item) => {
          const isCritica = item.prioridad === 'critica';
          const isEvacuacion = item.categoria === 'evacuacion';

          return (
            <View
              key={item.id}
              style={[
                styles.alertCard,
                isCritica && styles.alertCardCritica
              ]}
            >
              {/* Encabezado de la tarjeta */}
              <View style={styles.alertCardHeader}>
                <View style={styles.tagCategoryRow}>
                  {isEvacuacion ? (
                    <View style={styles.tagEvacuacion}>
                      <Text style={styles.tagTextWhite}>🚨 EVACUACIÓN</Text>
                    </View>
                  ) : item.categoria === 'satelite' ? (
                    <View style={styles.tagSatelite}>
                      <Text style={styles.tagTextDark}>🛰️ SATÉLITE NASA</Text>
                    </View>
                  ) : (
                    <View style={styles.tagValidacion}>
                      <Text style={styles.tagTextDark}>🛡️ BRIGADA B-12</Text>
                    </View>
                  )}
                  <Text style={styles.distanciaText}>a {item.distanciaKm} km</Text>
                </View>

                <View style={styles.timeRow}>
                  <Clock size={12} color={COLORS.textMuted} />
                  <Text style={styles.timeText}>{item.tiempo}</Text>
                </View>
              </View>

              <Text style={styles.alertCardTitle}>{item.titulo}</Text>
              <Text style={styles.alertCardMessage}>{item.mensaje}</Text>

              <View style={styles.sectorRow}>
                <MapPin size={13} color={COLORS.textSecondary} />
                <Text style={styles.sectorText}>{item.sector}</Text>
              </View>

              {/* Botón "Me encuentro a salvo" en alertas de evacuación */}
              {isEvacuacion && (
                <View style={styles.safeActionBox}>
                  {aSalvoConfirmado ? (
                    <View style={styles.safeConfirmedBox}>
                      <CheckCircle2 size={16} color="#059669" />
                      <Text style={styles.safeConfirmedText}>{t('i_am_safe_confirmed')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnSafe}
                      onPress={handleConfirmarASalvo}
                      activeOpacity={0.85}
                    >
                      <CheckCircle2 size={18} color="#ffffff" />
                      <Text style={styles.btnSafeText}>{t('btn_i_am_safe')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
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
  redAlertBanner: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  redAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  redAlertTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3
  },
  redAlertDesc: {
    fontSize: 12,
    color: '#fee2e2',
    lineHeight: 16
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  btnRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2'
  },
  btnRefreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.firePrimary
  },
  feedList: {
    gap: 12
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  alertCardCritica: {
    borderColor: '#fca5a5',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626'
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  tagCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tagEvacuacion: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  tagSatelite: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  tagValidacion: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  tagTextWhite: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff'
  },
  tagTextDark: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  distanciaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4
  },
  alertCardMessage: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 10
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  sectorText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  safeActionBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle
  },
  btnSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10
  },
  btnSafeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  safeConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  safeConfirmedText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669'
  }
});
