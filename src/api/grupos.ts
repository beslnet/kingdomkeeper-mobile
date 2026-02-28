import api from './api';

export const listarGrupos = async (params?: Record<string, any>) => {
  const { data } = await api.get('/api/grupos/', { params });
  return data;
};

export const obtenerGrupo = async (id: number) => {
  const { data } = await api.get(`/api/grupos/${id}/`);
  return data;
};

export const agregarMiembros = async (grupoId: number, miembrosIds: number[]) => {
  const { data } = await api.post(`/api/grupos/${grupoId}/agregar-miembros/`, { miembros_ids: miembrosIds });
  return data;
};

export const removerMiembros = async (grupoId: number, miembrosIds: number[]) => {
  const { data } = await api.post(`/api/grupos/${grupoId}/remover-miembros/`, { miembros_ids: miembrosIds });
  return data;
};

export const cambiarLider = async (grupoId: number, nuevoLiderId: number) => {
  const { data } = await api.post(`/api/grupos/${grupoId}/cambiar-lider/`, { nuevo_lider_id: nuevoLiderId });
  return data;
};

export const agregarCoLideres = async (grupoId: number, miembrosIds: number[]) => {
  const { data } = await api.post(`/api/grupos/${grupoId}/agregar-co-lideres/`, { miembros_ids: miembrosIds });
  return data;
};

export const removerCoLideres = async (grupoId: number, miembrosIds: number[]) => {
  const { data } = await api.post(`/api/grupos/${grupoId}/remover-co-lideres/`, { miembros_ids: miembrosIds });
  return data;
};

export const listarCoLideres = async (grupoId: number) => {
  const { data } = await api.get(`/api/grupos/${grupoId}/co-lideres/`);
  return data;
};

export const obtenerResumenFinanzas = async (grupoId: number) => {
  const { data } = await api.get(`/api/grupos/${grupoId}/resumen-finanzas/`);
  return data;
};

export const listarRecursosPorGrupo = async (grupoId: number) => {
  const { data } = await api.get('/api/grupos-recursos/', { params: { grupo_id: grupoId } });
  return data;
};

export const listarEventosGrupo = async (grupoId: number, params?: Record<string, any>) => {
  const { data } = await api.get('/api/eventos/', { params: { grupo_id: grupoId, ...params } });
  return data;
};

export const listarMiembrosIglesia = async (search?: string) => {
  const { data } = await api.get('/api/miembros/', { params: { search, page_size: 50 } });
  return data;
};

export const listarLideresIglesia = async (search?: string) => {
  const { data } = await api.get('/api/miembros/', { params: { search, rol: 'leader', page_size: 100 } });
  return data;
};

export const crearGrupo = async (data: Record<string, any>) => {
  const { data: result } = await api.post('/api/grupos/', data);
  return result;
};

export const actualizarGrupo = async (id: number, data: Record<string, any>) => {
  const { data: result } = await api.patch(`/api/grupos/${id}/`, data);
  return result;
};

export const eliminarGrupo = async (id: number) => {
  await api.delete(`/api/grupos/${id}/`);
};
