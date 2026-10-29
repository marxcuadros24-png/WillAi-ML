import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CheckCircle, X, Send, MapPin, Crosshair, Plus, Flame, Shield, CheckCircle2, AlertTriangle, Megaphone, Home } from 'lucide-react';
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
import { BrigadasPage } from './pages/BrigadasPage';
import { ViviendasPage } from './pages/ViviendasPage';
import { LogrosPage } from './pages/LogrosPage';

import type { AppContextType } from './context/AppContext';
import {
  INITIAL_INCIDENTES,
  INITIAL_FOCOS,
  INITIAL_FWI,
  INITIAL_BRIGADAS,
  INITIAL_ALERTAS,
  INITIAL_HISTORIAL_FIRMS,
  SECTORES_CORACORA,
  fetchIncidentes,
  fetchFocosFirms,
  fetchHistorialFirms,
  fetchFWI,
  fetchBrigadas,
  fetchViviendas,
  crearVivienda,
  fetchAlertas,
  fetchDashboardCompleto,
  validarReporte,
  eliminarReporte,
  crearIncidente,
  cambiarEstadoIncidente,
  asignarBrigada,
  cerrarIncidente,
  emitirAlerta,
  moderarDonacion,
  dispararSincronizacion,
  fetchRiesgoOcurrencia,
  entrenarModeloOcurrencia,
  fetchSimulaciones,
  fetchSimulacionGeoJSON,
  crearSimulacionPropagacion
} from './services/api';
import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  ViviendaRural,
  AlertaComunitaria,
  HistorialFirmsResponse,
  ReporteCiudadano,
  DonacionComunitaria,
  LoteSatelital,
  MetricasKPI,
  GrillaRiesgoOcurrenciaData
} from './types';

