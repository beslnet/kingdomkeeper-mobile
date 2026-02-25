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
  return roles.map(code => ROLE_LABELS[code] || code);
}

export function mapRolCodeToDisplay(code: string): string {
  return ROLE_LABELS[code] || code;
}
