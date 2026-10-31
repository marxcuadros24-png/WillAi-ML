import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import {
  AlertTriangle,
  Flame,
  Satellite,
  Wind,
  ShieldCheck,
  Radar,
  CheckCircle2,
  Clock,
  Radio,
  MapPin,
  ChevronRight
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';

interface AlertaFeedItem {
  id: string;
  categoria: 'evacuacion' | 'satelite' | 'validacion' | 'calidad_aire';
  titulo: string;
  mensaje: string;
  tiempo: string;
  sector: string;
  prioridad: 'critica' | 'alta' | 'media';
  distanciaKm: number;
}

export const AlertsScreen: React.FC = () => {
  const { t, idioma } = useTranslation();
  const [radioGeoradar, setRadioGeoradar] = useState<number>(10); // 5, 10, 25, 50
  const [aSalvoConfirmado, setASalvoConfirmado] = useState<boolean>(false);

  const FEED_ALERTAS: AlertaFeedItem[] = [
    {
      id: 'ALT-01',
      categoria: 'evacuacion',
      titulo: 'ORDEN DE EVACUACIÓN INMEDIATA',
      mensaje: 'Frente de fuego avanzando hacia la ladera baja de Huaccana. Se ordena evacuación de familias hacia la Plaza Comunal. ¡No asciendan la ladera!',
      tiempo: 'Hace 8 min',
      sector: 'Comunidad Huaccana, Coracora',
      prioridad: 'critica',
      distanciaKm: 3.2,
    },
    {
      id: 'ALT-02',
      categoria: 'satelite',
      titulo: 'Detección Térmica NASA VIIRS (375m)',
      mensaje: 'Anomalía térmica confirmada en punto (-15.0228, -73.7653) con potencia FRP 58.4 MW en pajonal altoandino.',
      tiempo: 'Hace 24 min',
      sector: 'Pajonal Huaccana Alta',
      prioridad: 'alta',
      distanciaKm: 4.8,
    },
    {
      id: 'ALT-03',
      categoria: 'calidad_aire',
      titulo: 'Alerta de Calidad del Aire (PM 2.5)',
      mensaje: 'Nivel nocivo de micropartículas: 84 µg/m³. Se recomienda uso de mascarilla o pañuelo húmedo por dispersión de ceniza.',
      tiempo: 'Hace 45 min',
      sector: 'Radio 15km Coracora Centro',
      prioridad: 'media',
      distanciaKm: 1.5,
    },
    {
      id: 'ALT-04',
      categoria: 'validacion',
      titulo: 'Validación de Reporte Ciudadano',
      mensaje: 'Brigada Forestal B-12 validó reporte de conato en Paucaray. Cortafuegos activo y bajo control.',
      tiempo: 'Hace 1h 10m',
      sector: 'Sector Paucaray',
      prioridad: 'media',
      distanciaKm: 6.8,
    },
  ];

  const handleConfirmarASalvo = () => {
    setASalvoConfirmado(true);
    Alert.alert(
      'WillAi Socorro',
      idioma === 'qu'
        ? 'Ayllu qispisqayki COEP Quracuraman willasqaña.'
        : 'Tu estado "A SALVO" ha sido reportado al Centro de Operaciones de Emergencia (COEP Coracora).'
    );
  };

  const alertasFiltradas = FEED_ALERTAS.filter((a) => a.distanciaKm <= radioGeoradar);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* 1. BANNER SUPERIOR DE ALERTA ROJA REGIONAL EN PARINACOCHAS */}
      <View style={styles.redAlertBanner}>
        <View style={styles.redAlertHeader}>
          <View style={styles.pulseDot} />
          <AlertTriangle size={18} color="#ffffff" />
          <Text style={styles.redAlertTitle}>{t('alert_red_banner')}</Text>
        </View>
        <Text style={styles.redAlertDesc}>{t('alert_red_banner_desc')}</Text>
      </View>

      {/* 2. SELECTOR CONFIGURABLE DE RADIO DE COBERTURA PUSH (GEORADAR) */}
      <View style={styles.georadarCard}>
        <View style={styles.georadarHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Radar size={16} color="#38bdf8" />
            <Text style={styles.georadarTitle}>{t('georadar_title')}</Text>
          </View>
          <Text style={styles.georadarActiveText}>{radioGeoradar} km de cobertura</Text>
        </View>

        <View style={styles.radiusPillsRow}>
          {[5, 10, 25, 50].map((radius) => {
            const isSelected = radioGeoradar === radius;
            return (
              <TouchableOpacity
                key={radius}
                style={[styles.radiusPill, isSelected && styles.radiusPillActive]}
                onPress={() => setRadioGeoradar(radius)}
                activeOpacity={0.7}
              >
                <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                  {radius === 50 ? 'Toda Prov.' : `${radius} km`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. FEED JERÁRQUICO DE ALERTAS */}
      <View style={styles.feedSection}>
        <Text style={styles.sectionHeaderTitle}>{t('alerts_title')} ({alertasFiltradas.length})</Text>

        {alertasFiltradas.map((item) => {
          const isCritica = item.prioridad === 'critica';
          const isEvacuacion = item.categoria === 'evacuacion';

          return (
            <View
              key={item.id}
              style={[
                styles.alertCard,
                isCritica && styles.alertCardCritica,
                item.categoria === 'calidad_aire' && styles.alertCardAir
              ]}
            >
              {/* Encabezado del Card */}
              <View style={styles.alertCardHeader}>
                <View style={styles.tagCategoryRow}>
                  {isEvacuacion ? (
                    <View style={styles.tagEvacuacion}><Text style={styles.tagText}>🚨 EVACUACIÓN</Text></View>
                  ) : item.categoria === 'satelite' ? (
                    <View style={styles.tagSatelite}><Text style={styles.tagText}>🛰️ SATÉLITE NASA</Text></View>
                  ) : item.categoria === 'calidad_aire' ? (
                    <View style={styles.tagAir}><Text style={styles.tagText}>💨 PM 2.5</Text></View>
                  ) : (
                    <View style={styles.tagValidacion}><Text style={styles.tagText}>🛡️ BRIGADA B-12</Text></View>
                  )}
                  <Text style={styles.distanciaText}>a {item.distanciaKm} km</Text>
                </View>

                <View style={styles.timeRow}>
                  <Clock size={11} color="#94a3b8" />
                  <Text style={styles.timeText}>{item.tiempo}</Text>
                </View>
              </View>

              <Text style={styles.alertCardTitle}>{item.titulo}</Text>
              <Text style={styles.alertCardMessage}>{item.mensaje}</Text>

              <View style={styles.sectorRow}>
                <MapPin size={12} color="#94a3b8" />
                <Text style={styles.sectorText}>{item.sector}</Text>
              </View>

              {/* Botón interactivo "Me encuentro a salvo" en alerta de evacuación */}
              {isEvacuacion && (
                <View style={styles.safeActionBox}>
                  {aSalvoConfirmado ? (
                    <View style={styles.safeConfirmedBox}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <Text style={styles.safeConfirmedText}>{t('i_am_safe_confirmed')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnSafe}
                      onPress={handleConfirmarASalvo}
                      activeOpacity={0.8}
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
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  redAlertBanner: {
    backgroundColor: '#b91c1c',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  redAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  redAlertTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    flex: 1,
  },
  redAlertDesc: {
    fontSize: 11.5,
    color: '#fecaca',
    lineHeight: 16,
  },
  georadarCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  georadarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  georadarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  georadarActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  radiusPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  radiusPillTextActive: {
    color: '#38bdf8',
  },
  feedSection: {
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  alertCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  alertCardCritica: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  alertCardAir: {
    borderColor: 'rgba(168, 85, 247, 0.4)',
    backgroundColor: 'rgba(168, 85, 247, 0.06)',
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagEvacuacion: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagSatelite: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagAir: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagValidacion: {
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  distanciaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  alertCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  alertCardMessage: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16.5,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectorText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  safeActionBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
  },
  btnSafeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  safeConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  safeConfirmedText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#34d399',
  },
});
