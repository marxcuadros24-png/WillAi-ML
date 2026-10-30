import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { loginApi } from '../services/api';
import { registrarNotificacionesPush } from '../services/notifications';

const KEY_AUTH_TOKEN = 'willai_auth_token';
const KEY_USER_DATA = 'willai_user_data';

export interface UserProfile {
  id_usuario: number;
  uuid: string;
  username: string;
  nombre_visible?: string;
  roles?: Array<{ codigo: string; nombre: string }>;
  idioma_preferido?: 'es' | 'qu';
}

interface AuthState {
  token: string | null;
  usuario: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rolActivo: 'comunero' | 'brigadista';

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  cargarSesionGuardada: () => Promise<void>;
  actualizarUsuario: (datos: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  usuario: null,
  isAuthenticated: false,
  isLoading: true,
  rolActivo: 'comunero',

  cargarSesionGuardada: async () => {
    try {
      const token = await SecureStore.getItemAsync(KEY_AUTH_TOKEN);
      const userJson = await SecureStore.getItemAsync(KEY_USER_DATA);

      if (token && userJson) {
        const usuario: UserProfile = JSON.parse(userJson);
        const esBrig = usuario.roles?.some((r) => r.codigo === 'brigadista') ?? false;

        set({
          token,
          usuario,
          isAuthenticated: true,
          rolActivo: esBrig ? 'brigadista' : 'comunero',
          isLoading: false
        });

        // Registrar notificaciones push
        registrarNotificacionesPush(token).catch(() => {});
        return;
      }
    } catch {
      // Ignorar fallo de almacenamiento
    }

    set({ isLoading: false });
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await loginApi(username, password);
      const esBrig = res.usuario.roles?.some((r) => r.codigo === 'brigadista') ?? false;

      await SecureStore.setItemAsync(KEY_AUTH_TOKEN, res.token).catch(() => {});
      await SecureStore.setItemAsync(KEY_USER_DATA, JSON.stringify(res.usuario)).catch(() => {});

      set({
        token: res.token,
        usuario: res.usuario,
        isAuthenticated: true,
        rolActivo: esBrig ? 'brigadista' : 'comunero',
        isLoading: false
      });

      // Registrar token push en Django
      registrarNotificacionesPush(res.token).catch(() => {});
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(KEY_AUTH_TOKEN).catch(() => {});
    await SecureStore.deleteItemAsync(KEY_USER_DATA).catch(() => {});
    set({
      token: null,
      usuario: null,
      isAuthenticated: false,
      rolActivo: 'comunero'
    });
  },

  actualizarUsuario: (datos: Partial<UserProfile>) => {
    const actual = get().usuario;
    if (actual) {
      const nuevo = { ...actual, ...datos };
      set({ usuario: nuevo });
      SecureStore.setItemAsync(KEY_USER_DATA, JSON.stringify(nuevo)).catch(() => {});
    }
  }
}));

