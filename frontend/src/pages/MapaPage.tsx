import React from 'react';
import {
  Flame,
  Radio,
  Wind,
  Thermometer,
  Shield,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { TacticalMap } from '../components/TacticalMap';
import { useAppContext } from '../context/AppContext';

export const MapaPage: React.FC = () => {
  const {
    incidentes,
    focos,
    brigadas,
    viento12h,
    selectedIncidente,
    setSelectedIncidente,
    showModis,
    setShowModis,
    showViirs,
    setShowViirs,
    showSerfor,
    setShowSerfor,
    showVientoML,
    setShowVientoML,
    showIncidentes,
    setShowIncidentes,
    showBrigadas,
    setShowBrigadas,
    timeRange,
    handleTimeRangeChange,
    customDesde,
    customHasta,
    handleApplyCustomDates,
    selectedWindHourIdx,
    setSelectedWindHourIdx,
    sidebarTab,
    setSidebarTab,
    fwi,
    onOpenCreateIncident,
    onOpenDispatch,
    onOpenChangeStatus,
    onOpenCloseIncident,
    handleEntrenarVientoManual,
    handleDispararSyncManual
  } = useAppContext();

  const focosModisCount = focos.filter((f) => f.sensor === 'MODIS').length;
  const focosViirsCount = focos.filter((f) => f.sensor === 'VIIRS').length;
  const focosSerforCount = focos.filter((f) => f.fuente === 'SERFOR').length;

  return (
    <div className="workspace" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Tactical Map with Layers and Timeline */}
      <TacticalMap
        incidentes={incidentes}
        focos={focos}
        brigadas={brigadas}
        viento12h={viento12h}
        onSelectIncidente={(inc) => {
          setSelectedIncidente(inc);
          setSidebarTab('incidentes');
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

      {/* Operational Right Sidebar */}
      <aside className="ops-sidebar">
        <div className="sidebar-tabs" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'incidentes' ? 'active' : ''}`}
            onClick={() => setSidebarTab('incidentes')}
          >
            <Flame size={15} />
            <span>Incidentes</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'firms' ? 'active' : ''}`}
            onClick={() => setSidebarTab('firms')}
          >
            <Radio size={15} />
            <span>Satelital</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'viento' ? 'active' : ''}`}
            onClick={() => setSidebarTab('viento')}
          >
            <Wind size={15} color="#38bdf8" />
            <span style={{ color: '#38bdf8' }}>Viento ML</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'meteo' ? 'active' : ''}`}
            onClick={() => setSidebarTab('meteo')}
          >
            <Thermometer size={15} />
            <span>Meteo</span>
          </button>
          <button
            className={`sidebar-tab-btn ${sidebarTab === 'brigadas' ? 'active' : ''}`}
            onClick={() => setSidebarTab('brigadas')}
          >
            <Shield size={15} />
            <span>Brigadas</span>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Sidebar Content: Incidentes */}
          {sidebarTab === 'incidentes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  INCIDENTES ACTIVOS ({incidentes.length})
                </span>
                <button
                  className="btn btn-primary"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  onClick={onOpenCreateIncident}
                >
                  <PlusCircle size={12} />
                  Reportar
                </button>
              </div>

              {incidentes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No hay incendios o incidentes activos registrados.
                </div>
              ) : (
                incidentes.map((inc) => (
                  <div
                    key={inc.id}
                    className={`feed-card ${selectedIncidente?.id === inc.id ? 'active' : ''}`}
                    onClick={() => setSelectedIncidente(inc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px' }}>{inc.codigo}</span>
                      <span className={`badge ${inc.severidad === 'critica' ? 'badge-red' : (inc.severidad === 'alta' ? 'badge-orange' : 'badge-yellow')}`}>
                        {inc.severidad.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginTop: '4px' }}>
                      {inc.titulo}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📍 {inc.comunidad} • Viviendas en riesgo: <strong style={{ color: '#ef4444' }}>{inc.viviendas_riesgo}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDispatch(inc);
                        }}
                      >
                        Despachar
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChangeStatus(inc);
                        }}
                      >
                        Estado
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCloseIncident(inc);
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sidebar Content: FIRMS Satelital */}
          {sidebarTab === 'firms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  MONITOREO SATELITAL ({focos.length})
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  onClick={() => handleDispararSyncManual('firms')}
                >
                  <RefreshCw size={12} />
                  Sincronizar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>MODIS (1km)</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{focosModisCount}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>VIIRS (375m)</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{focosViirsCount}</div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Focos SERFOR Perú: <strong>{focosSerforCount}</strong>
              </div>

              {focos.slice(0, 10).map((f, idx) => (
                <div key={idx} className="feed-card" style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={`badge ${f.sensor.includes('MODIS') ? 'badge-orange' : 'badge-red'}`}>
                      {f.sensor}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.fecha_hora}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                    {f.latitud.toFixed(4)}, {f.longitud.toFixed(4)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    FRP: {f.frp || '--'} MW • Confianza: {f.confianza}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sidebar Content: Viento ML 12h */}
          {sidebarTab === 'viento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  PROPAGACIÓN DE VIENTO ML (12H)
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  onClick={handleEntrenarVientoManual}
                >
                  <RefreshCw size={12} />
                  Reentrenar
                </button>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '10px', fontSize: '11px' }}>
                <div style={{ color: '#38bdf8', fontWeight: 700 }}>MODELO: {viento12h.metricas_entrenamiento.algoritmo}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                  R² Score: <strong>{viento12h.metricas_entrenamiento.r2_score}</strong> • RMSE: <strong>{viento12h.metricas_entrenamiento.rmse_vectorial} m/s</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {viento12h.pronostico_12h?.map((p, idx) => (
                  <div
                    key={idx}
                    className={`feed-card ${selectedWindHourIdx === idx ? 'active' : ''}`}
                    onClick={() => setSelectedWindHourIdx(idx)}
                    style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#ffffff' }}>+{p.paso_hora}h ({p.hora_label})</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.velocidad_kmh} km/h • Ráfagas: {p.rafagas_kmh} km/h
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 700 }}>
                      Hacia {p.hacia_cardinal}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar Content: Meteo FWI */}
          {sidebarTab === 'meteo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                  ÍNDICE CANADIENSE FWI (OPEN-METEO)
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  onClick={() => handleDispararSyncManual('meteo')}
                >
                  <RefreshCw size={12} />
                  Meteo
                </button>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>NIVEL DE PELIGRO EN CORACORA:</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {fwi.fwi} <small style={{ fontSize: '14px', color: '#ef4444' }}>{fwi.nivel_peligro.toUpperCase()}</small>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {fwi.recomendacion}
                </p>
                {fwi.diagnostico && (
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    {fwi.diagnostico}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Temperatura:</span>
                  <div style={{ fontWeight: 700, color: '#f97316' }}>{fwi.temperatura} °C</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Humedad Rel.:</span>
                  <div style={{ fontWeight: 700, color: '#38bdf8' }}>{fwi.humedad_relativa} %</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Viento:</span>
                  <div style={{ fontWeight: 700, color: '#a3e635' }}>{fwi.velocidad_viento} km/h</div>
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Lluvia:</span>
                  <div style={{ fontWeight: 700, color: '#60a5fa' }}>{fwi.precipitacion} mm</div>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Content: Brigadas */}
          {sidebarTab === 'brigadas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  BRIGADAS DE RESPUESTA ({brigadas.length})
                </span>
              </div>

              {brigadas.map((b) => (
                <div key={b.id} className="feed-card" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>{b.nombre}</span>
                    <span className={`badge ${b.estado === 'disponible' ? 'badge-emerald' : 'badge-yellow'}`}>
                      {b.estado.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {b.entidad} • Efectivos: <strong>{b.numero_efectivos}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Líder: {b.lider} ({b.telefono})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
