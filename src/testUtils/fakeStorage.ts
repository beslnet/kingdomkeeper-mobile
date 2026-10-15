/**
 * Dobles en memoria de AsyncStorage y del Keychain para los tests de sesión.
 * Se usan desde `jest.mock(..., () => require('../testUtils/fakeStorage').xxx)`.
 */
export const asyncStore = new Map<string, string>();
export const keychainStore = new Map<string, { username: string; password: string }>();

/** Para provocar fallos del Keychain (simulador sin entitlements, Keychain bloqueado). */
export const keychainFailure = { set: false, get: false };

export const asyncStorageModule = {
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (asyncStore.has(k) ? asyncStore.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      asyncStore.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      asyncStore.delete(k);
    }),
  },
};

export const keychainModule = {
  ACCESSIBLE: { AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock' },
  setGenericPassword: jest.fn(
    async (username: string, password: string, opts?: { service?: string }) => {
      if (keychainFailure.set) throw new Error('keychain: set failed');
      keychainStore.set(opts?.service ?? 'default', { username, password });
      return { service: opts?.service ?? 'default', storage: 'keychain' };
    },
  ),
  getGenericPassword: jest.fn(async (opts?: { service?: string }) => {
    if (keychainFailure.get) throw new Error('keychain: get failed');
    const hit = keychainStore.get(opts?.service ?? 'default');
    return hit ? { service: opts?.service, storage: 'keychain', ...hit } : false;
  }),
  resetGenericPassword: jest.fn(async (opts?: { service?: string }) => {
    keychainStore.delete(opts?.service ?? 'default');
    return true;
  }),
};

export function resetFakeStorage() {
  asyncStore.clear();
  keychainStore.clear();
  keychainFailure.set = false;
  keychainFailure.get = false;
}

/**
 * ¿Queda algún token en el teléfono? Para afirmar "no queda nada". Se ignoran las claves
 * `*-store`: son el estado persistido de Zustand (sin credenciales), no tokens.
 */
export function everythingStored(): string[] {
  return [
    ...[...asyncStore.keys()].filter((k) => !k.endsWith('-store')),
    ...[...keychainStore.keys()].map((k) => `keychain:${k}`),
  ];
}
