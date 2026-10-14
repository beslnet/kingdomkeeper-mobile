import {
  INITIAL_VISITA,
  armarVisita,
  validarVisita,
  mensajeDeErrorVisita,
  enEliminacion,
} from '../utils/fichaVisita';

const completa = {
  ...INITIAL_VISITA,
  nombre: ' Ana ',
  apellidos: ' Pérez ',
  telefono: ' +56911112222 ',
  email: 'ana@example.test',
  ciudad: ' Ñuñoa ',
  como_llego: 'invitado' as const,
  invitado_por_id: 7,
  quiere_contacto: 'whatsapp' as const,
  peticion: ' Salud para mi mamá ',
  responsable_id: 3,
  notas: ' Vino con su hijo ',
  consentimiento: true,
};

describe('validarVisita', () => {
  it('no deja guardar sin la autorización de la visita', () => {
    const errs = validarVisita({ ...completa, consentimiento: false });
    expect(errs.consentimiento).toBeTruthy();
  });

  it('con todo en orden no hay errores', () => {
    expect(validarVisita(completa)).toEqual({});
  });

  it('exige nombre, apellidos y un email con @', () => {
    const errs = validarVisita({ ...completa, nombre: 'A', apellidos: '', email: 'sin-arroba' });
    expect(Object.keys(errs).sort()).toEqual(['apellidos', 'email', 'nombre']);
  });
});

describe('armarVisita', () => {
  it('manda la ficha completa con el contrato del backend', () => {
    expect(armarVisita(completa)).toEqual({
      nombre: 'Ana',
      apellidos: 'Pérez',
      telefono: '+56911112222',
      email: 'ana@example.test',
      ciudad: 'Ñuñoa',
      ficha: {
        consentimiento: true,
        como_llego: 'invitado',
        invitado_por_id: 7,
        quiere_contacto: 'whatsapp',
        peticion: 'Salud para mi mamá',
        responsable_id: 3,
        notas: 'Vino con su hijo',
      },
    });
  });

  it('descarta al invitador si ya no eligió "Lo invitó alguien"', () => {
    const body = armarVisita({ ...completa, como_llego: 'redes' });
    expect(body.ficha.invitado_por_id).toBeNull();
  });

  it('con solo lo obligatorio manda la ficha igual, con el consentimiento', () => {
    const body = armarVisita({ ...INITIAL_VISITA, nombre: 'Ana', apellidos: 'Pérez', consentimiento: true });
    expect(body.telefono).toBeUndefined();
    expect(body.ciudad).toBeUndefined();
    expect(body.ficha).toEqual({
      consentimiento: true,
      como_llego: '',
      invitado_por_id: null,
      quiere_contacto: '',
      peticion: '',
      responsable_id: null,
      notas: '',
    });
  });
});

describe('mensajeDeErrorVisita', () => {
  it('lee el mensaje del campo que el backend rechazó', () => {
    const err = { response: { data: { consentimiento: 'Falta la autorización.' } } };
    expect(mensajeDeErrorVisita(err)).toBe('Falta la autorización.');
  });

  it('sin respuesta del servidor cae al mensaje genérico', () => {
    expect(mensajeDeErrorVisita(new Error('Network Error'))).toMatch(/No se pudo registrar/);
  });
});

describe('enEliminacion', () => {
  it('detecta la cuenta en proceso de eliminación por el flag o por el nombre', () => {
    expect(enEliminacion({ usuario_asociado: { cuenta_en_eliminacion: true } })).toBe(true);
    expect(enEliminacion({ nombre_completo: 'Ana (cuenta en proceso de eliminación)' })).toBe(true);
    expect(enEliminacion({ nombre_completo: 'Ana Pérez' })).toBe(false);
  });
});
