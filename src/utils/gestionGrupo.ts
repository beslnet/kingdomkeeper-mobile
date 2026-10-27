// Quién gestiona un grupo (backend: iglesia/services/gestion_grupo.py). El líder principal y sus co-líderes
// gestionan SU grupo sin el rol «Líder»; el pastor y la administración supervisan todos; un «Líder» de la
// iglesia que no está en el grupo no lo toca. El detalle del grupo lo trae resuelto (`puedo_gestionar`,
// `puedo_administrar`): la app solo lo lee. Con un backend anterior que no lo manda, la regla que usaba la app.

export interface GrupoConAcciones {
  lider_id?: number | null;
  miembros?: { miembro_id: number; rol_en_grupo: string }[];
  mi_rol?: 'leader' | 'co_leader' | 'member' | null;
  puedo_gestionar?: boolean;
  puedo_administrar?: boolean;
}

export interface QuienMira {
  miembroId?: number | null;
  isSuperAdmin: boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (modulo: string, accion: string) => boolean;
}

export interface Gestion {
  /** Editar el grupo y sus miembros, sus actividades, pasar lista de su reunión. */
  gestiona: boolean;
  /** Cambiar el líder o los co-líderes, archivar o borrar el grupo. */
  administra: boolean;
}

export function gestionDelGrupo(grupo: GrupoConAcciones | null | undefined, quien: QuienMira): Gestion {
  if (!grupo) return { gestiona: false, administra: false };
  if (typeof grupo.puedo_gestionar === 'boolean') {
    return { gestiona: grupo.puedo_gestionar, administra: !!grupo.puedo_administrar };
  }
  const id = quien.miembroId != null ? Number(quien.miembroId) : null;
  const esLider = id != null && Number(grupo.lider_id) === id;
  const esCoLider = id != null && !!grupo.miembros?.some(
    (m) => Number(m.miembro_id) === id && m.rol_en_grupo === 'co_leader'
  );
  const supervisa = quien.isSuperAdmin || quien.hasAnyRole(['church_admin', 'pastor']);
  return {
    gestiona: supervisa || esLider || esCoLider,
    administra: quien.isSuperAdmin || quien.hasAnyRole(['church_admin']) || quien.hasPermission('grupos', 'eliminar'),
  };
}
