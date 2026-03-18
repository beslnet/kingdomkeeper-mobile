import { create } from 'zustand';
import { getNoLeidasCount } from '../api/comunicaciones';
import { getUnreadCount } from '../api/notificaciones';

type BadgeState = {
  count: number | undefined;       // comunicaciones no leídas
  notifCount: number | undefined;  // notificaciones sistema no leídas
  refresh: () => Promise<void>;
};

export const useBadgeStore = create<BadgeState>()((set) => ({
  count: undefined,
  notifCount: undefined,

  refresh: async () => {
    try {
      const [com, notif] = await Promise.all([
        getNoLeidasCount(),
        getUnreadCount(),
      ]);
      set({
        count: com.count > 0 ? com.count : undefined,
        notifCount: notif.count > 0 ? notif.count : undefined,
      });
    } catch {
      // ignore — badge is non-critical
    }
  },
}));
