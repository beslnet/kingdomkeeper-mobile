import api from '../api/api';
import { getMe, getMisIglesias, loginApi } from '../api/auth';
import { verificarTerminos } from '../api/legal';
import { useAuthStore } from '../store/authStore';
import { unregisterPushDevice, clearStoredPushToken } from '../services/pushNotifications';
import { getAccessToken, getRefreshToken } from '../utils/tokenStorage';
import { asyncStore, everythingStored, keychainStore, resetFakeStorage } from '../testUtils/fakeStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('../testUtils/fakeStorage').asyncStorageModule);
jest.mock('react-native-keychain', () => require('../testUtils/fakeStorage').keychainModule);
jest.mock('../api/api', () => ({ __esModule: true, default: { post: jest.fn() }, API_BASE_URL: 'http://test' }));
jest.mock('../api/auth');
jest.mock('../api/legal');
jest.mock('../services/pushNotifications', () => ({
  initializePushNotifications: jest.fn(() => Promise.resolve()),
  unregisterPushDevice: jest.fn(() => Promise.resolve()),
  clearStoredPushToken: jest.fn(() => Promise.resolve()),
}));

const KEYCHAIN_SERVICE = 'com.kingdomkeeper.mobile.refresh_token';
const post = api.post as jest.Mock;

beforeEach(() => {
  resetFakeStorage();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  (getMe as jest.Mock).mockResolvedValue({ id: 1, miembro_id: 9 });
  (getMisIglesias as jest.Mock).mockResolvedValue([{ id: 3, nombre: 'Iglesia' }]);
  (verificarTerminos as jest.Mock).mockResolvedValue({ todo_aceptado: true, documentos_pendientes: [] });
  useAuthStore.setState({ isLoggedIn: null, user: null, iglesias: [] });
});

describe('login', () => {
  it('guarda el refresh token en el Keychain y deja solo el access token en AsyncStorage', async () => {
    (loginApi as jest.Mock).mockResolvedValue({ access: 'acc', refresh: 'ref' });
    await useAuthStore.getState().login('u', 'p');
    expect(keychainStore.get(KEYCHAIN_SERVICE)?.password).toBe('ref');
    expect(asyncStore.get('access_token')).toBe('acc');
    expect(asyncStore.has('refresh_token')).toBe(false);
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('un 429 (límite de intentos) tiene su propio mensaje', async () => {
    (loginApi as jest.Mock).mockRejectedValue({ response: { status: 429, data: {} } });
    await expect(useAuthStore.getState().login('u', 'p')).rejects.toThrow(/Demasiados intentos/);
  });
});

describe('cerrar sesión', () => {
  beforeEach(async () => {
    (loginApi as jest.Mock).mockResolvedValue({ access: 'acc', refresh: 'ref' });
    await useAuthStore.getState().login('u', 'p');
    asyncStore.set('refresh_token', 'copia-vieja-1.1.3');
    post.mockResolvedValue({});
  });

  it('revoca el refresh token en el servidor', async () => {
    await useAuthStore.getState().logout();
    expect(post).toHaveBeenCalledWith('/api/token/logout/', { refresh: 'ref' }, expect.anything());
  });

  it('borra TODO: access token, Keychain, copia vieja y el token de push', async () => {
    await useAuthStore.getState().logout();
    expect(everythingStored()).toEqual([]);
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(unregisterPushDevice).toHaveBeenCalled();
    expect(clearStoredPushToken).toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sin red igual cierra la sesión local por completo', async () => {
    post.mockRejectedValue(new Error('Network Error'));
    await useAuthStore.getState().logout();
    expect(everythingStored()).toEqual([]);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('expireSession (sesión ya vencida) limpia sin llamar al servidor', async () => {
    await useAuthStore.getState().expireSession();
    expect(post).not.toHaveBeenCalled();
    expect(everythingStored()).toEqual([]);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });
});

describe('checkAuth al abrir la app', () => {
  it('sesión de la 1.1.3: pasa el refresh token al Keychain y NO desloguea', async () => {
    asyncStore.set('access_token', 'acc');
    asyncStore.set('refresh_token', 'ref-1.1.3');
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(keychainStore.get(KEYCHAIN_SERVICE)?.password).toBe('ref-1.1.3');
    expect(asyncStore.has('refresh_token')).toBe(false);
  });

  it('sin red: conserva la sesión', async () => {
    asyncStore.set('access_token', 'acc');
    (getMe as jest.Mock).mockRejectedValue({ message: 'Network Error' });
    useAuthStore.setState({ isLoggedIn: true });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(asyncStore.get('access_token')).toBe('acc');
  });

  it('401 definitivo: limpia los tokens, no solo la bandera', async () => {
    asyncStore.set('access_token', 'acc');
    keychainStore.set(KEYCHAIN_SERVICE, { username: 'refresh_token', password: 'ref' });
    (getMe as jest.Mock).mockRejectedValue({ response: { status: 401 } });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(everythingStored()).toEqual([]);
  });

  // El Keychain de iOS sobrevive a desinstalar la app.
  it('sin access token borra un refresh token que haya quedado de una instalación anterior', async () => {
    keychainStore.set(KEYCHAIN_SERVICE, { username: 'refresh_token', password: 'huérfano' });
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(await getRefreshToken()).toBeNull();
  });
});
