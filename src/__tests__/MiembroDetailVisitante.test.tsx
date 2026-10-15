import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';

const mockGoBack = jest.fn();
// Estables entre renders, como en la app: la pantalla los usa de dependencia al cargar.
const mockNav = { goBack: mockGoBack, navigate: jest.fn() };
const mockRoute = { params: { miembroId: 82 } };
jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => mockRoute,
}));
jest.mock('../api/miembros', () => {
  const real = jest.requireActual('../api/miembros');
  return {
    ...real,
    getMiembro: jest.fn(),
    getHistorialMembresia: jest.fn(async () => []),
    getFichaVisita: jest.fn(),
    listarResponsablesVisita: jest.fn(async () => [{ id: 4, nombre: 'Pastor Test' }, { id: 5, nombre: 'Marta Comité' }]),
    asignarSeguimientoVisita: jest.fn(),
    revocarConsentimientoVisita: jest.fn(),
  };
});

import {
  asignarSeguimientoVisita, getFichaVisita, getMiembro, revocarConsentimientoVisita,
} from '../api/miembros';
import { usePermissionsStore } from '../store/permissionsStore';
import MiembroDetailScreen from '../screens/membresia/MiembroDetailScreen';

const visitante: any = {
  id: 82, nombre: 'Marcela', apellidos: 'Quintana Rojas', fecha_nacimiento: '', documento_identidad: 'VIS-12-0003',
  tipo_documento: 'otro', genero: null, telefono: '+56912345678', email: 'marcela@example.test', fecha_ingreso: '2026-10-14',
  estado_membresia: 'visitante', usuario_asociado: null,
};
const hermano = { ...visitante, id: 83, nombre: 'Juan', documento_identidad: '12.345.678-5', tipo_documento: 'rut', estado_membresia: 'activo' };
const ficha = {
  id: 82, nombre: 'Marcela Quintana Rojas', fecha: '2026-10-14', estado_membresia: 'visitante', tiene_ficha: true,
  como_llego: 'Lo invitó alguien', invitado_por: 'Pedro Soto', quiere_contacto: 'Por WhatsApp', no_contactar: false,
  consentimiento: true, fecha_consentimiento: '2026-10-14T21:30:00-03:00', notas: 'Vino con su esposo', seguimiento: null,
};
const abierto = { id: 3, estado: 'nuevo', estado_display: 'Nuevo', responsable: 'Marta Comité' };

const plano = (hijos: any): string =>
  [hijos].flat(Infinity).map((h: any) => (typeof h === 'string' || typeof h === 'number' ? String(h) : h?.props ? plano(h.props.children) : '')).join('');
const textos = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as any) === 'Text' && (n.parent?.type as any) !== 'Text').map((n) => plano(n.props.children));
const boton = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function' && n.parent?.props.testID !== id)[0];

const montar = async (puede: string[], miembro: any, fichaResp: any, permisos: Record<string, string[]> = {}) => {
  (getMiembro as jest.Mock).mockResolvedValue(miembro);
  (getFichaVisita as jest.Mock).mockResolvedValue(fichaResp);
  usePermissionsStore.setState({ puede, permisos, isSuperAdmin: false });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<MiembroDetailScreen />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return tree;
};

const LIDER_BIENVENIDA = ['visitas.registrar', 'visitas.ver_propias', 'visitas.ver', 'visitas.asignar', 'visitas.convertir'];

