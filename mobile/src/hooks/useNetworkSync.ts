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

    // Suscribirse a cambios de red con NetInfo
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const conectado = Boolean(state.isConnected && state.isInternetReachable !== false);
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

