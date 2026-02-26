import api from './api';

export const getRecibidas = async (page = 1) => {
  const { data } = await api.get('/api/comunicaciones/recibidas/', { params: { page } });
  return data;
};

export const getDetalleRecibida = async (id: number) => {
  const { data } = await api.get(`/api/comunicaciones/${id}/detalle-recibida/`);
  return data;
};

export const getNoLeidasCount = async () => {
  const { data } = await api.get('/api/comunicaciones/recibidas/no-leidas-count/');
  return data; // { count: number }
};
