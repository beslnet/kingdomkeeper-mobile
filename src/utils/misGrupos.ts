// "Mis grupos" del inicio (backend: core/views/dashboard.py, `_get_mis_grupos`).

export interface MiGrupo {
  id: number;
  nombre: string;
  tipo?: string;
  miembros_count?: number;
  /** Rol en el grupo: 'leader' | 'co_leader' | 'member'. */
  mi_rol?: string;
  /** Es el líder principal del grupo (Grupo.lider). */
  soy_lider?: boolean;
  /** Cuándo se reúnen: su reunión semanal. null si no tiene (o un backend anterior no lo manda). */
  reunion?: { dia_semana_display: string; hora: string } | null;
}

/** Líder principal, co-líder o integrante, en ese orden de importancia. */
export function rolEnMiGrupo(g: MiGrupo): 'leader' | 'co_leader' | 'member' {
  if (g.soy_lider || g.mi_rol === 'leader') return 'leader';
  if (g.mi_rol === 'co_leader') return 'co_leader';
  return 'member';
}

export const ETIQUETA_ROL: Record<'leader' | 'co_leader' | 'member', string> = {
  leader: 'Líder',
  co_leader: 'Co-líder',
  member: 'Miembro',
};

const ORDEN = { leader: 0, co_leader: 1, member: 2 };

/** Primero los que lidera, después los que co-lidera, después el resto; dentro, por nombre. */
export function ordenarMisGrupos(grupos: MiGrupo[]): MiGrupo[] {
  return [...grupos].sort(
    (a, b) => ORDEN[rolEnMiGrupo(a)] - ORDEN[rolEnMiGrupo(b)] || a.nombre.localeCompare(b.nombre)
  );
}

export function textoMiembros(g: MiGrupo): string {
  const n = g.miembros_count;
  const miembros = n == null ? '' : n === 1 ? '1 miembro' : `${n} miembros`;
  const cuando = g.reunion ? `${g.reunion.dia_semana_display} ${g.reunion.hora}` : '';
  return [miembros, cuando].filter(Boolean).join(' · ');
}
