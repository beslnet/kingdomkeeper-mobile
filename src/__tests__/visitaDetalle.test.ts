import { SIN_FICHA, accionesVisita, textoAsignar, textoConsentimiento, textoSeguimiento } from '../utils/visitaDetalle';

const base: any = { estado_membresia: 'visitante', seguimiento: null, no_contactar: false };
const abierto = { id: 1, estado: 'en_progreso', estado_display: 'En progreso', responsable: 'Marta Comité' };

describe('accionesVisita: qué se ofrece en el detalle de una visita (reglas de la lista de la web)', () => {
  const todo = { puedeAsignar: true, puedeBorrar: true };
  it('sin seguimiento y con permiso de asignar: «Asignar»; no «Reasignar»', () => {
    expect(accionesVisita(base, todo)).toEqual({ asignar: true, reasignar: false, borrar: true });
  });
  it('con seguimiento abierto: «Reasignar», no «Asignar»', () => {
    expect(accionesVisita({ ...base, seguimiento: abierto }, todo)).toEqual({ asignar: false, reasignar: true, borrar: true });
  });
  it('con seguimiento cerrado no se reasigna ni se vuelve a asignar', () => {
    const cerrado = { ...abierto, estado: 'cerrado', estado_display: 'Cerrado' };
    expect(accionesVisita({ ...base, seguimiento: cerrado }, todo)).toEqual({ asignar: false, reasignar: false, borrar: true });
  });
  it('quien pidió que no la contacten no recibe seguimiento', () => {
    expect(accionesVisita({ ...base, no_contactar: true }, todo).asignar).toBe(false);
  });
  it('quien ya es hermano no se asigna ni se «borra»; el seguimiento abierto sí se puede reasignar', () => {
    expect(accionesVisita({ ...base, estado_membresia: 'activo' }, todo)).toEqual({ asignar: false, reasignar: false, borrar: false });
    expect(accionesVisita({ ...base, estado_membresia: 'activo', seguimiento: abierto }, todo).reasignar).toBe(true);
  });
  it('sin permisos no se ofrece nada (el integrante de bienvenida solo mira)', () => {
    expect(accionesVisita(base, { puedeAsignar: false, puedeBorrar: false })).toEqual({ asignar: false, reasignar: false, borrar: false });
    expect(accionesVisita({ ...base, seguimiento: abierto }, { puedeAsignar: false, puedeBorrar: false }).reasignar).toBe(false);
  });
});

describe('textos del detalle', () => {
  it('seguimiento: quién lo lleva y en qué va, o por qué no hay', () => {
    expect(textoSeguimiento({ ...base, seguimiento: abierto })).toBe('En progreso · Marta Comité');
    expect(textoSeguimiento({ ...base, seguimiento: { ...abierto, responsable: null } })).toBe('En progreso');
    expect(textoSeguimiento(base)).toBe('Sin seguimiento');
    expect(textoSeguimiento({ ...base, no_contactar: true })).toBe('Pidió que no la contacten');
  });
  it('consentimiento: con su fecha (dd-mm-aaaa), o que falta', () => {
    expect(textoConsentimiento({ consentimiento: true, fecha_consentimiento: '2026-10-14T21:30:00-03:00' }))
      .toBe('Aceptó que se guarden sus datos el 14-10-2026');
    expect(textoConsentimiento({ consentimiento: true, fecha_consentimiento: null })).toBe('Aceptó que se guarden sus datos');
    expect(textoConsentimiento({ consentimiento: false, fecha_consentimiento: null })).toBe('Sin autorización registrada');
  });
  it('los textos de asignar son los de la web', () => {
    expect(textoAsignar('Ana Rojas', null, false)).toBe(
      'Ana Rojas: se abre un caso de seguimiento y a quien elijas le llega un aviso (en la app y, si la tiene en el teléfono, también ahí).');
    expect(textoAsignar('Ana Rojas', 'Marta Comité', true)).toBe(
      'Ana Rojas: el seguimiento lo lleva Marta Comité. Al reasignarlo, a quien elijas le llega un aviso.');
    expect(SIN_FICHA).toBe('Registrada sin ficha (desde la app o antes de la ficha)');
  });
});
