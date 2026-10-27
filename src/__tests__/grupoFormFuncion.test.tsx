import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: { grupo: { id: 3, nombre: 'Bienvenida', tipo: 'ministerio', funcion: '', estado: 'activo', lider_id: 9, lider_nombre: 'Ana' } } }),
}));
jest.mock('../api/grupos', () => ({
  crearGrupo: jest.fn(),
  actualizarGrupo: jest.fn(async () => ({})),
  listarLideresIglesia: jest.fn(async () => []),
  listarMiembrosIglesia: jest.fn(async () => []),
}));

import { actualizarGrupo } from '../api/grupos';
import { usePermissionsStore } from '../store/permissionsStore';
import GrupoFormScreen from '../screens/grupos/GrupoForm';

const montar = async (puede: string[]) => {
  usePermissionsStore.setState({ puede, isSuperAdmin: false });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<GrupoFormScreen />); });
  return tree;
};
const porId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];
const guardar = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.props.onPress === 'function' &&
    n.findAll((c) => (c.type as any) === 'Text' && /Guardar|Crear/.test(String([c.props.children].flat().join('')))).length > 0)[0];

/** La función del ministerio en la app, como en la web: la define el pastor o la administración. */
describe('Función del ministerio en el formulario del grupo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('quien puede la elige y se manda', async () => {
    const tree = await montar(['ministerios.configurar_funcion']);
    await act(async () => { porId(tree, 'funcion-bienvenida').props.onPress(); });
    await act(async () => { guardar(tree).props.onPress(); });
    expect((actualizarGrupo as jest.Mock).mock.calls[0][1]).toMatchObject({ funcion: 'bienvenida' });
  });

  it('sin permiso se ve pero no se cambia, y no se manda', async () => {
    const tree = await montar([]);
    expect(porId(tree, 'funcion-bienvenida').props.disabled).toBe(true);
    await act(async () => { guardar(tree).props.onPress(); });
    expect((actualizarGrupo as jest.Mock).mock.calls[0][1]).not.toHaveProperty('funcion');
  });
});
