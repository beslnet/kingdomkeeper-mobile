import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import api from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { getAccessToken, getRefreshToken, saveAccessToken, saveRefreshToken } from '../utils/tokenStorage';
import { everythingStored, resetFakeStorage } from '../testUtils/fakeStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('../testUtils/fakeStorage').asyncStorageModule);
jest.mock('react-native-keychain', () => require('../testUtils/fakeStorage').keychainModule);
jest.mock('../services/pushNotifications', () => ({
  unregisterPushDevice: jest.fn(),
  clearStoredPushToken: jest.fn(),
}));

/** Una respuesta de error HTTP con la forma que axios entrega a los interceptores. */
function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  return new AxiosError(`HTTP ${status}`, 'ERR_BAD_REQUEST', config, null, {
    status,
    data,
    statusText: '',
    headers: {},
    config,
  });
}

let validAccess: string;
let calls: Array<{ url: string; auth?: string }>;
let refreshPost: jest.SpyInstance;

beforeEach(async () => {
  resetFakeStorage();
  jest.restoreAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  validAccess = 'access-NUEVO';
  calls = [];
  useAppStore.setState({ forceUpdateRequired: false, forceUpdateUrl: null });
  useAuthStore.setState({ isLoggedIn: true, user: { id: 1 }, iglesias: [] });

  // Sesión iniciada con un access token YA vencido y un refresh token vigente.
  await saveAccessToken('access-VIEJO');
  await saveRefreshToken('refresh-1');

  // "Servidor": solo acepta el access token vigente.
  api.defaults.adapter = async (config) => {
    const auth = config.headers?.Authorization as string | undefined;
    calls.push({ url: String(config.url), auth });
    if (String(config.url).includes('/api/token/') && !String(config.url).includes('refresh')) {
      throw httpError(config, 401, { detail: 'No active account found with the given credentials' });
    }
    if (auth !== `Bearer ${validAccess}`) throw httpError(config, 401);
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };

  // El refresh viaja por el axios "pelado" (no por la instancia), como en producción.
  refreshPost = jest.spyOn(axios, 'post').mockImplementation(async () => ({
    data: { access: validAccess, refresh: 'refresh-2' },
  }));
});

describe('refresh silencioso', () => {
  it('reintenta la petición con el token nuevo y guarda el refresh rotado en el Keychain', async () => {
    const res = await api.get('/api/auth/me/');
    expect(res.data).toEqual({ ok: true });
    expect(refreshPost).toHaveBeenCalledTimes(1);
    expect(refreshPost.mock.calls[0][1]).toEqual({ refresh: 'refresh-1' });
    expect(await getAccessToken()).toBe('access-NUEVO');
    expect(await getRefreshToken()).toBe('refresh-2');
  });

  // El backend rota el refresh token y revoca el anterior: un segundo refresh con el
  // mismo token recibe 401 y, sin esto, cerraba la sesión de un usuario con sesión válida.
  it('varias peticiones que reciben 401 a la vez comparten UN solo refresh', async () => {
    const results = await Promise.all([
      api.get('/api/a/'),
      api.get('/api/b/'),
      api.get('/api/c/'),
      api.get('/api/d/'),
    ]);
    expect(results.map((r) => r.data.ok)).toEqual([true, true, true, true]);
    expect(refreshPost).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('una petición cuyo 401 llega DESPUÉS de que otra ya refrescó usa el token nuevo sin otro refresh', async () => {
    const server = api.defaults.adapter as (c: InternalAxiosRequestConfig) => Promise<unknown>;
    let first = true;
    api.defaults.adapter = async (config) => {
      if (first) {
        first = false;
        // Mientras esta petición volaba con el token viejo, otra terminó de refrescar.
        await saveAccessToken('access-NUEVO');
        throw httpError(config, 401);
      }
      return server(config) as never;
    };
    const res = await api.get('/api/tardia/');
    expect(res.data.ok).toBe(true);
    expect(refreshPost).not.toHaveBeenCalled();
    expect(calls.map((c) => c.auth)).toEqual(['Bearer access-NUEVO']);
  });

  it('no reintenta más de una vez: si el token nuevo también da 401, falla sin bucle', async () => {
    validAccess = 'otro-distinto'; // el servidor no acepta ni el token que devuelve el refresh
    refreshPost.mockResolvedValue({ data: { access: 'access-NUEVO', refresh: 'refresh-2' } });
    await expect(api.get('/api/x/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshPost).toHaveBeenCalledTimes(1);
  });
});

describe('cuando el refresh falla', () => {
  it('401 del refresh (vencido o revocado): cierra la sesión y no deja NINGÚN token en el teléfono', async () => {
    refreshPost.mockRejectedValue(httpError({} as InternalAxiosRequestConfig, 401));
    await expect(api.get('/api/auth/me/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(everythingStored().filter((k) => k.includes('token') || k.startsWith('keychain'))).toEqual([]);
  });

  it('sin refresh token guardado: cierra la sesión', async () => {
    resetFakeStorage();
    await saveAccessToken('access-VIEJO');
    await expect(api.get('/api/auth/me/')).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('sin red al refrescar: NO cierra la sesión y los tokens siguen ahí', async () => {
    refreshPost.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    await expect(api.get('/api/auth/me/')).rejects.toMatchObject({ message: 'Network Error' });
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(await getRefreshToken()).toBe('refresh-1');
    expect(await getAccessToken()).toBe('access-VIEJO');
  });

  it('5xx al refrescar: NO cierra la sesión', async () => {
    refreshPost.mockRejectedValue(httpError({} as InternalAxiosRequestConfig, 503));
    await expect(api.get('/api/auth/me/')).rejects.toBeTruthy();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
    expect(await getRefreshToken()).toBe('refresh-1');
  });
});

describe('otras respuestas', () => {
  it('un 401 del login (contraseña incorrecta) no dispara refresh ni cierra la sesión', async () => {
    await expect(api.post('/api/token/', { username: 'x', password: 'y' })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshPost).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });

  it('el 426 del backend abre la pantalla de actualización con el link de la plataforma', async () => {
    api.defaults.adapter = async (config) => {
      throw httpError(config, 426, { store_url_ios: 'https://apps.apple.com/app/id6760925086', store_url_android: '' });
    };
    await expect(api.get('/api/auth/me/')).rejects.toMatchObject({ response: { status: 426 } });
    await new Promise((r) => setImmediate(r));
    expect(useAppStore.getState().forceUpdateRequired).toBe(true);
  });
});
