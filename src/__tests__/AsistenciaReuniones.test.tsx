import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
// Con qué parámetros se abrió la pantalla (desde «Pasar lista» de un grupo llega la reunión).
const mockRouteParams: { current: any } = { current: undefined };
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams.current }),
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
    listarReuniones: jest.fn(),
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
    eliminarReunion: jest.fn(),
    obtenerInforme: jest.fn(),
  };
});

import {
  crearReunion,
  editarReunion,
  obtenerInforme,
  guardarAsistenciaDelDia,
  obtenerAsistenciaDelDia,
  listarReuniones,
} from '../api/asistencia';
import { usePermissionsStore } from '../store/permissionsStore';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';

const listar = listarReuniones as jest.Mock;

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

describe('Invitados que el grupo marcó desde sus eventos', () => {
  const GRUPAL = { ...CULTO, grupo: 3, grupo_nombre: 'Jóvenes' };
  const original = (obtenerAsistenciaDelDia as jest.Mock).getMockImplementation();
  afterEach(() => (obtenerAsistenciaDelDia as jest.Mock).mockImplementation(original));

  it('se muestran aparte, sin casilla, y no entran en el conteo de la lista', async () => {
    listar.mockResolvedValue([GRUPAL]);
    (obtenerAsistenciaDelDia as jest.Mock).mockImplementation(async (_id: number, fecha: string) => ({
      fecha, guardada: true, presentes: 2, visitas_sin_ficha: null, visitas: [],
      personas: [{ id: 1, nombre: 'Ana Pérez', presente: true, familia: null }],
      tambien_vinieron: [{ id: 9, nombre: 'Pedro Soto' }],
    }));
    const tree = await montar(['asistencia.marcar']);
    const caja = tree.root.findAll((n) => n.props.testID === 'tambien-vinieron')[0];
    expect(caja).toBeDefined();
    expect(textos(tree)).toContain('Pedro Soto');
    // El botón cuenta solo a los de la lista: guardar no toca a Pedro.
    expect(textos(tree)).toContain('Guardar asistencia (1)');
  });

  it('sin invitados no aparece la caja', async () => {
    listar.mockResolvedValue([GRUPAL]);
    const tree = await montar(['asistencia.marcar']);
    expect(tree.root.findAll((n) => n.props.testID === 'tambien-vinieron')).toHaveLength(0);
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

describe('El líder de un grupo pasa lista de la reunión de su grupo', () => {
  const DEL_GRUPO = {
    id: 9, nombre: 'Reunión de jóvenes', tipo: 'reunion', dia_semana: 4, dia_semana_display: 'Viernes',
    hora: '20:00:00', lugar: '', grupo: 3, grupo_nombre: 'Jóvenes', activa: true,
    puedo_seguimiento: true, puedo_configurar: true,
  };
  afterEach(() => { mockRouteParams.current = undefined; });

  it('desde «Pasar lista» del grupo abre esa reunión, no la primera', async () => {
    listar.mockResolvedValue([{ ...CULTO, puedo_seguimiento: true, puedo_configurar: true }, DEL_GRUPO]);
    mockRouteParams.current = { reunionId: 9 };
    const tree = await montar(['asistencia.marcar']);
    expect(textos(tree)).toContain('Reunión de jóvenes');
    expect((obtenerAsistenciaDelDia as jest.Mock).mock.calls[0][0]).toBe(9);
  });

  it('desde el aviso «¿Pasaste lista?» abre la fecha del aviso, no el último viernes', async () => {
    listar.mockResolvedValue([{ ...CULTO, puedo_seguimiento: true, puedo_configurar: true }, DEL_GRUPO]);
    mockRouteParams.current = { reunionId: 9, fecha: '2026-10-02' };
    await montar(['asistencia.marcar']);
    expect((obtenerAsistenciaDelDia as jest.Mock).mock.calls.at(-1)).toEqual([9, '2026-10-02']);
  });

  it('sin rol de asistencia ve «No han venido» y edita la de su grupo, pero no crea reuniones de la iglesia', async () => {
    listar.mockResolvedValue([DEL_GRUPO]);
    const tree = await montar([]);
    expect(porId(tree, 'tab-ausentes')).toBeDefined();
    // Con una sola reunión, el selector se abre igual porque la puede editar.
    const elegir = tree.root.findAll((n) => n.props.accessibilityLabel === 'Elegir reunión' && n.props.onPress)[0];
    await act(async () => { elegir.props.onPress(); });
    expect(porId(tree, 'editar-reunion-9')).toBeDefined();
    expect(porId(tree, 'nueva-reunion')).toBeUndefined();
  });
});

describe('Tema del día, reuniones pausadas e informe del mes (fase 3, igual que la web)', () => {
  const CON_PERMISOS = { ...CULTO, puedo_seguimiento: true, puedo_configurar: true };

  it('el tema se guarda junto con la lista', async () => {
    listar.mockResolvedValue([CON_PERMISOS]);
    (guardarAsistenciaDelDia as jest.Mock).mockResolvedValue({
      fecha: '2026-10-25', guardada: true, presentes: 0, visitas_sin_ficha: null, visitas: [], personas: [], tema: 'Efesios 5',
    });
    const tree = await montar(['asistencia.marcar']);
    await act(async () => { porId(tree, 'tema-del-dia').props.onChangeText(' Efesios 5 '); });
    const guardarBtn = tree.root.findAll((n) => typeof n.props.onPress === 'function' &&
      textos({ root: n } as any).some((t) => t.startsWith('Guardar asistencia')))[0];
    await act(async () => { guardarBtn.props.onPress(); });
    expect((guardarAsistenciaDelDia as jest.Mock).mock.calls[0][1]).toMatchObject({ tema: 'Efesios 5' });
  });

  it('una pausada no se marca: se avisa y se reactiva desde ahí', async () => {
    listar.mockResolvedValue([{ ...CON_PERMISOS, activa: false }]);
    (editarReunion as jest.Mock).mockResolvedValue({ ...CON_PERMISOS, activa: true });
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    expect(textos(tree).join(' ')).toMatch(/está pausada: no aparece para pasar lista/);
    expect(porId(tree, 'tema-del-dia')).toBeUndefined();
    await tocar(tree, 'reactivar-reunion');
    expect(editarReunion).toHaveBeenCalledWith(7, { activa: true });
  });

  it('a quien no puede configurarla, una pausada no le aparece', async () => {
    listar.mockResolvedValue([{ ...CULTO, activa: false, puedo_configurar: false }]);
    const tree = await montar(['asistencia.marcar']);
    expect(textos(tree)).toContain('Aún no hay reuniones');
  });

  it('el formulario de una reunión la pausa o la quita', async () => {
    listar.mockResolvedValue([CON_PERMISOS]);
    (editarReunion as jest.Mock).mockResolvedValue({ ...CON_PERMISOS, activa: false });
    const tree = await montar(['asistencia.marcar', 'asistencia.configurar']);
    const elegir = tree.root.findAll((n) => n.props.accessibilityLabel === 'Elegir reunión' && n.props.onPress)[0];
    await act(async () => { elegir.props.onPress(); });
    await tocar(tree, 'editar-reunion-7');
    await tocar(tree, 'reunion-pausar');
    expect(editarReunion).toHaveBeenCalledWith(7, { activa: false });
  });

  it('el informe del mes: una pestaña más para quien lleva el seguimiento', async () => {
    listar.mockResolvedValue([CON_PERMISOS]);
    (obtenerInforme as jest.Mock).mockResolvedValue({ mes: '2026-10', reuniones: [{
      reunion_id: 7, reunion: 'Culto de domingo', veces: 4, promedio_total: 60, promedio_hermanos: 54,
      visitas_con_ficha: 3, visitas_sin_ficha: 2, maximo: 70,
    }] });
    const tree = await montar(['asistencia.marcar', 'asistencia.seguimiento']);
    await tocar(tree, 'tab-informe');
    const t = textos(tree);
    expect(t).toEqual(expect.arrayContaining(['Culto de domingo', '4', 'veces', '54', '3 de 5']));
    expect(obtenerInforme).toHaveBeenCalled();
  });

  it('sin seguimiento no hay pestaña de informe', async () => {
    listar.mockResolvedValue([CULTO]);
    const tree = await montar(['asistencia.marcar']);
    expect(porId(tree, 'tab-informe')).toBeUndefined();
  });
});
