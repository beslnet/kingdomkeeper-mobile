import type { FichaVisitaDetalle } from '../api/miembros';
import { fechaCorta } from './asistencia';

// Lo que el detalle de una visita muestra y ofrece. Las reglas son las de la lista de Visitas de la web
// (VisitasPage.jsx); el backend las vuelve a hacer cumplir, aquí solo se evita ofrecer lo que va a fallar.

/** Estados de un seguimiento que sigue en curso (se puede reasignar). */
const ABIERTOS = ['nuevo', 'en_progreso'];

export function accionesVisita(
  f: Pick<FichaVisitaDetalle, 'estado_membresia' | 'seguimiento' | 'no_contactar'>,
  permisos: { puedeAsignar: boolean; puedeBorrar: boolean },
): { asignar: boolean; reasignar: boolean; borrar: boolean } {
  const visitante = f.estado_membresia === 'visitante';
  return {
    // Quien pidió que no la contacten no recibe seguimiento; quien ya es hermano tampoco lo necesita.
    asignar: visitante && permisos.puedeAsignar && !f.seguimiento && !f.no_contactar,
    reasignar: permisos.puedeAsignar && !!f.seguimiento && ABIERTOS.includes(f.seguimiento.estado),
    // Borrar sus datos es editar la membresía (no lo suma la función de bienvenida).
    borrar: visitante && permisos.puedeBorrar,
  };
}

/** «En progreso · Marta Comité», «Pidió que no la contacten» o «Sin seguimiento». */
export function textoSeguimiento(f: Pick<FichaVisitaDetalle, 'seguimiento' | 'no_contactar'>): string {
  if (f.seguimiento) {
    const { estado_display: estado, responsable } = f.seguimiento;
    return responsable ? `${estado} · ${responsable}` : estado;
  }
  return f.no_contactar ? 'Pidió que no la contacten' : 'Sin seguimiento';
}

/** La autorización para guardar sus datos, con su fecha (el backend manda un ISO con hora). */
export function textoConsentimiento(f: Pick<FichaVisitaDetalle, 'consentimiento' | 'fecha_consentimiento'>): string {
  if (!f.consentimiento) return 'Sin autorización registrada';
  return f.fecha_consentimiento
    ? `Aceptó que se guarden sus datos el ${fechaCorta(f.fecha_consentimiento.slice(0, 10))}`
    : 'Aceptó que se guarden sus datos';
}

export const SIN_FICHA = 'Registrada sin ficha (desde la app o antes de la ficha)';

// Las palabras de «Borrar los datos de la visita» (BorrarDatosDialog.jsx de la web).
export const BORRAR_DATOS = {
  titulo: 'Borrar los datos de la visita',
  descripcion: (nombre: string) =>
    `${nombre} pidió que borren sus datos. Se borran ahora: su ficha, su contacto, su seguimiento y sus peticiones de oración.`,
  conserva: 'Se conservan sus asistencias, sin su nombre. Deja de aparecer en la lista de visitas.',
  advertencia: 'Esto no se puede deshacer.',
  boton: 'Borrar sus datos',
  hecho: 'Se borraron los datos de la visita.',
};

// Las de «Asignar» y «Reasignar seguimiento» (AsignarSeguimientoDialog.jsx).
export const textoAsignar = (nombre: string, reasignarDe: string | null | undefined, reasignar: boolean): string =>
  reasignar
    ? `${nombre}: el seguimiento lo lleva ${reasignarDe || 'alguien'}. Al reasignarlo, a quien elijas le llega un aviso.`
    : `${nombre}: se abre un caso de seguimiento y a quien elijas le llega un aviso (en la app y, si la tiene en el teléfono, también ahí).`;
