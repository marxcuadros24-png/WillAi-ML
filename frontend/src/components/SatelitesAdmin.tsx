import React, { useState } from 'react';
import { Satellite, RefreshCw, CheckCircle2, Radio, CloudSun, Wind, AlertCircle } from 'lucide-react';
import type { LoteSatelital } from '../types';
import { Pagination } from './Pagination';

interface SatelitesAdminProps {
  lotes: LoteSatelital[];
  onDispararSync: (tipo: 'firms' | 'meteo' | 'fwi') => Promise<void>;
  onEntrenarViento: () => Promise<void>;
}

export const SatelitesAdmin: React.FC<SatelitesAdminProps> = ({
  lotes,
  onDispararSync,
  onEntrenarViento,
}) => {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  // Paginación Táctica
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const totalLotes = lotes.length;
  const totalPages = Math.max(1, Math.ceil(totalLotes / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const lotesPaginados = lotes.slice(startIndex, startIndex + pageSize);

  const handleSync = async (tipo: 'firms' | 'meteo' | 'fwi') => {
    setLoadingType(tipo);
    try {
      await onDispararSync(tipo);
    } finally {
      setLoadingType(null);
    }
  };

  const handleTrain = async () => {
    setLoadingType('viento');
    try {
      await onEntrenarViento();
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="admin-tab-view">
      <div className="admin-header-actions">
        <div>
          <h2 className="admin-section-title">
            <Satellite size={24} color="#38bdf8" />
            Integración y Sincronización Satelital & Meteorológica
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Descargas en vivo de NASA FIRMS (VIIRS 375m, MODIS 1km), SERFOR Perú y Open-Meteo
          </p>
        </div>
      </div>

      {/* Manual Sync Triggers Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 87, 34, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb923c', fontWeight: 700 }}>
              <Radio size={18} />
              NASA FIRMS Satelital
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Descarga los focos de calor térmicos de VIIRS (NOAA-20/21) y MODIS (Aqua/Terra) para Coracora.
            </p>
          </div>
          <button
            className="btn-admin btn-admin-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loadingType !== null}
            onClick={() => handleSync('firms')}
          >
            <RefreshCw size={15} className={loadingType === 'firms' ? 'spin' : ''} />
            {loadingType === 'firms' ? 'Sincronizando NASA...' : 'Consultar NASA FIRMS Ahora'}
          </button>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
              <CloudSun size={18} />
              Open-Meteo Coracora
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Actualiza temperatura, humedad relativa, velocidad de viento y lluvia para el distrito de Coracora.
            </p>
          </div>
          <button
            className="btn-admin btn-admin-outline"
            style={{ width: '100%', justifyContent: 'center', borderColor: '#0284c7', color: '#38bdf8' }}
            disabled={loadingType !== null}
            onClick={() => handleSync('meteo')}
          >
            <RefreshCw size={15} className={loadingType === 'meteo' ? 'spin' : ''} />
            {loadingType === 'meteo' ? 'Actualizando clima...' : 'Actualizar Open-Meteo'}
          </button>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700 }}>
              <AlertCircle size={18} />
              Índice Canadiense FWI
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Calcula FFMC, DMC, DC, ISI, BUI y Fire Weather Index en base a las variables meteorológicas actuales.
            </p>
          </div>
          <button
            className="btn-admin btn-admin-danger"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loadingType !== null}
            onClick={() => handleSync('fwi')}
          >
            <RefreshCw size={15} className={loadingType === 'fwi' ? 'spin' : ''} />
            {loadingType === 'fwi' ? 'Calculando FWI...' : 'Recalcular FWI Canadiense'}
          </button>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
              <Wind size={18} />
              Modelo ML Viento 12h
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Re-entrena el algoritmo Random Forest Multi-Output con series temporales pasadas para dispersión a 12h.
            </p>
          </div>
          <button
            className="btn-admin btn-admin-success"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loadingType !== null}
            onClick={handleTrain}
          >
            <RefreshCw size={15} className={loadingType === 'viento' ? 'spin' : ''} />
            {loadingType === 'viento' ? 'Entrenando Random Forest...' : 'Re-entrenar Modelo ML 12h'}
          </button>
        </div>
      </div>

      {/* Satellite Lots Table */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
          Historial de Pasadas e Importaciones Satelitales
        </h3>

        <div className="admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Sensor Satelital</th>
                <th>Estado de Pasada</th>
                <th>Fecha de Ingesta</th>
                <th>Focos Nuevos</th>
                <th>Focos Duplicados</th>
              </tr>
            </thead>
            <tbody>
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se registran lotes satelitales procesados recientemente.
                  </td>
                </tr>
              ) : (
                lotesPaginados.map((lot) => (
                  <tr key={lot.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb923c' }}>
                      LOTE-{lot.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{lot.fuente}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lot.sensor}</div>
                    </td>
                    <td>
                      <span className="badge-status badge-status-emerald">
                        <CheckCircle2 size={12} />
                        {lot.estado.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {lot.iniciado_en}
                    </td>
                    <td style={{ color: '#f87171', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      +{lot.registros_nuevos} focos
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {lot.registros_duplicados} omitidos
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalLotes > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalItems={totalLotes}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => setPageSize(newSize)}
              itemLabel="lotes satelitales"
            />
          )}
        </div>
      </div>
    </div>
  );
};
