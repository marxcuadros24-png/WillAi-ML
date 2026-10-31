import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator
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
  CloudSun,
  Wind,
  Droplets,
  RotateCcw,
  ArrowRight,
  MapPin,
  Map as MapIcon,
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
  fetchAlertasComunitariasApi,
  FwiActualResponse,
  IncidenteItem,
  DeteccionFirmsItem,
  AlertaPublicaItem
} from '../services/api';
import { WillAiLogo } from '../components/WillAiLogo';
import { SatelliteSyncBadge } from '../components/SatelliteSyncBadge';
import { styles } from './HomeScreen.styles';

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
  x: number;
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
  const { token } = useAuthStore();
  const { isOnline, pendingCount, syncing, forzarSync } = useNetworkSync();

  const [fwiData, setFwiData] = useState<FwiActualResponse | null>(null);
  const [incidentes, setIncidentes] = useState<IncidenteItem[]>([]);
  const [focosSatelite, setFocosSatelite] = useState<DeteccionFirmsItem[]>([]);
  const [ultimaAlerta, setUltimaAlerta] = useState<AlertaPublicaItem | null>(null);
  const [puntosMapa, setPuntosMapa] = useState<PuntoIncidenteMap[]>([
    {
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
    }
  ]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [refrescando, setRefrescando] = useState<boolean>(false);

  // Cargar datos desde el backend Django
  const cargarDatos = async () => {
    try {
      const [fwi, incList, firmsList, alertasList] = await Promise.all([
        fetchFwiActual(),
        fetchIncidentesApi(token),
        fetchFocosFirmsApi(10),
        fetchAlertasComunitariasApi()
      ]);

      if (fwi) setFwiData(fwi);
      if (incList) setIncidentes(incList);
      if (firmsList) setFocosSatelite(firmsList);
      if (alertasList && alertasList.length > 0) {
        const activa = alertasList.find(a => ['critica', 'muy_alta', 'alta'].includes(a.prioridad) && ['emitida', 'enviada'].includes(a.estado)) || alertasList[0];
        setUltimaAlerta(activa);
      }

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

      // 2. Mapear focos térmicos satelitales
      (firmsList || []).slice(0, 4).forEach((fir, idx) => {
        const lat = typeof fir.latitud === 'string' ? parseFloat(fir.latitud) : Number(fir.latitud);
        const lon = typeof fir.longitud === 'string' ? parseFloat(fir.longitud) : Number(fir.longitud);

        const normX = Math.max(15, Math.min(85, ((lon - minLon) / (maxLon - minLon)) * 100));
        const normY = Math.max(15, Math.min(85, ((maxLat - lat) / (maxLat - minLat)) * 65));
        const dist = Math.round(Math.sqrt(Math.pow((lat - -15.0189) * 111, 2) + Math.pow((lon - -73.7806) * 107, 2)) * 10) / 10;

        puntos.push({
          id: `fir-${fir.id_deteccion || idx}`,
          tipo: 'satelite',
          titulo: `Foco Satelital ${fir.sensor}`,
          sector: 'Pajonal Parinacochas',
          estado: 'Visto por satélite',
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
            {isOnline
              ? (idioma === 'qu' ? '🟢 Signal kachkan' : '🟢 Hay señal')
              : (idioma === 'qu' ? '🟠 Mana signalchu (celularpi)' : '🟠 Sin señal (se guarda aquí)')}
          </Text>
        </View>
      </View>

      {/* Banner de Sincronización si hay reportes en cola */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={forzarSync} activeOpacity={0.75}>
          <RotateCcw size={14} color="#ffffff" />
          <Text style={styles.pendingBannerText}>
            {syncing ? t('syncing_now') : t('pending_reports_counter', { count: pendingCount })} (Toca para enviar)
          </Text>
        </TouchableOpacity>
      )}

      {/* BANNER DE ALERTA COMUNITARIA ACTIVA DESDE LA CENTRAL */}
      {ultimaAlerta && (
        <TouchableOpacity
          style={{
            backgroundColor: '#fee2e2',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10
          }}
          onPress={onNavigateToAlerts}
          activeOpacity={0.8}
        >
          <View style={{ backgroundColor: '#ef4444', padding: 6, borderRadius: 8 }}>
            <AlertTriangle size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#991b1b' }}>
              🚨 ALERTA: {ultimaAlerta.titulo}
            </Text>
            <Text style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2 }} numberOfLines={1}>
              {ultimaAlerta.mensaje}
            </Text>
          </View>
          <ChevronRight size={16} color="#ef4444" />
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
              {idioma === 'qu' ? 'Cámarawan hinaspa GPS-wan willay' : 'Toca aquí con cámara y GPS para pedir ayuda'}
            </Text>
          </View>
          <ArrowRight size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* 4. MAPA DE INCIDENTES EN VIVO */}
      <View style={styles.mapIncidentCard}>
        <View style={styles.mapCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapIcon size={18} color={COLORS.firePrimary} />
            <Text style={styles.mapCardTitle}>
              {idioma === 'qu' ? '¿Maypim nina kachkan?' : '¿Dónde hay fuego ahora?'}
            </Text>
          </View>

          <View style={styles.activePill}>
            <View style={styles.redPulseDot} />
            <Text style={styles.activePillText}>
              {incidentesActivos.length > 0
                ? `${incidentesActivos.length} ${idioma === 'qu' ? 'wañuchichkanku' : 'apagando ahora'}`
                : `${puntosMapa.length} ${idioma === 'qu' ? 'nina rikusqa' : 'fuegos vistos'}`}
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
              <Text style={styles.loadingMapText}>
                {idioma === 'qu' ? 'Suyay... ninakunata maskachkan' : 'Buscando fuegos cerca...'}
              </Text>
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

              {/* Puntos de Incidentes y Focos Térmicos */}
              {puntosMapa.map((p) => {
                const color = p.prioridad === 'critica' ? '#dc2626' : '#ea580c';
                return (
                  <G key={p.id}>
                    {/* Halo de fuego */}
                    <Circle cx={p.x} cy={p.y} r={4.5} fill={color} opacity={0.25} />
                    {/* Núcleo de llama */}
                    <Circle cx={p.x} cy={p.y} r={2.2} fill={color} stroke="#ffffff" strokeWidth="0.6" />
                    {/* Flecha de viento hacia el Noreste */}
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
              <Text style={styles.legendLabel}>{idioma === 'qu' ? 'Qam' : 'Tú'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.legendLabel}>{idioma === 'qu' ? 'Nina' : 'Fuego'}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Foco más cercano al poblador */}
        {focoMasCercano && (
          <View style={styles.nearestIncidentBox}>
            <View style={styles.nearestTopRow}>
              <View>
                <Text style={styles.nearestSectorText}>{focoMasCercano.sector}</Text>
                <Text style={styles.nearestTitleText}>{focoMasCercano.titulo}</Text>
              </View>
              <View style={styles.distBadge}>
                <Text style={styles.distBadgeText}>{focoMasCercano.distanciaKm} km de ti</Text>
              </View>
            </View>

            <View style={styles.windRow}>
              <Wind size={12} color="#0284c7" />
              <Text style={styles.windText}>
                {idioma === 'qu'
                  ? 'Wayra Huaccana mayuman phawachkan (24 km/h)'
                  : 'El viento sopla hacia Huaccana (24 km/h)'}
              </Text>
            </View>

            <TouchableOpacity style={styles.btnExpandMap} onPress={onNavigateToMap} activeOpacity={0.8}>
              <Text style={styles.btnExpandMapText}>
                {idioma === 'qu' ? 'Hatun saywitita qaway' : 'Tocar para ver el mapa completo'}
              </Text>
              <ChevronRight size={14} color={COLORS.firePrimary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 5. NORMA VITAL DE SEGURIDAD ANDINA */}
      <View style={styles.safetyCard}>
        <View style={styles.safetyHeader}>
          <AlertTriangle size={18} color="#dc2626" />
          <Text style={styles.safetyTitle}>{t('safety_title')}</Text>
        </View>
        <Text style={styles.safetyHighlight}>{t('do_not_climb')}</Text>
        <Text style={styles.safetyDesc}>{t('do_not_climb_desc')}</Text>
      </View>

      {/* 6. TARJETA DE PELIGRO DE FUEGO HOY */}
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
                {fwiData?.nivel_peligro === 'CRITICO'
                  ? (idioma === 'qu' ? '¡PELIGRO MÁXIMO! AMA NINATA CHURAYCHU' : '¡PELIGRO MÁXIMO! NO PRENDER FUEGO')
                  : fwiData?.nivel_peligro === 'ALTO'
                  ? (idioma === 'qu' ? 'LLUMPAY PELIGRO' : 'MUY PELIGROSO')
                  : (idioma === 'qu' ? 'CHAWPI PELIGRO' : 'CUIDADO (PELIGRO MEDIO)')}
              </Text>
              <Text style={styles.fwiScoreText}>
                {idioma === 'qu' ? 'Pasto ancha chaki kachkan' : 'Pasto e ichu muy secos en las laderas'}
              </Text>
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
