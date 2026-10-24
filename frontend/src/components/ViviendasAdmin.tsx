import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  Filter,
  Phone,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Edit,
  X,
  Crosshair,
  Eye,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Users
} from 'lucide-react';
import type { ViviendaRural, CrearViviendaPayload } from '../types';
import {
  fetchViviendas,
  crearVivienda,
  editarVivienda,
  eliminarVivienda
} from '../services/api';
import { Pagination } from './Pagination';
import { useAppContext } from '../context/AppContext';

const COMUNIDADES_CORACORA = [
  { id: 1, nombre: 'Coracora Centro', lat: -15.0189, lon: -73.7806 },
  { id: 2, nombre: 'Secce', lat: -15.045, lon: -73.762 },
  { id: 3, nombre: 'Huallhua', lat: -15.08, lon: -73.81 },
  { id: 4, nombre: 'Muchapampa', lat: -15.025, lon: -73.74 },
  { id: 5, nombre: 'Paucaray', lat: -15.11, lon: -73.79 },
  { id: 6, nombre: 'Huaccana', lat: -15.062, lon: -73.834 },
  { id: 7, nombre: 'Baños Termales Pumahuasi', lat: -14.985, lon: -73.755 },
  { id: 8, nombre: 'Cerro Pumahuasi', lat: -14.962, lon: -73.742 }
];

const MATERIALES_OPCIONES = [
  { valor: 'adobe_teja', label: 'Adobe y Teja (Tradicional Andino)' },
  { valor: 'tapial', label: 'Tapial y Paja / Puna' },
  { valor: 'quincha', label: 'Quincha / Caña' },
  { valor: 'calamina', label: 'Adobe y Calamina' },
  { valor: 'madera', label: 'Madera / Rústico' },
  { valor: 'material_noble', label: 'Ladrillo y Cemento (Material Noble)' },
  { valor: 'otro', label: 'Otro Material' }
];

