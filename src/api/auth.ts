import api from './api';

export const loginApi = async (username: string, password: string) => {
  const res = await api.post('/api/token/', { username, password });
  return res.data; // { access, refresh }
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me/');
  const data = res.data;
  // Normalize miembro_id for convenience (API returns it nested as miembro_asociado.id)
  return { ...data, miembro_id: data.miembro_asociado?.id ?? null };
};

export const getMisIglesias = async () => {
  const res = await api.get('/api/iglesias/mis-iglesias/');
  return res.data;
};

export const getMisPermisos = async () => {
  const res = await api.get('/api/auth/mis-permisos/');
  return res.data;
};

export const solicitarRestablecerPassword = async (email: string) => {
  const res = await api.post('/api/core/usuarios/solicitar-restablecer-password/', { email });
  return res.data;
};

export interface IglesiaAdministrada {
  id: number;
  nombre: string;
  otros_admins: number;
}

export interface VerificarEliminacionResponse {
  puede_eliminar: boolean;
  iglesias_administradas: IglesiaAdministrada[];
  mensaje: string;
}

export const verificarEliminacion = async (): Promise<VerificarEliminacionResponse> => {
  const res = await api.post('/api/auth/verificar-eliminacion/');
  return res.data;
};

export const eliminarCuenta = async (password: string) => {
  const res = await api.post('/api/auth/eliminar-cuenta/', { password });
  return res.data;
};
