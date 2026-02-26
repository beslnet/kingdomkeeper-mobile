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
    fetchPermissions: usePermissionsStore((s) => s.fetchPermissions),
  };
}
