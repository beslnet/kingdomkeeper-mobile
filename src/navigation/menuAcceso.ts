/**
 * Qué ítems del menú lateral ve cada quien. Aparte de MainDrawer para poder probarlo sin montar la navegación.
 *
 * Asistencia, Peticiones y Registrar visita salen de `can` (lo que el backend resolvió con la misma regla con
 * que deja pasar o da 403: rol del sistema + función del ministerio). El resto sigue por rol/permiso.
 */
export type MenuItem = {
  label: string;
  icon: string;
  screen: string;
  nestedTab?: string;
  nestedScreen?: string;
  permission?: { module: string; action: string };
  roles?: string[];
  /** Lo que resolvió el backend (rol + función de ministerio): basta uno. Reemplaza a `roles`/`permission` del ítem. */
  can?: string[];
  /** Oculta el ítem a quien ya llega a lo mismo por otro menú (ej.: Membresía ya trae "Registrar visita"). */
  hideIfPermission?: { module: string; action: string };
};

// Orden de uso: lo que se abre cada semana (asistencia, peticiones) va arriba, porque en un
// iPhone SE solo caben ~7 ítems sin desplazar. Inventario, lo menos frecuente, queda al final.
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', icon: 'home-outline', screen: 'Inicio', nestedTab: 'Dashboard' },
  { label: 'Asistencia', icon: 'clipboard-check-outline', screen: 'Asistencia', can: ['asistencia.marcar'] },
  { label: 'Peticiones de oración', icon: 'hands-pray', screen: 'Peticiones', can: ['peticiones.ver'] },
  // El integrante del comité de bienvenida no tiene Membresía: su entrada a las visitas es esta. Quien sí la tiene
  // registra la visita desde Membresía (no se le repite el ítem).
  {
    label: 'Registrar visita', icon: 'account-plus-outline', screen: 'Membresía', nestedScreen: 'RegistrarVisita',
    can: ['visitas.registrar'], hideIfPermission: { module: 'membresia', action: 'ver' },
  },
  { label: 'Membresía', icon: 'account-group-outline', screen: 'Membresía', permission: { module: 'membresia', action: 'ver' } },
  { label: 'Grupos y Células', icon: 'account-multiple-outline', screen: 'GruposCelulas', permission: { module: 'grupos', action: 'ver' } },
  { label: 'Casos Pastorales', icon: 'heart-outline', screen: 'Casos Pastorales', permission: { module: 'pastoral', action: 'ver' } },
  { label: 'Finanzas', icon: 'cash-multiple', screen: 'Finanzas', permission: { module: 'finanzas', action: 'ver' } },
  { label: 'Comunicaciones', icon: 'forum-outline', screen: 'Comunicaciones', nestedScreen: 'GestionList', roles: ['church_admin', 'pastor', 'leader', 'treasurer'] },
  { label: 'Bandeja de Entrada', icon: 'message-outline', screen: 'Comunicaciones', nestedScreen: 'BandejaEntrada' },
  { label: 'Inventario', icon: 'package-variant', screen: 'Inventario', permission: { module: 'inventario', action: 'ver' } },
];


export type ContextoMenu = {
  isSuperAdmin: boolean;
  isLoading: boolean;
  tieneCasosAsignados: boolean;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  canAny: (codigos: string[]) => boolean;
};

export function puedeVerItem(item: MenuItem, ctx: ContextoMenu): boolean {
  const { isSuperAdmin, isLoading, tieneCasosAsignados, hasPermission, hasAnyRole, canAny } = ctx;
  if (item.can) {
    if (isLoading) return false;
    if (item.hideIfPermission && hasPermission(item.hideIfPermission.module, item.hideIfPermission.action)) return false;
    return canAny(item.can);
  }
  if (isSuperAdmin) return true;
  if (isLoading) return !item.permission && !item.roles;
  if (item.roles && item.roles.length > 0 && !hasAnyRole(item.roles)) return false;
  // Casos Pastorales: visible solo si puede gestionar (rol pastoral) O tiene casos asignados
  if (item.screen === 'Casos Pastorales') {
    const puedeGestionar = isSuperAdmin || hasAnyRole(['pastor', 'leader', 'church_admin']);
    return puedeGestionar || tieneCasosAsignados;
  }
  if (item.permission && !hasPermission(item.permission.module, item.permission.action)) return false;
  return true;
}
