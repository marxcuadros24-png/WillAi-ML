import React, { useState } from 'react';
import { CheckCircle2, XCircle, Flame, MapPin, User, Calendar, Image as ImageIcon } from 'lucide-react';
import type { ReporteCiudadano } from '../types';

interface ReportesAdminProps {
  reportes: ReporteCiudadano[];
  onValidar: (reporte: ReporteCiudadano, resultado: 'validado' | 'rechazado' | 'observado') => void;
  onConvertirAIncidente: (reporte: ReporteCiudadano) => void;
}

export const ReportesAdmin: React.FC<ReportesAdminProps> = ({
  reportes,
  onValidar,
  onConvertirAIncidente,
}) => {
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const filtered = reportes.filter((rep) => {
    if (filterEstado === 'todos') return true;
    if (filterEstado === 'pendientes') return rep.estado === 'recibido' || rep.estado === 'en_evaluacion';
    return rep.estado === filterEstado;
  });

  const getEstadoBadge = (est: string) => {
    switch (est) {
      case 'confirmado':
      case 'validado':
        return <span className="badge-status badge-status-emerald">✅ CONFIRMADO</span>;
      case 'rechazado':
        return <span className="badge-status badge-status-red">❌ FALSA ALARMA</span>;
      case 'observado':
        return <span className="badge-status badge-status-amber">⚠️ OBSERVADO</span>;
      default:
        return <span className="badge-status badge-status-cyan">⏱️ POR VALIDAR</span>;
    }
  };

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
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                background: 'rgba(3, 7, 18, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: '#ffffff',
                fontSize: '0.8rem',
              }}
            >
              <option value="todos">Todos los reportes ({reportes.length})</option>
              <option value="pendientes">Pendientes de Validación</option>
              <option value="confirmado">Confirmados / Validados</option>
              <option value="rechazado">Rechazados</option>
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
          filtered.map((rep) => (
            <div key={rep.id} className="report-card">
              <div className="report-card-header">
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c', fontSize: '0.85rem' }}>
                  REPORTE #{rep.id}
                </span>
                {getEstadoBadge(rep.estado)}
              </div>

              {rep.evidencia_url ? (
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedPhoto(rep.evidencia_url || null)}>
                  <img
                    src={rep.evidencia_url.startsWith('http') ? rep.evidencia_url : `http://127.0.0.1:8000${rep.evidencia_url}`}
                    alt="Evidencia fotográfica"
                    className="report-card-img"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ImageIcon size={12} />
                    Ver foto
                  </div>
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
                  Sin fotografía adjunta
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
                {rep.estado !== 'confirmado' && rep.estado !== 'validado' ? (
                  <>
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
                    >
                      <XCircle size={14} />
                      Descartar
                    </button>
                  </>
                ) : (
                  <button
                    className="btn-admin btn-admin-primary"
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                    onClick={() => onConvertirAIncidente(rep)}
                  >
                    <Flame size={14} />
                    Convertir a Incidente Táctico
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ position: 'relative', maxWidth: '800px', width: '100%' }}>
            <img
              src={selectedPhoto.startsWith('http') ? selectedPhoto : `http://127.0.0.1:8000${selectedPhoto}`}
              alt="Evidencia ampliada"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }}
            />
            <div style={{ textAlign: 'center', marginTop: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>
              Clic en cualquier parte para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
