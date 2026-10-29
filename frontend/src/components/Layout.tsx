import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map as MapIcon,
  Flame,
  CheckCircle2,
  Users,
  Megaphone,
  HeartHandshake,
  Satellite,
  LogOut,
  Clock,
  RefreshCw,
  CloudRain,
  Radio,
  ChevronRight,
  PlusCircle,
  Shield,
  ShieldAlert,
  Home,
  Menu,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppContextType } from '../context/AppContext';

interface LayoutProps {
  context: AppContextType;
}

export const Layout: React.FC<LayoutProps> = ({ context }) => {
  const {
    metricas,
    fwi,
    incidentes,
    reportes,
    brigadas,
    loadAllData: onRefreshData,
    onOpenCreateIncident,
    onOpenAlertModal
  } = context;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Reloj en tiempo real (Coracora / Perú UTC-5)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' PET'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('¿Desea cerrar la sesión del Centro de Mando Táctico?')) {
      await logout();
      navigate('/login');
    }
  };

  const incidentesCount = metricas?.incidentes_activos ?? incidentes.filter(i => i.estado !== 'cerrado').length;
  const reportesCount = metricas?.reportes_pendientes ?? reportes.filter(r => r.estado === 'recibido').length;
  const esLluvia = fwi.precipitacion > 0 || fwi.humedad_relativa >= 75;

  // Breadcrumbs title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/panel':
        return 'Panel Principal Ejecutivo';
      case '/mapa':
        return 'Centro de Mando Táctico en Vivo';
      case '/incidentes':
        return 'Gestión de Incidentes & Despacho';
      case '/reportes':
        return 'Bandeja de Reportes Ciudadanos';
      case '/brigadas':
        return 'Gestión de Brigadas & Dotación Operativa';
      case '/viviendas':
        return 'Padrón de Viviendas Rurales Vulnerables';
      case '/usuarios':
        return 'Gestión de Usuarios & Personal';
      case '/logros':
        return 'Cuadro de Honor & Logros Comunitarios';
      case '/alertas':
        return 'Emisión y Monitoreo de Alertas';
      case '/donaciones':
        return 'Moderación de Donaciones Comunitarias';
      case '/satelites':
        return 'Sincronización NASA FIRMS & SERFOR';
      default:
        return 'Centro de Operaciones';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-app)', color: '#ffffff', overflowX: 'hidden' }}>
      {/* ========================================================
          SIDEBAR MODULAR PERSISTENTE
         ======================================================== */}
      <aside
        style={{
          width: sidebarOpen ? '270px' : '78px',
          background: 'var(--panel-bg-dark)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 100,
          flexShrink: 0
        }}
      >
        {/* Top: Branding & Switch */}
        <div>
          <div
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            {sidebarOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                    flexShrink: 0
                  }}
                >
                  <Flame size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-0.02em', color: '#ffffff' }}>
                    WillAI
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    CENTRO DE MANDO
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                <Flame size={20} color="#ffffff" />
              </div>
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: sidebarOpen ? 'block' : 'none'
              }}
              title={sidebarOpen ? 'Colapsar barra lateral' : 'Expandir barra lateral'}
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Navegación Seccionada */}
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sidebarOpen && (
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '0 8px 6px 8px' }}>
                OPERACIONES TÁCTICAS
              </div>
            )}

            <NavLink
              to="/panel"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Panel Principal Ejecutivo"
            >
              <LayoutDashboard size={18} />
              {sidebarOpen && <span>Panel Principal</span>}
            </NavLink>

            <NavLink
              to="/mapa"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Centro de Mando Táctico"
            >
              <MapIcon size={18} />
              {sidebarOpen && <span>Mapa Táctico en Vivo</span>}
            </NavLink>

            <button
              onClick={() => {
                context.setSidebarTab('riesgo');
                context.setShowRiesgoOcurrencia(true);
                navigate('/mapa');
              }}
              className="sidebar-nav-item"
              style={{
                background: location.pathname === '/mapa' && context.sidebarTab === 'riesgo' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                border: location.pathname === '/mapa' && context.sidebarTab === 'riesgo' ? '1px solid rgba(245, 158, 11, 0.35)' : 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                marginTop: '2px',
                marginBottom: '4px'
              }}
              title="Módulo de Machine Learning: Riesgo de Ocurrencia"
            >
              <ShieldAlert size={18} color="#f59e0b" />
              {sidebarOpen && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Riesgo ML (72)</span>
                  <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    AI
                  </span>
                </div>
              )}
            </button>

            <NavLink
              to="/incidentes"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Incidentes Operacionales"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <Flame size={18} />
                {sidebarOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>Incidentes</span>
                    {incidentesCount > 0 && (
                      <span className="badge badge-red" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {incidentesCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </NavLink>

            <NavLink
              to="/reportes"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Reportes de Pobladores"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <CheckCircle2 size={18} />
                {sidebarOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>Reportes Ciudadanos</span>
                    {reportesCount > 0 && (
                      <span className="badge badge-yellow" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {reportesCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </NavLink>

            <NavLink
              to="/brigadas"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Brigadas de Respuesta & Dotación"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <Shield size={18} />
                {sidebarOpen && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span>Brigadas & Dotación</span>
                    {brigadas.length > 0 && (
                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          background: 'rgba(6, 182, 212, 0.2)',
                          color: '#06b6d4',
                          border: '1px solid rgba(6, 182, 212, 0.4)'
                        }}
                      >
                        {brigadas.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </NavLink>

            {sidebarOpen && (
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '16px 8px 6px 8px' }}>
                ADMINISTRACIÓN & SOPORTE
              </div>
            )}

            <NavLink
              to="/usuarios"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Gestión de Usuarios y Brigadas"
            >
              <Users size={18} />
              {sidebarOpen && <span>Usuarios & Personal</span>}
            </NavLink>

            <NavLink
              to="/logros"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Cuadro de Honor y Logros Comunitarios"
            >
              <Award size={18} />
              {sidebarOpen && <span>Cuadro de Honor</span>}
            </NavLink>

            <NavLink
              to="/viviendas"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Padrón de Viviendas Rurales"
            >
              <Home size={18} />
              {sidebarOpen && <span>Viviendas Rurales</span>}
            </NavLink>

            <NavLink
              to="/alertas"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Alertas de Emergencia"
            >
              <Megaphone size={18} />
              {sidebarOpen && <span>Alertas de Evacuación</span>}
            </NavLink>

            <NavLink
              to="/donaciones"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Donaciones Comunitarias"
            >
              <HeartHandshake size={18} />
              {sidebarOpen && <span>Donaciones</span>}
            </NavLink>

            <NavLink
              to="/satelites"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Sincronización Satelital"
            >
              <Satellite size={18} />
              {sidebarOpen && <span>Satélites & Sync</span>}
            </NavLink>
          </div>
        </div>

        {/* Bottom: Estado de Fuentes & Perfil de Usuario */}
        <div>
          {sidebarOpen && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Radio size={12} color="#10b981" />
                    NASA FIRMS VIIRS/MODIS
                  </span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>ONLINE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CloudRain size={12} color="#38bdf8" />
                    Open-Meteo Coracora
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>ONLINE</span>
                </div>
              </div>
            </div>
          )}

          {/* User Card */}
          <div
            style={{
              padding: '14px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  flexShrink: 0
                }}
              >
                {(user?.nombre || user?.username || 'A').charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user?.nombre || user?.username}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {user?.is_superuser ? 'Superadministrador' : (user?.roles?.[0] || 'Operador COEP')}
                  </div>
                </div>
              )}
            </div>

            {sidebarOpen && (
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f87171',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================
          CONTENEDOR PRINCIPAL (TOPBAR + CONTENIDO ESPACIOSO)
         ======================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Top Header Barra Superior */}
        <header
          style={{
            height: '64px',
            background: 'rgba(15, 23, 42, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            flexShrink: 0
          }}
        >
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-muted)' }}>WillAI</span>
            <ChevronRight size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '15.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {getPageTitle()}
            </span>
          </div>

          {/* Monitor Resumen & Acciones de Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Pill Meteorológica en Vivo (Categoría / Estado) */}
            <div
              style={{
                background: esLluvia ? 'rgba(56, 189, 248, 0.12)' : 'rgba(239, 68, 68, 0.14)',
                border: esLluvia ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
                padding: '5px 14px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span style={{ color: esLluvia ? '#38bdf8' : '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                {esLluvia ? <CloudRain size={13} color="#38bdf8" /> : <Flame size={13} color="#f87171" />}
                {esLluvia ? 'Lluvia Activa' : 'Riesgo'} {fwi.nivel_peligro.toUpperCase()}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{fwi.temperatura}°C</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{fwi.humedad_relativa}% Hum</span>
              {fwi.precipitacion > 0 && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{fwi.precipitacion} mm</span>
                </>
              )}
            </div>

            {/* Reloj en Vivo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <Clock size={15} />
              <span>{currentTime}</span>
            </div>

            {/* Botón de Refresco Global */}
            <button
              className="btn-admin btn-admin-outline"
              style={{ padding: '7px 12px', fontSize: '0.84rem' }}
              onClick={onRefreshData}
              title="Refrescar todos los datos en caliente"
            >
              <RefreshCw size={14} />
              <span>Sync</span>
            </button>

            {/* Acciones Rápidas */}
            <button
              className="btn-admin btn-admin-primary"
              style={{ padding: '7px 14px', fontSize: '0.84rem' }}
              onClick={onOpenCreateIncident}
            >
              <PlusCircle size={15} />
              <span>Nuevo Incidente</span>
            </button>

            <button
              className="btn-admin btn-admin-danger"
              style={{ padding: '7px 14px', fontSize: '0.84rem' }}
              onClick={onOpenAlertModal}
            >
              <ShieldAlert size={15} />
              <span>Emitir Alerta</span>
            </button>
          </div>
        </header>

        {/* Área de Contenido Principal (Espaciosa, Sin Apreturas) */}
        <main
          style={{
            flex: 1,
            padding: location.pathname === '/mapa' ? '0' : '28px 36px',
            maxWidth: location.pathname === '/mapa' ? '100%' : '1600px',
            margin: location.pathname === '/mapa' ? '0' : '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
};
