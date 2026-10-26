import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../api/grupos', () => ({
  listarGrupos: jest.fn(async () => ({ results: [{ id: 3, nombre: 'Jóvenes' }] })),
}));

const CULTO = {
  id: 7, nombre: 'Culto de domingo', tipo: 'culto', dia_semana: 6, dia_semana_display: 'Domingo',
  hora: '10:00:00', lugar: '', grupo: null, grupo_nombre: null, activa: true,
};

jest.mock('../api/asistencia', () => {
  const real = jest.requireActual('../api/asistencia');
  return {
    ...real,
    listarReunionesActivas: jest.fn(),
    obtenerAsistenciaDelDia: jest.fn(async (_id: number, fecha: string) => ({
      fecha, guardada: false, presentes: 0, visitas_sin_ficha: null, visitas: [],
      personas: [{ id: 1, nombre: 'Ana Pérez', presente: false, familia: null }],
    })),
    guardarAsistenciaDelDia: jest.fn(async (_id: number, p: any) => ({
      fecha: p.fecha, guardada: true, presentes: 0, visitas_sin_ficha: null, visitas: [], personas: [],
    })),
    crearReunion: jest.fn(),
    editarReunion: jest.fn(),
    obtenerAusentes: jest.fn(async () => ({ suficientes: false, marcadas: 0, personas: [] })),
    listarResponsablesSeguimiento: jest.fn(async () => []),
  };
});

import {
  crearReunion,
  editarReunion,
  guardarAsistenciaDelDia,
  listarReunionesActivas,
} from '../api/asistencia';
import { usePermissionsStore } from '../store/permissionsStore';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';

const listar = listarReunionesActivas as jest.Mock;

const esperar = async () => {
  await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
};

const montar = async (puede: string[]) => {
  usePermissionsStore.setState({ puede, isSuperAdmin: false });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AsistenciaScreen />); });
  await esperar();
  return tree;
};

const textos = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => (n.type as any) === 'Text')
    .map((n) => String([n.props.children].flat(Infinity).join('')));

const porId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && (typeof n.props.onPress === 'function' || n.props.onChangeText))[0];

