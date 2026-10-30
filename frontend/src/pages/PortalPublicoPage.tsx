import React, { useState, useEffect } from 'react';
import {
  Flame,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Calendar,
  Clock,
  User,
  Eye,
  Filter,
  Search,
  RotateCcw,
  Image as ImageIcon,
  X,
  ChevronRight,
  Thermometer
} from 'lucide-react';
import { MapaPublicoIncidentes } from '../components/MapaPublicoIncidentes';
import {
  fetchIncidentesPublicos,
  fetchEstadisticasPublicas,
  fetchDistritosPublicos
} from '../services/api';
import type {
  IncidentePublico,
  EstadisticasPublicas,
  DistritoPublico,
  FiltrosPublicos
} from '../types';

export const PortalPublicoPage: React.FC = () => {
  // Datos principales
  const [incidentes, setIncidentes] = useState<IncidentePublico[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPublicas | null>(null);
  const [distritos, setDistritos] = useState<DistritoPublico[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  // Estados de interacción
  const [selectedIncidenteId, setSelectedIncidenteId] = useState<number | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'mapa' | 'lista'>('mapa');

  // Filtros interactivos
  const [filtroFecha, setFiltroFecha] = useState<string>('todos');
  const [filtroDistrito, setFiltroDistrito] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  // Cargar datos al montar y cuando cambian los filtros
  useEffect(() => {
    let montado = true;
    setCargando(true);

    const cargar = async () => {
      try {
        const filtros: FiltrosPublicos = {
          fecha: filtroFecha,
          distrito: filtroDistrito,
          estado: filtroEstado,
          q: busquedaTexto.trim() || undefined
        };

        const [incData, statsData, distData] = await Promise.all([
          fetchIncidentesPublicos(filtros),
          fetchEstadisticasPublicas(),
          fetchDistritosPublicos()
        ]);

        if (!montado) return;
        setIncidentes(incData);
        if (statsData) setEstadisticas(statsData);
        if (distData.length > 0) setDistritos(distData);

        if (selectedIncidenteId && !incData.some((i) => i.id === selectedIncidenteId)) {
          setSelectedIncidenteId(null);
        }
      } catch (err) {
        console.error('Error al cargar datos del portal público:', err);
      } finally {
        if (montado) setCargando(false);
      }
    };

    cargar();

    return () => {
      montado = false;
    };
  }, [filtroFecha, filtroDistrito, filtroEstado, busquedaTexto]);

  const limpiarFiltros = () => {
    setFiltroFecha('todos');
    setFiltroDistrito('todos');
    setFiltroEstado('todos');
    setBusquedaTexto('');
  };

  const hayFiltrosActivos =
    filtroFecha !== 'todos' ||
    filtroDistrito !== 'todos' ||
    filtroEstado !== 'todos' ||
    busquedaTexto.trim() !== '';

  return (
    <div className="portal-container">
      {/* 1. Cabecera pública ciudadana (Sin enlaces de login) */}
      <header className="portal-header">
        <div className="portal-brand">
          <div className="portal-brand-icon">
            <Flame size={24} />
          </div>
          <div className="portal-brand-text">
            <h1>
              WillAI <span style={{ color: '#ff6b00' }}>Coracora</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  marginLeft: '8px'
                }}
              >
                Portal Público
              </span>
            </h1>
            <p>Información y Transparencia de Incendios Forestales • Provincia de Parinacochas</p>
          </div>
        </div>

        <div className="portal-badge-civic">
          <ShieldCheck size={14} color="#38bdf8" />
          <span>Protección de Datos Personales (Ley N° 29733)</span>
        </div>
      </header>

      {/* 2. Barra de Estadísticas Clave del Día */}
      <section className="portal-kpi-section">
        <div className="portal-kpi-grid">
          {/* KPI 1: Reportados Hoy */}
          <div className="portal-kpi-card">
            <div className="portal-kpi-header">
              <span>Reportados Hoy</span>
              <Calendar size={15} color="#fb923c" />
            </div>
            <div className="portal-kpi-value">{estadisticas?.hoy.total ?? 0}</div>
            <div className="portal-kpi-sub">
              Fecha oficial: {estadisticas?.hoy.fecha || 'Hoy'}
            </div>
          </div>

          {/* KPI 2: Activos en Combate */}
          <div className="portal-kpi-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="portal-kpi-header">
              <span>Activos en Combate</span>
              <Flame size={15} color="#ef4444" />
            </div>
            <div className="portal-kpi-value" style={{ color: '#f87171' }}>
              {estadisticas?.sistema.total_activos ?? 0}
            </div>
            <div className="portal-kpi-sub">En atención de brigadas</div>
          </div>

          {/* KPI 3: Controlados / Cerrados */}
          <div className="portal-kpi-card" style={{ borderLeft: '3px solid #10b981' }}>
            <div className="portal-kpi-header">
              <span>Controlados / Cerrados</span>
              <ShieldCheck size={15} color="#34d399" />
            </div>
            <div className="portal-kpi-value" style={{ color: '#34d399' }}>
              {estadisticas?.sistema.total_cerrados ?? 0}
            </div>
            <div className="portal-kpi-sub">Liquidación asegurada</div>
          </div>

          {/* KPI 4: Peligro Meteorológico FWI Canadiense */}
          <div className="portal-kpi-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="portal-kpi-header">
              <span>Peligro FWI Hoy</span>
              <Thermometer size={15} color="#fbbf24" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="portal-kpi-value" style={{ color: '#fbbf24', fontSize: '1.45rem' }}>
                {estadisticas?.meteorologia.fwi_nivel || 'MODERADO'}
              </span>
              {estadisticas?.meteorologia.fwi_score != null && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ({estadisticas.meteorologia.fwi_score})
                </span>
              )}
            </div>
            <div className="portal-kpi-sub">
              {estadisticas?.meteorologia.zona || 'Coracora, Parinacochas'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Barra interactiva de filtros y búsqueda */}
      <section className="portal-filter-section">
        <div className="portal-filter-inner">
          <div className="portal-filter-controls">
            <div className="portal-filter-label">
              <Filter size={14} color="#ff6b00" />
              <span>Filtros:</span>
            </div>

            {/* Filtro Fecha */}
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="portal-select"
            >
              <option value="todos">Cualquier fecha</option>
              <option value="hoy">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>

            {/* Filtro Distrito */}
            <select
              value={filtroDistrito}
              onChange={(e) => setFiltroDistrito(e.target.value)}
              className="portal-select"
            >
              <option value="todos">Todos los distritos</option>
              {distritos.map((d) => (
                <option key={d.id} value={d.id.toString()}>
                  {d.nombre}
                </option>
              ))}
            </select>

            {/* Filtro Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="portal-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos / En Combate</option>
              <option value="controlados">Controlados</option>
              <option value="cerrados">Extinguidos / Cerrados</option>
            </select>

            {/* Botón limpiar */}
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="portal-btn-clear"
                title="Restablecer filtros"
              >
                <RotateCcw size={12} />
                <span>Restablecer</span>
              </button>
            )}
          </div>

          {/* Buscador de texto */}
          <div className="portal-search-wrapper">
            <Search size={14} className="portal-search-icon" />
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Buscar por código, sector o lugar..."
              className="portal-search-input"
            />
            {busquedaTexto && (
              <button
                onClick={() => setBusquedaTexto('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Selector de Vista en Móvil */}
      <div className="portal-mobile-tabs">
        <button
          onClick={() => setMobileTab('mapa')}
          className={`portal-mobile-tab-btn ${mobileTab === 'mapa' ? 'active' : ''}`}
        >
          🗺️ Ver Mapa Interactivo
        </button>
        <button
          onClick={() => setMobileTab('lista')}
          className={`portal-mobile-tab-btn ${mobileTab === 'lista' ? 'active' : ''}`}
        >
          📋 Lista de Incidentes ({incidentes.length})
        </button>
      </div>

      {/* 5. Contenido Principal: Mapa + Lista Lateral */}
      <main className="portal-main-content">
        <div className="portal-grid-layout">
          {/* Columna Izquierda: Mapa */}
          <div className={`portal-map-pane ${mobileTab === 'mapa' ? '' : 'mobile-hidden'}`}>
            <MapaPublicoIncidentes
              incidentes={incidentes}
              selectedIncidenteId={selectedIncidenteId}
              onSelectIncidente={(inc) => {
                setSelectedIncidenteId(inc.id);
              }}
            />
          </div>

          {/* Columna Derecha: Lista de Incidentes */}
          <div className={`portal-list-pane ${mobileTab === 'lista' ? '' : 'mobile-hidden'}`}>
            <div className="portal-list-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                  Incidentes Registrados
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {incidentes.length} {incidentes.length === 1 ? 'incidente encontrado' : 'incidentes encontrados'}
                </div>
              </div>

              {selectedIncidenteId && (
                <button
                  onClick={() => setSelectedIncidenteId(null)}
                  className="portal-btn-clear"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="portal-list-items">
              {cargando ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Consultando incidentes reales...
                </div>
              ) : incidentes.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto'
                    }}
                  >
                    <ShieldCheck size={26} color="#34d399" />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    Sin incidentes reportados
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                    {hayFiltrosActivos
                      ? 'No hay incidentes que coincidan con los filtros seleccionados.'
                      : 'Actualmente no se registran incidentes activos en los criterios consultados.'}
                  </p>
                  {hayFiltrosActivos && (
                    <button
                      onClick={limpiarFiltros}
                      style={{
                        marginTop: '12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ff6b00',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              ) : (
                incidentes.map((inc) => {
                  const isSelected = inc.id === selectedIncidenteId;
                  const isActivo = ['nuevo', 'verificacion', 'confirmado', 'asignado', 'en_atencion', 'en_combate'].includes(inc.estado);
                  const isControlado = ['contenido', 'controlado'].includes(inc.estado);

                  const badgeClass = isActivo
                    ? 'badge-status badge-status-red'
                    : isControlado
                    ? 'badge-status badge-status-amber'
                    : 'badge-status badge-status-emerald';

                  return (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setSelectedIncidenteId(inc.id);
                        if (window.innerWidth < 1024) {
                          setMobileTab('mapa');
                        }
                      }}
                      className={`portal-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="portal-card-top">
                        <span className="portal-card-code">{inc.codigo}</span>
                        <span className={badgeClass}>{inc.estado_display}</span>
                      </div>

                      <h4 className="portal-card-title">{inc.titulo}</h4>

                      {/* Fotografía de evidencia */}
                      {inc.fotografias && inc.fotografias.length > 0 ? (
                        <div className="portal-card-photo-box">
                          <img
                            src={inc.fotografias[0]}
                            alt={inc.titulo}
                            loading="lazy"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoModal(inc.fotografias[0]);
                            }}
                            className="portal-card-photo-btn"
                          >
                            <Eye size={12} color="#fb923c" /> Ampliar foto
                          </button>
                        </div>
                      ) : (
                        <div className="portal-card-no-photo">
                          <ImageIcon size={14} />
                          <span>Sin fotografía adjunta (Reporte verificado)</span>
                        </div>
                      )}

                      {/* Descripción breve */}
                      {inc.resumen && <p className="portal-card-desc">{inc.resumen}</p>}

                      {/* Contexto geográfico y temporal */}
                      <div className="portal-card-meta">
                        <div className="portal-card-meta-row">
                          <MapPin size={13} color="#38bdf8" />
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{inc.comunidad_nombre}</span>
                          <span>({inc.distrito_nombre})</span>
                        </div>
                        <div className="portal-card-meta-row">
                          <Clock size={13} color="#fbbf24" />
                          <span>{inc.fecha_display}</span>
                        </div>
                      </div>

                      {/* Quién reportó */}
                      <div className="portal-card-footer">
                        <div className="portal-reporter-tag">
                          {inc.identidad_autorizada ? (
                            <User size={13} color="#38bdf8" />
                          ) : (
                            <ShieldAlert size={13} color="#94a3b8" />
                          )}
                          <span style={{ color: 'var(--text-muted)' }}>Reportado por:</span>
                          <span
                            style={{
                              color: inc.identidad_autorizada ? '#e2e8f0' : '#94a3b8',
                              fontWeight: inc.identidad_autorizada ? 600 : 400,
                              fontStyle: inc.identidad_autorizada ? 'normal' : 'italic'
                            }}
                          >
                            {inc.reportado_por}
                          </span>
                        </div>

                        <span className="portal-locate-link">
                          Localizar <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 6. Modal Lightbox para Ampliación de Fotografía */}
      {activePhotoModal && (
        <div
          className="portal-lightbox-backdrop"
          onClick={() => setActivePhotoModal(null)}
        >
          <div
            className="portal-lightbox-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-lightbox-header">
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={16} color="#ff6b00" /> Fotografía de Evidencia Ciudadana
              </span>
              <button
                onClick={() => setActivePhotoModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="portal-lightbox-img-box">
              <img src={activePhotoModal} alt="Evidencia en alta resolución" />
            </div>
          </div>
        </div>
      )}

      {/* 7. Pie de Página Cívico */}
      <footer className="portal-footer">
        <div>
          WillAI &copy; {new Date().getFullYear()} • Sistema de Alerta Temprana de Incendios Forestales
        </div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
          Parinacochas, Ayacucho, Perú • Datos integrados de SERFOR, NASA FIRMS y Brigadas Comunales de Primera Respuesta
        </div>
      </footer>
    </div>
  );
};
