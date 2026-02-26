import { create } from 'zustand';
import { getMisPermisos } from '../api/auth';

type PermissionsState = {
  roles: string[];
  permisos: Record<string, string[]>;
  modulosAccesibles: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  fetchPermissions: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAccess: (module: string) => boolean;
  reset: () => void;
};

const initialState = {
  roles: [] as string[],
  permisos: {} as Record<string, string[]>,
  modulosAccesibles: [] as string[],
  isSuperAdmin: false,
  isLoading: false,
};

export const usePermissionsStore = create<PermissionsState>()((set, get) => ({
  ...initialState,

  fetchPermissions: async () => {
    set({ isLoading: true });
    try {
      const data = await getMisPermisos();
      const roles: string[] = data.roles_iglesia_actual || data.roles || [];
      set({
        roles,
        permisos: data.permisos ?? {},
        modulosAccesibles: data.modulos_accesibles ?? [],
        isSuperAdmin: data.es_super_admin === true || roles.includes('super_admin'),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  hasPermission: (module: string, action: string) => {
    const { permisos, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    const actions = permisos?.[module];
    if (!Array.isArray(actions)) return false;
    return actions.includes(action);
  },

  hasRole: (role: string) => {
    const { roles } = get();
    return roles.includes(role);
  },

  hasAnyRole: (rolesToCheck: string[]) => {
    const { roles } = get();
    return rolesToCheck.some((r) => roles.includes(r));
  },

  canAccess: (module: string) => {
    const { modulosAccesibles, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    return modulosAccesibles.includes(module);
  },

  reset: () => set(initialState),
}));
