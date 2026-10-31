import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { contarReportesPendientes, sincronizarColaOffline, purgarReportesAntiguos } from '../db/offlineQueue';
import { useAuthStore } from '../stores/authStore';

export function useNetworkSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const token = useAuthStore((s) => s.token);
  const wasOfflineRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  const refrescarContador = useCallback(() => {
    try {
      const c = contarReportesPendientes();
      setPendingCount(c);
      return c;
    } catch {
      return 0;
    }
  }, []);

  const forzarSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      await sincronizarColaOffline(token);
    } catch (e) {
      console.warn('[useNetworkSync] Error durante sincronización:', e);
    } finally {
      refrescarContador();
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [token, refrescarContador]);

  useEffect(() => {
    // 0. Purgar reportes antiguos completados o corruptos para no atascar la cola
    purgarReportesAntiguos();

    // 1. Inicializar contador
    refrescarContador();

    // 2. Comprobar estado de red inicial al abrir la app y sincronizar cola pendiente
    NetInfo.fetch().then((state) => {
      const conectado = Boolean(state.isConnected);
      setIsOnline(conectado);
      if (conectado) {
        const count = refrescarContador();
        if (count > 0) {
          forzarSync();
        }
      }
      wasOfflineRef.current = !conectado;
    });

    // 3. Suscribirse a cambios continuos de red con NetInfo
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const conectado = Boolean(state.isConnected);
      setIsOnline(conectado);

      // Si recuperamos señal, sincronizar automáticamente
      if (conectado && wasOfflineRef.current) {
        forzarSync();
      }

      wasOfflineRef.current = !conectado;
    });

    // 4. Temporizador periódico de sincronización automática en segundo plano (cada 12s)
    const timer = setInterval(() => {
      const count = refrescarContador();
      if (count > 0 && !isSyncingRef.current) {
        NetInfo.fetch().then((state) => {
          if (state.isConnected) {
            console.log('[useNetworkSync] Auto-sincronizando reportes pendientes en segundo plano...');
            forzarSync();
          }
        });
      }
    }, 12000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [refrescarContador, forzarSync]);

  const limpiarCola = useCallback(() => {
    purgarReportesAntiguos();
    refrescarContador();
  }, [refrescarContador]);

  return {
    isOnline,
    pendingCount,
    syncing,
    refrescarContador,
    forzarSync,
    limpiarCola
  };
}
