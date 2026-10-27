import { useOutletContext } from 'react-router-dom';
import type {
  Incidente,
  FocoCalor,
  MetricasFWI,
  Brigada,
  AlertaComunitaria,
  PrediccionViento12hData,
  ReporteCiudadano,
  DonacionComunitaria,
  LoteSatelital,
  MetricasKPI,
  ViviendaRural,
  GrillaRiesgoOcurrenciaData
} from '../types';

export interface AppContextType {
  metricas: MetricasKPI | null;
  fwi: MetricasFWI;
  incidentes: Incidente[];
  focos: FocoCalor[];
  brigadas: Brigada[];
  viviendas: ViviendaRural[];
  alertas: AlertaComunitaria[];
  viento12h: PrediccionViento12hData;
  grillaOcurrencia: GrillaRiesgoOcurrenciaData | null;
  reportes: ReporteCiudadano[];
  donaciones: DonacionComunitaria[];
  lotesSatelitales: LoteSatelital[];
  loadAllData: () => Promise<void>;
  onOpenCreateIncident: () => void;
  onOpenCreateIncidentWithCoords?: (lat: number, lon: number) => void;
  onOpenCreateViviendaWithCoords?: (lat: number, lon: number) => void;
  onOpenAlertModal: () => void;
  onOpenDispatch: (inc: Incidente) => void;
  onOpenChangeStatus: (inc: Incidente) => void;
  onOpenCloseIncident: (inc: Incidente) => void;
  handleValidarReporteAction: (reporte: ReporteCiudadano, resultado: 'validado' | 'rechazado' | 'observado') => Promise<void>;
  handleEliminarReporteAction: (reporte: ReporteCiudadano) => Promise<void>;
  handleConvertirReporteAIncidente: (reporte: ReporteCiudadano) => void;
  handleModerarDonacionAction: (oferta: DonacionComunitaria, accion: 'aprobar' | 'rechazar') => Promise<void>;
  handleDispararSyncManual: (tipo: 'firms' | 'meteo' | 'fwi') => Promise<void>;
  handleEntrenarVientoManual: () => Promise<void>;
  handleEntrenarOcurrenciaManual: () => Promise<void>;
  // Map specific state
  showModis: boolean;
  setShowModis: (v: boolean) => void;
  showViirs: boolean;
  setShowViirs: (v: boolean) => void;
  showSerfor: boolean;
  setShowSerfor: (v: boolean) => void;
  showVientoML: boolean;
  setShowVientoML: (v: boolean) => void;
  showRiesgoOcurrencia: boolean;
  setShowRiesgoOcurrencia: (v: boolean) => void;
  showIncidentes: boolean;
  setShowIncidentes: (v: boolean) => void;
  showBrigadas: boolean;
  setShowBrigadas: (v: boolean) => void;
  showViviendas: boolean;
  setShowViviendas: (v: boolean) => void;
  // Simulación de Propagación (Cell2Fire Eliptico Andino)
  simulaciones: any[];
  selectedSimulacionId: number | null;
  setSelectedSimulacionId: (id: number | null) => void;
  simulacionGeojson: any | null;
  setSimulacionGeojson: (geo: any | null) => void;
  showSimulacionIsocronas: boolean;
  setShowSimulacionIsocronas: (v: boolean) => void;
  handleEjecutarSimulacion: (lat: number, lon: number, horizonteHoras?: number, incidenteId?: number) => Promise<any>;
  handleCargarSimulacionGeoJSON: (id: number) => Promise<void>;
  timeRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom';
  handleTimeRangeChange: (newRange: 'today' | '24h' | '7d' | '30d' | '3m' | '6m' | 'custom') => Promise<void>;
  customDesde: string;
  customHasta: string;
  handleApplyCustomDates: (desde: string, hasta: string) => Promise<void>;
  selectedWindHourIdx: number;
  setSelectedWindHourIdx: (idx: number) => void;
  selectedIncidente: Incidente | null;
  setSelectedIncidente: (inc: Incidente | null) => void;
  sidebarTab: 'incidentes' | 'firms' | 'viento' | 'riesgo' | 'simulacion' | 'meteo' | 'brigadas';
  setSidebarTab: (tab: 'incidentes' | 'firms' | 'viento' | 'riesgo' | 'simulacion' | 'meteo' | 'brigadas') => void;
}

export function useAppContext(): AppContextType {
  return useOutletContext<AppContextType>();
}
