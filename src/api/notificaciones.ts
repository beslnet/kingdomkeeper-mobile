import api from './api';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  payload: Record<string, any>;
  leida: boolean;
  leida_en: string | null;
  created_at: string;
}

export interface PaginatedNotificaciones {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notificacion[];
}

export const getNotificaciones = async (page = 1): Promise<PaginatedNotificaciones> => {
  const { data } = await api.get('/api/notificaciones/', { params: { page, page_size: 20 } });
  return data;
};

export const getUnreadCount = async (): Promise<{ count: number }> => {
  const { data } = await api.get('/api/notificaciones/unread_count/');
  return data;
};

export const marcarLeida = async (id: number): Promise<void> => {
  await api.post(`/api/notificaciones/${id}/marcar_leida/`);
};

export const marcarTodasLeidas = async (): Promise<void> => {
  await api.post('/api/notificaciones/marcar_todas_leidas/');
};
