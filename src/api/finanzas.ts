import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TipoCuentaFondo {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface CuentaFondo {
  id: number;
  nombre: string;
  tipo: TipoCuentaFondo;
  tipo_id?: number;
  saldo_inicial: number;
  activo: boolean;
  descripcion?: string;
  saldo_disponible: number;
  total_ingresos: number;
  total_egresos: number;
}

export interface CategoriaTransaccion {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  activo: boolean;
  descripcion?: string;
}

export interface HistorialTransaccion {
  id: number;
  accion: string;
  estado_anterior?: string;
  estado_nuevo: string;
  usuario?: string | number;
  usuario_nombre?: string;
  comentario?: string;
  fecha: string;
}

export interface Transaccion {
  id: number;
  tipo: 'ingreso' | 'egreso';
  categoria: CategoriaTransaccion;
  categoria_id?: number;
  cuenta: CuentaFondo;
  cuenta_id?: number;
  fecha: string;
  monto: number | string;
  responsable_id?: number;
  responsable_nombre?: string;
  medio?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'pagado' | 'anulado';
  observaciones?: string;
  descripcion?: string;
  motivo_rechazo?: string;
  motivo_anulacion?: string;
  requiere_aprobacion?: boolean;
  aprobado_por?: string | number;
  aprobado_por_nombre?: string;
  fecha_aprobacion?: string;
  pagado_por?: string | number;
  pagado_por_nombre?: string;
  fecha_pago?: string;
  anulado_por_nombre?: string;
  historial?: HistorialTransaccion[];
  created_at?: string;
}

export interface ResumenFinanzas {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  egresos_pendientes: number;
  egresos_aprobados: number;
  egresos_pagados: number;
  cantidad_egresos_pendientes: number;
  cantidad_egresos_aprobados: number;
  cantidad_egresos_pagados: number;
  ingresos_pendientes: number;
  ingresos_aprobados: number;
  ingresos_pagados: number;
  cantidad_ingresos_pendientes: number;
  cantidad_ingresos_aprobados: number;
  cantidad_ingresos_pagados: number;
}

export interface PaginatedTransacciones {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transaccion[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const TIPOS_TRANSACCION = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
];

export const ESTADOS_TRANSACCION: { value: string; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: '#FF9800' },
  { value: 'aprobado', label: 'Aprobado', color: '#2196F3' },
  { value: 'rechazado', label: 'Rechazado', color: '#E53935' },
  { value: 'pagado', label: 'Pagado', color: '#4CAF50' },
  { value: 'anulado', label: 'Anulado', color: '#9E9E9E' },
];

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta', label: 'Tarjeta débito/crédito' },
  { value: 'otro', label: 'Otro' },
];

export function getEstadoColor(estado: string): string {
  return ESTADOS_TRANSACCION.find((e) => e.value === estado)?.color ?? '#9E9E9E';
}

export function getEstadoLabel(estado: string): string {
  return ESTADOS_TRANSACCION.find((e) => e.value === estado)?.label ?? estado;
}

export function formatMonto(monto: number | string): string {
  const num = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

// ─── Transacciones ────────────────────────────────────────────────────────────

export const listarTransacciones = async (params: {
  tipo?: string;
  estado?: string;
  cuenta?: number | string;
  categoria?: number | string;
  grupo_id?: number | string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<PaginatedTransacciones> => {
  const cleaned: Record<string, any> = {};
  if (params.tipo) cleaned.tipo = params.tipo;
  if (params.estado) cleaned.estado = params.estado;
  if (params.cuenta) cleaned.cuenta = params.cuenta;
  if (params.categoria) cleaned.categoria = params.categoria;
  if (params.grupo_id) cleaned.grupo_id = params.grupo_id;
  if (params.search) cleaned.search = params.search;
  cleaned.ordering = params.ordering ?? '-fecha';
  cleaned.page = params.page ?? 1;
  cleaned.page_size = params.page_size ?? 20;
  const { data } = await api.get('/api/finanzas/transacciones/', { params: cleaned });
  return data;
};

export const obtenerTransaccion = async (id: number): Promise<Transaccion> => {
  try {
    const { data } = await api.get(`/api/finanzas/transacciones/${id}/`);
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403 || status === 401) {
      const { data } = await api.get('/api/finanzas/transacciones/mis-transacciones/');
      const list: Transaccion[] = data?.results ?? data ?? [];
      const found = list.find((t) => t.id === id);
      if (!found) throw new Error('Transacción no encontrada.');
      return found;
    }
    throw err;
  }
};

export const obtenerResumen = async (params: {
  fecha__gte?: string;
  fecha__lte?: string;
  cuenta?: number | string;
} = {}): Promise<ResumenFinanzas> => {
  const { data } = await api.get('/api/finanzas/transacciones/resumen/', { params });
  return data;
};

export const crearTransaccion = async (fields: {
  tipo: string;
  categoria_id: number | string;
  cuenta_id: number | string;
  fecha: string;
  monto: number | string;
  responsable_id?: number;
  medio?: string;
  observaciones?: string;
}): Promise<Transaccion> => {
  const { data } = await api.post('/api/finanzas/transacciones/', fields);
  return data;
};

export const editarTransaccion = async (id: number, fields: Partial<{
  tipo: string;
  categoria_id: number | string;
  cuenta_id: number | string;
  fecha: string;
  monto: number | string;
  responsable_id: number;
  medio: string;
  observaciones: string;
}>): Promise<Transaccion> => {
  const { data } = await api.patch(`/api/finanzas/transacciones/${id}/`, fields);
  return data;
};

export const aprobarTransaccion = async (id: number, observaciones = ''): Promise<Transaccion> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/aprobar/`, { observaciones });
  return data;
};

export const rechazarTransaccion = async (id: number, motivo: string): Promise<Transaccion> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/rechazar/`, { motivo });
  return data;
};

