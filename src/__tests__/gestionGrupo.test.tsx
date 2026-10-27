import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { gestionDelGrupo } from '../utils/gestionGrupo';
import { tiposParaElegir } from '../api/eventos';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  createNavigationContainerRef: () => ({ isReady: () => false }),
  CommonActions: {},
}));
jest.mock('@react-native-firebase/messaging', () => ({}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../api/grupos', () => ({ listarGrupos: jest.fn(async () => ({ results: [] })) }));
jest.mock('../api/asistencia', () => ({
  ...jest.requireActual('../api/asistencia'),
  crearReunion: jest.fn(),
  editarReunion: jest.fn(),
}));

import ReunionSemanal from '../screens/grupos/ReunionSemanal';

/**
 * Quién gestiona un grupo lo decide el backend (iglesia/services/gestion_grupo.py): su líder y sus co-líderes
 * sin el rol «Líder», más el pastor y la administración; un «Líder» de otro grupo, no.
 */
describe('Quién gestiona el grupo', () => {
  const nadie = { isSuperAdmin: false, hasAnyRole: () => false, hasPermission: () => false, miembroId: 9 };

  it('manda lo que trae el backend, aunque el rol diga otra cosa', () => {
    const lider = { ...nadie, hasAnyRole: (r: string[]) => r.includes('leader'), hasPermission: () => true };
    // Un «Líder» de la iglesia que no está en el grupo: el backend dice que no.
    expect(gestionDelGrupo({ puedo_gestionar: false, puedo_administrar: false }, lider)).toEqual({
      gestiona: false, administra: false,
    });
    // Un co-líder sin rol: el backend dice que gestiona, pero no administra.
    expect(gestionDelGrupo({ puedo_gestionar: true, puedo_administrar: false }, nadie)).toEqual({
      gestiona: true, administra: false,
    });
  });

  it('con un backend anterior, la regla que usaba la app', () => {
    const grupo = { lider_id: 1, miembros: [{ miembro_id: 9, rol_en_grupo: 'co_leader' }] };
    expect(gestionDelGrupo(grupo, nadie).gestiona).toBe(true);
    expect(gestionDelGrupo(grupo, { ...nadie, miembroId: 5 }).gestiona).toBe(false);
  });
});

describe('Actividades del grupo', () => {
  it('no se ofrecen «Reunión» ni «Culto»: la reunión de cada semana va en «Reunión semanal»', () => {
    const tipos = tiposParaElegir().map((t) => t.label);
    expect(tipos).not.toContain('Reunión');
    expect(tipos).not.toContain('Culto');
    expect(tipos).toContain('Otra actividad');
  });

  it('al editar una actividad vieja de tipo «Reunión» la conserva', () => {
    expect(tiposParaElegir('reunion')[0]).toEqual({ value: 'reunion', label: 'Reunión' });
  });
});

const REUNION = {
  id: 7, nombre: 'Reunión de jóvenes', tipo: 'reunion' as const, dia_semana: 4, dia_semana_display: 'Viernes',
  hora: '20:00', lugar: 'Salón', total: 15, ultima: { fecha: '2026-10-23', presentes: 13 },
};

const montar = async (grupo: any, gestiona: boolean) => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<ReunionSemanal grupo={grupo} gestiona={gestiona} onCambio={jest.fn()} />); });
  return tree;
};
const textos = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((n) => (n.type as any) === 'Text').map((n) => String([n.props.children].flat(Infinity).join('')));
const porId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];

describe('Reunión semanal en el grupo', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('dice cuándo se reúnen y la última lista; «Pasar lista» abre la asistencia de esa reunión', async () => {
    const tree = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [REUNION] }, true);
    expect(textos(tree)).toContain('Se reúnen los viernes a las 20:00 · Salón');
    expect(textos(tree)).toContain('Última vez que se pasó lista: 23-10-2026 · 13 de 15');
    await act(async () => { porId(tree, 'pasar-lista-7').props.onPress(); });
    expect(mockNavigate).toHaveBeenCalledWith('PasarLista', { reunionId: 7, titulo: 'Reunión de jóvenes' });
  });

  it('un integrante la ve, sin «Pasar lista»', async () => {
    const tree = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [REUNION] }, false);
    expect(textos(tree)).toContain('Reunión de jóvenes');
    expect(porId(tree, 'pasar-lista-7')).toBeUndefined();
  });

  it('sin reunión, quien gestiona la configura; a un integrante no se le muestra nada', async () => {
    const tree = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [] }, true);
    await act(async () => { porId(tree, 'configurar-reunion').props.onPress(); });
    expect(textos(tree)).toContain('Reunión semanal de Jóvenes');
    const nombre = tree.root.findAll((n) => n.props.testID === 'reunion-nombre' && n.props.onChangeText)[0];
    expect(nombre.props.value).toBe('Reunión de Jóvenes');
    expect(tree.root.findAll((n) => n.props.testID === 'reunion-grupo-fijo').length).toBeGreaterThan(0);
    const vacio = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [] }, false);
    expect(vacio.toJSON()).toBeNull();
  });
});

describe('Aviso «¿Pasaste lista?»', () => {
  const { esAvisoPasarLista } = jest.requireActual('../utils/notificationNavigation');
  it('se reconoce por su payload', () => {
    expect(esAvisoPasarLista({ modulo: 'asistencia', entity: 'reunion', entity_id: 7, action: 'pasar_lista' })).toBe(true);
    expect(esAvisoPasarLista({ modulo: 'comunicaciones', entity: 'comunicacion', entity_id: 7 })).toBe(false);
  });
});

describe('Reunión semanal pausada y tema', () => {
  it('quien gestiona la ve pausada y sin «Pasar lista»; un integrante no la ve', async () => {
    const pausada = { ...REUNION, activa: false };
    const tree = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [pausada] }, true);
    expect(textos(tree)).toContain('REUNIÓN SEMANAL · PAUSADA');
    expect(porId(tree, 'pasar-lista-7')).toBeUndefined();
    const integrante = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [pausada] }, false);
    expect(integrante.toJSON()).toBeNull();
  });

  it('muestra el tema de la última vez', async () => {
    const tree = await montar({ id: 3, nombre: 'Jóvenes', reuniones: [{ ...REUNION, ultima: { ...REUNION.ultima, tema: 'Efesios 5' } }] }, true);
    expect(textos(tree)).toContain('Última vez que se pasó lista: 23-10-2026 · 13 de 15 · Efesios 5');
  });
});
