import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  Thermometer,
  Wind,
  Droplets,
  CloudRain,
  Sun,
  AlertTriangle,
  Phone,
  PhoneCall,
  Clock,
  ChevronRight,
  ChevronLeft,
  Shield,
  Activity,
  HeartPulse,
  Image as ImageIcon,
  X,
  RefreshCw
} from 'lucide-react';
import willaiLogo from '../assets/LogoWillai.jpeg';
import { MapaPublicoIncidentes } from '../components/MapaPublicoIncidentes';
import './PortalPublico.css';
import {
  fetchIncidentesPublicos,
  fetchEstadisticasPublicas,
  fetchDistritosPublicos,
  fetchFWI,
} from '../services/api';
import type {
  IncidentePublico,
  EstadisticasPublicas,
  DistritoPublico,
  MetricasFWI,
} from '../types';

// Coordenadas oficiales de los 8 distritos de Parinacochas
const DISTRITOS_COORDS: Record<string, { lat: number; lon: number; nombre: string; altitud: string }> = {
  coracora: { lat: -15.0189, lon: -73.7806, nombre: 'Coracora (Capital)', altitud: '3,175 msnm' },
  chumpi: { lat: -15.0561, lon: -73.8647, nombre: 'Chumpi', altitud: '3,200 msnm' },
  coronel_castaneda: { lat: -14.8814, lon: -73.6192, nombre: 'Coronel Castañeda', altitud: '3,620 msnm' },
  pacapausa: { lat: -14.9333, lon: -73.5833, nombre: 'Pacapausa', altitud: '3,310 msnm' },
  pullo: { lat: -15.2014, lon: -73.8183, nombre: 'Pullo', altitud: '3,030 msnm' },
  puyusca: { lat: -15.1764, lon: -73.6706, nombre: 'Puyusca (Incuyo)', altitud: '3,290 msnm' },
  san_francisco: { lat: -14.9961, lon: -73.6667, nombre: 'San Francisco de Ravacayco', altitud: '3,350 msnm' },
  upahuacho: { lat: -14.8889, lon: -73.4722, nombre: 'Upahuacho', altitud: '3,580 msnm' },
};

