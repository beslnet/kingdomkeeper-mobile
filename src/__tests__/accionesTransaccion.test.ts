/**
 * SE2-05: el backend responde {mensaje, transaccion} al aprobar, rechazar, pagar o anular. Las
 * funciones de la API devuelven la transacción, que es lo que guarda TransaccionDetailScreen.
 */
const mockPost = jest.fn();
jest.mock('../api/api', () => ({ __esModule: true, default: { post: (...a: any[]) => mockPost(...a) } }));

import {
  aprobarTransaccion, rechazarTransaccion, pagarTransaccion, anularTransaccion,
} from '../api/finanzas';

const tx = { id: 7, tipo: 'egreso', estado: 'aprobado', monto: '5000' };

describe.each([
  ['aprobar', () => aprobarTransaccion(7, 'ok')],
  ['rechazar', () => rechazarTransaccion(7, 'no')],
  ['pagar', () => pagarTransaccion(7, {})],
  ['anular', () => anularTransaccion(7, 'error')],
])('%s', (_accion, llamar) => {
  it('devuelve la transacción, no el envoltorio {mensaje, transaccion}', async () => {
    mockPost.mockResolvedValueOnce({ data: { mensaje: 'Listo', transaccion: tx } });
    await expect(llamar()).resolves.toEqual(tx);
  });

  it('si el backend ya manda la transacción sola, la deja igual', async () => {
    mockPost.mockResolvedValueOnce({ data: tx });
    await expect(llamar()).resolves.toEqual(tx);
  });
});
