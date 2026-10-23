import React from 'react';
import { Send, CheckCircle2, MapPin, Megaphone } from 'lucide-react';
import type { AlertaComunitaria } from '../types';

interface AlertasAdminProps {
  alertas: AlertaComunitaria[];
  onOpenEmitirAlerta: () => void;
}

export const AlertasAdmin: React.FC<AlertasAdminProps> = ({ alertas, onOpenEmitirAlerta }) => {
  const getNivelBadge = (nivel: string) => {
    switch (nivel) {
      case 'evacuacion':
      case 'muy_alta':
        return <span className="badge-status badge-status-red">🔴 ALERTA ROJA (EVACUACIÓN)</span>;
      case 'preventiva':
      case 'alta':
        return <span className="badge-status badge-status-amber">🟠 ALERTA NARANJA (PREVENTIVA)</span>;
      default:
        return <span className="badge-status badge-status-cyan">🔵 INFORMATIVA</span>;
    }
  };

  return (
    <div className="admin-tab-view">
      <div className="admin-header-actions">
        <div>
          <h2 className="admin-section-title">
            <Megaphone size={24} color="#f97316" />
            Consola de Emisión y Control de Alertas Tempranas
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Transmisión masiva multicanal (Push App Móvil y SMS) ante frentes de fuego activos
          </p>
        </div>

        <div className="admin-actions-group">
          <button className="btn-admin btn-admin-danger" onClick={onOpenEmitirAlerta}>
            <Send size={15} />
            Emitir Alerta a la Población
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Título y Sector</th>
              <th>Nivel de Peligro</th>
              <th>Mensaje e Instrucciones</th>
              <th>Fecha de Emisión</th>
              <th>Confirmaciones de Lectura</th>
            </tr>
          </thead>
          <tbody>
            {alertas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No hay alertas comunitarias emitidas recientemente.
                </td>
              </tr>
            ) : (
              alertas.map((alt) => (
                <tr key={alt.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c' }}>
                    #{alt.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#ffffff' }}>{alt.titulo}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#38bdf8', marginTop: '2px' }}>
                      <MapPin size={12} />
                      {alt.comunidad}
                    </div>
                  </td>
                  <td>{getNivelBadge(alt.nivel)}</td>
                  <td>
                    <div style={{ color: '#e2e8f0', fontSize: '0.82rem', maxWidth: '380px' }}>
                      {alt.mensaje}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {alt.fecha}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} color="#10b981" />
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {alt.confirmaciones_lectura}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        vecinos confirmaron
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
