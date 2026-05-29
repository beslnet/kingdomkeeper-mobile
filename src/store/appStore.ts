import { create } from 'zustand';

interface AppState {
  forceUpdateRequired: boolean;
  forceUpdateUrl: string | null;
  setForceUpdate: (required: boolean, url?: string | null) => void;
}

export const useAppStore = create<AppState>(set => ({
  forceUpdateRequired: false,
  forceUpdateUrl: null,
  setForceUpdate: (required, url = null) =>
    set({ forceUpdateRequired: required, forceUpdateUrl: url }),
}));
