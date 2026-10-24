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
    viviendas,
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
    showViviendas,
    setShowViviendas,
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
    onOpenCreateIncidentWithCoords,
    onOpenCreateViviendaWithCoords,
    onOpenDispatch,
    onOpenChangeStatus,
    onOpenCloseIncident,
    handleEntrenarVientoManual,
    handleDispararSyncManual
  } = useAppContext();

  const incidentesActivos = incidentes.filter((inc) => inc.estado !== 'cerrado');
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
        viviendas={viviendas}
        viento12h={viento12h}
        selectedIncidente={selectedIncidente}
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
        showViviendas={showViviendas}
        onToggleModis={setShowModis}
        onToggleViirs={setShowViirs}
        onToggleSerfor={setShowSerfor}
        onToggleVientoML={setShowVientoML}
        onToggleIncidentes={setShowIncidentes}
        onToggleBrigadas={setShowBrigadas}
        onToggleViviendas={setShowViviendas}
        timeRange={timeRange}
        onChangeTimeRange={handleTimeRangeChange}
        fechaDesde={customDesde}
        fechaHasta={customHasta}
        onApplyCustomDates={handleApplyCustomDates}
        selectedHourIdx={selectedWindHourIdx}
        onMapCreateIncident={onOpenCreateIncidentWithCoords}
        onMapCreateVivienda={onOpenCreateViviendaWithCoords}
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
                          ⚠️ PRIORIDAD CRÍTICA • ALTO RIESGO A POBLACIÓN
                        </div>
                      )}

                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
                        {inc.titulo}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        📍 {inc.comunidad} • Viviendas en riesgo: <strong style={{ color: '#ef4444' }}>{inc.viviendas_riesgo}</strong>
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

          {/* Sidebar Content: Viento ML 12h */}
          {sidebarTab === 'viento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                  PROPAGACIÓN DE VIENTO ML (12H)
                </span>
                <button
                  className="btn-admin btn-admin-outline"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                  onClick={handleEntrenarVientoManual}
                >
                  <RefreshCw size={12} />
                  Reentrenar
                </button>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '12.5px' }}>MODELO: {viento12h.metricas_entrenamiento.algoritmo}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  R² Score: <strong>{viento12h.metricas_entrenamiento.r2_score}</strong> • RMSE: <strong>{viento12h.metricas_entrenamiento.rmse_vectorial} m/s</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {viento12h.pronostico_12h?.map((p, idx) => (
                  <div
                    key={idx}
                    className={`feed-card ${selectedWindHourIdx === idx ? 'active' : ''}`}
                    onClick={() => setSelectedWindHourIdx(idx)}
                    style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>+{p.paso_hora}h ({p.hora_label})</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {p.velocidad_kmh} km/h • Ráfagas: {p.rafagas_kmh} km/h
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 700, background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
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
                        <div>
                          🛡️ <strong>Desplegada en:</strong> <span style={{ color: '#fff', fontWeight: 700 }}>{b.incidente_asignado.codigo}</span>
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
