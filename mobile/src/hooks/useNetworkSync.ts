import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { contarReportesPendientes, sincronizarColaOffline } from '../db/offlineQueue';
import { useAuthStore } from '../stores/authStore';

export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const token = useAuthStore((s) => s.token);
  const wasOfflineRef = useRef<boolean>(false);

  const refrescarContador = useCallback(() => {
    const c = contarReportesPendientes();
    setPendingCount(c);
  }, []);

  const forzarSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await sincronizarColaOffline(token);
    } finally {
      refrescarContador();
      setSyncing(false);
    }
  }, [token, syncing, refrescarContador]);

  useEffect(() => {
    // Inicializar contador
    refrescarContador();

    // Comprobar estado de red inicial al abrir la app y sincronizar cola pendiente
    NetInfo.fetch().then((state) => {
      const conectado = Boolean(state.isConnected);
      setIsOnline(conectado);
      if (conectado) {
        const count = contarReportesPendientes();
        if (count > 0) {
          forzarSync();
        }
      }
      wasOfflineRef.current = !conectado;
    });

    // Suscribirse a cambios continuos de red con NetInfo
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const conectado = Boolean(state.isConnected);
      setIsOnline(conectado);

      // Si antes estábamos offline y ahora hay señal, sincronizar automáticamente
      if (conectado && wasOfflineRef.current) {
        forzarSync();
      }

      wasOfflineRef.current = !conectado;
    });

    return () => {
      unsubscribe();
    };
  }, [refrescarContador, forzarSync]);

  return {
    isOnline,
    pendingCount,
    syncing,
    refrescarContador,
    forzarSync
  };
}

