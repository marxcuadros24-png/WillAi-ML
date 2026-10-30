import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { IncidentePublico } from '../types';
import {
  LIMITE_PROVINCIAL_PARINACOCHAS,
  LIMITES_DISTRITALES_PARINACOCHAS,
} from '../data/demarcacionParinacochas';
import { Compass, Layers, Globe, Map as MapIcon } from 'lucide-react';

interface MapaPublicoIncidentesProps {
  incidentes: IncidentePublico[];
  selectedIncidenteId: number | null;
  onSelectIncidente: (incidente: IncidentePublico) => void;
}

export const MapaPublicoIncidentes: React.FC<MapaPublicoIncidentesProps> = ({
  incidentes,
  selectedIncidenteId,
  onSelectIncidente,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<number, L.Marker>>(new Map());
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'satelite' | 'calles'>('satelite');

  // Inicialización de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const CORACORA_COORDS: [number, number] = [-15.0189, -73.7806];

    const map = L.map(mapContainerRef.current, {
      center: CORACORA_COORDS,
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // 1. Capa Satelital Esri World Imagery (Exactamente igual a TacticalMap)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; WillAI Satelital Coracora',
        maxZoom: 18,
      }
    );

    // 2. Capa Callejera / Topográfica OpenStreetMap
    const osmLayer = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    // 3. Capa de Etiquetas Voyager
    const labelsLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CartoDB',
        maxZoom: 18,
        opacity: 0.9,
      }
    );

    // Activar satélite por defecto
    satLayer.addTo(map);
    labelsLayer.addTo(map);

    satelliteLayerRef.current = satLayer;
    streetLayerRef.current = osmLayer;
    labelsLayerRef.current = labelsLayer;

    // Límites distritales de Parinacochas
    if (LIMITES_DISTRITALES_PARINACOCHAS) {
      L.geoJSON(LIMITES_DISTRITALES_PARINACOCHAS as any, {
        interactive: false,
        style: {
          color: '#38bdf8',
          weight: 1.2,
          dashArray: '4, 4',
          fillColor: 'transparent',
        },
      }).addTo(map);
    }

    // Límite provincial de Parinacochas
    if (LIMITE_PROVINCIAL_PARINACOCHAS) {
      L.geoJSON(LIMITE_PROVINCIAL_PARINACOCHAS as any, {
        interactive: false,
        style: {
          color: '#f59e0b',
          weight: 2.2,
          fillColor: 'rgba(245, 158, 11, 0.05)',
          fillOpacity: 0.1,
        },
      }).addTo(map);
    }

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Observador de Redimensionamiento para garantizar carga inmediata de tiles
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Invalidaciones temporales en caso de transición CSS
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Alternar entre mapa satelital y mapa callejero
  const handleToggleMapType = () => {
    const map = mapInstanceRef.current;
    if (!map || !satelliteLayerRef.current || !streetLayerRef.current || !labelsLayerRef.current) return;

    if (mapType === 'satelite') {
      map.removeLayer(satelliteLayerRef.current);
      map.removeLayer(labelsLayerRef.current);
      streetLayerRef.current.addTo(map);
      setMapType('calles');
    } else {
      map.removeLayer(streetLayerRef.current);
      satelliteLayerRef.current.addTo(map);
      labelsLayerRef.current.addTo(map);
      setMapType('satelite');
    }
  };

  // Crear icono SVG para el marcador
  const createMarkerIcon = (inc: IncidentePublico, isSelected: boolean) => {
    const isActivo = ['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate'].includes(inc.estado);
    const isControlado = ['contenido', 'controlado'].includes(inc.estado);

    let color = '#10b981'; // Extinguido / Cerrado
    let pulseHtml = '';

    if (isActivo) {
      color = '#ef4444'; // Activo
      pulseHtml = `<span style="position:absolute;inset:-6px;border-radius:50%;background:rgba(239,68,68,0.5);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>`;
    } else if (isControlado) {
      color = '#f59e0b'; // Controlado
    }

    const scale = isSelected ? 'scale(1.3)' : 'scale(1)';
    const borderWidth = isSelected ? '3px' : '2px';
    const borderColor = isSelected ? '#38bdf8' : '#ffffff';

    return L.divIcon({
      className: 'custom-public-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;transition:transform 0.2s ease;transform:${scale};cursor:pointer;">
          ${pulseHtml}
          <div style="position:relative;width:28px;height:28px;border-radius:50%;background:${color};border:${borderWidth} solid ${borderColor};display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px ${isSelected ? '#38bdf8' : color};">
            ${
              isActivo
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>`
                : isControlado
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-8 9-8 9s-8-4-8-9V5l8-3 8 3z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
            }
          </div>
        </div>
      `,
    });
  };

  // Renderizar o actualizar marcadores
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    markerMapRef.current.clear();

    const validIncidents = incidentes.filter(
      (inc) => typeof inc.latitud === 'number' && typeof inc.longitud === 'number' && !isNaN(inc.latitud) && !isNaN(inc.longitud)
    );

    validIncidents.forEach((inc) => {
      const isSelected = inc.id === selectedIncidenteId;
      const icon = createMarkerIcon(inc, isSelected);

      const marker = L.marker([inc.latitud, inc.longitud], { icon });

      const fotoHtml =
        inc.fotografias && inc.fotografias.length > 0
          ? `<div style="margin-bottom:8px;border-radius:6px;overflow:hidden;max-height:120px;">
               <img src="${inc.fotografias[0]}" alt="${inc.titulo}" style="width:100%;height:120px;object-fit:cover;" />
             </div>`
          : '';

      const estadoColor = ['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate'].includes(inc.estado)
        ? '#ef4444'
        : ['contenido', 'controlado'].includes(inc.estado)
        ? '#f59e0b'
        : '#10b981';

      const popupContent = `
        <div style="font-family:var(--font-sans, sans-serif);color:#f8fafc;background:#0f172a;padding:12px;border-radius:8px;max-width:260px;font-size:12px;line-height:1.4;">
          ${fotoHtml}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:6px;">
            <span style="font-weight:700;font-size:11px;color:#94a3b8;font-family:monospace;">${inc.codigo}</span>
            <span style="background:${estadoColor}25;color:${estadoColor};border:1px solid ${estadoColor}66;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;">
              ${inc.estado_display}
            </span>
          </div>
          <h4 style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#f8fafc;">${inc.titulo}</h4>
          <p style="margin:0 0 4px 0;color:#cbd5e1;font-size:11px;">
            <strong>Sector:</strong> ${inc.comunidad_nombre} (${inc.distrito_nombre})
          </p>
          <p style="margin:0 0 6px 0;color:#94a3b8;font-size:11px;">
            <strong>Fecha:</strong> ${inc.fecha_display}
          </p>
          <div style="padding-top:6px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#94a3b8;">
            <strong>Reportante:</strong> <span style="color:${inc.identidad_autorizada ? '#38bdf8' : '#94a3b8'};">${inc.reportado_por}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'public-incident-popup',
        maxWidth: 280,
      });

      marker.on('click', () => {
        onSelectIncidente(inc);
      });

      marker.addTo(markersGroup);
      markerMapRef.current.set(inc.id, marker);
    });

    // Si no hay incidente individual seleccionado, ajustar el mapa para abarcar todos los incidentes
    if (!selectedIncidenteId && validIncidents.length > 0) {
      const coords = validIncidents.map((i) => [i.latitud, i.longitud] as [number, number]);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
    }
  }, [incidentes, selectedIncidenteId]);

  // Centrar y abrir popup cuando se selecciona un incidente
  useEffect(() => {
    if (!selectedIncidenteId) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    const inc = incidentes.find((i) => i.id === selectedIncidenteId);
    if (!inc) return;

    map.flyTo([inc.latitud, inc.longitud], 13, {
      duration: 1.0,
      easeLinearity: 0.25,
    });

    const marker = markerMapRef.current.get(selectedIncidenteId);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 400);
    }
  }, [selectedIncidenteId, incidentes]);

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([-15.0189, -73.7806], 11, { duration: 1 });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px', background: '#080c14', overflow: 'hidden' }}>
      {/* Contenedor Leaflet con id dedicado y dimensiones forzadas */}
      <div
        id="leaflet-map-publico"
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '520px',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#080c14',
          zIndex: 1
        }}
      />

      {/* Botones de control flotantes en esquina superior */}
      <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 400, display: 'flex', gap: '8px' }}>
        <button
          onClick={handleResetView}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '11.5px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
          title="Centrar en Parinacochas"
        >
          <Compass size={14} color="#fbbf24" />
          <span>Centrar Provincia</span>
        </button>

        <button
          onClick={handleToggleMapType}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '11.5px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
          title="Alternar vista Satelital / Callejera"
        >
          {mapType === 'satelite' ? <Globe size={14} color="#38bdf8" /> : <MapIcon size={14} color="#34d399" />}
          <span>{mapType === 'satelite' ? 'Satélite (Esri)' : 'Callejero (OSM)'}</span>
        </button>
      </div>

      {/* Leyenda cartográfica flotante en esquina inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 400,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#cbd5e1',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          maxWidth: '240px'
        }}
      >
        <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Layers size={13} color="#38bdf8" /> Capas del Mapa
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }}></span>
            <span>Activo / En Combate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span>Controlado / Contenido</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            <span>Extinguido / Cerrado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#fbbf24' }}>
            <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #f59e0b', display: 'inline-block' }}></span>
            <span>Límite Provincial Parinacochas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
