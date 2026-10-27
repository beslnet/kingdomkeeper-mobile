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
jest.mock('../api/asistencia', () => {
  const real = jest.requireActual('../api/asistencia');
  return {
    ...real,
    listarReuniones: jest.fn(async () => [
      { id: 7, nombre: 'Culto de domingo', tipo: 'culto', dia_semana: 6, dia_semana_display: 'Domingo', hora: '10:00:00', lugar: '', grupo: null, grupo_nombre: null, activa: true },
    ]),
    obtenerAsistenciaDelDia: jest.fn(async () => ({
      fecha: '2026-10-11', guardada: false, presentes: 0, visitas_sin_ficha: null, visitas: [],
      personas: [{ id: 1, nombre: 'Ana Pérez', presente: false, familia: null }],
    })),
    guardarAsistenciaDelDia: jest.fn(),
    obtenerAusentes: jest.fn(async () => ({ suficientes: false, marcadas: 1, personas: [] })),
    listarResponsablesSeguimiento: jest.fn(async () => []),
  };
});

import { obtenerAusentes } from '../api/asistencia';
import { usePermissionsStore } from '../store/permissionsStore';
import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';

const montar = async (puede: string[]) => {
  usePermissionsStore.setState({ puede, isSuperAdmin: false });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<AsistenciaScreen />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return tree;
};
const pestaña = (tree: renderer.ReactTestRenderer, id: string) => tree.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function')[0];

describe('AsistenciaScreen: la pestaña "No han venido" es de quien lidera la asistencia', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('quien solo marca (integrante de asistencia) no ve las pestañas ni llama a "ausentes"', async () => {
    const tree = await montar(['asistencia.marcar']);
    expect(pestaña(tree, 'tab-ausentes')).toBeUndefined();
    expect(obtenerAusentes).not.toHaveBeenCalled();
  });

  it('con asistencia.seguimiento (pastor, líder, líder de asistencia) la ve, y al tocarla carga los ausentes de la reunión', async () => {
    const tree = await montar(['asistencia.marcar', 'asistencia.seguimiento']);
    expect(pestaña(tree, 'tab-ausentes')).toBeDefined();
    await act(async () => { pestaña(tree, 'tab-ausentes').props.onPress(); });
    await act(async () => { await Promise.resolve(); });
    expect(obtenerAusentes).toHaveBeenCalledWith(7, 3);
  });

  it('en "No han venido" se esconde el botón de guardar y vuelve al volver a "Marcar"', async () => {
    const tree = await montar(['asistencia.marcar', 'asistencia.seguimiento']);
    const hayGuardar = () => tree.root.findAll((n) => (n.type as any) === 'Text'
      && String([n.props.children].flat(Infinity).join('')).startsWith('Guardar asistencia')).length > 0;
    expect(hayGuardar()).toBe(true);
    await act(async () => { pestaña(tree, 'tab-ausentes').props.onPress(); });
    expect(hayGuardar()).toBe(false);
    await act(async () => { pestaña(tree, 'tab-marcar').props.onPress(); });
    expect(hayGuardar()).toBe(true);
  });
});
