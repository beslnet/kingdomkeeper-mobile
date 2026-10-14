import { parsearPesos, parsearPesosOpcional, pesosComoTexto } from '../utils/pesos';

const valor = (t: string) => {
  const r = parsearPesos(t);
  if (!r.ok) throw new Error(`"${t}" no debía fallar: ${r.error}`);
  return r.valor;
};

describe('parsearPesos', () => {
  it('lee el punto como separador de miles (el bug: "150.000" se guardaba como 150)', () => {
    expect(valor('150.000')).toBe(150000);
    expect(valor('1.500')).toBe(1500);
    expect(valor('1.234.567')).toBe(1234567);
  });

  it('lee números sin separador', () => {
    expect(valor('150')).toBe(150);
    expect(valor('150000')).toBe(150000);
    expect(valor('0')).toBe(0);
  });

  it('ignora el signo $ y los espacios', () => {
    expect(valor('$ 150.000')).toBe(150000);
    expect(valor(' 1 500 ')).toBe(1500);
  });

  it('acepta ",00" porque no cambia la cifra', () => {
    expect(valor('150.000,00')).toBe(150000);
    expect(valor('1500,0')).toBe(1500);
  });

  it('vacío es un error claro, no 0 ni NaN', () => {
    for (const t of ['', '   ', '$', null, undefined]) {
      const r = parsearPesos(t as string);
      expect(r).toEqual({ ok: false, error: 'Ingresa un monto.' });
    }
  });

  it('rechaza lo que habría que adivinar, en vez de guardar otra cifra', () => {
    for (const t of ['150,000', '1.50', '15.00', '1.5000', '1500,50', '12.34.56', '.500', '1..500']) {
      const r = parsearPesos(t);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/sin decimales/);
    }
  });

  it('rechaza letras y signos', () => {
    for (const t of ['abc', '12a', '-500', '1e5']) {
      const r = parsearPesos(t);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/solo puede llevar números/);
    }
  });
});

describe('parsearPesosOpcional', () => {
  it('vacío es null; lo escrito se lee igual que siempre', () => {
    expect(parsearPesosOpcional('  ')).toEqual({ ok: true, valor: null });
    expect(parsearPesosOpcional('2.500')).toEqual({ ok: true, valor: 2500 });
    expect(parsearPesosOpcional('2,5').ok).toBe(false);
  });
});

describe('pesosComoTexto', () => {
  it('"150000.00" del backend queda editable como "150000" (no se relee como 15.000.000)', () => {
    expect(pesosComoTexto('150000.00')).toBe('150000');
    expect(valor(pesosComoTexto('150000.00'))).toBe(150000);
    expect(pesosComoTexto(1500)).toBe('1500');
    expect(pesosComoTexto(null)).toBe('');
    expect(pesosComoTexto('')).toBe('');
  });
});
