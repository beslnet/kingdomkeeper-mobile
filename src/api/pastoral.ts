import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoCaso = 'visita' | 'oracion' | 'consejeria' | 'crisis' | 'seguimiento' | 'otro';
export type EstadoCaso = 'nuevo' | 'en_progreso' | 'cerrado';

export interface ComentarioCaso {
  id: number;
  contenido: string;
  es_sistema: boolean;
  usuario: { id: number; nombre_completo: string; email: string } | null;
  created_at: string;
}

export interface LogCasoPastoral {
  id: number;
  tipo_accion: string;
  tipo_accion_display: string;
  usuario_nombre: string;
  descripcion: string;
  datos_adicionales: any;
  created_at: string;
}

export interface CasoPastoral {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: TipoCaso;
  tipo_display: string;
  estado: EstadoCaso;
  estado_display: string;
  es_confidencial: boolean;
  fecha_apertura: string;
  fecha_cierre: string | null;
  resumen_cierre: string;
  miembro: { id: number; nombre_completo: string; email: string } | null;
  responsable: {
    id: number;
    nombre: string;
    apellidos: string;
    email: string;
    nombre_completo: string;
    foto_perfil_url: string | null;
  } | null;
  created_by: {
    id: number;
    nombre: string;
    apellidos: string;
    email: string;
    nombre_completo: string;
    foto_perfil_url: string | null;
  };
  comentarios: ComentarioCaso[];
  created_at: string;
  updated_at: string;
}

export interface CasoPastoralPayload {
  titulo: string;
  descripcion: string;
  tipo: string;
  miembro_id?: number | null;
  responsable_id?: number | null;
  es_confidencial: boolean;
}

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  nombre_completo?: string;
  foto_perfil_url?: string | null;
}

// ─── Case endpoints ───────────────────────────────────────────────────────────

export const obtenerCasos = async (params?: {
  estado?: string;
  tipo?: string;
  miembro_id?: number;
  search?: string;
  page?: number;
}) => {
  const { data } = await api.get('/api/pastoral/casos/', { params });
  return data;
};

export const obtenerMisCasos = async (params?: { page?: number }) => {
  const { data } = await api.get('/api/pastoral/casos/mis-casos/', { params });
  return data;
};

export const obtenerCaso = async (id: number): Promise<CasoPastoral> => {
  const { data } = await api.get(`/api/pastoral/casos/${id}/`);
  return data;
};

export const crearCaso = async (payload: CasoPastoralPayload): Promise<CasoPastoral> => {
  const { data } = await api.post('/api/pastoral/casos/', payload);
  return data;
};

export const actualizarCaso = async (
  id: number,
  payload: Partial<CasoPastoralPayload>
): Promise<CasoPastoral> => {
  const { data } = await api.patch(`/api/pastoral/casos/${id}/`, payload);
  return data;
};

export const eliminarCaso = async (id: number): Promise<void> => {
  await api.delete(`/api/pastoral/casos/${id}/`);
};

// ─── State transition endpoints ───────────────────────────────────────────────

export const iniciarCaso = async (id: number): Promise<CasoPastoral> => {
  const { data } = await api.post(`/api/pastoral/casos/${id}/iniciar/`);
  return data;
};

export const cerrarCaso = async (
  id: number,
  resumen_cierre: string
): Promise<CasoPastoral> => {
  const { data } = await api.post(`/api/pastoral/casos/${id}/cerrar/`, { resumen_cierre });
  return data;
};

export const reabrirCaso = async (id: number, motivo: string): Promise<CasoPastoral> => {
  const { data } = await api.post(`/api/pastoral/casos/${id}/reabrir/`, { motivo });
  return data;
};

// ─── Comments & logs ─────────────────────────────────────────────────────────

export const listarComentarios = async (id: number): Promise<ComentarioCaso[]> => {
  const { data } = await api.get(`/api/pastoral/casos/${id}/comentarios/`);
  return Array.isArray(data) ? data : (data.results ?? []);
};

export const agregarComentario = async (
  id: number,
  contenido: string
): Promise<ComentarioCaso> => {
  const { data } = await api.post(`/api/pastoral/casos/${id}/comentarios/`, { contenido });
  return data;
};

export const obtenerLogs = async (id: number): Promise<LogCasoPastoral[]> => {
  const { data } = await api.get(`/api/pastoral/casos/${id}/logs/`);
  return Array.isArray(data) ? data : (data.results ?? []);
};

// ─── User listing (for responsable search) ───────────────────────────────────

export const listarUsuarios = async (): Promise<Usuario[]> => {
  const { data } = await api.get('/api/core/usuarios/', {
    params: { estado: 'activo', page_size: 100 },
  });
  return Array.isArray(data) ? data : (data.results ?? []);
};
