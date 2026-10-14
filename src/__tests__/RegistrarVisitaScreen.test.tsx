import React from 'react';
import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
const mockGoBack = jest.fn();
const nav = { puedeVolver: true };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, canGoBack: () => nav.puedeVolver }),
}));
// Lo que el backend resolvió para quien registra (`puede` de mis-permisos): rol del sistema + función del ministerio.
const permisos = { puede: ['visitas.registrar', 'visitas.asignar'] as string[] };
jest.mock('../store/permissionsStore', () => ({
  usePermissionsStore: (sel: any) => sel({ can: (c: string) => permisos.puede.includes(c) }),
}));
jest.mock('../api/miembros', () => ({
  ...jest.requireActual('../api/miembros'),
  registrarVisita: jest.fn(),
  listarMiembros: jest.fn(),
  listarResponsablesVisita: jest.fn(),
}));

import { registrarVisita, listarMiembros, listarResponsablesVisita } from '../api/miembros';
import RegistrarVisitaScreen from '../screens/membresia/RegistrarVisitaScreen';

const mockRegistrar = registrarVisita as jest.Mock;
const mockMiembros = listarMiembros as jest.Mock;
const mockResponsables = listarResponsablesVisita as jest.Mock;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

async function montar() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<RegistrarVisitaScreen />);
  });
  await flush();
  return tree;
}

const textos = (tree: renderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

const escribir = async (tree: renderer.ReactTestRenderer, label: string, valor: string) => {
  const input = tree.root.findAll(n => n.props.label === label && typeof n.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText(valor));
};

const tocar = async (tree: renderer.ReactTestRenderer, pred: (n: any) => boolean) => {
  const el = tree.root.findAll(n => pred(n) && typeof n.props.onPress === 'function')[0];
  await act(async () => el.props.onPress());
};

describe('RegistrarVisitaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permisos.puede = ['visitas.registrar', 'visitas.asignar'];
    nav.puedeVolver = true;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // react-native-paper avisa de que no hay librería de íconos en jest; no aporta al test.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockMiembros.mockResolvedValue({ results: [{ id: 5, nombre: 'Marta', apellidos: 'Rojas', email: null }] });
    mockResponsables.mockResolvedValue([{ id: 9, nombre: 'Lía Soto' }]);
  });

  it('la casilla dice que la visita puede pedir que le borren los datos (política de privacidad v2)', async () => {
    const tree = await montar();
    expect(textos(tree)).toContain(
      'La visita aceptó que la iglesia guarde estos datos para contactarla y acompañarla. Puede pedir que los borren cuando quiera.',
    );
  });

  it('sin la casilla de autorización no registra y avisa por qué', async () => {
    const tree = await montar();
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.children === 'Registrar visita');
    expect(mockRegistrar).not.toHaveBeenCalled();
    expect(textos(tree)).toContain('Sin su autorización no se pueden guardar sus datos.');
  });

  it('con la casilla manda la ficha con el consentimiento', async () => {
    mockRegistrar.mockResolvedValue({ id: '1' });
    const tree = await montar();
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.label?.startsWith?.('La visita aceptó'));
    await tocar(tree, n => n.props.children === 'Registrar visita');
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    expect(mockRegistrar.mock.calls[0][0].ficha.consentimiento).toBe(true);
  });

  it('si no se pueden cargar hermanos ni usuarios, esos campos no aparecen y la visita se registra', async () => {
    mockMiembros.mockRejectedValue({ response: { status: 403 } });
    mockResponsables.mockRejectedValue({ response: { status: 403 } });
    mockRegistrar.mockResolvedValue({ id: '1' });
    const tree = await montar();
    expect(textos(tree)).not.toContain('Seguimiento a cargo de');
    await tocar(tree, n => n.props.children === 'Lo invitó alguien');
    expect(textos(tree)).not.toContain('¿Quién lo invitó?');
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.label?.startsWith?.('La visita aceptó'));
    await tocar(tree, n => n.props.children === 'Registrar visita');
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    const { ficha } = mockRegistrar.mock.calls[0][0];
    expect(ficha.responsable_id).toBeNull();
    expect(ficha.invitado_por_id).toBeNull();
  });

  it('con las listas cargadas ofrece al responsable y al invitador', async () => {
    const tree = await montar();
    expect(textos(tree)).toContain('Seguimiento a cargo de');
    await tocar(tree, n => n.props.children === 'Lo invitó alguien');
    expect(textos(tree)).toContain('¿Quién lo invitó?');
  });

  // ── Ministerio de bienvenida ──────────────────────────────────────────────────────────────────────
  it('el integrante de bienvenida registra pero no asigna: no ve el responsable, no lo pide y no manda uno', async () => {
    permisos.puede = ['visitas.registrar', 'visitas.ver_propias'];
    mockRegistrar.mockResolvedValue({ id: '1' });
    const tree = await montar();
    expect(mockResponsables).not.toHaveBeenCalled(); // a él el backend le respondería 403
    expect(textos(tree)).not.toContain('Seguimiento a cargo de');
    expect(textos(tree)).toContain('Quien lidera la bienvenida asignará el seguimiento.');
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.label?.startsWith?.('La visita aceptó'));
    await tocar(tree, n => n.props.children === 'Registrar visita');
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    expect(mockRegistrar.mock.calls[0][0].ficha.responsable_id).toBeNull();
  });

  it('quien puede asignar pide la lista de responsables de la visita (no /core/usuarios/)', async () => {
    await montar();
    expect(mockResponsables).toHaveBeenCalledTimes(1);
  });

  it('si la pantalla es la primera de la pila (el comité entra directo) deja la ficha limpia en vez de volver', async () => {
    permisos.puede = ['visitas.registrar'];
    nav.puedeVolver = false;
    mockRegistrar.mockResolvedValue({ id: '1' });
    const tree = await montar();
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.label?.startsWith?.('La visita aceptó'));
    await tocar(tree, n => n.props.children === 'Registrar visita');
    const botones = (Alert.alert as jest.Mock).mock.calls.at(-1)![2];
    await act(async () => botones[0].onPress());
    expect(mockGoBack).not.toHaveBeenCalled();
    const nombre = tree.root.findAll(n => n.props.label === 'Nombre *' && typeof n.props.onChangeText === 'function')[0];
    expect(nombre.props.value).toBe('');
  });

  it('en la pila de Membresía (hay a dónde volver) vuelve, como siempre', async () => {
    mockRegistrar.mockResolvedValue({ id: '1' });
    const tree = await montar();
    await escribir(tree, 'Nombre *', 'Ana');
    await escribir(tree, 'Apellidos *', 'Pérez');
    await tocar(tree, n => n.props.label?.startsWith?.('La visita aceptó'));
    await tocar(tree, n => n.props.children === 'Registrar visita');
    const botones = (Alert.alert as jest.Mock).mock.calls.at(-1)![2];
    await act(async () => botones[0].onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });
});
