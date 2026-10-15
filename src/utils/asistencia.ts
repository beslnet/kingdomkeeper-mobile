import type { PersonaAsistencia } from '../api/asistencia';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-DD en hora local (toISOString corre el día en la noche). */
export function aIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date local a mediodía (evita saltos de día por horario de verano). */
export function deIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** El último día (hoy o antes) que cae en `dia` (0 = lunes … 6 = domingo, como el backend). */
export function ultimaFecha(dia: number, hoy: Date = new Date()): string {
  const diaJs = (dia + 1) % 7; // en JavaScript 0 es domingo
  const atras = (hoy.getDay() - diaJs + 7) % 7;
  return aIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - atras, 12));
}

export function sumarDias(iso: string, dias: number): string {
  const d = deIso(iso);
  d.setDate(d.getDate() + dias);
  return aIso(d);
}

/** "Domingo 11 de octubre" */
export function fechaLarga(iso: string): string {
  const d = deIso(iso);
  const dia = DIAS[d.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/**
 * La reunión con la que abre la pantalla: la que se hizo más recientemente (el culto del domingo un
 * lunes, la reunión de varones un viernes). Si empatan, la primera de la lista.
 */
export function reunionPorDefecto<T extends { dia_semana: number }>(reuniones: T[], hoy: Date = new Date()): T | null {
  let mejor: T | null = null;
  let mejorFecha = '';
  for (const r of reuniones) {
    const f = ultimaFecha(r.dia_semana, hoy);
    if (f > mejorFecha) {
      mejor = r;
      mejorFecha = f;
    }
  }
  return mejor;
}

export interface Familia {
  clave: string;
  nombre: string;
  personas: PersonaAsistencia[];
}

const claveDe = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Agrupa por `familia`. Una persona sola con ese nombre no es una familia: queda suelta.
 * Devuelve las familias y, aparte, las personas sin familia (en el orden recibido).
 */
export function armarFamilias(personas: PersonaAsistencia[]): { familias: Familia[]; sueltas: PersonaAsistencia[] } {
  const porClave = new Map<string, Familia>();
  for (const p of personas) {
    const texto = (p.familia ?? '').trim();
    if (!texto) continue;
    const clave = claveDe(texto);
    const f = porClave.get(clave);
    if (f) f.personas.push(p);
    else porClave.set(clave, { clave, nombre: texto.replace(/\s+/g, ' '), personas: [p] });
  }
  const familias = [...porClave.values()].filter((f) => f.personas.length > 1);
  const enFamilia = new Set(familias.flatMap((f) => f.personas.map((p) => p.id)));
  return { familias, sueltas: personas.filter((p) => !enFamilia.has(p.id)) };
}

export type EstadoFamilia = 'todos' | 'algunos' | 'ninguno';

export function estadoFamilia(f: Familia, presentes: Set<number>): EstadoFamilia {
  const n = f.personas.filter((p) => presentes.has(p.id)).length;
  if (n === 0) return 'ninguno';
  return n === f.personas.length ? 'todos' : 'algunos';
}

/** Un toque: si ya vinieron todos se desmarcan; si no, se marca a toda la familia. */
export function alternarFamilia(presentes: Set<number>, f: Familia): Set<number> {
  const siguiente = new Set(presentes);
  const quitar = estadoFamilia(f, presentes) === 'todos';
  for (const p of f.personas) {
    if (quitar) siguiente.delete(p.id);
    else siguiente.add(p.id);
  }
  return siguiente;
}

export function mismosPresentes(a: Set<number>, b: Set<number>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

/** Sin tildes ni mayúsculas, para que "perez" encuentre "Pérez". */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** El texto del campo "visitas que no dejaron ficha" como número (vacío = null). */
export function visitasComoNumero(texto: string): number | null {
  const n = parseInt(texto, 10);
  return Number.isNaN(n) ? null : Math.max(0, n);
}

/**
 * Qué mandar en `visitas_sin_ficha`: nada si no cambió (el backend deja lo que había), el número
 * si lo anotaron o cambiaron, y null si lo borraron teniendo uno guardado.
 */
export function visitasParaEnviar(texto: string, original: number | null): { visitas_sin_ficha?: number | null } {
  const actual = visitasComoNumero(texto);
  return actual === original ? {} : { visitas_sin_ficha: actual };
}

/** "Familia Pérez": si el nombre ya empieza con "Familia" no se repite. */
export function etiquetaFamilia(nombre: string): string {
  return /^familia\b/i.test(nombre.trim()) ? nombre.trim() : `Familia ${nombre.trim()}`;
}

/** "11-10-2026", como la muestra la web en "No han venido". */
export function fechaCorta(iso: string | null | undefined): string {
  return iso ? iso.split('-').reverse().join('-') : '';
}