export const App: React.FC = () => {
  // Operational State
  const [incidentes, setIncidentes] = useState<Incidente[]>(INITIAL_INCIDENTES);
  const [focos, setFocos] = useState<FocoCalor[]>(INITIAL_FOCOS);
  const [fwi, setFwi] = useState<MetricasFWI>(INITIAL_FWI);
  const [brigadas, setBrigadas] = useState<Brigada[]>(INITIAL_BRIGADAS);
  const [viviendas, setViviendas] = useState<ViviendaRural[]>([]);
  const [alertas, setAlertas] = useState<AlertaComunitaria[]>(INITIAL_ALERTAS);
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
  const [sidebarTab, setSidebarTab] = useState<'incidentes' | 'firms' | 'riesgo' | 'simulacion' | 'meteo' | 'brigadas'>('incidentes');
  const [selectedIncidente, setSelectedIncidente] = useState<Incidente | null>(null);

  // Layer toggles on map
  const [showModis, setShowModis] = useState<boolean>(true);
  const [showViirs, setShowViirs] = useState<boolean>(true);
  const [showSerfor, setShowSerfor] = useState<boolean>(true);
  const [showRiesgoOcurrencia, setShowRiesgoOcurrencia] = useState<boolean>(true);
  const [grillaOcurrencia, setGrillaOcurrencia] = useState<GrillaRiesgoOcurrenciaData | null>(null);
  const [showIncidentes, setShowIncidentes] = useState<boolean>(true);
  const [showBrigadas, setShowBrigadas] = useState<boolean>(true);
  const [showViviendas, setShowViviendas] = useState<boolean>(true);
  // Simulación de Propagación (Cell2Fire Eliptico Andino)
  const [showSimulacionIsocronas, setShowSimulacionIsocronas] = useState<boolean>(true);
  const [simulaciones, setSimulaciones] = useState<any[]>([]);
  const [selectedSimulacionId, setSelectedSimulacionId] = useState<number | null>(null);
  const [simulacionGeojson, setSimulacionGeojson] = useState<any | null>(null);

  // Timeline & Historical filters
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom'>('today');
  const [customDesde, setCustomDesde] = useState<string>('2026-05-01');
  const [customHasta, setCustomHasta] = useState<string>('2026-10-22');

  // Modals state
  const [isCreateIncidentOpen, setIsCreateIncidentOpen] = useState(false);
  const [isCreateViviendaModalOpen, setIsCreateViviendaModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [isCloseIncidentModalOpen, setIsCloseIncidentModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Form state for quick vivienda creation
  const [newVivLat, setNewVivLat] = useState<number>(-15.0189);
  const [newVivLon, setNewVivLon] = useState<number>(-73.7806);
  const [newVivReferencia, setNewVivReferencia] = useState<string>('');
  const [newVivResponsable, setNewVivResponsable] = useState<string>('');
  const [newVivTelefono, setNewVivTelefono] = useState<string>('+51 966 ');
  const [newVivMaterial, setNewVivMaterial] = useState<string>('adobe_teja');
  const [newVivHabitantes, setNewVivHabitantes] = useState<number>(4);
  const [newVivSectorId, setNewVivSectorId] = useState<number>(1);

  // Modal active targets
  const [modalIncidentTarget, setModalIncidentTarget] = useState<Incidente | null>(null);

  // Form states for modals
  const [newIncTitle, setNewIncTitle] = useState('');
  const [newIncTipo, setNewIncTipo] = useState('pastizal');
  const [newIncPrioridad, setNewIncPrioridad] = useState('alta');
  const [newIncLat, setNewIncLat] = useState('-15.0189');
  const [newIncLon, setNewIncLon] = useState('-73.7806');
  const [newIncSectorId, setNewIncSectorId] = useState<number>(1);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
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
      const results = await Promise.allSettled([
        fetchIncidentes(),
        fetchFocosFirms(1),
        fetchHistorialFirms(6),
        fetchFWI(),
        fetchBrigadas(),
        fetchAlertas(),
        fetchDashboardCompleto(),
        fetchViviendas(),
        fetchRiesgoOcurrencia(),
        fetchSimulaciones()
      ]);

      if (results[0].status === 'fulfilled') setIncidentes(results[0].value);
      if (results[1].status === 'fulfilled') setFocos(results[1].value);
      if (results[2].status === 'fulfilled') setHistorialFirms(results[2].value);
      if (results[3].status === 'fulfilled') setFwi(results[3].value);
      if (results[4].status === 'fulfilled') setBrigadas(results[4].value);
      if (results[5].status === 'fulfilled') setAlertas(results[5].value);
      if (results[6].status === 'fulfilled' && results[6].value) {
        const dash = results[6].value;
        if (dash.reportes) setReportes(dash.reportes);
        if (dash.donaciones) setDonaciones(dash.donaciones);
        if (dash.lotes_satelitales) setLotesSatelitales(dash.lotes_satelitales);
        if (dash.metricas) setMetricas(dash.metricas);
      }
      if (results[7].status === 'fulfilled') setViviendas(results[7].value);
      if (results[8].status === 'fulfilled' && results[8].value) setGrillaOcurrencia(results[8].value);
      if (results[9].status === 'fulfilled' && results[9].value) {
        const sims = results[9].value;
        setSimulaciones(sims);
        if (sims.length > 0) {
          const ultimaCompletada = sims.find((s: any) => s.estado === 'COMPLETADO') || sims[0];
          if (ultimaCompletada) {
            setSelectedSimulacionId(ultimaCompletada.id_simulacion);
            fetchSimulacionGeoJSON(ultimaCompletada.id_simulacion).then((geo) => {
              if (geo) setSimulacionGeojson(geo);
            });
          }
        }
      }
    } catch (err) {
      console.error('Error al sincronizar datos con backend:', err);
    }
  };

  const handleCargarSimulacionGeoJSON = async (id: number) => {
    setSelectedSimulacionId(id);
    const geo = await fetchSimulacionGeoJSON(id);
    if (geo) {
      setSimulacionGeojson(geo);
      setShowSimulacionIsocronas(true);
      showToast(`Isócronas cargadas: Simulación #${id} (${geo.features?.length || 0} horizontes)`);
    }
  };

  const handleEjecutarSimulacion = async (
    lat: number,
    lon: number,
    horizonteHoras: number = 6,
    incidenteId?: number
  ) => {
    try {
      showToast('Iniciando simulación de propagación elíptica andina...');
      const nuevaSim = await crearSimulacionPropagacion({
        lat,
        lon,
        horizonte_horas: horizonteHoras,
        incidente: incidenteId,
        ruta_dem: 'data/coracora_dem_utm18s.tif'
      });
      showToast(`Simulación #${nuevaSim.id_simulacion} lanzada exitosamente.`);
      const sims = await fetchSimulaciones();
      setSimulaciones(sims);
      setSelectedSimulacionId(nuevaSim.id_simulacion);

      // Cargar geojson resultante
      const geo = await fetchSimulacionGeoJSON(nuevaSim.id_simulacion);
      if (geo) {
        setSimulacionGeojson(geo);
        setShowSimulacionIsocronas(true);
      }
      return nuevaSim;
    } catch (err: any) {
      showToast(`Error al simular: ${err.message}`);
      throw err;
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers for Timeline filters
  const handleTimeRangeChange = async (newRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => {
    setTimeRange(newRange);
    if (newRange === 'custom') {
      return;
    }
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
    setTimeRange('custom');
    setCustomDesde(desde);
    setCustomHasta(hasta);
    const data = await fetchFocosFirms(undefined, desde, hasta);
    setFocos(data);
    showToast(`NASA FIRMS: Filtro aplicado del ${desde} al ${hasta} (${data.length} focos)`);
  };

  const handleSelectSector = (sectorId: number) => {
    setNewIncSectorId(sectorId);
    if (sectorId === 0) {
      setShowManualCoords(true);
      return;
    }
    const sector = SECTORES_CORACORA.find((s) => s.id === sectorId);
    if (sector) {
      setNewIncLat(sector.lat.toFixed(4));
      setNewIncLon(sector.lon.toFixed(4));
      if (!newIncTitle || newIncTitle.startsWith('Incendio en') || newIncTitle === '') {
        setNewIncTitle(`Incendio en ${sector.nombre}`);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocalización no soportada en este navegador');
      return;
    }
    showToast('Obteniendo ubicación GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        setNewIncLat(lat);
        setNewIncLon(lon);
        setNewIncSectorId(0);
        setShowManualCoords(true);
        showToast(`Ubicación GPS obtenida: ${lat}, ${lon}`);
      },
      () => {
        showToast('No se pudo acceder a la señal GPS del dispositivo');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleOpenCreateIncidentWithCoords = (lat: number, lon: number) => {
    const latFixed = lat.toFixed(4);
    const lonFixed = lon.toFixed(4);
    setNewIncLat(latFixed);
    setNewIncLon(lonFixed);

    // Auto-detect closest known sector to provide smart title and community association
    let closestSector = SECTORES_CORACORA[0];
    let minDistance = 999999;
    for (const sec of SECTORES_CORACORA) {
      const d = Math.hypot(sec.lat - lat, sec.lon - lon);
      if (d < minDistance) {
        minDistance = d;
        closestSector = sec;
      }
    }

    if (minDistance < 0.05) {
      setNewIncSectorId(closestSector.id);
      setNewIncTitle(`Incendio forestal en sector ${closestSector.nombre}`);
    } else {
      setNewIncSectorId(0);
      setNewIncTitle(`Incendio detectado en punto (${latFixed}, ${lonFixed})`);
    }

    setShowManualCoords(false);
    setIsCreateIncidentOpen(true);
  };

  const handleOpenCreateViviendaWithCoords = (lat: number, lon: number) => {
    const latFixed = parseFloat(lat.toFixed(5));
    const lonFixed = parseFloat(lon.toFixed(5));
    setNewVivLat(latFixed);
    setNewVivLon(lonFixed);

    let closestSector = SECTORES_CORACORA[0];
    let minDistance = 999999;
    for (const sec of SECTORES_CORACORA) {
      const d = Math.hypot(sec.lat - lat, sec.lon - lon);
      if (d < minDistance) {
        minDistance = d;
        closestSector = sec;
      }
    }

    if (minDistance < 0.05) {
      setNewVivSectorId(closestSector.id);
      setNewVivReferencia(`Vivienda rural en sector ${closestSector.nombre}`);
    } else {
      setNewVivSectorId(0);
      setNewVivReferencia(`Vivienda en coordenadas (${latFixed}, ${lonFixed})`);
    }

    setIsCreateViviendaModalOpen(true);
  };

  const handleCreateViviendaQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sectorActual = SECTORES_CORACORA.find((s) => s.id === newVivSectorId);
      const res = await crearVivienda({
        referencia: newVivReferencia,
        latitud: newVivLat,
        longitud: newVivLon,
        comunidad_id: newVivSectorId > 0 ? newVivSectorId : undefined,
        comunidad_nombre: sectorActual?.nombre,
        nombre_responsable: newVivResponsable,
        telefono_contacto: newVivTelefono,
        material_predominante: newVivMaterial,
        habitantes: newVivHabitantes
      });
      showToast(`Vivienda rural registrada: ${res.codigo || 'VIV'} (${newVivReferencia})`);
      setIsCreateViviendaModalOpen(false);
      setNewVivReferencia('');
      setNewVivResponsable('');

      // Asegurar que la capa de viviendas en el mapa esté encendida
      setShowViviendas(true);

      // Cargar padrón actualizado inmediatamente para refresco instantáneo del mapa
      const freshVivs = await fetchViviendas();
      if (freshVivs && freshVivs.length > 0) {
        setViviendas(freshVivs);
      }

      // Sincronizar el resto del estado operativo
      loadAllData();
    } catch (err) {
      showToast('Error al registrar vivienda rural');
    }
  };

  // Operational Action Handlers
  const handleCreateIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedLat = parseFloat(newIncLat);
      const parsedLon = parseFloat(newIncLon);
      const sectorActual = SECTORES_CORACORA.find((s) => s.id === newIncSectorId);
      const res = await crearIncidente({
        titulo: newIncTitle,
        tipo_incendio: newIncTipo,
        prioridad: newIncPrioridad,
        latitud: isNaN(parsedLat) ? -15.0189 : parsedLat,
        longitud: isNaN(parsedLon) ? -73.7806 : parsedLon,
        id_reporte: newIncReporteId,
        id_comunidad: newIncSectorId > 0 ? newIncSectorId : undefined,
        comunidad_nombre: sectorActual?.nombre
      });
      showToast(`Incidente creado exitosamente: ${res.codigo}`);
      setIsCreateIncidentOpen(false);
      setNewIncTitle('');
      setNewIncReporteId(undefined);
      setNewIncSectorId(1);
      setShowManualCoords(false);
      await loadAllData();
    } catch (err: any) {
      console.error('Error al crear el incidente táctico:', err);
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

      // Optimistic update for immediate visual response on Tactical Map and sidebars
      const targetBrigada = brigadas.find((b) => b.id === dispatchBrigadeId);
      if (targetBrigada) {
        setBrigadas((prev) =>
          prev.map((b) =>
            b.id === dispatchBrigadeId
              ? {
                  ...b,
                  estado: 'desplegada',
                  incidente_asignado: {
                    id_asignacion: res.id_asignacion || 0,
                    id_incidente: modalIncidentTarget.id,
                    codigo: modalIncidentTarget.codigo,
                    titulo: modalIncidentTarget.titulo,
                    latitud: modalIncidentTarget.latitud,
                    longitud: modalIncidentTarget.longitud,
                    rol: dispatchRol,
                    estado_asignacion: 'asignada',
                    asignada_en: 'Recién despachada'
                  }
                }
              : b
          )
        );
      }

      setIncidentes((prev) =>
        prev.map((inc) =>
          inc.id === modalIncidentTarget.id
            ? {
                ...inc,
                estado: 'en_combate',
                brigadas_asignadas: [
                  ...inc.brigadas_asignadas.filter((n) => n !== targetBrigada?.nombre),
                  targetBrigada?.nombre || 'Brigada Despachada'
                ]
              }
            : inc
        )
      );

      await loadAllData();
    } catch (err) {
      showToast('Error al despachar brigada');
    }
  };

  const handleChangeStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIncidentTarget) return;
    const targetId = modalIncidentTarget.id;
    const targetCodigo = modalIncidentTarget.codigo;
    try {
      await cambiarEstadoIncidente(targetId, changeStatusValue, changeStatusNota);
      showToast(`Estado de ${targetCodigo} actualizado a ${changeStatusValue.replace('_', ' ').toUpperCase()}`);
      setIsChangeStatusModalOpen(false);
      setChangeStatusNota('');

      // Optimistic update
      setIncidentes((prev) =>
        prev.map((inc) =>
          inc.id === targetId
            ? { ...inc, estado: changeStatusValue as any }
            : inc
        )
      );

      await loadAllData();
    } catch (err: any) {
      console.error('Error al cambiar el estado del incidente:', err);
      showToast('Error al cambiar el estado del incidente');
    }
  };

  const handleCloseIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalIncidentTarget) return;
    const targetId = modalIncidentTarget.id;
    const targetCodigo = modalIncidentTarget.codigo;
    try {
      const res = await cerrarIncidente(targetId, closeIncidentMotivo);
      showToast(res.mensaje || `Incidente ${targetCodigo} cerrado formalmente.`);
      setIsCloseIncidentModalOpen(false);
      setModalIncidentTarget(null);
      if (selectedIncidente?.id === targetId) {
        setSelectedIncidente(null);
      }
      // Optimistic update: mark as cerrado immediately so it leaves the map & active list instantly
      setIncidentes((prev) => prev.map((inc) => inc.id === targetId ? { ...inc, estado: 'cerrado' } : inc));
      await loadAllData();
    } catch (err: any) {
      console.error('Error al cerrar incidente:', err);
      showToast('Error al cerrar el incidente');
    }
  };

  const handleValidarReporteAction = async (reporte: ReporteCiudadano, resultado: 'validado' | 'rechazado' | 'observado') => {
    try {
      await validarReporte(reporte.id, resultado, `Verificación operativa desde Centro de Mando Táctico (${resultado})`);
      showToast(
        resultado === 'rechazado'
          ? `Reporte #${reporte.id} descartado y retirado de la cola de pendientes`
          : `Reporte #${reporte.id} marcado como ${resultado.toUpperCase()}`
      );

      // Optimistic update
      setReportes((prev) =>
        prev.map((r) =>
          r.id === reporte.id
            ? { ...r, estado: resultado === 'validado' ? 'confirmado' : resultado }
            : r
        )
      );

      await loadAllData();
    } catch (err) {
      showToast('Error al procesar la validación del reporte');
    }
  };

  const handleEliminarReporteAction = async (reporte: ReporteCiudadano) => {
    if (!window.confirm(`¿Estás seguro de eliminar el reporte #${reporte.id} de ${reporte.comunidad}? Esta acción borrará el reporte de la base de datos.`)) {
      return;
    }
    try {
      await eliminarReporte(reporte.id);
      showToast(`Reporte #${reporte.id} borrado de la base de datos`);

      // Optimistic delete: remove from state immediately
      setReportes((prev) => prev.filter((r) => r.id !== reporte.id));

      await loadAllData();
    } catch (err) {
      showToast('Error al eliminar el reporte');
    }
  };

  const handleConvertirReporteAIncidente = (reporte: ReporteCiudadano) => {
    setNewIncTitle(`Incendio en ${reporte.comunidad} (Reporte #${reporte.id})`);
    setNewIncTipo(reporte.tipo_incendio || 'pastizal');
    setNewIncLat(reporte.latitud.toString());
    setNewIncLon(reporte.longitud.toString());
    setNewIncReporteId(reporte.id);
    const matchedSector = SECTORES_CORACORA.find((s) =>
      s.nombre.toLowerCase().includes(reporte.comunidad.toLowerCase()) ||
      reporte.comunidad.toLowerCase().includes(s.nombre.toLowerCase().split(' ')[0])
    );
    if (matchedSector) {
      setNewIncSectorId(matchedSector.id);
      setShowManualCoords(false);
    } else {
      setNewIncSectorId(0);
      setShowManualCoords(true);
    }
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

  const handleEntrenarOcurrenciaManual = async () => {
    try {
      showToast('Re-entrenando modelo ML de riesgo de ocurrencia (NASA FIRMS + Open-Meteo)...');
      const res = await entrenarModeloOcurrencia();
      const grilla = await fetchRiesgoOcurrencia();
      if (grilla) setGrillaOcurrencia(grilla);
      showToast(`Modelo ML Ocurrencia re-entrenado: ${res.total_celdas ?? 0} celdas evaluadas.`);
    } catch (err: any) {
      showToast('Error al entrenar modelo ML de ocurrencia');
    }
  };

  // Compose Shared App Context for Outlet Context
  const appContextValue: AppContextType = {
    metricas,
    fwi,
    incidentes,
    focos,
    brigadas,
    viviendas,
    alertas,
    grillaOcurrencia,
    reportes,
    donaciones,
    lotesSatelitales,
    loadAllData,
    onOpenCreateIncident: () => setIsCreateIncidentOpen(true),
    onOpenCreateIncidentWithCoords: handleOpenCreateIncidentWithCoords,
    onOpenCreateViviendaWithCoords: handleOpenCreateViviendaWithCoords,
    onOpenAlertModal: () => setIsAlertModalOpen(true),
    onOpenDispatch: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      const firstAvailable = brigadas.find((b) => b.estado === 'disponible') || brigadas[0];
      if (firstAvailable) {
        setDispatchBrigadeId(firstAvailable.id);
      }
      setIsDispatchModalOpen(true);
    },
    onOpenChangeStatus: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      const validOptions = ['en_combate', 'controlado', 'extinguido', 'cerrado'];
      const initialVal = validOptions.includes(inc.estado) ? inc.estado : 'en_combate';
      setChangeStatusValue(initialVal);
      setChangeStatusNota('');
      setIsChangeStatusModalOpen(true);
    },
    onOpenCloseIncident: (inc: Incidente) => {
      setModalIncidentTarget(inc);
      setIsCloseIncidentModalOpen(true);
    },
    handleValidarReporteAction,
    handleEliminarReporteAction,
    handleConvertirReporteAIncidente,
    handleModerarDonacionAction,
    handleDispararSyncManual,
    handleEntrenarOcurrenciaManual,
    showModis,
    setShowModis,
    showViirs,
    setShowViirs,
    showSerfor,
    setShowSerfor,
    showRiesgoOcurrencia,
    setShowRiesgoOcurrencia,
    showIncidentes,
    setShowIncidentes,
    showBrigadas,
    setShowBrigadas,
    showViviendas,
    setShowViviendas,
    // Simulación de Propagación (Cell2Fire Eliptico Andino)
    simulaciones,
    selectedSimulacionId,
    setSelectedSimulacionId,
    simulacionGeojson,
    setSimulacionGeojson,
    showSimulacionIsocronas,
    setShowSimulacionIsocronas,
    handleEjecutarSimulacion,
    handleCargarSimulacionGeoJSON,
    timeRange,
    handleTimeRangeChange,
    customDesde,
    customHasta,
    handleApplyCustomDates,
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
            <Route path="brigadas" element={<BrigadasPage />} />
            <Route path="viviendas" element={<ViviendasPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="logros" element={<LogrosPage />} />
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
            <div className="modal-box" style={{ maxWidth: '540px' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={20} color="#f97316" />
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '15px', color: '#ffffff' }}>Registrar Incidente Táctico</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Centro de Mando de Emergencias — Coracora
                    </p>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setIsCreateIncidentOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 1. Selector de Sector / Comunidad (Resuelve el ingreso por coordenadas) */}
                <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: '#38bdf8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} color="#38bdf8" /> Sector o Comunidad de Coracora:
                    </label>
                    <button
                      type="button"
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={handleUseCurrentLocation}
                      title="Obtener coordenadas GPS del dispositivo"
                    >
                      <Crosshair size={12} color="#38bdf8" />
                      Mi Ubicación GPS
                    </button>
                  </div>

                  <select
                    value={newIncSectorId}
                    onChange={(e) => handleSelectSector(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: '#030712',
                      border: '1px solid #38bdf8',
                      borderRadius: '6px',
                      padding: '9px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {SECTORES_CORACORA.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.nombre} — ({sec.referencia})
                      </option>
                    ))}
                    <option value={0}>Ingresar coordenadas manuales</option>
                  </select>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11.5px', color: '#94a3b8' }}>
                    <span>
                      Coordenadas asignadas: <strong style={{ color: '#f1f5f9', fontFamily: 'var(--font-mono)' }}>{newIncLat}, {newIncLon}</strong>
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                      onClick={() => setShowManualCoords(!showManualCoords)}
                    >
                      {showManualCoords ? 'Ocultar Coordenadas' : 'Editar Coordenadas Manuales'}
                    </button>
                  </div>

                  {/* Coordenadas numéricas manuales (Colapsables para cuando sea necesario) */}
                  {showManualCoords && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Latitud Decimal</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={newIncLat}
                          onChange={(e) => {
                            setNewIncLat(e.target.value);
                            setNewIncSectorId(0);
                          }}
                          style={{ width: '100%', background: '#030712', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Longitud Decimal</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={newIncLon}
                          onChange={(e) => {
                            setNewIncLon(e.target.value);
                            setNewIncSectorId(0);
                          }}
                          style={{ width: '100%', background: '#030712', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Título del Incidente */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Título o Denominación del Incidente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Incendio Forestal en Cerro Huallhua"
                    value={newIncTitle}
                    onChange={(e) => setNewIncTitle(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Tipo de Combustible / Fuego</label>
                    <select
                      value={newIncTipo}
                      onChange={(e) => setNewIncTipo(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    >
                      <option value="pastizal">Pastizal / Pajonal</option>
                      <option value="arbustivo">Matorrales / Arbustos</option>
                      <option value="forestal">Bosque Forestal (Eucalipto/Pino)</option>
                      <option value="interfaz">Interfaz Urbano-Forestal</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Nivel de Prioridad Operativa</label>
                    <select
                      value={newIncPrioridad}
                      onChange={(e) => setNewIncPrioridad(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                    >
                      <option value="critica">Crítica (Riesgo a Población)</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
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
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="#38bdf8" /> Despachar Brigada a {modalIncidentTarget.codigo}
                </h3>
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
                        {b.estado === 'disponible' ? '[DISPONIBLE]' : '[DESPLEGADA]'} {b.nombre} ({b.entidad})
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
                    <option value="en_combate">En Combate</option>
                    <option value="controlado">Controlado (Sin Avance)</option>
                    <option value="extinguido">Extinguido (En Enfriamiento)</option>
                    <option value="cerrado">Cerrado / Finalizado</option>
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
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="#34d399" /> Acta de Cierre Definitivo ({modalIncidentTarget.codigo})
                </h3>
                <button className="btn-icon" onClick={() => setIsCloseIncidentModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCloseIncidentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <AlertTriangle size={15} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Al cerrar el incidente, se registrará el acta formal en el sistema forense y todas las brigadas asignadas quedarán liberadas automáticamente al estado <strong>DISPONIBLE</strong>.</span>
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
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={18} color="#ef4444" /> Emitir Alerta Temprana a la Comunidad
                </h3>
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
                      <option value="muy_alta">Muy Alta (Evacuación Inmediata)</option>
                      <option value="alta">Alta (Preparación)</option>
                      <option value="media">Media (Informativa)</option>
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

        {/* Modal: Registrar Vivienda Rural Rápida (Desde Mapa Táctico o Panel) */}
        {isCreateViviendaModalOpen && (
          <div className="modal active">
            <div className="modal-box" style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Home size={20} color="#38bdf8" />
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '15px', color: '#ffffff' }}>Registrar Vivienda Rural</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                      Monitoreo de Infraestructura y Familias Vulnerables — Coracora
                    </p>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setIsCreateViviendaModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateViviendaQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '8px', padding: '12px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#38bdf8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                    <MapPin size={14} color="#38bdf8" /> Sector / Comunidad:
                  </label>

                  <select
                    value={newVivSectorId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setNewVivSectorId(id);
                      const sec = SECTORES_CORACORA.find((s) => s.id === id);
                      if (sec && (!newVivReferencia || newVivReferencia.startsWith('Vivienda'))) {
                        setNewVivReferencia(`Vivienda rural en sector ${sec.nombre}`);
                      }
                    }}
                    style={{
                      width: '100%',
                      background: '#030712',
                      border: '1px solid #38bdf8',
                      borderRadius: '6px',
                      padding: '9px 12px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {SECTORES_CORACORA.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.nombre} ({sec.referencia})
                      </option>
                    ))}
                    <option value={0}>Coordenadas exactas en mapa (Punto GPS personalizado)</option>
                  </select>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Latitud</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newVivLat}
                        onChange={(e) => setNewVivLat(parseFloat(e.target.value))}
                        style={{ width: '100%', background: '#030712', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Longitud</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newVivLon}
                        onChange={(e) => setNewVivLon(parseFloat(e.target.value))}
                        style={{ width: '100%', background: '#030712', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 8px', color: '#fff', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '5px 8px', borderRadius: '4px' }}>
                    <Crosshair size={12} />
                    <span>Ubicación GPS capturada del mapa: <strong>{newVivLat}, {newVivLon}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Referencia o Nombre de la Vivienda *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Casa Familia Huamaní - Ladera Este"
                    value={newVivReferencia}
                    onChange={(e) => setNewVivReferencia(e.target.value)}
                    style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Jefe de Hogar / Responsable</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Quispe"
                      value={newVivResponsable}
                      onChange={(e) => setNewVivResponsable(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input
                      type="text"
                      placeholder="+51 966 ..."
                      value={newVivTelefono}
                      onChange={(e) => setNewVivTelefono(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Material de Construcción</label>
                    <select
                      value={newVivMaterial}
                      onChange={(e) => setNewVivMaterial(e.target.value)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    >
                      <option value="adobe_paja">Adobe y Techo de Paja / Ichu (Vulnerable)</option>
                      <option value="adobe_teja">Adobe y Techo de Teja</option>
                      <option value="madera">Madera / Quincha</option>
                      <option value="ladrillo_concreto">Ladrillo y Concreto</option>
                      <option value="otro">Otro material</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">N° Habitantes</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={newVivHabitantes}
                      onChange={(e) => setNewVivHabitantes(parseInt(e.target.value) || 1)}
                      style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn-admin btn-admin-outline" onClick={() => setIsCreateViviendaModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-admin btn-admin-primary">
                    <Plus size={14} />
                    Guardar Vivienda
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
