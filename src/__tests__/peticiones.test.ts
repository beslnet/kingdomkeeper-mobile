import {
  aISO,
  fechaCorta,
  formularioTrasAnotar,
  formularioVacio,
  hoyISO,
  mensajeDeError,
  payloadParaAnotar,
  puedeAnotar,
  textoVencimiento,
} from '../utils/peticiones';

jest.mock('../api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } }));
import api from '../api/api';
import { listarPeticiones } from '../api/pastoral';

const mockGet = api.get as jest.Mock;

describe('fechas', () => {
  it('hoyISO usa la fecha local, no la UTC (a las 21:30 en Chile UTC ya es mañana)', () => {
    // 2026-10-13 21:30 hora local; en UTC-3 sería 2026-10-14 00:30Z
    expect(hoyISO(new Date(2026, 9, 13, 21, 30))).toBe('2026-10-13');
    expect(aISO(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });

  it('fechaCorta da día-mes-año como la web', () => {
    expect(fechaCorta('2026-10-13')).toBe('13-10-2026');
    expect(fechaCorta(null)).toBe('');
  });
});

describe('mensajeDeError', () => {
  it('toma el primer mensaje del campo que falló', () => {
    const err = { response: { data: { consentimiento_publicar: ['Para leerla en la congregación hace falta que quien la pidió lo acepte.'] } } };
    expect(mensajeDeError(err, 'x')).toBe('Para leerla en la congregación hace falta que quien la pidió lo acepte.');
  });
  it('usa detail, texto plano o el mensaje por defecto', () => {
    expect(mensajeDeError({ response: { data: { detail: 'Sin permiso' } } }, 'x')).toBe('Sin permiso');
    expect(mensajeDeError({ response: { data: 'boom' } }, 'x')).toBe('boom');
    expect(mensajeDeError(new Error('red'), 'No se pudo')).toBe('No se pudo');
    expect(mensajeDeError({ response: { data: {} } }, 'No se pudo')).toBe('No se pudo');
  });
});

describe('formulario de anotar', () => {
  const base = { ...formularioVacio('2026-10-11'), por_quien: 'Don Lucho', motivo: 'Trabajo' };

  it('nace privada y sin consentimiento', () => {
    const f = formularioVacio('2026-10-11');
    expect(f.visibilidad).toBe('privada');
    expect(f.consentimiento_publicar).toBe(false);
  });

  it('no deja anotar sin «por quién» ni motivo (ni solo espacios)', () => {
    expect(puedeAnotar(formularioVacio())).toBe(false);
    expect(puedeAnotar({ ...base, por_quien: '   ' })).toBe(false);
    expect(puedeAnotar({ ...base, motivo: '' })).toBe(false);
    expect(puedeAnotar(base)).toBe(true);
  });

  it('para la congregación exige la casilla de consentimiento', () => {
    expect(puedeAnotar({ ...base, visibilidad: 'congregacion' })).toBe(false);
    expect(puedeAnotar({ ...base, visibilidad: 'congregacion', consentimiento_publicar: true })).toBe(true);
  });

  it('el payload recorta espacios y nunca manda un consentimiento huérfano', () => {
    const p = payloadParaAnotar({ ...base, por_quien: '  Don Lucho ', consentimiento_publicar: true });
    expect(p.por_quien).toBe('Don Lucho');
    expect(p.visibilidad).toBe('privada');
    expect(p.consentimiento_publicar).toBe(false);
  });

  it('tras anotar queda la misma fecha y visibilidad, pero el consentimiento se pide de nuevo', () => {
    const siguiente = formularioTrasAnotar({ ...base, fecha: '2026-10-11', visibilidad: 'congregacion', consentimiento_publicar: true });
    expect(siguiente).toEqual({
      por_quien: '', motivo: '', fecha: '2026-10-11', visibilidad: 'congregacion', consentimiento_publicar: false,
    });
    expect(puedeAnotar({ ...siguiente, por_quien: 'Sonia', motivo: 'Salud' })).toBe(false);
  });
});

describe('listarPeticiones', () => {
  beforeEach(() => mockGet.mockReset());

  it('sigue `next` hasta traer todas', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { results: [{ id: 1 }], next: 'http://x?page=2' } })
      .mockResolvedValueOnce({ data: { results: [{ id: 2 }], next: null } });
    const r = await listarPeticiones('orando');
    expect(r.map((p) => p.id)).toEqual([1, 2]);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet.mock.calls[0][1].params).toEqual({ estado: 'orando', page_size: 100, page: 1 });
  });

  it('acepta una lista sin paginar', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 7 }] });
    expect((await listarPeticiones('respondida')).map((p) => p.id)).toEqual([7]);
  });
});