// Componente Tacómetro de Amenaza (Gauge SVG inspirado en SENAMHI)
const DangerGauge: React.FC<{ level: string }> = ({ level }) => {
  let angle = 60;
  const lvl = level.toLowerCase();
  if (lvl.includes('bajo')) angle = -60;
  else if (lvl.includes('moder')) angle = -20;
  else if (lvl.includes('alto') || lvl.includes('fuerte')) angle = 25;
  else if (lvl.includes('extrem') || lvl.includes('crit')) angle = 70;

  return (
    <div style={{ position: 'relative', width: '64px', height: '36px', overflow: 'hidden' }}>
      <svg width="64" height="64" viewBox="0 0 100 100" style={{ transform: 'translateY(-14px)' }}>
        <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 15 50 A 35 35 0 0 1 35 23" fill="none" stroke="#10b981" strokeWidth="10" />
        <path d="M 35 23 A 35 35 0 0 1 65 23" fill="none" stroke="#f59e0b" strokeWidth="10" />
        <path d="M 65 23 A 35 35 0 0 1 85 50" fill="none" stroke="#ef4444" strokeWidth="10" />
        <g transform={`rotate(${angle} 50 50)`}>
          <line x1="50" y1="50" x2="50" y2="20" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="50" r="4" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};

export const PortalPublicoPage: React.FC = () => {
  // Datos principales
  const [incidentes, setIncidentes] = useState<IncidentePublico[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPublicas | null>(null);
  const [distritos, setDistritos] = useState<DistritoPublico[]>([]);
  const [fwiData, setFwiData] = useState<MetricasFWI | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [refrescando, setRefrescando] = useState<boolean>(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());

  // Filtro de estado: por defecto 'activos' para mostrar fuegos en combate/verificación
  const [filtroEstado, setFiltroEstado] = useState<'activos' | 'todos'>('activos');

  // Estados de navegación e interacción
  const [selectedIncidenteId, setSelectedIncidenteId] = useState<number | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'clima' | 'mapa' | 'avisos'>('mapa');

  // Distrito seleccionado para clima y centrado de mapa
  const [distritoKey, setDistritoKey] = useState<string>('coracora');
  const [centerCoords, setCenterCoords] = useState<[number, number] | null>([-15.0189, -73.7806]);

  // Carrusel de Avisos
  const [avisoSlide, setAvisoSlide] = useState<number>(0);

  // Reloj digital en vivo
  const [relojHora, setRelojHora] = useState<string>('');
  const [relojFecha, setRelojFecha] = useState<string>('');

  // 1. Reloj en tiempo real
  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      setRelojHora(
        ahora.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setRelojFecha(
        ahora.toLocaleDateString('es-PE', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    actualizarReloj();
    const interval = setInterval(actualizarReloj, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Cargar datos reales públicos con auto-refresco en vivo periódico
  useEffect(() => {
    let montado = true;

    const cargar = async (esPrimerCarga = false) => {
      if (esPrimerCarga) {
        setCargando(true);
      } else {
        setRefrescando(true);
      }

      try {
        const [incData, statsData, distData, fwiRes] = await Promise.all([
          fetchIncidentesPublicos({ fecha: 'todos', distrito: 'todos', estado: filtroEstado }),
          fetchEstadisticasPublicas(),
          fetchDistritosPublicos(),
          fetchFWI(false),
        ]);

        if (!montado) return;
        setIncidentes(incData);
        if (statsData) setEstadisticas(statsData);
        if (distData.length > 0) setDistritos(distData);
        if (fwiRes) setFwiData(fwiRes);
        setUltimaActualizacion(new Date());
      } catch (err) {
        console.error('Error al cargar datos del observatorio público:', err);
      } finally {
        if (montado) {
          if (esPrimerCarga) setCargando(false);
          setRefrescando(false);
        }
      }
    };

    cargar(true);

    // Auto-refresco en vivo cada 10 segundos para capturar nuevos reportes móviles
    const autoInterval = setInterval(() => {
      cargar(false);
    }, 10000);

    return () => {
      montado = false;
      clearInterval(autoInterval);
    };
  }, [filtroEstado]);

  // Manejar refresco manual inmediato
  const handleRefrescarManual = async () => {
    if (refrescando) return;
    setRefrescando(true);
    try {
      const [incData, statsData, distData, fwiRes] = await Promise.all([
        fetchIncidentesPublicos({ fecha: 'todos', distrito: 'todos', estado: filtroEstado }),
        fetchEstadisticasPublicas(),
        fetchDistritosPublicos(),
        fetchFWI(false),
      ]);
      setIncidentes(incData);
      if (statsData) setEstadisticas(statsData);
      if (distData.length > 0) setDistritos(distData);
      if (fwiRes) setFwiData(fwiRes);
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error('Error al refrescar manualmente el observatorio:', err);
    } finally {
      setRefrescando(false);
    }
  };

  // Manejar cambio de distrito
  const handleDistrictChange = (key: string) => {
    setDistritoKey(key);
    const coords = DISTRITOS_COORDS[key];
    if (coords) {
      setCenterCoords([coords.lat, coords.lon]);
    }
  };

  // Avisos oficiales para Parinacochas
  const avisos = [
    {
      id: '004',
      tipo: 'EXTREMA',
      titulo: 'INCREMENTO DE TEMPERATURA Y VIENTO EN PARINACOCHAS',
      fechas: '01 Nov ➔ 05 Nov 2026',
      nivel: 'Extremo',
      descripcion:
        'Sea extremadamente precavido. Ambiente seco con vientos vespertinos de hasta 35 km/h. Se prohíben totalmente las quemas agropecuarias y fogatas en pastizales de toda la provincia.',
      accion: 'Evitar toda quema y resguardar forraje seco.',
    },
    {
      id: '005',
      tipo: 'FUERTE',
      titulo: 'VIGILANCIA DE PASTIZALES EN PUNA SECA',
      fechas: '02 Nov ➔ 06 Nov 2026',
      nivel: 'Alto',
      descripcion:
        'Zonas altas de Huallhua, Secce y Muchapampa presentan pajonales con índice de ignición FFMC > 90. Alto riesgo de ignición por colillas o chispas de maquinaria.',
      accion: 'Establecer fajas cortafuego de 3 metros.',
    },
    {
      id: '006',
      tipo: 'MODERADA',
      titulo: 'RECOMENDACIÓN PARA AGRICULTORES Y COMUNEROS',
      fechas: '03 Nov ➔ 07 Nov 2026',
      nivel: 'Moderado',
      descripcion:
        'Construir fajas cortafuego alrededor de parcelas, corrales y viviendas rurales. Reportar de inmediato columnas de humo al 116 o números de emergencia.',
      accion: 'Llamar a Bomberos ante cualquier avistamiento de humo.',
    },
  ];

  const avisoActual = avisos[avisoSlide];
  const distritoInfo = DISTRITOS_COORDS[distritoKey] || DISTRITOS_COORDS.coracora;

  // Métricas calculadas o reales
  const tempReal = fwiData?.temperatura ? Math.round(fwiData.temperatura * 10) / 10 : 21.9;
  const rhReal = fwiData?.humedad_relativa ? Math.round(fwiData.humedad_relativa) : 28;
  const windReal = fwiData?.velocidad_viento ? Math.round(fwiData.velocidad_viento * 10) / 10 : 13.6;
  const windDir = fwiData?.direccion_viento || 'WSW';
  const rainReal = fwiData?.precipitacion != null ? fwiData.precipitacion.toFixed(1) : '0.0';
  const fwiScore = estadisticas?.meteorologia.fwi_score ?? (fwiData?.fwi ? fwiData.fwi.toFixed(1) : '32.0');
  const fwiNivel = estadisticas?.meteorologia.fwi_nivel ?? (fwiData?.nivel_peligro || 'ALTO');

  const isActivo = (estado: string) =>
    ['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate'].includes(estado);
  const conteoActivos = estadisticas?.sistema?.total_activos ?? incidentes.filter((i) => isActivo(i.estado)).length;

  return (
    <div className="obs-portal-container">
      {/* 1. BARRA SUPERIOR INSTITUCIONAL (SENAMHI STYLE) */}
      <header className="obs-header">
        <div className="obs-header-left">
          {/* Badge Perú Oficial */}
          <div className="obs-peru-badge">
            <div className="obs-peru-flag"></div>
            <div className="obs-peru-text">
              <strong>PERÚ</strong>
              <span>Sistema WillAI</span>
            </div>
          </div>

          {/* Logo WillAI con branding */}
          <div className="obs-logo-container">
            <img src={willaiLogo} alt="WillAI Logo" className="obs-logo-img" />
            <div className="obs-title-group">
              <h1>
                OBSERVATORIO DE INCENDIOS FORESTALES Y CLIMA
              </h1>
              <p>WillAI Coracora • Monitoreo Satelital y Alerta Temprana en Parinacochas, Ayacucho</p>
            </div>
          </div>
        </div>

        {/* Sección derecha: Badges de Alerta, Fuegos Activos, Clima en vivo y Reloj */}
        <div className="obs-header-right">
          {/* Badge de Fuegos Activos en vivo */}
          <div
            className="obs-header-warning-badge"
            style={{
              background: conteoActivos > 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.2)',
              border: conteoActivos > 0 ? '1px solid #ef4444' : '1px solid #10b981',
              color: conteoActivos > 0 ? '#fca5a5' : '#6ee7b7',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setFiltroEstado('activos')}
            title="Ver los fuegos activos en combate"
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: conteoActivos > 0 ? '#ef4444' : '#10b981',
                boxShadow: conteoActivos > 0 ? '0 0 8px #ef4444' : '0 0 8px #10b981',
              }}
            />
            <span>{conteoActivos} FUEGO{conteoActivos === 1 ? '' : 'S'} ACTIVO{conteoActivos === 1 ? '' : 'S'}</span>
          </div>

          {/* Botón Refrescar en Vivo */}
          <button
            onClick={handleRefrescarManual}
            disabled={refrescando}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '6px',
              background: 'rgba(14, 29, 60, 0.9)',
              border: '1px solid rgba(96, 165, 250, 0.35)',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 700,
              cursor: refrescando ? 'wait' : 'pointer',
            }}
            title="Actualizar datos en vivo"
          >
            <RefreshCw
              size={12}
              style={{
                animation: refrescando ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{refrescando ? 'Sincronizando...' : 'Refrescar'}</span>
          </button>

          <div className="obs-header-warning-badge">
            <Flame size={13} />
            <span>PELIGRO FWI: {fwiNivel} ({fwiScore})</span>
          </div>

          <div className="obs-header-notice-badge">
            <Clock size={13} />
            <span>AVISO VIGENTE N° 004</span>
          </div>

          <div className="obs-weather-capsule">
            <Sun size={15} color="#fbbf24" />
            <span>
              <strong>{tempReal}°C</strong> • Máx 26° / Mín 11° • <strong>CORACORA</strong>
            </span>
          </div>

          <div className="obs-clock-capsule">
            <span className="obs-clock-time">{relojHora || '11:42:04 a. m.'}</span>
            <span className="obs-clock-date">{relojFecha || 'mar, 03 nov. 2026'} GMT-5</span>
          </div>
        </div>
      </header>

      {/* Selector de Pestañas en Móvil */}
      <div className="obs-mobile-tabs-bar">
        <button
          className={`obs-mobile-tab-btn ${mobileTab === 'clima' ? 'active' : ''}`}
          onClick={() => setMobileTab('clima')}
        >
          🌡️ Clima & FWI
        </button>
        <button
          className={`obs-mobile-tab-btn ${mobileTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setMobileTab('mapa')}
        >
          🗺️ Mapa de Incidentes
        </button>
        <button
          className={`obs-mobile-tab-btn ${mobileTab === 'avisos' ? 'active' : ''}`}
          onClick={() => setMobileTab('avisos')}
        >
          🚨 Avisos & Teléfonos
        </button>
      </div>

      {/* 2. LAYOUT PRINCIPAL DE 3 COLUMNAS */}
      <main className="obs-main-layout">
        {/* COLUMNA IZQUIERDA: TIEMPO Y PELIGRO ACTUAL */}
        <section className={`obs-left-column ${mobileTab === 'clima' ? '' : 'obs-mobile-hidden'}`}>
          <div className="obs-left-card">
            {/* Cabecera del Tiempo */}
            <div className="obs-weather-header-group">
              <span className="obs-weather-tag">TIEMPO EN</span>
              <select
                value={distritoKey}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="obs-district-select"
              >
                {Object.entries(DISTRITOS_COORDS).map(([key, d]) => (
                  <option key={key} value={key}>
                    {d.nombre.toUpperCase()}, AYACUCHO
                  </option>
                ))}
              </select>
              <div className="obs-weather-live-indicator">
                <span className="obs-weather-live-dot"></span>
                <span>{cargando ? 'Sincronizando satélites...' : `● Ahora - ${relojHora ? relojHora.slice(0, 5) : '10:00'}`}</span>
                <span style={{ marginLeft: 'auto', color: '#93c5fd', fontSize: '0.68rem' }}>
                  {distritoInfo.altitud} • {distritos.length > 0 ? `${distritos.length} distritos` : 'Parinacochas'}
                </span>
              </div>
            </div>

            {/* Temperatura Principal */}
            <div className="obs-temp-hero">
              <div>
                <span className="obs-temp-number">{tempReal}</span>
                <span className="obs-temp-unit">°C</span>
              </div>
              <div className="obs-temp-range">
                Máx 26° • Mín 11°
              </div>
            </div>

            {/* Grilla 4 Métricas Meteorológicas */}
            <div className="obs-metrics-grid">
              {/* Temperatura */}
              <div className="obs-metric-tile">
                <div className="obs-metric-label">
                  <Thermometer size={12} color="#fb923c" />
                  <span>Temperatura</span>
                </div>
                <div className="obs-metric-val">{tempReal} °C</div>
                <div className="obs-metric-sub">Sensación 22°C</div>
              </div>

              {/* Humedad */}
              <div className="obs-metric-tile">
                <div className="obs-metric-label">
                  <Droplets size={12} color="#38bdf8" />
                  <span>Humedad</span>
                </div>
                <div className="obs-metric-val" style={{ color: rhReal < 30 ? '#fca5a5' : '#f8fafc' }}>
                  {rhReal} %
                </div>
                <div className="obs-metric-sub">
                  {rhReal < 30 ? 'Ambiente muy seco' : 'Humedad regular'}
                </div>
              </div>

              {/* Precipitación */}
              <div className="obs-metric-tile">
                <div className="obs-metric-label">
                  <CloudRain size={12} color="#60a5fa" />
                  <span>Precipitación</span>
                </div>
                <div className="obs-metric-val">{rainReal} mm/h</div>
                <div className="obs-metric-sub">Sin lluvia activa</div>
              </div>

              {/* Viento */}
              <div className="obs-metric-tile">
                <div className="obs-metric-label">
                  <Wind size={12} color="#34d399" />
                  <span>Viento</span>
                </div>
                <div className="obs-metric-val">{windReal} km/h</div>
                <div className="obs-metric-sub">↗ {windDir}</div>
              </div>
            </div>

            {/* Bloque Bio-Climático y Combustible Vegetal */}
            <div className="obs-climate-block">
              <div className="obs-climate-item">
                <strong>Sector Climático:</strong>
                <span>Puna Andina y Quebradas Interandinas</span>
              </div>
              <div className="obs-climate-item">
                <strong>Clasificación Climática:</strong>
                <span>Templado / Frío con deficiencia de humedad y sequedad estacional</span>
              </div>
              <div className="obs-climate-item">
                <strong>Estado del Combustible Vegetal:</strong>
                <span style={{ color: '#fb923c', fontWeight: 700 }}>
                  {fwiData?.estado_combustible || 'Extremadamente Seco (Pajonales y Rastrojos)'}
                </span>
              </div>
              <div className="obs-climate-item">
                <strong>Índice de Ignición Fina (FFMC):</strong>
                <span style={{ color: '#fca5a5', fontWeight: 800 }}>
                  {fwiData?.ffmc ? fwiData.ffmc.toFixed(1) : '90.8'} / 100 (Alta facilidad de chispa)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* COLUMNA CENTRAL: MAPA TÁCTICO INTERACTIVO */}
        <section className={`obs-center-column ${mobileTab === 'mapa' ? '' : 'obs-mobile-hidden'}`}>
          <MapaPublicoIncidentes
            incidentes={incidentes}
            selectedIncidenteId={selectedIncidenteId}
            onSelectIncidente={(inc) => setSelectedIncidenteId(inc.id)}
            centerCoords={centerCoords}
            filtroEstado={filtroEstado}
            onToggleFiltroEstado={setFiltroEstado}
            onRefresh={handleRefrescarManual}
            isRefreshing={refrescando}
            ultimaActualizacion={ultimaActualizacion}
          />
        </section>

        {/* COLUMNA DERECHA: AVISOS OFICIALES Y NÚMEROS DE EMERGENCIA */}
        <section className={`obs-right-column ${mobileTab === 'avisos' ? '' : 'obs-mobile-hidden'}`}>
          {/* Card 1: Aviso de Amenaza Meteorológica y Forestal */}
          <div className="obs-notice-card">
            <div className="obs-notice-top">
              <span className="obs-notice-badge-red">
                <AlertTriangle size={12} />
                {avisoActual.tipo} • Aviso N° {avisoActual.id}
              </span>
              <DangerGauge level={avisoActual.nivel} />
            </div>

            <div style={{ fontSize: '0.68rem', color: '#93c5fd' }}>
              3 avisos vigentes para Parinacochas
            </div>

            <h3 className="obs-notice-title">{avisoActual.titulo}</h3>
            <div className="obs-notice-date">📅 {avisoActual.fechas}</div>
            <p className="obs-notice-text">{avisoActual.descripcion}</p>

            <div className="obs-notice-footer">
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                {avisoActual.accion}
              </div>

              {/* Navegación del Carrusel */}
              <div className="obs-carousel-nav">
                <button
                  onClick={() => setAvisoSlide((prev) => (prev > 0 ? prev - 1 : avisos.length - 1))}
                  title="Aviso anterior"
                >
                  <ChevronLeft size={13} />
                </button>
                <span>
                  {avisoSlide + 1} / {avisos.length}
                </span>
                <button
                  onClick={() => setAvisoSlide((prev) => (prev < avisos.length - 1 ? prev + 1 : 0))}
                  title="Siguiente aviso"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Aviso Comunal y Estado de Brigadas */}
          <div className="obs-comunal-card">
            <div className="obs-comunal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#34d399" />
                <span>Estado Comunal • Parinacochas</span>
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                ACTIVO
              </span>
            </div>
            <p className="obs-comunal-text">
              🛡️ <strong>Brigada B-12 Coracora</strong> en patrullaje preventivo en sectores Huallhua, Secce y Muchapampa.
            </p>
            <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>
              {estadisticas?.sistema.total_activos ?? 0} fuegos activos en combate • {estadisticas?.sistema.total_cerrados ?? 0} liquidados
            </div>
          </div>

          {/* Card 3: DIRECTORIO DE NÚMEROS OFICIALES DE EMERGENCIA (Fiel a la Imagen Oficial) */}
          <div className="obs-directory-card">
            <div className="obs-directory-header">
              <PhoneCall size={18} color="#38bdf8" />
              <div>
                <h3 className="obs-directory-title">PONEMOS A DISPOSICIÓN LOS NÚMEROS OFICIALES</h3>
                <p className="obs-directory-sub">Autoridades y Centrales de Emergencia • Coracora</p>
              </div>
            </div>

            <div className="obs-authority-group">
              {/* Policía Nacional */}
              <div className="obs-authority-row">
                <div className="obs-authority-info">
                  <Shield size={16} color="#38bdf8" />
                  <div className="obs-authority-name">
                    <span>POLICÍA NACIONAL</span>
                    <small>Comisaría Sectorial Coracora</small>
                  </div>
                </div>
                <a href="tel:964778078" className="obs-call-btn" title="Llamar a Policía Nacional">
                  <Phone size={11} />
                  <span>964778078</span>
                </a>
              </div>

              {/* Serenazgo */}
              <div className="obs-authority-row">
                <div className="obs-authority-info">
                  <Activity size={16} color="#34d399" />
                  <div className="obs-authority-name">
                    <span>SERENAZGO</span>
                    <small>Seguridad Ciudadana</small>
                  </div>
                </div>
                <a href="tel:951015995" className="obs-call-btn" title="Llamar a Serenazgo">
                  <Phone size={11} />
                  <span>951015995</span>
                </a>
              </div>

              {/* Emergencia Hospital */}
              <div className="obs-authority-row">
                <div className="obs-authority-info">
                  <HeartPulse size={16} color="#f87171" />
                  <div className="obs-authority-name">
                    <span>EMERGENCIA</span>
                    <small>Hospital Referencial de Coracora</small>
                  </div>
                </div>
                <a href="tel:914026792" className="obs-call-btn" style={{ background: '#0284c7' }} title="Llamar a Hospital">
                  <Phone size={11} />
                  <span>914026792</span>
                </a>
              </div>

              {/* Bomberos (4 Números Oficiales) */}
              <div className="obs-bomberos-card">
                <div className="obs-bomberos-header">
                  <Flame size={15} color="#ef4444" />
                  <span>BOMBEROS DE CORACORA</span>
                </div>
                <div className="obs-bomberos-grid">
                  <a href="tel:940138271" className="obs-bomberos-call-btn" title="Llamar a Bomberos">
                    <Phone size={11} />
                    <span>940138271</span>
                  </a>
                  <a href="tel:993609580" className="obs-bomberos-call-btn" title="Llamar a Bomberos">
                    <Phone size={11} />
                    <span>993609580</span>
                  </a>
                  <a href="tel:940665530" className="obs-bomberos-call-btn" title="Llamar a Bomberos">
                    <Phone size={11} />
                    <span>940665530</span>
                  </a>
                  <a href="tel:939278602" className="obs-bomberos-call-btn" title="Llamar a Bomberos">
                    <Phone size={11} />
                    <span>939278602</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="obs-directory-footer">
              ¡Trabajamos unidos por tu seguridad!
            </div>
          </div>
        </section>
      </main>

      {/* MODAL LIGHTBOX PARA AMPLIACIÓN DE FOTOGRAFÍAS */}
      {activePhotoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            style={{
              maxWidth: '800px',
              width: '90%',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#1e293b' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="#fb923c" /> Fotografía de Evidencia
              </span>
              <button
                onClick={() => setActivePhotoModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'hidden', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={activePhotoModal} alt="Evidencia" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
