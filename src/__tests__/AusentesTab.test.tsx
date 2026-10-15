import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('../api/asistencia', () => {
  const real = jest.requireActual('../api/asistencia');
  return {
    ...real,
    obtenerAusentes: jest.fn(),
    listarResponsablesSeguimiento: jest.fn(),
    asignarSeguimientoAusente: jest.fn(),
  };
});

import {
  asignarSeguimientoAusente, listarResponsablesSeguimiento, obtenerAusentes,
} from '../api/asistencia';
import AusentesTab from '../screens/asistencia/AusentesTab';

const reunion: any = { id: 7, nombre: 'Culto de domingo', tipo: 'culto', dia_semana: 6, activa: true };

const sinSeguimiento = {
  id: 11, nombre: 'Marcela Quintana', telefono: '+56912345678', no_contactar: false,
  ultima_asistencia: '2026-09-13', seguimiento: null,
};
const conSeguimiento = {
  id: 12, nombre: 'Pedro Soto', telefono: null, no_contactar: false, ultima_asistencia: null,
  seguimiento: { id: 90, estado: 'en_progreso', estado_display: 'En progreso', responsable: 'Ana Pérez' },
};
const noContactar = {
  id: 13, nombre: 'Rosa Díaz', telefono: null, no_contactar: true, ultima_asistencia: '2026-08-30', seguimiento: null,
};

// El texto tal como se ve: une cadenas, números y <Text> anidados de cada <Text> de más afuera.
const plano = (hijos: any): string =>
  [hijos].flat(Infinity).map((h: any) => {
    if (typeof h === 'string' || typeof h === 'number') return String(h);
    if (h && h.props) return plano(h.props.children);
    return '';
  }).join('');
const textos = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root
    .findAll((n) => (n.type as any) === 'Text' && !(n.parent && (n.parent.type as any) === 'Text'))
    .map((n) => plano(n.props.children));

const montar = async (onAviso = jest.fn()) => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<AusentesTab reunion={reunion} onAviso={onAviso} />);
  });
  await act(async () => { await Promise.resolve(); });
  return { tree, onAviso };
};

const botonAsignar = (tree: renderer.ReactTestRenderer, nombre: string) =>
  tree.root.findAll((n) => n.props.accessibilityLabel === `Asignar seguimiento a ${nombre}` && typeof n.props.onPress === 'function')[0];

describe('AusentesTab: quién faltó y su seguimiento (mismos textos que la web)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    (listarResponsablesSeguimiento as jest.Mock).mockResolvedValue([
      { id: 1, nombre: 'Ana Pérez' }, { id: 2, nombre: 'Luis Rojas' },
    ]);
  });

  it('pide las últimas 3 reuniones marcadas', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [] });
    await montar();
    expect(obtenerAusentes).toHaveBeenCalledWith(7, 3);
  });

  it('con pocas reuniones marcadas no acusa a nadie y dice cuántas van', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: false, marcadas: 1, personas: [] });
    const { tree } = await montar();
    expect(textos(tree)).toContain('Para saber quién no ha venido hace falta marcar por nombre al menos 3 reuniones. Van 1.');
  });

  it('si todos vinieron, lo dice', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [] });
    const { tree } = await montar();
    expect(textos(tree)).toContain('Todos vinieron al menos a una de las últimas 3 reuniones.');
  });

  it('cada persona muestra su estado: sin seguimiento (botón), con seguimiento (quién lo lleva) o que no la contacten', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({
      suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [sinSeguimiento, conSeguimiento, noContactar],
    });
    const { tree } = await montar();
    const t = textos(tree);
    expect(t).toContain('No vinieron a ninguna de las últimas 3 reuniones marcadas (desde el 13-09-2026):');
    expect(t).toContain('Vino por última vez el 13-09-2026 · +56912345678');
    expect(t).toContain('No tiene asistencia registrada');
    expect(t).toContain('Lo lleva Ana Pérez · En progreso');
    expect(t).toContain('Pidió que no la contacten');
    // El botón solo aparece donde se puede asignar: ni con seguimiento ni con "no la contacten".
    expect(botonAsignar(tree, 'Marcela Quintana')).toBeDefined();
    expect(botonAsignar(tree, 'Pedro Soto')).toBeUndefined();
    expect(botonAsignar(tree, 'Rosa Díaz')).toBeUndefined();
    expect(t.filter((x) => x === 'Asignar seguimiento')).toHaveLength(1);
  });

  const abrirYElegir = async (tree: renderer.ReactTestRenderer) => {
    await act(async () => { botonAsignar(tree, 'Marcela Quintana').props.onPress(); });
    await act(async () => { await Promise.resolve(); });
    // Un nodo por opción (el más externo), elegido por su nombre.
    const opcion = (nombre: string) => tree.root.findAll((n) =>
      n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function'
      && n.findAll((m) => (m.type as any) === 'Text').some((m) => plano(m.props.children) === nombre))[0];
    await act(async () => { opcion('Luis Rojas').props.onPress(); });
  };

  it('asignar: abre el caso con la persona, el responsable y las 3 reuniones, avisa y recarga', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [sinSeguimiento] });
    (asignarSeguimientoAusente as jest.Mock).mockResolvedValue({ seguimiento: { id: 5 } });
    const { tree, onAviso } = await montar();
    await abrirYElegir(tree);
    expect(textos(tree)).toContain('Se abre un caso de seguimiento para Marcela Quintana: no vino a las últimas 3 reuniones de Culto de domingo.');
    const confirmar = tree.root.findByProps({ testID: 'responsable-confirmar' });
    await act(async () => { await confirmar.props.onPress(); });
    expect(asignarSeguimientoAusente).toHaveBeenCalledWith(7, { miembro_id: 11, responsable_id: 2 });
    expect(onAviso).toHaveBeenCalledWith('Seguimiento asignado a Luis Rojas. Le llegó un aviso al teléfono.');
    expect(obtenerAusentes).toHaveBeenCalledTimes(2); // recargó la lista
  });

  it('si ya tenía un seguimiento abierto (409) avisa "ya tiene un seguimiento abierto" y recarga, sin error', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [sinSeguimiento] });
    (asignarSeguimientoAusente as jest.Mock).mockRejectedValue({ response: { status: 409, data: { detail: 'Esta persona ya tiene un seguimiento abierto.' } } });
    const { tree, onAviso } = await montar();
    await abrirYElegir(tree);
    await act(async () => { await tree.root.findByProps({ testID: 'responsable-confirmar' }).props.onPress(); });
    expect(onAviso).toHaveBeenCalledWith('Marcela Quintana ya tiene un seguimiento abierto.');
    expect(obtenerAusentes).toHaveBeenCalledTimes(2);
  });

  it('otro error del servidor se muestra en el diálogo y no cierra ni recarga', async () => {
    (obtenerAusentes as jest.Mock).mockResolvedValue({ suficientes: true, marcadas: 3, desde: '2026-09-13', personas: [sinSeguimiento] });
    (asignarSeguimientoAusente as jest.Mock).mockRejectedValue({ response: { status: 400, data: { responsable_id: ['Ese responsable no es de esta iglesia.'] } } });
    const { tree, onAviso } = await montar();
    await abrirYElegir(tree);
    await act(async () => { await tree.root.findByProps({ testID: 'responsable-confirmar' }).props.onPress(); });
    expect(textos(tree)).toContain('Ese responsable no es de esta iglesia.');
    expect(onAviso).not.toHaveBeenCalled();
    expect(obtenerAusentes).toHaveBeenCalledTimes(1);
  });
});