export const ViviendasAdmin: React.FC = () => {
  const navigate = useNavigate();
  let loadAllData: (() => Promise<void>) | undefined;
  try {
    const ctx = useAppContext();
    loadAllData = ctx?.loadAllData;
  } catch {
    // Rendered outside outlet context
  }

  const [viviendas, setViviendas] = useState<ViviendaRural[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterComunidad, setFilterComunidad] = useState<string>('todas');
  const [filterMaterial, setFilterMaterial] = useState<string>('todos');
  const [filterVerificada, setFilterVerificada] = useState<string>('todas');

  // Paginación Táctica
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reiniciar a primera página cuando cambie cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterComunidad, filterMaterial, filterVerificada]);

  // Modal: Crear Vivienda
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [newCodigo, setNewCodigo] = useState<string>('');
  const [newComunidadId, setNewComunidadId] = useState<number>(1);
  const [newReferencia, setNewReferencia] = useState<string>('');
  const [newLat, setNewLat] = useState<number>(-15.0189);
  const [newLon, setNewLon] = useState<number>(-73.7806);
  const [newResponsable, setNewResponsable] = useState<string>('');
  const [newTelefono, setNewTelefono] = useState<string>('+51 966 ');
  const [newMaterial, setNewMaterial] = useState<string>('adobe_teja');
  const [newHabitantes, setNewHabitantes] = useState<number>(4);
  const [newVerificada, setNewVerificada] = useState<boolean>(true);

  // Modal: Editar Vivienda
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingVivienda, setEditingVivienda] = useState<ViviendaRural | null>(null);
  const [editReferencia, setEditReferencia] = useState<string>('');
  const [editResponsable, setEditResponsable] = useState<string>('');
  const [editTelefono, setEditTelefono] = useState<string>('');
  const [editMaterial, setEditMaterial] = useState<string>('adobe_teja');
  const [editHabitantes, setEditHabitantes] = useState<number>(4);
  const [editVerificada, setEditVerificada] = useState<boolean>(true);
  const [editLat, setEditLat] = useState<number>(-15.0189);
  const [editLon, setEditLon] = useState<number>(-73.7806);

  // Modal: Ficha Técnica / Detalle de Vivienda
  const [detalleVivienda, setDetalleVivienda] = useState<ViviendaRural | null>(null);
  const [copiadoGps, setCopiadoGps] = useState<boolean>(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await fetchViviendas();
      setViviendas(data);
    } catch (err) {
      console.error('Error al cargar viviendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const showNotification = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 4500);
  };

  // Cambio de sector en modal de creación
  const handleSectorChange = (comunidadId: number) => {
    setNewComunidadId(comunidadId);
    const sector = COMUNIDADES_CORACORA.find((c) => c.id === comunidadId);
    if (sector) {
      setNewLat(sector.lat);
      setNewLon(sector.lon);
    }
  };

  // GPS Dispositivo
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada en este navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setNewLon(parseFloat(pos.coords.longitude.toFixed(6)));
        showNotification('📍 Coordenadas GPS del dispositivo capturadas.');
      },
      (err) => {
        alert(`No se pudo obtener la ubicación GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setNewCodigo('');
    setNewComunidadId(1);
    setNewReferencia('');
    setNewLat(-15.0189);
    setNewLon(-73.7806);
    setNewResponsable('');
    setNewTelefono('+51 966 ');
    setNewMaterial('adobe_teja');
    setNewHabitantes(4);
    setNewVerificada(true);
    setIsCreateModalOpen(true);
  };

  // Guardar nueva vivienda
  const handleCrearViviendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferencia.trim()) {
      alert('Por favor ingrese una referencia o dirección de la vivienda.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CrearViviendaPayload = {
        codigo: newCodigo.trim() || undefined,
        comunidad_id: newComunidadId,
        comunidad_nombre: COMUNIDADES_CORACORA.find((c) => c.id === newComunidadId)?.nombre,
        referencia: newReferencia.trim(),
        latitud: newLat,
        longitud: newLon,
        nombre_responsable: newResponsable.trim() || undefined,
        telefono_contacto: newTelefono.trim() || undefined,
        material_predominante: newMaterial,
        habitantes: newHabitantes,
        verificada: newVerificada
      };

      const res = await crearVivienda(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        showNotification(`✅ Vivienda "${res.codigo || 'creada'}" registrada exitosamente en el padrón.`);
        await cargarDatos();
        loadAllData?.();
      }
    } catch (err: any) {
      alert(`Error al registrar vivienda: ${err.message || 'Error de conexión'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de edición
  const handleOpenEditModal = (v: ViviendaRural) => {
    setEditingVivienda(v);
    setEditReferencia(v.referencia);
    setEditResponsable(v.nombre_responsable || '');
    setEditTelefono(v.telefono_contacto || '');
    setEditMaterial(v.material || 'adobe_teja');
    setEditHabitantes(v.habitantes || 4);
    setEditVerificada(v.verificada);
    setEditLat(v.latitud);
    setEditLon(v.longitud);
    setIsEditModalOpen(true);
  };

  // Guardar edición
  const handleEditViviendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVivienda) return;

    setSubmitting(true);
    try {
      await editarVivienda(editingVivienda.id, {
        referencia: editReferencia.trim(),
        nombre_responsable: editResponsable.trim() || undefined,
        telefono_contacto: editTelefono.trim() || undefined,
        material_predominante: editMaterial,
        habitantes: editHabitantes,
        verificada: editVerificada,
        latitud: editLat,
        longitud: editLon
      });
      setIsEditModalOpen(false);
      showNotification(`✅ Vivienda "${editingVivienda.codigo}" actualizada con éxito.`);
      await cargarDatos();
      loadAllData?.();
    } catch (err: any) {
      alert(`Error al actualizar vivienda: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar vivienda
  const handleEliminarVivienda = async (v: ViviendaRural) => {
    if (!window.confirm(`¿Está seguro de eliminar del padrón la vivienda "${v.codigo}" (${v.comunidad})?`)) {
      return;
    }
    try {
      await eliminarVivienda(v.id);
      showNotification(`🗑️ Vivienda "${v.codigo}" eliminada.`);
      await cargarDatos();
      loadAllData?.();
    } catch (err: any) {
      alert(`Error al eliminar vivienda: ${err.message}`);
    }
  };

  // Filtrado
  const viviendasFiltradas = viviendas.filter((v) => {
    if (filterComunidad !== 'todas' && v.comunidad !== filterComunidad) {
      return false;
    }
    if (filterMaterial !== 'todos' && v.material !== filterMaterial) {
      return false;
    }
    if (filterVerificada !== 'todas') {
      if (filterVerificada === 'si' && !v.verificada) return false;
      if (filterVerificada === 'no' && v.verificada) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCod = v.codigo.toLowerCase().includes(q);
      const matchCom = v.comunidad.toLowerCase().includes(q);
      const matchRef = v.referencia.toLowerCase().includes(q);
      const matchResp = (v.nombre_responsable || '').toLowerCase().includes(q);
      const matchTel = (v.telefono_contacto || '').toLowerCase().includes(q);
      return matchCod || matchCom || matchRef || matchResp || matchTel;
    }
    return true;
  });

  // Paginación Táctica
  const totalFiltradas = viviendasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltradas / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const viviendasPaginadas = viviendasFiltradas.slice(startIndex, startIndex + pageSize);

  // Métricas
  const totalViviendas = viviendas.length;
  const totalHabitantes = viviendas.reduce((acc, v) => acc + (v.habitantes || 0), 0);
  const totalVerificadas = viviendas.filter((v) => v.verificada).length;
  const totalAltaVulnerabilidad = viviendas.filter(
    (v) => v.material === 'tapial' || v.material === 'quincha' || v.material === 'madera'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Notificación Toast */}
      {actionMsg && (
        <div
          className="toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#047857',
            border: '1px solid #10b981',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 99999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <CheckCircle2 size={18} color="#ffffff" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'var(--panel-bg-dark)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Home size={22} color="#f59e0b" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Padrón de Viviendas Rurales Vulnerables
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Catastro de predios aislados, materiales constructivos y contactos familiares para evacuación y defensa ante incendios.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn-admin btn-admin-outline"
            onClick={cargarDatos}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
          <button
            className="btn-admin btn-admin-primary"
            onClick={handleOpenCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#d97706' }}
          >
            <Plus size={16} />
            + Registrar Vivienda Rural
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-label">TOTAL PREDIOS REGISTRADOS</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{totalViviendas}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Viviendas en sectores rurales</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">POBLACIÓN / HABITANTES</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{totalHabitantes}</div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Pobladores censados y protegidos</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div className="stat-label">VERIFICADAS EN TERRENO</div>
          <div className="stat-value" style={{ color: '#06b6d4' }}>{totalVerificadas}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Coordenadas GPS validadas</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-label">ALTA VULNERABILIDAD</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{totalAltaVulnerabilidad}</div>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>Tapial, Quincha o Madera</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--panel-bg-dark)',
          padding: '14px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Buscar por código, sector, familia, referencia o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '8px 12px 8px 34px',
                color: '#ffffff',
                fontSize: '12px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Sector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="admin-select"
              value={filterComunidad}
              onChange={(e) => setFilterComunidad(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 32px 7px 10px', width: 'auto' }}
            >
              <option value="todas">Todos los Sectores</option>
              {COMUNIDADES_CORACORA.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Material */}
          <select
            className="admin-select"
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            style={{ fontSize: '12px', padding: '7px 32px 7px 10px', width: 'auto' }}
          >
            <option value="todos">Todos los Materiales</option>
            {MATERIALES_OPCIONES.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Verificación */}
          <select
            className="admin-select"
            value={filterVerificada}
            onChange={(e) => setFilterVerificada(e.target.value)}
            style={{ fontSize: '12px', padding: '7px 32px 7px 10px', width: 'auto' }}
          >
            <option value="todas">Todas</option>
            <option value="si">✅ Verificadas en Campo</option>
            <option value="no">⏳ Pendientes de Verificación</option>
          </select>
        </div>
      </div>

      {/* Grid de Viviendas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Cargando padrón de viviendas rurales...</div>
        </div>
      ) : viviendasFiltradas.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'var(--panel-bg-dark)',
            borderRadius: '10px',
            border: '1px dashed rgba(255,255,255,0.12)',
            color: 'var(--text-muted)'
          }}
        >
          <Home size={36} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ color: '#ffffff', fontSize: '16px', margin: '0 0 6px 0' }}>No se encontraron viviendas rurales</h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
            No hay predios que coincidan con la búsqueda o aún no has registrado viviendas en este sector.
          </p>
          <button className="btn-admin btn-admin-primary" onClick={handleOpenCreateModal} style={{ background: '#d97706' }}>
            <Plus size={14} />
            Registrar Primera Vivienda
          </button>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código & Predio</th>
                <th>Sector / Comunidad</th>
                <th>Responsable & Contacto</th>
                <th>Habitantes</th>
                <th>Material Constructivo</th>
                <th>Verificación</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {viviendasPaginadas.map((v) => {
                const isVulnerable = v.material === 'tapial' || v.material === 'quincha' || v.material === 'madera';

                return (
                  <tr
                    key={v.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setDetalleVivienda(v)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: isVulnerable ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            border: isVulnerable ? '1px solid #ef4444' : '1px solid #f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <Home size={16} color={isVulnerable ? '#ef4444' : '#f59e0b'} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                            {v.codigo}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              maxWidth: '240px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {v.referencia || 'Sin referencia registrada'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                        📍 {v.comunidad}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                        {v.nombre_responsable || 'Familia comunera'}
                      </div>
                      {v.telefono_contacto && (
                        <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={11} /> {v.telefono_contacto}
                        </div>
                      )}
                    </td>

                    <td>
                      <span
                        className="badge"
                        style={{
                          fontSize: '11px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)'
                        }}
                      >
                        👥 {v.habitantes} hab.
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isVulnerable ? 700 : 500,
                            color: isVulnerable ? '#ef4444' : '#ffffff'
                          }}
                        >
                          {v.material_display || v.material}
                        </span>
                        {isVulnerable && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              letterSpacing: '0.04em'
                            }}
                          >
                            ALTO RIESGO
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {v.verificada ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid #10b981',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          <CheckCircle2 size={11} /> Verificada
                        </span>
                      ) : (
                        <span
                          style={{
                            background: 'rgba(156, 163, 175, 0.15)',
                            color: 'var(--text-muted)',
                            borderRadius: '4px',
                            padding: '2px 7px',
                            fontSize: '11px'
                          }}
                        >
                          ⏳ Pendiente
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn-admin btn-admin-primary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#f59e0b',
                            border: '1px solid #f59e0b'
                          }}
                          onClick={() => setDetalleVivienda(v)}
                          title="Abrir ficha técnica y detalles completos del predio"
                        >
                          <Eye size={12} />
                          Detalles
                        </button>
                        <button
                          className="btn-admin btn-admin-outline"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => navigate('/mapa')}
                          title="Ubicar en Mapa Táctico"
                        >
                          <MapPin size={12} color="#06b6d4" />
                        </button>
                        <button
                          className="btn-admin btn-admin-outline"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar datos de la vivienda"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: '#ef4444', padding: '4px 6px' }}
                          onClick={() => handleEliminarVivienda(v)}
                          title="Eliminar vivienda del padrón"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalFiltradas > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalItems={totalFiltradas}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => setPageSize(newSize)}
              itemLabel="predios rurales"
            />
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: FICHA TÉCNICA DETALLADA DE VIVIENDA RURAL
         ======================================================== */}
      {detalleVivienda && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid #f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Home size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="modal-title" style={{ fontSize: '17px', color: '#ffffff', margin: 0 }}>
                      {detalleVivienda.codigo}
                    </h3>
                    {detalleVivienda.verificada ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          border: '1px solid #10b981',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        <CheckCircle2 size={12} /> Verificada en Campo
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(156, 163, 175, 0.15)',
                          color: 'var(--text-muted)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '11px'
                        }}
                      >
                        ⏳ Pendiente de Verificación
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: '#38bdf8', margin: '2px 0 0 0', fontWeight: 600 }}>
                    📍 Sector / Comunidad: {detalleVivienda.comunidad} (Distrito Coracora)
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setDetalleVivienda(null)} title="Cerrar Ficha">
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
              {/* Sección: Ubicación y Coordenadas */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#38bdf8" /> Geolocalización Táctica
                </div>
                
                <div style={{ fontSize: '13px', color: '#ffffff', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '3px' }}>Referencia registrada:</span>
                  {detalleVivienda.referencia || 'Sin referencia registrada en el catastro.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#38bdf8' }}>
                    Lat: <strong>{detalleVivienda.latitud.toFixed(6)}</strong> · Lon: <strong>{detalleVivienda.longitud.toFixed(6)}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(`${detalleVivienda.latitud}, ${detalleVivienda.longitud}`);
                        setCopiadoGps(true);
                        setTimeout(() => setCopiadoGps(false), 2000);
                      }}
                    >
                      {copiadoGps ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiadoGps ? '¡Copiado!' : 'Copiar GPS'}
                    </button>

                    <button
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setDetalleVivienda(null);
                        navigate('/mapa');
                      }}
                    >
                      <MapPin size={12} color="#06b6d4" />
                      Abrir Mapa Táctico
                    </button>

                    <a
                      href={`https://www.google.com/maps?q=${detalleVivienda.latitud},${detalleVivienda.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={12} />
                      Google Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Sección: Habitantes y Contacto */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Responsable / Familia
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    {detalleVivienda.nombre_responsable || 'Familia comunera no especificada'}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Users size={14} color="#38bdf8" />
                    <span style={{ color: 'var(--text-secondary)' }}>Carga poblacional:</span>
                    <strong style={{ color: '#38bdf8' }}>{detalleVivienda.habitantes} habitantes</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Contacto de Emergencia
                  </span>
                  {detalleVivienda.telefono_contacto ? (
                    <div>
                      <a
                        href={`tel:${detalleVivienda.telefono_contacto}`}
                        style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <Phone size={14} /> {detalleVivienda.telefono_contacto}
                      </a>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                        Llamada directa o despacho de brigadista
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Sin teléfono registrado
                    </span>
                  )}
                </div>
              </div>

              {/* Sección: Análisis de Material y Vulnerabilidad */}
              {(() => {
                const isVulnerable = detalleVivienda.material === 'tapial' || detalleVivienda.material === 'quincha' || detalleVivienda.material === 'madera';
                return (
                  <div
                    style={{
                      background: isVulnerable ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      border: isVulnerable ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '8px',
                      padding: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={16} color={isVulnerable ? '#ef4444' : '#10b981'} />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isVulnerable ? '#ef4444' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {isVulnerable ? 'Alto Riesgo ante Incendio Forestal' : 'Resistencia Estructural Favorable'}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isVulnerable ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isVulnerable ? '#ef4444' : '#10b981'
                        }}
                      >
                        {detalleVivienda.material_display || detalleVivienda.material}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {isVulnerable
                        ? 'Material altamente combustible o vulnerable a pavesas (tapial/quincha/madera). En caso de frente de fuego a menos de 2.0 km con viento andino superior a 15 km/h, este predio debe recibir prioridad inmediata de evacuación o cortafuegos preventivo.'
                        : 'Estructura construida en adobe/teja o material noble. Presenta mayor inercia térmica frente a pavesas directas. Mantener franja perimetral de pastizales desbrozada.'}
                    </p>
                  </div>
                );
              })()}

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn-admin btn-admin-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const toDelete = detalleVivienda;
                    setDetalleVivienda(null);
                    handleEliminarVivienda(toDelete);
                  }}
                >
                  <Trash2 size={13} />
                  Eliminar del Padrón
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-admin btn-admin-outline"
                    onClick={() => {
                      const toEdit = detalleVivienda;
                      setDetalleVivienda(null);
                      handleOpenEditModal(toEdit);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit size={13} />
                    Editar Predio
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin-primary"
                    onClick={() => setDetalleVivienda(null)}
                  >
                    Cerrar Ficha
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRAR NUEVA VIVIENDA RURAL
         ======================================================== */}
      {isCreateModalOpen && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Home size={18} color="#f59e0b" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '16px', color: '#ffffff' }}>
                    Registrar Vivienda Rural Manualmente
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Ingresa las coordenadas o selecciona el sector para cadastrar el predio vulnerable.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearViviendaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Sector / Comunidad */}
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#f59e0b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="#f59e0b" /> Sector o Comunidad de Coracora:
                  </label>
                  <button
                    type="button"
                    className="btn-admin btn-admin-outline"
                    style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleUseCurrentLocation}
                    title="Obtener coordenadas GPS del dispositivo en campo"
                  >
                    <Crosshair size={12} color="#f59e0b" />
                    Mi Ubicación GPS
                  </button>
                </div>

                <select
                  className="admin-select"
                  value={newComunidadId}
                  onChange={(e) => handleSectorChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    border: '1px solid #f59e0b',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  {COMUNIDADES_CORACORA.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} (Lat: {c.lat}, Lon: {c.lon})
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordenadas GPS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Latitud GPS *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Longitud GPS *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newLon}
                    onChange={(e) => setNewLon(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Referencia de Ubicación */}
              <div>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Referencia de Ubicación / Dirección *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Km 4 camino a Secce alta, junto al manantial"
                  value={newReferencia}
                  onChange={(e) => setNewReferencia(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Responsable y Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Familia / Responsable del Hogar
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Familia Huamaní Condori"
                    value={newResponsable}
                    onChange={(e) => setNewResponsable(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Teléfono de Contacto (Evacuación)
                  </label>
                  <input
                    type="text"
                    placeholder="+51 966 ..."
                    value={newTelefono}
                    onChange={(e) => setNewTelefono(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Material y Habitantes */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Material Predominante de Construcción
                  </label>
                  <select
                    className="admin-select"
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    style={{ width: '100%', fontSize: '12px' }}
                  >
                    {MATERIALES_OPCIONES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Habitantes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newHabitantes}
                    onChange={(e) => setNewHabitantes(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              {/* Verificada checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  id="chk-verificada"
                  checked={newVerificada}
                  onChange={(e) => setNewVerificada(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <label htmlFor="chk-verificada" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                  Marcar como <strong>Verificada en Campo</strong> (Coordenadas y predio comprobados)
                </label>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-admin btn-admin-outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin-primary"
                  disabled={submitting}
                  style={{ background: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Home size={14} /> Registrar en el Padrón
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDITAR VIVIENDA RURAL
         ======================================================== */}
      {isEditModalOpen && editingVivienda && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit size={18} color="#38bdf8" />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '16px', color: '#ffffff' }}>
                    Editar Vivienda — {editingVivienda.codigo}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Sector {editingVivienda.comunidad}
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditViviendaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Referencia de Ubicación
                </label>
                <input
                  type="text"
                  required
                  value={editReferencia}
                  onChange={(e) => setEditReferencia(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Familia / Responsable
                  </label>
                  <input
                    type="text"
                    value={editResponsable}
                    onChange={(e) => setEditResponsable(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Material Constructivo
                  </label>
                  <select
                    className="admin-select"
                    value={editMaterial}
                    onChange={(e) => setEditMaterial(e.target.value)}
                    style={{ width: '100%', fontSize: '12px' }}
                  >
                    {MATERIALES_OPCIONES.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Habitantes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editHabitantes}
                    onChange={(e) => setEditHabitantes(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Latitud GPS
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editLat}
                    onChange={(e) => setEditLat(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Longitud GPS
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editLon}
                    onChange={(e) => setEditLon(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  id="chk-edit-verificada"
                  checked={editVerificada}
                  onChange={(e) => setEditVerificada(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <label htmlFor="chk-edit-verificada" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                  Vivienda Verificada en Campo
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-admin btn-admin-outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin-primary"
                  disabled={submitting}
                  style={{ background: '#0284c7' }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
