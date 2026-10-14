import { MENU_ITEMS, puedeVerItem, ContextoMenu } from '../navigation/menuAcceso';

/**
 * El menú lateral: Asistencia, Peticiones y Registrar visita salen de lo que el backend resolvió
 * (`puede`: rol del sistema + función del ministerio), no de una lista de roles en la app.
 */
function ctx(over: { roles?: string[]; permisos?: string[]; puede?: string[]; isLoading?: boolean; casos?: boolean; superadmin?: boolean }): ContextoMenu {
  const { roles = [], permisos = [], puede = [], isLoading = false, casos = false, superadmin = false } = over;
  return {
    isSuperAdmin: superadmin,
    isLoading,
    tieneCasosAsignados: casos,
    hasPermission: (m, a) => superadmin || permisos.includes(`${m}.${a}`),
    hasAnyRole: rs => rs.some(r => roles.includes(r)),
    canAny: cs => superadmin || cs.some(c => puede.includes(c)),
  };
}
const visibles = (c: ContextoMenu) => MENU_ITEMS.filter(i => puedeVerItem(i, c)).map(i => i.label);

describe('menú lateral por rol y función', () => {
  it('un hermano sin ministerio no ve Asistencia, Peticiones ni Registrar visita', () => {
    const v = visibles(ctx({ roles: ['member'] }));
    expect(v).toEqual(expect.arrayContaining(['Inicio', 'Bandeja de Entrada']));
    expect(v).not.toContain('Asistencia');
    expect(v).not.toContain('Peticiones de oración');
    expect(v).not.toContain('Registrar visita');
    expect(v).not.toContain('Membresía');
  });

  it('el integrante de bienvenida (rol member) ve "Registrar visita" y nada más de las tres', () => {
    const v = visibles(ctx({ roles: ['member'], puede: ['visitas.registrar', 'visitas.ver_propias'] }));
    expect(v).toContain('Registrar visita');
    expect(v).not.toContain('Asistencia');
    expect(v).not.toContain('Peticiones de oración');
    expect(v).not.toContain('Membresía');
  });

  it('el equipo de asistencia (rol member) ve Asistencia', () => {
    const v = visibles(ctx({ roles: ['member'], puede: ['asistencia.marcar'] }));
    expect(v).toContain('Asistencia');
    expect(v).not.toContain('Peticiones de oración');
  });

  it('el equipo de intercesión (rol member) ve Peticiones de oración', () => {
    const v = visibles(ctx({ roles: ['member'], puede: ['peticiones.ver', 'peticiones.anotar'] }));
    expect(v).toContain('Peticiones de oración');
    expect(v).not.toContain('Asistencia');
  });

  it('quien ya tiene Membresía no ve "Registrar visita" repetido: la registra desde Membresía', () => {
    const v = visibles(ctx({ roles: ['pastor'], permisos: ['membresia.ver'], puede: ['visitas.registrar', 'visitas.asignar'] }));
    expect(v).toContain('Membresía');
    expect(v).not.toContain('Registrar visita');
  });

  it('el líder de sistema conserva Asistencia y Peticiones, pero no ve Visitas (no tiene membresía)', () => {
    const v = visibles(ctx({ roles: ['leader'], puede: ['asistencia.marcar', 'peticiones.ver'] }));
    expect(v).toContain('Asistencia');
    expect(v).toContain('Peticiones de oración');
    expect(v).not.toContain('Registrar visita');
    expect(v).not.toContain('Membresía');
  });

  it('mientras cargan los permisos no muestra los ítems que dependen de ellos', () => {
    const v = visibles(ctx({ roles: ['pastor'], puede: ['asistencia.marcar'], isLoading: true }));
    expect(v).not.toContain('Asistencia');
    expect(v).toContain('Inicio');
  });

  it('el superadmin ve Asistencia y Peticiones', () => {
    const v = visibles(ctx({ superadmin: true }));
    expect(v).toContain('Asistencia');
    expect(v).toContain('Peticiones de oración');
  });

  it('Casos Pastorales sigue como antes: rol de gestión o casos asignados', () => {
    expect(visibles(ctx({ roles: ['member'], permisos: ['pastoral.ver'] }))).not.toContain('Casos Pastorales');
    expect(visibles(ctx({ roles: ['member'], permisos: ['pastoral.ver'], casos: true }))).toContain('Casos Pastorales');
  });
});
