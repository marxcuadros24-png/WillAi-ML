import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Calendar, Wind, Check } from 'lucide-react';
import type { Incidente, FocoCalor, Brigada, PrediccionViento12hData } from '../types';

interface TacticalMapProps {
  incidentes: Incidente[];
  focos: FocoCalor[];
  brigadas: Brigada[];
  viento12h: PrediccionViento12hData | null;
  onSelectIncidente: (incidente: Incidente) => void;
  // Sensor layer states
  showModis: boolean;
  showViirs: boolean;
  showSerfor: boolean;
  showVientoML: boolean;
  showIncidentes: boolean;
  showBrigadas: boolean;
  onToggleModis: (val: boolean) => void;
  onToggleViirs: (val: boolean) => void;
  onToggleSerfor: (val: boolean) => void;
  onToggleVientoML: (val: boolean) => void;
  onToggleIncidentes: (val: boolean) => void;
  onToggleBrigadas: (val: boolean) => void;
  // Timeline filter states
  timeRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom';
  onChangeTimeRange: (val: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => void;
  fechaDesde?: string;
  fechaHasta?: string;
  onApplyCustomDates?: (desde: string, hasta: string) => void;
  // Selected hour in 12h forecast
  selectedHourIdx?: number;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incidentes,
  focos,
  brigadas,
  viento12h,
  onSelectIncidente,
  showModis,
  showViirs,
  showSerfor,
  showVientoML,
  showIncidentes,
  showBrigadas,
  onToggleModis,
  onToggleViirs,
  onToggleSerfor,
  onToggleVientoML,
  onToggleIncidentes,
  onToggleBrigadas,
  timeRange,
  onChangeTimeRange,
  fechaDesde,
  fechaHasta,
  onApplyCustomDates,
  selectedHourIdx = 0
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [inputDesde, setInputDesde] = useState(fechaDesde || '2026-05-01');
  const [inputHasta, setInputHasta] = useState(fechaHasta || '2026-10-22');

  const layersRef = useRef<{
    modis: L.LayerGroup;
    viirs: L.LayerGroup;
    serfor: L.LayerGroup;
    vientoML: L.LayerGroup;
    incidentes: L.LayerGroup;
    brigadas: L.LayerGroup;
  }>({
    modis: L.layerGroup(),
    viirs: L.layerGroup(),
    serfor: L.layerGroup(),
    vientoML: L.layerGroup(),
    incidentes: L.layerGroup(),
    brigadas: L.layerGroup(),
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

    // Attach layers
    layersRef.current.modis.addTo(map);
    layersRef.current.viirs.addTo(map);
    layersRef.current.serfor.addTo(map);
    layersRef.current.vientoML.addTo(map);
    layersRef.current.incidentes.addTo(map);
    layersRef.current.brigadas.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Filter focos by sensor
  const focosModis = focos.filter((f) => f.sensor?.toUpperCase().includes('MODIS'));
  const focosViirs = focos.filter((f) => f.sensor?.toUpperCase().includes('VIIRS'));
  const focosSerfor = focos.filter((f) => f.fuente === 'SERFOR' || f.sensor?.toUpperCase().includes('SERFOR'));

  // Update MODIS Layer (1km pixel footprint + center flame)
  useEffect(() => {
    const layer = layersRef.current.modis;
    layer.clearLayers();
    if (!showModis) return;

    focosModis.forEach((foco) => {
      // Circle representing MODIS 1000m ground resolution footprint
      const circleFootprint = L.circle([foco.latitud, foco.longitud], {
        radius: 500, // 1km diameter footprint
        color: '#ef4444',
        weight: 1.5,
        fillColor: '#dc2626',
        fillOpacity: 0.22,
        dashArray: '4, 4'
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
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [focosModis, showModis]);

  // Update VIIRS Layer (375m resolution pulse)
  useEffect(() => {
    const layer = layersRef.current.viirs;
    layer.clearLayers();
    if (!showViirs) return;

    focosViirs.forEach((foco) => {
      const circleFootprint = L.circle([foco.latitud, foco.longitud], {
        radius: 187, // 375m footprint
        color: '#f59e0b',
        weight: 1.2,
        fillColor: '#f59e0b',
        fillOpacity: 0.18,
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
          </div>
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
          </div>
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

  // Update Incidentes Layer
  useEffect(() => {
    const layer = layersRef.current.incidentes;
    layer.clearLayers();
    if (!showIncidentes) return;

    incidentes.forEach((inc) => {
      const isCritical = inc.severidad === 'critica' || inc.severidad === 'alta';
      const bgColor = inc.estado === 'controlado' ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';

      const iconHtml = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${bgColor};
          border: 2px solid #ffffff;
          box-shadow: 0 0 16px ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          font-size: 13px;
          cursor: pointer;
        ">
          ${inc.estado === 'controlado' ? '✓' : '!'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-inc-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([inc.latitud, inc.longitud], { icon: customIcon });
      marker.on('click', () => onSelectIncidente(inc));
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; color: #fb923c; font-family: var(--font-mono);">${inc.codigo}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); text-transform: uppercase;">${inc.estado.replace('_', ' ')}</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${inc.titulo}</h4>
          <p style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px;">${inc.descripcion}</p>
          <div style="font-size: 11px; color: #94a3b8; display: flex; flex-direction: column; gap: 2px;">
            <span><strong>Comunidad:</strong> ${inc.comunidad}</span>
            <span><strong>Viviendas en riesgo:</strong> <strong style="color: #ef4444;">${inc.viviendas_riesgo}</strong></span>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [incidentes, showIncidentes, onSelectIncidente]);

  // Update Brigadas Layer
  useEffect(() => {
    const layer = layersRef.current.brigadas;
    layer.clearLayers();
    if (!showBrigadas) return;

    brigadas.forEach((brigada) => {
      if (!brigada.latitud || !brigada.longitud) return;
      const isOp = brigada.estado === 'en_operacion';
      const color = isOp ? '#06b6d4' : '#10b981';

      const iconHtml = `
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #0f172a;
          border: 2px solid ${color};
          box-shadow: 0 0 12px ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-weight: 800;
          font-size: 11px;
          font-family: var(--font-mono);
        ">
          B
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-brigada-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([brigada.latitud, brigada.longitud], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: var(--font-sans); min-width: 210px;">
          <div style="font-size: 10px; font-weight: 700; color: #06b6d4; text-transform: uppercase; margin-bottom: 4px;">BRIGADA DE COMBATE</div>
          <h4 style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">${brigada.nombre}</h4>
          <span style="font-size: 11px; color: #94a3b8; display: block; margin-bottom: 6px;">${brigada.entidad}</span>
          <div style="font-size: 11px; color: #cbd5e1; display: flex; flex-direction: column; gap: 2px;">
            <span><strong>Efectivos:</strong> ${brigada.numero_efectivos} rescatistas</span>
            <span><strong>Líder:</strong> ${brigada.lider}</span>
            <span><strong>Contacto:</strong> ${brigada.telefono}</span>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });
  }, [brigadas, showBrigadas]);

  const handleCenterCoracora = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(CORACORA_COORDS, 13, { duration: 1.2 });
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-accent)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
            CAPAS & SENSORES
          </span>
          <button
            id="btn-recenter"
            className="btn-secondary"
            style={{ padding: '2px 8px', fontSize: '10px' }}
            onClick={handleCenterCoracora}
            title="Centrar en Coracora"
          >
            🎯 Coracora
          </button>
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

        {/* Incidentes & Brigadas */}
        <label className="map-layer-toggle" id="layer-inc-toggle">
          <input
            type="checkbox"
            checked={showIncidentes}
            onChange={(e) => onToggleIncidentes(e.target.checked)}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#fb923c' }}>●</span> Incidentes ({incidentes.length})
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
    </div>
  );
};
