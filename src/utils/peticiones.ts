import type { PeticionPayload } from '../api/pastoral';

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
