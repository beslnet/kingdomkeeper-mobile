import { create } from 'zustand';
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { getNoLeidasCount } from '../api/comunicaciones';
import { getUnreadCount } from '../api/notificaciones';

type BadgeState = {
  count: number | undefined;       // comunicaciones no leídas
  notifCount: number | undefined;  // notificaciones sistema no leídas
  refresh: () => Promise<void>;
};

const syncNativeBadge = (total: number) => {
  // iOS: notifee actualiza el badge del ícono en Springboard
  // Android: funciona en launchers compatibles (Samsung, MIUI, etc.)
  notifee.setBadgeCount(total).catch(() => {});
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
      const comCount = com.count > 0 ? com.count : 0;
      const notifCount = notif.count > 0 ? notif.count : 0;
      set({
        count: comCount > 0 ? comCount : undefined,
        notifCount: notifCount > 0 ? notifCount : undefined,
      });
      syncNativeBadge(comCount + notifCount);
    } catch {
      // badge es no-crítico
    }
  },
}));
