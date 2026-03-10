import { create } from 'zustand';
import { getNoLeidasCount } from '../api/comunicaciones';

type BadgeState = {
  count: number | undefined;
  refresh: () => Promise<void>;
};

export const useBadgeStore = create<BadgeState>()((set) => ({
  count: undefined,

  refresh: async () => {
    try {
      const res = await getNoLeidasCount();
      set({ count: res.count > 0 ? res.count : undefined });
    } catch {
      // ignore — badge is non-critical
    }
  },
}));
