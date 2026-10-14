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

/** Una visita que dejó ficha ese día: se identifica y se le da seguimiento (en la web). */
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
}

export interface GuardarAsistenciaPayload {
  fecha: string;
  presentes: number[];
  /** Omitido = no se toca lo que ya había; null = borrar el número; n = anotarlo. */
  visitas_sin_ficha?: number | null;
}

export const listarReunionesActivas = async (): Promise<Reunion[]> => {
  const { data } = await api.get('/api/asistencia/reuniones/', { params: { activas: 1 } });
  return Array.isArray(data) ? data : data.results ?? [];
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
