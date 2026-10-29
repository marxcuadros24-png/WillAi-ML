import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Trophy,
  Flame,
  Trees,
  ShieldCheck,
  Users,
  Zap,
  Crosshair,
  HeartHandshake,
  Crown,
  Search,
  Filter,
  RefreshCw,
  X,
  CheckCircle,
  MapPin,
  Sparkles,
  Star,
  Activity,
  CheckCircle2,
  Clock,
  Check,
  RotateCcw
} from 'lucide-react';
import type { CuadroHonorData } from '../types';
import { fetchCuadroHonor, otorgarInsigniaManual, fetchUsuarios } from '../services/api';
import { Pagination } from './Pagination';

// Helper para renderizar el icono correspondiente según el código o icono_url
const renderBadgeIcon = (iconName?: string | null, size = 18, color = '#f59e0b') => {
  const safe = String(iconName || '').toLowerCase().trim();
  switch (safe) {
    case 'flame':
    case 'primer_aviso':
      return <Flame size={size} color={color} />;
    case 'trees':
    case 'guardian_bosque':
      return <Trees size={size} color={color} />;
    case 'shield-check':
    case 'shieldcheck':
    case 'vigilante_comunal':
      return <ShieldCheck size={size} color={color} />;
    case 'users':
    case 'comunidad_preparada':
      return <Users size={size} color={color} />;
    case 'zap':
    case 'respuesta_rapida':
      return <Zap size={size} color={color} />;
    case 'crosshair':
    case 'ojo_halcon':
      return <Crosshair size={size} color={color} />;
    case 'heart-handshake':
    case 'hearthandshake':
    case 'solidario_comunal':
      return <HeartHandshake size={size} color={color} />;
    case 'crown':
    case 'heroe_parinacochas':
      return <Crown size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

export const LogrosAdmin: React.FC = () => {
  const [data, setData] = useState<CuadroHonorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ranking' | 'catalogo' | 'muro'>('ranking');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [comunidadFilter, setComunidadFilter] = useState<string>('todas');
  const [rangoFilter, setRangoFilter] = useState<string>('todos');

  // Paginación del Ranking
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Paginación y filtro del Muro de Reconocimientos
  const [muroCurrentPage, setMuroCurrentPage] = useState<number>(1);
  const [muroPageSize, setMuroPageSize] = useState<number>(8);
  const [muroSearch, setMuroSearch] = useState<string>('');

  // Usuario recién actualizado para efecto visual de resaltado
  const [highlightedUserId, setHighlightedUserId] = useState<number | null>(null);

  // Modal para otorgar insignia
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalUsuarioId, setModalUsuarioId] = useState<number | ''>('');
  const [modalInsigniaCodigo, setModalInsigniaCodigo] = useState<string>('');
  const [modalMotivo, setModalMotivo] = useState<string>('');
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await fetchCuadroHonor();
      setData(res);
    } catch (err) {
      console.error('Error al cargar Cuadro de Honor:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuariosSistema = async () => {
    try {
      const uRes = await fetchUsuarios();
      setUsuariosDisponibles(uRes.usuarios || []);
    } catch (err) {
      console.warn('Error al precargar usuarios del sistema:', err);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarUsuariosSistema();
  }, []);

  // Cargar lista de usuarios al abrir el modal para otorgar insignia
  const handleOpenModal = (preselectedUserId?: number) => {
    setIsModalOpen(true);
    if (preselectedUserId) {
      setModalUsuarioId(preselectedUserId);
    } else {
      setModalUsuarioId('');
    }
    setModalInsigniaCodigo('');
    setModalMotivo('Reconocimiento honorífico por destacada labor y vigilancia comunal ante incendios en Parinacochas.');
  };

  // Buscar información del usuario seleccionado en el modal
  const selectedUserRankingData = useMemo(() => {
    if (!modalUsuarioId || !data?.ranking) return null;
    return data.ranking.find((r) => r.id_usuario === Number(modalUsuarioId)) || null;
  }, [modalUsuarioId, data?.ranking]);

  // Lista de códigos de insignias que ya tiene el usuario seleccionado
  const selectedUserBadgesCodes = useMemo(() => {
    if (!selectedUserRankingData) return new Set<string>();
    return new Set(selectedUserRankingData.insignias.map((i) => i.codigo));
  }, [selectedUserRankingData]);

  // Manejo de envío del formulario de distinción
  const handleOtorgar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUsuarioId || !modalInsigniaCodigo) {
      alert('Por favor seleccione el colaborador y la insignia a otorgar.');
      return;
    }

    const userIdNum = Number(modalUsuarioId);
    setSubmitting(true);
    try {
      const resp = await otorgarInsigniaManual({
        id_usuario: userIdNum,
        codigo_insignia: modalInsigniaCodigo,
        motivo: modalMotivo
      });

      setNotification({
        tipo: 'success',
        mensaje: resp.mensaje || '¡Insignia otorgada exitosamente con suma de puntos!'
      });
      setIsModalOpen(false);

      // Recargar datos frescos del backend sin caché
      await cargarDatos();

      // Cambiar a pestaña de ranking y resaltar al usuario actualizado
      setActiveTab('ranking');
      setSearchTerm('');
      setComunidadFilter('todas');
      setRangoFilter('todos');
      setHighlightedUserId(userIdNum);

      // Quitar resaltado tras 6 segundos
      setTimeout(() => {
        setHighlightedUserId(null);
      }, 6000);

      // Quitar notificación tras 5 segundos
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error al otorgar la insignia.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado de colaboradores en Ranking
  const filteredRanking = useMemo(() => {
    if (!data?.ranking) return [];
    return data.ranking.filter((item) => {
      const matchSearch =
        item.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.comunidad.toLowerCase().includes(searchTerm.toLowerCase());

      const matchComunidad =
        comunidadFilter === 'todas' || item.comunidad.toLowerCase() === comunidadFilter.toLowerCase();

      const matchRango =
        rangoFilter === 'todos' || item.rango_honor.toLowerCase().includes(rangoFilter.toLowerCase());

      return matchSearch && matchComunidad && matchRango;
    });
  }, [data?.ranking, searchTerm, comunidadFilter, rangoFilter]);

  // Lista única de comunidades para el selector de filtro
  const comunidadesUnicas = useMemo(() => {
    if (!data?.ranking) return [];
    const set = new Set<string>();
    data.ranking.forEach((r) => set.add(r.comunidad));
    return Array.from(set).sort();
  }, [data?.ranking]);

  // Paginación del ranking
  const totalItems = filteredRanking.length;
  const paginatedRanking = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRanking.slice(start, start + pageSize);
  }, [filteredRanking, currentPage, pageSize]);

  // Filtrado y Paginación del Muro de Reconocimientos
  const filteredMuro = useMemo(() => {
    if (!data?.muro_reciente) return [];
    if (!muroSearch.trim()) return data.muro_reciente;
    const term = muroSearch.toLowerCase();
    return data.muro_reciente.filter(
      (m) =>
        m.usuario_nombre.toLowerCase().includes(term) ||
        m.insignia_nombre.toLowerCase().includes(term) ||
        m.otorgada_por.toLowerCase().includes(term) ||
        (m.motivo && m.motivo.toLowerCase().includes(term))
    );
  }, [data?.muro_reciente, muroSearch]);

  const totalMuroItems = filteredMuro.length;
  const paginatedMuro = useMemo(() => {
    const start = (muroCurrentPage - 1) * muroPageSize;
    return filteredMuro.slice(start, start + muroPageSize);
  }, [filteredMuro, muroCurrentPage, muroPageSize]);

  // Top 3 del ranking para el podio
  const top1 = data?.ranking?.[0];
  const top2 = data?.ranking?.[1];
  const top3 = data?.ranking?.[2];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Toast de notificación flotante */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '28px',
            background: notification.tipo === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${notification.tipo === 'success' ? '#10b981' : '#ef4444'}`,
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 99999,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <CheckCircle size={22} color="#a7f3d0" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800 }}>¡Operación Confirmada!</div>
            <div style={{ fontSize: '12.5px', color: '#d1fae5', marginTop: '2px' }}>{notification.mensaje}</div>
          </div>
        </div>
      )}

      {/* ========================================================
          ENCABEZADO DE LA SECCIÓN
         ======================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Trophy size={22} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Cuadro de Honor & Logros Comunitarios
            </h1>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
            Reconocimiento cívico, insignias honoríficas y méritos para pobladores, vigilantes comunales y brigadistas que protegen Parinacochas con WillAI.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="btn-admin btn-admin-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px' }}
            title="Sincronizar puntajes y reconocimientos con la base de datos"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="btn-admin btn-admin-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              borderColor: '#f59e0b'
            }}
          >
            <Sparkles size={16} />
            <span>Otorgar Insignia Manual</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          KPI CARDS METRICAS GLOBALES
         ======================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}
      >
        {/* KPI 1 */}
        <div
          style={{
            background: 'var(--panel-bg-dark)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0
            }}
          >
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Voluntarios Reconocidos
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
              {loading ? '...' : (data?.estadisticas?.total_voluntarios_reconocidos ?? 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
              Padrón cívico activo en Parinacochas
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            background: 'var(--panel-bg-dark)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Insignias Otorgadas
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
              {loading ? '...' : (data?.estadisticas?.total_insignias_otorgadas ?? 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
              8 categorías de mérito comunal
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            background: 'var(--panel-bg-dark)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Acciones Validadas
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
              {loading ? '...' : (data?.estadisticas?.total_actividades_validadas ?? 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              Vigilancia, faenas y primeros avisos
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            background: 'var(--panel-bg-dark)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              flexShrink: 0
            }}
          >
            <MapPin size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Comunidad Destacada
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', marginTop: '4px' }}>
              {loading ? '...' : (data?.estadisticas?.comunidad_mas_comprometida || 'Coracora')}
            </div>
            <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
              Mayor densidad de participación cívica
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          PODIO DE HONOR TÁCTICO (TOP 3)
         ======================================================== */}
      {top1 && (
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '28px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Podio de Honor Comunal
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Actualizado en tiempo real con algoritmos de mérito cívico WillAI
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'flex-end'
            }}
          >
            {/* 2do Lugar (Plata) */}
            {top2 && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    background: '#94a3b8',
                    color: '#0f172a',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 8px rgba(148, 163, 184, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trophy size={12} color="#0f172a" /> 2° PUESTO
                </div>

                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(148, 163, 184, 0.15)',
                    border: '2px solid #94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#e2e8f0',
                    margin: '12px 0 10px 0'
                  }}
                >
                  {top2.nombre_completo.charAt(0)}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{top2.nombre_completo}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  @{top2.username} • {top2.comunidad}
                </div>

                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '14px'
                  }}
                >
                  {top2.rango_honor}
                </div>

                <div style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8' }}>
                  {top2.puntos_totales}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {top2.insignias.slice(0, 4).map((ins) => (
                    <div
                      key={ins.id_insignia}
                      title={`${ins.nombre} - ${ins.descripcion}`}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {renderBadgeIcon(ins.icono_url, 15, '#38bdf8')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1er Lugar (Oro - Destacado al Centro) */}
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.02) 100%)',
                border: '2px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '16px',
                padding: '30px 22px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 8px 30px rgba(245, 158, 11, 0.15)',
                transform: 'translateY(-8px)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-15px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0f172a',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Crown size={13} color="#0f172a" /> 1° PUESTO — GRAN LÍDER
              </div>

              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '3px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  fontWeight: 900,
                  color: '#fef08a',
                  margin: '14px 0 10px 0',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
                }}
              >
                {top1.nombre_completo.charAt(0)}
              </div>

              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>{top1.nombre_completo}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                @{top1.username} • Comunidad {top1.comunidad}
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fef08a',
                  padding: '4px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Crown size={13} color="#fef08a" /> {top1.rango_honor}
              </div>

              <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b' }}>
                {top1.puntos_totales}{' '}
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {top1.insignias.map((ins) => (
                  <div
                    key={ins.id_insignia}
                    title={`${ins.nombre} - ${ins.descripcion}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {renderBadgeIcon(ins.icono_url, 17, '#f59e0b')}
                  </div>
                ))}
              </div>
            </div>

            {/* 3er Lugar (Bronce) */}
            {top3 && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    background: '#d97706',
                    color: '#ffffff',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Award size={12} color="#ffffff" /> 3° PUESTO
                </div>

                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(217, 119, 6, 0.15)',
                    border: '2px solid #d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#fef3c7',
                    margin: '12px 0 10px 0'
                  }}
                >
                  {top3.nombre_completo.charAt(0)}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{top3.nombre_completo}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  @{top3.username} • {top3.comunidad}
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '14px'
                  }}
                >
                  {top3.rango_honor}
                </div>

                <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>
                  {top3.puntos_totales}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {top3.insignias.slice(0, 4).map((ins) => (
                    <div
                      key={ins.id_insignia}
                      title={`${ins.nombre} - ${ins.descripcion}`}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {renderBadgeIcon(ins.icono_url, 15, '#d97706')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑAS DE NAVEGACIÓN: RANKING / CATÁLOGO / MURO
         ======================================================== */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px'
        }}
      >
        <button
          onClick={() => setActiveTab('ranking')}
          style={{
            background: activeTab === 'ranking' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
            border: activeTab === 'ranking' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
            color: activeTab === 'ranking' ? '#f59e0b' : 'var(--text-muted)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Trophy size={16} />
          <span>Ranking de Colaboradores ({filteredRanking.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('catalogo')}
          style={{
            background: activeTab === 'catalogo' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
            border: activeTab === 'catalogo' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
            color: activeTab === 'catalogo' ? '#38bdf8' : 'var(--text-muted)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Award size={16} />
          <span>Catálogo de Insignias ({data?.catalogo_insignias?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('muro')}
          style={{
            background: activeTab === 'muro' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
            border: activeTab === 'muro' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            color: activeTab === 'muro' ? '#10b981' : 'var(--text-muted)',
            padding: '8px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Activity size={16} />
          <span>Muro de Reconocimientos ({totalMuroItems})</span>
        </button>
      </div>

      {/* ========================================================
          CONTENIDO: PESTAÑA 1 - RANKING DE COLABORADORES
         ======================================================== */}
      {activeTab === 'ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtros y Búsqueda */}
          <div
            style={{
              background: 'var(--panel-bg-dark)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            {/* Buscador */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Buscar por colaborador, usuario o comunidad..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="admin-input"
                style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Filtro por Comunidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="admin-select"
                value={comunidadFilter}
                onChange={(e) => {
                  setComunidadFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todas">Todas las Comunidades</option>
                {comunidadesUnicas.map((com) => (
                  <option key={com} value={com}>
                    {com}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Rango Honorífico */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="admin-select"
                value={rangoFilter}
                onChange={(e) => {
                  setRangoFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los Rangos</option>
                <option value="Centinela">Centinela Mayor (Oro)</option>
                <option value="Guardián">Guardián del Fuego (Celeste)</option>
                <option value="Vigilante">Vigilante Comunal (Verde)</option>
                <option value="Colaborador">Colaborador Voluntario</option>
              </select>
            </div>
          </div>

          {/* Tabla de Ranking */}
          <div
            style={{
              background: 'var(--panel-bg-dark)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ width: '70px', textAlign: 'center' }}>POS</th>
                    <th>COLABORADOR</th>
                    <th>COMUNIDAD</th>
                    <th>RANGO HONORÍFICO</th>
                    <th style={{ textAlign: 'center' }}>INSIGNIAS</th>
                    <th style={{ textAlign: 'center' }}>REPORTES</th>
                    <th style={{ textAlign: 'center' }}>FAENAS</th>
                    <th style={{ textAlign: 'right' }}>PUNTOS TOTALES</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRanking.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No se encontraron colaboradores con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedRanking.map((colab) => {
                      const isHighlighted = highlightedUserId === colab.id_usuario;
                      return (
                        <tr
                          key={colab.id_usuario}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            transition: 'all 0.3s ease-in-out',
                            background: isHighlighted ? 'rgba(245, 158, 11, 0.16)' : undefined,
                            boxShadow: isHighlighted ? 'inset 0 0 12px rgba(245, 158, 11, 0.3)' : undefined
                          }}
                        >
                          {/* Posición con medalla */}
                          <td style={{ textAlign: 'center' }}>
                            {colab.posicion === 1 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={18} color="#f59e0b" />
                              </span>
                            ) : colab.posicion === 2 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={18} color="#94a3b8" />
                              </span>
                            ) : colab.posicion === 3 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Award size={18} color="#d97706" />
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '26px',
                                  height: '26px',
                                  lineHeight: '26px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)'
                                }}
                              >
                                {colab.posicion}
                              </span>
                            )}
                          </td>

                          {/* Nombre y datos */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: `1px solid ${colab.badge_color}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '13px',
                                  color: colab.badge_color,
                                  flexShrink: 0
                                }}
                              >
                                {colab.nombre_completo.charAt(0)}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '13.5px' }}>
                                    {colab.nombre_completo}
                                  </span>
                                  {isHighlighted && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        background: '#f59e0b',
                                        color: '#0f172a',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 900,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Sparkles size={10} color="#0f172a" /> ACTUALIZADO
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  @{colab.username} • {colab.roles.join(', ')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Comunidad */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={13} color="var(--text-muted)" />
                              <span style={{ fontWeight: 600, fontSize: '13px', color: '#e2e8f0' }}>
                                {colab.comunidad}
                              </span>
                            </div>
                          </td>

                          {/* Rango */}
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 9px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: `${colab.badge_color}18`,
                                color: colab.badge_color,
                                border: `1px solid ${colab.badge_color}40`
                              }}
                            >
                              <Star size={11} />
                              {colab.rango_honor}
                            </span>
                          </td>

                          {/* Insignias miniatura */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {colab.insignias.slice(0, 3).map((ins) => (
                                <div
                                  key={ins.id_insignia}
                                  title={`${ins.nombre}: ${ins.descripcion}`}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {renderBadgeIcon(ins.icono_url, 13, colab.badge_color)}
                                </div>
                              ))}
                              {colab.insignias_count > 3 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: 'var(--text-muted)',
                                    alignSelf: 'center'
                                  }}
                                >
                                  +{colab.insignias_count - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Reportes validados */}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0' }}>
                            {colab.reportes_validados_count}
                          </td>

                          {/* Actividades validadas */}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#e2e8f0' }}>
                            {colab.actividades_count}
                          </td>

                          {/* Puntos totales */}
                          <td style={{ textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: '16px',
                                fontWeight: 900,
                                color: colab.badge_color,
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              {colab.puntos_totales}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '3px' }}>pts</span>
                          </td>

                          {/* Acciones */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenModal(colab.id_usuario)}
                              className="btn-admin btn-admin-outline"
                              style={{
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                              title="Otorgar insignia o reiteración de mérito a este colaborador"
                            >
                              <Sparkles size={13} color="#f59e0b" />
                              <span>Distinguir</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación Táctica del Ranking */}
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="colaboradores"
            />
          </div>
        </div>
      )}

      {/* ========================================================
          CONTENIDO: PESTAÑA 2 - CATÁLOGO DE INSIGNIAS
         ======================================================== */}
      {activeTab === 'catalogo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '18px'
            }}
          >
            {(data?.catalogo_insignias || []).map((ins) => (
              <div
                key={ins.id_insignia}
                style={{
                  background: 'var(--panel-bg-dark)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {renderBadgeIcon(ins.icono_url, 22, '#f59e0b')}
                    </div>
                    <span
                      style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fef08a',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 800
                      }}
                    >
                      +{ins.puntos} PTS
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
                    {ins.nombre}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.45', margin: '0 0 14px 0' }}>
                    {ins.descripcion}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Código: <code style={{ color: '#38bdf8' }}>{ins.codigo}</code>
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: ins.total_poseedores > 0 ? '#10b981' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Users size={12} />
                    {ins.total_poseedores} {ins.total_poseedores === 1 ? 'persona' : 'personas'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          CONTENIDO: PESTAÑA 3 - MURO DE RECONOCIMIENTOS RECIENTES (CON PAGINACIÓN)
         ======================================================== */}
      {activeTab === 'muro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtro y Buscador del Muro */}
          <div
            style={{
              background: 'var(--panel-bg-dark)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ position: 'relative', minWidth: '300px', flex: 1 }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Buscar en el muro por voluntario, insignia o quien otorgó..."
                value={muroSearch}
                onChange={(e) => {
                  setMuroSearch(e.target.value);
                  setMuroCurrentPage(1);
                }}
                className="admin-input"
                style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Total: <strong style={{ color: '#ffffff' }}>{totalMuroItems}</strong> reconocimientos registrados
              </span>
            </div>
          </div>

          {/* Tarjeta de Lista del Muro */}
          <div
            style={{
              background: 'var(--panel-bg-dark)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#38bdf8" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Línea de Tiempo de Méritos Comunitarios
                </h2>
              </div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Página {muroCurrentPage} de {Math.max(1, Math.ceil(totalMuroItems / muroPageSize))}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedMuro.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No se encontraron eventos o reconocimientos con los filtros actuales.
                </div>
              ) : (
                paginatedMuro.map((logro) => (
                  <div
                    key={logro.id_logro}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        {renderBadgeIcon(logro.insignia_icono, 22, '#f59e0b')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 800 }}>{logro.usuario_nombre}</span> recibió la condecoración{' '}
                          <strong style={{ color: '#fef08a' }}>«{logro.insignia_nombre}»</strong>
                        </div>

                        {logro.motivo && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#cbd5e1',
                              fontStyle: 'italic',
                              margin: '6px 0',
                              padding: '6px 12px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: '6px',
                              borderLeft: '2px solid #f59e0b'
                            }}
                          >
                            "{logro.motivo}"
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Concedido por: <strong style={{ color: '#e2e8f0' }}>{logro.otorgada_por}</strong> • {logro.desbloqueada_en}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12.5px',
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        alignSelf: 'center'
                      }}
                    >
                      +{logro.puntos} PTS
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación Táctica del Muro */}
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={muroCurrentPage}
                totalItems={totalMuroItems}
                pageSize={muroPageSize}
                onPageChange={setMuroCurrentPage}
                onPageSizeChange={(newSize) => {
                  setMuroPageSize(newSize);
                  setMuroCurrentPage(1);
                }}
                pageSizeOptions={[8, 16, 24, 50]}
                itemLabel="reconocimientos"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: OTORGAR INSIGNIA HONORÍFICA MANUALMENTE
         ======================================================== */}
      {isModalOpen && (
        <div className="modal active">
          <div className="modal-box" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#f59e0b" />
                <div>
                  <h3 className="modal-title" style={{ fontSize: '16.5px', color: '#ffffff', margin: 0 }}>
                    Otorgar Condecoración o Mérito Cívico
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                    Centro de Mando de Emergencias WillAI — Parinacochas
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOtorgar} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Seleccionar Colaborador */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  Colaborador a Distinguir *
                </label>
                <select
                  className="admin-select"
                  style={{ width: '100%' }}
                  value={modalUsuarioId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setModalUsuarioId(val);
                    setModalInsigniaCodigo('');
                  }}
                  required
                >
                  <option value="">-- Seleccione Colaborador --</option>
                  {(usuariosDisponibles.length > 0 ? usuariosDisponibles : data?.ranking || []).map((u: any) => {
                    const uid = u.id || u.id_usuario;
                    return (
                      <option key={uid} value={uid}>
                        {u.nombre || u.nombre_completo || u.username} (@{u.username})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Ficha Resumen del Colaborador Seleccionado */}
              {selectedUserRankingData && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Puntaje Actual:</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#f59e0b' }}>
                      {selectedUserRankingData.puntos_totales} pts (#{selectedUserRankingData.posicion})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rango Honorífico:</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: selectedUserRankingData.badge_color }}>
                      {selectedUserRankingData.rango_honor}
                    </span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Insignias en posesión ({selectedUserRankingData.insignias.length}):
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {selectedUserRankingData.insignias.map((ins) => (
                        <span
                          key={ins.id_insignia}
                          style={{
                            fontSize: '10.5px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#e2e8f0',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check size={10} color="#10b981" />
                          {ins.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seleccionar Insignia */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  Insignia o Distinción a Conceder *
                </label>
                <select
                  className="admin-select"
                  style={{ width: '100%' }}
                  value={modalInsigniaCodigo}
                  onChange={(e) => setModalInsigniaCodigo(e.target.value)}
                  required
                >
                  <option value="">-- Seleccione Insignia del Catálogo --</option>
                  {(data?.catalogo_insignias || []).map((ins) => {
                    const yaPosee = selectedUserBadgesCodes.has(ins.codigo);
                    return (
                      <option key={ins.codigo} value={ins.codigo}>
                        {yaPosee
                          ? `[Reiteración] ${ins.nombre} (+30 pts)`
                          : `[Nueva] ${ins.nombre} (+${ins.puntos + 30} pts)`}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Nota: Si el colaborador ya tiene la insignia, se le otorgará una <strong>reiteración de mérito (+30 pts)</strong> y se actualizará su presencia en el Muro.
                </div>
              </div>

              {/* Motivo o Dedicación */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  Motivo / Acta de Concesión Comunal
                </label>
                <textarea
                  className="admin-input"
                  style={{ width: '100%', minHeight: '80px', boxSizing: 'border-box' }}
                  value={modalMotivo}
                  onChange={(e) => setModalMotivo(e.target.value)}
                  placeholder="Describa el acto meritorio, faena comunitaria o combate de fuego..."
                />
              </div>

              {/* Footer acciones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-admin btn-admin-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-admin btn-admin-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                    borderColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RotateCcw size={14} className="spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Conceder Distinción</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
