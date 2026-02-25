import { create } from 'zustand';
import { getMisPermisos } from '../api/auth';

type PermissionsState = {
  roles: string[];
  permisos: Record<string, Record<string, boolean>>;
  isSuperAdmin: boolean;
  fetchPermissions: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  reset: () => void;
};

export const usePermissionsStore = create<PermissionsState>()((set, get) => ({
  roles: [],
  permisos: {},
  isSuperAdmin: false,

  fetchPermissions: async () => {
    try {
      const data = await getMisPermisos();
      const roles: string[] = data.roles ?? [];
      set({
        roles,
        permisos: data.permisos ?? {},
        isSuperAdmin: roles.includes('super_admin'),
      });
    } catch {
      // silently fail; permissions will remain empty
    }
  },

  hasPermission: (module: string, action: string) => {
    const { permisos } = get();
    return permisos?.[module]?.[action] === true;
  },

  hasAnyRole: (rolesToCheck: string[]) => {
    const { roles } = get();
    return rolesToCheck.some((r) => roles.includes(r));
  },

  reset: () => set({ roles: [], permisos: {}, isSuperAdmin: false }),
}));
