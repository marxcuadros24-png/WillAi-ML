import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Calendar, Wind, Check, ShieldAlert, MapPin, Flame, Route, Droplets } from 'lucide-react';
import type { Incidente, FocoCalor, Brigada, PrediccionViento12hData, ViviendaRural, GrillaRiesgoOcurrenciaData } from '../types';
import {
  LIMITE_PROVINCIAL_PARINACOCHAS,
  LIMITES_DISTRITALES_PARINACOCHAS,
  REFERENCIAS_PROVINCIAS_LIMITROFES,
} from '../data/demarcacionParinacochas';

// Cache a nivel de módulo para evitar re-descargas innecesarias
let cachedCarreterasGeoJson: any = null;
let cachedRiosGeoJson: any = null;

interface TacticalMapProps {
  incidentes: Incidente[];
  focos: FocoCalor[];
  brigadas: Brigada[];
  viviendas?: ViviendaRural[];
  viento12h: PrediccionViento12hData | null;
  onSelectIncidente: (incidente: Incidente) => void;
  // Sensor layer states
  showModis: boolean;
  showViirs: boolean;
  showSerfor: boolean;
  showVientoML: boolean;
  showRiesgoOcurrencia?: boolean;
  showIncidentes: boolean;
  showBrigadas: boolean;
  showViviendas?: boolean;
  showLimiteProvincial?: boolean;
  showDistritos?: boolean;
  showCarreteras?: boolean;
  showRios?: boolean;
  onToggleModis: (val: boolean) => void;
  onToggleViirs: (val: boolean) => void;
  onToggleSerfor: (val: boolean) => void;
  onToggleVientoML: (val: boolean) => void;
  onToggleRiesgoOcurrencia?: (val: boolean) => void;
  onToggleIncidentes: (val: boolean) => void;
  onToggleBrigadas: (val: boolean) => void;
  onToggleViviendas?: (val: boolean) => void;
  onToggleLimiteProvincial?: (val: boolean) => void;
  onToggleDistritos?: (val: boolean) => void;
  onToggleCarreteras?: (val: boolean) => void;
  onToggleRios?: (val: boolean) => void;
  grillaOcurrencia?: GrillaRiesgoOcurrenciaData | null;
  // Simulación de Propagación de Incendios (Cell2Fire Eliptico Andino)
  simulacionGeojson?: any | null;
  showSimulacionIsocronas?: boolean;
  onToggleSimulacionIsocronas?: (val: boolean) => void;
  // Timeline filter states
  timeRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom';
  onChangeTimeRange: (val: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => void;
  fechaDesde?: string;
  fechaHasta?: string;
  onApplyCustomDates?: (desde: string, hasta: string) => void;
  // Selected hour in 12h forecast
  selectedHourIdx?: number;
  selectedIncidente?: Incidente | null;
  focusCoords?: [number, number] | null;
  onMapCreateIncident?: (lat: number, lon: number) => void;
  onMapCreateVivienda?: (lat: number, lon: number) => void;
  onMapSetSimCoords?: (lat: number, lon: number) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incidentes,
  focos,
  brigadas,
  viviendas = [],
  viento12h,
  onSelectIncidente,
  showModis,
  showViirs,
  showSerfor,
  showVientoML,
  showRiesgoOcurrencia = true,
  showIncidentes,
  showBrigadas,
  showViviendas = true,
  showLimiteProvincial = true,
  showDistritos = false,
  showCarreteras = true,
  showRios = true,
  simulacionGeojson = null,
  showSimulacionIsocronas = true,
  onToggleSimulacionIsocronas,
  onToggleModis,
  onToggleViirs,
  onToggleSerfor,
  onToggleVientoML,
  onToggleRiesgoOcurrencia,
  onToggleIncidentes,
  onToggleBrigadas,
  onToggleViviendas,
  onToggleLimiteProvincial,
  onToggleDistritos,
  onToggleCarreteras,
  onToggleRios,
  grillaOcurrencia = null,
  timeRange,
  onChangeTimeRange,
  fechaDesde,
  fechaHasta,
  onApplyCustomDates,
  selectedHourIdx = 0,
  selectedIncidente = null,
  focusCoords = null,
  onMapCreateIncident,
  onMapCreateVivienda,
  onMapSetSimCoords
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const onMapCreateIncidentRef = useRef(onMapCreateIncident);
  const onMapCreateViviendaRef = useRef(onMapCreateVivienda);
  const onMapSetSimCoordsRef = useRef(onMapSetSimCoords);

  useEffect(() => {
    onMapCreateIncidentRef.current = onMapCreateIncident;
    onMapCreateViviendaRef.current = onMapCreateVivienda;
    onMapSetSimCoordsRef.current = onMapSetSimCoords;
    (window as any).__willai_create_incident = (lat: number, lon: number) => {
      onMapCreateIncidentRef.current?.(lat, lon);
    };
    (window as any).__willai_create_vivienda = (lat: number, lon: number) => {
      onMapCreateViviendaRef.current?.(lat, lon);
    };
    (window as any).__willai_set_sim_coords = (lat: number, lon: number) => {
      onMapSetSimCoordsRef.current?.(lat, lon);
    };
    return () => {
      delete (window as any).__willai_create_incident;
      delete (window as any).__willai_create_vivienda;
      delete (window as any).__willai_set_sim_coords;
    };
  }, [onMapCreateIncident, onMapCreateVivienda, onMapSetSimCoords]);

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [inputDesde, setInputDesde] = useState(fechaDesde || '2026-05-01');
  const [inputHasta, setInputHasta] = useState(fechaHasta || '2026-10-22');

  const layersRef = useRef<{
    limiteProvincial: L.LayerGroup;
    distritos: L.LayerGroup;
    rios: L.LayerGroup;
    carreteras: L.LayerGroup;
    modis: L.LayerGroup;
    viirs: L.LayerGroup;
    serfor: L.LayerGroup;
    vientoML: L.LayerGroup;
    riesgoOcurrencia: L.LayerGroup;
    isocronasSimulacion: L.LayerGroup;
    incidentes: L.LayerGroup;
    brigadas: L.LayerGroup;
    viviendas: L.LayerGroup;
  }>({
    limiteProvincial: L.layerGroup(),
    distritos: L.layerGroup(),
    rios: L.layerGroup(),
    carreteras: L.layerGroup(),
    modis: L.layerGroup(),
    viirs: L.layerGroup(),
    serfor: L.layerGroup(),
    vientoML: L.layerGroup(),
    riesgoOcurrencia: L.layerGroup(),
    isocronasSimulacion: L.layerGroup(),
    incidentes: L.layerGroup(),
    brigadas: L.layerGroup(),
    viviendas: L.layerGroup(),
  });

  const CORACORA_COORDS: [number, number] = [-15.0189, -73.7806];

  // Initialize Map with ESRI Satellite Base Layer
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CORACORA_COORDS,
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ESRI Satellite Base Layer
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; WillAI NASA FIRMS & Sentinel Coracora',
        maxZoom: 18,
      }
    ).addTo(map);

    // Subtle dark labels layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CartoDB',
        maxZoom: 18,
        opacity: 0.85,
      }
    ).addTo(map);

    // Attach layers (boundaries & base geography underneath overlays and markers)
    layersRef.current.limiteProvincial.addTo(map);
    layersRef.current.distritos.addTo(map);
    layersRef.current.rios.addTo(map);
    layersRef.current.carreteras.addTo(map);
    layersRef.current.modis.addTo(map);
    layersRef.current.viirs.addTo(map);
    layersRef.current.serfor.addTo(map);
    layersRef.current.vientoML.addTo(map);
    layersRef.current.riesgoOcurrencia.addTo(map);
    layersRef.current.isocronasSimulacion.addTo(map);
    layersRef.current.incidentes.addTo(map);
    layersRef.current.brigadas.addTo(map);
    layersRef.current.viviendas.addTo(map);

    // Contextmenu (clic derecho) para crear incidente en coordenadas exactas del mapa
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lon = parseFloat(e.latlng.lng.toFixed(5));

      const popupNode = document.createElement('div');
      popupNode.style.padding = '6px 4px';
      popupNode.style.textAlign = 'center';
      popupNode.style.minWidth = '190px';
      popupNode.innerHTML = `
        <div style="font-size: 11px; font-weight: 700; color: #f8fafc; margin-bottom: 2px;">
          📍 Ubicación Marcada
        </div>
        <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-bottom: 8px;">
          ${lat}, ${lon}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button id="btn-crear-incidente-click" style="
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
          ">
            🔥 Registrar Incidente Aquí
          </button>
          <button id="btn-crear-vivienda-click" style="
            background: #d97706;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            box-shadow: 0 2px 6px rgba(217, 119, 6, 0.4);
          ">
            🏠 Registrar Vivienda Rural Aquí
          </button>
          <button id="btn-simular-aqui-click" style="
            background: #ea580c;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            box-shadow: 0 2px 6px rgba(234, 88, 12, 0.4);
          ">
            🚀 Usar como Ignición para Simular
          </button>
        </div>
      `;

      const popup = L.popup({
        closeButton: true,
      })
        .setLatLng(e.latlng)
        .setContent(popupNode)
        .openOn(map);

      const btnInc = popupNode.querySelector('#btn-crear-incidente-click');
      if (btnInc) {
        btnInc.addEventListener('click', () => {
          map.closePopup(popup);
          if (onMapCreateIncidentRef.current) {
            onMapCreateIncidentRef.current(lat, lon);
          }
        });
      }

      const btnViv = popupNode.querySelector('#btn-crear-vivienda-click');
      if (btnViv) {
        btnViv.addEventListener('click', () => {
          map.closePopup(popup);
          if (onMapCreateViviendaRef.current) {
            onMapCreateViviendaRef.current(lat, lon);
          }
        });
      }

      const btnSim = popupNode.querySelector('#btn-simular-aqui-click');
      if (btnSim) {
        btnSim.addEventListener('click', () => {
          map.closePopup(popup);
          if (onMapSetSimCoordsRef.current) {
            onMapSetSimCoordsRef.current(lat, lon);
          }
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Smooth flyTo when selectedIncidente changes
  useEffect(() => {
    if (selectedIncidente && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedIncidente.latitud, selectedIncidente.longitud], 14, { duration: 1.0 });
    }
  }, [selectedIncidente]);

  // Smooth flyTo when specific coordinates are focused (e.g. from ML Occurrence panel)
  useEffect(() => {
    if (focusCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(focusCoords, 14, { duration: 1.0 });
    }
  }, [focusCoords]);

  // Filter focos by sensor
  const focosModis = focos.filter((f) => f.sensor?.toUpperCase().includes('MODIS'));
  const focosViirs = focos.filter((f) => f.sensor?.toUpperCase().includes('VIIRS'));
  const focosSerfor = focos.filter((f) => f.fuente === 'SERFOR' || f.sensor?.toUpperCase().includes('SERFOR'));

  // Update MODIS Layer (1km pixel footprint + center radar pulse)
  useEffect(() => {
    const layer = layersRef.current.modis;
    layer.clearLayers();
    if (!showModis) return;

    focosModis.forEach((foco) => {
      // Circle representing MODIS 1000m ground resolution footprint (subtle dashed border to prevent terrain occlusion)
      const circleFootprint = L.circle([foco.latitud, foco.longitud], {
        radius: 500, // 1km diameter footprint
        color: '#ef4444',
        weight: 1,
        opacity: 0.35,
        fillColor: '#dc2626',
        fillOpacity: 0.05,
        dashArray: '3, 4'
      });
      layer.addLayer(circleFootprint);

      // Center pulsing marker
      const customIcon = L.divIcon({
        html: `<div class="hotspot-modis-pulse" title="NASA MODIS (${foco.satelite}) - ${foco.frp} MW"></div>`,
        className: 'custom-modis-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([foco.latitud, foco.longitud], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #ef4444; text-transform: uppercase;">🔥 NASA MODIS [1km]</span>
            <span style="font-size: 10px; font-family: var(--font-mono); color: #cbd5e1; background: rgba(239, 68, 68, 0.2); padding: 1px 6px; border-radius: 4px;">
              ${foco.satelite || 'Terra/Aqua'}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Foco Satelital MODIS</h4>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 3px;">
            <span><strong>Potencia Radiativa (FRP):</strong> <span style="color: #fb923c; font-weight: 700;">${foco.frp} MW</span></span>
            <span><strong>Confianza de detección:</strong> <strong style="color: #38bdf8;">${foco.confianza_numerica || 85}%</strong> (${foco.confianza.toUpperCase()})</span>
            <span><strong>Resolución Sensor:</strong> 1 km / 1000 m píxel</span>
            <span><strong>Temperatura de Brillo:</strong> ${foco.brillo_kelvin || 322.4} K</span>
            <span><strong>Fecha / Hora Obs:</strong> ${foco.fecha_hora}</span>
            <span><strong>Coordenadas:</strong> ${foco.latitud.toFixed(4)}, ${foco.longitud.toFixed(4)}</span>
          </div>
          <button onclick="window.__willai_create_incident && window.__willai_create_incident(${foco.latitud}, ${foco.longitud})" style="
            margin-top: 8px;
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
          ">
            🔥 Registrar Incidente en este Foco
          </button>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [focosModis, showModis]);

  // Update VIIRS Layer (375m resolution radar pulse)
  useEffect(() => {
    const layer = layersRef.current.viirs;
    layer.clearLayers();
    if (!showViirs) return;

    focosViirs.forEach((foco) => {
      const circleFootprint = L.circle([foco.latitud, foco.longitud], {
        radius: 187, // 375m footprint
        color: '#f59e0b',
        weight: 1,
        opacity: 0.35,
        fillColor: '#f59e0b',
        fillOpacity: 0.05,
        dashArray: '3, 3'
      });
      layer.addLayer(circleFootprint);

      const customIcon = L.divIcon({
        html: `<div class="hotspot-viirs-pulse" title="NASA VIIRS (${foco.satelite}) - ${foco.frp} MW"></div>`,
        className: 'custom-viirs-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([foco.latitud, foco.longitud], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #f59e0b; text-transform: uppercase;">🛰️ NASA VIIRS [375m]</span>
            <span style="font-size: 10px; font-family: var(--font-mono); color: #cbd5e1; background: rgba(245, 158, 11, 0.2); padding: 1px 6px; border-radius: 4px;">
              ${foco.satelite || 'NOAA-20'}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 6px;">Foco Térmico VIIRS</h4>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 3px;">
            <span><strong>FRP:</strong> <span style="color: #fb923c; font-weight: 700;">${foco.frp} MW</span></span>
            <span><strong>Confianza:</strong> ${foco.confianza.toUpperCase()} (${foco.confianza_numerica || 70}%)</span>
            <span><strong>Resolución Sensor:</strong> 375 m píxel de alta precisión</span>
            <span><strong>Fecha / Hora Obs:</strong> ${foco.fecha_hora}</span>
            <span><strong>Coordenadas:</strong> ${foco.latitud.toFixed(4)}, ${foco.longitud.toFixed(4)}</span>
          </div>
          <button onclick="window.__willai_create_incident && window.__willai_create_incident(${foco.latitud}, ${foco.longitud})" style="
            margin-top: 8px;
            background: #f59e0b;
            color: #030712;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            box-shadow: 0 2px 4px rgba(245, 158, 11, 0.4);
          ">
            🔥 Registrar Incidente en este Foco
          </button>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [focosViirs, showViirs]);

  // Update SERFOR Layer
  useEffect(() => {
    const layer = layersRef.current.serfor;
    layer.clearLayers();
    if (!showSerfor) return;

    focosSerfor.forEach((foco) => {
      const customIcon = L.divIcon({
        html: `<div style="width: 16px; height: 16px; border-radius: 50%; background: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 10px #10b981;" title="SERFOR Perú"></div>`,
        className: 'custom-serfor-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([foco.latitud, foco.longitud], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 200px;">
          <span style="font-size: 10px; font-weight: 700; color: #10b981; text-transform: uppercase;">🌳 SERFOR PERÚ (Oficial)</span>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 4px 0;">Foco Georreferenciado</h4>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 2px;">
            <span><strong>FRP:</strong> ${foco.frp} MW</span>
            <span><strong>Fecha:</strong> ${foco.fecha_hora}</span>
            <span><strong>Coordenadas:</strong> ${foco.latitud.toFixed(4)}, ${foco.longitud.toFixed(4)}</span>
          </div>
          <button onclick="window.__willai_create_incident && window.__willai_create_incident(${foco.latitud}, ${foco.longitud})" style="
            margin-top: 8px;
            background: #10b981;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.4);
          ">
            🔥 Registrar Incidente en este Foco
          </button>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [focosSerfor, showSerfor]);

  // Update Wind ML Propagation Layer (12 Hours Forecast & Dispersion Cone)
  useEffect(() => {
    const layer = layersRef.current.vientoML;
    layer.clearLayers();
    if (!showVientoML || !viento12h || !viento12h.pronostico_12h) return;

    const pasoActivo = viento12h.pronostico_12h[selectedHourIdx] || viento12h.pronostico_12h[0];
    if (!pasoActivo) return;

    const conoGeoJSON = pasoActivo.cono_dispersion || viento12h.cono_principal_geojson;

    // Render dispersion cone polygon
    if (conoGeoJSON && conoGeoJSON.coordinates) {
      const riskColors: Record<string, string> = {
        critico: '#ef4444',
        alto: '#f97316',
        moderado: '#eab308',
        bajo: '#06b6d4'
      };
      const strokeColor = riskColors[pasoActivo.riesgo_propagacion] || '#06b6d4';

      const polygon = L.geoJSON(conoGeoJSON as any, {
        style: {
          color: strokeColor,
          weight: 2,
          fillColor: strokeColor,
          fillOpacity: 0.28,
          dashArray: '6, 6'
        }
      });

      polygon.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #38bdf8; text-transform: uppercase;">🌪️ MODELO ML PROPAGACIÓN VIENTO (12H)</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: ${strokeColor}; font-weight: 700;">
              ${pasoActivo.riesgo_propagacion.toUpperCase()}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
            Pronóstico: ${pasoActivo.hora_label} (+${pasoActivo.paso_hora}h)
          </h4>
          <div style="font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 3px;">
            <span><strong>Velocidad Viento:</strong> <span style="color: #38bdf8; font-weight: 700;">${pasoActivo.velocidad_kmh} km/h</span> (Ráfagas: ${pasoActivo.rafagas_kmh} km/h)</span>
            <span><strong>Viene desde:</strong> ${pasoActivo.direccion_viento_cardinal} (${pasoActivo.direccion_viento_grados}°)</span>
            <span><strong>Propaga fuego hacia:</strong> <strong style="color: #f97316;">${pasoActivo.hacia_cardinal} (${pasoActivo.rumbo_propagacion_grados}°)</strong></span>
            <span><strong>Algoritmo:</strong> ${viento12h.metricas_entrenamiento?.algoritmo || 'Random Forest Multi-Output'} (R²: ${viento12h.metricas_entrenamiento?.r2_score || 0.72})</span>
          </div>
        </div>
      `);
      layer.addLayer(polygon);

      // Render directional arrow indicator at center origin
      const angle = pasoActivo.rumbo_propagacion_grados;
      const arrowHtml = `
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid ${strokeColor};
          box-shadow: 0 0 16px ${strokeColor};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <div style="transform: rotate(${angle}deg); color: ${strokeColor}; font-size: 20px; font-weight: 900; line-height: 1;">
            ➔
          </div>
        </div>
      `;

      const arrowIcon = L.divIcon({
        html: arrowHtml,
        className: 'custom-wind-arrow',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const arrowMarker = L.marker(CORACORA_COORDS, { icon: arrowIcon });
      arrowMarker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 220px;">
          <div style="color: #38bdf8; font-size: 11px; font-weight: 700;">VECTOR DE VIENTO ML: HORA +${pasoActivo.paso_hora}</div>
          <p style="font-size: 12px; margin: 4px 0; color: #ffffff;">
            El fuego y el humo avanzarán con rumbo <strong>${pasoActivo.rumbo_propagacion_grados}° (${pasoActivo.hacia_cardinal})</strong> a <strong>${pasoActivo.velocidad_kmh} km/h</strong>.
          </p>
        </div>
      `);
      layer.addLayer(arrowMarker);
    }
  }, [viento12h, showVientoML, selectedHourIdx]);

  // Update Occurrence Risk Grid Layer (Machine Learning Susceptibility Grid)
  useEffect(() => {
    const layer = layersRef.current.riesgoOcurrencia;
    layer.clearLayers();
    if (!showRiesgoOcurrencia || !grillaOcurrencia || !grillaOcurrencia.features) return;

    try {
      const geoJsonLayer = L.geoJSON(grillaOcurrencia as any, {
        style: (feat) => {
          const p = feat?.properties || {};
          const color = p.color_hex || '#f59e0b';
          return {
            color: color,
            weight: 1.8,
            opacity: 0.95,
            fillColor: color,
            fillOpacity: 0.32,
            dashArray: '4, 4'
          };
        },
        onEachFeature: (feat, layerItem: any) => {
          const p = feat.properties || {};
          const color = p.color_hex || '#f59e0b';

          layerItem.on({
            mouseover: () => {
              layerItem.setStyle({
                weight: 3,
                fillOpacity: 0.65,
                dashArray: ''
              });
            },
            mouseout: () => {
              geoJsonLayer.resetStyle(layerItem);
            }
          });

          layerItem.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; color: #f8fafc; padding: 4px; min-width: 240px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                <strong style="color: ${color}; text-transform: uppercase; font-size: 12.5px;">
                  🛡️ Riesgo ML: ${(p.nivel_riesgo || 'bajo').toUpperCase()} (${p.probabilidad_pct ?? 0}%)
                </strong>
                <span style="font-size: 10px; color: #94a3b8; font-family: monospace;">#Celda ${p.id_celda}</span>
              </div>
              <div style="grid-template-columns: 1fr 1fr; display: grid; gap: 4px; font-size: 11px; margin-bottom: 6px;">
                <div><span style="color: #94a3b8;">Distrito:</span> <b style="color: #38bdf8;">${p.distrito || 'Parinacochas'}</b></div>
                <div><span style="color: #94a3b8;">C. Poblado:</span> <b style="color: #fb923c;">${p.comunidad_cercana}</b></div>
                <div><span style="color: #94a3b8;">Elevación:</span> <b style="color: #fff;">${p.elevacion_m} m</b></div>
                <div><span style="color: #94a3b8;">Pendiente:</span> <b style="color: #fff;">${p.pendiente_deg}°</b></div>
                <div><span style="color: #94a3b8;">Distancia C.P.:</span> <b style="color: #fff;">${p.distancia_comunidad_km} km</b></div>
                <div><span style="color: #94a3b8;">FWI Canadiense:</span> <b style="color: #f87171;">${p.fwi}</b></div>
                <div><span style="color: #94a3b8;">Temperatura:</span> <b style="color: #fb923c;">${p.temperatura_c} °C</b></div>
                <div><span style="color: #94a3b8;">Humedad:</span> <b style="color: #38bdf8;">${p.humedad_pct ?? 40} %</b></div>
              </div>
              <div style="font-size: 10px; color: #cbd5e1; background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);">
                <span>🛰️ Modelo: Random Forest Calibrado (Platt)</span><br/>
                <span>⏱️ Actualizado: ${p.fecha_actualizacion}</span>
              </div>
            </div>
          `);
        }
      });
      layer.addLayer(geoJsonLayer);
      if (mapInstanceRef.current && !mapInstanceRef.current.hasLayer(layer)) {
        layer.addTo(mapInstanceRef.current);
      }
    } catch (e) {
      console.warn('Error al renderizar capa GeoJSON de ocurrencia:', e);
    }
  }, [grillaOcurrencia, showRiesgoOcurrencia]);

  // Update Fire Propagation Isochrones Layer (Cell2Fire Eliptico Andino: 1h Amarillo, 3h Naranja, 6h Rojo)
  useEffect(() => {
    const layer = layersRef.current.isocronasSimulacion;
    layer.clearLayers();
    if (!showSimulacionIsocronas || !simulacionGeojson || !simulacionGeojson.features) return;

    try {
      // Ordenar descendente por hora_paso (6h abajo, 3h medio, 1h arriba) para evitar oclusión visual
      const sortedFeatures = [...simulacionGeojson.features].sort(
        (a: any, b: any) => (b.properties?.hora_paso || 0) - (a.properties?.hora_paso || 0)
      );

      const isocronasLayer = L.geoJSON({ type: 'FeatureCollection', features: sortedFeatures } as any, {
        style: (feat) => {
          const p = feat?.properties || {};
          const hora = p.hora_paso;
          // Anillos cromáticos requeridos: 1h amarillo (#FBBF24), 3h naranja (#F97316), 6h rojo (#EF4444)
          const color = hora === 1 ? '#FBBF24' : hora === 3 ? '#F97316' : '#EF4444';
          const fillOpacity = hora === 1 ? 0.40 : hora === 3 ? 0.30 : 0.22;
          return {
            color: color,
            weight: 2.8,
            opacity: 0.95,
            fillColor: color,
            fillOpacity: fillOpacity,
            dashArray: hora === 6 ? '6, 6' : undefined
          };
        },
        onEachFeature: (feat, layerItem: any) => {
          const p = feat.properties || {};
          const hora = p.hora_paso;
          const color = hora === 1 ? '#FBBF24' : hora === 3 ? '#F97316' : '#EF4444';

          layerItem.on({
            mouseover: () => {
              layerItem.setStyle({ weight: 4.5, fillOpacity: 0.60 });
            },
            mouseout: () => {
              isocronasLayer.resetStyle(layerItem);
            }
          });

          layerItem.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; color: #f8fafc; padding: 6px; min-width: 250px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 4px;">
                <strong style="color: ${color}; text-transform: uppercase; font-size: 13px;">
                  🔥 Isócrona +${hora} Horas
                </strong>
                <span style="font-size: 11.5px; color: #38bdf8; font-weight: 800;">${p.area_hectareas} ha</span>
              </div>
              <div style="grid-template-columns: 1fr 1fr; display: grid; gap: 4px; font-size: 11px; margin-bottom: 8px;">
                <div><span style="color: #94a3b8;">Velocidad Máx:</span> <b style="color: #fff;">${p.velocidad_max_m_min ?? 'N/D'} m/min</b></div>
                <div><span style="color: #94a3b8;">Celdas quemadas:</span> <b style="color: #fff;">${p.celdas_quemadas ?? 'N/D'}</b></div>
                <div><span style="color: #94a3b8;">Motor:</span> <b style="color: #a78bfa;">Elíptico Andino</b></div>
                <div><span style="color: #94a3b8;">Resolución:</span> <b style="color: #fff;">30m (Copernicus DEM)</b></div>
              </div>
              <div style="font-size: 10px; color: #fef08a; background: rgba(234, 88, 12, 0.28); border: 1px solid rgba(245, 158, 11, 0.5); padding: 6px 8px; border-radius: 4px; line-height: 1.3;">
                ⚠️ <strong>Simulación pendiente de aprobación COEP/COEL</strong> — No calibrada con dNBR.
              </div>
            </div>
          `);
        }
      });

      // Renderizar punto de ignición central simulado
      if (simulacionGeojson.punto_ignicion && simulacionGeojson.punto_ignicion.coordinates) {
        const [ignLon, ignLat] = simulacionGeojson.punto_ignicion.coordinates;
        const ignMarker = L.circleMarker([ignLat, ignLon], {
          radius: 7,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#ea580c',
          fillOpacity: 1.0
        }).bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #fff; padding: 4px;">
            <strong style="color: #f97316;">📍 Punto de Ignición Simulado</strong>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-top: 2px;">
              Lat: ${ignLat.toFixed(5)}<br/>Lon: ${ignLon.toFixed(5)}
            </div>
            <div style="font-size: 10px; color: #a78bfa; margin-top: 4px;">Simulación #${simulacionGeojson.simulacion_id}</div>
          </div>
        `);
        layer.addLayer(ignMarker);
      }

      layer.addLayer(isocronasLayer);
      if (mapInstanceRef.current && !mapInstanceRef.current.hasLayer(layer)) {
        layer.addTo(mapInstanceRef.current);
      }

      // Auto-centrar suavemente en la zona de la simulación
      if (mapInstanceRef.current && isocronasLayer.getBounds().isValid()) {
        mapInstanceRef.current.fitBounds(isocronasLayer.getBounds(), { padding: [40, 40], maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Error al renderizar capa de isócronas de propagación:', e);
    }
  }, [simulacionGeojson, showSimulacionIsocronas]);

  // Update Incidentes Layer (Generic Circular Markers, excluding closed incidents)
  useEffect(() => {
    const layer = layersRef.current.incidentes;
    layer.clearLayers();
    if (!showIncidentes) return;

    // Filter OUT closed incidents so they never appear on the tactical map
    const incidentesActivos = incidentes.filter((inc) => inc.estado !== 'cerrado');

    incidentesActivos.forEach((inc) => {
      const isCritical = inc.severidad === 'critica' || inc.severidad === 'alta';
      const isSelected = selectedIncidente?.id === inc.id;
      const bgColor = inc.estado === 'controlado' ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';

      const iconHtml = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${bgColor};
          border: ${isSelected ? '3px solid #38bdf8' : '2px solid #ffffff'};
          box-shadow: 0 0 ${isSelected ? '20px #38bdf8' : '14px ' + bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
        " title="${inc.codigo}: ${inc.titulo}">
          ${inc.estado === 'controlado' ? '✓' : '!'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-inc-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([inc.latitud, inc.longitud], {
        icon: customIcon,
        zIndexOffset: isSelected ? 2500 : 2000
      });
      marker.on('click', () => onSelectIncidente(inc));
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #fb923c; font-family: var(--font-mono);">${inc.codigo}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); text-transform: uppercase;">${inc.estado.replace('_', ' ')}</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${inc.titulo}</h4>
          <p style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px;">${inc.descripcion}</p>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 2px;">
            <span><strong>Comunidad:</strong> ${inc.comunidad}</span>
            <span><strong>Viviendas en riesgo:</strong> <strong style="color: #ef4444;">${inc.viviendas_riesgo}</strong></span>
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px;">
            <span style="color: #94a3b8;">🛡️ Brigadas desplegadas: </span>
            <strong style="color: #38bdf8;">
              ${inc.brigadas_asignadas && inc.brigadas_asignadas.length > 0 ? inc.brigadas_asignadas.join(', ') : 'Ninguna asignada aún'}
            </strong>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [incidentes, showIncidentes, selectedIncidente, onSelectIncidente]);

  // Update Brigadas Layer with Tactical Dispatch Vectors
  useEffect(() => {
    const layer = layersRef.current.brigadas;
    layer.clearLayers();
    if (!showBrigadas) return;

    brigadas.forEach((brigada) => {
      if (!brigada.latitud || !brigada.longitud) return;

      const isDispatched = brigada.estado === 'desplegada' || brigada.estado === 'en_operacion' || !!brigada.incidente_asignado;
      const color = isDispatched ? '#06b6d4' : '#10b981';

      // 1. Draw animated tactical deployment polyline to assigned incident
      if (isDispatched && brigada.incidente_asignado) {
        const destLat = brigada.incidente_asignado.latitud;
        const destLon = brigada.incidente_asignado.longitud;

        if (destLat && destLon) {
          const dispatchLine = L.polyline(
            [
              [brigada.latitud, brigada.longitud],
              [destLat, destLon]
            ],
            {
              color: '#38bdf8',
              weight: 3,
              opacity: 0.9,
              dashArray: '6, 8',
              className: 'tactical-dispatch-line'
            }
          );

          dispatchLine.bindPopup(`
            <div style="font-family: var(--font-sans); min-width: 210px;">
              <span style="font-size: 10px; font-weight: 700; color: #38bdf8; text-transform: uppercase;">🛡️ RUTA DE DESPACHO OPERATIVO</span>
              <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 3px 0;">${brigada.nombre}</h4>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
                ➔ <strong>Destino:</strong> <span style="color: #fb923c; font-weight: 700;">${brigada.incidente_asignado.codigo}</span> (${brigada.incidente_asignado.titulo})
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Misión: <strong style="color: #38bdf8;">${brigada.incidente_asignado.rol.replace('_', ' ').toUpperCase()}</strong>
              </div>
            </div>
          `);

          layer.addLayer(dispatchLine);
        }
      }

      // 2. Custom Marker for Brigade with Active/Ready badges
      const iconHtml = `
        <div class="${isDispatched ? 'brigade-deployed-pulse' : ''}" style="
          position: relative;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #090d16;
          border: 2px solid ${color};
          box-shadow: 0 0 ${isDispatched ? '16px rgba(6, 182, 212, 0.7)' : '10px rgba(16, 185, 129, 0.4)'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          cursor: pointer;
        " title="${brigada.nombre} (${isDispatched ? 'Desplegada' : 'Disponible'})">
          🛡️
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isDispatched ? '#0284c7' : '#059669'};
            color: #ffffff;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 3px;
            white-space: nowrap;
            letter-spacing: 0.4px;
          ">
            ${isDispatched ? 'DESPACHADA' : 'DISPONIBLE'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-brigada-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([brigada.latitud, brigada.longitud], {
        icon: customIcon,
        zIndexOffset: isDispatched ? 2200 : 1800
      });

      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase;">
              ${isDispatched ? '🛡️ BRIGADA DESPLEGADA' : '🛡️ BRIGADA DISPONIBLE'}
            </span>
            <span style="font-size: 9.5px; padding: 2px 6px; border-radius: 4px; background: ${isDispatched ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${color}; font-weight: 700;">
              ${isDispatched ? 'EN OPERACIÓN' : 'BASE OPERATIVA'}
            </span>
          </div>
          <h4 style="font-size: 13.5px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">${brigada.nombre}</h4>
          <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 6px;">${brigada.entidad}</span>

          ${brigada.incidente_asignado ? `
            <div style="margin: 8px 0; padding: 8px; background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 6px; font-size: 11.5px;">
              <div style="color: #38bdf8; font-weight: 700;">➔ Despachada al Incidente:</div>
              <div style="color: #ffffff; font-weight: 700; margin-top: 2px;">
                ${brigada.incidente_asignado.codigo}: ${brigada.incidente_asignado.titulo}
              </div>
              <div style="color: #cbd5e1; margin-top: 4px;">
                Misión: <strong style="color: #fb923c;">${brigada.incidente_asignado.rol.replace('_', ' ').toUpperCase()}</strong>
              </div>
            </div>
          ` : ''}

          <div style="font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 3px;">
            <span><strong>Efectivos:</strong> ${brigada.numero_efectivos} rescatistas equipados</span>
            <span><strong>Líder al mando:</strong> ${brigada.lider}</span>
            <span><strong>Contacto radial/móvil:</strong> ${brigada.telefono}</span>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [brigadas, showBrigadas]);

  // Render Viviendas Rurales Layer
  useEffect(() => {
    const layer = layersRef.current.viviendas;
    layer.clearLayers();

    if (!showViviendas || !viviendas || viviendas.length === 0) return;

    if (mapInstanceRef.current && !mapInstanceRef.current.hasLayer(layer)) {
      layer.addTo(mapInstanceRef.current);
    }

    viviendas.forEach((viv) => {
      const lat = typeof viv.latitud === 'string' ? parseFloat(viv.latitud) : Number(viv.latitud);
      const lon = typeof viv.longitud === 'string' ? parseFloat(viv.longitud) : Number(viv.longitud);
      if (lat == null || lon == null || isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return;

      const isVulnerable = viv.material === 'tapial' || viv.material === 'quincha' || viv.material === 'madera';
      const markerBorder = isVulnerable ? '#ef4444' : '#f59e0b';
      const markerBg = isVulnerable ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';

      const icon = L.divIcon({
        className: 'custom-vivienda-tactical-marker',
        html: `
          <div style="
            width: 26px;
            height: 26px;
            background: #0f172a;
            border: 2px solid ${markerBorder};
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            box-shadow: 0 0 10px ${markerBg}, 0 2px 8px rgba(0,0,0,0.85);
            cursor: pointer;
            transition: transform 0.15s ease;
          " title="${viv.codigo} (${viv.comunidad}): ${viv.referencia}">
            🏠
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([lat, lon], { icon, zIndexOffset: 950 });

      const popupHtml = `
        <div style="font-family: Inter, sans-serif; min-width: 210px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
            <span style="font-size: 13px; font-weight: 800; color: #f8fafc;">🏠 ${viv.codigo}</span>
            <span style="font-size: 10px; background: ${viv.verificada ? 'rgba(16,185,129,0.2)' : 'rgba(156,163,175,0.2)'}; color: ${viv.verificada ? '#10b981' : '#9ca3af'}; border: 1px solid ${viv.verificada ? '#10b981' : '#6b7280'}; padding: 1px 5px; border-radius: 3px; font-weight: 700;">
              ${viv.verificada ? 'Verificada' : 'Pendiente'}
            </span>
          </div>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 700; margin-bottom: 4px;">📍 Sector ${viv.comunidad}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px; line-height: 1.3;">${viv.referencia || 'Sin referencia'}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;"><strong>Responsable:</strong> ${viv.nombre_responsable || 'Familia comunera'}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;"><strong>Habitantes:</strong> ${viv.habitantes} personas</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;"><strong>Material:</strong> <span style="color: ${markerBorder}; font-weight: 700;">${viv.material_display || viv.material}</span></div>
          ${viv.telefono_contacto ? `<div style="font-size: 11px; color: #10b981; font-weight: 700; margin-top: 4px;">📞 ${viv.telefono_contacto}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      layer.addLayer(marker);
    });
  }, [viviendas, showViviendas]);

  // Update Parinacochas Provincial Boundary Layer (Official IGN / INEI Demarcation)
  // Purely territorial reference with other provinces - zero hover tooltips or mouse capture
  useEffect(() => {
    const layer = layersRef.current.limiteProvincial;
    layer.clearLayers();
    if (!showLimiteProvincial) return;

    try {
      const provGeoJson = L.geoJSON(LIMITE_PROVINCIAL_PARINACOCHAS as any, {
        interactive: false, // Disables all hover events, tooltips, and pointer capture
        style: {
          color: '#38bdf8', // Tactical Sky Cyan border
          weight: 2.4,
          opacity: 0.92,
          dashArray: '8, 6',
          fillColor: '#0284c7',
          fillOpacity: 0.02,
        },
      });

      layer.addLayer(provGeoJson);

      // Subtle, non-intrusive boundary references indicating neighboring provinces
      REFERENCIAS_PROVINCIAS_LIMITROFES.forEach((ref) => {
        const badgeHtml = `
          <div style="
            pointer-events: none;
            user-select: none;
            font-family: monospace;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: #94a3b8;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(4px);
            border: 1px dashed rgba(56, 189, 248, 0.45);
            border-radius: 4px;
            padding: 2px 7px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
          ">
            ${ref.nombre}
          </div>
        `;

        const icon = L.divIcon({
          html: badgeHtml,
          className: 'tactical-border-ref',
          iconSize: [160, 20],
          iconAnchor: [80, 10],
        });

        const marker = L.marker([ref.lat, ref.lon], { icon, interactive: false, zIndexOffset: 200 });
        layer.addLayer(marker);
      });
    } catch (e) {
      console.warn('Error al renderizar límite provincial de Parinacochas:', e);
    }
  }, [showLimiteProvincial]);

  // Update Parinacochas Internal District Boundaries (Optional subtle lines)
  // Completely passive reference lines - zero hover tooltips or popups
  useEffect(() => {
    const layer = layersRef.current.distritos;
    layer.clearLayers();
    if (!showLimiteProvincial || !showDistritos) return;

    try {
      const distGeoJson = L.geoJSON(LIMITES_DISTRITALES_PARINACOCHAS as any, {
        interactive: false, // Completely passive, no hover events or tooltips
        style: {
          color: '#475569', // Subtle slate interior division
          weight: 1.1,
          opacity: 0.55,
          dashArray: '3, 4',
          fillColor: 'transparent',
          fillOpacity: 0,
        },
      });

      layer.addLayer(distGeoJson);
    } catch (e) {
      console.warn('Error al renderizar distritos de Parinacochas:', e);
    }
  }, [showLimiteProvincial, showDistritos]);

  // Render Red Vial Oficial MTC / IGN (Nacional, Departamental, Vecinal)
  useEffect(() => {
    const layer = layersRef.current.carreteras;
    layer.clearLayers();
    if (!showCarreteras) return;

    const renderCarreteras = (data: any) => {
      try {
        const geoLayer = L.geoJSON(data, {
          style: (feat) => {
            const cat = feat?.properties?.categoria;
            if (cat === 'Nacional') {
              return {
                color: '#f59e0b', // Ámbar dorado para Red Vial Nacional (PE-32, PE-30A, etc.)
                weight: 3.5,
                opacity: 0.95,
              };
            } else if (cat === 'Departamental') {
              return {
                color: '#38bdf8', // Azul cielo táctico para Red Departamental (AY-117, AY-118, etc.)
                weight: 2.4,
                opacity: 0.90,
              };
            } else if (cat === 'Trocha') {
              return {
                color: '#fde047', // Amarillo arena brillante para trochas carrozables cortafuego
                weight: 2.0,
                opacity: 0.90,
                dashArray: '6, 4',
              };
            } else if (cat === 'Sendero') {
              return {
                color: '#94a3b8', // Gris pizarra para senderos peatonales / herradura
                weight: 1.2,
                opacity: 0.70,
                dashArray: '2, 4',
              };
            } else {
              // Vecinal / Rural
              return {
                color: '#e2e8f0', // Blanco hueso / plata para caminos vecinales
                weight: 1.6,
                opacity: 0.85,
                dashArray: '4, 4',
              };
            }
          },
          onEachFeature: (feature, l) => {
            const p = feature.properties || {};
            let catBadgeColor = '#94a3b8';
            let catIcon = '🚗';
            if (p.categoria === 'Nacional') {
              catBadgeColor = '#f59e0b';
              catIcon = '🛣️';
            } else if (p.categoria === 'Departamental') {
              catBadgeColor = '#38bdf8';
              catIcon = '🚗';
            } else if (p.categoria === 'Trocha') {
              catBadgeColor = '#fde047';
              catIcon = '🚜';
            } else if (p.categoria === 'Sendero') {
              catBadgeColor = '#94a3b8';
              catIcon = '🥾';
            } else {
              catBadgeColor = '#e2e8f0';
              catIcon = '🚙';
            }

            l.bindTooltip(
              `<div style="font-size: 11px; font-weight: 700; color: #f8fafc;">
                ${catIcon} ${p.codigo || 'S/C'}: ${p.nombre || p.tipo_red} ${p.es_cortafuego ? '🛡️ [Cortafuego]' : ''}
              </div>`,
              { sticky: true, opacity: 0.95 }
            );

            l.bindPopup(`
              <div style="font-family: var(--font-sans); min-width: 240px; padding: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; color: ${catBadgeColor}; text-transform: uppercase;">
                    ${catIcon} ${p.tipo_red || 'RED VIAL'}
                  </span>
                  <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #cbd5e1; font-family: var(--font-mono); font-weight: 700;">
                    ${p.codigo || 'SINAC'}
                  </span>
                </div>
                <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">
                  ${p.nombre || 'Carretera / Trocha'}
                </h4>
                <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">
                  <span><strong>Categoría:</strong> <strong style="color: ${catBadgeColor};">${p.categoria}</strong></span>
                  <span><strong>Superficie:</strong> <strong style="color: #cbd5e1;">${p.superficie || 'Afirmado'}</strong></span>
                  <span><strong>Fuente:</strong> ${p.fuente || 'MTC / IGN / OSM'}</span>
                  ${
                    p.es_cortafuego
                      ? `<div style="margin-top: 4px; padding: 4px 8px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                          🛡️ <span>Barrera física / cortafuego activo en simulador</span>
                        </div>`
                      : ''
                  }
                </div>
              </div>
            `);
          },
        });

        layer.addLayer(geoLayer);
      } catch (err) {
        console.warn('Error al renderizar capa de carreteras:', err);
      }
    };

    if (cachedCarreterasGeoJson) {
      renderCarreteras(cachedCarreterasGeoJson);
    } else {
      fetch('/data/carreteras_parinacochas.geojson')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          cachedCarreterasGeoJson = data;
          renderCarreteras(data);
        })
        .catch((err) => console.warn('Error al cargar carreteras_parinacochas.geojson:', err));
    }
  }, [showCarreteras]);

  // Render Red Hidrográfica Oficial ANA (Ríos y Quebradas)
  useEffect(() => {
    const layer = layersRef.current.rios;
    layer.clearLayers();
    if (!showRios) return;

    const renderRios = (data: any) => {
      try {
        const geoLayer = L.geoJSON(data, {
          style: (feat) => {
            const tipo = feat?.properties?.tipo;
            if (tipo === 'Río') {
              return {
                color: '#06b6d4', // Cyan / Aqua para ríos principales y secundarios
                weight: 2.3,
                opacity: 0.88,
              };
            } else {
              // Quebrada
              return {
                color: '#38bdf8', // Azul hielo para quebradas
                weight: 1.2,
                opacity: 0.65,
                dashArray: '3, 4',
              };
            }
          },
          onEachFeature: (feature, l) => {
            const p = feature.properties || {};

            l.bindTooltip(
              `<div style="font-size: 11px; font-weight: 700; color: #f8fafc;">
                💧 ${p.nombre} (${p.tipo})
              </div>`,
              { sticky: true, opacity: 0.95 }
            );

            l.bindPopup(`
              <div style="font-family: var(--font-sans); min-width: 210px; padding: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; color: #06b6d4; text-transform: uppercase;">
                    💧 RED HIDROGRÁFICA
                  </span>
                  <span style="font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: rgba(6, 182, 212, 0.15); color: #38bdf8; font-weight: 700;">
                    ${p.tipo}
                  </span>
                </div>
                <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">
                  ${p.nombre}
                </h4>
                <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 3px;">
                  <span><strong>Jerarquía:</strong> <strong style="color: #cbd5e1;">${p.jerarquia || 'Corriente natural'}</strong></span>
                  <span><strong>Cuenca:</strong> <strong style="color: #38bdf8;">${p.cuenca || 'Cuenca Parinacochas'}</strong></span>
                  <span><strong>Fuente:</strong> ${p.fuente || 'ANA / IGN Carta Nacional'}</span>
                </div>
              </div>
            `);
          },
        });

        layer.addLayer(geoLayer);
      } catch (err) {
        console.warn('Error al renderizar red hidrográfica:', err);
      }
    };

    if (cachedRiosGeoJson) {
      renderRios(cachedRiosGeoJson);
    } else {
      fetch('/data/rios_parinacochas.geojson')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          cachedRiosGeoJson = data;
          renderRios(data);
        })
        .catch((err) => console.warn('Error al cargar rios_parinacochas.geojson:', err));
    }
  }, [showRios]);

  const handleCenterCoracora = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(CORACORA_COORDS, 13, { duration: 1.2 });
    }
  };

  const handleFitParinacochas = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(
        [-15.60, -74.20],
        [-14.50, -73.35]
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [25, 25], duration: 1.2 });
    }
  };

  const handleApplyCustom = () => {
    if (onApplyCustomDates) {
      onApplyCustomDates(inputDesde, inputHasta);
    }
    onChangeTimeRange('custom');
    setIsDateModalOpen(false);
  };

  return (
    <div className="map-viewport">
      <div id="leaflet-map" ref={mapContainerRef} />

      {/* ========================================================
          NASA FIRMS Style Top Timeline Bar (Matching Screenshot)
          ======================================================== */}
      <div className="nasa-timeline-header">
        <div className="nasa-timeline-title">
          <Calendar size={14} color="#fb923c" />
          <span>ACTIVIDAD HISTÓRICA:</span>
        </div>

        <div className="nasa-time-btn-group">
          <button
            id="time-btn-today"
            className={`nasa-time-btn ${timeRange === 'today' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('today')}
            title="Detecciones de hoy"
          >
            TODAY
          </button>
          <button
            id="time-btn-24h"
            className={`nasa-time-btn ${timeRange === '24h' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('24h')}
            title="Últimas 24 Horas"
          >
            24HRS
          </button>
          <button
            id="time-btn-7d"
            className={`nasa-time-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('7d')}
            title="Últimos 7 días"
          >
            7DAYS
          </button>
          <button
            id="time-btn-30d"
            className={`nasa-time-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('30d')}
            title="Último mes (30 días)"
          >
            30 DÍAS
          </button>
          <button
            id="time-btn-3m"
            className={`nasa-time-btn ${timeRange === '3m' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('3m')}
            title="Últimos 3 meses"
          >
            3 MESES
          </button>
          <button
            id="time-btn-6m"
            className={`nasa-time-btn ${timeRange === '6m' ? 'active' : ''}`}
            onClick={() => onChangeTimeRange('6m')}
            title="Últimos 6 meses (180 días)"
          >
            6 MESES
          </button>
        </div>

        {/* Custom Calendar Date Picker Button */}
        <button
          id="btn-calendar-range"
          className={`nasa-calendar-btn ${timeRange === 'custom' ? 'active' : ''}`}
          onClick={() => setIsDateModalOpen(true)}
          title="Seleccionar rango de fechas personalizado"
        >
          <Calendar size={13} />
          <span>{timeRange === 'custom' ? `${inputDesde} / ${inputHasta}` : 'Calendario'}</span>
        </button>
      </div>

      {/* Floating Tactical Layer Toggles (Matching Screenshot Layers) */}
      <div className="map-floating-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '6px', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
            CAPAS & SENSORES
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              id="btn-fit-parinacochas"
              className="btn-admin btn-admin-outline"
              style={{ padding: '2px 6px', fontSize: '10.5px', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              onClick={handleFitParinacochas}
              title="Encuadrar todo el territorio de la Provincia de Parinacochas"
            >
              🇵🇪 Parinacochas
            </button>
            <button
              id="btn-recenter"
              className="btn-admin btn-admin-outline"
              style={{ padding: '2px 6px', fontSize: '10.5px' }}
              onClick={handleCenterCoracora}
              title="Centrar en Coracora (Capital)"
            >
              🎯 Coracora
            </button>
          </div>
        </div>

        {/* MODIS Sensor Toggle */}
        <label className="map-layer-toggle" id="layer-modis-toggle">
          <input
            type="checkbox"
            checked={showModis}
            onChange={(e) => onToggleModis(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <span style={{ color: '#ef4444' }}>■</span> MODIS (Aqua & Terra) [1km] ({focosModis.length})
          </span>
        </label>

        {/* VIIRS Sensor Toggle */}
        <label className="map-layer-toggle" id="layer-viirs-toggle">
          <input
            type="checkbox"
            checked={showViirs}
            onChange={(e) => onToggleViirs(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f59e0b' }}>●</span> VIIRS (NOAA-20/21) [375m] ({focosViirs.length})
          </span>
        </label>

        {/* SERFOR Perú Toggle */}
        <label className="map-layer-toggle" id="layer-serfor-toggle">
          <input
            type="checkbox"
            checked={showSerfor}
            onChange={(e) => onToggleSerfor(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>▲</span> SERFOR Oficial ({focosSerfor.length})
          </span>
        </label>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

        {/* Wind ML 12h Propagation Layer Toggle */}
        <label className="map-layer-toggle" id="layer-viento-ml-toggle" style={{ color: '#38bdf8' }}>
          <input
            type="checkbox"
            checked={showVientoML}
            onChange={(e) => onToggleVientoML(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Wind size={14} color="#38bdf8" /> Cono Viento ML (12h)
          </span>
        </label>

        {/* Occurrence Risk ML Grid Layer Toggle */}
        <label className="map-layer-toggle" id="layer-ocurrencia-ml-toggle" style={{ color: '#f59e0b' }}>
          <input
            type="checkbox"
            checked={showRiesgoOcurrencia}
            onChange={(e) => onToggleRiesgoOcurrencia?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <ShieldAlert size={14} color="#f59e0b" /> Riesgo Ocurrencia ML ({grillaOcurrencia?.features?.length || 0})
          </span>
        </label>
        {showRiesgoOcurrencia && (
          <div style={{ display: 'flex', gap: '6px', fontSize: '10px', paddingLeft: '22px', marginTop: '-3px', marginBottom: '2px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }}></span> &lt;25%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }}></span> 25-55%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#f97316', display: 'inline-block' }}></span> 55-80%</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#ef4444', display: 'inline-block' }}></span> &gt;80%</span>
          </div>
        )}

        {/* Fire Spread Simulation Isochrones (Cell2Fire Eliptico Andino) */}
        <label className="map-layer-toggle" id="layer-simulacion-isocronas-toggle" style={{ color: '#fb923c' }}>
          <input
            type="checkbox"
            checked={showSimulacionIsocronas}
            onChange={(e) => onToggleSimulacionIsocronas?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Flame size={14} color="#f97316" /> Isócronas Fuego ({simulacionGeojson?.features?.length || 0})
          </span>
        </label>
        {showSimulacionIsocronas && simulacionGeojson && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '10px', paddingLeft: '22px', marginTop: '-3px', marginBottom: '2px', color: '#cbd5e1' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }}></span> 1h
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316', display: 'inline-block' }}></span> 3h
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span> 6h
            </span>
          </div>
        )}

        {/* Incidentes & Brigadas */}
        <label className="map-layer-toggle" id="layer-inc-toggle">
          <input
            type="checkbox"
            checked={showIncidentes}
            onChange={(e) => onToggleIncidentes(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#fb923c' }}>●</span> Incidentes ({incidentes.filter((i) => i.estado !== 'cerrado').length})
          </span>
        </label>

        <label className="map-layer-toggle" id="layer-brig-toggle">
          <input
            type="checkbox"
            checked={showBrigadas}
            onChange={(e) => onToggleBrigadas(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#06b6d4' }}>■</span> Brigadas ({brigadas.length})
          </span>
        </label>

        <label className="map-layer-toggle" id="layer-viv-toggle">
          <input
            type="checkbox"
            checked={showViviendas}
            onChange={(e) => onToggleViviendas?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#f59e0b' }}>🏠</span> Viviendas ({viviendas.length})
          </span>
        </label>

        {/* Límite Territorial Oficial de Parinacochas (IGN / INEI) */}
        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

        <label className="map-layer-toggle" id="layer-limite-prov-toggle" style={{ color: '#38bdf8' }}>
          <input
            type="checkbox"
            checked={showLimiteProvincial}
            onChange={(e) => onToggleLimiteProvincial?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <MapPin size={14} color="#38bdf8" /> Límite Parinacochas (IGN)
          </span>
        </label>

        {showLimiteProvincial && (
          <label className="map-layer-toggle" id="layer-distritos-toggle" style={{ paddingLeft: '22px', fontSize: '11px', color: '#94a3b8' }}>
            <input
              type="checkbox"
              checked={showDistritos}
              onChange={(e) => onToggleDistritos?.(e.target.checked)}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🏛️</span> 8 Distritos e Hitos
            </span>
          </label>
        )}

        {/* Capas de Infraestructura Vial y Red Hidrográfica Oficial */}
        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

        <label className="map-layer-toggle" id="layer-carreteras-toggle" style={{ color: '#f59e0b' }}>
          <input
            type="checkbox"
            checked={showCarreteras}
            onChange={(e) => onToggleCarreteras?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Route size={14} color="#f59e0b" /> Vías y Trochas Cortafuego (713)
          </span>
        </label>

        <label className="map-layer-toggle" id="layer-rios-toggle" style={{ color: '#06b6d4' }}>
          <input
            type="checkbox"
            checked={showRios}
            onChange={(e) => onToggleRios?.(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Droplets size={14} color="#06b6d4" /> Red Hidrográfica ANA (378)
          </span>
        </label>
      </div>

      {/* Modal for Custom Date Range */}
      {isDateModalOpen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            right: '16px',
            zIndex: 600,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #38bdf8',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            width: '280px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.8)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              📅 Rango Histórico (Hasta 6 Meses)
            </h4>
            <button
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              onClick={() => setIsDateModalOpen(false)}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Desde (Inicio):
              </label>
              <input
                type="date"
                value={inputDesde}
                onChange={(e) => setInputDesde(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0b1324',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Hasta (Fin):
              </label>
              <input
                type="date"
                value={inputHasta}
                onChange={(e) => setInputHasta(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0b1324',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }}
              onClick={handleApplyCustom}
            >
              <Check size={14} />
              <span>Aplicar Filtro de Fechas</span>
            </button>
          </div>
        </div>
      )}

      {/* Badge de Advertencia Flotante de Simulación (COEP / COEL) */}
      {showSimulacionIsocronas && simulacionGeojson && (
        <div
          id="badge-advertencia-simulacion"
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid rgba(245, 158, 11, 0.7)',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 158, 11, 0.28)',
            borderRadius: '9999px',
            padding: '7px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', fontSize: '15px' }}>
            ⚠️
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fef08a', letterSpacing: '0.015em' }}>
              Simulación pendiente de aprobación COEP/COEL — No calibrada con dNBR
            </span>
            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              Modelo Elíptico Andino (Copernicus DEM 30m + Viento 12h) • Anillos: 1h (Amarillo), 3h (Naranja), 6h (Rojo)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
