import api from './api';

export const listarEventos = async (params?: Record<string, any>) => {
  const { data } = await api.get('/api/eventos/', { params });
  return data;
};

export const obtenerEvento = async (id: number) => {
  const { data } = await api.get(`/api/eventos/${id}/`);
  return data;
};

export const crearEvento = async (payload: Record<string, any>) => {
  const { data } = await api.post('/api/eventos/', payload);
  return data;
};

export const actualizarEvento = async (id: number, payload: Record<string, any>) => {
  const { data } = await api.patch(`/api/eventos/${id}/`, payload);
  return data;
};

export const eliminarEvento = async (id: number) => {
  await api.delete(`/api/eventos/${id}/`);
};

export const registrarAsistencia = async (
  eventoId: number,
  participantes: { miembro_id: number; estado_asistencia: string }[]
) => {
  const { data } = await api.post(`/api/eventos/${eventoId}/registrar-asistencia/`, { participantes });
  return data;
};

export const obtenerAsistencia = async (eventoId: number) => {
  const { data } = await api.get(`/api/eventos/${eventoId}/asistencia/`);
  return data;
};

export const TIPOS_EVENTO = [
  { value: 'reunion', label: 'Reunión' },
  { value: 'culto', label: 'Culto' },
  { value: 'retiro', label: 'Retiro' },
  { value: 'taller', label: 'Taller' },
  { value: 'conferencia', label: 'Conferencia' },
  { value: 'evangelismo', label: 'Evangelismo' },
  { value: 'servicio', label: 'Servicio Comunitario' },
  { value: 'otro', label: 'Otro' },
];

export const ESTADOS_EVENTO = [
  { value: 'planificado', label: 'Planificado' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_curso', label: 'En Curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado', label: 'Cancelado' },
];
