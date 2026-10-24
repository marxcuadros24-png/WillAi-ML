import React, { useState, useEffect } from 'react';
import { Flame, PlusCircle, Shield, MapPin, Eye, CheckCircle2, Filter, Clock } from 'lucide-react';
import type { Incidente } from '../types';
import { Pagination } from './Pagination';

interface IncidentesAdminProps {
  incidentes: Incidente[];
  onOpenCreate: () => void;
  onOpenDispatch: (incidente: Incidente) => void;
  onOpenChangeStatus: (incidente: Incidente) => void;
  onOpenCloseIncident: (incidente: Incidente) => void;
  onViewOnMap: (incidente: Incidente) => void;
}

export const IncidentesAdmin: React.FC<IncidentesAdminProps> = ({
  incidentes,
  onOpenCreate,
  onOpenDispatch,
  onOpenChangeStatus,
  onOpenCloseIncident,
  onViewOnMap,
}) => {
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Paginación Táctica
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEstado, filterPrioridad, searchTerm]);

  const filtered = incidentes.filter((inc) => {
    if (filterEstado !== 'todos' && inc.estado !== filterEstado) return false;
    if (filterPrioridad !== 'todos' && inc.severidad !== filterPrioridad) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        inc.codigo.toLowerCase().includes(term) ||
        inc.titulo.toLowerCase().includes(term) ||
        inc.comunidad.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Paginación calculada
  const totalIncidentes = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalIncidentes / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const incidentesPaginados = filtered.slice(startIndex, startIndex + pageSize);

  const getSeveridadBadge = (sev: string) => {
    switch (sev) {
      case 'critica':
        return <span className="badge-status badge-status-red">CRÍTICA</span>;
      case 'alta':
        return <span className="badge-status badge-status-amber">ALTA</span>;
      case 'media':
        return <span className="badge-status badge-status-cyan">MEDIA</span>;
      default:
        return <span className="badge-status badge-status-emerald">BAJA</span>;
    }
  };

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case 'en_combate':
        return <span className="badge-status badge-status-red">🔥 EN COMBATE</span>;
      case 'controlado':
        return <span className="badge-status badge-status-amber">🛡️ CONTROLADO</span>;
      case 'extinguido':
        return <span className="badge-status badge-status-emerald">💧 EXTINGUIDO</span>;
      case 'cerrado':
        return <span className="badge-status badge-status-gray">🏁 CERRADO</span>;
      default:
        return <span className="badge-status badge-status-cyan">⏱️ PENDIENTE</span>;
    }
  };

  return (
    <div className="admin-tab-view">
      <div className="admin-header-actions">
        <div>
          <h2 className="admin-section-title">
            <Flame size={24} color="#ff5722" />
            Centro de Despacho y Gestión de Incidentes
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Control operativo táctico de incendios forestales en Coracora y Parinacochas
          </p>
        </div>

        <div className="admin-actions-group">
          <button className="btn-admin btn-admin-primary" onClick={onOpenCreate}>
            <PlusCircle size={16} />
            Crear Incidente Táctico
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por código, título o comunidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(3, 7, 18, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              color: '#ffffff',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTADO:</span>
          <select
            className="admin-select"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '6px 30px 6px 10px', width: 'auto' }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_combate">En Combate</option>
            <option value="controlado">Controlados</option>
            <option value="extinguido">Extinguidos</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIORIDAD:</span>
          <select
            className="admin-select"
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '6px 30px 6px 10px', width: 'auto' }}
          >
            <option value="todos">Todas las Prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Título e Información</th>
              <th>Ubicación</th>
              <th>Severidad</th>
              <th>Estado</th>
              <th>Viviendas en Riesgo</th>
              <th style={{ textAlign: 'right' }}>Acciones Tácticas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No se encontraron incidentes que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              incidentesPaginados.map((inc) => (
                <tr key={inc.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c' }}>
                    {inc.codigo}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{inc.titulo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Iniciado: {inc.fecha_inicio} • Reportado por: {inc.reportado_por}
                    </div>
                    {inc.brigadas_asignadas && inc.brigadas_asignadas.length > 0 && (
                      <div style={{ fontSize: '0.73rem', color: '#38bdf8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        🛡️ <strong>Brigadas:</strong> {inc.brigadas_asignadas.join(', ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e2e8f0' }}>
                      <MapPin size={14} color="#38bdf8" />
                      <span>{inc.comunidad}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {inc.latitud.toFixed(4)}, {inc.longitud.toFixed(4)}
                    </div>
                  </td>
                  <td>{getSeveridadBadge(inc.severidad)}</td>
                  <td>{getEstadoBadge(inc.estado)}</td>
                  <td>
                    <span
                      style={{
                        color: inc.viviendas_riesgo > 0 ? '#ef4444' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {inc.viviendas_riesgo} predios
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn-admin btn-admin-outline"
                        style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                        title="Ver en mapa táctico"
                        onClick={() => onViewOnMap(inc)}
                      >
                        <Eye size={13} />
                        Mapa
                      </button>

                      {inc.estado !== 'cerrado' && (
                        <>
                          <button
                            className="btn-admin btn-admin-primary"
                            style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                            title="Despachar brigada"
                            onClick={() => onOpenDispatch(inc)}
                          >
                            <Shield size={13} />
                            Despachar
                          </button>

                          <button
                            className="btn-admin btn-admin-outline"
                            style={{ padding: '5px 9px', fontSize: '0.75rem', borderColor: '#f59e0b', color: '#fbbf24' }}
                            title="Cambiar estado"
                            onClick={() => onOpenChangeStatus(inc)}
                          >
                            <Clock size={13} />
                            Estado
                          </button>

                          <button
                            className="btn-admin btn-admin-danger"
                            style={{ padding: '5px 9px', fontSize: '0.75rem' }}
                            title="Cerrar incidente con acta"
                            onClick={() => onOpenCloseIncident(inc)}
                          >
                            <CheckCircle2 size={13} />
                            Cerrar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalIncidentes > 0 && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalIncidentes}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => setPageSize(newSize)}
            itemLabel="incidentes tácticos"
          />
        )}
      </div>
    </div>
  );
};
