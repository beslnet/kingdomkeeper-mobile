import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Miembro {
  id: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string; // YYYY-MM-DD
  documento_identidad: string;
  tipo_documento: 'rut' | 'dni' | 'pasaporte' | 'otro';
  genero: 'M' | 'F' | null;
  telefono: string | null;
  email: string | null;
  fecha_ingreso: string; // YYYY-MM-DD
  estado_membresia: 'activo' | 'inactivo' | 'visitante';
  pais: string | null;
  direccion_formateada: string | null;
  ciudad: string | null;
  region: string | null;
  codigo_postal: string | null;
  latitud: number | null;
  longitud: number | null;
  foto_perfil_url: string | null;
  usuario_asociado?: {
    id: number;
    email: string;
    estado: 'activo' | 'pendiente_activacion' | 'suspendido' | 'bloqueado';
    cuenta_en_eliminacion: boolean;
    email_pendiente?: string;
  } | null;
}

export interface ListadoMiembrosParams {
  page?: number;
  page_size?: number;
  estado?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RelacionFamiliar {
  id: number;
  miembro_relacionado_id: number;
  miembro_relacionado_nombre: string;
  tipo_relacion: string;
  es_contacto_emergencia?: boolean;
}

export interface FamiliaResponse {
  relaciones_nucleares: RelacionFamiliar[];
  relaciones_extendidas: RelacionFamiliar[];
}

export interface BitacoraEntrada {
  id: number;
  tipo: 'nota' | 'disciplina' | 'pastoral' | 'consejeria' | 'evento' | 'otro';
  titulo: string;
  contenido: string;
  es_privado: boolean;
  fecha_creacion: string;
  creado_por_nombre: string;
}

export interface HistorialMembresia {
  id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  iglesia_nombre?: string;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export const listarMiembros = async (
  params: ListadoMiembrosParams = {},
): Promise<PaginatedResponse<Miembro>> => {
  const { data } = await api.get('/api/miembros/', { params });
  return data;
};

export const getMiembro = async (id: number): Promise<Miembro> => {
  const { data } = await api.get(`/api/miembros/${id}/`);
  return data;
};

export const crearMiembro = async (body: Partial<Miembro>): Promise<Miembro> => {
  const { data } = await api.post('/api/miembros/', body);
  return data;
};

export const editarMiembro = async (id: number, body: Partial<Miembro>): Promise<Miembro> => {
  const { data } = await api.put(`/api/miembros/${id}/`, body);
  return data;
};

export const archivarMiembro = async (id: number): Promise<void> => {
  await api.delete(`/api/miembros/${id}/`);
};

export const listarMiembrosArchivados = async (): Promise<Miembro[]> => {
  const { data } = await api.get('/api/miembros/dados-de-baja/');
  return Array.isArray(data) ? data : data.results ?? [];
};

export const reactivarMiembro = async (id: number): Promise<Miembro> => {
  const { data } = await api.post(`/api/miembros/${id}/reactivar/`);
  return data;
};

export const getHistorialMembresia = async (id: number): Promise<HistorialMembresia[]> => {
  const { data } = await api.get(`/api/miembros/${id}/historial-membresia/`);
  return Array.isArray(data) ? data : data.results ?? [];
};

// ─── Family ──────────────────────────────────────────────────────────────────

export const getFamilia = async (id: number): Promise<FamiliaResponse> => {
  const { data } = await api.get(`/api/miembros/${id}/familia/`);
  return data;
};

const RELACIONES_NUCLEARES = ['esposo', 'esposa', 'hijo', 'hija'];

function calcularTipoFamilia(tipoRelacion: string): 'nuclear' | 'extendida' {
  return RELACIONES_NUCLEARES.includes(tipoRelacion) ? 'nuclear' : 'extendida';
}

export const agregarRelacionMiembro = async (
  miembroId: number,
  body: { miembro_relacionado_id: number; tipo_relacion: string; es_contacto_emergencia?: boolean },
): Promise<RelacionFamiliar> => {
  const payload = {
    ...body,
    tipo_familia: calcularTipoFamilia(body.tipo_relacion),
  };
  const { data } = await api.post(`/api/miembros/${miembroId}/familia/`, payload);
  return data;
};

export const eliminarRelacionMiembro = async (id: number): Promise<void> => {
  await api.delete(`/api/familia-relaciones/${id}/`);
};

// ─── Bitácora ────────────────────────────────────────────────────────────────

export const getBitacora = async (
  miembroId: number,
): Promise<PaginatedResponse<BitacoraEntrada>> => {
  const { data } = await api.get(`/api/miembros/${miembroId}/bitacora/`);
  return data;
};

export const crearEntradaBitacora = async (
  miembroId: number,
  body: { tipo: string; titulo: string; contenido: string; es_privado: boolean },
): Promise<BitacoraEntrada> => {
  const { data } = await api.post(`/api/miembros/${miembroId}/bitacora/`, body);
  return data;
};

export const eliminarEntradaBitacora = async (id: number): Promise<void> => {
  await api.delete(`/api/bitacora/${id}/`);
};

// ─── User conversion ─────────────────────────────────────────────────────────

export const convertirAUsuario = async (
  id: number,
): Promise<{ usuario_id: number; email_pendiente: string }> => {
  const { data } = await api.post(`/api/miembros/${id}/convertir-a-usuario/`);
  return data;
};

export const reenviarInvitacion = async (email: string): Promise<void> => {
  await api.post('/api/auth/reenviar-codigo/', { email });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getEstadoMembresiaColor(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'activo':
      return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'inactivo':
      return { bg: '#F5F5F5', text: '#757575' };
    case 'visitante':
      return { bg: '#E3F2FD', text: '#1565C0' };
    default:
      return { bg: '#F5F5F5', text: '#555' };
  }
}

export function getEstadoMembresiaLabel(estado: string): string {
  switch (estado) {
    case 'activo':
      return 'Activo';
    case 'inactivo':
      return 'Inactivo';
    case 'visitante':
      return 'Visitante';
    default:
      return estado;
  }
}

export const TIPOS_DOCUMENTO = [
  { value: 'rut', label: 'RUT' },
  { value: 'dni', label: 'DNI' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'otro', label: 'Otro' },
];

export const ESTADOS_MEMBRESIA = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'visitante', label: 'Visitante' },
];

