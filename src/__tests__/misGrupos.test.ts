import { ETIQUETA_ROL, ordenarMisGrupos, rolEnMiGrupo, textoMiembros } from '../utils/misGrupos';

/**
 * "Mis grupos" del inicio con lo que el backend manda de verdad (`core/views/dashboard.py`):
 * `miembros_count`, `mi_rol` = 'leader' | 'co_leader' | 'member' y `soy_lider`. La app leía
 * `cantidad_miembros` y `mi_rol === 'lider'`: todo líder salía como "Miembro" y sin número.
 */
describe('Mis grupos del inicio', () => {
  const celula = { id: 1, nombre: 'Célula Los Olivos', miembros_count: 11, mi_rol: 'leader', soy_lider: true };
  const jovenes = { id: 3, nombre: 'Jóvenes Monte Sión', miembros_count: 10, mi_rol: 'co_leader', soy_lider: false };
  const alabanza = { id: 2, nombre: 'Alabanza', miembros_count: 9, mi_rol: 'member', soy_lider: false };

  it('el líder sale como Líder y el co-líder como Co-líder', () => {
    expect(ETIQUETA_ROL[rolEnMiGrupo(celula)]).toBe('Líder');
    expect(ETIQUETA_ROL[rolEnMiGrupo(jovenes)]).toBe('Co-líder');
    expect(ETIQUETA_ROL[rolEnMiGrupo(alabanza)]).toBe('Miembro');
  });

  it('el líder principal cuenta como líder aunque su membresía diga otra cosa', () => {
    expect(rolEnMiGrupo({ id: 9, nombre: 'X', mi_rol: 'member', soy_lider: true })).toBe('leader');
  });

  it('muestra el número de miembros que manda el backend', () => {
    expect(textoMiembros(celula)).toBe('11 miembros');
    expect(textoMiembros({ id: 4, nombre: 'Y', miembros_count: 1 })).toBe('1 miembro');
  });

  it('ordena: los que lidera, los que co-lidera y el resto', () => {
    expect(ordenarMisGrupos([alabanza, jovenes, celula]).map(g => g.id)).toEqual([1, 3, 2]);
  });

  it('dice cuándo se reúnen, si tienen reunión semanal', () => {
    expect(textoMiembros({ ...jovenes, reunion: { dia_semana_display: 'Viernes', hora: '20:00' } })).toBe(
      '10 miembros · Viernes 20:00'
    );
    expect(textoMiembros({ ...jovenes, reunion: null })).toBe('10 miembros');
  });
});
