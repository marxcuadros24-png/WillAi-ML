import React, { useState, useEffect } from 'react';
import { HeartHandshake, CheckCircle2, XCircle, User } from 'lucide-react';
import type { DonacionComunitaria } from '../types';
import { Pagination } from './Pagination';

interface DonacionesAdminProps {
  donaciones: DonacionComunitaria[];
  onModerar: (donacion: DonacionComunitaria, accion: 'aprobar' | 'rechazar', comentario?: string) => void;
}

export const DonacionesAdmin: React.FC<DonacionesAdminProps> = ({ donaciones, onModerar }) => {
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Paginación Táctica
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEstado]);

  const filtered = donaciones.filter((don) => {
    if (filterEstado === 'todos') return true;
    return don.estado === filterEstado;
  });

  const totalDonaciones = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalDonaciones / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const donacionesPaginadas = filtered.slice(startIndex, startIndex + pageSize);

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case 'publicada':
        return <span className="badge-status badge-status-emerald">✅ APROBADA</span>;
      case 'rechazada':
        return <span className="badge-status badge-status-red">❌ RECHAZADA</span>;
      case 'entregada':
        return <span className="badge-status badge-status-cyan">📦 ENTREGADA</span>;
      default:
        return <span className="badge-status badge-status-amber">⏱️ POR REVISAR</span>;
    }
  };

  return (
    <div className="admin-tab-view">
      <div className="admin-header-actions">
        <div>
          <h2 className="admin-section-title">
            <HeartHandshake size={24} color="#ec4899" />
            Moderación y Gestión de Donaciones Solidarias
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Control de insumos, herramientas y provisiones comunitarias ofrecidas para soporte a brigadistas
          </p>
        </div>

        <div className="admin-actions-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FILTRO:</span>
            <select
              className="admin-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '6px 30px 6px 10px', width: 'auto' }}
            >
              <option value="todos">Todas las ofertas ({donaciones.length})</option>
              <option value="pendiente">Pendientes de Aprobación</option>
              <option value="publicada">Aprobadas / Publicadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Oferta e Insumos</th>
              <th>Donante Solidario</th>
              <th>Fecha de Registro</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Moderación Operativa</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No se encontraron ofertas de donación en esta categoría.
                </td>
              </tr>
            ) : (
              donacionesPaginadas.map((don) => (
                <tr key={don.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c' }}>
                    #{don.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>{don.titulo}</div>
                    {don.descripcion && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        "{don.descripcion}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {don.items && don.items.length > 0 ? (
                        don.items.map((it) => (
                          <span
                            key={it.id}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                            }}
                          >
                            📦 {it.cantidad} {it.unidad} de {it.descripcion}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Implementos generales</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                      <User size={14} color="#94a3b8" />
                      <span>{don.donante}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {don.fecha}
                  </td>
                  <td>{getEstadoBadge(don.estado)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {don.estado === 'pendiente' ? (
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn-admin btn-admin-success"
                          style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                          onClick={() => onModerar(don, 'aprobar')}
                        >
                          <CheckCircle2 size={14} />
                          Aprobar
                        </button>
                        <button
                          className="btn-admin btn-admin-danger"
                          style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                          onClick={() => onModerar(don, 'rechazar')}
                        >
                          <XCircle size={14} />
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {don.estado === 'publicada' ? 'Disponible para asignación' : 'Procesado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalDonaciones > 0 && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalDonaciones}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => setPageSize(newSize)}
            itemLabel="ofertas de donación"
          />
        )}
      </div>
    </div>
  );
};
