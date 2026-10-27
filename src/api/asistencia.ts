import api from './api';

// Asistencia a las reuniones semanales (backend: iglesia/views/asistencia.py).
// Marcan el pastor, los líderes y la administración (403 para el resto).

export interface Reunion {
  id: number;
  nombre: string;
  tipo: 'culto' | 'reunion';
  /** 0 = lunes … 6 = domingo (igual que el backend). */
  dia_semana: number;
  dia_semana_display: string;
  hora: string;
  lugar: string;
  grupo: number | null;
  grupo_nombre: string | null;
  activa: boolean;
  /**
   * Qué puede hacer quien mira con ESTA reunión (backend: la misma regla que da el 403). El líder y los
   * co-líderes de un grupo los tienen en la reunión de su grupo. Opcionales: un backend anterior no los manda.
   */
  puedo_seguimiento?: boolean;
  puedo_configurar?: boolean;
}

/** La reunión semanal como la trae el detalle de un grupo (`reuniones`), con la última vez que se pasó lista. */
export interface ReunionDelGrupo {
  id: number;
  nombre: string;
  tipo: 'culto' | 'reunion';
  dia_semana: number;
  dia_semana_display: string;
  /** HH:MM */
  hora: string;
  lugar: string;
  /** Cuántos se marcan (los integrantes del grupo). */
  total: number;
  ultima: { fecha: string; presentes: number; tema?: string } | null;
  /** false = pausada: no se pasa lista; quien gestiona el grupo la reactiva. Un backend anterior no lo manda. */
  activa?: boolean;
}

export interface PersonaAsistencia {
  id: number;
  nombre: string;
  presente: boolean;
  /**
   * Nombre de su familia (Miembro.grupo_familiar), ya con una sola escritura para todos los de la
   * misma familia: se agrupa por igualdad. null si no tiene.
   */
  familia: string | null;
}

/** Una visita que dejó ficha ese día. Su ficha y su seguimiento están en el detalle de la visita (Membresía). */
export interface VisitaDelDia {
  id: number;
  nombre: string;
  telefono: string | null;
}

export interface AsistenciaDelDia {
  fecha: string;
  guardada: boolean;
  presentes: number;
  /** Cuántas visitas no dejaron ficha; null si no se anotó. */
  visitas_sin_ficha: number | null;
  /** Las que sí dejaron ficha ese día (las reuniones de grupo no las traen). */
  visitas: VisitaDelDia[];
  personas: PersonaAsistencia[];
  /**
   * Vinieron y no están en `personas`: invitados que el grupo marcó desde sus eventos. Cuentan en el
   * informe; aquí solo se muestran. Opcional: un backend anterior no lo manda.
   */
  tambien_vinieron?: { id: number; nombre: string }[];
  /** Qué se vio ese día ("Efesios 5"). Opcional: un backend anterior no lo manda. */
  tema?: string;
}

export interface GuardarAsistenciaPayload {
  fecha: string;
  presentes: number[];
  /** Omitido = no se toca lo que ya había; null = borrar el número; n = anotarlo. */
  visitas_sin_ficha?: number | null;
  /**
   * Una fecha que no cae en el día de la reunión (un culto de domingo un martes) el backend la
   * rechaza con `codigo: 'otro_dia'` salvo que venga confirmada: entra al promedio del informe.
   */
  confirmar_otro_dia?: boolean;
  /** Qué se vio ese día. Omitido = no se toca; "" = borrarlo. */
  tema?: string;
}

/** Lo que se manda al crear o editar una reunión (web: «Nueva reunión»). */
export interface ReunionPayload {
  nombre: string;
  tipo: 'culto' | 'reunion';
  dia_semana: number;
  /** HH:MM */
  hora: string;
  lugar: string;
  /** null = de toda la iglesia (se marca a todos los hermanos activos). */
  grupo: number | null;
}

export const listarReunionesActivas = async (): Promise<Reunion[]> => {
  const { data } = await api.get('/api/asistencia/reuniones/', { params: { activas: 1 } });
  return Array.isArray(data) ? data : data.results ?? [];
};

/** Todas, también las pausadas (para quien puede reactivarlas: `puedo_configurar`). */
export const listarReuniones = async (): Promise<Reunion[]> => {
  const { data } = await api.get('/api/asistencia/reuniones/', { params: { page_size: 100 } });
  return Array.isArray(data) ? data : data.results ?? [];
};

/** Quitar una reunión. Si ya tiene asistencia guardada el backend responde 400 y pide pausarla. */
export const eliminarReunion = async (id: number): Promise<void> => {
  await api.delete(`/api/asistencia/reuniones/${id}/`);
};

