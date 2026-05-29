import { useEffect, useRef } from 'react';
import { useNetworkStore } from '../store/networkStore';

/**
 * Calls `refresh()` whenever the network is restored after being offline.
 * Use this in every screen that loads remote data so it auto-refreshes
 * when the user taps "Reintentar" on the OfflineBanner.
 */
export function useRefreshOnRestore(refresh: () => void) {
  const restoreCount = useNetworkStore(s => s.restoreCount);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip the initial mount — only react to subsequent increases
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    refresh();
  }, [restoreCount]); // eslint-disable-line react-hooks/exhaustive-deps
}
