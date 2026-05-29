import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '../version';

const getApiBaseUrl = () => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:8000'
      : 'http://192.168.100.87:8000';
  }
  return 'https://app.kingdomkeeper.church';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add Authorization, X-IGLESIA-ID, and X-App-Version headers
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
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

    // 401 — attempt silent token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = res.data.access;
        const newRefresh = res.data.refresh;
        await AsyncStorage.setItem('access_token', newAccess);
        if (newRefresh) {
          await AsyncStorage.setItem('refresh_token', newRefresh);
        }
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        // Only logout if the refresh token itself is invalid (401)
        // Network errors during refresh should not log the user out
        if (refreshError?.response?.status === 401) {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          const { useAuthStore } = await import('../store/authStore');
          useAuthStore.getState().logout();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
