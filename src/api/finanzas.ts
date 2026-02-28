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
 * Falls back to /mis-transacciones/ on 403/401.
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
 * Listar categorías de transacciones.
 */
export const listarCategorias = async (params: { tipo?: string; activo?: boolean } = {}) => {
  const { data } = await api.get('/api/finanzas/categorias/', { params });
  return (data?.results ?? data ?? []) as any[];
};

/**
 * Crear una transacción (ingreso o egreso).
 * Si el objeto `data` tiene la propiedad `_file`, se envía como multipart/form-data.
 */
export const crearTransaccion = async (fields: {
  tipo: string;
  categoria_id: number | string;
  fecha: string;
  monto: number | string;
  medio: string;
  observaciones?: string;
  descripcion?: string;
  notas?: string;
  grupo_id?: number | string;
  usa_fondo_general?: boolean;
  _file?: { uri: string; type: string; name: string } | null;
}): Promise<any> => {
  const { _file, ...rest } = fields;
  if (_file) {
    const fd = new FormData();
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('archivo_respaldo', _file as any);
    const { data } = await api.post('/api/finanzas/transacciones/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post('/api/finanzas/transacciones/', rest);
  return data;
};

/**
 * Rectificar una transacción rechazada.
 */
export const rectificarTransaccion = async (
  id: number,
  fields: {
    monto?: number | string;
    observaciones?: string;
    categoria_id?: number | string;
    fecha?: string;
    medio?: string;
    _file?: { uri: string; type: string; name: string } | null;
  }
): Promise<any> => {
  const { _file, ...rest } = fields;
  if (_file) {
    const fd = new FormData();
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('archivo_respaldo', _file as any);
    const { data } = await api.post(`/api/finanzas/transacciones/${id}/rectificar/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/rectificar/`, rest);
  return data;
};

/**
 * Aprobar una transacción pendiente (tesorero).
 */
export const aprobarTransaccion = async (id: number, observaciones = ''): Promise<any> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/aprobar/`, { observaciones });
  return data;
};

/**
 * Rechazar una transacción pendiente (tesorero). Motivo requerido.
 */
export const rechazarTransaccion = async (id: number, motivo: string): Promise<any> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/rechazar/`, { motivo });
  return data;
};

/**
 * Marcar transacción aprobada como pagada (tesorero).
 */
export const pagarTransaccion = async (
  id: number,
  opts: { observaciones?: string; cuenta_origen_id?: number | string | null } = {}
): Promise<any> => {
  const payload: any = { observaciones: opts.observaciones ?? '' };
  if (opts.cuenta_origen_id) payload.cuenta_origen_id = opts.cuenta_origen_id;
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/pagar/`, payload);
  return data;
};

/**
 * Anular una transacción (líder/admin). Motivo requerido.
 */
export const anularTransaccion = async (id: number, motivo: string): Promise<any> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/anular/`, { motivo });
  return data;
};

/**
 * Obtener historial de acciones de una transacción.
 */
export const obtenerHistorialTransaccion = async (id: number): Promise<any[]> => {
  const { data } = await api.get(`/api/finanzas/transacciones/${id}/historial/`);
  return data?.historial ?? data ?? [];
};

