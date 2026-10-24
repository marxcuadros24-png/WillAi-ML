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
  Crosshair
} from 'lucide-react';
import type { ViviendaRural, CrearViviendaPayload } from '../types';
import {
  fetchViviendas,
  crearVivienda,
  editarVivienda,
  eliminarVivienda
} from '../services/api';

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
  const [viviendas, setViviendas] = useState<ViviendaRural[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterComunidad, setFilterComunidad] = useState<string>('todas');
  const [filterMaterial, setFilterMaterial] = useState<string>('todos');
  const [filterVerificada, setFilterVerificada] = useState<string>('todas');

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
              value={filterComunidad}
              onChange={(e) => setFilterComunidad(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#ffffff',
                fontSize: '12px'
              }}
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
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: '#ffffff',
              fontSize: '12px'
            }}
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
            value={filterVerificada}
            onChange={(e) => setFilterVerificada(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: '#ffffff',
              fontSize: '12px'
            }}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {viviendasFiltradas.map((v) => {
            const isVulnerable = v.material === 'tapial' || v.material === 'quincha' || v.material === 'madera';

            return (
              <div
                key={v.id}
                style={{
                  background: 'var(--panel-bg-dark)',
                  borderRadius: '12px',
                  border: isVulnerable ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Card Header: Código y Sector */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
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
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Home size={18} color="#f59e0b" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                            {v.codigo}
                          </span>
                          {v.verificada ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid #10b981',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px',
                                fontWeight: 700
                              }}
                            >
                              <CheckCircle2 size={10} /> Verificada
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(156, 163, 175, 0.15)',
                                color: 'var(--text-muted)',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '10px'
                              }}
                            >
                              Pendiente
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                          📍 Sector {v.comunidad}
                        </div>
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)'
                      }}
                    >
                      👥 {v.habitantes} hab.
                    </span>
                  </div>

                  {/* Referencia de Ubicación */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      margin: '0 0 12px 0',
                      lineHeight: 1.4,
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    {v.referencia || 'Sin referencia registrada.'}
                  </p>

                  {/* Metadatos: Responsable, Teléfono, Material */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Responsable / Familia:</span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>
                        {v.nombre_responsable || 'Familia comunera'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} color="#10b981" /> Contacto Emergencia:
                      </span>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>
                        {v.telefono_contacto || 'Sin teléfono'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Material Constructivo:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isVulnerable ? '#ef4444' : '#ffffff'
                        }}
                      >
                        {v.material_display || v.material}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      <span>GPS:</span>
                      <span>
                        {v.latitud.toFixed(4)}, {v.longitud.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => navigate('/mapa')}
                      title="Ver ubicación en el Mapa Táctico"
                    >
                      <MapPin size={12} color="#06b6d4" />
                      Ver en Mapa
                    </button>
                    <button
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleOpenEditModal(v)}
                      title="Editar datos de la vivienda"
                    >
                      <Edit size={12} />
                      Editar
                    </button>
                  </div>

                  <button
                    className="btn-icon"
                    style={{ color: '#ef4444', padding: '6px' }}
                    onClick={() => handleEliminarVivienda(v)}
                    title="Eliminar vivienda del padrón"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
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
                  value={newComunidadId}
                  onChange={(e) => handleSectorChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#ffffff',
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
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
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
                    value={editMaterial}
                    onChange={(e) => setEditMaterial(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
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
