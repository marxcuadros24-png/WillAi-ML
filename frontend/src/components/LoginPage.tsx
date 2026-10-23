import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Flame, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin12345');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirigir si ya está autenticado
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/panel';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(username, password);
      const from = (location.state as any)?.from?.pathname || '/panel';
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const autofillDemo = () => {
    setUsername('admin');
    setPassword('admin12345');
    setErrorMsg(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.95) 60%, #030712 100%)',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px'
      }}
    >
      {/* Elementos decorativos de fondo táctico */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '20%',
          width: '500px',
          height: '500px',
          background: 'rgba(249, 115, 22, 0.08)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '20%',
          width: '500px',
          height: '500px',
          background: 'rgba(56, 189, 248, 0.06)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(239, 68, 68, 0.12)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Cabecera con Logo Institucional */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #ea580c 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
              marginBottom: '14px'
            }}
          >
            <Flame size={36} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            WillAI • CENTRO DE MANDO
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Sistema de Alerta Temprana de Incendios Forestales
            <br />
            <strong style={{ color: '#cbd5e1' }}>Coracora • Parinacochas • Ayacucho</strong>
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="admin-form-label" style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
              <span>Usuario o Correo Institucional</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Operador / Admin</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                className="admin-input"
                style={{ paddingLeft: '38px', height: '44px', fontSize: '14px' }}
                placeholder="ej. admin o admin@willai.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '14px', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="admin-form-label" style={{ color: '#cbd5e1' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="admin-input"
                style={{ paddingLeft: '38px', paddingRight: '40px', height: '44px', fontSize: '14px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '14px', pointerEvents: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-admin btn-admin-primary"
            disabled={loading}
            style={{
              height: '46px',
              fontSize: '14px',
              fontWeight: 800,
              justifyContent: 'center',
              marginTop: '6px',
              boxShadow: '0 4px 18px rgba(239, 68, 68, 0.4)'
            }}
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>Acceder al Centro de Mando</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Acceso rápido de demostración */}
        <div style={{ marginTop: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={autofillDemo}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={14} />
            <span>Usar credenciales por defecto (admin / admin12345)</span>
          </button>
        </div>

        {/* Pie institucional */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={12} color="#10b981" />
            NASA FIRMS (VIIRS + MODIS)
          </span>
          <span>•</span>
          <span>SERFOR Perú</span>
          <span>•</span>
          <span>Open-Meteo</span>
        </div>
      </div>
    </div>
  );
};
