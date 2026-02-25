import api from './api';

export const loginApi = async (username: string, password: string) => {
  const res = await api.post('/api/token/', { username, password });
  return res.data; // { access, refresh }
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me/');
  return res.data;
};

export const getMisIglesias = async () => {
  const res = await api.get('/api/iglesias/mis-iglesias/');
  return res.data;
};

export const getMisPermisos = async () => {
  const res = await api.get('/api/core/usuarios/mis-permisos/');
  return res.data;
};

export const solicitarRestablecerPassword = async (email: string) => {
  const res = await api.post('/api/core/usuarios/solicitar-restablecer-password/', { email });
  return res.data;
};
