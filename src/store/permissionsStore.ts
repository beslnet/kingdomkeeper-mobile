import { create } from 'zustand';
import { fetchMisPermisos } from '../api/auth';
import type { PermissionsResponse, Iglesia } from '../api/auth';
import { mapRolesToDisplay } from '../utils/roles';
import { useAuthStore } from './authStore';

type PermissionsState = {
  permissions: Record<string, string[]> | 'all' | {};
  roles: string[];
  rolesDisplay: string[];
  modulosAccesibles: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  iglesia: Iglesia | null;
  fetchPermissions: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  canAccess: (module: string) => boolean;
};

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: {},
  roles: [],
  rolesDisplay: [],
  modulosAccesibles: [],
  isSuperAdmin: false,
  isLoading: false,
  iglesia: null,

  fetchPermissions: async () => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken) {
      set({ isLoading: false });
      return;
    }
    if (user?.is_superuser) {
      set({
        permissions: 'all',
        roles: ['super_admin'],
        rolesDisplay: ['Super Administrador'],
        modulosAccesibles: ['all'],
        isSuperAdmin: true,
        isLoading: false,
      });
      return;
    }
    set({ isLoading: true });
    try {
      const data: PermissionsResponse = await fetchMisPermisos();
      const effectiveRoles = data.roles_iglesia_actual || data.roles || [];
      set({
        permissions: data.permisos,
        roles: effectiveRoles,
        rolesDisplay: mapRolesToDisplay(effectiveRoles),
        modulosAccesibles: data.modulos_accesibles,
        isSuperAdmin: data.es_super_admin,
        iglesia: data.iglesia ?? null,
      });
      if (data.usuario) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser && data.usuario) {
          const updatedUser = {
            ...currentUser,
            ...data.usuario,
            id: data.usuario.id ?? currentUser.id,
            miembro_asociado: data.usuario.miembro_asociado ?? currentUser.miembro_asociado,
          };
          useAuthStore.getState().setUser(updatedUser as typeof currentUser);
        }
      }
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      set({ permissions: {}, roles: [], modulosAccesibles: [], isSuperAdmin: false });
    } finally {
      set({ isLoading: false });
    }
  },

  hasPermission: (module: string, action: string) => {
    const { isSuperAdmin, permissions } = get();
    if (isSuperAdmin || permissions === 'all') return true;
    const perms = permissions as Record<string, string[]>;
    if (!perms[module]) return false;
    return perms[module].includes(action);
  },

  hasRole: (roleName: string) => get().roles.includes(roleName),

  hasAnyRole: (roleNames: string[]) => roleNames.some((role) => get().roles.includes(role)),

  canAccess: (module: string) => {
    const { isSuperAdmin, modulosAccesibles } = get();
    if (isSuperAdmin || modulosAccesibles.includes('all')) return true;
    return modulosAccesibles.includes(module);
  },
}));
