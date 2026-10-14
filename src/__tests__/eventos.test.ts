import { contarDelGrupo } from '../utils/eventos';

describe('contarDelGrupo', () => {
  const integrantes = [{ miembro_id: 1 }, { miembro_id: 5 }, { id: 7 }];
  it('cuenta solo a los del grupo que asistieron', () => {
    const participantes = [
      { miembro_id: 1, estado_asistencia: 'asistio' },
      { miembro_id: 5, estado_asistencia: 'no_asistio' },
      { miembro_id: 7, estado_asistencia: 'asistio' },
      { miembro_id: 99, estado_asistencia: 'asistio' },
    ];
    expect(contarDelGrupo(participantes, integrantes)).toBe(2);
  });
  it('ids como texto o número dan lo mismo', () => {
    expect(contarDelGrupo([{ miembro_id: '1', estado_asistencia: 'asistio' }], integrantes)).toBe(1);
  });
  it('sin participantes, cero', () => expect(contarDelGrupo([], integrantes)).toBe(0));
});
