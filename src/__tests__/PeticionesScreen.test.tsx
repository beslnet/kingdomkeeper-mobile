import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
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
