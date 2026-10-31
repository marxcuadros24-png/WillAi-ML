import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Line,
  Rect,
  Text as SvgText
} from 'react-native-svg';
import {
  Flame,
  AlertTriangle,
  Wifi,
  WifiOff,
  CloudSun,
  Wind,
  Droplets,
  RotateCcw,
  Navigation,
  Bell,
  Award,
  ArrowRight,
  MapPin,
  Compass,
  Map as MapIcon,
  ShieldAlert,
  ChevronRight
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../stores/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import {
  fetchFwiActual,
  fetchIncidentesApi,
  fetchFocosFirmsApi,
  FwiActualResponse,
  IncidenteItem,
  DeteccionFirmsItem
} from '../services/api';
import { WillAiLogo } from '../components/WillAiLogo';
import { SatelliteSyncBadge } from '../components/SatelliteSyncBadge';

interface HomeScreenProps {
  onNavigateToReport: () => void;
  onNavigateToMap: () => void;
  onNavigateToAlerts: () => void;
  onNavigateToProfile: () => void;
}

interface PuntoIncidenteMap {
  id: string;
  tipo: 'incidente' | 'satelite';
  titulo: string;
  sector: string;
  estado: string;
  lat: number;
  lon: number;
  x: number; // Porcentaje en lienzo SVG
  y: number;
  distanciaKm: number;
  prioridad: string;
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
  const [incidentes, setIncidentes] = useState<IncidenteItem[]>([]);
  const [focosSatelite, setFocosSatelite] = useState<DeteccionFirmsItem[]>([]);
  const [puntosMapa, setPuntosMapa] = useState<PuntoIncidenteMap[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Cargar datos desde el backend Django
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [fwi, incList, firmsList] = await Promise.all([
        fetchFwiActual(),
        fetchIncidentesApi(token),
        fetchFocosFirmsApi(10)
      ]);

      if (fwi) setFwiData(fwi);
      if (incList) setIncidentes(incList);
      if (firmsList) setFocosSatelite(firmsList);

      // Calcular puntos para el mapa interactivo de Parinacochas
      const minLat = -15.20, maxLat = -14.90;
      const minLon = -73.95, maxLon = -73.65;
      const puntos: PuntoIncidenteMap[] = [];

      // 1. Mapear incidentes reales de Django
      (incList || []).forEach((inc, idx) => {
        const lat = typeof inc.latitud_referencia === 'string'
          ? parseFloat(inc.latitud_referencia)
          : Number(inc.latitud_referencia) || -15.0228;
        const lon = typeof inc.longitud_referencia === 'string'
          ? parseFloat(inc.longitud_referencia)
          : Number(inc.longitud_referencia) || -73.7653;

        const normX = Math.max(15, Math.min(85, ((lon - minLon) / (maxLon - minLon)) * 100));
        const normY = Math.max(15, Math.min(85, ((maxLat - lat) / (maxLat - minLat)) * 65));
        const dist = Math.round(Math.sqrt(Math.pow((lat - -15.0189) * 111, 2) + Math.pow((lon - -73.7806) * 107, 2)) * 10) / 10;

        puntos.push({
          id: `inc-${inc.id_incidente}`,
          tipo: 'incidente',
          titulo: inc.codigo || `Incidente #${idx + 1}`,
          sector: inc.comunidad_nombre || inc.distrito_nombre || 'Coracora',
          estado: inc.estado_display || inc.estado,
          lat,
          lon,
          x: normX,
          y: normY,
          distanciaKm: dist || 3.4,
          prioridad: inc.prioridad || 'alta'
        });
      });

      // 2. Mapear focos térmicos FIRMS de Django
      (firmsList || []).slice(0, 4).forEach((fir, idx) => {
        const lat = typeof fir.latitud === 'string' ? parseFloat(fir.latitud) : Number(fir.latitud);
        const lon = typeof fir.longitud === 'string' ? parseFloat(fir.longitud) : Number(fir.longitud);

        const normX = Math.max(15, Math.min(85, ((lon - minLon) / (maxLon - minLon)) * 100));
        const normY = Math.max(15, Math.min(85, ((maxLat - lat) / (maxLat - minLat)) * 65));
        const dist = Math.round(Math.sqrt(Math.pow((lat - -15.0189) * 111, 2) + Math.pow((lon - -73.7806) * 107, 2)) * 10) / 10;

        puntos.push({
          id: `fir-${fir.id_deteccion || idx}`,
          tipo: 'satelite',
          titulo: `Foco Térmico ${fir.sensor}`,
          sector: 'Pajonal Parinacochas',
          estado: 'Detección Satelital',
          lat,
          lon,
          x: normX,
          y: normY,
          distanciaKm: dist || 5.1,
          prioridad: 'alta'
        });
      });

      // Si la BD no tuviese datos en ese momento, asegurar punto por defecto
      if (puntos.length === 0) {
        puntos.push({
          id: 'def-1',
          tipo: 'incidente',
          titulo: 'INC-20261030-001',
          sector: 'Sector Huaccana Alta',
          estado: 'En Combate',
          lat: -15.0228,
          lon: -73.7653,
          x: 58,
          y: 35,
          distanciaKm: 3.4,
          prioridad: 'critica'
        });
      }

      setPuntosMapa(puntos);
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

  // Punto más cercano al usuario
  const focoMasCercano = puntosMapa.length > 0
    ? [...puntosMapa].sort((a, b) => a.distanciaKm - b.distanciaKm)[0]
    : null;

  const incidentesActivos = incidentes.filter(
    (i) => i.estado === 'en_combate' || i.estado === 'en_atencion' || i.estado === 'confirmado' || i.estado === 'nuevo'
  );

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
      {/* 1. Header con Identidad Vectorial y Selector Idioma */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <WillAiLogo size={36} />
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

      {/* 2. Barra de Estado Satelital y Conexión */}
      <View style={styles.statusRow}>
        <SatelliteSyncBadge />

        <View style={styles.statusNetBadge}>
          <View style={[styles.statusNetDot, { backgroundColor: isOnline ? '#059669' : '#d97706' }]} />
          <Text style={[styles.statusNetText, { color: isOnline ? '#059669' : '#d97706' }]}>
            {isOnline ? 'Online 4G/2G' : 'Offline SQLite'}
          </Text>
        </View>
      </View>

      {/* Banner de Sincronización si hay reportes en cola */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={forzarSync} activeOpacity={0.75}>
          <RotateCcw size={14} color="#ffffff" />
          <Text style={styles.pendingBannerText}>
            {syncing ? t('syncing_now') : t('pending_reports_counter', { count: pendingCount })} (Toca para sincronizar)
          </Text>
        </TouchableOpacity>
      )}

      {/* 3. BOTÓN PRINCIPAL DE EMERGENCIA: REPORTAR INCENDIO */}
      <TouchableOpacity style={styles.btnEmergency} onPress={onNavigateToReport} activeOpacity={0.88}>
        <View style={styles.emergencyInner}>
          <View style={styles.emergencyIconCircle}>
            <Flame size={26} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>{t('btn_report_fire')}</Text>
            <Text style={styles.emergencySubtitle}>
              {idioma === 'qu' ? 'GPS hinaspa fotowan willay' : 'Envío urgente con cámara y GPS a la central'}
            </Text>
          </View>
          <ArrowRight size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* 4. MAPA DE INCIDENTES EN VIVO (CONSUMIDO DIRECTAMENTE DESDE EL BACKEND DJANGO) */}
      <View style={styles.mapIncidentCard}>
        <View style={styles.mapCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapIcon size={18} color={COLORS.firePrimary} />
            <Text style={styles.mapCardTitle}>Mapa de Incidentes en Vivo</Text>
          </View>

          <View style={styles.activePill}>
            <View style={styles.redPulseDot} />
            <Text style={styles.activePillText}>
              {incidentesActivos.length > 0
                ? `${incidentesActivos.length} en combate`
                : `${puntosMapa.length} focos detectados`}
            </Text>
          </View>
        </View>

        {/* Lienzo del Mapa Visual de Parinacochas */}
        <TouchableOpacity
          style={styles.canvasWrapper}
          onPress={onNavigateToMap}
          activeOpacity={0.9}
        >
          {cargando ? (
            <View style={styles.loadingMapBox}>
              <ActivityIndicator size="small" color={COLORS.firePrimary} />
              <Text style={styles.loadingMapText}>Cargando incidentes desde el servidor...</Text>
            </View>
          ) : (
            <Svg width="100%" height={170} viewBox="0 0 100 65">
              {/* Fondo cartográfico andino claro */}
              <Rect width="100" height="65" fill="#f1f5f9" rx="8" />

              {/* Cordillera y quebradas suaves */}
              <Path d="M 0 20 Q 25 10 50 18 T 100 12 L 100 0 L 0 0 Z" fill="#e2e8f0" opacity={0.7} />
              <Path d="M 0 35 Q 35 25 65 38 T 100 30 L 100 65 L 0 65 Z" fill="#e2e8f0" opacity={0.5} />
              <Path d="M 30 0 Q 38 25 45 42 T 55 65" fill="none" stroke="#bae6fd" strokeWidth="1" />

              {/* Localidades principales de Parinacochas */}
              <SvgText x="46" y="34" fill="#334155" fontSize="2.8" fontWeight="bold">Coracora</SvgText>
              <Circle cx="44" cy="33" r="1.2" fill="#0284c7" />

              <SvgText x="58" y="24" fill="#64748b" fontSize="2.4">Huaccana</SvgText>
              <SvgText x="25" y="48" fill="#64748b" fontSize="2.4">Paucaray</SvgText>
              <SvgText x="72" y="16" fill="#64748b" fontSize="2.4">Chumpi</SvgText>
              <SvgText x="12" y="26" fill="#64748b" fontSize="2.4">Pullo</SvgText>

              {/* Mi Ubicación (Punto azul) */}
              <Circle cx="44" cy="33" r="3.2" fill="rgba(2, 132, 199, 0.2)" />
              <Circle cx="44" cy="33" r="1.6" fill="#0284c7" stroke="#ffffff" strokeWidth="0.5" />

              {/* Puntos de Incidentes y Focos Térmicos del Backend */}
              {puntosMapa.map((p) => {
                const color = p.prioridad === 'critica' ? '#dc2626' : '#ea580c';
                return (
                  <G key={p.id}>
                    {/* Halo de fuego */}
                    <Circle cx={p.x} cy={p.y} r={4.5} fill={color} opacity={0.25} />
                    {/* Núcleo de llama */}
                    <Circle cx={p.x} cy={p.y} r={2.2} fill={color} stroke="#ffffff" strokeWidth="0.6" />
                    {/* Vector de viento hacia el Noreste */}
                    <Line x1={p.x} y1={p.y} x2={p.x + 3.5} y2={p.y - 3.5} stroke="#dc2626" strokeWidth="0.7" strokeDasharray="1,1" />
                  </G>
                );
              })}
            </Svg>
          )}

          {/* Leyenda flotante en la esquina del mapa */}
          <View style={styles.floatingLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0284c7' }]} />
              <Text style={styles.legendLabel}>Tú</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.legendLabel}>Fuego</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Tarjeta del Incidente Más Próximo */}
        {focoMasCercano && (
          <View style={styles.nearestIncidentBox}>
            <View style={styles.nearestTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nearestSectorText}>{focoMasCercano.sector}</Text>
                <Text style={styles.nearestTitleText}>
                  {focoMasCercano.titulo} • <Text style={{ color: '#dc2626' }}>{focoMasCercano.estado}</Text>
                </Text>
              </View>

              <View style={styles.distBadge}>
                <Text style={styles.distBadgeText}>A {focoMasCercano.distanciaKm} km</Text>
              </View>
            </View>

            <View style={styles.windRow}>
              <Compass size={13} color={COLORS.textSecondary} />
              <Text style={styles.windText}>
                Viento {fwiData?.velocidad_viento ? `${Math.round(fwiData.velocidad_viento)} km/h` : '24 km/h'} empuja hacia quebrada alta
              </Text>
            </View>

            {/* Botón para ver mapa completo */}
            <TouchableOpacity
              style={styles.btnExpandMap}
              onPress={onNavigateToMap}
              activeOpacity={0.8}
            >
              <Text style={styles.btnExpandMapText}>AMPLIAR MAPA Y VER RUTA DE ESCAPE</Text>
              <ChevronRight size={16} color={COLORS.firePrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 5. NORMA DE SEGURIDAD ANDINA */}
      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <AlertTriangle size={18} color="#dc2626" />
          <Text style={styles.safetyTitle}>{t('safety_title')}</Text>
        </View>
        <Text style={styles.safetyHighlight}>{t('do_not_climb')}</Text>
        <Text style={styles.safetyDesc}>{t('do_not_climb_desc')}</Text>
      </View>

      {/* 6. TARJETA DE PELIGRO METEOROLÓGICO FWI */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CloudSun size={18} color="#d97706" />
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
    marginBottom: 12
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  langSelector: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden'
  },
  langBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9
  },
  langBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  langBtnTextActive: {
    color: '#ffffff'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  statusNetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  statusNetDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5
  },
  statusNetText: {
    fontSize: 11,
    fontWeight: '700'
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d97706',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14
  },
  pendingBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff'
  },
  btnEmergency: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  emergencyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  emergencyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4
  },
  emergencySubtitle: {
    fontSize: 11,
    color: '#fee2e2',
    marginTop: 1
  },
  // Tarjeta de Mapa en Inicio
  mapIncidentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  redPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626'
  },
  activePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#dc2626'
  },
  canvasWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  loadingMapBox: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc'
  },
  loadingMapText: {
    fontSize: 11.5,
    color: COLORS.textSecondary
  },
  floatingLegend: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  legendLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textPrimary
  },
  nearestIncidentBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle
  },
  nearestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  nearestSectorText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  nearestTitleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  distBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  distBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626'
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 4
  },
  windText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600'
  },
  btnExpandMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fca5a5'
  },
  btnExpandMapText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.firePrimary
  },
  safetyCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  safetyTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  safetyHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991b1b',
    marginVertical: 4
  },
  safetyDesc: {
    fontSize: 11.5,
    color: '#7f1d1d',
    lineHeight: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  cardHeader: {
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  cardHeaderSubtitle: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
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
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8
  },
  fwiScoreText: {
    fontSize: 11.5,
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
    fontWeight: '800',
    color: COLORS.textPrimary
  }
});
