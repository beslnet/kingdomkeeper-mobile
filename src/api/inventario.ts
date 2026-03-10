import api from './api';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type EstadoArticulo =
  | 'disponible'
  | 'en_uso'
  | 'prestado'
  | 'mantenimiento'
  | 'dañado'
  | 'baja';

export type TipoCategoria =
  | 'equipo'
  | 'mobiliario'
  | 'insumo'
  | 'herramienta'
  | 'vehiculo'
  | 'otro';

export type UnidadMedida =
  | 'unidad'
  | 'par'
  | 'kg'
  | 'gramo'
  | 'litro'
  | 'ml'
  | 'metro'
  | 'cm'
  | 'caja'
  | 'paquete'
  | 'bolsa'
  | 'rollo'
  | 'resma'
  | 'galon'
  | 'otro';

export type EstadoPrestamo = 'activo' | 'devuelto' | 'vencido' | 'cancelado';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoriaInventario {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: TipoCategoria;
  tipo_display?: string;
  es_consumible: boolean;
  stock_minimo: number | null;
  articulos_count?: number;
}

export interface Ubicacion {
  id: number;
  nombre: string;
  descripcion: string;
  ubicacion_padre: number | null;
  ubicacion_padre_nombre: string | null;
  responsable: number | null;
  responsable_data?: { nombre: string; apellidos: string } | null;
  articulos_count?: number;
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  pais: string;
  notas: string;
  activo: boolean;
}

export interface ArticuloList {
  id: number;
  codigo: string;
  nombre: string;
  categoria_nombre: string;
  ubicacion_nombre: string | null;
  estado: EstadoArticulo;
  cantidad: number;
  unidad_medida: UnidadMedida;
  responsable_nombre: string | null;
  stock_bajo: boolean;
  foto_url: string | null;
  es_consumible: boolean;
  prestamos_activos_count: number;
}

export interface Articulo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: number;
  categoria_data?: CategoriaInventario;
  ubicacion: number | null;
  ubicacion_data?: Ubicacion | null;
  marca: string;
  modelo: string;
  numero_serie: string;
  valor_adquisicion: string | null;
  fecha_adquisicion: string | null;
  proveedor: number | null;
  estado: EstadoArticulo;
  estado_display?: string;
  cantidad: number;
  stock_minimo: number | null;
  unidad_medida: UnidadMedida;
  responsable: number | null;
  responsable_data?: { id: number; nombre: string; apellidos: string } | null;
  stock_bajo: boolean;
  foto_url: string | null;
  notas: string;
  movimientos?: MovimientoInventario[];
}

export interface MovimientoInventario {
  id: number;
  tipo: string;
  tipo_display?: string;
  cantidad: number;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_nombre?: string | null;
  registrado_por_nombre?: string;
  notas: string;
  created_at: string;
}

export interface Prestamo {
  id: number;
  articulo: number;
  articulo_data?: { id: number; nombre: string; es_consumible?: boolean; cantidad?: number; unidad_medida?: string };
  prestatario: number;
  prestatario_data?: { id: number; nombre: string; apellidos: string };
  grupo: number | null;
  grupo_data?: { id: number; nombre: string } | null;
  cantidad_prestada: number;
  fecha_prestamo: string;
  fecha_devolucion_esperada: string | null;
  fecha_devolucion_real: string | null;
  estado: EstadoPrestamo;
  estado_display?: string;
  autorizado_por_nombre?: string;
  condicion_entrega: string;
  condicion_devolucion: string | null;
  notas: string;
  dias_prestado?: number;
  esta_vencido: boolean;
}

export interface ReporteStockBajoItem {
  articulo: { id: number; nombre: string; categoria_nombre: string };
  stock_actual: number;
  stock_minimo: number;
  porcentaje: number;
}

export interface ReporteStockBajo {
  total: number;
  articulos: ReporteStockBajoItem[];
}

export interface ReportePorUbicacion {
  ubicacion_nombre: string;
  cantidad_total: number;
  total_articulos: number;
  por_estado: Record<string, number>;
  articulos: { id: number; codigo: string; nombre: string; categoria_nombre: string; cantidad: number; estado: string; es_consumible: boolean; unidad_medida?: string }[];
}

