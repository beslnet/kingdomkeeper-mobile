/**
 * Cuántos de los que asistieron a un evento son del grupo. El detalle del evento no trae
 * `miembros_grupo_asistieron` (solo la lista lo trae), así que se cuenta aquí con los
 * participantes del evento y los integrantes del grupo (`miembro_id`, o `id` si no viene).
 */
export function contarDelGrupo(
  participantes: { miembro_id: number | string; estado_asistencia: string }[],
  integrantes: { miembro_id?: number | string; id?: number | string }[]
): number {
  const ids = new Set(integrantes.map((m) => Number(m.miembro_id ?? m.id)));
  return participantes.filter((p) => p.estado_asistencia === 'asistio' && ids.has(Number(p.miembro_id))).length;
}