describe('textoVencimiento', () => {
  it('sin aviso (null o undefined) no hay texto: el backend solo manda el número desde 30 días antes', () => {
    expect(textoVencimiento(null)).toBe('');
    expect(textoVencimiento(undefined)).toBe('');
  });

  it('dice los días, en singular con 1 y "hoy" con 0', () => {
    expect(textoVencimiento(30)).toBe('Vence en 30 días');
    expect(textoVencimiento(1)).toBe('Vence en 1 día');
    expect(textoVencimiento(0)).toBe('Vence hoy');
  });
});

// ─── Acompañar y compartir el testimonio (mismas reglas y palabras que la web: peticionesUtils.js) ───
import { evaluarCompartirTestimonio, fraseAlcance, payloadAcompanar, resumenCaso } from '../utils/peticiones';

describe('evaluarCompartirTestimonio', () => {
  const respondida: any = {
    estado: 'respondida', visibilidad: 'congregacion', consentimiento_publicar: true,
    testimonio: 'Dios sanó a mi mamá', comunicacion_info: null,
  };
  it('una respondida para la congregación, con consentimiento y testimonio, se puede compartir', () => {
    expect(evaluarCompartirTestimonio(respondida)).toEqual({ puede: true, motivo: '' });
  });
  it('si ya hay borrador de comunicado, no', () => {
    expect(evaluarCompartirTestimonio({ ...respondida, comunicacion_info: { id: 1, estado: 'borrador', estado_display: 'Borrador' } }))
      .toEqual({ puede: false, motivo: 'Ya tiene un borrador de comunicado.' });
  });
  it('una que sigue en oración, no', () => {
    expect(evaluarCompartirTestimonio({ ...respondida, estado: 'orando' }).motivo).toBe('Solo se comparte una petición respondida.');
  });
  it('una privada, o sin consentimiento, no se comparte con la congregación', () => {
    const motivo = 'Es privada: no se puede compartir con la congregación.';
    expect(evaluarCompartirTestimonio({ ...respondida, visibilidad: 'privada' }).motivo).toBe(motivo);
    expect(evaluarCompartirTestimonio({ ...respondida, consentimiento_publicar: false }).motivo).toBe(motivo);
  });
  it('sin testimonio (o solo espacios), no', () => {
    expect(evaluarCompartirTestimonio({ ...respondida, testimonio: '' }).motivo).toBe('Falta el testimonio de la respuesta.');
    expect(evaluarCompartirTestimonio({ ...respondida, testimonio: '   ' }).puede).toBe(false);
  });
});

describe('resumenCaso, fraseAlcance, payloadAcompanar', () => {
  it('resumenCaso une tipo, estado y responsable, sin huecos', () => {
    expect(resumenCaso({ tipo_display: 'Visita', estado_display: 'Nuevo', responsable_nombre: 'Pastor Test' })).toBe('Visita · Nuevo · Pastor Test');
    expect(resumenCaso({ tipo_display: 'Oración', estado_display: 'Nuevo', responsable_nombre: null })).toBe('Oración · Nuevo');
    expect(resumenCaso(null)).toBe('');
  });
  it('fraseAlcance dice a cuántos llegaría: solo hay comunicado para quien tiene cuenta', () => {
    expect(fraseAlcance({ miembros_activos: 59, con_cuenta: 59 })).toBe('Llegará a los 59 hermanos activos.');
    expect(fraseAlcance({ miembros_activos: 59, con_cuenta: 12 })).toBe('Llegará a 12 de 59 hermanos activos: solo a quienes tienen cuenta en la app.');
    expect(fraseAlcance({ miembros_activos: 0, con_cuenta: 0 })).toBe('La iglesia no tiene hermanos activos registrados.');
    expect(fraseAlcance(null)).toBe('');
  });
  it('payloadAcompanar: sin responsable queda quien abre el caso; la nota solo si hay', () => {
    expect(payloadAcompanar({ tipo: 'oracion', responsableId: null, nota: '  ' })).toEqual({ tipo: 'oracion' });
    expect(payloadAcompanar({ tipo: 'visita', responsableId: 4, nota: ' Llamar el lunes ' }))
      .toEqual({ tipo: 'visita', responsable_id: 4, nota: 'Llamar el lunes' });
  });
});
