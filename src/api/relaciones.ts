import api from './api';

export const getMisRelaciones = async () => {
  const { data } = await api.get('/api/perfil/mis-relaciones/');
  return data;
};

export const addRelacion = async (body: {
  miembro_relacionado: number;
  tipo_relacion: string;
  tipo_familia: 'nuclear' | 'extendida';
  es_contacto_emergencia: boolean;
}) => {
  const { data } = await api.post('/api/perfil/mis-relaciones/', body);
  return data;
};

export const deleteRelacion = async (id: number) => {
  const { data } = await api.delete(`/api/perfil/mis-relaciones/${id}/`);
  return data;
};

export const getMiembrosIglesia = async () => {
  const { data } = await api.get('/api/perfil/miembros-iglesia/');
  return data;
};
