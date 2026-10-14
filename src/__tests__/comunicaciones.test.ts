import { alcanceEnvio, textoLlegara, textoSoloConCuenta } from '../utils/comunicaciones';

describe('alcanceEnvio', () => {
  it('con el grupo "con cuenta" elegido llega a ese total (6), no a "todos" (59)', () => {
    expect(alcanceEnvio({ grupoConCuenta: 6, individuales: 0 })).toBe(6);
  });
  it('sin grupo llega solo a los individuales', () => {
    expect(alcanceEnvio({ grupoConCuenta: null, individuales: 3 })).toBe(3);
  });
  it('el grupo ya incluye a los individuales: no se suman dos veces', () => {
    expect(alcanceEnvio({ grupoConCuenta: 6, individuales: 2 })).toBe(6);
  });
});

describe('textoSoloConCuenta', () => {
  it('dice cuántos reciben, de cuántos, y que los demás no lo ven (el caso del QA: 6 de 59)', () => {
    const t = textoSoloConCuenta(6, 59);
    expect(t).toContain('tienen cuenta: 6 de 59 miembros activos');
    expect(t).toContain('53 no tienen cuenta y no lo verán');
  });
  it('singular', () => {
    expect(textoSoloConCuenta(5, 6)).toContain('1 no tiene cuenta y no lo verá');
  });
  it('si todos tienen cuenta, lo dice', () => {
    expect(textoSoloConCuenta(10, 10)).toContain('les llega a todos');
  });
  it('sin el total de miembros (rol sin acceso a Membresía) no inventa cifras', () => {
    const t = textoSoloConCuenta(6, null);
    expect(t).toContain('cuenta: 6.');
    expect(t).not.toMatch(/\bde \d+ miembros/);
  });
});

describe('textoLlegara', () => {
  it('concuerda en singular y plural', () => {
    expect(textoLlegara(1)).toBe('Llegará a 1 persona con cuenta en la app.');
    expect(textoLlegara(6)).toBe('Llegará a 6 personas con cuenta en la app.');
  });
  it('cero es una advertencia, no "Llegará a 0"', () => {
    expect(textoLlegara(0)).toMatch(/No llegará a nadie/);
  });
});
