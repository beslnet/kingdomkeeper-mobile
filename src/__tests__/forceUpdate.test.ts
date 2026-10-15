import { Platform } from 'react-native';
import axios from 'axios';
import { checkForUpdate } from '../services/forceUpdate';
import { useAppStore } from '../store/appStore';
import { APP_VERSION, STORE_URLS } from '../version';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), create: jest.fn() } }));
// forceUpdate.ts toma la URL base de api.ts; se evita cargar el cliente HTTP real.
jest.mock('../api/api', () => ({ API_BASE_URL: 'https://app.kingdomkeeper.church' }));

const mockedGet = axios.get as jest.Mock;
const mockFetch = jest.fn();
const realFetch = global.fetch;

/** Una versión de tienda siempre mayor que la instalada, sin atarse al número de hoy. */
const NEWER = '99.0.0';
const forced = () => useAppStore.getState().forceUpdateRequired;

const lookupOk = (version: string) => ({
  ok: true,
  json: async () => ({ resultCount: 1, results: [{ version }] }),
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {}); // dlog en __DEV__
  useAppStore.setState({ forceUpdateRequired: false, forceUpdateUrl: null });
  mockFetch.mockReset();
  mockedGet.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('iOS — lookup del App Store', () => {
  beforeAll(() => {
    Platform.OS = 'ios';
  });

  it('pide actualizar cuando la tienda publica una versión mayor, con el link de STORE_URLS', async () => {
    mockFetch.mockResolvedValue(lookupOk(NEWER));
    await checkForUpdate();
    expect(forced()).toBe(true);
    expect(useAppStore.getState().forceUpdateUrl).toBe(STORE_URLS.ios);
  });

  it('no pide actualizar si la tienda tiene la versión instalada', async () => {
    mockFetch.mockResolvedValue(lookupOk(APP_VERSION));
    await checkForUpdate();
    expect(forced()).toBe(false);
  });

  it('consulta una URL con el parámetro anti-caché, distinta en cada chequeo', async () => {
    mockFetch.mockResolvedValue(lookupOk(APP_VERSION));
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(111).mockReturnValueOnce(222);
    await checkForUpdate();
    await checkForUpdate();
    now.mockRestore();
    const urls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(urls[0]).toMatch(/[?&]t=111$/);
    expect(urls[1]).toMatch(/[?&]t=222$/);
  });

  describe('con el lookup caído la app NO se bloquea', () => {
    it('sin red (fetch rechaza)', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));
      await expect(checkForUpdate()).resolves.toBeUndefined();
      expect(forced()).toBe(false);
    });

    it('HTTP de error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ results: [{ version: NEWER }] }) });
      await checkForUpdate();
      expect(forced()).toBe(false);
    });

    it('respuesta que no es JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      });
      await checkForUpdate();
      expect(forced()).toBe(false);
    });

    it('respuesta vacía (la versión aún no se propagó)', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ resultCount: 0, results: [] }) });
      await checkForUpdate();
      expect(forced()).toBe(false);
    });

    it('timeout: la consulta se aborta y la app sigue', async () => {
      jest.useFakeTimers();
      mockFetch.mockImplementation(
        (_url: string, opts: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );
      const pending = checkForUpdate();
      await jest.advanceTimersByTimeAsync(8001);
      await expect(pending).resolves.toBeUndefined();
      expect(forced()).toBe(false);
      jest.useRealTimers();
    });
  });
});

describe('Android — mínimo del backend', () => {
  beforeAll(() => {
    Platform.OS = 'android';
  });

  const backend = (android: object) => ({ data: { data: { ios: {}, android } } });

  it('pide actualizar si la versión instalada es menor que el mínimo', async () => {
    mockedGet.mockResolvedValue(backend({ minimum_version: NEWER, store_url: 'https://play.google.com/x' }));
    await checkForUpdate();
    expect(forced()).toBe(true);
    expect(useAppStore.getState().forceUpdateUrl).toBe('https://play.google.com/x');
    expect(mockedGet.mock.calls[0][0]).toBe('https://app.kingdomkeeper.church/api/public/app-version/');
  });

  it('sin store_url en la respuesta usa el de STORE_URLS', async () => {
    mockedGet.mockResolvedValue(backend({ minimum_version: NEWER, store_url: '' }));
    await checkForUpdate();
    expect(useAppStore.getState().forceUpdateUrl).toBe(STORE_URLS.android);
  });

  it('no pide actualizar si cumple el mínimo', async () => {
    mockedGet.mockResolvedValue(backend({ minimum_version: APP_VERSION, store_url: '' }));
    await checkForUpdate();
    expect(forced()).toBe(false);
  });

  it.each([
    ['endpoint inexistente (backend sin desplegar → 404)', () => Promise.reject({ response: { status: 404 } })],
    ['sin red', () => Promise.reject(new Error('Network Error'))],
    ['respuesta sin el campo android', () => Promise.resolve({ data: {} })],
    ['mínimo ilegible', () => Promise.resolve(backend({ minimum_version: 'x', store_url: '' }))],
  ])('%s: la app NO se bloquea', async (_name, respond) => {
    mockedGet.mockImplementation(respond as () => Promise<unknown>);
    await expect(checkForUpdate()).resolves.toBeUndefined();
    expect(forced()).toBe(false);
  });
});
