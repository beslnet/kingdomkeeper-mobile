/**
 * Logger de desarrollo. En __DEV__ imprime a la consola de Metro; en release no
 * escribe nada.
 *
 * Por qué no `console.warn(msg, error)` a secas: un error de axios arrastra su
 * `config`, y ahí van los headers de la petición —incluido `Authorization: Bearer …`—
 * y el cuerpo, que en el login es la contraseña. Eso no debe llegar al log del
 * teléfono de nadie. Los errores se reducen a su mensaje y su status HTTP.
 */
export function dlog(tag: string, payload?: unknown): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[KK] ${tag}`, payload === undefined ? '' : redact(payload));
  }
}

/** Reduce un error (o cualquier valor) a algo que se pueda imprimir sin filtrar datos. */
export function redact(payload: unknown): unknown {
  const err = payload as { message?: string; response?: { status?: number }; isAxiosError?: boolean; stack?: string };
  if (err && typeof err === 'object' && (err.isAxiosError || err.response || err.stack)) {
    return { message: err.message, status: err.response?.status };
  }
  return payload;
}
