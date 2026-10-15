/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// App.tsx arrastra casi toda la app (Firebase, Notifee, AsyncStorage, device-info, safe-area...). Jest no
// tiene los módulos nativos, así que se mockean aquí: el test es hermético (sin red, sin pods) y
// sigue montando el árbol REAL de navegación (@react-navigation) y las pantallas de Auth.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@react-native-firebase/messaging', () => {
  const instancia = {
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    requestPermission: jest.fn().mockResolvedValue(1),
    registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
    getToken: jest.fn().mockResolvedValue('token-de-prueba'),
    isDeviceRegisteredForRemoteMessages: true,
  };
  const messaging = () => instancia;
  messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messaging };
});
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue('default'),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
}));
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  types: { pdf: 'pdf', doc: 'doc', docx: 'docx', images: 'images' },
}));
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getVersion: () => '0.0.0-test',
    getBuildNumber: () => '0',
    getUniqueId: jest.fn().mockResolvedValue('dispositivo-de-prueba'),
  },
}));

import 'react-native-gesture-handler/jestSetup';
import App from '../App';

test('renders correctly', async () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  // checkAuth() lee AsyncStorage (vacío en el test) y la sesión pasa de «cargando» a «sin sesión».
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
  });
  // Sin sesión, App monta el AuthNavigator real: la pantalla de ingreso.
  expect(JSON.stringify(tree.toJSON())).toContain('Olvidé mi contraseña');
  // Desmontar y vaciar timers: si no, las animaciones del stack siguen corriendo cuando Jest ya
  // desmontó el entorno y tumban el worker.
  await ReactTestRenderer.act(async () => {
    tree.unmount();
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});