/** Una fila del informe del mes (backend: services/asistencia.informe_mes). */
export interface InformeReunion {
  reunion_id: number;
  reunion: string;
  veces: number;
  promedio_total: number | null;
  promedio_hermanos: number | null;
  visitas_con_ficha: number;
  visitas_sin_ficha: number;
  maximo: number | null;
}

/** El informe del mes, `mes` = AAAA-MM. Lo ven el pastor, los líderes y quienes lideran la asistencia. */
export const obtenerInforme = async (mes: string): Promise<{ mes: string; reuniones: InformeReunion[] }> => {
  const { data } = await api.get('/api/asistencia/reuniones/informe/', { params: { mes } });
  return data;
};

// Crear y editar: el pastor, la administración y quienes lideran la asistencia (`asistencia.configurar`).
export const crearReunion = async (payload: ReunionPayload): Promise<Reunion> => {
  const { data } = await api.post('/api/asistencia/reuniones/', payload);
  return data;
};

/** `activa: false` la pausa (deja de aparecer para pasar lista y conserva lo marcado); `true` la reactiva. */
export const editarReunion = async (
  id: number,
  payload: Partial<ReunionPayload> & { activa?: boolean }
): Promise<Reunion> => {
  const { data } = await api.patch(`/api/asistencia/reuniones/${id}/`, payload);
  return data;
};

export const obtenerAsistenciaDelDia = async (
  reunionId: number,
  fecha: string
): Promise<AsistenciaDelDia> => {
  const { data } = await api.get(`/api/asistencia/reuniones/${reunionId}/asistencia/`, {
    params: { fecha },
  });
  return data;
};

export const guardarAsistenciaDelDia = async (
  reunionId: number,
  payload: GuardarAsistenciaPayload
): Promise<AsistenciaDelDia> => {
  const { data } = await api.post(`/api/asistencia/reuniones/${reunionId}/asistencia/`, payload);
  return data;
};

// ─── No han venido y seguimiento (web: AsistenciaPage → "No han venido") ─────

/** Cuántas reuniones marcadas seguidas sin venir cuentan como "no ha venido" (igual que la web). */
export const ULTIMAS_REUNIONES = 3;

/** El caso de seguimiento de una persona: quién lo lleva y en qué va. */
export interface SeguimientoResumen {
  id: number;
  estado: string;
  estado_display: string;
  responsable: string | null;
}

export interface PersonaAusente {
  id: number;
  nombre: string;
  /** null si pidió que no la contacten. */
  telefono: string | null;
  no_contactar: boolean;
  ultima_asistencia: string | null;
  seguimiento: SeguimientoResumen | null;
}

export interface AusentesRespuesta {
  /** false = todavía no hay `ultimas` reuniones con nombres marcados: no se acusa a nadie. */
  suficientes: boolean;
  marcadas: number;
  desde?: string;
  personas: PersonaAusente[];
}

export interface ResponsableSeguimiento {
  id: number;
  nombre: string;
}

export const obtenerAusentes = async (
  reunionId: number,
  ultimas: number = ULTIMAS_REUNIONES
): Promise<AusentesRespuesta> => {
  const { data } = await api.get(`/api/asistencia/reuniones/${reunionId}/ausentes/`, {
    params: { ultimas },
  });
  return data;
};

/**
 * Quienes pueden llevar un seguimiento: pastor, líderes, administración y el equipo de asistencia; de la reunión
 * de un grupo, también su líder y sus co-líderes.
 */
export const listarResponsablesSeguimiento = async (reunionId?: number): Promise<ResponsableSeguimiento[]> => {
  const { data } = await api.get('/api/asistencia/reuniones/responsables/', {
    params: reunionId ? { reunion: reunionId } : undefined,
  });
  return data;
};

/**
 * 201: abre el caso. 409 (axios lo lanza): la persona ya tenía un seguimiento abierto; ver
 * `yaTieneSeguimiento`.
 */
export const asignarSeguimientoAusente = async (
  reunionId: number,
  payload: { miembro_id: number; responsable_id: number; ultimas?: number }
): Promise<{ seguimiento: SeguimientoResumen }> => {
  const { data } = await api.post(
    `/api/asistencia/reuniones/${reunionId}/asignar-seguimiento/`,
    { ultimas: ULTIMAS_REUNIONES, ...payload }
  );
  return data;
};

export const yaTieneSeguimiento = (err: any): boolean => err?.response?.status === 409;
