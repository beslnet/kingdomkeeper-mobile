import { usePermissionsStore } from '../store/permissionsStore';

export function usePermissions() {
  return {
    roles: usePermissionsStore((s) => s.roles),
    permisos: usePermissionsStore((s) => s.permisos),
    modulosAccesibles: usePermissionsStore((s) => s.modulosAccesibles),
    isSuperAdmin: usePermissionsStore((s) => s.isSuperAdmin),
    isLoading: usePermissionsStore((s) => s.isLoading),
    hasPermission: usePermissionsStore((s) => s.hasPermission),
    hasRole: usePermissionsStore((s) => s.hasRole),
    hasAnyRole: usePermissionsStore((s) => s.hasAnyRole),
    canAccess: usePermissionsStore((s) => s.canAccess),
    puede: usePermissionsStore((s) => s.puede),
    funciones: usePermissionsStore((s) => s.funciones),
    ministerios: usePermissionsStore((s) => s.ministerios),
    can: usePermissionsStore((s) => s.can),
    canAny: usePermissionsStore((s) => s.canAny),
    fetchPermissions: usePermissionsStore((s) => s.fetchPermissions),
  };
}
