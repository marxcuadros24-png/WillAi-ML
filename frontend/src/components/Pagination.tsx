import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'registros'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generar páginas visibles con ventana inteligente
  const getVisiblePages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (safePage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="admin-pagination-container">
      {/* Información de rango */}
      <div className="admin-pagination-info">
        <span>
          Mostrando <strong>{startItem}</strong> – <strong>{endItem}</strong> de <strong>{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mostrar:</span>
            <select
              className="admin-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              style={{ padding: '3px 26px 3px 8px', fontSize: '11px', width: 'auto' }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Navegación */}
      <div className="admin-pagination-controls">
        <button
          type="button"
          className="admin-pagination-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          title="Primera página"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          className="admin-pagination-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="Página anterior"
        >
          <ChevronLeft size={14} />
        </button>

        {visiblePages.map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '12px' }}>
                …
              </span>
            );
          }
          const pageNum = Number(page);
          return (
            <button
              key={pageNum}
              type="button"
              className={`admin-pagination-btn ${pageNum === safePage ? 'active' : ''}`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          className="admin-pagination-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="Página siguiente"
        >
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          className="admin-pagination-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Última página"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
