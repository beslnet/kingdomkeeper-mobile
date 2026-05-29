import { CommonActions } from '@react-navigation/native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation/navigationRef';

interface ParsedPayload {
  modulo?: string;
  entity?: string;
  entity_id?: number;
  action?: string;
  extra?: Record<string, any>;
}

interface StackRoute {
  name: string;
  params?: Record<string, any>;
}

/**
 * Navigation config per notification module.
 *
 * To support a new module, add an entry here — no other code needs to change.
 *
 * tabIndex mapping (must match MainTabs.tsx screen order):
 *   0 → Dashboard
 *   1 → Bandeja
 *   2 → Notificaciones
 *   3 → Perfil
 *
 * buildStack returns the FULL ordered list of screens for the target stack,
 * including the parent screen so the back button always appears.
 */
const MODULE_NAV_CONFIG: Record<
  string,
  {
    tabIndex: number;
    buildStack: (payload: ParsedPayload, titulo: string) => StackRoute[];
  }
> = {
  comunicaciones: {
    tabIndex: 1, // Bandeja tab
    buildStack: (payload, titulo) => [
      { name: 'BandejaEntrada' },
      { name: 'BandejaDetail', params: { id: payload.entity_id, titulo } },
    ],
  },
  // Future modules — add here:
  // membresia: { tabIndex: 0, buildStack: (p, t) => [{ name: 'MiembrosListScreen' }, { name: 'MiembroDetail', params: { miembroId: p.entity_id } }] },
  // finanzas:  { tabIndex: 0, buildStack: (p, t) => [{ name: 'FinanzasHome' }] },
};

// Tab screen names in order — must match MainTabs.tsx declaration order
const TAB_NAMES = ['Dashboard', 'Bandeja', 'Notificaciones', 'Perfil'];

// Stack screen name for each tab's root (first screen in its stack)
const TAB_ROOT_SCREEN: Record<number, string> = {
  0: 'Dashboard',
  1: 'BandejaEntrada',
  2: 'NotificacionesList',
  3: 'Profile',
};

/**
 * Resets the navigation tree to land on the target tab+stack.
 * Using CommonActions.reset guarantees the stack history is set up correctly,
 * so the back button always appears when a parent screen is listed before the detail.
 */
function dispatchNavigationReset(tabIndex: number, stack: StackRoute[]) {
  if (!navigationRef.isReady()) return;

  const routes = TAB_NAMES.map((name, idx) => {
    if (idx === tabIndex && stack.length > 0) {
      return {
        name,
        state: {
          index: stack.length - 1,
          routes: stack,
        },
      };
    }
    return { name };
  });

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            routes: [
              {
                name: 'Inicio',
                state: { index: tabIndex, routes },
              },
            ],
          },
        },
      ],
    }),
  );
}

export function handleNotificationNavigation(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) {
  if (!remoteMessage) return;

  try {
    const rawPayload = remoteMessage.data?.payload;
    const payload: ParsedPayload =
      rawPayload && typeof rawPayload === 'string' ? JSON.parse(rawPayload) : {};

    const titulo = remoteMessage.notification?.title ?? 'Mensaje';
    const config = payload.modulo ? MODULE_NAV_CONFIG[payload.modulo] : undefined;

    if (config && payload.entity_id) {
      dispatchNavigationReset(config.tabIndex, config.buildStack(payload, titulo));
    } else {
      // Fallback: Notificaciones tab (index 2), land on list
      dispatchNavigationReset(2, [{ name: 'NotificacionesList' }]);
    }
  } catch {
    dispatchNavigationReset(2, [{ name: 'NotificacionesList' }]);
  }
}
