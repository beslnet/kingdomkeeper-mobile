/**
 * A quién le llega de verdad una comunicación.
 *
 * El envío es por notificación en la app, así que solo la reciben los miembros ACTIVOS que tienen
 * una cuenta vinculada (`comunicaciones/services/comunicacion_service.py::_resolver_destinatarios`).
 * El grupo especial `id 0` del backend ("Miembros con cuenta activa") ya viene con ese conteo; la app
 * no debe inventar una opción "todos los miembros" que prometa más.
 */

/** Id del grupo "todos los miembros con cuenta" que devuelve /grupos-destinatarios/. */
export const GRUPO_CON_CUENTA_ID = 0;

/** Cuántas personas reciben el mensaje según lo elegido (el grupo ya incluye a cualquier individual). */
export function alcanceEnvio(opts: {
  grupoConCuenta: number | null; // num_miembros del grupo si está elegido; null si no
  individuales: number;
}): number {
  return opts.grupoConCuenta !== null ? opts.grupoConCuenta : opts.individuales;
}

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/** Aviso bajo el selector de grupo: a quién llega y por qué no a los demás. */
export function textoSoloConCuenta(conCuenta: number, activos: number | null): string {
  const base = `El mensaje llega por la app, así que solo lo reciben los hermanos que tienen cuenta: ${conCuenta}`;
  if (activos === null || activos < conCuenta) {
    return `${base}. Quien no tenga cuenta no lo verá.`;
  }
  const sinCuenta = activos - conCuenta;
  if (sinCuenta === 0) return `${base} de ${activos} miembros activos: les llega a todos.`;
  return (
    `${base} de ${activos} miembros activos. ` +
    `${sinCuenta} ${plural(sinCuenta, 'no tiene cuenta y no lo verá', 'no tienen cuenta y no lo verán')}.`
  );
}

/** Resumen antes de guardar o enviar: "Llegará a 6 personas con cuenta en la app." */
export function textoLlegara(n: number): string {
  if (n === 0) return 'No llegará a nadie: ninguno de los elegidos tiene cuenta en la app.';
  return `Llegará a ${n} ${plural(n, 'persona', 'personas')} con cuenta en la app.`;
}
