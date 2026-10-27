import { usePermissionsStore } from '../store/permissionsStore';
import { useAuthStore } from '../store/authStore';
import { Gestion, GrupoConAcciones, gestionDelGrupo } from '../utils/gestionGrupo';

/** Qué puede hacer quien mira con este grupo (ver utils/gestionGrupo: lo decide el backend). */
export function useGestionDelGrupo(grupo: GrupoConAcciones | null | undefined): Gestion {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const miembroId = useAuthStore((s) => s.user?.miembro_id);
  return gestionDelGrupo(grupo, { miembroId, isSuperAdmin, hasAnyRole, hasPermission });
}
