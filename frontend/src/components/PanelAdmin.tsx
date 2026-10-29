import React from 'react';
import {
  Flame,
  Radio,
  Users,
  Bell,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Map,
  Trophy,
  Megaphone
} from 'lucide-react';
import type { MetricasKPI, MetricasFWI, Incidente, FocoCalor, ReporteCiudadano, Brigada, GrillaRiesgoOcurrenciaData } from '../types';

interface PanelAdminProps {
  metricas: MetricasKPI | null;
  fwi: MetricasFWI;
  incidentes: Incidente[];
  focos: FocoCalor[];
  reportes: ReporteCiudadano[];
  brigadas: Brigada[];
  grillaOcurrencia?: GrillaRiesgoOcurrenciaData | null;
  onNavigateTab: (tab: 'mapa' | 'incidentes' | 'reportes' | 'usuarios' | 'alertas' | 'donaciones' | 'satelites' | 'logros') => void;
  onOpenCreateIncident: () => void;
  onOpenAlertModal: () => void;
  onRefreshMeteo: () => void;
  onEntrenarOcurrencia?: () => void;
  onOpenRiesgoML?: () => void;
}

export const PanelAdmin: React.FC<PanelAdminProps> = ({
  metricas,
  fwi,
  incidentes,
  focos,
  reportes,
  brigadas,
  grillaOcurrencia,
  onNavigateTab,
  onOpenCreateIncident,
  onOpenAlertModal,
  onRefreshMeteo,
  onEntrenarOcurrencia,
  onOpenRiesgoML
}) => {
  const incidentesActivos = incidentes.filter(i => i.estado === 'pendiente' || i.estado === 'en_combate');
  const reportesPendientes = reportes.filter(r => r.estado === 'recibido' || r.estado === 'en_evaluacion');
  const focosHoy = focos.slice(0, 15);
  const esLluviaActiva = fwi.precipitacion > 0 || fwi.humedad_relativa >= 75;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner Superior de Estado Meteorológico & ML */}
      <div
        style={{
          background: esLluviaActiva
            ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(30, 41, 59, 0.7) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: esLluviaActiva ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '14px',
          padding: '18px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: esLluviaActiva ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: esLluviaActiva ? '#38bdf8' : '#f87171'
            }}
          >
            {esLluviaActiva ? <CloudRain size={28} /> : <Flame size={28} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: esLluviaActiva ? '#38bdf8' : '#f87171' }}>
                MONITOR DE PELIGRO EN TIEMPO REAL (CORACORA / PARINACOCHAS)
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: esLluviaActiva ? '#0369a1' : (fwi.nivel_peligro === 'Extremo' ? '#991b1b' : '#b45309'),
                  color: '#ffffff'
                }}
              >
                RIESGO: {fwi.nivel_peligro.toUpperCase()}
              </span>
              {fwi.probabilidad_ml !== undefined && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(99, 102, 241, 0.25)',
                    border: '1px solid rgba(129, 140, 248, 0.4)',
                    color: '#a5b4fc'
                  }}
                >
                  ML Random Forest: {fwi.probabilidad_ml}% Prob. Ignición
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '4px', maxWidth: '800px', lineHeight: 1.4 }}>
              {fwi.recomendacion}
            </div>
            {fwi.diagnostico && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                ℹ️ {fwi.diagnostico}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ÍNDICE FWI CANADIENSE</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {fwi.fwi} <small style={{ fontSize: '12px', color: esLluviaActiva ? '#38bdf8' : '#f87171' }}>pts</small>
            </div>
          </div>
          <button
            className="btn-admin btn-admin-outline"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            onClick={onRefreshMeteo}
            title="Recalcular con Open-Meteo en Vivo"
          >
            <RefreshCw size={14} />
            Actualizar Meteo
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* KPI 1: Incidentes Activos */}
        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab('incidentes')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>INCIDENTES ACTIVOS</span>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '6px', borderRadius: '8px' }}>
              <Flame size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {metricas?.incidentes_activos ?? incidentesActivos.length}
          </div>
          <div style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{metricas?.incidentes_en_combate ?? 0} en combate directo</span>
            <ArrowUpRight size={13} />
          </div>
        </div>

        {/* KPI 2: Detecciones Satelitales Recientes */}
        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab('satelites')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>FOCOS SATELITALES (72h)</span>
            <div style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', padding: '6px', borderRadius: '8px' }}>
              <Radio size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {metricas?.detecciones_recientes ?? focos.length}
          </div>
          <div style={{ fontSize: '11px', color: '#fb923c' }}>
            NASA FIRMS (VIIRS + MODIS) y SERFOR
          </div>
        </div>

        {/* KPI 3: Reportes Ciudadanos Pendientes */}
        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab('reportes')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>REPORTES CIUDADANOS</span>
            <div style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', padding: '6px', borderRadius: '8px' }}>
              <Bell size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {metricas?.reportes_pendientes ?? reportesPendientes.length}
          </div>
          <div style={{ fontSize: '11px', color: '#facc15' }}>
            Pendientes de verificación comunal
          </div>
        </div>

        {/* KPI 4: Brigadas Operativas */}
        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab('incidentes')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>BRIGADAS DISPONIBLES</span>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '6px', borderRadius: '8px' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            {metricas?.brigadas_disponibles ?? brigadas.length}
          </div>
          <div style={{ fontSize: '11px', color: '#4ade80' }}>
            Bomberos B-12, SERFOR, OGRD y Comunales
          </div>
        </div>
      </div>

      {/* Widget Especial de Machine Learning: Riesgo de Ocurrencia Territorial */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                MODELO MACHINE LEARNING: RIESGO DE OCURRENCIA (SUSCEPTIBILIDAD)
              </span>
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#f59e0b',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                {grillaOcurrencia?.metadata?.total_celdas ?? 72} CELDAS EVALUADAS
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#e2e8f0', marginTop: '3px' }}>
              Entrenado con 765 detecciones reales de NASA FIRMS (MODIS + VIIRS) y series de Open-Meteo. Validación temporal estricta sin fuga de información.
            </div>
            {grillaOcurrencia?.metadata?.metricas_modelo?.random_forest_calibrado && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', marginTop: '5px', color: '#94a3b8' }}>
                <span>ROC-AUC: <strong style={{ color: '#38bdf8' }}>{grillaOcurrencia.metadata.metricas_modelo.random_forest_calibrado.roc_auc}</strong></span>
                <span>PR-AUC: <strong style={{ color: '#10b981' }}>{grillaOcurrencia.metadata.metricas_modelo.random_forest_calibrado.pr_auc}</strong></span>
                <span>F1-Score: <strong style={{ color: '#f59e0b' }}>{grillaOcurrencia.metadata.metricas_modelo.random_forest_calibrado.f1_score}</strong></span>
                <span>Brier Score: <strong style={{ color: '#a78bfa' }}>{grillaOcurrencia.metadata.metricas_modelo.random_forest_calibrado.brier_score}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onEntrenarOcurrencia && (
            <button
              className="btn-admin btn-admin-outline"
              style={{ padding: '8px 12px', fontSize: '12px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              onClick={onEntrenarOcurrencia}
              title="Re-entrenar modelo Random Forest con NASA FIRMS y Open-Meteo"
            >
              <RefreshCw size={14} /> Reentrenar ML
            </button>
          )}
          <button
            className="btn-admin"
            style={{ padding: '8px 14px', fontSize: '12px', background: '#d97706', color: '#ffffff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onOpenRiesgoML ? onOpenRiesgoML() : onNavigateTab('mapa')}
          >
            <Map size={14} /> Ver Capa en Mapa Táctico
          </button>
        </div>
      </div>

      {/* Sección Central: Monitor Meteorológico + Acciones Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Panel Izquierdo: Meteorología Open-Meteo & FWI Completo */}
        <div className="admin-table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Thermometer size={16} color="#38bdf8" />
                VARIABLES METEOROLÓGICAS EN VIVO (OPEN-METEO)
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Estación Coracora (-15.0189, -73.7806) a 3,175 m.s.n.m.
              </p>
            </div>
            {esLluviaActiva && (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <CloudRain size={12} color="#38bdf8" /> Lluvia Activa
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <Thermometer size={13} color="#f97316" />
                Temperatura
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {fwi.temperatura} <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>°C</small>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <Droplets size={13} color="#38bdf8" />
                Humedad Rel.
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: fwi.humedad_relativa >= 70 ? '#38bdf8' : '#f97316', marginTop: '4px' }}>
                {fwi.humedad_relativa} <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</small>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <CloudRain size={13} color="#60a5fa" />
                Lluvia / Precip.
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: fwi.precipitacion > 0 ? '#60a5fa' : '#ffffff', marginTop: '4px' }}>
                {fwi.precipitacion} <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>mm</small>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <Wind size={13} color="#a3e635" />
                Viento ({fwi.direccion_viento})
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {fwi.velocidad_viento} <small style={{ fontSize: '12px', color: 'var(--text-muted)' }}>km/h</small>
              </div>
            </div>
          </div>

          {/* Subíndices FWI */}
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              SUB-ÍNDICES CFFDRS CANADIENSES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>FFMC (Fino)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{fwi.ffmc}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>DMC (Orgánico)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{fwi.dmc}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>DC (Sequía)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{fwi.dc}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>ISI (Propagación)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{fwi.isi}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>BUI (Combustible)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{fwi.bui}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Accesos Rápidos Tácticos & Navegación */}
        <div className="admin-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            ACCIONES RÁPIDAS DEL COMANDO
          </h3>

          <button
            className="btn-admin btn-admin-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={onOpenCreateIncident}
          >
            <PlusCircle size={16} />
            Crear Incidente Operacional
          </button>

          <button
            className="btn-admin btn-admin-danger"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={onOpenAlertModal}
          >
            <ShieldAlert size={16} />
            Emitir Alerta a Pobladores
          </button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
              MÓDULOS DE ADMINISTRACIÓN
            </span>

            <button
              className="btn-admin btn-admin-outline"
              style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => onNavigateTab('mapa')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Map size={15} color="#38bdf8" /> Centro de Mando Táctico en Vivo</span>
              <ExternalLink size={14} />
            </button>

            <button
              className="btn-admin btn-admin-outline"
              style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => onNavigateTab('usuarios')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={15} color="#38bdf8" /> Gestión de Usuarios & Brigadistas</span>
              <ExternalLink size={14} />
            </button>

            <button
              className="btn-admin btn-admin-outline"
              style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
              onClick={() => onNavigateTab('logros')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={15} color="#fbbf24" /> Cuadro de Honor & Condecoraciones</span>
              <ExternalLink size={14} />
            </button>

            <button
              className="btn-admin btn-admin-outline"
              style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
              onClick={() => onNavigateTab('reportes')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Megaphone size={15} color="#38bdf8" /> Bandeja de Reportes Ciudadanos ({reportesPendientes.length})</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Sección Inferior: Resumen de Reportes Pendientes & Detecciones Satelitales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Reportes Pendientes */}
        <div className="admin-table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              ÚLTIMOS REPORTES CIUDADANOS
            </h4>
            <button
              className="btn-admin btn-admin-outline"
              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={() => onNavigateTab('reportes')}
            >
              Ver Todos ({reportes.length})
            </button>
          </div>

          {reportes.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No hay reportes de ciudadanos pendientes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportes.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: '#ffffff' }}>
                        {r.comunidad || 'Coracora'}
                      </span>
                      <span className={`badge ${r.estado === 'recibido' ? 'badge-yellow' : 'badge-cyan'}`}>
                        {r.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {r.descripcion?.substring(0, 60) || 'Sin descripción'}...
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {r.fecha}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focos Satelitales Recientes */}
        <div className="admin-table-container" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              DETECCIONES SATELITALES RECIENTES
            </h4>
            <button
              className="btn-admin btn-admin-outline"
              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
              onClick={() => onNavigateTab('mapa')}
            >
              Ver en Mapa
            </button>
          </div>

          {focos.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
              No se registran anomalías térmicas en la ventana actual.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {focosHoy.slice(0, 4).map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${f.sensor.includes('MODIS') ? 'badge-orange' : 'badge-red'}`}>
                        {f.sensor}
                      </span>
                      <span style={{ fontSize: '12px', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        {f.latitud.toFixed(4)}, {f.longitud.toFixed(4)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Potencia Radiativa (FRP): {f.frp || '--'} MW • Confianza: {f.confianza}%
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {f.fecha_hora}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
