import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { DICCIONARIO, Idioma, Translations } from './translations';
import { API_BASE } from '../constants/config';

const STORAGE_KEY_LANG = 'willai_lang_pref';

interface TranslationState {
  idioma: Idioma;
  setIdioma: (idioma: Idioma, token?: string | null) => Promise<void>;
  cargarIdiomaGuardado: () => Promise<void>;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
}

export const useTranslation = create<TranslationState>((set, get) => ({
  idioma: 'es',

  cargarIdiomaGuardado: async () => {
    try {
      const guardado = await SecureStore.getItemAsync(STORAGE_KEY_LANG);
      if (guardado === 'es' || guardado === 'qu') {
        set({ idioma: guardado });
      }
    } catch {
      // Ignorar fallo de SecureStore en emulador y usar 'es' por defecto
    }
  },

  setIdioma: async (nuevoIdioma: Idioma, token?: string | null) => {
    set({ idioma: nuevoIdioma });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_LANG, nuevoIdioma);
    } catch {
      // Continuar aunque falle SecureStore
    }

    // Sincronizar en segundo plano con el backend Django si hay token
    if (token) {
      try {
        fetch(`${API_BASE}/usuarios/usuarios/me/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`
          },
          body: JSON.stringify({ idioma_preferido: nuevoIdioma })
        }).catch(() => {});
      } catch {
        // Silencioso: offline first no bloquea si falla la red
      }
    }
  },

  t: (key: keyof Translations, params?: Record<string, string | number>) => {
    const currentLang = get().idioma;
    let text = DICCIONARIO[currentLang]?.[key] || DICCIONARIO.es[key] || String(key);

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return text;
  }
}));

