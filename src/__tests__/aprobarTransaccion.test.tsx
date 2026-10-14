/**
 * El botón Aprobar/Rechazar sale de `puedo_aprobar`, que calcula el backend (puede_aprobar):
 * tesorería aprueba todo, el líder/co-líder aprueba lo del fondo de SU grupo y nadie aprueba lo
 * que registró él mismo. La app no reimplementa la regla.
 *
 * Antes el detalle del grupo miraba el rol 'tesorero' —que no existe: es 'treasurer'—, así que ni
 * el tesorero veía los botones, y el líder tampoco.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: { transaccionId: 7, grupoId: 3, puedeGestionar: true } }),
  // Corre el efecto una vez, como al enfocar la pantalla.
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, []); },
}));
jest.mock('react-native-paper', () => ({ Icon: () => null }));
jest.mock('../api/finanzas', () => ({
  obtenerTransaccion: jest.fn(),
  anularTransaccion: jest.fn(),
  aprobarTransaccion: jest.fn(),
  rechazarTransaccion: jest.fn(),
  pagarTransaccion: jest.fn(),
}));

import { obtenerTransaccion } from '../api/finanzas';
import { usePermissionsStore } from '../store/permissionsStore';
import TransaccionDetail from '../screens/grupos/TransaccionDetail';

const mockObtener = obtenerTransaccion as jest.Mock;

const tx = (extra: Record<string, any> = {}) => ({
  id: 7, tipo: 'egreso', estado: 'pendiente', monto: '5000', fecha: '2026-10-14',
  categoria: { id: 1, nombre: 'Cuentas' }, cuenta: { id: 2, nombre: 'Fondo Jóvenes' },
  puedo_aprobar: false, historial: [], ...extra,
});

let montado: renderer.ReactTestRenderer | null = null;

async function montar(transaccion: any) {
  mockObtener.mockResolvedValue(transaccion);
  await act(async () => { montado = renderer.create(<TransaccionDetail />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return montado!;
}

// La sesión se fija ANTES de montar; el store se suscribe a los cambios.
const sesion = (estado: Record<string, any>) =>
  usePermissionsStore.setState({ roles: [], permisos: {}, isSuperAdmin: false, ...estado });

const texto = (tree: renderer.ReactTestRenderer) => JSON.stringify(tree.toJSON());

describe('Aprobar / Rechazar en el detalle de la transacción del grupo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => { montado?.unmount(); });
    montado = null;
    sesion({});
  });

  it('el líder (sin finanzas.aprobar) ve los botones cuando el backend dice puedo_aprobar', async () => {
    sesion({ roles: ['leader'], permisos: { finanzas: ['gestionar'] } });
    const t = texto(await montar(tx({ puedo_aprobar: true })));
    expect(t).toContain('Aprobar');
    expect(t).toContain('Rechazar');
  });

  it('el tesorero (rol real: treasurer) ve los botones cuando puede aprobar', async () => {
    sesion({ roles: ['treasurer'], permisos: { finanzas: ['ver', 'aprobar'] } });
    const t = texto(await montar(tx({ puedo_aprobar: true })));
    expect(t).toContain('Aprobar');
    expect(t).toContain('Rechazar');
  });

  it('el tesorero no ve los botones en lo que no puede aprobar (p. ej. lo registró él)', async () => {
    sesion({ roles: ['treasurer'], permisos: { finanzas: ['ver', 'aprobar'] } });
    const t = texto(await montar(tx({ puedo_aprobar: false })));
    expect(t).not.toContain('"Aprobar"');
    expect(t).not.toContain('"Rechazar"');
  });

  it('sin el campo (backend viejo) no hay botones: no se adivina', async () => {
    sesion({ roles: ['treasurer'], permisos: { finanzas: ['aprobar'] } });
    const sin = tx();
    delete (sin as any).puedo_aprobar;
    const t = texto(await montar(sin));
    expect(t).not.toContain('"Aprobar"');
  });
});
