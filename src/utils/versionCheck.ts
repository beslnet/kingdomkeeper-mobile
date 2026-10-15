import { APP_VERSION } from '../version';

/**
 * Pasa "1.2.3" (o "1.2.3-beta") a [1, 2, 3]. Un tramo que no es número vale 0.
 * Devuelve null si el texto no se parece a una versión (vacío, undefined, "abc").
 */
function parseVersion(v: unknown): [number, number, number] | null {
  if (typeof v !== 'string') return null;
  const m = /^\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

/**
 * Returns true if `current` is strictly older than `minimum`.
 * Supports "major.minor.patch" semver format. Si alguna de las dos no es una versión
 * legible devuelve false: ante la duda, la app NO se bloquea.
 */
export function isVersionOutdated(current: string, minimum: string): boolean {
  const c = parseVersion(current);
  const m = parseVersion(minimum);
  if (!c || !m) return false;
  if (c[0] !== m[0]) return c[0] < m[0];
  if (c[1] !== m[1]) return c[1] < m[1];
  return c[2] < m[2];
}

/** Bundle id de la app: el que usa el lookup del App Store. */
export const BUNDLE_ID = 'com.kingdomkeeper.mobile';

/**
 * URL del lookup del App Store con la que iOS decide si forzar la actualización.
 *
 * Apple sirve ese lookup con `cache-control: max-age≈26000` (unas 7 horas): pedido
 * siempre con la misma URL, el teléfono sigue viendo la versión ANTERIOR durante horas
 * después de que llega el correo de "publicada" (medido en armemosdojang con la 1.5.1,
 * 2026-09-30: sin el parámetro, 8 de 8 respuestas decían 1.5.0; con él, 1.5.1). El
 * parámetro `t` cambia en cada consulta, así que ni la caché de Apple ni la del
 * teléfono pueden devolver una respuesta vieja.
 */
export function appStoreLookupUrl(now: number = Date.now()): string {
  return `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=cl&t=${now}`;
}

export type LookupDecision =
  | { force: true; storeVersion: string }
  | { force: false; reason: 'sin-resultado' | 'version-ilegible' | 'al-dia' };

/**
 * Qué hacer con la respuesta del lookup. Solo fuerza si la tienda publica una versión
 * ESTRICTAMENTE mayor que la instalada. Una respuesta vacía (la versión aún no se
 * propagó, o el bundle no existe en ese país), sin `version`, o una tienda con versión
 * menor que la instalada (build de TestFlight, retiro de una versión) no bloquea a nadie.
 */
export function decideFromLookup(json: any, installed: string = APP_VERSION): LookupDecision {
  const result = json?.results?.[0];
  if (!result) return { force: false, reason: 'sin-resultado' };
  const storeVersion = result.version;
  if (!parseVersion(storeVersion) || !parseVersion(installed)) {
    return { force: false, reason: 'version-ilegible' };
  }
  return isVersionOutdated(installed, storeVersion)
    ? { force: true, storeVersion }
    : { force: false, reason: 'al-dia' };
}
