import React from 'react';
import { Switch, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
const mockGoBack = jest.fn();
const ruta: { params: any } = { params: {} };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ruta,
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../api/finanzas', () => ({
  ...jest.requireActual('../api/finanzas'),
  crearTransaccion: jest.fn(),
  editarTransaccion: jest.fn(),
  listarCategorias: jest.fn().mockResolvedValue([]),
  listarCuentas: jest.fn().mockResolvedValue([]),
}));

import { editarTransaccion } from '../api/finanzas';
import TransaccionFormScreen from '../screens/finanzas/TransaccionFormScreen';

const mockEditar = editarTransaccion as jest.Mock;

const gasto = (extra: object = {}) => ({
  id: 7, tipo: 'egreso', categoria: { id: 1, nombre: 'Cuentas', tipo: 'egreso' },
  cuenta: { id: 2, nombre: 'Caja' }, fecha: '2026-10-14', monto: 15000, medio: 'efectivo',
  estado: 'pendiente', ...extra,
});

async function montar(transaccion: object) {
  ruta.params = { transaccion };
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<TransaccionFormScreen />); });
  await act(async () => { await Promise.resolve(); });
  return tree;
}

const interruptor = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType(Switch);

describe('casilla "Es un reembolso" en el formulario de egreso', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditar.mockResolvedValue({});
  });

  it('va desmarcada por defecto y solo existe en un egreso', async () => {
    const egreso = await montar(gasto());
    expect(interruptor(egreso)).toHaveLength(1);
    expect(interruptor(egreso)[0].props.value).toBe(false);
    expect(JSON.stringify(egreso.toJSON())).toContain('Lo pagué yo y me lo devuelven');

    const ingreso = await montar(gasto({ tipo: 'ingreso' }));
    expect(interruptor(ingreso)).toHaveLength(0);
  });

  it('marcada, manda es_reembolso al guardar; sin marcar, manda false', async () => {
    const tree = await montar(gasto());
    const guardar = () => tree.root.findAll(
      (n) => typeof n.props.onPress === 'function'
        && n.findAllByType(Text).some((t) => t.props.children === 'Guardar cambios'),
    )[0];

    await act(async () => guardar().props.onPress());
    expect(mockEditar.mock.calls[0][1].es_reembolso).toBe(false);

    await act(async () => interruptor(tree)[0].props.onValueChange(true));
    await act(async () => guardar().props.onPress());
    expect(mockEditar.mock.calls[1][1].es_reembolso).toBe(true);
  });

  it('un gasto ya marcado como reembolso abre con la casilla marcada', async () => {
    const tree = await montar(gasto({ es_reembolso: true }));
    expect(interruptor(tree)[0].props.value).toBe(true);
  });
});
