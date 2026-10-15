import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAllTokens,
  deleteRefreshToken,
  getAccessToken,
  getRefreshToken,
  migrateRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../utils/tokenStorage';
import {
  asyncStore,
  everythingStored,
  keychainFailure,
  keychainStore,
  resetFakeStorage,
} from '../testUtils/fakeStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('../testUtils/fakeStorage').asyncStorageModule);
jest.mock('react-native-keychain', () => require('../testUtils/fakeStorage').keychainModule);

const KEYCHAIN_SERVICE = 'com.kingdomkeeper.mobile.refresh_token';

beforeEach(() => {
  resetFakeStorage();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('refresh token nuevo', () => {
  it('se guarda en el Keychain, accesible tras el primer desbloqueo, y NO en AsyncStorage', async () => {
    expect(await saveRefreshToken('r-1')).toBe(true);
    expect(keychainStore.get(KEYCHAIN_SERVICE)?.password).toBe('r-1');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      expect.any(String),
      'r-1',
      expect.objectContaining({ accessible: 'AccessibleAfterFirstUnlock' }),
    );
    expect(asyncStore.has('refresh_token')).toBe(false);
    expect(await getRefreshToken()).toBe('r-1');
  });

  it('el access token sigue en AsyncStorage (dura 60 min y lo lee cada petición)', async () => {
    await saveAccessToken('a-1');
    expect(asyncStore.get('access_token')).toBe('a-1');
    expect(keychainStore.size).toBe(0);
    expect(await getAccessToken()).toBe('a-1');
  });

  it('rotar el token deja solo el nuevo, sin copia vieja', async () => {
    await saveRefreshToken('r-1');
    await saveRefreshToken('r-2');
    expect(await getRefreshToken()).toBe('r-2');
    expect(asyncStore.has('refresh_token')).toBe(false);
  });

  it('si el Keychain falla, el token queda en AsyncStorage en vez de perderse', async () => {
    keychainFailure.set = true;
    expect(await saveRefreshToken('r-1')).toBe(false);
    expect(await getRefreshToken()).toBe('r-1');
  });
});

describe('migración desde la 1.1.3 (refresh token en AsyncStorage)', () => {
  it('antes de migrar, la sesión vieja sigue funcionando: se lee la copia de AsyncStorage', async () => {
    asyncStore.set('refresh_token', 'viejo');
    expect(await getRefreshToken()).toBe('viejo');
  });

  it('mueve el valor existente al Keychain y borra la copia vieja', async () => {
    asyncStore.set('refresh_token', 'viejo');
    await migrateRefreshToken();
    expect(keychainStore.get(KEYCHAIN_SERVICE)?.password).toBe('viejo');
    expect(asyncStore.has('refresh_token')).toBe(false);
    expect(await getRefreshToken()).toBe('viejo');
  });

  it('NO borra la copia vieja si el Keychain no la acepta: el usuario no queda deslogueado', async () => {
    asyncStore.set('refresh_token', 'viejo');
    keychainFailure.set = true;
    await migrateRefreshToken();
    expect(asyncStore.get('refresh_token')).toBe('viejo');
    expect(await getRefreshToken()).toBe('viejo');
  });

  it('NO borra la copia vieja si el Keychain "guarda" sin lanzar pero no devuelve el valor', async () => {
    asyncStore.set('refresh_token', 'viejo');
    (Keychain.setGenericPassword as jest.Mock).mockResolvedValueOnce(false); // no escribió nada
    await migrateRefreshToken();
    expect(asyncStore.get('refresh_token')).toBe('viejo');
  });

  it('es idempotente y no pisa un token más nuevo del Keychain con el viejo', async () => {
    keychainStore.set(KEYCHAIN_SERVICE, { username: 'refresh_token', password: 'nuevo' });
    asyncStore.set('refresh_token', 'viejo');
    await migrateRefreshToken();
    await migrateRefreshToken();
    expect(await getRefreshToken()).toBe('nuevo');
    expect(asyncStore.has('refresh_token')).toBe(false);
  });

  it('sin nada que migrar no hace nada', async () => {
    await migrateRefreshToken();
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(await getRefreshToken()).toBeNull();
  });

  it('si el Keychain lanza al leer, no rompe: cae a la copia de AsyncStorage', async () => {
    asyncStore.set('refresh_token', 'viejo');
    keychainFailure.get = true;
    expect(await getRefreshToken()).toBe('viejo');
  });
});

describe('borrado', () => {
  it('deleteRefreshToken limpia el Keychain Y la copia vieja', async () => {
    await saveRefreshToken('r-1');
    asyncStore.set('refresh_token', 'viejo');
    await deleteRefreshToken();
    expect(await getRefreshToken()).toBeNull();
    expect(everythingStored()).toEqual([]);
  });

  it('clearAllTokens no deja ningún token en el teléfono', async () => {
    await saveAccessToken('a');
    await saveRefreshToken('r');
    asyncStore.set('refresh_token', 'viejo');
    await clearAllTokens();
    expect(everythingStored()).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
  });
});
