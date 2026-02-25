import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

async function getAuthTokens(): Promise<{ access: string | null; refresh: string | null }> {
  try {
    const raw = await AsyncStorage.getItem('auth-store');
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw);
    const access = parsed?.state?.accessToken ?? null;
    const refresh = parsed?.state?.refreshToken ?? null;
    return { access, refresh };
  } catch {
    return { access: null, refresh: null };
  }
}

async function getIglesiaId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem('iglesia-store');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.iglesiaId ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const { access } = await getAuthTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  const iglesiaId = await getIglesiaId();
  if (iglesiaId) {
    config.headers['X-IGLESIA-ID'] = String(iglesiaId);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest.url?.includes(ENDPOINTS.token) && error.response?.status === 401) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refresh } = await getAuthTokens();
      if (refresh) {
        try {
          const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.tokenRefresh}`, { refresh });
          const newAccess: string = response.data.access;
          // Update stored token
          const raw = await AsyncStorage.getItem('auth-store');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.state) {
              parsed.state.accessToken = newAccess;
              await AsyncStorage.setItem('auth-store', JSON.stringify(parsed));
            }
          }
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          await AsyncStorage.removeItem('auth-store');
          await AsyncStorage.removeItem('iglesia-store');
          // The auth store's checkAuth will detect no token and set isLoggedIn=false
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
