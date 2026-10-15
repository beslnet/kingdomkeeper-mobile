import axios from 'axios';
import { Platform } from 'react-native';
import { APP_VERSION } from '../version';
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../utils/tokenStorage';

const getApiBaseUrl = () => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://192.168.100.87:8000';
  }
  return 'https://app.kingdomkeeper.church';
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add Authorization, X-IGLESIA-ID, and X-App-Version headers
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  config.headers = config.headers ?? {};
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Dynamically import to avoid circular dependencies
  const { useIglesiaStore } = await import('../store/iglesiaStore');
  const iglesiaId = useIglesiaStore.getState().iglesiaId;
  if (iglesiaId != null) {
    config.headers['X-IGLESIA-ID'] = String(iglesiaId);
  }
  config.headers['X-App-Version'] = APP_VERSION;
  return config;
});

// Response interceptor: handle network states, force update (426), legal (451), and 401 refresh
api.interceptors.response.use(
  (response) => {
    // Successful response — clear any offline state
    import('../store/networkStore').then(({ useNetworkStore }) => {
      if (useNetworkStore.getState().isOffline) {
        useNetworkStore.getState().setOffline(false);
      }
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network error (no response) — device is offline or server unreachable
    if (!error.response) {
      import('../store/networkStore').then(({ useNetworkStore }) => {
        const kind = error.code === 'ECONNABORTED' ? 'timeout' : 'offline';
        useNetworkStore.getState().setOffline(true, kind);
      });
      return Promise.reject(error);
    }

    // 426 Upgrade Required — server demands a newer app version
    if (error.response?.status === 426) {
      import('../store/appStore').then(({ useAppStore }) => {
        const { store_url_ios, store_url_android } = error.response.data ?? {};
        const url = Platform.OS === 'ios' ? store_url_ios : store_url_android;
        useAppStore.getState().setForceUpdate(true, url || null);
      });
      return Promise.reject(error);
    }

    // 5xx — server-side error
    if (error.response?.status >= 500) {
      import('../store/networkStore').then(({ useNetworkStore }) => {
        useNetworkStore.getState().setOffline(true, 'server');
      });
    }

    // 451 — Legal terms not accepted
    if (error.response?.status === 451) {
      try {
        const { useAuthStore } = await import('../store/authStore');
        await useAuthStore.getState().checkTerms();
      } catch {
        // Ignore
      }
      return Promise.reject(error);
    }

    // 401 — refresh silencioso y reintento. Ni el login ni el propio refresh pasan por
    // aquí: un 401 en /api/token/ es "contraseña incorrecta", no una sesión vencida.
    const isAuthEndpoint = String(originalRequest?.url ?? '').includes('/api/token/');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      let newAccess: string;
      try {
        // Si otra petición ya refrescó mientras esta volaba, el token guardado es más
        // nuevo que el que ella mandó: basta reintentar con él, sin gastar otro refresh.
        const sent = originalRequest.headers?.['Authorization'];
        const stored = await getAccessToken();
        newAccess = stored && sent !== `Bearer ${stored}` ? stored : await refreshAccessToken();
      } catch (refreshError: any) {
        // Solo cierra la sesión si el servidor dijo que el refresh token ya no sirve
        // (401) o si no hay ninguno. Un fallo de red o un 5xx al refrescar NO desloguea:
        // se rechaza con ESE error (no con el 401 original) para que quien llamó no lo
        // confunda con una sesión vencida.
        if (refreshError?.response?.status === 401 || refreshError?.code === NO_REFRESH_TOKEN) {
          const { useAuthStore } = await import('../store/authStore');
          await useAuthStore.getState().expireSession();
          return Promise.reject(error);
        }
        return Promise.reject(refreshError);
      }
      originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

/** Error sin refresh token guardado. Marca por `code` y no por `instanceof`: heredar de Error no es fiable tras el transpilado a ES5. */
const NO_REFRESH_TOKEN = 'NO_REFRESH_TOKEN';
const noRefreshTokenError = () =>
  Object.assign(new Error('No refresh token'), { code: NO_REFRESH_TOKEN });

/**
 * Pide un access token nuevo. Todas las peticiones que reciben 401 a la vez comparten
 * UN solo refresh: el backend rota el refresh token y revoca el anterior
 * (ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION), así que dos refresh en paralelo con
 * el mismo token hacen que el segundo reciba 401 y cierre la sesión de alguien con la
 * sesión perfectamente válida.
 */
let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = await getRefreshToken();
      if (!refresh) throw noRefreshTokenError();
      const res = await axios.post(
        `${API_BASE_URL}/api/token/refresh/`,
        { refresh },
        { timeout: 15000 },
      );
      // El refresh nuevo se guarda primero: el anterior ya quedó revocado en el servidor.
      if (res.data.refresh) {
        await saveRefreshToken(res.data.refresh);
      }
      await saveAccessToken(res.data.access);
      return res.data.access as string;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export default api;