export const pagarTransaccion = async (
  id: number,
  opts: { observaciones?: string; cuenta_origen_id?: number | null } = {}
): Promise<Transaccion> => {
  const payload: any = { observaciones: opts.observaciones ?? '' };
  if (opts.cuenta_origen_id) payload.cuenta_origen_id = opts.cuenta_origen_id;
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/pagar/`, payload);
  return data;
};

export const anularTransaccion = async (id: number, motivo: string): Promise<Transaccion> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/anular/`, { motivo });
  return data;
};

export const rectificarTransaccion = async (id: number, fields: Partial<{
  monto: number | string;
  observaciones: string;
  categoria_id: number | string;
  cuenta_id: number | string;
  fecha: string;
  medio: string;
}>): Promise<Transaccion> => {
  const { data } = await api.post(`/api/finanzas/transacciones/${id}/rectificar/`, fields);
  return data;
};

export const obtenerHistorialTransaccion = async (id: number): Promise<HistorialTransaccion[]> => {
  const { data } = await api.get(`/api/finanzas/transacciones/${id}/historial/`);
  return data?.historial ?? data ?? [];
};

export const transferirFondos = async (params: {
  cuenta_origen_id: number;
  cuenta_destino_id: number;
  monto: string | number;
  observaciones?: string;
}): Promise<void> => {
  await api.post('/api/finanzas/transacciones/transferir/', params);
};

// ─── Cuentas/Fondos ───────────────────────────────────────────────────────────

export const listarCuentas = async (): Promise<CuentaFondo[]> => {
  const { data } = await api.get('/api/finanzas/cuentas-fondo/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const crearCuenta = async (payload: {
  nombre: string;
  tipo_id: number;
  saldo_inicial?: number;
  descripcion?: string;
}): Promise<CuentaFondo> => {
  const { data } = await api.post('/api/finanzas/cuentas-fondo/', payload);
  return data;
};

export const editarCuenta = async (id: number, payload: Partial<{
  nombre: string; tipo_id: number; saldo_inicial: number; descripcion: string; activo: boolean;
}>): Promise<CuentaFondo> => {
  const { data } = await api.patch(`/api/finanzas/cuentas-fondo/${id}/`, payload);
  return data;
};

export const eliminarCuenta = async (id: number): Promise<void> => {
  await api.delete(`/api/finanzas/cuentas-fondo/${id}/`);
};

// ─── Tipos de cuenta ─────────────────────────────────────────────────────────

export const listarTiposCuenta = async (): Promise<TipoCuentaFondo[]> => {
  const { data } = await api.get('/api/finanzas/tipos-cuenta-fondo/');
  return Array.isArray(data) ? data : data.results ?? [];
};

// ─── Categorías ───────────────────────────────────────────────────────────────

export const listarCategorias = async (params: { tipo?: string } = {}): Promise<CategoriaTransaccion[]> => {
  const { data } = await api.get('/api/finanzas/categorias/', { params });
  return Array.isArray(data) ? data : data.results ?? [];
};

export const crearCategoria = async (payload: {
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  descripcion?: string;
}): Promise<CategoriaTransaccion> => {
  const { data } = await api.post('/api/finanzas/categorias/', payload);
  return data;
};

export const editarCategoria = async (id: number, payload: Partial<{
  nombre: string; tipo: 'ingreso' | 'egreso'; descripcion: string; activo: boolean;
}>): Promise<CategoriaTransaccion> => {
  const { data } = await api.patch(`/api/finanzas/categorias/${id}/`, payload);
  return data;
};

export const eliminarCategoria = async (id: number): Promise<void> => {
  await api.delete(`/api/finanzas/categorias/${id}/`);
};

// ─── Miembros activos (para selector de responsable) ─────────────────────────

export const listarMiembrosActivos = async (search = ''): Promise<any[]> => {
  const params: any = {};
  if (search) params.buscar = search;
  const { data } = await api.get('/api/finanzas/transacciones/miembros-activos/', { params });
  return Array.isArray(data) ? data : data.results ?? [];
};
