import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  MapPin,
  Flame,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Settings2,
  ExternalLink,
  X,
  Truck
} from 'lucide-react';
import type { Brigada, UsuarioSistema, CrearBrigadaPayload } from '../types';
import {
  fetchBrigadas,
  fetchUsuarios,
  crearBrigada,
  cambiarEstadoBrigada,
  asignarMiembrosBrigada,
  eliminarBrigada
} from '../services/api';

// Sectores oficiales de Coracora con coordenadas predefinidas
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

const FUNCIONES_BRIGADISTA = [
  { valor: 'Jefe de Brigada', label: '🎖️ Jefe de Brigada / Líder' },
  { valor: 'Combatiente de Incendios', label: '🔥 Combatiente de Incendios' },
  { valor: 'Conductor / Logística', label: '🚒 Conductor / Logística' },
  { valor: 'Primeros Auxilios', label: '🩹 Primeros Auxilios / Rescate' },
  { valor: 'Radioperador', label: '📻 Radioperador / Comunicaciones' }
];

interface SelectedMemberState {
  usuario_id: number;
  funcion: string;
}

export const BrigadasAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  // Modal: Crear Brigada
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [newNombre, setNewNombre] = useState<string>('');
  const [newTipo, setNewTipo] = useState<'comunal' | 'bomberos' | 'municipal' | 'forestal' | 'otra'>('comunal');
  const [newComunidadId, setNewComunidadId] = useState<number>(1);
  const [newTelefono, setNewTelefono] = useState<string>('+51 966 ');
  const [newLat, setNewLat] = useState<number>(-15.0189);
  const [newLon, setNewLon] = useState<number>(-73.7806);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMemberState[]>([]);
  const [userSearchModal, setUserSearchModal] = useState<string>('');

  // Modal: Gestionar Miembros de Brigada Existente
  const [isEditMembersModalOpen, setIsEditMembersModalOpen] = useState<boolean>(false);
  const [editingBrigada, setEditingBrigada] = useState<Brigada | null>(null);
  const [editMembersList, setEditMembersList] = useState<SelectedMemberState[]>([]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [brigadasData, usuariosData] = await Promise.all([
        fetchBrigadas(),
        fetchUsuarios()
      ]);
      setBrigadas(brigadasData);
      setUsuarios(usuariosData.usuarios || []);
    } catch (err) {
      console.error('Error al cargar datos de brigadas:', err);
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

  // Cambio de sector en el modal de creación
  const handleSectorChange = (comunidadId: number) => {
    setNewComunidadId(comunidadId);
    const sector = COMUNIDADES_CORACORA.find((c) => c.id === comunidadId);
    if (sector) {
      setNewLat(sector.lat);
      setNewLon(sector.lon);
    }
  };

  // Toggle de usuario seleccionado para nueva brigada
  const handleToggleMember = (userId: number) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.usuario_id === userId);
      if (exists) {
        return prev.filter((m) => m.usuario_id !== userId);
      } else {
        // Si es el primer miembro seleccionado, sugerir como Jefe de Brigada
        const defaultFunc = prev.length === 0 ? 'Jefe de Brigada' : 'Combatiente de Incendios';
        return [...prev, { usuario_id: userId, funcion: defaultFunc }];
      }
    });
  };

  const handleMemberFunctionChange = (userId: number, funcion: string) => {
    setSelectedMembers((prev) =>
      prev.map((m) => (m.usuario_id === userId ? { ...m, funcion } : m))
    );
  };

  // Toggle en modal de edición de miembros
  const handleToggleEditMember = (userId: number) => {
    setEditMembersList((prev) => {
      const exists = prev.find((m) => m.usuario_id === userId);
      if (exists) {
        return prev.filter((m) => m.usuario_id !== userId);
      } else {
        const defaultFunc = prev.length === 0 ? 'Jefe de Brigada' : 'Combatiente de Incendios';
        return [...prev, { usuario_id: userId, funcion: defaultFunc }];
      }
    });
  };

  const handleEditMemberFunctionChange = (userId: number, funcion: string) => {
    setEditMembersList((prev) =>
      prev.map((m) => (m.usuario_id === userId ? { ...m, funcion } : m))
    );
  };

  // Abrir modal de creación limpio
  const handleOpenCreateModal = () => {
    setNewNombre('');
    setNewTipo('comunal');
    setNewComunidadId(1);
    setNewLat(-15.0189);
    setNewLon(-73.7806);
    setNewTelefono('+51 966 ');
    setSelectedMembers([]);
    setUserSearchModal('');
    setIsCreateModalOpen(true);
  };

  // Abrir modal de gestión de dotación
  const handleOpenEditMembersModal = (b: Brigada) => {
    setEditingBrigada(b);
    const currentMembers: SelectedMemberState[] = (b.integrantes || []).map((i) => ({
      usuario_id: i.id_usuario,
      funcion: i.funcion
    }));
    setEditMembersList(currentMembers);
    setUserSearchModal('');
    setIsEditMembersModalOpen(true);
  };

  // Guardar nueva brigada
  const handleCrearBrigadaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      alert('Por favor ingrese el nombre de la brigada.');
      return;
    }
    if (selectedMembers.length === 0) {
      if (!window.confirm('No has asignado ningún usuario a esta brigada. ¿Deseas crearla sin dotación inicial?')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: CrearBrigadaPayload = {
        nombre: newNombre.trim(),
        tipo: newTipo,
        comunidad_id: newComunidadId,
        comunidad_nombre: COMUNIDADES_CORACORA.find((c) => c.id === newComunidadId)?.nombre,
        telefono_contacto: newTelefono.trim(),
        latitud_base: newLat,
        longitud_base: newLon,
        miembros: selectedMembers
      };

      const res = await crearBrigada(payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        showNotification(`✅ Brigada "${newNombre}" creada exitosamente con ${selectedMembers.length} integrantes.`);
        await cargarDatos();
      }
    } catch (err: any) {
      alert(`Error al crear brigada: ${err.message || 'Error de conexión'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar miembros editados
  const handleSaveEditedMembers = async () => {
    if (!editingBrigada) return;
    setSubmitting(true);
    try {
      await asignarMiembrosBrigada(editingBrigada.id, editMembersList);
      setIsEditMembersModalOpen(false);
      showNotification(`✅ Dotación de "${editingBrigada.nombre}" actualizada con ${editMembersList.length} miembros.`);
      await cargarDatos();
    } catch (err: any) {
      alert(`Error al actualizar integrantes: ${err.message || 'Error de conexión'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar estado rápido
  const handleCambiarEstado = async (brigada: Brigada, nuevoEstado: string) => {
    try {
      await cambiarEstadoBrigada(brigada.id, nuevoEstado);
      showNotification(`Brigada "${brigada.nombre}" marcada como ${nuevoEstado.toUpperCase()}.`);
      await cargarDatos();
    } catch (err: any) {
      alert(`Error al cambiar estado: ${err.message}`);
    }
  };

  // Eliminar brigada
  const handleEliminarBrigada = async (brigada: Brigada) => {
    if (brigada.estado === 'desplegada') {
      alert('No se puede eliminar una brigada que está actualmente desplegada en un incidente.');
      return;
    }
    if (!window.confirm(`¿Está seguro de eliminar formalmente la "${brigada.nombre}"?`)) {
      return;
    }
    try {
      await eliminarBrigada(brigada.id);
      showNotification(`🗑️ Brigada "${brigada.nombre}" eliminada exitosamente.`);
      await cargarDatos();
    } catch (err: any) {
      alert(`Error al eliminar brigada: ${err.message}`);
    }
  };

  // Filtrado
  const brigadasFiltradas = brigadas.filter((b) => {
    if (filterEstado !== 'todos') {
      if (filterEstado === 'disponible' && b.estado !== 'disponible') return false;
      if (filterEstado === 'desplegada' && b.estado !== 'desplegada') return false;
      if (filterEstado === 'inactiva' && b.estado !== 'inactiva') return false;
    }
    if (filterTipo !== 'todos' && b.tipo !== filterTipo) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = b.nombre.toLowerCase().includes(q);
      const matchComunidad = (b.comunidad || '').toLowerCase().includes(q);
      const matchEntidad = (b.entidad || '').toLowerCase().includes(q);
      const matchIntegrantes = (b.integrantes || []).some(
        (i) => i.nombre.toLowerCase().includes(q) || i.username.toLowerCase().includes(q)
      );
      return matchName || matchComunidad || matchEntidad || matchIntegrantes;
    }
    return true;
  });

  // Métricas
  const totalBrigadas = brigadas.length;
  const brigadasDisponibles = brigadas.filter((b) => b.estado === 'disponible').length;
  const brigadasDesplegadas = brigadas.filter((b) => b.estado === 'desplegada').length;
  const totalCombatientes = brigadas.reduce((acc, b) => acc + (b.integrantes?.length || 0), 0);

  // Filtrado de usuarios dentro del modal
  const usuariosFiltradosModal = usuarios.filter((u) => {
    if (!userSearchModal.trim()) return true;
    const q = userSearchModal.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.roles || []).some((r) => r.toLowerCase().includes(q))
    );
  });

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
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid #06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield size={22} color="#06b6d4" />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Brigadas de Respuesta & Dotación de Personal
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Organización de cuadrillas comunales, bomberos y asignación de combatientes con usuarios del sistema.
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
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7' }}
          >
            <Plus size={16} />
            + Nueva Brigada
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <div className="stat-label">TOTAL BRIGADAS REGISTRADAS</div>
          <div className="stat-value" style={{ color: '#06b6d4' }}>{totalBrigadas}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fuerzas de intervención en Coracora</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">BRIGADAS DISPONIBLES</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{brigadasDisponibles}</div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>🟢 Listas para despacho inmediato</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-label">DESPLEGADAS EN INCIDENTE</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{brigadasDesplegadas}</div>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>🔥 Combatiendo focos activos</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-label">COMBATIENTES DOTADOS</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{totalCombatientes}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Usuarios asignados a brigadas</div>
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
              placeholder="Buscar por brigada, sector, integrante (@usuario)..."
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '7px 10px',
                color: '#ffffff',
                fontSize: '12px'
              }}
            >
              <option value="todos">Todos los Estados ({brigadas.length})</option>
              <option value="disponible">🟢 Disponibles ({brigadasDisponibles})</option>
              <option value="desplegada">🔴 Desplegadas ({brigadasDesplegadas})</option>
              <option value="inactiva">⚪ Inactivas</option>
            </select>
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '7px 10px',
              color: '#ffffff',
              fontSize: '12px'
            }}
          >
            <option value="todos">Todos los Tipos</option>
            <option value="comunal">Comunal</option>
            <option value="bomberos">Bomberos (B-12)</option>
            <option value="municipal">Municipal / OGRD</option>
            <option value="forestal">Forestal Especializada</option>
          </select>
        </div>
      </div>

      {/* Grid de Brigadas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Cargando brigadas y dotaciones operacionales...</div>
        </div>
      ) : brigadasFiltradas.length === 0 ? (
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
          <ShieldAlert size={36} color="#06b6d4" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ color: '#ffffff', fontSize: '16px', margin: '0 0 6px 0' }}>No se encontraron brigadas</h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
            No hay brigadas que coincidan con los filtros seleccionados o aún no has creado una.
          </p>
          <button className="btn-admin btn-admin-primary" onClick={handleOpenCreateModal}>
            <Plus size={14} />
            Crear Primera Brigada
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {brigadasFiltradas.map((b) => {
            const isDesplegada = b.estado === 'desplegada';
            const isDisponible = b.estado === 'disponible';
            const integrantes = b.integrantes || [];

            return (
              <div
                key={b.id}
                style={{
                  background: 'var(--panel-bg-dark)',
                  borderRadius: '12px',
                  border: isDesplegada
                    ? '1px solid rgba(239, 68, 68, 0.45)'
                    : isDisponible
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isDesplegada ? '0 0 20px rgba(239, 68, 68, 0.15)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px'
                }}
              >
                <div>
                  {/* Card Header: Nombre y Estado */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isDesplegada ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                          border: `1px solid ${isDesplegada ? '#ef4444' : '#06b6d4'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {b.tipo === 'bomberos' ? (
                          <Truck size={18} color={isDesplegada ? '#ef4444' : '#06b6d4'} />
                        ) : (
                          <Shield size={18} color={isDesplegada ? '#ef4444' : '#06b6d4'} />
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                          {b.nombre}
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textTransform: 'capitalize' }}>{b.tipo_display || b.tipo}</span>
                          <span>•</span>
                          <span>{b.entidad}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isDesplegada ? (
                        <span
                          className="badge badge-red"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            padding: '3px 8px',
                            animation: 'pulse 2s infinite'
                          }}
                        >
                          <Flame size={12} color="#ef4444" /> DESPLEGADA
                        </span>
                      ) : isDisponible ? (
                        <span
                          className="badge badge-green"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          🟢 DISPONIBLE
                        </span>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          ⚪ {b.estado.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Incidente Asignado en curso */}
                  {b.incidente_asignado && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '10px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', letterSpacing: '0.04em' }}>
                          🔥 OPERANDO EN INCIDENTE ACTIVO
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                          [{b.incidente_asignado.codigo}] {b.incidente_asignado.titulo}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Rol: {b.incidente_asignado.rol} • Asignada: {b.incidente_asignado.asignada_en}
                        </div>
                      </div>
                      <button
                        className="btn-admin btn-admin-outline"
                        style={{ padding: '4px 8px', fontSize: '10px', whiteSpace: 'nowrap' }}
                        onClick={() => navigate('/mapa')}
                        title="Ver en el Mapa Táctico"
                      >
                        <ExternalLink size={12} />
                        Mapa
                      </button>
                    </div>
                  )}

                  {/* Metadatos: Ubicación Base y Teléfono */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={13} color="#06b6d4" /> Base Operativa:
                      </span>
                      <span style={{ fontWeight: 600, color: '#ffffff' }}>
                        {b.comunidad || 'Coracora'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={13} color="#10b981" /> Contacto:
                      </span>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>
                        {b.telefono}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Coordenadas:</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {b.latitud?.toFixed(4)}, {b.longitud?.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Sección de Integrantes (Usuarios asignados) */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        👥 DOTACIÓN DE INTEGRANTES ({integrantes.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditMembersModal(b)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600
                        }}
                      >
                        <Settings2 size={12} />
                        Editar Dotación
                      </button>
                    </div>

                    {integrantes.length === 0 ? (
                      <div
                        style={{
                          padding: '10px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px dashed rgba(255,255,255,0.1)',
                          textAlign: 'center',
                          fontSize: '11px',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Sin usuarios asignados aún.{' '}
                        <button
                          onClick={() => handleOpenEditMembersModal(b)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Asignar combatientes ahora
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                        {integrantes.map((m) => (
                          <div
                            key={m.id_usuario}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  color: '#ffffff'
                                }}
                              >
                                {m.nombre.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
                                  {m.nombre}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  @{m.username}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: m.funcion.toLowerCase().includes('jefe') || m.funcion.toLowerCase().includes('líder')
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(56, 189, 248, 0.15)',
                                color: m.funcion.toLowerCase().includes('jefe') || m.funcion.toLowerCase().includes('líder')
                                  ? '#f59e0b'
                                  : '#38bdf8',
                                fontWeight: 700
                              }}
                            >
                              {m.funcion}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '12px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isDisponible ? (
                      <button
                        className="btn-admin btn-admin-outline"
                        style={{ padding: '5px 10px', fontSize: '11px' }}
                        onClick={() => handleCambiarEstado(b, 'ocupada')}
                        title="Poner brigada en mantenimiento o descanso"
                      >
                        Pausar
                      </button>
                    ) : !isDesplegada ? (
                      <button
                        className="btn-admin btn-admin-primary"
                        style={{ padding: '5px 10px', fontSize: '11px', background: '#059669' }}
                        onClick={() => handleCambiarEstado(b, 'disponible')}
                        title="Habilitar brigada para despacho"
                      >
                        Habilitar
                      </button>
                    ) : null}

                    <button
                      className="btn-admin btn-admin-outline"
                      style={{ padding: '5px 10px', fontSize: '11px' }}
                      onClick={() => navigate('/mapa')}
                      title="Ubicar en el Mapa Táctico"
                    >
                      <MapPin size={12} />
                      Mapa
                    </button>
                  </div>

                  {!isDesplegada && (
                    <button
                      className="btn-icon"
                      style={{ color: '#ef4444', padding: '6px' }}
                      onClick={() => handleEliminarBrigada(b)}
                      title="Eliminar Brigada"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL: CREAR NUEVA BRIGADA CON USUARIOS
         ======================================================== */}
      {isCreateModalOpen && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(6, 182, 212, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Shield size={18} color="#06b6d4" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '16px', color: '#ffffff' }}>
                    Registrar Nueva Brigada de Respuesta
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Asigna nombre, sector base y dota combatientes seleccionando de tus usuarios existentes.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearBrigadaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Nombre y Tipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Nombre de la Brigada *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Brigada Forestal Voluntaria Secce"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
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

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Tipo de Brigada
                  </label>
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
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
                    <option value="comunal">Comunal</option>
                    <option value="bomberos">Bomberos (B-12)</option>
                    <option value="municipal">Municipal / OGRD</option>
                    <option value="forestal">Forestal SERFOR</option>
                    <option value="otra">Otra Especialidad</option>
                  </select>
                </div>
              </div>

              {/* 2. Sector / Comunidad Base y Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sector / Comunidad Base (Coracora)
                  </label>
                  <select
                    value={newComunidadId}
                    onChange={(e) => handleSectorChange(Number(e.target.value))}
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
                    {COMUNIDADES_CORACORA.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Teléfono Operativo / Radio
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
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Coordenadas GPS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '10px',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Latitud Base:</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Longitud Base:</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLon}
                    onChange={(e) => setNewLon(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* 3. Selección y Dotación de Usuarios Existentes */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#38bdf8" />
                    Dotar Combatientes con Usuarios Existentes:
                  </label>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                    {selectedMembers.length} seleccionados
                  </span>
                </div>

                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <Search
                    size={14}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar usuarios por nombre o username..."
                    value={userSearchModal}
                    onChange={(e) => setUserSearchModal(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '5px',
                      padding: '6px 8px 6px 28px',
                      color: '#ffffff',
                      fontSize: '11px'
                    }}
                  />
                </div>

                {/* Lista de usuarios con checkboxes y funciones */}
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {usuariosFiltradosModal.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      No se encontraron usuarios.
                    </div>
                  ) : (
                    usuariosFiltradosModal.map((u) => {
                      const isSelected = selectedMembers.some((m) => m.usuario_id === u.id);
                      const currentSelection = selectedMembers.find((m) => m.usuario_id === u.id);

                      return (
                        <div
                          key={u.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              flex: 1
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMember(u.id)}
                              style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                            />
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                                {u.nombre || u.username}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                @{u.username} • Roles: {(u.roles || []).join(', ')}
                              </div>
                            </div>
                          </label>

                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value={currentSelection?.funcion || 'Combatiente de Incendios'}
                                onChange={(e) => handleMemberFunctionChange(u.id, e.target.value)}
                                style={{
                                  background: '#030712',
                                  border: '1px solid #0284c7',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: '#ffffff',
                                  fontSize: '11px'
                                }}
                              >
                                {FUNCIONES_BRIGADISTA.map((f) => (
                                  <option key={f.valor} value={f.valor}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
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
                  style={{ background: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Shield size={14} /> Registrar Brigada & Dotar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: EDITAR DOTACIÓN DE MIEMBROS EXISTENTES
         ======================================================== */}
      {isEditMembersModalOpen && editingBrigada && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="#06b6d4" />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '16px', color: '#ffffff' }}>
                    Dotación de Combatientes — {editingBrigada.nombre}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Asigna o retira usuarios del sistema y define sus funciones operativas.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsEditMembersModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre o @username..."
                  value={userSearchModal}
                  onChange={(e) => setUserSearchModal(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '5px',
                    padding: '6px 8px 6px 28px',
                    color: '#ffffff',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {usuariosFiltradosModal.map((u) => {
                  const isSelected = editMembersList.some((m) => m.usuario_id === u.id);
                  const currentSelection = editMembersList.find((m) => m.usuario_id === u.id);

                  return (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleEditMember(u.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                            {u.nombre || u.username}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            @{u.username} • Tel: {u.telefono || 'Sin registrar'}
                          </div>
                        </div>
                      </label>

                      {isSelected && (
                        <select
                          value={currentSelection?.funcion || 'Combatiente de Incendios'}
                          onChange={(e) => handleEditMemberFunctionChange(u.id, e.target.value)}
                          style={{
                            background: '#030712',
                            border: '1px solid #0284c7',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#ffffff',
                            fontSize: '11px'
                          }}
                        >
                          {FUNCIONES_BRIGADISTA.map((f) => (
                            <option key={f.valor} value={f.valor}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                  Total dotación: {editMembersList.length} combatientes
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-admin btn-admin-outline"
                    onClick={() => setIsEditMembersModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-admin btn-admin-primary"
                    disabled={submitting}
                    onClick={handleSaveEditedMembers}
                    style={{ background: '#0284c7' }}
                  >
                    {submitting ? 'Guardando...' : 'Guardar Cambios de Dotación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
