import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Orbit, Satellite, CheckCircle, Info, X } from 'lucide-react-native';
import { COLORS } from '../constants/config';

interface SatelliteSyncBadgeProps {
  compact?: boolean;
}

export const SatelliteSyncBadge: React.FC<SatelliteSyncBadgeProps> = ({ compact = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [minutosSync, setMinutosSync] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setMinutosSync((prev) => (prev >= 12 ? 2 : prev + 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, compact && styles.badgeCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.pulseContainer}>
          <View style={styles.pulseDot} />
          <Satellite size={13} color="#38bdf8" />
        </View>
        <Text style={styles.badgeText}>
          Copernicus & FIRMS <Text style={styles.timeHighlight}>hace {minutosSync}m</Text>
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Orbit size={20} color="#38bdf8" />
                <Text style={styles.modalTitle}>Telemetría Satelital WillAi</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Sincronización orbital activa sobre la Provincia de Parinacochas, Ayacucho (UTM Zona 18S).
            </Text>

            <View style={styles.satelliteItem}>
              <View style={styles.satHeader}>
                <Text style={styles.satName}>🛰️ Copernicus Sentinel-2 L2A</Text>
                <View style={styles.liveTag}><Text style={styles.liveTagText}>ACTIVO</Text></View>
              </View>
              <Text style={styles.satDesc}>
                Resolución 10-20m. Análisis espectral de reflectancia, dNBR post-fuego y ráster de combustibles andinos (Ichu, Bofedal $0.08\times$, Matorral).
              </Text>
            </View>

            <View style={styles.satelliteItem}>
              <View style={styles.satHeader}>
                <Text style={styles.satName}>🔥 NASA FIRMS (VIIRS + MODIS)</Text>
                <View style={styles.liveTag}><Text style={styles.liveTagText}>NRT 375m</Text></View>
              </View>
              <Text style={styles.satDesc}>
                Constelación NOAA-20, NOAA-21 y Suomi-NPP. Detección térmica infrarroja con potencia FRP (MW) en tiempo casi-real cada 3 horas.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <CheckCircle size={14} color="#10b981" />
              <Text style={styles.modalFooterText}>Bbox provincial calibrado [-74.30, -15.65, -72.85, -14.50]</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeCompact: {
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeHighlight: {
    color: '#0284c7',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  satelliteItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 10,
    marginBottom: 10,
  },
  satHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  satName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  liveTag: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.3)',
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  satDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  modalFooterText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});

