/**
 * Montos en pesos chilenos tal como los escribe la gente: "150.000", "$ 1.500", "150000".
 *
 * El punto es SIEMPRE separador de miles (el peso chileno no usa decimales), así que
 * `parseFloat("150.000")` —que lee 150— no sirve. Todo campo de monto de la app pasa por aquí.
 * Lo que no se puede leer sin adivinar ("150,000", "1.50") se rechaza con un mensaje, en vez de
 * guardar en silencio una cifra distinta de la escrita.
 */

export type ResultadoPesos = { ok: true; valor: number } | { ok: false; error: string };

const SOLO_DIGITOS = /^\d+$/;
const CON_MILES = /^\d{1,3}(\.\d{3})+$/;
const DECIMALES_CERO = /^(.*?),0{1,2}$/;

export function parsearPesos(texto: string | null | undefined): ResultadoPesos {
  let t = (texto ?? '').replace(/[\s$]/g, '');
  if (!t) return { ok: false, error: 'Ingresa un monto.' };

  // "150.000,00" → los pesos no llevan decimales, pero ",0" / ",00" no cambian la cifra
  // (",000" sí: lo escribe quien piensa en millares a la inglesa, y se rechaza).
  const cero = DECIMALES_CERO.exec(t);
  if (cero) t = cero[1];

  if (SOLO_DIGITOS.test(t)) return { ok: true, valor: parseInt(t, 10) };
  if (CON_MILES.test(t)) return { ok: true, valor: parseInt(t.replace(/\./g, ''), 10) };

  if (/[.,]/.test(t) && /^[\d.,]+$/.test(t)) {
    return {
      ok: false,
      error: 'Escribe el monto en pesos, sin decimales (por ejemplo 150000 o 150.000).',
    };
  }
  return { ok: false, error: 'El monto solo puede llevar números.' };
}

/** Lo mismo, pero para campos opcionales: vacío es `null`, y lo ilegible sigue siendo error. */
export function parsearPesosOpcional(texto: string | null | undefined): ResultadoPesos | { ok: true; valor: null } {
  return (texto ?? '').trim() ? parsearPesos(texto) : { ok: true, valor: null };
}

/** Un monto que viene del backend ("150000.00") como texto editable ("150000"). */
export function pesosComoTexto(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = Number(valor);
  return Number.isNaN(n) ? '' : String(Math.round(n));
}