export const TIPOS_BITACORA = [
  { value: 'nota', label: 'Nota' },
  { value: 'pastoral', label: 'Pastoral' },
  { value: 'consejeria', label: 'Consejería' },
  { value: 'disciplina', label: 'Disciplina' },
  { value: 'evento', label: 'Evento' },
  { value: 'otro', label: 'Otro' },
];

export const TIPOS_RELACION: { value: string; label: string; genero: 'M' | 'F' }[] = [
  // Familia nuclear
  { value: 'esposo', label: 'Esposo', genero: 'M' },
  { value: 'esposa', label: 'Esposa', genero: 'F' },
  { value: 'hijo', label: 'Hijo', genero: 'M' },
  { value: 'hija', label: 'Hija', genero: 'F' },
  // Padres y hermanos
  { value: 'padre', label: 'Padre', genero: 'M' },
  { value: 'madre', label: 'Madre', genero: 'F' },
  { value: 'hermano', label: 'Hermano', genero: 'M' },
  { value: 'hermana', label: 'Hermana', genero: 'F' },
  // Abuelos y nietos
  { value: 'abuelo', label: 'Abuelo', genero: 'M' },
  { value: 'abuela', label: 'Abuela', genero: 'F' },
  { value: 'nieto', label: 'Nieto', genero: 'M' },
  { value: 'nieta', label: 'Nieta', genero: 'F' },
  // Bisabuelos y bisnietos
  { value: 'bisabuelo', label: 'Bisabuelo', genero: 'M' },
  { value: 'bisabuela', label: 'Bisabuela', genero: 'F' },
  { value: 'bisnieto', label: 'Bisnieto', genero: 'M' },
  { value: 'bisnieta', label: 'Bisnieta', genero: 'F' },
  // Tíos y sobrinos
  { value: 'tio', label: 'Tío', genero: 'M' },
  { value: 'tia', label: 'Tía', genero: 'F' },
  { value: 'sobrino', label: 'Sobrino', genero: 'M' },
  { value: 'sobrina', label: 'Sobrina', genero: 'F' },
  // Primos
  { value: 'primo', label: 'Primo', genero: 'M' },
  { value: 'prima', label: 'Prima', genero: 'F' },
  // Familia política
  { value: 'suegro', label: 'Suegro', genero: 'M' },
  { value: 'suegra', label: 'Suegra', genero: 'F' },
  { value: 'yerno', label: 'Yerno', genero: 'M' },
  { value: 'nuera', label: 'Nuera', genero: 'F' },
  { value: 'cunado', label: 'Cuñado', genero: 'M' },
  { value: 'cunada', label: 'Cuñada', genero: 'F' },
];

/** Filtra los tipos de relación según el género del familiar seleccionado ('M' | 'F' | null). */
export const filtrarRelacionesPorGenero = (genero: string | null | undefined) => {
  if (!genero) return TIPOS_RELACION;
  return TIPOS_RELACION.filter((r) => r.genero === genero);
};
