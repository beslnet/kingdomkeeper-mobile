import { create } from 'zustand';

export type NetworkErrorKind = 'offline' | 'timeout' | 'server';

interface NetworkState {
  isOffline: boolean;
  errorKind: NetworkErrorKind;
  restoreCount: number;
  setOffline: (value: boolean, kind?: NetworkErrorKind) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOffline: false,
  errorKind: 'offline',
  restoreCount: 0,
  setOffline: (value, kind = 'offline') =>
    set({
      isOffline: value,
      errorKind: kind,
      // Increment restoreCount only when transitioning from offline → online
      restoreCount: !value && get().isOffline ? get().restoreCount + 1 : get().restoreCount,
    }),
}));
