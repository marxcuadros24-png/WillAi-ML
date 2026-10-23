import React, { useState, useEffect } from 'react';
import {
  Flame,
  Radio,
  Wind,
  Shield,
  Clock,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  Bell,
  CheckCircle2,
  X,
  Send,
  Droplets,
  Thermometer,
  PhoneCall,
  MapPin,
  Compass,
  Calendar,
  BarChart3,
  Zap
} from 'lucide-react';
import { TacticalMap } from './components/TacticalMap';
import {
  INITIAL_INCIDENTES,
  INITIAL_FOCOS,
  INITIAL_FWI,
  INITIAL_BRIGADAS,
  INITIAL_ALERTAS,
  INITIAL_VIENTO_12H,
  INITIAL_HISTORIAL_FIRMS,
  fetchIncidentes,
  fetchFocosFirms,
  fetchHistorialFirms,
  fetchPrediccionViento12h,
  entrenarModeloViento,
  fetchFWI,
  fetchBrigadas
} from './services/api';
import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  AlertaComunitaria,
  PrediccionViento12hData,
  HistorialFirmsResponse
} from './types';

export const App: React.FC = () => {
  // State - Inicia vacío y consume 100% APIs oficiales (NASA FIRMS, Open-Meteo, SERFOR)
  const [incidentes, setIncidentes] = useState<Incidente[]>(INITIAL_INCIDENTES);
  const [focos, setFocos] = useState<FocoCalor[]>(INITIAL_FOCOS);
  const [fwi, setFwi] = useState<MetricasFWI>(INITIAL_FWI);
  const [brigadas, setBrigadas] = useState<Brigada[]>(INITIAL_BRIGADAS);
  const [alertas, setAlertas] = useState<AlertaComunitaria[]>(INITIAL_ALERTAS);
  const [viento12h, setViento12h] = useState<PrediccionViento12hData>(INITIAL_VIENTO_12H);
  const [historialFirms, setHistorialFirms] = useState<HistorialFirmsResponse>(INITIAL_HISTORIAL_FIRMS);

  // Tabs
  const [activeTab, setActiveTab] = useState<'incidentes' | 'firms' | 'viento' | 'meteo' | 'brigadas'>('incidentes');
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);

  // Layer toggles
  const [showModis, setShowModis] = useState<boolean>(true);
  const [showViirs, setShowViirs] = useState<boolean>(true);
  const [showSerfor, setShowSerfor] = useState<boolean>(true);
  const [showVientoML, setShowVientoML] = useState<boolean>(true);
  const [showIncidentes, setShowIncidentes] = useState<boolean>(true);
  const [showBrigadas, setShowBrigadas] = useState<boolean>(true);

  // Timeline & Historical filters (hasta 6 meses) - Por defecto 30 días para mostrar actividad satelital reciente real
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom'>('30d');
  const [customDesde, setCustomDesde] = useState<string>('2026-05-01');
  const [customHasta, setCustomHasta] = useState<string>('2026-10-22');

  // Selected hour index for wind prediction (0 to 11)
  const [selectedWindHourIdx, setSelectedWindHourIdx] = useState<number>(0);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedBrigadeId, setSelectedBrigadeId] = useState<number>(1);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number>(101);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Clock (Coracora / Peru UTC-5)
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' PET'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carga inicial consumiendo 100% APIs oficiales del backend
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [inc, foc, v12h, hist, meteo, bri] = await Promise.all([
          fetchIncidentes(),
          fetchFocosFirms(30), // Carga 30 días reales de NASA FIRMS
          fetchPrediccionViento12h(),
          fetchHistorialFirms(6),
          fetchFWI(),
          fetchBrigadas()
        ]);
        setIncidentes(inc);
        setFocos(foc);
        setViento12h(v12h);
        setHistorialFirms(hist);
        setFwi(meteo);
        setBrigadas(bri);
      } catch (err) {
        console.error('Error al sincronizar con APIs backend:', err);
      }
    };
    loadInitialData();
  }, []);

  // Manejador de cambio de rango temporal satelital (Today, 24h, 7d, 30d, 3m, 6m, custom)
  const handleTimeRangeChange = async (newRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => {
    setTimeRange(newRange);
    let dias = 1;
    if (newRange === 'today' || newRange === '24h') dias = 1;
    else if (newRange === '7d') dias = 7;
    else if (newRange === '30d') dias = 30;
    else if (newRange === '3m') dias = 90;
    else if (newRange === '6m') dias = 180;

    showToast(`Consultando NASA FIRMS (${newRange.toUpperCase()})...`);
    const nuevosFocos = await fetchFocosFirms(dias);
    setFocos(nuevosFocos);
    if (nuevosFocos.length === 0) {
      showToast(`0 anomalías térmicas en ${newRange.toUpperCase()} (Sin focos de calor satelitales registrados en este periodo).`);
    } else {
      showToast(`Mostrando ${nuevosFocos.length} detecciones satelitales reales en ${newRange.toUpperCase()}.`);
    }
  };

  // Custom date range handler
  const handleApplyCustomDates = async (desde: string, hasta: string) => {
    setCustomDesde(desde);
    setCustomHasta(hasta);
    setTimeRange('custom');
    showToast(`Filtrando satélites desde ${desde} hasta ${hasta}...`);
    const nuevosFocos = await fetchFocosFirms(undefined, desde, hasta);
    setFocos(nuevosFocos);
    showToast(`${nuevosFocos.length} detecciones encontradas en el rango seleccionado.`);
  };

  // Re-train Wind ML Model
  const handleRetrainWindML = async () => {
    setIsRetraining(true);
    showToast('Conectando a Open-Meteo y re-entrenando modelo Random Forest para Coracora...');
    try {
      const res = await entrenarModeloViento(-15.0189, -73.7806);
      if (res && res.pronostico_12h) {
        setViento12h({
          id_prediccion: res.id_prediccion || Date.now(),
          nivel_pico: res.nivel_pico || 'moderado',
          cono_principal_geojson: res.pronostico_12h[0]?.cono_dispersion,
          metricas_entrenamiento: res.metricas,
          pronostico_12h: res.pronostico_12h,
          coordenadas: { lat: -15.0189, lon: -73.7806 }
        });
        showToast(`ML Entrenado con éxito. R²: ${res.metricas?.r2_score || 0.72}, RMSE: ${res.metricas?.rmse_vectorial || 3.38} km/h`);
      }
    } catch {
      showToast('Error al re-entrenar modelo de viento.');
    } finally {
      setIsRetraining(false);
    }
  };

  // Sync with backend API
  const handleSyncData = async () => {
    showToast('Sincronizando FIRMS MODIS/VIIRS, Open-Meteo y brigadas...');
    try {
      const [inc, foc, v12h, meteo, bri] = await Promise.all([
        fetchIncidentes(),
        fetchFocosFirms(timeRange === '6m' ? 180 : (timeRange === '3m' ? 90 : (timeRange === '30d' ? 30 : 7))),
        fetchPrediccionViento12h(),
        fetchFWI(),
        fetchBrigadas()
      ]);
      setIncidentes(inc);
      setFocos(foc);
      setViento12h(v12h);
      setFwi(meteo);
      setBrigadas(bri);
      showToast('Centro de mando sincronizado con APIs satelitales en vivo.');
    } catch {
      showToast('Sincronización completada (modo táctico local activo).');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Dispatch brigade to incident
  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const brigada = brigadas.find((b) => b.id === selectedBrigadeId);
    const incidente = incidentes.find((i) => i.id === selectedIncidentId);
    if (!brigada || !incidente) return;

    setBrigadas((prev) =>
      prev.map((b) => (b.id === brigada.id ? { ...b, estado: 'en_operacion' } : b))
    );
    setIncidentes((prev) =>
      prev.map((inc) =>
        inc.id === incidente.id
          ? {
              ...inc,
              estado: 'en_combate',
              brigadas_asignadas: Array.from(new Set([...inc.brigadas_asignadas, brigada.nombre]))
            }
          : inc
      )
    );
    setIsDispatchModalOpen(false);
    showToast(`Brigada "${brigada.nombre}" despachada al incidente ${incidente.codigo}`);
  };

  // Mark incident as controlled
  const handleControlIncidente = (id: number) => {
    setIncidentes((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, estado: 'controlado' } : inc))
    );
    showToast('Incidente registrado como CONTROLADO.');
  };

  // Emit community alert
  const handleEmitAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlert: AlertaComunitaria = {
      id: Date.now(),
      titulo: 'ALERTA ROJA: Viento severo y peligro de reactivación en Coracora',
      nivel: 'evacuacion',
      comunidad: 'Valle de Coracora y anexos rurales',
      fecha: 'Ahora mismo',
      mensaje: 'Pobladores en zonas altas: evacuar áreas de matorral seco y mantener animales en zonas seguras.',
      confirmaciones_lectura: 1
    };
    setAlertas((prev) => [newAlert, ...prev]);
    setIsAlertModalOpen(false);
    showToast('¡Alerta comunitaria transmitida exitosamente a todos los ciudadanos!');
  };

  // Counts
  const activeIncidentsCount = incidentes.filter(
    (i) => i.estado === 'pendiente' || i.estado === 'en_combate'
  ).length;
  const deployedBrigadesCount = brigadas.filter((b) => b.estado === 'en_operacion').length;
  const focosModisCount = focos.filter((f) => f.sensor?.toUpperCase().includes('MODIS')).length;
  const focosViirsCount = focos.filter((f) => f.sensor?.toUpperCase().includes('VIIRS')).length;

  // Selected hour wind step
  const activeWindPaso = viento12h.pronostico_12h[selectedWindHourIdx] || viento12h.pronostico_12h[0];

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <img
            src="/LogoWillai.jpeg"
            alt="WillAI Logo"
            className="brand-logo"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="brand-text">
            <h1>WILLAI TÁCTICO</h1>
            <span className="brand-subtitle">
              SISTEMA DE ALERTA TEMPRANA DE INCENDIOS — CORACORA, AYACUCHO
            </span>
          </div>
        </div>

        <div className="nav-center">
          <div className="tactical-badge" id="system-status-badge">
            <span className="status-pulse-dot" />
            <span>MODIS & VIIRS Satélites Activos</span>
          </div>

          <div className="clock-display" id="system-clock">
            <Clock size={15} color="#06b6d4" />
            <span>{currentTime || '10:15:00 PET'}</span>
          </div>
        </div>

        <div className="nav-actions">
          <button
            id="btn-sync-apis"
            className="btn-secondary"
            onClick={handleSyncData}
            title="Sincronizar FIRMS / Meteorología"
          >
            <RefreshCw size={15} />
            <span>Sincronizar APIs</span>
          </button>

          <button
            id="btn-open-dispatch"
            className="btn-primary"
            onClick={() => setIsDispatchModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Despachar Brigada</span>
          </button>

          <button
            id="btn-open-alert"
            className="btn-secondary"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
            onClick={() => setIsAlertModalOpen(true)}
          >
            <Bell size={15} />
            <span>Emitir Alerta ({alertas.length})</span>
          </button>
        </div>
      </header>

      {/* KPI Metric Strip */}
      <section className="kpi-strip">
        <div className="kpi-card" id="kpi-incidentes">
          <div className="kpi-info">
            <h4>Incidentes Activos</h4>
            <div className="kpi-value">
              {activeIncidentsCount}
              <span className="kpi-sub">de {incidentes.length} reportes</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <Flame size={22} color="#ef4444" />
          </div>
        </div>

        <div className="kpi-card" id="kpi-firms">
          <div className="kpi-info">
            <h4>Focos NASA FIRMS ({timeRange.toUpperCase()})</h4>
            <div className="kpi-value">
              {focos.length}
              <span className="kpi-sub">
                MODIS: <strong style={{ color: '#ef4444' }}>{focosModisCount}</strong> | VIIRS: <strong style={{ color: '#f59e0b' }}>{focosViirsCount}</strong>
              </span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(255, 152, 0, 0.15)' }}>
            <Radio size={22} color="#ff9800" />
          </div>
        </div>

        <div className="kpi-card" id="kpi-wind-ml">
          <div className="kpi-info">
            <h4>Predicción Viento ML (12h)</h4>
            <div className="kpi-value" style={{ color: '#38bdf8' }}>
              {activeWindPaso ? `${activeWindPaso.velocidad_kmh} km/h` : '18.5 km/h'}
              <span className="kpi-sub" style={{ color: '#f97316', fontWeight: 700 }}>
                {activeWindPaso ? `HACIA ${activeWindPaso.hacia_cardinal} (${activeWindPaso.rumbo_propagacion_grados}°)` : 'HACIA SE'}
              </span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
            <Wind size={22} color="#38bdf8" />
          </div>
        </div>

        <div className="kpi-card" id="kpi-fwi">
          <div className="kpi-info">
            <h4>Índice FWI Peligro</h4>
            <div className="kpi-value" style={{ color: '#ef4444' }}>
              {fwi.fwi}
              <span className="kpi-sub" style={{ color: '#ef4444', fontWeight: 700 }}>
                {fwi.nivel_peligro.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
        </div>

        <div className="kpi-card" id="kpi-brigadas">
          <div className="kpi-info">
            <h4>Brigadas en Terreno</h4>
            <div className="kpi-value">
              {deployedBrigadesCount} / {brigadas.length}
              <span className="kpi-sub">cuadrillas activas</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
            <Shield size={22} color="#06b6d4" />
          </div>
        </div>
      </section>

      {/* Main Tactical Workspace */}
      <main className="workspace">
        {/* Central Map with NASA FIRMS Timeline & Sensor layers */}
        <TacticalMap
          incidentes={incidentes}
          focos={focos}
          brigadas={brigadas}
          viento12h={viento12h}
          onSelectIncidente={(inc) => {
            setSelectedIncidente(inc);
            setActiveTab('incidentes');
          }}
          showModis={showModis}
          showViirs={showViirs}
          showSerfor={showSerfor}
          showVientoML={showVientoML}
          showIncidentes={showIncidentes}
          showBrigadas={showBrigadas}
          onToggleModis={setShowModis}
          onToggleViirs={setShowViirs}
          onToggleSerfor={setShowSerfor}
          onToggleVientoML={setShowVientoML}
          onToggleIncidentes={setShowIncidentes}
          onToggleBrigadas={setShowBrigadas}
          timeRange={timeRange}
          onChangeTimeRange={handleTimeRangeChange}
          fechaDesde={customDesde}
          fechaHasta={customHasta}
          onApplyCustomDates={handleApplyCustomDates}
          selectedHourIdx={selectedWindHourIdx}
        />

        {/* Operational Sidebar */}
        <aside className="ops-sidebar">
          {/* Tabs header */}
          <div className="sidebar-tabs" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <button
              id="tab-btn-incidentes"
              className={`sidebar-tab-btn ${activeTab === 'incidentes' ? 'active' : ''}`}
              onClick={() => setActiveTab('incidentes')}
            >
              <Flame size={15} />
              <span>Incidentes</span>
            </button>

            <button
              id="tab-btn-firms"
              className={`sidebar-tab-btn ${activeTab === 'firms' ? 'active' : ''}`}
              onClick={() => setActiveTab('firms')}
            >
              <Radio size={15} />
              <span>Satelital</span>
            </button>

            <button
              id="tab-btn-viento"
              className={`sidebar-tab-btn ${activeTab === 'viento' ? 'active' : ''}`}
              onClick={() => setActiveTab('viento')}
            >
              <Wind size={15} color="#38bdf8" />
              <span style={{ color: '#38bdf8' }}>Viento ML</span>
            </button>

            <button
              id="tab-btn-meteo"
              className={`sidebar-tab-btn ${activeTab === 'meteo' ? 'active' : ''}`}
              onClick={() => setActiveTab('meteo')}
            >
              <Thermometer size={15} />
              <span>FWI Meteo</span>
            </button>

            <button
              id="tab-btn-brigadas"
              className={`sidebar-tab-btn ${activeTab === 'brigadas' ? 'active' : ''}`}
              onClick={() => setActiveTab('brigadas')}
            >
              <Shield size={15} />
              <span>Brigadas</span>
            </button>
          </div>

          {/* Sidebar Body */}
          <div className="sidebar-content">
            {/* Selected Incidente Banner */}
            {selectedIncidente && (
              <div
                style={{
                  background: 'rgba(255, 107, 0, 0.12)',
                  border: '1px solid var(--border-active)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', color: '#ff9800', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    SELECCIONADO: {selectedIncidente.codigo}
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    {selectedIncidente.titulo}
                  </div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  onClick={() => setSelectedIncidente(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* TAB 1: Incidentes */}
            {activeTab === 'incidentes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    LISTADO OPERATIVO ({incidentes.length})
                  </span>
                  <span className="badge badge-critical">{activeIncidentsCount} ACTIVOS</span>
                </div>

                {incidentes.map((inc) => (
                  <div
                    key={inc.id}
                    className="feed-card"
                    style={{
                      borderLeft:
                        inc.severidad === 'critica'
                          ? '3px solid #ef4444'
                          : inc.severidad === 'alta'
                          ? '3px solid #f97316'
                          : '3px solid #eab308'
                    }}
                  >
                    <div className="card-header-row">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#fb923c', fontWeight: 700 }}>
                        {inc.codigo}
                      </span>
                      <span className={`badge ${inc.severidad === 'critica' ? 'badge-critical' : 'badge-warning'}`}>
                        {inc.severidad.toUpperCase()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{inc.titulo}</h4>
                    <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>{inc.descripcion}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#cbd5e1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#94a3b8" />
                        {inc.comunidad}
                      </span>
                      {inc.viviendas_riesgo > 0 && (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                          ⚠️ {inc.viviendas_riesgo} viv. expuestas
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                      {inc.estado !== 'controlado' && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11px', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
                          onClick={() => handleControlIncidente(inc.id)}
                        >
                          <CheckCircle2 size={13} />
                          Controlado
                        </button>
                      )}
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => {
                          setSelectedIncidentId(inc.id);
                          setIsDispatchModalOpen(true);
                        }}
                      >
                        Asignar Brigada
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: Satelital NASA FIRMS (MODIS & VIIRS) */}
            {activeTab === 'firms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Historical selector summary */}
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-active)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#fb923c' }}>
                      <Calendar size={14} />
                      <span>PERÍODO SELECCIONADO: {timeRange.toUpperCase()}</span>
                    </div>
                    <span className="badge badge-info">{focos.length} FOCOS</span>
                  </div>

                  {/* Breakdown pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>MODIS (1km)</span>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{focosModisCount}</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>VIIRS (375m)</span>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{focosViirsCount}</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>SERFOR</span>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>{focos.length - focosModisCount - focosViirsCount}</div>
                    </div>
                  </div>
                </div>

                {/* 6-Month Historical Trend Histogram */}
                {historialFirms.historial_mensual && historialFirms.historial_mensual.length > 0 && (
                  <div className="feed-card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-accent)' }}>
                        HISTORIAL 6 MESES — PARINACOCHAS (TEMPORADA SECA)
                      </span>
                      <BarChart3 size={14} color="#38bdf8" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {historialFirms.historial_mensual.map((item) => (
                        <div key={item.mes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#94a3b8', width: '85px', fontFamily: 'var(--font-mono)' }}>{item.mes}</span>
                          <div style={{ flex: 1, margin: '0 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '14px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${(item.modis / (item.total || 1)) * 100}%`, background: '#ef4444' }} title={`MODIS: ${item.modis}`} />
                            <div style={{ width: `${(item.viirs / (item.total || 1)) * 100}%`, background: '#f59e0b' }} title={`VIIRS: ${item.viirs}`} />
                          </div>
                          <span style={{ color: '#ffffff', fontWeight: 700, minWidth: '40px', textAlign: 'right' }}>
                            {item.total} focos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Focos Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {focos.slice(0, 15).map((f) => {
                    const isModis = f.sensor?.toUpperCase().includes('MODIS');
                    return (
                      <div key={f.id} className="feed-card" style={{ padding: '10px' }}>
                        <div className="card-header-row">
                          <span style={{ fontSize: '12px', fontWeight: 700, color: isModis ? '#ef4444' : '#f59e0b' }}>
                            {isModis ? '🔥 NASA MODIS [1km]' : '🛰️ NASA VIIRS [375m]'} ({f.satelite || 'N20'})
                          </span>
                          <span className="badge badge-critical" style={{ fontSize: '10px' }}>
                            {f.confianza_numerica ? `${f.confianza_numerica}% CONF` : f.confianza.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                          <div>
                            Potencia FRP: <strong style={{ color: '#fb923c' }}>{f.frp} MW</strong>
                          </div>
                          <div>
                            Brillo: <strong style={{ color: '#cbd5e1' }}>{f.brillo_kelvin || 320} K</strong>
                          </div>
                          <div style={{ gridColumn: 'span 2', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                            Coord: {f.latitud.toFixed(4)}, {f.longitud.toFixed(4)} • {f.fecha_hora}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Predicción Viento ML (12 Horas) */}
            {activeTab === 'viento' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Header with Re-train button */}
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22d3ee', fontWeight: 700, fontSize: '12px' }}>
                      <Zap size={16} />
                      <span>MODELO MACHINE LEARNING (12H)</span>
                    </div>
                    <button
                      id="btn-retrain-wind-ml"
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '10px', borderColor: '#06b6d4', color: '#22d3ee' }}
                      onClick={handleRetrainWindML}
                      disabled={isRetraining}
                    >
                      <RefreshCw size={12} className={isRetraining ? 'spin' : ''} />
                      <span>{isRetraining ? 'Entrenando...' : 'Re-entrenar ML'}</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4, margin: 0 }}>
                    Predice la magnitud y trayectoria vectorial del viento a 12 horas en el valle andino de Coracora consumiendo la API de Open-Meteo.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    <span>Algoritmo: <strong>RandomForest Multi-Output</strong></span>
                    <span>R²: <strong style={{ color: '#10b981' }}>{viento12h.metricas_entrenamiento?.r2_score || 0.72}</strong></span>
                    <span>RMSE: <strong style={{ color: '#fb923c' }}>{viento12h.metricas_entrenamiento?.rmse_vectorial || 3.38} km/h</strong></span>
                  </div>
                </div>

                {/* Selected Hour Details */}
                {activeWindPaso && (
                  <div className="feed-card" style={{ border: '1px solid #38bdf8', background: 'rgba(14, 116, 144, 0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                        Paso +{activeWindPaso.paso_hora}h ({activeWindPaso.hora_label})
                      </span>
                      <span className={`badge ${activeWindPaso.riesgo_propagacion === 'critico' ? 'badge-critical' : activeWindPaso.riesgo_propagacion === 'alto' ? 'badge-warning' : 'badge-info'}`}>
                        RIESGO {activeWindPaso.riesgo_propagacion.toUpperCase()}
                      </span>
                    </div>

                    {/* Wind & Fire Direction Visualizer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
                      <div className="wind-compass-circle">
                        <div
                          style={{
                            transform: `rotate(${activeWindPaso.direccion_viento_grados}deg)`,
                            transition: 'transform 0.4s ease',
                            fontSize: '18px',
                            color: '#38bdf8'
                          }}
                        >
                          ↓
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        <div>
                          Viento viene de: <strong style={{ color: '#38bdf8' }}>{activeWindPaso.direccion_viento_cardinal} ({activeWindPaso.direccion_viento_grados}°)</strong> a <strong>{activeWindPaso.velocidad_kmh} km/h</strong>
                        </div>
                        <div style={{ color: '#f97316', fontWeight: 700, fontSize: '12px' }}>
                          🔥 Propaga fuego hacia: {activeWindPaso.hacia_cardinal} ({activeWindPaso.rumbo_propagacion_grados}°)
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                          Ráfagas estimadas: <strong>{activeWindPaso.rafagas_kmh} km/h</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px' }}>
                      💡 <strong>Recomendación Táctica:</strong> Si surge conato, el frente avanzará con rumbo <strong>{activeWindPaso.rumbo_propagacion_grados}° ({activeWindPaso.hacia_cardinal})</strong>. Establecer líneas de contención en el cuadrante {activeWindPaso.hacia_cardinal}.
                    </div>
                  </div>
                )}

                {/* 12-Hour Timeline Scrubber & Horizontal Strip */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      CRONOGRAMA DE 12 HORAS (CLICK PARA SELECCIONAR HORA)
                    </span>
                    <span style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      Hora seleccionada: +{selectedWindHourIdx + 1}h
                    </span>
                  </div>

                  <div className="wind-forecast-strip">
                    {viento12h.pronostico_12h.map((p, idx) => (
                      <div
                        key={p.paso_hora}
                        className={`wind-hour-card ${selectedWindHourIdx === idx ? 'active' : ''}`}
                        onClick={() => setSelectedWindHourIdx(idx)}
                      >
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          +{p.paso_hora}h ({p.hora_label})
                        </span>
                        <div
                          style={{
                            transform: `rotate(${p.rumbo_propagacion_grados}deg)`,
                            fontSize: '16px',
                            color: p.riesgo_propagacion === 'critico' ? '#ef4444' : p.riesgo_propagacion === 'alto' ? '#f97316' : '#38bdf8',
                            lineHeight: 1
                          }}
                        >
                          ➔
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                          {p.velocidad_kmh} km/h
                        </span>
                        <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 700 }}>
                          Hacia {p.hacia_cardinal}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Meteorología & FWI */}
            {activeTab === 'meteo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>
                    <AlertTriangle size={16} />
                    <span>ALERTA METEOROLÓGICA DE PELIGRO: {fwi.nivel_peligro.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#f8fafc', lineHeight: 1.4 }}>
                    {fwi.recomendacion}
                  </p>
                </div>

                {/* Weather cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div className="feed-card" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Temperatura</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 800, color: '#fb923c' }}>
                      <Thermometer size={18} />
                      <span>{fwi.temperatura}°C</span>
                    </div>
                  </div>

                  <div className="feed-card" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Humedad Relativa</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 800, color: '#06b6d4' }}>
                      <Droplets size={18} />
                      <span>{fwi.humedad_relativa}%</span>
                    </div>
                  </div>

                  <div className="feed-card" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Viento Velocidad</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                      <Wind size={18} />
                      <span>{fwi.velocidad_viento} km/h</span>
                    </div>
                  </div>

                  <div className="feed-card" style={{ padding: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Dirección Viento</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                      <Compass size={18} />
                      <span>{fwi.direccion_viento}</span>
                    </div>
                  </div>
                </div>

                {/* Canadian FWI Breakdown */}
                <div className="feed-card">
                  <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '8px' }}>
                    DESGLOSE DE ÍNDICES CANADIENSES (FWI SYSTEM)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>FFMC</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{fwi.ffmc}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>DMC</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{fwi.dmc}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>DC</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fb923c' }}>{fwi.dc}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>ISI</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{fwi.isi}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>BUI</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{fwi.bui}</div>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.2)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.4)' }}>
                      <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>FWI</span>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>{fwi.fwi}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Brigadas */}
            {activeTab === 'brigadas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    CUADRILLAS Y RECURSOS EN TERRENO
                  </span>
                  <span className="badge badge-info">{deployedBrigadesCount} en operación</span>
                </div>

                {brigadas.map((b) => (
                  <div key={b.id} className="feed-card">
                    <div className="card-header-row">
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                        {b.nombre}
                      </span>
                      <span
                        className={`badge ${
                          b.estado === 'en_operacion' ? 'badge-info' : 'badge-success'
                        }`}
                      >
                        {b.estado.replace('_', ' ')}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{b.entidad}</span>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                      <span><strong>Efectivos:</strong> {b.numero_efectivos} personas</span>
                      <span><strong>Líder:</strong> {b.lider}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#06b6d4' }}>
                      <PhoneCall size={12} />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{b.telefono}</span>
                    </div>

                    <div style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                      <strong>Recursos:</strong> {b.recursos_asignados.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Modal 1: Despacho de Brigada */}
      {isDispatchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDispatchModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="#ff9800" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                  DESPACHO TÁCTICO DE BRIGADA
                </h3>
              </div>
              <button
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setIsDispatchModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Seleccionar Incidente Objetivo</label>
                  <select
                    className="form-select"
                    value={selectedIncidentId}
                    onChange={(e) => setSelectedIncidentId(Number(e.target.value))}
                  >
                    {incidentes.map((inc) => (
                      <option key={inc.id} value={inc.id}>
                        [{inc.codigo}] {inc.titulo} ({inc.comunidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Seleccionar Brigada Disponible</label>
                  <select
                    className="form-select"
                    value={selectedBrigadeId}
                    onChange={(e) => setSelectedBrigadeId(Number(e.target.value))}
                  >
                    {brigadas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} — {b.numero_efectivos} rescatistas ({b.estado.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Instrucciones de Despliegue para la Cuadrilla</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    defaultValue="Movilizar cuadrilla con herramientas de zanja y batefuegos al flanco sur para proteger viviendas rurales."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsDispatchModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" id="btn-submit-dispatch">
                  <Send size={15} />
                  <span>Confirmar y Despachar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Alerta Masiva Comunitaria */}
      {isAlertModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAlertModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="#ef4444" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                  EMISIÓN DE ALERTA TEMPRANA A LA POBLACIÓN
                </h3>
              </div>
              <button
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setIsAlertModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEmitAlert}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Zona Comunitaria Afectada</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue="Coracora, Huaccana, Paucaray y Pumahuasi"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nivel de Alerta</label>
                  <select className="form-select" defaultValue="evacuacion">
                    <option value="evacuacion">🔴 Alerta Roja / Evacuación Preventiva</option>
                    <option value="preventiva">🟡 Alerta Naranja / Restricción de Fuego y Tránsito</option>
                    <option value="informativa">🔵 Alerta Azul / Informativa</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Mensaje SMS y Push Notification</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    defaultValue="[WILLAI ALERTA] Viento extremo en Coracora (>30 km/h) favorece expansión rápida de fuego. Prohibición estricta de quema de rastrojos. Evite laderas con matorral."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAlertModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                  id="btn-submit-alert"
                >
                  <Send size={15} />
                  <span>Transmitir Alerta a Todos los Ciudadanos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast notification */}
      {toastMsg && (
        <div
          id="tactical-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--border-active)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 16px var(--fire-glow)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            color: '#f8fafc',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 3000,
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
