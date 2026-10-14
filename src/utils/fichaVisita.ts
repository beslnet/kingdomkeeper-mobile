import type { ComoLlego, QuiereContacto, RegistrarVisitaInput } from '../api/miembros';

export interface VisitaFields {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  ciudad: string;
  como_llego: ComoLlego | '';
  invitado_por_id: number | null;
  quiere_contacto: QuiereContacto | '';
  peticion: string;
  responsable_id: number | null;
  notas: string;
  consentimiento: boolean;
}

export const INITIAL_VISITA: VisitaFields = {
  nombre: '',
  apellidos: '',
  telefono: '',
  email: '',
  ciudad: '',
  como_llego: '',
  invitado_por_id: null,
  quiere_contacto: '',
  peticion: '',
  responsable_id: null,
  notas: '',
  consentimiento: false,
};

export function validarVisita(f: VisitaFields): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.nombre || f.nombre.trim().length < 2) {
    errs.nombre = 'El nombre debe tener al menos 2 caracteres.';
  }
  if (!f.apellidos || f.apellidos.trim().length < 2) {
    errs.apellidos = 'Los apellidos deben tener al menos 2 caracteres.';
  }
  if (f.email && !f.email.includes('@')) {
    errs.email = 'Ingresa un email válido.';
  }
  if (!f.consentimiento) {
    errs.consentimiento = 'Sin su autorización no se pueden guardar sus datos.';
  }
  return errs;
}

/** Arma el pedido de registrar-visita. Quien llama ya validó que hay consentimiento. */
export function armarVisita(f: VisitaFields): RegistrarVisitaInput {
  return {
    nombre: f.nombre.trim(),
    apellidos: f.apellidos.trim(),
    telefono: f.telefono.trim() || undefined,
    email: f.email.trim() || undefined,
    ciudad: f.ciudad.trim() || undefined,
    ficha: {
      consentimiento: true,
      como_llego: f.como_llego,
      // Si cambió de "Lo invitó alguien" a otra opción, el invitador que quedó elegido no vale.
      invitado_por_id: f.como_llego === 'invitado' ? f.invitado_por_id : null,
      quiere_contacto: f.quiere_contacto,
      peticion: f.peticion.trim(),
      responsable_id: f.responsable_id,
      notas: f.notas.trim(),
    },
  };
}

/** El backend responde 400 con `{campo: mensaje}`; axios solo dice "status code 400". */
export function mensajeDeErrorVisita(err: any): string {
  const d = err?.response?.data;
  if (typeof d === 'string' && d) return d;
  if (d && typeof d === 'object') {
    if (d.detail) return String(d.detail);
    const primero = Object.values(d)[0];
    if (primero) return String(Array.isArray(primero) ? primero[0] : primero);
  }
  return 'No se pudo registrar la visita. Intenta de nuevo.';
}

const ETIQUETA_ELIMINACION = '(cuenta en proceso de eliminación)';

/** Misma regla que la web (memberProtection.js): quien está borrando su cuenta no se ofrece como opción. */
export function enEliminacion(p: any): boolean {
  if (!p) return false;
  if (p.usuario_asociado?.cuenta_en_eliminacion === true) return true;
  return [p.nombre_completo, p.nombre_display].some(
    t => typeof t === 'string' && t.includes(ETIQUETA_ELIMINACION),
  );
}
