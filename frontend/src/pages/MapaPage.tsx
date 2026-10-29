import React, { useState } from 'react';
import {
  Flame,
  Radio,
  Thermometer,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Play,
  Home,
  MapPin,
  Mountain,
  Wind,
  Layers,
  CheckCircle,
  Info,
  RotateCcw
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { useAppContext } from '../context/AppContext';
import { evaluarViviendasSimulacion } from '../services/api';

export const MapaPage: React.FC = () => {
  const {
    incidentes,
    focos,
    brigadas,
    viviendas,
    selectedIncidente,
    setSelectedIncidente,
    showModis,
    setShowModis,
    showViirs,
    setShowViirs,
    showSerfor,
    setShowSerfor,
    showIncidentes,
    setShowIncidentes,
    showBrigadas,
    setShowBrigadas,
    showViviendas,
    setShowViviendas,
    showRiesgoOcurrencia,
    setShowRiesgoOcurrencia,
    grillaOcurrencia,
    handleEntrenarOcurrenciaManual,
    timeRange,
    handleTimeRangeChange,
    customDesde,
    customHasta,
    handleApplyCustomDates,
    sidebarTab,
    setSidebarTab,
    fwi,
    onOpenCreateIncident,
    onOpenCreateIncidentWithCoords,
    onOpenCreateViviendaWithCoords,
    onOpenDispatch,
    onOpenChangeStatus,
    onOpenCloseIncident,
    handleDispararSyncManual,
    // Simulación de Propagación
    simulaciones,
    selectedSimulacionId,
    simulacionGeojson,
    showSimulacionIsocronas,
    setShowSimulacionIsocronas,
    handleEjecutarSimulacion,
    handleCargarSimulacionGeoJSON
  } = useAppContext();

  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [showLimiteProvincial, setShowLimiteProvincial] = useState<boolean>(true);
  const [showDistritos, setShowDistritos] = useState<boolean>(false);
  const [showCarreteras, setShowCarreteras] = useState<boolean>(true);
  const [showRios, setShowRios] = useState<boolean>(true);

  // Form state for new simulation
  const [simLat, setSimLat] = useState<string>('-15.0189');
  const [simLon, setSimLon] = useState<string>('-73.7806');
  const [simHorizonte, setSimHorizonte] = useState<number>(6);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isEvaluatingHouses, setIsEvaluatingHouses] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const incidentesActivos = incidentes.filter((inc) => inc.estado !== 'cerrado');
  const focosModisCount = focos.filter((f) => f.sensor === 'MODIS').length;
  const focosViirsCount = focos.filter((f) => f.sensor === 'VIIRS').length;
  const focosSerforCount = focos.filter((f) => f.fuente === 'SERFOR').length;

  const celdas = grillaOcurrencia?.features || [];
  const celdasBajo = celdas.filter((c: any) => (c.properties?.probabilidad_pct ?? 0) < 25).length;
  const celdasMod = celdas.filter((c: any) => (c.properties?.probabilidad_pct ?? 0) >= 25 && (c.properties?.probabilidad_pct ?? 0) < 55).length;
  const celdasAlto = celdas.filter((c: any) => (c.properties?.probabilidad_pct ?? 0) >= 55 && (c.properties?.probabilidad_pct ?? 0) < 80).length;
  const celdasCritico = celdas.filter((c: any) => (c.properties?.probabilidad_pct ?? 0) >= 80).length;

  const topCeldasRiesgo = [...celdas].sort((a: any, b: any) => (b.properties?.probabilidad_pct ?? 0) - (a.properties?.probabilidad_pct ?? 0)).slice(0, 6);
  const metricasRF = grillaOcurrencia?.metadata?.metricas_modelo?.random_forest_calibrado;
  const metricasBase = grillaOcurrencia?.metadata?.metricas_modelo?.linea_base_logistic_regression;

  return (
    <div className="workspace" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Tactical Map with Layers and Timeline */}
      <TacticalMap
        incidentes={incidentes}
        focos={focos}
        brigadas={brigadas}
        viviendas={viviendas}
        selectedIncidente={selectedIncidente}
        focusCoords={focusCoords}
        onSelectIncidente={(inc) => {
          setSelectedIncidente(inc);
          setSidebarTab('incidentes');
        }}
        showModis={showModis}
        showViirs={showViirs}
        showSerfor={showSerfor}
        showRiesgoOcurrencia={showRiesgoOcurrencia}
        showIncidentes={showIncidentes}
        showBrigadas={showBrigadas}
        showViviendas={showViviendas}
        showLimiteProvincial={showLimiteProvincial}
        showDistritos={showDistritos}
        showCarreteras={showCarreteras}
        showRios={showRios}
        onToggleModis={setShowModis}
        onToggleViirs={setShowViirs}
        onToggleSerfor={setShowSerfor}
        onToggleRiesgoOcurrencia={setShowRiesgoOcurrencia}
        onToggleIncidentes={setShowIncidentes}
        onToggleBrigadas={setShowBrigadas}
        onToggleViviendas={setShowViviendas}
        onToggleLimiteProvincial={setShowLimiteProvincial}
        onToggleDistritos={setShowDistritos}
        onToggleCarreteras={setShowCarreteras}
        onToggleRios={setShowRios}
        grillaOcurrencia={grillaOcurrencia}
        timeRange={timeRange}
        onChangeTimeRange={handleTimeRangeChange}
        fechaDesde={customDesde}
        fechaHasta={customHasta}
        onApplyCustomDates={handleApplyCustomDates}
        onMapCreateIncident={onOpenCreateIncidentWithCoords}
        onMapCreateVivienda={onOpenCreateViviendaWithCoords}
        onMapSetSimCoords={(lat, lon) => {
          setSimLat(lat.toString());
          setSimLon(lon.toString());
          setSidebarTab('simulacion');
        }}
        simulacionGeojson={simulacionGeojson}
        showSimulacionIsocronas={showSimulacionIsocronas}
        onToggleSimulacionIsocronas={setShowSimulacionIsocronas}
      />

      {/* Operational Right Sidebar */}
      <aside className="ops-sidebar">
        <div className="sidebar-tabs" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'incidentes' ? 'active' : ''}`}
            onClick={() => setSidebarTab('incidentes')}
            title="Incidentes Operacionales"
          >
            <Flame size={14} />
            <span>Incidentes</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'firms' ? 'active' : ''}`}
            onClick={() => setSidebarTab('firms')}
            title="Detecciones Satelitales NASA FIRMS & SERFOR"
          >
            <Radio size={14} />
            <span>Satelital</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'riesgo' ? 'active' : ''}`}
            onClick={() => setSidebarTab('riesgo')}
            title="Modelo ML Riesgo de Ocurrencia Territorial"
            style={sidebarTab === 'riesgo' ? { borderBottom: '2px solid #f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' } : {}}
          >
            <ShieldAlert size={14} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>Riesgo ML</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'simulacion' ? 'active' : ''}`}
            onClick={() => setSidebarTab('simulacion')}
            title="Simulador de Propagación de Fuego Cell2Fire Eliptico Andino"
            style={sidebarTab === 'simulacion' ? { borderBottom: '2px solid #f97316', color: '#f97316', background: 'rgba(249, 115, 22, 0.12)' } : {}}
          >
            <Flame size={14} color="#f97316" />
            <span style={{ color: '#f97316', fontWeight: 700 }}>Simulador</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'meteo' ? 'active' : ''}`}
            onClick={() => setSidebarTab('meteo')}
            title="Meteorología Open-Meteo & FWI"
          >
            <Thermometer size={14} />
            <span>Meteo</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'brigadas' ? 'active' : ''}`}
            onClick={() => setSidebarTab('brigadas')}
            title="Brigadas de Respuesta"
          >
            <Shield size={14} />
            <span>Brigadas</span>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Sidebar Content: Incidentes */}
          {sidebarTab === 'incidentes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  INCIDENTES ACTIVOS ({incidentesActivos.length})
                </span>
                <button
                  className="btn-admin btn-admin-primary"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  onClick={onOpenCreateIncident}
                >
                  <PlusCircle size={13} />
                  Reportar
                </button>
              </div>

              {incidentesActivos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No hay incendios o incidentes activos registrados.
                </div>
              ) : (
                incidentesActivos.map((inc) => {
                  const isCrit = inc.severidad === 'critica';
                  const isHigh = inc.severidad === 'alta';
                  const isSelected = selectedIncidente?.id === inc.id;

                  return (
                    <div
                      key={inc.id}
                      className={`feed-card ${isCrit ? 'critical' : ''} ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedIncidente(isSelected ? null : inc)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}>
                          {inc.codigo}
                        </span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <span className={`badge ${isCrit ? 'badge-critical' : (isHigh ? 'badge-warning' : 'badge-yellow')}`}>
                            {inc.severidad.toUpperCase()}
                          </span>
                          <span className={`badge ${inc.estado === 'controlado' ? 'badge-emerald' : 'badge-cyan'}`}>
                            {inc.estado.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Critical warning callout for emergency commanders */}
                      {isCrit && (
                        <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} color="#f87171" />
                          <span>PRIORIDAD CRÍTICA • ALTO RIESGO A POBLACIÓN</span>
                        </div>
                      )}

                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
                        {inc.titulo}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#38bdf8" />
                        <span>{inc.comunidad} • Viviendas en riesgo: <strong style={{ color: '#ef4444' }}>{inc.viviendas_riesgo}</strong></span>
                      </div>

                      {/* Expandable Tactical Details */}
                      {isSelected && (
                        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(3, 7, 18, 0.7)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Descripción: </span>
                            <span style={{ color: '#f1f5f9' }}>{inc.descripcion}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Tipo Fuego: </span>
                              <strong style={{ color: '#fb923c' }}>{inc.tipo_incendio || 'Vegetación / Pastizal'}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>GPS: </span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                                {inc.latitud.toFixed(4)}, {inc.longitud.toFixed(4)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Brigadas Asignadas: </span>
                            <strong style={{ color: '#38bdf8' }}>
                              {inc.brigadas_asignadas && inc.brigadas_asignadas.length > 0
                                ? inc.brigadas_asignadas.join(', ')
                                : 'Ninguna brigada asignada aún'}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Hora Registro: </span>
                            <span style={{ color: '#94a3b8' }}>{inc.fecha_inicio}</span>
                          </div>
                        </div>
                      )}

                      {/* Real Action Buttons with Cohesive Dark Theme */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          className="btn-admin btn-admin-primary"
                          style={{ padding: '5px 10px', fontSize: '11.5px', flex: 1, justifyContent: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDispatch(inc);
                          }}
                          title="Despachar brigada táctica a este incidente"
                        >
                          Despachar
                        </button>
                        <button
                          className="btn-admin btn-admin-outline"
                          style={{ padding: '5px 10px', fontSize: '11.5px', flex: 1, justifyContent: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChangeStatus(inc);
                          }}
                          title="Actualizar estado operativo del incendio"
                        >
                          Estado
                        </button>
                        <button
                          className="btn-admin btn-admin-danger"
                          style={{ padding: '5px 10px', fontSize: '11.5px', flex: 1, justifyContent: 'center' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCloseIncident(inc);
                          }}
                          title="Cerrar incidente y emitir acta formal"
                        >
                          Cerrar
                        </button>
                        <button
                          className="btn-admin"
                          style={{
                            padding: '5px 8px',
                            fontSize: '11px',
                            flex: 1,
                            justifyContent: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(249, 115, 22, 0.16)',
                            color: '#fb923c',
                            border: '1px solid rgba(249, 115, 22, 0.4)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSimLat(inc.latitud.toString());
                            setSimLon(inc.longitud.toString());
                            setSidebarTab('simulacion');
                          }}
                          title="Abrir simulador andino para este incidente"
                        >
                          <Flame size={12} color="#fb923c" />
                          <span>Simular</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sidebar Content: FIRMS Satelital */}
          {sidebarTab === 'firms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  MONITOREO SATELITAL ({focos.length})
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  onClick={() => handleDispararSyncManual('firms')}
                >
                  <RefreshCw size={12} />
                  Sincronizar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>MODIS (1km)</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{focosModisCount}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>VIIRS (375m)</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{focosViirsCount}</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Focos SERFOR Perú: <strong style={{ color: '#10b981' }}>{focosSerforCount}</strong>
              </div>

              {focos.slice(0, 10).map((f, idx) => (
                <div key={idx} className="feed-card" style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${f.sensor.includes('MODIS') ? 'badge-warning' : 'badge-yellow'}`}>
                      {f.sensor}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{f.fecha_hora}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#e2e8f0', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    {f.latitud.toFixed(4)}, {f.longitud.toFixed(4)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    FRP: <strong style={{ color: '#fb923c' }}>{f.frp || '--'} MW</strong> • Confianza: {f.confianza}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sidebar Content: Riesgo de Ocurrencia ML */}
          {sidebarTab === 'riesgo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={15} color="#f59e0b" /> MODELO ML: RIESGO DE OCURRENCIA
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Susceptibilidad territorial en Parinacochas
                  </div>
                </div>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 10px', fontSize: '11.5px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  onClick={handleEntrenarOcurrenciaManual}
                  title="Re-entrenar modelo Random Forest con NASA FIRMS y Open-Meteo"
                >
                  <RefreshCw size={12} />
                  Reentrenar
                </button>
              </div>

              {/* Control de Capa GeoJSON en el Mapa */}
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#ffffff' }}>
                      Capa de Celdas Vectoriales ({grillaOcurrencia?.metadata?.total_celdas ?? 72})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Cuadrícula regular de 3.8 x 3.8 km sobre Coracora y anexos
                    </div>
                  </div>
                  <button
                    className={`btn-admin ${showRiesgoOcurrencia ? 'btn-admin-primary' : 'btn-admin-outline'}`}
                    style={{ padding: '5px 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setShowRiesgoOcurrencia(!showRiesgoOcurrencia)}
                  >
                    {showRiesgoOcurrencia ? <Eye size={13} /> : <EyeOff size={13} />}
                    {showRiesgoOcurrencia ? 'Visible en Mapa' : 'Oculta en Mapa'}
                  </button>
                </div>

                {/* Desglose por Nivel de Riesgo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '10px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>BAJO</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {celdasBajo}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>&lt;25%</div>
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>MOD</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {celdasMod}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>25-55%</div>
                  </div>
                  <div style={{ background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#f97316', fontWeight: 700 }}>ALTO</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {celdasAlto}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>55-80%</div>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>CRÍTICO</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {celdasCritico}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8' }}>&gt;80%</div>
                  </div>
                </div>
              </div>

              {/* Métricas de Evaluación Científica del Modelo */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    EVALUACIÓN TEMPORAL (SIN FUGA DE DATOS)
                  </span>
                  <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                    Split 70% Train / 30% Test
                  </span>
                </div>

                {metricasRF ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 2px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>ROC-AUC</div>
                      <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {metricasRF.roc_auc}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 2px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>PR-AUC</div>
                      <div style={{ fontWeight: 800, color: '#10b981', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {metricasRF.pr_auc}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 2px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>F1-Score</div>
                      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {metricasRF.f1_score}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 2px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Brier Score</div>
                      <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                        {metricasRF.brier_score}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cargando métricas...</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <span>Línea Base (Regresión Logística): Brier {metricasBase?.brier_score ?? '0.37'}</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Calibración Platt OK</span>
                </div>
              </div>

              {/* Importancia de Variables en Parinacochas */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  FACTORES DE MAYOR INFLUENCIA (FEATURE IMPORTANCE)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1' }}>1. Distancia a Comunidades (Antrópico)</span>
                      <strong style={{ color: '#f59e0b' }}>22.7%</strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '22.7%', height: '100%', background: '#f59e0b' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1' }}>2. Temperatura Máxima Diaria</span>
                      <strong style={{ color: '#f97316' }}>18.9%</strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '18.9%', height: '100%', background: '#f97316' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1' }}>3. Elevación Andina (msnm)</span>
                      <strong style={{ color: '#38bdf8' }}>13.9%</strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '13.9%', height: '100%', background: '#38bdf8' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1' }}>4. Initial Spread Index (ISI)</span>
                      <strong style={{ color: '#ef4444' }}>11.7%</strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '11.7%', height: '100%', background: '#ef4444' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1' }}>5. Pendiente del Relieve</span>
                      <strong style={{ color: '#a78bfa' }}>10.9%</strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: '10.9%', height: '100%', background: '#a78bfa' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuadrantes con Mayor Susceptibilidad Territorial */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  CELDAS DE MAYOR SUSCEPTIBILIDAD (CLIC PARA ENFOCAR):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topCeldasRiesgo.map((c: any) => {
                    const p = c.properties || {};
                    const color = p.color_hex || '#f59e0b';
                    return (
                      <div
                        key={p.id_celda}
                        className="feed-card"
                        onClick={() => {
                          if (p.centro) setFocusCoords([p.centro.lat, p.centro.lon]);
                          if (!showRiesgoOcurrencia) setShowRiesgoOcurrencia(true);
                        }}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderLeft: `3px solid ${color}` }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px' }}>
                            Celda #{p.id_celda} • {p.comunidad_cercana}
                          </span>
                          <span className={`badge ${p.nivel_riesgo === 'critico' ? 'badge-critical' : p.nivel_riesgo === 'alto' ? 'badge-warning' : 'badge-yellow'}`}>
                            {p.probabilidad_pct ?? 0}% ({p.nivel_riesgo?.toUpperCase()})
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span>Dist: <b style={{ color: '#f1f5f9' }}>{p.distancia_comunidad_km} km</b></span>
                          <span>Alt: <b style={{ color: '#f1f5f9' }}>{p.elevacion_m} m</b></span>
                          <span>FWI: <b style={{ color: '#f87171' }}>{p.fwi}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Content: Meteo FWI */}
          {sidebarTab === 'meteo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                  ÍNDICE CANADIENSE FWI (OPEN-METEO)
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  onClick={() => handleDispararSyncManual('meteo')}
                >
                  <RefreshCw size={12} />
                  Meteo
                </button>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 700 }}>NIVEL DE PELIGRO EN CORACORA:</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {fwi.fwi} <small style={{ fontSize: '14px', color: '#ef4444' }}>{fwi.nivel_peligro.toUpperCase()}</small>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  {fwi.recomendacion}
                </p>
                {fwi.diagnostico && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                    {fwi.diagnostico}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Temperatura:</span>
                  <div style={{ fontWeight: 700, color: '#f97316', fontSize: '14px', marginTop: '2px' }}>{fwi.temperatura} °C</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Humedad Rel.:</span>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '14px', marginTop: '2px' }}>{fwi.humedad_relativa} %</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Viento:</span>
                  <div style={{ fontWeight: 700, color: '#a3e635', fontSize: '14px', marginTop: '2px' }}>{fwi.velocidad_viento} km/h</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Lluvia:</span>
                  <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '14px', marginTop: '2px' }}>{fwi.precipitacion} mm</div>
                </div>
              </div>

              {/* Acceso directo al Modelo de Ocurrencia */}
              <div
                style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '12px', cursor: 'pointer' }}
                onClick={() => setSidebarTab('riesgo')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} color="#f59e0b" /> MODELO ML: RIESGO DE OCURRENCIA
                  </span>
                  <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                    Abrir Pestaña →
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px', lineHeight: 1.4 }}>
                  {grillaOcurrencia?.metadata?.total_celdas ?? 72} celdas evaluadas en Parinacochas con Random Forest Calibrado.
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Content: Simulación de Propagación Eliptica Andina (Cell2Fire) */}
          {sidebarTab === 'simulacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame size={16} /> PROPAGACIÓN DE FUEGO (ANDINO V1)
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(249, 115, 22, 0.4)' }}>
                  Cell2Fire Style
                </span>
              </div>

              {/* Banner de Advertencia Requerido */}
              <div style={{
                background: 'rgba(234, 88, 12, 0.18)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px', color: '#fef08a', lineHeight: 1.4 }}>
                  <strong>Simulación pendiente de aprobación COEP/COEL — No calibrada con dNBR.</strong>
                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px' }}>
                    Esta modelación utiliza Dijkstra celular (300x300 celdas a 30m) con DEM Copernicus y viento 12h. Requiere verificación de operadores antes de alertar al público.
                  </div>
                </div>
              </div>

              {/* Selector de Simulación Activa */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    SIMULACIONES REGISTRADAS ({simulaciones.length})
                  </span>
                  <button
                    className={`btn-admin ${showSimulacionIsocronas ? 'btn-admin-primary' : 'btn-admin-outline'}`}
                    style={{ padding: '3px 8px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setShowSimulacionIsocronas(!showSimulacionIsocronas)}
                  >
                    {showSimulacionIsocronas ? <Eye size={12} /> : <EyeOff size={12} />}
                    {showSimulacionIsocronas ? 'Capas Visibles' : 'Ocultas'}
                  </button>
                </div>

                <select
                  value={selectedSimulacionId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) handleCargarSimulacionGeoJSON(id);
                  }}
                  style={{
                    width: '100%',
                    background: '#0b1324',
                    border: '1px solid var(--border-subtle)',
                    color: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '10px'
                  }}
                >
                  {simulaciones.length === 0 ? (
                    <option value="">No hay simulaciones ejecutadas</option>
                  ) : (
                    simulaciones.map((s: any) => (
                      <option key={s.id_simulacion} value={s.id_simulacion}>
                        #{s.id_simulacion} - {s.estado} ({s.horizonte_horas}h) - {s.creada_en ? new Date(s.creada_en).toLocaleTimeString() : ''}
                      </option>
                    ))
                  )}
                </select>

                {/* Resumen de Isócronas de la Simulación Activa */}
                {simulacionGeojson && simulacionGeojson.features ? (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      ISÓCRONAS CALCULADAS (ANILLOS VECTORIALES):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {simulacionGeojson.features.map((feat: any) => {
                        const p = feat.properties || {};
                        const hora = p.hora_paso;
                        const color = hora === 1 ? '#FBBF24' : hora === 3 ? '#F97316' : '#EF4444';
                        return (
                          <div
                            key={feat.id || hora}
                            style={{
                              background: `rgba(${hora === 1 ? '251, 191, 36' : hora === 3 ? '249, 115, 22' : '239, 68, 68'}, 0.12)`,
                              border: `1px solid ${color}`,
                              borderRadius: '6px',
                              padding: '8px 6px',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '11px', fontWeight: 800, color: color }}>+{hora} HORAS</div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                              {p.area_hectareas}
                            </div>
                            <div style={{ fontSize: '9px', color: '#94a3b8' }}>hectáreas</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón de Evaluación Espacial de Viviendas */}
                    <button
                      className="btn-admin"
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px',
                        fontSize: '11.5px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      disabled={isEvaluatingHouses || !selectedSimulacionId}
                      onClick={async () => {
                        if (!selectedSimulacionId) return;
                        setIsEvaluatingHouses(true);
                        try {
                          const res = await evaluarViviendasSimulacion(selectedSimulacionId, 5.0);
                          setEvalResult(res);
                        } catch (e: any) {
                          alert(`Error al evaluar viviendas: ${e.message}`);
                        } finally {
                          setIsEvaluatingHouses(false);
                        }
                      }}
                    >
                      <Home size={14} />
                      {isEvaluatingHouses ? 'Evaluando PostGIS ST_DWithin...' : 'Evaluar Viviendas en Riesgo (5 km)'}
                    </button>

                    {evalResult && (
                      <div style={{
                        marginTop: '8px',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        padding: '8px',
                        fontSize: '11px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 700, alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Home size={13} color="#38bdf8" /> Viviendas dentro de 5 km:</span>
                          <span style={{ fontSize: '13px' }}>{evalResult.viviendas_en_riesgo_count}</span>
                        </div>
                        <div style={{ color: '#fef08a', fontSize: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} color="#fef08a" /> Alerta #{evalResult.alerta_id || 'Generada'} en estado <strong>PENDIENTE_APROBACION</strong> (Requiere validación humana).
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                    Selecciona o ejecuta una simulación para ver sus isócronas.
                  </div>
                )}
              </div>

              {/* Lanzador de Nueva Simulación */}
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Play size={14} color="#f97316" /> LANZAR NUEVA SIMULACIÓN ANDINA
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                      Latitud (Ignición):
                    </label>
                    <input
                      type="text"
                      value={simLat}
                      onChange={(e) => setSimLat(e.target.value)}
                      placeholder="-15.0189"
                      style={{
                        width: '100%',
                        background: '#0b1324',
                        border: '1px solid var(--border-subtle)',
                        color: '#ffffff',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                      Longitud (Ignición):
                    </label>
                    <input
                      type="text"
                      value={simLon}
                      onChange={(e) => setSimLon(e.target.value)}
                      placeholder="-73.7806"
                      style={{
                        width: '100%',
                        background: '#0b1324',
                        border: '1px solid var(--border-subtle)',
                        color: '#ffffff',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>
                </div>

                {/* Accesos rápidos de selección de coordenadas */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {selectedIncidente && (
                    <button
                      type="button"
                      className="btn-admin btn-admin-outline"
                      style={{ fontSize: '10px', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setSimLat(selectedIncidente.latitud.toString());
                        setSimLon(selectedIncidente.longitud.toString());
                      }}
                      title="Copiar coordenadas del incidente seleccionado"
                    >
                      <MapPin size={11} /> Usar Incidente #{selectedIncidente.id}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-admin btn-admin-outline"
                    style={{ fontSize: '10px', padding: '3px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setSimLat('-15.0189');
                      setSimLon('-73.7806');
                    }}
                    title="Restablecer centro en Coracora"
                  >
                    <RotateCcw size={11} /> Coracora Base
                  </button>
                  <span style={{ fontSize: '10px', color: '#38bdf8', alignSelf: 'center', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={11} /> Clic derecho en el mapa para marcar ignición
                  </span>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                    Horizonte de Propagación:
                  </label>
                  <select
                    value={simHorizonte}
                    onChange={(e) => setSimHorizonte(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#0b1324',
                      border: '1px solid var(--border-subtle)',
                      color: '#ffffff',
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value={1}>1 Hora (Isócrona Inicial)</option>
                    <option value={3}>3 Horas (Isócronas 1h y 3h)</option>
                    <option value={6}>6 Horas Completa (Isócronas 1h, 3h y 6h)</option>
                  </select>
                </div>

                <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mountain size={12} color="#94a3b8" /> Topografía: <strong style={{ color: '#cbd5e1' }}>Copernicus GLO-30 DEM (30m)</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Wind size={12} color="#94a3b8" /> Viento: <strong style={{ color: '#cbd5e1' }}>Vector Meteorológico Open-Meteo</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Layers size={12} color="#94a3b8" /> Combustible: <strong style={{ color: '#cbd5e1' }}>Mosaico Sierra Andina (Pajonal / Roquedal / Bofedal)</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={12} color="#94a3b8" /> Calibración: <strong style={{ color: '#cbd5e1' }}>LOFO 3-Fold (alfa_r0: 0.495, escala anti-exageración)</strong></div>
                </div>

                <button
                  className="btn-admin btn-admin-primary"
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#ea580c',
                    borderColor: '#f97316'
                  }}
                  disabled={isSimulating}
                  onClick={async () => {
                    const lat = parseFloat(simLat);
                    const lon = parseFloat(simLon);
                    if (isNaN(lat) || isNaN(lon)) {
                      alert('Coordenadas inválidas');
                      return;
                    }
                    setIsSimulating(true);
                    try {
                      await handleEjecutarSimulacion(lat, lon, simHorizonte, selectedIncidente?.id);
                    } catch (e: any) {
                      alert(`Error: ${e.message}`);
                    } finally {
                      setIsSimulating(false);
                    }
                  }}
                >
                  <Flame size={14} />
                  {isSimulating ? 'Corriendo Dijkstra en Grilla 300x300...' : 'Ejecutar Simulación Andina'}
                </button>
              </div>
            </div>
          )}

          {/* Sidebar Content: Brigadas */}
          {sidebarTab === 'brigadas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  BRIGADAS DE RESPUESTA ({brigadas.length})
                </span>
              </div>

              {brigadas.map((b) => {
                const isDesplegada = b.estado === 'desplegada' || b.estado === 'en_operacion' || !!b.incidente_asignado;

                return (
                  <div key={b.id} className="feed-card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13.5px' }}>{b.nombre}</span>
                      <span className={`badge ${!isDesplegada ? 'badge-emerald' : 'badge-cyan'}`}>
                        {isDesplegada ? 'DESPLEGADA' : 'DISPONIBLE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {b.entidad} • Efectivos: <strong style={{ color: '#f1f5f9' }}>{b.numero_efectivos}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Líder: {b.lider} ({b.telefono})
                    </div>

                    {b.incidente_asignado && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.35)', borderRadius: '6px', fontSize: '11.5px', color: '#38bdf8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Shield size={12} color="#06b6d4" /> <strong>Desplegada en:</strong> <span style={{ color: '#fff', fontWeight: 700 }}>{b.incidente_asignado.codigo}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                          Misión: <strong style={{ color: '#fb923c' }}>{b.incidente_asignado.rol.replace('_', ' ').toUpperCase()}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