describe('Detalle de un visitante: la ficha y su seguimiento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('muestra cómo llegó, quién la invitó, el contacto, la autorización con su fecha, las notas y el seguimiento', async () => {
    const tree = await montar(LIDER_BIENVENIDA, visitante, { ...ficha, seguimiento: abierto });
    const t = textos(tree);
    expect(t).toEqual(expect.arrayContaining([
      'Ficha de la visita', 'Lo invitó alguien', 'Pedro Soto', 'Por WhatsApp',
      'Aceptó que se guarden sus datos el 14-10-2026', 'Vino con su esposo', 'Nuevo · Marta Comité',
    ]));
  });

  it('no enseña el código interno VIS-… como si fuera un documento, ni ofrece «Crear cuenta de usuario»', async () => {
    const tree = await montar(LIDER_BIENVENIDA, visitante, ficha, { membresia: ['ver', 'crear', 'editar'] });
    const t = textos(tree);
    expect(t.join('|')).not.toContain('VIS-12-0003');
    expect(t).not.toContain('Crear cuenta de usuario');
    expect(t).toContain('Una visita no tiene cuenta de usuario.');
  });

  it('un hermano normal sigue igual: su documento y «Crear cuenta de usuario» (con permiso); sin sección de ficha', async () => {
    const tree = await montar(LIDER_BIENVENIDA, hermano, ficha, { membresia: ['ver', 'crear', 'editar'] });
    const t = textos(tree);
    expect(t).toContain('12.345.678-5');
    expect(t).toContain('Crear cuenta de usuario');
    expect(t).not.toContain('Ficha de la visita');
    expect(getFichaVisita).not.toHaveBeenCalled();
  });

  it('sin acceso a las visitas (p. ej. un tesorero con membresía) no pide la ficha ni muestra la sección', async () => {
    const tree = await montar([], visitante, ficha, { membresia: ['ver'] });
    expect(getFichaVisita).not.toHaveBeenCalled();
    expect(textos(tree)).not.toContain('Ficha de la visita');
  });

  it('si el backend responde 403/404, la sección no aparece y la pantalla sigue', async () => {
    (getFichaVisita as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    (getMiembro as jest.Mock).mockResolvedValue(visitante);
    usePermissionsStore.setState({ puede: ['visitas.ver_propias'], permisos: {}, isSuperAdmin: false });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => { tree = renderer.create(<MiembroDetailScreen />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(textos(tree)).not.toContain('Ficha de la visita');
    expect(textos(tree)).toContain('Marcela Quintana Rojas');
  });

  it('sin ficha (registrada desde la app vieja) lo dice con las palabras de la web', async () => {
    const tree = await montar(LIDER_BIENVENIDA, visitante, { ...ficha, tiene_ficha: false, como_llego: null, consentimiento: false, notas: null });
    expect(textos(tree)).toContain('Registrada sin ficha (desde la app o antes de la ficha)');
  });

  it('el integrante de bienvenida (ver_propias) mira pero no asigna ni borra', async () => {
    const tree = await montar(['visitas.registrar', 'visitas.ver_propias'], visitante, ficha);
    expect(textos(tree)).toContain('Ficha de la visita');
    expect(boton(tree, 'ficha-asignar')).toBeUndefined();
    expect(boton(tree, 'ficha-borrar')).toBeUndefined();
  });

  it('asignar: elige responsable, manda la asignación, avisa y recarga la ficha', async () => {
    (asignarSeguimientoVisita as jest.Mock).mockResolvedValue({});
    const tree = await montar(LIDER_BIENVENIDA, visitante, ficha);
    await act(async () => { boton(tree, 'ficha-asignar').props.onPress(); });
    await act(async () => { await Promise.resolve(); });
    expect(textos(tree)).toContain('Marcela Quintana Rojas: se abre un caso de seguimiento y a quien elijas le llega un aviso (en la app y, si la tiene en el teléfono, también ahí).');
    const marta = tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function'
      && n.findAll((m) => (m.type as any) === 'Text').some((m) => plano(m.props.children) === 'Marta Comité'))[0];
    await act(async () => { marta.props.onPress(); });
    await act(async () => { await boton(tree, 'responsable-confirmar').props.onPress(); });
    expect(asignarSeguimientoVisita).toHaveBeenCalledWith(82, 5, { reasignar: false });
    expect(textos(tree)).toContain('Seguimiento asignado: se le avisó a quien lo lleva.');
    expect((getFichaVisita as jest.Mock).mock.calls.length).toBe(2);
  });

  it('asignar muestra el motivo del backend si falla («ya tiene un seguimiento abierto…») y deja el diálogo abierto', async () => {
    (asignarSeguimientoVisita as jest.Mock).mockRejectedValue({
      response: { status: 400, data: { detail: 'Esta visita ya tiene un seguimiento abierto (lo lleva Marta Comité).' } },
    });
    const tree = await montar(LIDER_BIENVENIDA, visitante, ficha);
    await act(async () => { boton(tree, 'ficha-asignar').props.onPress(); });
    await act(async () => { await Promise.resolve(); });
    const pastor = tree.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function'
      && n.findAll((m) => (m.type as any) === 'Text').some((m) => plano(m.props.children) === 'Pastor Test'))[0];
    await act(async () => { pastor.props.onPress(); });
    await act(async () => { await boton(tree, 'responsable-confirmar').props.onPress(); });
    expect(textos(tree)).toContain('Esta visita ya tiene un seguimiento abierto (lo lleva Marta Comité).');
  });

  it('con seguimiento abierto ofrece «Reasignar» y no «Asignar»', async () => {
    const tree = await montar(LIDER_BIENVENIDA, visitante, { ...ficha, seguimiento: abierto });
    expect(boton(tree, 'ficha-reasignar')).toBeDefined();
    expect(boton(tree, 'ficha-asignar')).toBeUndefined();
  });

  it('«Borrar sus datos» pide confirmación con los textos de la web y solo borra si se confirma', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (revocarConsentimientoVisita as jest.Mock).mockResolvedValue(undefined);
    const tree = await montar(LIDER_BIENVENIDA, visitante, ficha, { membresia: ['ver', 'editar'] });
    await act(async () => { boton(tree, 'ficha-borrar').props.onPress(); });
    expect(revocarConsentimientoVisita).not.toHaveBeenCalled();
    const [titulo, mensaje, botones] = alerta.mock.calls[0] as any;
    expect(titulo).toBe('Borrar los datos de la visita');
    expect(mensaje).toContain('Marcela Quintana Rojas pidió que borren sus datos. Se borran ahora: su ficha, su contacto, su seguimiento y sus peticiones de oración.');
    expect(mensaje).toContain('Esto no se puede deshacer.');
    // Cancelar no hace nada; confirmar borra y vuelve atrás.
    expect(botones[0].text).toBe('Cancelar');
    await act(async () => { await botones[1].onPress(); });
    expect(revocarConsentimientoVisita).toHaveBeenCalledWith(82);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('«Borrar sus datos» no se ofrece sin permiso de editar la membresía', async () => {
    const tree = await montar(LIDER_BIENVENIDA, visitante, ficha, { membresia: ['ver'] });
    expect(boton(tree, 'ficha-borrar')).toBeUndefined();
  });
});
