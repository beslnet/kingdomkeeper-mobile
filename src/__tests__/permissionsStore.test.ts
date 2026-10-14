import { usePermissionsStore } from '../store/permissionsStore';

jest.mock('../api/auth', () => ({
  getMisPermisos: jest.fn(),
}));

import { getMisPermisos } from '../api/auth';
const mockGetMisPermisos = getMisPermisos as jest.MockedFunction<typeof getMisPermisos>;

describe('permissionsStore', () => {
  beforeEach(() => {
    usePermissionsStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has empty roles, permisos, and is not superAdmin or loading', () => {
      const state = usePermissionsStore.getState();
      expect(state.roles).toEqual([]);
      expect(state.permisos).toEqual({});
      expect(state.modulosAccesibles).toEqual([]);
      expect(state.isSuperAdmin).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns false when permisos is empty', () => {
      expect(usePermissionsStore.getState().hasPermission('membresia', 'ver')).toBe(false);
    });

    it('returns true when action is in the array', () => {
      usePermissionsStore.setState({ permisos: { membresia: ['ver', 'editar'] } });
      expect(usePermissionsStore.getState().hasPermission('membresia', 'ver')).toBe(true);
    });

    it('returns false when action is not in the array', () => {
      usePermissionsStore.setState({ permisos: { membresia: ['ver'] } });
      expect(usePermissionsStore.getState().hasPermission('membresia', 'crear')).toBe(false);
    });

    it('returns false when module does not exist', () => {
      usePermissionsStore.setState({ permisos: { membresia: ['ver'] } });
      expect(usePermissionsStore.getState().hasPermission('finanzas', 'ver')).toBe(false);
    });

    it('returns true for anything when isSuperAdmin', () => {
      usePermissionsStore.setState({ isSuperAdmin: true, permisos: {} });
      expect(usePermissionsStore.getState().hasPermission('any_module', 'any_action')).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('returns true when role is in roles array', () => {
      usePermissionsStore.setState({ roles: ['church_admin', 'leader'] });
      expect(usePermissionsStore.getState().hasRole('church_admin')).toBe(true);
    });

    it('returns false when role is not in roles array', () => {
      usePermissionsStore.setState({ roles: ['leader'] });
      expect(usePermissionsStore.getState().hasRole('church_admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true if at least one role matches', () => {
      usePermissionsStore.setState({ roles: ['leader'] });
      expect(usePermissionsStore.getState().hasAnyRole(['church_admin', 'leader'])).toBe(true);
    });

    it('returns false if no roles match', () => {
      usePermissionsStore.setState({ roles: ['treasurer'] });
      expect(usePermissionsStore.getState().hasAnyRole(['church_admin', 'leader'])).toBe(false);
    });
  });

  describe('canAccess', () => {
    it('returns true when module is in modulosAccesibles', () => {
      usePermissionsStore.setState({ modulosAccesibles: ['membresia', 'finanzas'] });
      expect(usePermissionsStore.getState().canAccess('membresia')).toBe(true);
    });

    it('returns false when module is not in modulosAccesibles', () => {
      usePermissionsStore.setState({ modulosAccesibles: ['membresia'] });
      expect(usePermissionsStore.getState().canAccess('finanzas')).toBe(false);
    });

    it('returns true for anything when isSuperAdmin', () => {
      usePermissionsStore.setState({ isSuperAdmin: true, modulosAccesibles: [] });
      expect(usePermissionsStore.getState().canAccess('any_module')).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears all state to initial values', () => {
      usePermissionsStore.setState({
        roles: ['church_admin'],
        permisos: { membresia: ['ver'] },
        modulosAccesibles: ['membresia'],
        isSuperAdmin: true,
        isLoading: true,
      });
      usePermissionsStore.getState().reset();
      const state = usePermissionsStore.getState();
      expect(state.roles).toEqual([]);
      expect(state.permisos).toEqual({});
      expect(state.modulosAccesibles).toEqual([]);
      expect(state.isSuperAdmin).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchPermissions', () => {
    it('sets isLoading to true during fetch and false after success', async () => {
      mockGetMisPermisos.mockResolvedValueOnce({
        roles_iglesia_actual: ['leader'],
        permisos: { grupos: ['ver'] },
        modulos_accesibles: ['grupos'],
        es_super_admin: false,
      });
      await usePermissionsStore.getState().fetchPermissions();
      const state = usePermissionsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.roles).toEqual(['leader']);
      expect(state.permisos).toEqual({ grupos: ['ver'] });
      expect(state.modulosAccesibles).toEqual(['grupos']);
      expect(state.isSuperAdmin).toBe(false);
    });

    it('sets isLoading to false on error', async () => {
      mockGetMisPermisos.mockRejectedValueOnce(new Error('network error'));
      await usePermissionsStore.getState().fetchPermissions();
      expect(usePermissionsStore.getState().isLoading).toBe(false);
    });

    it('sets isSuperAdmin from es_super_admin field', async () => {
      mockGetMisPermisos.mockResolvedValueOnce({
        roles: [],
        permisos: {},
        modulos_accesibles: [],
        es_super_admin: true,
      });
      await usePermissionsStore.getState().fetchPermissions();
      expect(usePermissionsStore.getState().isSuperAdmin).toBe(true);
    });
  });

  describe('canSeeItem integration', () => {
    // Helper that mirrors the MainDrawer canSeeItem logic
    const canSeeItem = (
      item: { permission?: { module: string; action: string }; roles?: string[] },
      state: { isSuperAdmin: boolean; isLoading: boolean; hasPermission: (m: string, a: string) => boolean; hasAnyRole: (r: string[]) => boolean }
    ): boolean => {
      const { isSuperAdmin, isLoading, hasPermission, hasAnyRole } = state;
      if (isSuperAdmin) return true;
      if (isLoading) return !item.permission && !item.roles;
      if (item.roles && item.roles.length > 0 && !hasAnyRole(item.roles)) return false;
      if (item.permission && !hasPermission(item.permission.module, item.permission.action)) return false;
      return true;
    };

    it('member (no roles/permisos) should NOT see Membresía', () => {
      usePermissionsStore.setState({ roles: [], permisos: {}, isSuperAdmin: false, isLoading: false });
      const s = usePermissionsStore.getState();
      expect(canSeeItem({ permission: { module: 'membresia', action: 'ver' } }, s)).toBe(false);
    });

    it('church_admin should see all items', () => {
      usePermissionsStore.setState({
        roles: ['church_admin'],
        permisos: { membresia: ['ver'], finanzas: ['ver'], grupos: ['ver'], pastoral: ['ver'], inventario: ['ver'] },
        isSuperAdmin: false,
        isLoading: false,
      });
      const s = usePermissionsStore.getState();
      expect(canSeeItem({ permission: { module: 'membresia', action: 'ver' } }, s)).toBe(true);
      expect(canSeeItem({ permission: { module: 'finanzas', action: 'ver' } }, s)).toBe(true);
      expect(canSeeItem({ roles: ['church_admin', 'pastor', 'leader', 'treasurer'] }, s)).toBe(true);
    });

    it('leader should see Comunicaciones but NOT Finanzas', () => {
      usePermissionsStore.setState({
        roles: ['leader'],
        permisos: { grupos: ['ver'] },
        isSuperAdmin: false,
        isLoading: false,
      });
      const s = usePermissionsStore.getState();
      expect(canSeeItem({ roles: ['church_admin', 'pastor', 'leader', 'treasurer'] }, s)).toBe(true);
      expect(canSeeItem({ permission: { module: 'finanzas', action: 'ver' } }, s)).toBe(false);
    });

    it('super_admin sees everything', () => {
      usePermissionsStore.setState({ isSuperAdmin: true, isLoading: false });
      const s = usePermissionsStore.getState();
      expect(canSeeItem({ permission: { module: 'membresia', action: 'ver' } }, s)).toBe(true);
      expect(canSeeItem({ roles: ['church_admin'] }, s)).toBe(true);
      expect(canSeeItem({ permission: { module: 'finanzas', action: 'ver' } }, s)).toBe(true);
    });

    it('during loading, only unrestricted items show', () => {
      usePermissionsStore.setState({ isSuperAdmin: false, isLoading: true });
      const s = usePermissionsStore.getState();
      expect(canSeeItem({}, s)).toBe(true); // no restriction
      expect(canSeeItem({ permission: { module: 'membresia', action: 'ver' } }, s)).toBe(false);
      expect(canSeeItem({ roles: ['leader'] }, s)).toBe(false);
    });
  });

  describe('can / canAny: lo que el backend resolvió (rol + función de ministerio)', () => {
    it('empieza sin nada: ni puede, ni funciones, ni ministerios', () => {
      const st = usePermissionsStore.getState();
      expect(st.puede).toEqual([]);
      expect(st.funciones).toEqual({});
      expect(st.ministerios).toEqual([]);
      expect(st.can('visitas.registrar')).toBe(false);
    });

    it('can es exactamente lo que dice `puede`; canAny basta con uno', () => {
      usePermissionsStore.setState({ puede: ['visitas.registrar', 'peticiones.ver'] });
      const st = usePermissionsStore.getState();
      expect(st.can('visitas.registrar')).toBe(true);
      expect(st.can('visitas.asignar')).toBe(false);
      expect(st.canAny(['visitas.asignar', 'peticiones.ver'])).toBe(true);
      expect(st.canAny(['visitas.asignar', 'asistencia.marcar'])).toBe(false);
    });

    it('no se deriva de los roles: un member con función bienvenida puede registrar, un leader sin ella no', () => {
      usePermissionsStore.setState({ roles: ['member'], puede: ['visitas.registrar', 'visitas.ver_propias'] });
      expect(usePermissionsStore.getState().can('visitas.registrar')).toBe(true);
      usePermissionsStore.setState({ roles: ['leader'], puede: [] });
      expect(usePermissionsStore.getState().can('visitas.registrar')).toBe(false);
    });

    it('el superadmin puede todo', () => {
      usePermissionsStore.setState({ isSuperAdmin: true, puede: [] });
      expect(usePermissionsStore.getState().can('asistencia.configurar')).toBe(true);
    });

    it('fetchPermissions guarda puede, funciones y ministerios; reset los limpia', async () => {
      mockGetMisPermisos.mockResolvedValue({
        roles: ['member'], permisos: {}, modulos_accesibles: [], es_super_admin: false,
        puede: ['asistencia.marcar'], funciones: { asistencia: 'integrante' },
        ministerios: [{ grupo_id: 7, grupo: 'Ujieres', funcion: 'asistencia', nivel: 'integrante' }],
      } as any);
      await usePermissionsStore.getState().fetchPermissions();
      const st = usePermissionsStore.getState();
      expect(st.puede).toEqual(['asistencia.marcar']);
      expect(st.funciones).toEqual({ asistencia: 'integrante' });
      expect(st.ministerios[0].grupo).toBe('Ujieres');
      st.reset();
      expect(usePermissionsStore.getState().puede).toEqual([]);
    });

    it('un backend que aún no manda `puede` no rompe nada', async () => {
      mockGetMisPermisos.mockResolvedValue({ roles: ['pastor'], permisos: {}, modulos_accesibles: [] } as any);
      await usePermissionsStore.getState().fetchPermissions();
      expect(usePermissionsStore.getState().puede).toEqual([]);
    });
  });
});
