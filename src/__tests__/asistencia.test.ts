import {
  alternarFamilia, armarFamilias, estadoFamilia, fechaLarga, mismosPresentes, normalizar, reunionPorDefecto, sumarDias, ultimaFecha,
} from '../utils/asistencia';

const p = (id: number, grupo_familiar?: string | null) => ({ id, nombre: `P${id}`, presente: false, grupo_familiar });

describe('ultimaFecha (0 = lunes … 6 = domingo)', () => {
  // 2026-10-13 es martes
  const martes = new Date(2026, 9, 13, 10);
  it('domingo: el domingo anterior', () => expect(ultimaFecha(6, martes)).toBe('2026-10-11'));
  it('martes: hoy mismo', () => expect(ultimaFecha(1, martes)).toBe('2026-10-13'));
  it('miércoles: el de la semana pasada, no uno futuro', () => expect(ultimaFecha(2, martes)).toBe('2026-10-07'));
  it('lunes: ayer', () => expect(ultimaFecha(0, martes)).toBe('2026-10-12'));
  it('cruza de mes', () => expect(ultimaFecha(6, new Date(2026, 10, 3, 9))).toBe('2026-11-01'));
  it('en un domingo, hoy', () => expect(ultimaFecha(6, new Date(2026, 9, 11, 23, 59))).toBe('2026-10-11'));
});

describe('fechas', () => {
  it('sumarDias cruza mes y año', () => {
    expect(sumarDias('2026-10-04', -7)).toBe('2026-09-27');
    expect(sumarDias('2026-12-27', 7)).toBe('2027-01-03');
  });
  it('fechaLarga', () => expect(fechaLarga('2026-10-11')).toBe('Domingo 11 de octubre'));
});

describe('familias', () => {
  const personas = [p(1, 'Pérez'), p(2, ' pérez  '), p(3, 'Rojas'), p(4), p(5, ''), p(6, 'Pérez'), p(7, null)];
  it('agrupa sin importar mayúsculas ni espacios, y deja suelta a quien está solo', () => {
    const { familias, sueltas } = armarFamilias(personas);
    expect(familias).toHaveLength(1);
    expect(familias[0].personas.map((x) => x.id)).toEqual([1, 2, 6]);
    expect(sueltas.map((x) => x.id)).toEqual([3, 4, 5, 7]);
  });
  it('sin grupo_familiar en nadie (API v1) no hay familias', () => {
    const { familias, sueltas } = armarFamilias([p(1), p(2)]);
    expect(familias).toEqual([]);
    expect(sueltas).toHaveLength(2);
  });
  it('un toque marca a toda la familia, incluso si venía a medias', () => {
    const [f] = armarFamilias(personas).familias;
    const parcial = new Set([2]);
    expect(estadoFamilia(f, parcial)).toBe('algunos');
    const todos = alternarFamilia(parcial, f);
    expect([...todos].sort()).toEqual([1, 2, 6]);
    expect(estadoFamilia(f, todos)).toBe('todos');
  });
  it('otro toque la desmarca y no toca a los demás', () => {
    const [f] = armarFamilias(personas).familias;
    const r = alternarFamilia(new Set([1, 2, 6, 3]), f);
    expect([...r]).toEqual([3]);
  });
});

describe('utilidades', () => {
  it('mismosPresentes', () => {
    expect(mismosPresentes(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(mismosPresentes(new Set([1]), new Set([1, 2]))).toBe(false);
  });
  it('normalizar quita tildes', () => expect(normalizar('  PÉREZ Ñandú')).toBe('perez nandu'));
});

describe('reunionPorDefecto', () => {
  const martes = new Date(2026, 9, 13, 10);
  const culto = { id: 1, dia_semana: 6 };
  const varones = { id: 2, dia_semana: 3 };
  it('abre la que se hizo más reciente: el domingo gana al jueves un martes', () => {
    expect(reunionPorDefecto([varones, culto], martes)).toBe(culto);
  });
  it('un viernes, la del jueves', () => {
    expect(reunionPorDefecto([culto, varones], new Date(2026, 9, 16, 9))).toBe(varones);
  });
  it('empate: la primera de la lista', () => {
    const otra = { id: 3, dia_semana: 6 };
    expect(reunionPorDefecto([culto, otra], martes)).toBe(culto);
  });
  it('sin reuniones, nada', () => expect(reunionPorDefecto([], martes)).toBeNull());
});
