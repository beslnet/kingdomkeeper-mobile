import { Platform } from 'react-native';

const DEV_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';

export const API_BASE_URL = __DEV__ ? DEV_BASE_URL : 'https://api.kingdomkeeper.app';

export const ENDPOINTS = {
  token: '/api/token/',
  tokenRefresh: '/api/token/refresh/',
  me: '/api/auth/me/',
  misPermisos: '/api/auth/mis-permisos/',
  misIglesias: '/api/iglesias/mis-iglesias/',
  solicitarRestablecerPassword: '/api/core/usuarios/solicitar-restablecer-password/',
};

const EXTERNAL_BASE = 'https://kingdomkeeper.app';

export const EXTERNAL_URLS = {
  terms: `${EXTERNAL_BASE}/terminos`,
  privacy: `${EXTERNAL_BASE}/privacidad`,
  whatsappSupport: 'https://wa.me/56912345678',
};
