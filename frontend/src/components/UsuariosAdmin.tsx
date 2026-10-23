import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';
import type { UsuarioSistema, RolSistema } from '../types';
import { fetchUsuarios, cambiarEstadoUsuario, asignarRolUsuario, crearUsuarioOperativo } from '../services/api';

export const UsuariosAdmin: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [roles, setRoles] = useState<RolSistema[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal crear usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('willai2026');
  const [newRole, setNewRole] = useState<string>('operador_emergencia');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await fetchUsuarios();
      setUsuarios(data.usuarios || []);
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const showNotification = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleToggleEstado = async (idUsuario: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo';
    try {
      await cambiarEstadoUsuario(idUsuario, nuevoEstado);
      setUsuarios(prev =>
        prev.map(u => (u.id === idUsuario ? { ...u, estado: nuevoEstado as any } : u))
      );
      showNotification(`Usuario #${idUsuario} marcado como ${nuevoEstado.toUpperCase()}.`);
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleAsignarRol = async (idUsuario: number, codigoRol: string, estaAsignado: boolean) => {
    const accion = estaAsignado ? 'remover' : 'asignar';
    try {
      const res = await asignarRolUsuario(idUsuario, codigoRol, accion);
      setUsuarios(prev =>
        prev.map(u => (u.id === idUsuario ? { ...u, roles: res.roles, roles_codigos: res.roles } : u))
      );
      showNotification(`Rol ${codigoRol} ${accion === 'asignar' ? 'asignado' : 'retirado'} con éxito.`);
      cargarDatos();
    } catch (err: any) {
      alert(`Error al cambiar rol: ${err.message}`);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await crearUsuarioOperativo({
        username: newUsername,
        nombre: newName,
        email: newEmail,
        telefono: newPhone,
        password: newPassword,
        codigo_rol: newRole
      });
      if (res.success) {
        setIsCreateModalOpen(false);
        setNewUsername('');
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        showNotification(res.mensaje || 'Usuario creado exitosamente');
        cargarDatos();
      } else {
        alert(res.error || 'Error al crear usuario');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado en vivo
  const usuariosFiltrados = usuarios.filter(u => {
    const matchSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.telefono.includes(searchTerm);

    const matchRole =
      roleFilter === 'todos' ||
      u.roles_codigos.includes(roleFilter) ||
      (roleFilter === 'staff' && u.is_staff);

    const matchStatus = statusFilter === 'todos' || u.estado === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const totalActivos = usuarios.filter(u => u.estado === 'activo').length;
  const totalOperadores = usuarios.filter(u => u.is_staff || u.roles_codigos.includes('operador_emergencia') || u.roles_codigos.includes('administrador')).length;
  const totalBrigadistas = usuarios.filter(u => u.roles_codigos.includes('brigadista')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notificación Flotante */}
      {actionMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--panel-bg-dark)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <CheckCircle size={18} color="#38bdf8" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Header y KPIs de Usuarios */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#38bdf8" />
            GESTIÓN DE USUARIOS, OPERADORES & BRIGADISTAS
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Administración centralizada de cuentas, roles operativos y credenciales de acceso.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-admin btn-admin-outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button className="btn-admin btn-admin-primary" onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus size={16} />
            Nuevo Operador / Brigadista
          </button>
        </div>
      </div>

      {/* Métricas de Cuentas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="admin-stat-card">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL USUARIOS</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: '4px 0' }}>
            {usuarios.length}
          </div>
          <span style={{ fontSize: '11px', color: '#4ade80' }}>{totalActivos} activos en el sistema</span>
        </div>

        <div className="admin-stat-card">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OPERADORES & COEP</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {totalOperadores}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Acceso a Centro de Mando</span>
        </div>

        <div className="admin-stat-card">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BRIGADISTAS EN TERRENO</span>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f97316', margin: '4px 0' }}>
            {totalBrigadistas}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Asignables a incidentes</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        style={{
          background: 'var(--panel-bg)',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario, correo o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '13px',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <option value="todos">Todos los Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
              ))}
            </select>
          </div>

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <option value="todos">Todos los Estados</option>
            <option value="activo">Activos</option>
            <option value="suspendido">Suspendidos</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario & Nombre</th>
              <th>Contacto</th>
              <th>Roles Asignados</th>
              <th>Estado</th>
              <th>Registro</th>
              <th>Último Acceso</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No se encontraron usuarios con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((u) => {
                const esActivo = u.estado === 'activo';
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: u.is_staff ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.08)',
                            color: u.is_staff ? '#38bdf8' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px'
                          }}
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                            {u.nombre}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            @{u.username} {u.is_staff && <span style={{ color: '#38bdf8' }}>• Staff</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={12} color="var(--text-muted)" />
                          <span>{u.email || 'Sin correo'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: 'var(--text-muted)' }}>
                          <Phone size={12} />
                          <span>{u.telefono}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {u.roles.length === 0 ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ciudadano Estándar</span>
                        ) : (
                          u.roles.map((r, idx) => (
                            <span key={idx} className="badge badge-cyan" style={{ fontSize: '10px' }}>
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${esActivo ? 'badge-emerald' : 'badge-red'}`}>
                        {u.estado.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {u.creado_en}
                    </td>

                    <td style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {u.ultimo_acceso}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <select
                          className="admin-select"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', width: 'auto' }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const rolCod = e.target.value;
                              const yaTiene = u.roles_codigos.includes(rolCod);
                              handleAsignarRol(u.id, rolCod, yaTiene);
                            }
                          }}
                        >
                          <option value="">⚙️ Roles...</option>
                          {roles.map((r) => (
                            <option key={r.codigo} value={r.codigo}>
                              {u.roles_codigos.includes(r.codigo) ? 'Quitar ' : 'Asignar '} {r.nombre}
                            </option>
                          ))}
                        </select>

                        <button
                          className={`btn-admin ${esActivo ? 'btn-admin-danger' : 'btn-admin-primary'}`}
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          onClick={() => handleToggleEstado(u.id, u.estado)}
                          title={esActivo ? 'Suspender acceso' : 'Reactivar usuario'}
                        >
                          {esActivo ? <XCircle size={13} /> : <CheckCircle size={13} />}
                          {esActivo ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Usuario */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#38bdf8" />
                Registrar Operador o Brigadista
              </h3>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div>
                <label className="admin-form-label">Nombre de Usuario (@username) *</label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  placeholder="ej. brigada_huaccana_1"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="admin-form-label">Nombre Completo / Entidad *</label>
                <input
                  type="text"
                  required
                  className="admin-input"
                  placeholder="ej. Juan Carlos Quispe (Bomberos B-12)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-form-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="admin-input"
                    placeholder="operador@willai.pe"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-form-label">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="+51 987 654 321"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-form-label">Contraseña Temporal</label>
                  <input
                    type="password"
                    required
                    className="admin-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="admin-form-label">Rol Operativo Inicial</label>
                  <select
                    className="admin-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="operador_emergencia">Operador COEP / COEL</option>
                    <option value="brigadista">Brigadista Combatiente</option>
                    <option value="verificador">Verificador Comunal</option>
                    <option value="administrador">Administrador General</option>
                    <option value="poblador">Ciudadano / Poblador</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '10px' }}>
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
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
