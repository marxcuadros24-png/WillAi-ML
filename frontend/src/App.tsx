import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CheckCircle, X, Send } from 'lucide-react';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './components/LoginPage';
import { Layout } from './components/Layout';

import { PanelPage } from './pages/PanelPage';
import { MapaPage } from './pages/MapaPage';
import { IncidentesPage } from './pages/IncidentesPage';
import { ReportesPage } from './pages/ReportesPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { AlertasPage } from './pages/AlertasPage';
import { DonacionesPage } from './pages/DonacionesPage';
import { SatelitesPage } from './pages/SatelitesPage';

import type { AppContextType } from './context/AppContext';
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
  fetchBrigadas,
  fetchAlertas,
  fetchDashboardCompleto,
  validarReporte,
  crearIncidente,
  cambiarEstadoIncidente,
  asignarBrigada,
  cerrarIncidente,
  emitirAlerta,
  moderarDonacion,
  dispararSincronizacion
} from './services/api';
import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  AlertaComunitaria,
  PrediccionViento12hData,
  HistorialFirmsResponse,
  ReporteCiudadano,
  DonacionComunitaria,
  LoteSatelital,
  MetricasKPI
} from './types';

export const App: React.FC = () => {
  // Operational State
  const [incidentes, setIncidentes] = useState<Incidente[]>(INITIAL_INCIDENTES);
  const [focos, setFocos] = useState<FocoCalor[]>(INITIAL_FOCOS);
  const [fwi, setFwi] = useState<MetricasFWI>(INITIAL_FWI);
  const [brigadas, setBrigadas] = useState<Brigada[]>(INITIAL_BRIGADAS);
  const [alertas, setAlertas] = useState<AlertaComunitaria[]>(INITIAL_ALERTAS);
  const [viento12h, setViento12h] = useState<PrediccionViento12hData>(INITIAL_VIENTO_12H);
  const [, setHistorialFirms] = useState<HistorialFirmsResponse>(INITIAL_HISTORIAL_FIRMS);

  // Administrative Data State
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [donaciones, setDonaciones] = useState<DonacionComunitaria[]>([]);
  const [lotesSatelitales, setLotesSatelitales] = useState<LoteSatelital[]>([]);
  const [metricas, setMetricas] = useState<MetricasKPI>({
    incidentes_activos: 0,
    incidentes_en_combate: 0,
    reportes_pendientes: 0,
    brigadas_disponibles: 0,
    alertas_activas: 0,
    donaciones_pendientes: 0,
    detecciones_recientes: 0,
    fwi_score: null,
    fwi_nivel: 'MODERADO'
  });

  // Sidebar sub-tab when on '/mapa'
  const [sidebarTab, setSidebarTab] = useState<'incidentes' | 'firms' | 'viento' | 'meteo' | 'brigadas'>('incidentes');
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);

  // Layer toggles on map
  const [showModis, setShowModis] = useState<boolean>(true);
  const [showViirs, setShowViirs] = useState<boolean>(true);
  const [showSerfor, setShowSerfor] = useState<boolean>(true);
  const [showVientoML, setShowVientoML] = useState<boolean>(true);
  const [showIncidentes, setShowIncidentes] = useState<boolean>(true);
  const [showBrigadas, setShowBrigadas] = useState<boolean>(true);

  // Timeline & Historical filters
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom'>('30d');
  const [customDesde, setCustomDesde] = useState<string>('2026-05-01');
  const [customHasta, setCustomHasta] = useState<string>('2026-10-22');
  const [selectedWindHourIdx, setSelectedWindHourIdx] = useState<number>(0);

  // Modals state
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [isCloseIncidentModalOpen, setIsCloseIncidentModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Modal active targets
  const [modalIncidentTarget, setModalIncidentTarget] = useState<Incidente | null>(null);

  // Form states for modals
  const [newIncTitle, setNewIncTitle] = useState('');
  const [newIncTipo, setNewIncTipo] = useState('pastizal');
  const [newIncPrioridad, setNewIncPrioridad] = useState('alta');
  const [newIncLat, setNewIncLat] = useState('-15.0189');
  const [newIncLon, setNewIncLon] = useState('-73.7806');
  const [newIncReporteId, setNewIncReporteId] = useState<number | undefined>(undefined);

  const [dispatchBrigadeId, setDispatchBrigadeId] = useState<number>(1);
  const [dispatchRol, setDispatchRol] = useState('combate_directo');

  const [changeStatusValue, setChangeStatusValue] = useState('en_combate');
  const [changeStatusNota, setChangeStatusNota] = useState('');

  const [closeIncidentMotivo, setCloseIncidentMotivo] = useState('Liquidación completa del fuego y guardia de cenizas realizada con éxito.');

  const [alertFormTitulo, setAlertFormTitulo] = useState('');
  const [alertFormMensaje, setAlertFormMensaje] = useState('');
  const [alertFormInstrucciones, setAlertFormInstrucciones] = useState('');
  const [alertFormPrioridad, setAlertFormPrioridad] = useState('alta');
  const [alertFormTipo, setAlertFormTipo] = useState('evacuacion');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Reload all operational & administrative data
  const loadAllData = async () => {
    try {
      const [inc, foc, v12h, hist, meteo, bri, alt, dash] = await Promise.all([
        fetchIncidentes(),
        fetchFocosFirms(30),
        fetchPrediccionViento12h(),
        fetchHistorialFirms(6),
        fetchFWI(),
        fetchBrigadas(),
        fetchAlertas(),
        fetchDashboardCompleto()
      ]);
      setIncidentes(inc);
      setFocos(foc);
      setViento12h(v12h);
      setHistorialFirms(hist);
      setFwi(meteo);
      setBrigadas(bri);
      setAlertas(alt);
      if (dash) {
        if (dash.reportes) setReportes(dash.reportes);
        if (dash.donaciones) setDonaciones(dash.donaciones);
        if (dash.lotes_satelitales) setLotesSatelitales(dash.lotes_satelitales);
        if (dash.metricas) setMetricas(dash.metricas);
      }
    } catch (err) {
      console.error('Error al sincronizar datos con backend:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers for Timeline filters
  const handleTimeRangeChange = async (newRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => {
    setTimeRange(newRange);
    let dias = 1;
    if (newRange === 'today' || newRange === '24h') dias = 1;
    else if (newRange === '7d') dias = 7;
    else if (newRange === '30d') dias = 30;
    else if (newRange === '3m') dias = 90;
    else if (newRange === '6m') dias = 180;

    const data = await fetchFocosFirms(dias);
    setFocos(data);
    showToast(`NASA FIRMS: Visualizando ${data.length} detecciones satelitales (${newRange.toUpperCase()})`);
  };

  const handleApplyCustomDates = async (desde: string, hasta: string) => {
    setCustomDesde(desde);
    setCustomHasta(hasta);
    const data = await fetchFocosFirms(180, desde, hasta);
    setFocos(data);
    showToast(`NASA FIRMS: Filtro aplicado del ${desde} al ${hasta} (${data.length} focos)`);
  };

  // Operational Action Handlers
  const handleCreateIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await crearIncidente({
        titulo: newIncTitle,
        tipo_incendio: newIncTipo,
        prioridad: newIncPrioridad,
        latitud: parseFloat(newIncLat),
        longitud: parseFloat(newIncLon),
        id_reporte: newIncReporteId
      });
      showToast(`Incidente creado exitosamente: ${res.codigo}`);
      setIsCreateIncidentOpen(false);
      setNewIncTitle('');
      setNewIncReporteId(undefined);
      await loadAllData();
    } catch (err) {
      showToast('Error al crear el incidente táctico');
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIncidentTarget) return;
    try {
      const res = await asignarBrigada(modalIncidentTarget.id, dispatchBrigadeId, dispatchRol);
      showToast(`Brigada ${res.brigada} despachada al incidente ${modalIncidentTarget.codigo}`);
      setIsDispatchModalOpen(false);
      await loadAllData();
    } catch (err) {
      showToast('Error al despachar brigada');
    }
  };

  const handleChangeStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIncidentTarget) return;
    try {
      await cambiarEstadoIncidente(modalIncidentTarget.id, changeStatusValue, changeStatusNota);
      showToast(`Estado de ${modalIncidentTarget.codigo} actualizado a ${changeStatusValue.toUpperCase()}`);
      setIsChangeStatusModalOpen(false);
      setChangeStatusNota('');
      await loadAllData();
    } catch (err) {
      showToast('Error al cambiar el estado del incidente');
    }
  };

  const handleCloseIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIncidentTarget) return;
    try {
      const res = await cerrarIncidente(modalIncidentTarget.id, closeIncidentMotivo);
      showToast(res.mensaje || `Incidente ${modalIncidentTarget.codigo} cerrado formalmente.`);
      setIsCloseIncidentModalOpen(false);
      await loadAllData();
    } catch (err) {
      showToast('Error al cerrar el incidente');
    }
  };

  const handleValidarReporteAction = async (reporte: ReporteCiudadano, resultado: 'validado' | 'rechazado' | 'observado') => {
    try {
      await validarReporte(reporte.id, resultado, `Verificación operativa desde Centro de Mando Táctico (${resultado})`);
      showToast(`Reporte #${reporte.id} marcado como ${resultado.toUpperCase()}`);
      await loadAllData();
    } catch (err) {
      showToast('Error al procesar la validación del reporte');
    }
  };

  const handleConvertirReporteAIncidente = (reporte: ReporteCiudadano) => {
    setNewIncTitle(`Incendio en ${reporte.comunidad} (Reporte #${reporte.id})`);
    setNewIncTipo(reporte.tipo_incendio || 'pastizal');
    setNewIncLat(reporte.latitud.toString());
    setNewIncLon(reporte.longitud.toString());
    setNewIncReporteId(reporte.id);
    setIsCreateIncidentOpen(true);
  };

  const handleEmitirAlertaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await emitirAlerta({
        titulo: alertFormTitulo,
        mensaje: alertFormMensaje,
        instrucciones: alertFormInstrucciones,
        prioridad: alertFormPrioridad,
        tipo: alertFormTipo,
        id_incidente: modalIncidentTarget ? modalIncidentTarget.id : undefined
      });
      showToast(`Alerta comunitaria emitida: ${res.titulo}`);
      setIsAlertModalOpen(false);
      setAlertFormTitulo('');
      setAlertFormMensaje('');
      setAlertFormInstrucciones('');
      await loadAllData();
    } catch (err) {
      showToast('Error al emitir alerta comunitaria');
    }
  };

  const handleModerarDonacionAction = async (donacion: DonacionComunitaria, accion: 'aprobar' | 'rechazar') => {
    try {
      await moderarDonacion(donacion.id, accion, `Revisión desde Centro de Mando Táctico (${accion})`);
      showToast(`Donación #${donacion.id} ${accion === 'aprobar' ? 'aprobada y publicada' : 'rechazada'}`);
      await loadAllData();
    } catch (err) {
      showToast('Error al moderar la oferta de donación');
    }
  };

  const handleDispararSyncManual = async (tipo: 'firms' | 'meteo' | 'fwi') => {
    try {
      const res = await dispararSincronizacion(tipo);
      showToast(res.mensaje || 'Sincronización completada con éxito');
      if (tipo === 'meteo' || tipo === 'fwi') {
        const freshFwi = await fetchFWI(true);
        setFwi(freshFwi);
      }
      await loadAllData();
    } catch (err) {
      showToast('Error al ejecutar sincronización');
    }
  };

  const handleEntrenarVientoManual = async () => {
    try {
      const res = await entrenarModeloViento();
      showToast(`Modelo ML Viento 12h re-entrenado: RMSE ${res.rmse_vectorial} m/s, R² ${res.r2_score}`);
      await loadAllData();
    } catch (err) {
      showToast('Error al entrenar modelo de viento');
    }
  };

  // Compose Shared App Context for Outlet Context
  const appContextValue: AppContextType = {
    metricas,
    fwi,
    incidentes,
    focos,
    brigadas,
    alertas,
    viento12h,
    reportes,
    donaciones,
    lotesSatelitales,
    loadAllData,
    onOpenCreateIncident: () => setIsCreateIncidentOpen(true),
    onOpenAlertModal: () => setIsAlertModalOpen(true),
    onOpenDispatch: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      setIsDispatchModalOpen(true);
    },
    onOpenChangeStatus: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      setChangeStatusValue(inc.estado);
      setIsChangeStatusModalOpen(true);
    },
    onOpenCloseIncident: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      setIsCloseIncidentModalOpen(true);
    },
    handleValidarReporteAction,
    handleConvertirReporteAIncidente,
    handleModerarDonacionAction,
    handleDispararSyncManual,
    handleEntrenarVientoManual,
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
    selectedIncidente,
    setSelectedIncidente,
    sidebarTab,
    setSidebarTab
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Toast Alert */}
        {toastMsg && (
          <div className="toast" style={{ zIndex: 9999 }}>
            <CheckCircle size={18} color="#10b981" />
            <span>{toastMsg}</span>
          </div>
        )}

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout context={appContextValue} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/panel" replace />} />
            <Route path="panel" element={<PanelPage />} />
            <Route path="mapa" element={<MapaPage />} />
            <Route path="incidentes" element={<IncidentesPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route path="donaciones" element={<DonacionesPage />} />
            <Route path="satelites" element={<SatelitesPage />} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Route>
        </Routes>

        {/* ========================================================
            MODALES GLOBALES DE ACCIONES TÁCTICAS
           ======================================================== */}

        {/* Modal: Crear Incidente */}
        {isCreateIncidentOpen && (
          <div className="modal active">
            <div className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title">🔥 Crear Incidente Táctico</h3>
                <button className="btn-icon" onClick={() => setIsCreateIncidentOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Título del Incidente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Incendio Forestal en Cerro Huallhua"
                    value={newIncTitle}
                    onChange={(e) => setNewIncTitle(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 12px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Combustible / Fuego</label>
                    <select
                      value={newIncTipo}
                      onChange={(e) => setNewIncTipo(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    >
                      <option value="pastizal">Pastizal</option>
                      <option value="arbustivo">Matorrales / Arbustos</option>
                      <option value="forestal">Bosque Forestal (Eucalipto/Pino)</option>
                      <option value="interfaz">Interfaz Urbano-Forestal</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nivel de Prioridad</label>
                    <select
                      value={newIncPrioridad}
                      onChange={(e) => setNewIncPrioridad(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    >
                      <option value="critica">Crítica (Riesgo a Población)</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Latitud</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={newIncLat}
                      onChange={(e) => setNewIncLat(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitud</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={newIncLon}
                      onChange={(e) => setNewIncLon(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsCreateIncidentOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-primary">
                    Registrar Incidente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Despachar Brigada */}
        {isDispatchModalOpen && modalIncidentTarget && (
          <div className="modal active">
            <div className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title">🛡️ Despachar Brigada a {modalIncidentTarget.codigo}</h3>
                <button className="btn-icon" onClick={() => setIsDispatchModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleDispatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Seleccionar Brigada Disponible</label>
                  <select
                    value={dispatchBrigadeId}
                    onChange={(e) => setDispatchBrigadeId(Number(e.target.value))}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  >
                    {brigadas.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} ({b.entidad}) - {b.estado.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rol Operativo Táctico</label>
                  <select
                    value={dispatchRol}
                    onChange={(e) => setDispatchRol(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  >
                    <option value="combate_directo">Ataque y Combate Directo</option>
                    <option value="linea_defensa">Apertura de Línea de Defensa / Cortafuego</option>
                    <option value="evacuacion">Protección y Evacuación de Viviendas</option>
                    <option value="abastecimiento">Abastecimiento y Guardia de Cenizas</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsDispatchModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-primary">
                    Confirmar Despacho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cambiar Estado */}
        {isChangeStatusModalOpen && modalIncidentTarget && (
          <div className="modal active">
            <div className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title">⏱️ Actualizar Estado de {modalIncidentTarget.codigo}</h3>
                <button className="btn-icon" onClick={() => setIsChangeStatusModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleChangeStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Nuevo Estado Operativo</label>
                  <select
                    value={changeStatusValue}
                    onChange={(e) => setChangeStatusValue(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  >
                    <option value="en_combate">🔥 En Combate</option>
                    <option value="controlado">🛡️ Controlado (Sin Avance)</option>
                    <option value="extinguido">💧 Extinguido (En Enfriamiento)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nota de Bitácora Operativa</label>
                  <textarea
                    rows={3}
                    placeholder="Detallar avance de cuadrillas o condiciones de terreno..."
                    value={changeStatusNota}
                    onChange={(e) => setChangeStatusNota(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsChangeStatusModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-primary">
                    Guardar Estado
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Cerrar Incidente con Acta */}
        {isCloseIncidentModalOpen && modalIncidentTarget && (
          <div className="modal active">
            <div className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title">🏁 Acta de Cierre Definitivo ({modalIncidentTarget.codigo})</h3>
                <button className="btn-icon" onClick={() => setIsCloseIncidentModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCloseIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#f87171' }}>
                  ⚠️ Al cerrar el incidente, se registrará el acta formal en el sistema forense y todas las brigadas asignadas quedarán liberadas automáticamente al estado <strong>DISPONIBLE</strong>.
                </p>

                <div className="form-group">
                  <label className="form-label">Motivo e Informe Técnico de Cierre</label>
                  <textarea
                    rows={4}
                    required
                    value={closeIncidentMotivo}
                    onChange={(e) => setCloseIncidentMotivo(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsCloseIncidentModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-danger">
                    Emitir Acta y Cerrar Incidente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Emitir Alerta de Emergencia */}
        {isAlertModalOpen && (
          <div className="modal active">
            <div className="modal-box">
              <div className="modal-header">
                <h3 className="modal-title">🚨 Emitir Alerta Temprana a la Comunidad</h3>
                <button className="btn-icon" onClick={() => setIsAlertModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleEmitirAlertaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Título de la Alerta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Alerta Roja por avance de fuego hacia Quebrada Secce"
                    value={alertFormTitulo}
                    onChange={(e) => setAlertFormTitulo(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nivel de Prioridad</label>
                    <select
                      value={alertFormPrioridad}
                      onChange={(e) => setAlertFormPrioridad(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    >
                      <option value="muy_alta">🔴 Muy Alta (Evacuación Inmediata)</option>
                      <option value="alta">🟠 Alta (Preparación)</option>
                      <option value="media">🔵 Media (Informativa)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tipo de Alerta</label>
                    <select
                      value={alertFormTipo}
                      onChange={(e) => setAlertFormTipo(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    >
                      <option value="evacuacion">Evacuación Preventiva</option>
                      <option value="alerta_temprana">Alerta Temprana de Foco</option>
                      <option value="preventiva">Advertencia Meteorológica</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mensaje para la Población</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Se detecta avance rápido por ráfagas de viento..."
                    value={alertFormMensaje}
                    onChange={(e) => setAlertFormMensaje(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Instrucciones de Seguridad</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Dirigirse al punto seguro en la plaza principal de Coracora..."
                    value={alertFormInstrucciones}
                    onChange={(e) => setAlertFormInstrucciones(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsAlertModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-danger">
                    <Send size={14} />
                    Transmitir Alerta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
