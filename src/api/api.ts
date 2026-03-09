import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add Authorization and X-IGLESIA-ID headers
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Dynamically import to avoid circular dependencies
  const { useIglesiaStore } = await import('../store/iglesiaStore');
  const iglesiaId = useIglesiaStore.getState().iglesiaId;
  if (iglesiaId != null) {
    config.headers = config.headers ?? {};
    config.headers['X-IGLESIA-ID'] = String(iglesiaId);
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 451) {
      // Legal terms not accepted — trigger terms screen
      try {
        const { useAuthStore } = await import('../store/authStore');
        await useAuthStore.getState().checkTerms();
      } catch {
        // Ignore
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess = res.data.access;
        await AsyncStorage.setItem('access_token', newAccess);
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
