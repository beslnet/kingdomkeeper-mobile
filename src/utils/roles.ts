export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrador',
  church_admin: 'Administrador de Iglesia',
  leader: 'Líder de Ministerio/Grupo',
  mentor: 'Mentor/Discipulador',
  treasurer: 'Tesorería/Finanzas',
  member: 'Miembro',
  visitor: 'Visitante',
  support: 'Soporte Técnico',
};

export function mapRolesToDisplay(roles: string[] = []): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.map((code) => ROLE_LABELS[code] || code);
}

export function mapRolCodeToDisplay(code: string): string {
  return ROLE_LABELS[code] || code;
}

export function getRolesForIglesia(
  usuario: { iglesias?: Array<{ id: number; roles: string[] }> } | null,
  iglesiaId: number | null,
): string[] {
  if (!usuario?.iglesias || !iglesiaId) return [];
  const iglesia = usuario.iglesias.find((ig) => ig.id === iglesiaId);
  return iglesia?.roles || [];
}
