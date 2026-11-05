import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Flame, MapPin, User, Calendar, Image as ImageIcon, Trash2, AlertTriangle, Clock, Video, Play } from 'lucide-react';
import type { ReporteCiudadano } from '../types';
import { Pagination } from './Pagination';
import { getMediaUrl } from '../services/api';

const isVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const clean = url.toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.3gp') || clean.endsWith('.webm') || clean.includes('/video');
};

interface ReportesAdminProps {
  reportes: ReporteCiudadano[];
  onValidar: (reporte: ReporteCiudadano, resultado: 'validado' | 'rechazado' | 'observado') => void;
  onEliminar?: (reporte: ReporteCiudadano) => void;
  onConvertirAIncidente: (reporte: ReporteCiudadano) => void;
}

export const ReportesAdmin: React.FC<ReportesAdminProps> = ({
  reportes,
  onValidar,
  onEliminar,
  onConvertirAIncidente,
}) => {
  const [filterEstado, setFilterEstado] = useState<string>('pendientes');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Paginación Táctica
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEstado]);

  const filtered = reportes.filter((rep) => {
    if (filterEstado === 'todos') return true;
    if (filterEstado === 'pendientes') {
      return (
        rep.estado !== 'confirmado' &&
        rep.estado !== 'validado' &&
        rep.estado !== 'rechazado' &&
        rep.estado !== 'vinculado' &&
        rep.estado !== 'cerrado'
      );
    }
    if (filterEstado === 'confirmado') {
      return rep.estado === 'confirmado' || rep.estado === 'validado';
    }
    if (filterEstado === 'rechazado') {
      return rep.estado === 'rechazado';
    }
    return rep.estado === filterEstado;
  });

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case 'confirmado':
      case 'validado':
        return (
          <span className="badge-status badge-status-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={12} color="#34d399" /> CONFIRMADO
          </span>
        );
      case 'rechazado':
        return (
          <span className="badge-status badge-status-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <XCircle size={12} color="#f87171" /> FALSA ALARMA
          </span>
        );
      case 'observado':
        return (
          <span className="badge-status badge-status-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <AlertTriangle size={12} color="#fbbf24" /> OBSERVADO
          </span>
        );
      default:
        return (
          <span className="badge-status badge-status-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} color="#38bdf8" /> POR VALIDAR
          </span>
        );
    }
  };

  const countPendientes = reportes.filter(
    (r) =>
      r.estado !== 'confirmado' &&
      r.estado !== 'validado' &&
      r.estado !== 'rechazado' &&
      r.estado !== 'vinculado' &&
      r.estado !== 'cerrado'
  ).length;
  const countConfirmados = reportes.filter((r) => r.estado === 'confirmado' || r.estado === 'validado').length;
  const countRechazados = reportes.filter((r) => r.estado === 'rechazado').length;

  // Paginación Táctica
  const totalFiltrados = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltrados / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const reportesPaginados = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="admin-tab-view">
      <div className="admin-header-actions">
        <div>
          <h2 className="admin-section-title">
            <CheckCircle2 size={24} color="#10b981" />
            Validación Táctica de Reportes Ciudadanos
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Alertas tempranas remitidas en tiempo real por pobladores y verificadores comunales de Coracora
          </p>
        </div>

        <div className="admin-actions-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FILTRAR:</span>
            <select
              className="admin-select"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 30px 6px 10px', width: 'auto' }}
            >
              <option value="pendientes">Pendientes de Validación ({countPendientes})</option>
              <option value="confirmado">Confirmados / Validados ({countConfirmados})</option>
              <option value="rechazado">Descartados / Falsa Alarma ({countRechazados})</option>
              <option value="todos">Todos los reportes ({reportes.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="reports-grid">
        {filtered.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '48px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
            }}
          >
            No se encontraron reportes ciudadanos en esta categoría.
          </div>
        ) : (
          reportesPaginados.map((rep) => (
            <div key={rep.id} className="report-card">
              <div className="report-card-header">
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c', fontSize: '0.85rem' }}>
                  REPORTE #{rep.id}
                </span>
                {getEstadoBadge(rep.estado)}
              </div>

              {/* Evidencia Multimedia (Fotografía y/o Video de hasta 15s) */}
              {rep.video_url || rep.fotografia_url || rep.evidencia_url ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {rep.fotografia_url || (rep.evidencia_url && !isVideoUrl(rep.evidencia_url)) ? (
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedPhoto(rep.fotografia_url || rep.evidencia_url || null)}>
                      <img
                        src={getMediaUrl(rep.fotografia_url || rep.evidencia_url || '')}
                        alt="Evidencia fotográfica"
                        className="report-card-img"
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.75)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#ffffff'
                        }}
                      >
                        <ImageIcon size={12} />
                        Ver foto
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '110px',
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        gap: '6px'
                      }}
                      onClick={() => setSelectedPhoto(rep.video_url || rep.evidencia_url || null)}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={18} color="#f97316" style={{ marginLeft: '2px' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fed7aa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Video size={13} /> Reproducir Video Evidencia (15s)
                      </span>
                    </div>
                  )}

                  {/* Si contiene ambos (foto y video) permitir reproducir video directamente */}
                  {rep.video_url && (rep.fotografia_url || (rep.evidencia_url && !isVideoUrl(rep.evidencia_url))) && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(rep.video_url || null)}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        background: 'rgba(249, 115, 22, 0.15)',
                        border: '1px solid rgba(249, 115, 22, 0.4)',
                        color: '#fed7aa',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Play size={12} color="#f97316" /> Reproducir Video Adjunto
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    height: '80px',
                    background: 'rgba(3, 7, 18, 0.4)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    gap: '6px',
                  }}
                >
                  <ImageIcon size={16} />
                  <span>Sin evidencia multimedia adjunta</span>
                </div>
              )}

              <div className="report-card-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', fontWeight: 600 }}>
                  <MapPin size={14} color="#38bdf8" />
                  <span>{rep.comunidad}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ({rep.latitud.toFixed(4)}, {rep.longitud.toFixed(4)})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} color="var(--text-muted)" />
                  <span>{rep.usuario}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="var(--text-muted)" />
                  <span>{rep.fecha}</span>
                </div>

                <div style={{ marginTop: '4px', color: '#e2e8f0', fontSize: '0.82rem', lineHeight: 1.4 }}>
                  <strong>Tipo:</strong> {rep.tipo_incendio.toUpperCase()} <br />
                  {rep.descripcion ? `"${rep.descripcion}"` : <em>Sin descripción textual adicional.</em>}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="report-card-actions">
                {rep.estado === 'rechazado' ? (
                  <div style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <XCircle size={13} color="#f87171" /> Falsa Alarma Descartada
                    </span>
                    {onEliminar && (
                      <button
                        className="btn-admin btn-admin-danger"
                        style={{ padding: '5px 10px', fontSize: '0.75rem', gap: '4px' }}
                        onClick={() => onEliminar(rep)}
                        title="Borrar reporte permanentemente de la base de datos"
                      >
                        <Trash2 size={13} />
                        Borrar
                      </button>
                    )}
                  </div>
                ) : rep.estado !== 'confirmado' && rep.estado !== 'validado' ? (
                  <div style={{ display: 'flex', width: '100%', gap: '6px' }}>
                    <button
                      className="btn-admin btn-admin-success"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                      onClick={() => onValidar(rep, 'validado')}
                    >
                      <CheckCircle2 size={14} />
                      Confirmar
                    </button>

                    <button
                      className="btn-admin btn-admin-danger"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                      onClick={() => onValidar(rep, 'rechazado')}
                      title="Descartar reporte (se quitará de la cola pendiente)"
                    >
                      <XCircle size={14} />
                      Descartar
                    </button>

                    {onEliminar && (
                      <button
                        className="btn-admin btn-admin-outline"
                        style={{ padding: '6px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' }}
                        onClick={() => onEliminar(rep)}
                        title="Eliminar reporte de la base de datos"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', width: '100%', gap: '6px' }}>
                    <button
                      className="btn-admin btn-admin-primary"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                      onClick={() => onConvertirAIncidente(rep)}
                    >
                      <Flame size={14} />
                      Convertir a Incidente Táctico
                    </button>
                    {onEliminar && (
                      <button
                        className="btn-admin btn-admin-outline"
                        style={{ padding: '6px 8px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' }}
                        onClick={() => onEliminar(rep)}
                        title="Eliminar reporte"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalFiltrados > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalFiltrados}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => setPageSize(newSize)}
            pageSizeOptions={[6, 12, 24, 48]}
            itemLabel="reportes"
          />
        </div>
      )}

      {/* Visor Modal de Evidencia (Fotografía o Video de 15s) */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '800px', width: '100%', background: '#0b1329', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1e293b' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isVideoUrl(selectedPhoto) ? (
                  <>
                    <Video size={16} color="#f97316" /> Video de Evidencia (Máx. 15s)
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} color="#38bdf8" /> Fotografía de Evidencia
                  </>
                )}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617' }}>
              {isVideoUrl(selectedPhoto) ? (
                <video
                  src={getMediaUrl(selectedPhoto)}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', maxHeight: '75vh', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={getMediaUrl(selectedPhoto)}
                  alt="Evidencia ampliada"
                  style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>

            <div style={{ textAlign: 'center', padding: '8px', color: '#64748b', fontSize: '0.75rem', background: '#0f172a' }}>
              Presiona ✕ o haz clic fuera para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
