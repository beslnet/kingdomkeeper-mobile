import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TipoComunicacion = 'notificacion' | 'anuncio' | 'recordatorio' | 'alerta';
export type CanalComunicacion = 'in_app' | 'email' | 'sms' | 'whatsapp';
export type EstadoComunicacion =
  | 'borrador'
  | 'programada'
  | 'enviada'
  | 'enviada_con_fallos'
  | 'fallida'
  | 'cancelada';
export type PrioridadComunicacion = 'baja' | 'normal' | 'alta' | 'urgente';

export interface Comunicacion {
  id: number;
  titulo: string;
  contenido: string;
  resumen: string | null;
  tipo: TipoComunicacion;
  tipo_display: string;
  canal: CanalComunicacion;
  canal_nombre: string;
  estado: EstadoComunicacion;
  estado_display: string;
  prioridad: PrioridadComunicacion;
  prioridad_display: string;
  num_destinatarios: number;
  num_destinatarios_display: string;
  fecha_programada: string | null;
  fecha_envio: string | null;
  created_at: string;
  estadisticas_envio: {
    enviados: number;
    entregados: number;
    leidos: number;
    fallos: number;
    pendientes: number;
  };
  destinatarios_detalle: { id: number; nombre: string; email: string; telefono: string }[];
  grupos_destinatarios_detalle: { id: number; nombre: string; num_miembros: number }[];
  archivos_adjuntos: { id: number; nombre: string; tipo_mime: string; tamanio: number; url: string }[];
  created_by: string | null;
  // Received-only fields
  remitente?: string;
  leida?: boolean;
  fecha_lectura?: string | null;
}

export interface ComunicacionPayload {
  titulo: string;
  contenido: string;
  resumen?: string;
  tipo: string;
  canal: string;
  prioridad: string;
  destinatarios?: number[];
  grupos_destinatarios?: number[];
}

export interface Canal {
  id: string;
  nombre: string;
}

export interface Destinatario {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
}

export interface GrupoDestinatario {
  id: number;
  nombre: string;
  num_miembros: number;
}

// ─── Existing endpoints ───────────────────────────────────────────────────────

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

// ─── Management endpoints ─────────────────────────────────────────────────────

export const listarComunicaciones = async (params?: {
  tipo?: string;
  estado?: string;
  canal?: string;
  prioridad?: string;
  search?: string;
  page?: number;
}) => {
  const { data } = await api.get('/api/comunicaciones/', { params });
  return data;
};

export const obtenerComunicacion = async (id: number): Promise<Comunicacion> => {
  const { data } = await api.get(`/api/comunicaciones/${id}/`);
  return data;
};

export const crearComunicacion = async (payload: ComunicacionPayload): Promise<Comunicacion> => {
  const { data } = await api.post('/api/comunicaciones/', payload);
  return data;
};

export const actualizarComunicacion = async (
  id: number,
  payload: Partial<ComunicacionPayload>
): Promise<Comunicacion> => {
  const { data } = await api.put(`/api/comunicaciones/${id}/`, payload);
  return data;
};

export const eliminarComunicacion = async (id: number): Promise<void> => {
  await api.delete(`/api/comunicaciones/${id}/`);
};

export const enviarComunicacion = async (id: number) => {
  const { data } = await api.post(`/api/comunicaciones/${id}/enviar/`);
  return data;
};

export const reintentarComunicacion = async (id: number) => {
  const { data } = await api.post(`/api/comunicaciones/${id}/reintentar/`);
  return data;
};

export const listarCanales = async (): Promise<Canal[]> => {
  const { data } = await api.get('/api/comunicaciones/canales/');
  return data;
};

export const listarDestinatarios = async (): Promise<Destinatario[]> => {
  const { data } = await api.get('/api/comunicaciones/destinatarios/');
  return data;
};

export const listarGruposDestinatarios = async (): Promise<GrupoDestinatario[]> => {
  const { data } = await api.get('/api/comunicaciones/grupos-destinatarios/');
  return data;
};
