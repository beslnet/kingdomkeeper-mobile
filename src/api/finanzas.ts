import api from './api';

/**
 * Listar transacciones con filtros y paginación.
 */
export const listarTransacciones = async (params: {
  grupo_id?: number | string;
  tipo?: string;
  estado?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
} = {}) => {
  const cleaned: Record<string, any> = {};
  if (params.grupo_id) cleaned.grupo_id = params.grupo_id;
  if (params.tipo) cleaned.tipo = params.tipo;
  if (params.estado) cleaned.estado = params.estado;
  if (params.search) cleaned.search = params.search;
  cleaned.ordering = params.ordering ?? '-fecha,-created_at';
  cleaned.page = params.page ?? 1;
  cleaned.page_size = params.page_size ?? 15;
  const { data } = await api.get('/api/finanzas/transacciones/', { params: cleaned });
  return data as { count: number; results: any[]; next: string | null };
};

/**
 * Obtener detalle de una transacción.
 * Falls back to /mis-transacciones/ on 403/401 (for leaders without admin access).
 */
export const obtenerTransaccion = async (id: number): Promise<any> => {
  try {
    const { data } = await api.get(`/api/finanzas/transacciones/${id}/`);
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403 || status === 401) {
      const { data } = await api.get('/api/finanzas/transacciones/mis-transacciones/');
      const list: any[] = data?.results ?? data ?? [];
      const found = list.find((t: any) => t.id === id);
      if (!found) throw new Error('Transacción no encontrada.');
      return found;
    }
    throw err;
  }
};

/**
 * Anular una transacción (líder/admin con permiso).
 */
export const anularTransaccion = async (id: number, motivo: string): Promise<any> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/anular/`, { motivo });
  return data;
};
