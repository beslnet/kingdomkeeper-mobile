import { create } from 'zustand';
import { getMisPermisos } from '../api/auth';

/** Un ministerio con función del que forma parte el usuario (viene de `mis-permisos`). */
export type MinisterioConFuncion = {
  grupo_id: number;
  grupo: string;
  funcion: 'bienvenida' | 'intercesion' | 'asistencia';
  nivel: 'lider' | 'integrante';
};

type PermissionsState = {
  roles: string[];
  permisos: Record<string, string[]>;
  modulosAccesibles: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  tieneCasosAsignados: boolean;
  /** Lo que el backend ya resolvió (rol + función de los ministerios): 'visitas.registrar', 'peticiones.ver'… */
  puede: string[];
  funciones: Record<string, 'lider' | 'integrante'>;
  ministerios: MinisterioConFuncion[];
  fetchPermissions: () => Promise<void>;
  /**
   * ¿Puede el usuario hacer `codigo`? Es la ÚNICA fuente para mostrar Visitas, Peticiones, Asistencia y sus
   * botones: la misma regla que el backend aplica al dejar pasar o dar 403. No la reimplementes con roles.
   */
  can: (codigo: string) => boolean;
  canAny: (codigos: string[]) => boolean;
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
  tieneCasosAsignados: false,
  puede: [] as string[],
  funciones: {} as Record<string, 'lider' | 'integrante'>,
  ministerios: [] as MinisterioConFuncion[],
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
        tieneCasosAsignados: data.tiene_casos_asignados === true,
        puede: Array.isArray(data.puede) ? data.puede : [],
        funciones: data.funciones ?? {},
        ministerios: Array.isArray(data.ministerios) ? data.ministerios : [],
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

  can: (codigo: string) => {
    const { puede, isSuperAdmin } = get();
    return isSuperAdmin || puede.includes(codigo);
  },

  canAny: (codigos: string[]) => codigos.some((c) => get().can(c)),

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
