import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Line,
  Rect,
  Text as SvgText
} from 'react-native-svg';
import * as Location from 'expo-location';
import {
  Flame,
  Trees,
  Sprout,
  Building2,
  AlertTriangle,
  Layers,
  Crosshair,
  MapPin,
  Plus,
  Minus,
  Compass,
  CheckCircle2,
  ShieldAlert,
  Navigation
} from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { IncidenteItem } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 1. Coordenadas oficiales de Coracora, Parinacochas, Ayacucho (UTM 18S)
export const CORACORA_COORDS = {
  lon: -73.7806,
  lat: -15.0189,
  zoom: 13
};

// 2. Especificación Cartográfica Oficial ESRI World Topo Map (Relieve, carreteras, curvas de nivel y poblados)
export const ESRI_TOPO_STYLE = {
  version: 8,
  sources: {
    'esri-topo': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, DeLorme, USGS, NPS, IGN Perú, Parinacochas GIS'
    }
  },
  layers: [
    {
      id: 'esri-topo-layer',
      type: 'raster',
      source: 'esri-topo',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// 3. Especificación Cartográfica Oficial ESRI World Imagery (Ortofoto satelital de alta resolución en color real)
export const ESRI_SAT_STYLE = {
  version: 8,
  sources: {
    'esri-sat': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, Copernicus'
    }
  },
  layers: [
    {
      id: 'esri-sat-layer',
      type: 'raster',
      source: 'esri-sat',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// Intentar carga de MapLibre Native para Android Development Build
let MapLibreGL: any = null;
let NativeMap: any = null;
let NativeCamera: any = null;
let NativeMarker: any = null;
let isNativeMapLibreAvailable = false;

try {
  MapLibreGL = require('@maplibre/maplibre-react-native');
  NativeMap = MapLibreGL.Map;
  NativeCamera = MapLibreGL.Camera;
  NativeMarker = MapLibreGL.Marker;
  isNativeMapLibreAvailable = Boolean(NativeMap && NativeCamera);
} catch (e) {
  // Expo Go sin binarios nativos C++
  MapLibreGL = null;
  NativeMap = null;
  NativeCamera = null;
  NativeMarker = null;
  isNativeMapLibreAvailable = false;
}

export interface MapLibreMapProps {
  incidentes: IncidenteItem[];
  incidenteSeleccionado: IncidenteItem | null;
  onSelectIncidente: (incidente: IncidenteItem) => void;
  tipoCapa: 'topo' | 'sat';
  onChangeTipoCapa: (capa: 'topo' | 'sat') => void;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  incidentes,
  incidenteSeleccionado,
  onSelectIncidente,
  tipoCapa,
  onChangeTipoCapa
}) => {
  const cameraRef = useRef<any>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [localizando, setLocalizando] = useState(false);

  // Centrar en Coracora
  const handleCentrarCoracora = () => {
    if (cameraRef.current && typeof cameraRef.current.flyTo === 'function') {
      cameraRef.current.flyTo({
        center: [CORACORA_COORDS.lon, CORACORA_COORDS.lat],
        zoom: 13,
        duration: 1200
      });
      setZoomLevel(13);
    }
  };

  // Obtener ubicación GPS con expo-location
  const handleMiUbicacion = async () => {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Se requiere acceso al GPS para ubicar tu posición en Parinacochas.');
        setLocalizando(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = location.coords;
      setUserCoords({ lat: latitude, lon: longitude });

      if (cameraRef.current && typeof cameraRef.current.flyTo === 'function') {
        cameraRef.current.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 1200
        });
        setZoomLevel(14);
      }
    } catch (error) {
      Alert.alert('Error GPS', 'No fue posible obtener la posición GPS en este momento.');
    } finally {
      setLocalizando(false);
    }
  };

  // Controles de zoom
  const handleZoomIn = () => {
    const nextZoom = Math.min(zoomLevel + 1, 18);
    setZoomLevel(nextZoom);
    if (cameraRef.current && typeof cameraRef.current.flyTo === 'function') {
      cameraRef.current.flyTo({ zoom: nextZoom, duration: 300 });
    }
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(zoomLevel - 1, 8);
    setZoomLevel(nextZoom);
    if (cameraRef.current && typeof cameraRef.current.flyTo === 'function') {
      cameraRef.current.flyTo({ zoom: nextZoom, duration: 300 });
    }
  };

  // Resetear brújula al norte
  const handleResetNorth = () => {
    if (cameraRef.current && typeof cameraRef.current.flyTo === 'function') {
      cameraRef.current.flyTo({ bearing: 0, pitch: 0, duration: 500 });
    }
  };

  // Configuración de estilo actual
  const currentStyleJSON = tipoCapa === 'sat' ? ESRI_SAT_STYLE : ESRI_TOPO_STYLE;

  // Icono y color táctico según estado y tipo de incidente
  const getIncidenteVisual = (inc: IncidenteItem) => {
    const tipo = (inc.tipo_incendio || '').toLowerCase();
    const estado = (inc.estado || '').toLowerCase();

    // Colores según estado operativo
    let color = '#dc2626'; // Rojo fuego por defecto
    let haloColor = 'rgba(220, 38, 38, 0.35)';

    if (estado === 'en_combate' || estado === 'confirmado') {
      color = '#dc2626';
      haloColor = 'rgba(220, 38, 38, 0.35)';
    } else if (estado === 'en_atencion' || estado === 'asignado' || estado === 'verificacion') {
      color = '#ea580c';
      haloColor = 'rgba(234, 88, 12, 0.35)';
    } else if (estado === 'contenido' || estado === 'controlado') {
      color = '#d97706';
      haloColor = 'rgba(217, 119, 6, 0.35)';
    } else if (estado === 'cerrado' || estado === 'extinguido') {
      color = '#475569';
      haloColor = 'rgba(71, 85, 105, 0.25)';
    }

    return { color, haloColor, tipo, estado };
  };

  return (
    <View style={styles.container}>
      {/* 1. LIENZO CARTOGRÁFICO: MapLibre Native (Development Build) o Fallback Guiado (Expo Go) */}
      {isNativeMapLibreAvailable && NativeMap && NativeCamera ? (
        <NativeMap
          style={styles.map}
          mapStyle={currentStyleJSON}
          logoEnabled={false}
          attributionEnabled={true}
          attributionPosition={{ bottom: 8, left: 8 }}
          compassEnabled={true}
        >
          <NativeCamera
            ref={cameraRef}
            initialViewState={{
              center: [CORACORA_COORDS.lon, CORACORA_COORDS.lat],
              zoom: CORACORA_COORDS.zoom
            }}
          />

          {/* Marcadores de Incidentes del Día con MapLibre Native Marker */}
          {incidentes.map((inc) => {
            const lat = typeof inc.latitud_referencia === 'string'
              ? parseFloat(inc.latitud_referencia)
              : Number(inc.latitud_referencia);
            const lon = typeof inc.longitud_referencia === 'string'
              ? parseFloat(inc.longitud_referencia)
              : Number(inc.longitud_referencia);

            if (isNaN(lat) || isNaN(lon)) return null;

            const isSelected = incidenteSeleccionado?.id_incidente === inc.id_incidente;
            const { color, haloColor, tipo } = getIncidenteVisual(inc);

            return (
              <NativeMarker
                key={`native-marker-${inc.id_incidente}`}
                id={`native-marker-${inc.id_incidente}`}
                lngLat={[lon, lat]}
                anchor="bottom"
                onPress={() => onSelectIncidente(inc)}
              >
                <View style={styles.markerContainer}>
                  {/* Halo de criticidad */}
                  <View
                    style={[
                      styles.markerHalo,
                      {
                        backgroundColor: haloColor,
                        transform: [{ scale: isSelected ? 1.3 : 1 }]
                      }
                    ]}
                  />

                  {/* Pin central del incidente */}
                  <View
                    style={[
                      styles.markerPin,
                      {
                        backgroundColor: color,
                        borderColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.85)',
                        borderWidth: isSelected ? 2.5 : 1.5
                      }
                    ]}
                  >
                    {tipo.includes('forestal') ? (
                      <Trees size={14} color="#ffffff" />
                    ) : tipo.includes('agricola') ? (
                      <Sprout size={14} color="#ffffff" />
                    ) : tipo.includes('residencial') ? (
                      <Building2 size={14} color="#ffffff" />
                    ) : (
                      <Flame size={14} color="#ffffff" />
                    )}
                  </View>

                  {/* Etiqueta de código */}
                  <View style={[styles.markerTag, isSelected && styles.markerTagSelected]}>
                    <Text style={styles.markerTagText}>
                      {inc.codigo ? inc.codigo.replace('INC-', '') : `#${inc.id_incidente}`}
                    </Text>
                  </View>

                  {/* Punta triangular hacia la coordenada exacta */}
                  <View style={[styles.markerTriangle, { borderTopColor: color }]} />
                </View>
              </NativeMarker>
            );
          })}
        </NativeMap>
      ) : (
        /* Fallback Cartográfico Profesional para entorno Expo Go */
        <View style={styles.expoGoFallbackContainer}>
          {/* Banner de aviso Development Build */}
          <View style={styles.devBuildBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Compass size={14} color="#0284c7" />
              <Text style={styles.devBuildBannerTitle}>
                Vista Cartográfica Topográfica (Ayacucho)
              </Text>
            </View>
            <Text style={styles.devBuildBannerSubtitle}>
              MapLibre Native C++ se activará en Android Dev Build:
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700' }}>
                {' '}npx expo run:android
              </Text>
            </Text>
          </View>

          {/* Lienzo cartográfico interactivo con coordenadas reales de Coracora */}
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            {/* Fondo topográfico o satelital según capa seleccionada */}
            <Rect
              width="100"
              height="100"
              fill={tipoCapa === 'sat' ? '#1e293b' : '#f8fafc'}
            />

            {/* Curvas de nivel topográficas y relieve montañoso de la Cordillera de Parinacochas */}
            <Path
              d="M 0 35 Q 35 15 65 28 T 100 22 L 100 0 L 0 0 Z"
              fill={tipoCapa === 'sat' ? '#334155' : '#e2e8f0'}
              opacity={tipoCapa === 'sat' ? 0.35 : 0.7}
            />
            <Path
              d="M 0 55 Q 40 42 75 58 T 100 48 L 100 100 L 0 100 Z"
              fill={tipoCapa === 'sat' ? '#1e293b' : '#e2e8f0'}
              opacity={tipoCapa === 'sat' ? 0.25 : 0.45}
            />

            {/* Carretera Principal PE-32C y trochas carrozables hacia Huaccana / Paucaray */}
            <Path
              d="M 10 100 Q 30 75 48 52 T 85 0"
              fill="none"
              stroke={tipoCapa === 'sat' ? '#ca8a04' : '#f59e0b'}
              strokeWidth="1.2"
              strokeDasharray="2,1"
            />
            <Path
              d="M 48 52 Q 62 60 80 85"
              fill="none"
              stroke={tipoCapa === 'sat' ? '#94a3b8' : '#94a3b8'}
              strokeWidth="0.8"
            />

            {/* Quebrada y Río Secce */}
            <Path
              d="M 25 0 Q 35 45 50 68 T 60 100"
              fill="none"
              stroke={tipoCapa === 'sat' ? '#38bdf8' : '#0284c7'}
              strokeWidth="1"
              opacity={0.8}
            />

            {/* Núcleo Urbano de Coracora Centro */}
            <Circle cx="48" cy="52" r="2.2" fill="#0284c7" />
            <Circle cx="48" cy="52" r="4.5" fill="rgba(2, 132, 199, 0.18)" />
            <SvgText
              x="52"
              y="53.5"
              fill={tipoCapa === 'sat' ? '#f1f5f9' : '#0f172a'}
              fontSize="3.2"
              fontWeight="900"
            >
              Coracora Centro (3,175 msnm)
            </SvgText>

            {/* Sectores y Poblaciones reconocibles */}
            <SvgText x="58" y="38" fill={tipoCapa === 'sat' ? '#94a3b8' : '#64748b'} fontSize="2.6">
              Huaccana
            </SvgText>
            <SvgText x="24" y="76" fill={tipoCapa === 'sat' ? '#94a3b8' : '#64748b'} fontSize="2.6">
              Paucaray
            </SvgText>
            <SvgText x="74" y="24" fill={tipoCapa === 'sat' ? '#94a3b8' : '#64748b'} fontSize="2.6">
              Chumpi
            </SvgText>
            <SvgText x="14" y="42" fill={tipoCapa === 'sat' ? '#94a3b8' : '#64748b'} fontSize="2.6">
              Pullo
            </SvgText>

            {/* Posición GPS de Usuario si está activa */}
            {userCoords && (
              <G>
                <Circle cx="48" cy="52" r="5" fill="rgba(37, 99, 235, 0.2)" />
                <Circle cx="48" cy="52" r="2.2" fill="#2563eb" stroke="#ffffff" strokeWidth="0.6" />
              </G>
            )}

            {/* Incidentes del Día representados geográficamente */}
            {incidentes.map((inc, idx) => {
              const lat = typeof inc.latitud_referencia === 'string'
                ? parseFloat(inc.latitud_referencia)
                : Number(inc.latitud_referencia);
              const lon = typeof inc.longitud_referencia === 'string'
                ? parseFloat(inc.longitud_referencia)
                : Number(inc.longitud_referencia);

              const minLat = -15.18, maxLat = -14.94;
              const minLon = -73.88, maxLon = -73.68;

              const x = Math.max(16, Math.min(84, ((lon - minLon) / (maxLon - minLon)) * 100));
              const y = Math.max(16, Math.min(84, ((maxLat - lat) / (maxLat - minLat)) * 100));

              const isSelected = incidenteSeleccionado?.id_incidente === inc.id_incidente;
              const { color } = getIncidenteVisual(inc);

              return (
                <G key={`svg-inc-${inc.id_incidente}`} onPress={() => onSelectIncidente(inc)}>
                  {/* Halo pulsante de fuego */}
                  <Circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6.5 : 4.5}
                    fill={color}
                    opacity={isSelected ? 0.38 : 0.22}
                  />

                  {/* Núcleo del marcador */}
                  <Circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 3.4 : 2.5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 0.9 : 0.6}
                  />

                  {/* Etiqueta de código */}
                  <Rect
                    x={x - 6.5}
                    y={y - 8.5}
                    width="13"
                    height="4.2"
                    rx="1.5"
                    fill={isSelected ? '#0f172a' : '#ffffff'}
                    stroke={color}
                    strokeWidth="0.5"
                  />
                  <SvgText
                    x={x}
                    y={y - 5.6}
                    fill={isSelected ? '#ffffff' : color}
                    fontSize="2.4"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {inc.codigo ? inc.codigo.replace('INC-2026', '') : `#${inc.id_incidente}`}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      )}

      {/* 2. CONTROLES FLOTANTES SUPERIORES: Conmutador de Capas Topográfico / Satelital */}
      <View style={styles.topControls}>
        <View style={styles.layerSelector}>
          <TouchableOpacity
            style={[styles.layerBtn, tipoCapa === 'topo' && styles.layerBtnActive]}
            onPress={() => onChangeTipoCapa('topo')}
            activeOpacity={0.8}
          >
            <Compass size={13} color={tipoCapa === 'topo' ? '#ffffff' : COLORS.textSecondary} />
            <Text style={[styles.layerBtnText, tipoCapa === 'topo' && styles.layerBtnTextActive]}>
              Topográfico (IGN)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.layerBtn, tipoCapa === 'sat' && styles.layerBtnActive]}
            onPress={() => onChangeTipoCapa('sat')}
            activeOpacity={0.8}
          >
            <Layers size={13} color={tipoCapa === 'sat' ? '#ffffff' : COLORS.textSecondary} />
            <Text style={[styles.layerBtnText, tipoCapa === 'sat' && styles.layerBtnTextActive]}>
              Satelital (ESRI)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. BARRA LATERAL DE HERRAMIENTAS GIS: Centrado, GPS, Zoom In/Out, Brújula */}
      <View style={styles.sideControls}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCentrarCoracora}
          activeOpacity={0.8}
        >
          <MapPin size={18} color="#0284c7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, localizando && styles.actionBtnLoading]}
          onPress={handleMiUbicacion}
          activeOpacity={0.8}
        >
          {localizando ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Crosshair size={18} color="#2563eb" />
          )}
        </TouchableOpacity>

        <View style={styles.zoomButtonGroup}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={handleZoomIn}
            activeOpacity={0.8}
          >
            <Plus size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.zoomDivider} />

          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={handleZoomOut}
            activeOpacity={0.8}
          >
            <Minus size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleResetNorth}
          activeOpacity={0.8}
        >
          <Compass size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* 4. LEYENDA CARTOGRÁFICA INFERIOR */}
      <View style={styles.cartoBadge}>
        <View style={styles.cartoBadgeDot} />
        <Text style={styles.cartoBadgeText}>
          {incidentes.length} {incidentes.length === 1 ? 'incidente hoy' : 'incidentes hoy'} • Coracora
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a'
  },
  map: {
    flex: 1
  },
  expoGoFallbackContainer: {
    flex: 1,
    position: 'relative'
  },
  devBuildBanner: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  devBuildBannerTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0369a1'
  },
  devBuildBannerSubtitle: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 2
  },
  topControls: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 30,
    alignItems: 'center'
  },
  layerSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4
  },
  layerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  layerBtnActive: {
    backgroundColor: COLORS.firePrimary
  },
  layerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary
  },
  layerBtnTextActive: {
    color: '#ffffff'
  },
  sideControls: {
    position: 'absolute',
    right: 12,
    top: 90,
    zIndex: 30,
    gap: 10
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4
  },
  actionBtnLoading: {
    backgroundColor: '#eff6ff'
  },
  zoomButtonGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4
  },
  zoomBtn: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle
  },
  cartoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    zIndex: 25
  },
  cartoBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#dc2626'
  },
  cartoBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.textPrimary
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  markerHalo: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16
  },
  markerPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3
  },
  markerTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 2
  },
  markerTagSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a'
  },
  markerTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#0f172a'
  },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1
  }
});