export interface ReportePorCategoria {
  categoria_id: number;
  categoria_nombre: string;
  categoria_tipo: string;
  tipo: string;
  es_consumible: boolean;
  total_articulos: number;
  cantidad_total: number;
  por_estado: Record<string, number>;
  articulos: { id: number; codigo: string; nombre: string; ubicacion_nombre: string; cantidad: number; estado: string; unidad_medida?: string }[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Artículos ────────────────────────────────────────────────────────────────

export const listarArticulos = async (params?: {
  buscar?: string;
  categoria_id?: number | null;
  ubicacion_id?: number | null;
  estado?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<ArticuloList>> => {
  const { data } = await api.get('/api/inventario/articulos/', { params });
  return data;
};

export const obtenerArticulo = async (id: number): Promise<Articulo> => {
  const { data } = await api.get(`/api/inventario/articulos/${id}/`);
  return data;
};

export const crearArticulo = async (payload: Partial<Articulo>): Promise<Articulo> => {
  const { data } = await api.post('/api/inventario/articulos/', payload);
  return data;
};

export const actualizarArticulo = async (id: number, payload: Partial<Articulo>): Promise<Articulo> => {
  const { data } = await api.patch(`/api/inventario/articulos/${id}/`, payload);
  return data;
};

export const eliminarArticulo = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/articulos/${id}/`);
};

export const ajustarStock = async (id: number, cantidad: number, motivo: string): Promise<Articulo> => {
  const { data } = await api.post(`/api/inventario/articulos/${id}/ajustar-stock/`, { cantidad, motivo });
  return data;
};

// ─── Categorías ───────────────────────────────────────────────────────────────

export const listarCategorias = async (params?: {
  tipo?: string;
  es_consumible?: boolean;
}): Promise<PaginatedResponse<CategoriaInventario>> => {
  const { data } = await api.get('/api/inventario/categorias/', { params });
  return data;
};

export const crearCategoria = async (payload: Partial<CategoriaInventario>): Promise<CategoriaInventario> => {
  const { data } = await api.post('/api/inventario/categorias/', payload);
  return data;
};

export const actualizarCategoria = async (id: number, payload: Partial<CategoriaInventario>): Promise<CategoriaInventario> => {
  const { data } = await api.patch(`/api/inventario/categorias/${id}/`, payload);
  return data;
};

export const eliminarCategoria = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/categorias/${id}/`);
};

// ─── Ubicaciones ─────────────────────────────────────────────────────────────

export const listarUbicaciones = async (): Promise<PaginatedResponse<Ubicacion>> => {
  const { data } = await api.get('/api/inventario/ubicaciones/');
  return data;
};

export const crearUbicacion = async (payload: Partial<Ubicacion>): Promise<Ubicacion> => {
  const { data } = await api.post('/api/inventario/ubicaciones/', payload);
  return data;
};

export const actualizarUbicacion = async (id: number, payload: Partial<Ubicacion>): Promise<Ubicacion> => {
  const { data } = await api.patch(`/api/inventario/ubicaciones/${id}/`, payload);
  return data;
};

export const eliminarUbicacion = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/ubicaciones/${id}/`);
};

// ─── Préstamos ────────────────────────────────────────────────────────────────

export const listarPrestamos = async (params?: {
  estado?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Prestamo>> => {
  const { data } = await api.get('/api/inventario/prestamos/', { params });
  return data;
};

export const listarPrestamosVencidos = async (): Promise<PaginatedResponse<Prestamo>> => {
  const { data } = await api.get('/api/inventario/prestamos/vencidos/');
  return data;
};

export const crearPrestamo = async (payload: {
  articulo: number;
  prestatario: number;
  cantidad_prestada?: number;
  grupo?: number | null;
  fecha_devolucion_esperada?: string | null;
  condicion_entrega?: string;
  notas?: string;
}): Promise<Prestamo> => {
  const { data } = await api.post('/api/inventario/prestamos/', payload);
  return data;
};

export const devolverPrestamo = async (id: number, condicion_devolucion: string, notas_devolucion?: string): Promise<Prestamo> => {
  const { data } = await api.post(`/api/inventario/prestamos/${id}/devolver/`, {
    condicion_devolucion,
    notas_devolucion: notas_devolucion ?? '',
  });
  return data;
};

// ─── Proveedores ──────────────────────────────────────────────────────────────

export const listarProveedores = async (params?: {
  activo?: boolean;
  search?: string;
  page?: number;
}): Promise<PaginatedResponse<Proveedor>> => {
  const { data } = await api.get('/api/inventario/proveedores/', { params });
  return data;
};

export const crearProveedor = async (payload: Partial<Proveedor>): Promise<Proveedor> => {
  const { data } = await api.post('/api/inventario/proveedores/', payload);
  return data;
};

export const actualizarProveedor = async (id: number, payload: Partial<Proveedor>): Promise<Proveedor> => {
  const { data } = await api.patch(`/api/inventario/proveedores/${id}/`, payload);
  return data;
};

export const eliminarProveedor = async (id: number): Promise<void> => {
  await api.delete(`/api/inventario/proveedores/${id}/`);
};

// ─── Reportes ─────────────────────────────────────────────────────────────────

export const reporteStockBajo = async (): Promise<ReporteStockBajo> => {
  const { data } = await api.get('/api/inventario/reportes/stock-bajo/');
  return data;
};

export const reportePorUbicacion = async (): Promise<ReportePorUbicacion[]> => {
  const { data } = await api.get('/api/inventario/reportes/por-ubicacion/');
  return data;
};

export const reportePorCategoria = async (): Promise<ReportePorCategoria[]> => {
  const { data } = await api.get('/api/inventario/reportes/por-categoria/');
  return data;
};
