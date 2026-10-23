import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UsuarioAuth } from '../types';
import { loginApi, logoutApi } from '../services/api';

interface AuthContextType {
  user: UsuarioAuth | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'willai_auth_user';
const STORAGE_KEY_TOKEN = 'willai_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioAuth | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (e) {
      console.warn('Error al restaurar sesión previa:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await loginApi(username, pass);
    if (res.success && res.user) {
      setUser(res.user);
      setToken(res.token || 'session_active');
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));
      localStorage.setItem(STORAGE_KEY_TOKEN, res.token || 'session_active');
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};
