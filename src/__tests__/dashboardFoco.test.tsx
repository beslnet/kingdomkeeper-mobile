import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('../api/dashboard', () => ({ getDashboard: jest.fn() }));
jest.mock('../store/authStore', () => ({ useAuthStore: (sel: any) => sel({ user: { nombre: 'Ana' } }) }));
jest.mock('../store/iglesiaStore', () => ({ useIglesiaStore: (sel: any) => sel({ iglesiaNombre: 'Iglesia QA' }) }));
// Lo que React Navigation haría al volver a la pantalla: correr otra vez el callback de useFocusEffect.
const mockFoco: { cb: (() => void) | null } = { cb: null };
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => {
    mockFoco.cb = cb;
    require('react').useEffect(() => { cb(); }, [cb]);
  },
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
  DrawerActions: { openDrawer: jest.fn() },
}));

import { getDashboard } from '../api/dashboard';
import DashboardScreen from '../screens/Dashboard';

const esperar = async () => {
  await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
};

const textos = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => (n.type as any) === 'Text')
    .map((n) => String([n.props.children].flat(Infinity).join('')));

const conGrupo = (hora: string) => ({
  mis_grupos: [{ id: 3, nombre: `Jóvenes ${hora}`, miembros_count: 4, mi_rol: 'co_leader', soy_lider: false }],
});

it('al volver al inicio recarga «Mis grupos» (antes seguía mostrando lo de antes)', async () => {
  const obtener = getDashboard as jest.Mock;
  obtener.mockResolvedValueOnce(conGrupo('20:00')).mockResolvedValueOnce(conGrupo('19:30'));
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<DashboardScreen />); });
  await esperar();
  // Montar no carga dos veces: el primer foco lo cubre la carga inicial.
  expect(obtener).toHaveBeenCalledTimes(1);
  expect(textos(tree).some((t) => t.includes('Jóvenes 20:00'))).toBe(true);

  await act(async () => { mockFoco.cb?.(); });
  await esperar();
  expect(obtener).toHaveBeenCalledTimes(2);
  expect(textos(tree).some((t) => t.includes('Jóvenes 19:30'))).toBe(true);
});