const tocar = async (tree: renderer.ReactTestRenderer, id: string) => {
  const n = porId(tree, id);
  if (!n) throw new Error(`No está ${id}`);
  await act(async () => { n.props.onPress(); });
  await esperar();
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('Asistencia sin reuniones: se crean desde la app, no desde la web', () => {
  beforeEach(() => listar.mockResolvedValue([]));

  it('nunca manda a la web', async () => {
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    expect(textos(tree).join(' ')).not.toMatch(/web/i);
  });

  it('quien configura ve «Nueva reunión» y crea el culto con los valores de la web', async () => {
    (crearReunion as jest.Mock).mockResolvedValue(CULTO);
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    expect(textos(tree)).toContain('Crea la primera: el culto del domingo, la escuela dominical, la reunión de varones…');

    await tocar(tree, 'crear-primera-reunion');
    expect(textos(tree)).toContain('Nueva reunión');
    // Sin nombre no se puede crear.
    expect(porId(tree, 'reunion-guardar').props.disabled).toBe(true);

    await act(async () => { porId(tree, 'reunion-nombre').props.onChangeText('  Culto de domingo '); });
    await tocar(tree, 'reunion-guardar');

    expect(crearReunion).toHaveBeenCalledWith({
      nombre: 'Culto de domingo', tipo: 'culto', dia_semana: 6, hora: '11:00', lugar: '', grupo: null,
    });
    // Recarga la lista para que aparezca.
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('se puede elegir el día y el grupo', async () => {
    (crearReunion as jest.Mock).mockResolvedValue({ ...CULTO, id: 8, dia_semana: 4, grupo: 3 });
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    await tocar(tree, 'crear-primera-reunion');
    await act(async () => { porId(tree, 'reunion-nombre').props.onChangeText('Jóvenes'); });
    await tocar(tree, 'reunion-dia-4');
    await tocar(tree, 'reunion-grupo');
    const jovenes = tree.root.findAll(
      (n) => typeof n.props.onPress === 'function'
        && n.findAll((t) => (t.type as any) === 'Text' && t.props.children === 'Jóvenes').length > 0
    )[0];
    await act(async () => { jovenes.props.onPress(); });
    await tocar(tree, 'reunion-guardar');
    expect(crearReunion).toHaveBeenCalledWith(expect.objectContaining({ dia_semana: 4, grupo: 3 }));
  });

  it('si el backend rechaza, el error queda en el formulario', async () => {
    (crearReunion as jest.Mock).mockRejectedValue({ response: { status: 400, data: { hora: ['Formato de hora inválido.'] } } });
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    await tocar(tree, 'crear-primera-reunion');
    await act(async () => { porId(tree, 'reunion-nombre').props.onChangeText('Culto'); });
    await tocar(tree, 'reunion-guardar');
    expect(textos(tree)).toContain('Formato de hora inválido.');
  });

  it('quien solo marca no ve el botón y se le dice quién las crea', async () => {
    const tree = await montar(['asistencia.marcar']);
    expect(porId(tree, 'crear-primera-reunion')).toBeUndefined();
    expect(textos(tree)).toContain('Las crean el pastor, la administración o quienes lideran la asistencia.');
  });
});

describe('Asistencia con reuniones: crear otra y editar', () => {
  beforeEach(() => listar.mockResolvedValue([CULTO]));

  const abrirSelector = async (tree: renderer.ReactTestRenderer) => {
    const selector = tree.root.findAll((n) => n.props.accessibilityLabel === 'Elegir reunión' && n.props.onPress)[0];
    await act(async () => { selector.props.onPress(); });
  };

  it('quien configura abre el selector aunque haya una sola, y ahí está «Nueva reunión» y el lápiz', async () => {
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    await abrirSelector(tree);
    expect(porId(tree, 'nueva-reunion')).toBeDefined();
    expect(porId(tree, 'editar-reunion-7')).toBeDefined();
  });

  it('editar manda solo a esa reunión, con lo que tenía', async () => {
    (editarReunion as jest.Mock).mockResolvedValue({ ...CULTO, hora: '11:30:00' });
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    await abrirSelector(tree);
    await tocar(tree, 'editar-reunion-7');
    expect(textos(tree)).toContain('Editar reunión');
    await tocar(tree, 'reunion-guardar');
    expect(editarReunion).toHaveBeenCalledWith(7, {
      nombre: 'Culto de domingo', tipo: 'culto', dia_semana: 6, hora: '10:00', lugar: '', grupo: null,
    });
  });

  it('quien solo marca no tiene ni «Nueva reunión» ni el lápiz', async () => {
    // Con dos reuniones el selector sí se abre (para elegir), pero sin las acciones de configurar.
    listar.mockResolvedValue([CULTO, { ...CULTO, id: 9, nombre: 'Oración', dia_semana: 2, dia_semana_display: 'Miércoles' }]);
    const tree = await montar(['asistencia.marcar']);
    await abrirSelector(tree);
    expect(textos(tree)).toContain('Elegir reunión');
    expect(porId(tree, 'nueva-reunion')).toBeUndefined();
    expect(porId(tree, 'editar-reunion-7')).toBeUndefined();
  });
});

describe('Marcar una fecha que no es el día de la reunión', () => {
  beforeEach(() => listar.mockResolvedValue([CULTO]));

  const elegirFecha = async (tree: renderer.ReactTestRenderer, d: Date) => {
    const btn = tree.root.findAll((n) => n.props.accessibilityLabel === 'Cambiar fecha' && n.props.onPress)[0];
    await act(async () => { btn.props.onPress(); });
    const picker = tree.root.findAll((n) => (n.type as any) === 'DateTimePicker')[0];
    await act(async () => { picker.props.onChange({ type: 'set' }, d); });
    await esperar();
  };

  const guardarBtn = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAll((n) => typeof n.props.onPress === 'function'
      && n.findAll((t) => (t.type as any) === 'Text'
        && String([t.props.children].flat(Infinity).join('')).startsWith('Guardar asistencia')).length > 0)[0];

  it('avisa, no deja guardar hasta confirmar, y al confirmar manda confirmar_otro_dia', async () => {
    const tree = await montar(['asistencia.marcar']);
    // Un martes que ya pasó.
    await elegirFecha(tree, new Date(2026, 9, 20, 12));
    expect(porId(tree, 'confirmar-otro-dia')).toBeDefined();
    expect(guardarBtn(tree).props.disabled).toBe(true);

    await tocar(tree, 'confirmar-otro-dia');
    expect(guardarBtn(tree).props.disabled).toBe(false);
    await act(async () => { guardarBtn(tree).props.onPress(); });
    await esperar();
    expect(guardarAsistenciaDelDia).toHaveBeenCalledWith(7, expect.objectContaining({
      fecha: '2026-10-20', confirmar_otro_dia: true,
    }));
  });

  it('en el día de la reunión no hay aviso ni se manda la confirmación', async () => {
    const tree = await montar(['asistencia.marcar']);
    expect(porId(tree, 'confirmar-otro-dia')).toBeUndefined();
    await act(async () => { guardarBtn(tree).props.onPress(); });
    await esperar();
    const payload = (guardarAsistenciaDelDia as jest.Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('confirmar_otro_dia');
  });
});
