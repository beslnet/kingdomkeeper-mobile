import type {
  AcompanarPayload,
  AlcanceComunicado,
  CasoInfoPeticion,
  PeticionOracion,
  PeticionPayload,
} from '../api/pastoral';

/** YYYY-MM-DD en hora local (no UTC: a las 21:00 en Chile `toISOString` ya da el día siguiente). */
export function aISO(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

export function deISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function hoyISO(ahora: Date = new Date()): string {
  return aISO(ahora);
}

/** 2026-10-13 → 13-10-2026 (el mismo formato de la web). */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** El primer mensaje que trae el backend ({campo: [msg]}, {detail}, o texto) o el de por defecto. */
export function mensajeDeError(err: any, porDefecto: string): string {
  const data = err?.response?.data;
  if (!data) return porDefecto;
  if (typeof data === 'string') return data;
  if (data.detail) return String(data.detail);
  const primero = Object.values(data)[0];
  if (primero === undefined || primero === null) return porDefecto;
  return Array.isArray(primero) ? String(primero[0]) : String(primero);
}

export function formularioVacio(hoy: string = hoyISO()): PeticionPayload {
  return { por_quien: '', motivo: '', fecha: hoy, visibilidad: 'privada', consentimiento_publicar: false };
}

/**
 * Después de anotar: en el culto se anotan varias seguidas, así que se queda la misma fecha y
 * la misma visibilidad. El consentimiento NO: lo da cada persona por su petición.
 */
export function formularioTrasAnotar(f: PeticionPayload): PeticionPayload {
  return { ...formularioVacio(f.fecha), visibilidad: f.visibilidad };
}

export function puedeAnotar(f: PeticionPayload): boolean {
  if (!f.por_quien.trim() || !f.motivo.trim()) return false;
  if (f.visibilidad === 'congregacion' && !f.consentimiento_publicar) return false;
  return true;
}

export function payloadParaAnotar(f: PeticionPayload): PeticionPayload {
  return {
    ...f,
    por_quien: f.por_quien.trim(),
    motivo: f.motivo.trim(),
    consentimiento_publicar: f.visibilidad === 'congregacion' && f.consentimiento_publicar,
  };
}

/**
 * Texto del chip de una petición en oración que está por vencer. `dias` es `vence_en_dias` del
 * backend: llega solo desde 30 días antes (si no, null), así que aquí no se recalcula el plazo.
 */
export function textoVencimiento(dias: number | null | undefined): string {
  if (dias === null || dias === undefined) return '';
  if (dias <= 0) return 'Vence hoy';
  return dias === 1 ? 'Vence en 1 día' : `Vence en ${dias} días`;
}

/**
 * ¿Se puede armar el comunicado con el testimonio? Si no, `motivo` dice por qué. Las mismas reglas
 * y palabras que la web (peticionesUtils.js); la API las hace cumplir, esto solo evita ofrecer un
 * botón que sabemos que va a fallar.
 */
export function evaluarCompartirTestimonio(
  p: Pick<PeticionOracion, 'estado' | 'visibilidad' | 'consentimiento_publicar' | 'testimonio' | 'comunicacion_info'>
): { puede: boolean; motivo: string } {
  if (p.comunicacion_info) return { puede: false, motivo: 'Ya tiene un borrador de comunicado.' };
  if (p.estado !== 'respondida') return { puede: false, motivo: 'Solo se comparte una petición respondida.' };
  if (p.visibilidad !== 'congregacion' || !p.consentimiento_publicar) {
    return { puede: false, motivo: 'Es privada: no se puede compartir con la congregación.' };
  }
  if (!p.testimonio || !p.testimonio.trim()) return { puede: false, motivo: 'Falta el testimonio de la respuesta.' };
  return { puede: true, motivo: '' };
}

/** Texto corto del caso enlazado: "Visita · Nuevo · Pastor Test". */
export function resumenCaso(caso: Pick<CasoInfoPeticion, 'tipo_display' | 'estado_display' | 'responsable_nombre'> | null | undefined): string {
  if (!caso) return '';
  return [caso.tipo_display, caso.estado_display, caso.responsable_nombre].filter(Boolean).join(' · ');
}

/** Un comunicado llega solo a quien tiene cuenta en la app: la frase que se muestra al compartir. */
export function fraseAlcance(alcance: AlcanceComunicado | null | undefined): string {
  if (!alcance) return '';
  const { con_cuenta: con, miembros_activos: total } = alcance;
  if (!total) return 'La iglesia no tiene hermanos activos registrados.';
  if (con >= total) return `Llegará a los ${con} hermanos activos.`;
  return `Llegará a ${con} de ${total} hermanos activos: solo a quienes tienen cuenta en la app.`;
}

/** El cuerpo de "Necesita acompañamiento": sin responsable queda quien lo abre; la nota solo si hay. */
export function payloadAcompanar(f: {
  tipo: 'oracion' | 'visita';
  responsableId: number | null;
  nota: string;
}): AcompanarPayload {
  return {
    tipo: f.tipo,
    ...(f.responsableId ? { responsable_id: f.responsableId } : {}),
    ...(f.nota.trim() ? { nota: f.nota.trim() } : {}),
  };
}
