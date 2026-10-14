import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  // Como en la app: al enfocar la pantalla se carga la lista.
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../hooks/useRefreshOnRestore', () => ({ useRefreshOnRestore: () => {} }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../api/pastoral', () => ({
  crearPeticion: jest.fn(),
  eliminarPeticion: jest.fn(),
  listarPeticiones: jest.fn(async () => []),
  reabrirPeticion: jest.fn(),
  responderPeticion: jest.fn(),
  resumenPeticiones: jest.fn(async () => ({ orando: 0, respondidas_mes: 0 })),
}));

import { listarPeticiones } from '../api/pastoral';
import PeticionesScreen from '../screens/peticiones/PeticionesScreen';

describe('PeticionesScreen: lo que se le pide a quien anota', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('bajo "Motivo" pide términos generales y sin diagnósticos (política de privacidad v2)', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<PeticionesScreen />);
    });
    const ayuda = tree.root.findAll(n => n.props.testID === 'peticion-motivo-ayuda')[0];
    expect(ayuda).toBeDefined();
    expect(String(ayuda.props.children).trim()).toBe(
      'Basta en términos generales: «por su salud», «por su familia». No anote diagnósticos.',
    );
  });
});

describe('PeticionesScreen: qué puede hacer cada quien con cada petición', () => {
  const base = {
    miembro: null, miembro_nombre: null, fecha: '2026-10-12', visibilidad: 'congregacion',
    consentimiento_publicar: true, estado: 'orando', fecha_respuesta: null, testimonio: '', created_at: '2026-10-12T10:00:00Z',
  };
  const propia = { ...base, id: 1, por_quien: 'Mi mamá', motivo: 'Por su salud', registrada_por: 'Yo', puedo_gestionar: true };
  const ajena = { ...base, id: 2, por_quien: 'La familia Pérez', motivo: 'Por trabajo', registrada_por: 'Otra', puedo_gestionar: false };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const montar = async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<PeticionesScreen />);
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    return tree;
  };

  // Los textos de las hojas (<Text>) de lo que se ve en pantalla.
  const textos = (tree: renderer.ReactTestRenderer): string[] =>
    tree.root
      .findAll(n => (n.type as any) === 'Text')
      .map(n => [n.props.children].flat(Infinity).filter(x => typeof x === 'string').join(''));
  const cuantos = (tree: renderer.ReactTestRenderer, texto: string) => textos(tree).filter(t => t === texto).length;

  it('"¡Respondida!" y "Eliminar" solo en las que puede gestionar (las propias, o todas si lidera la intercesión)', async () => {
    (listarPeticiones as jest.Mock).mockResolvedValue([propia, ajena]);
    const tree = await montar();
    expect(textos(tree)).toEqual(expect.arrayContaining(['Mi mamá', 'La familia Pérez'])); // las ve las dos...
    expect(cuantos(tree, '¡Respondida!')).toBe(1); // ...pero solo puede responder y eliminar la suya
    expect(cuantos(tree, 'Eliminar')).toBe(1);
  });

  it('el líder de intercesión (puedo_gestionar en todas) puede responder y eliminar cualquiera', async () => {
    (listarPeticiones as jest.Mock).mockResolvedValue([propia, { ...ajena, puedo_gestionar: true }]);
    const tree = await montar();
    expect(cuantos(tree, '¡Respondida!')).toBe(2);
    expect(cuantos(tree, 'Eliminar')).toBe(2);
  });

  it('una respondida ajena no ofrece "Volver a en oración"; la propia sí', async () => {
    (listarPeticiones as jest.Mock).mockResolvedValue([
      { ...propia, estado: 'respondida', fecha_respuesta: '2026-10-13' },
      { ...ajena, estado: 'respondida', fecha_respuesta: '2026-10-13' },
    ]);
    const tree = await montar();
    expect(cuantos(tree, 'Volver a «en oración»')).toBe(1); // solo la suya
  });
});
