/**
 * El comprobante que el líder adjunta en Rendición / Ingreso / Rectificar debe viajar como
 * multipart con el campo `archivo_respaldo` (lo que lee el backend: viewset.perform_create y
 * rectificar). Desde d28b3df la app mandaba `_file` dentro del JSON y el backend lo ignoraba:
 * la rendición se guardaba "bien" pero sin su comprobante, sin ningún error visible.
 */
const mockPost = jest.fn();
jest.mock('../api/api', () => ({ __esModule: true, default: { post: (...a: any[]) => mockPost(...a) } }));

import { crearTransaccion, rectificarTransaccion } from '../api/finanzas';

const ARCHIVO = { uri: 'file:///tmp/boleta.jpg', type: 'image/jpeg', name: 'boleta.jpg' };

// En el teléfono FormData es el de React Native (guarda el objeto {uri,type,name} tal cual); el de
// Node, que trae Jest, lo convertiría en texto "[object Object]". Se usa el de RN para que el test
// vea lo mismo que el dispositivo.
const FormDataRN = require('react-native/Libraries/Network/FormData').default;
const entorno = globalThis as unknown as { FormData: unknown };
const FormDataNode = entorno.FormData;
beforeAll(() => { entorno.FormData = FormDataRN; });
afterAll(() => { entorno.FormData = FormDataNode; });

const partes = (fd: any): Record<string, any> =>
  Object.fromEntries(fd.getParts().map((p: any) => [p.fieldName, p.string ?? p]));

describe('comprobante adjunto en finanzas', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: { id: 1 } });
  });

  it('crearTransaccion con archivo manda multipart: archivo_respaldo + campos como texto', async () => {
    await crearTransaccion({
      tipo: 'egreso', categoria_id: '3', fecha: '2026-10-15', monto: 15000, medio: 'efectivo',
      observaciones: 'Insumos', grupo_id: 9, usa_fondo_general: true, es_reembolso: false, _file: ARCHIVO,
    });
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/api/finanzas/transacciones/');
    expect(body).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    const p = partes(body);
    expect(p.archivo_respaldo).toMatchObject({ uri: ARCHIVO.uri, name: ARCHIVO.name, type: ARCHIVO.type });
    expect(p).toMatchObject({
      tipo: 'egreso', categoria_id: '3', fecha: '2026-10-15', monto: '15000', grupo_id: '9',
      usa_fondo_general: 'true', es_reembolso: 'false',
    });
    expect(p).not.toHaveProperty('_file');
  });

  it('crearTransaccion sin archivo sigue mandando JSON, sin la clave _file', async () => {
    await crearTransaccion({
      tipo: 'ingreso', categoria_id: 3, fecha: '2026-10-15', monto: 5000, grupo_id: 9, _file: null,
    });
    const [, body] = mockPost.mock.calls[0];
    expect(body).not.toBeInstanceOf(FormData);
    expect(body).toEqual({ tipo: 'ingreso', categoria_id: 3, fecha: '2026-10-15', monto: 5000, grupo_id: 9 });
  });

  it('rectificarTransaccion con archivo manda multipart a /rectificar/', async () => {
    await rectificarTransaccion(7, { monto: 1200, observaciones: 'corregido', _file: ARCHIVO });
    const [url, body, config] = mockPost.mock.calls[0];
    expect(url).toBe('/api/finanzas/transacciones/7/rectificar/');
    expect(body).toBeInstanceOf(FormData);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    const p = partes(body);
    expect(p.archivo_respaldo).toMatchObject({ uri: ARCHIVO.uri, name: ARCHIVO.name });
    expect(p).toMatchObject({ monto: '1200', observaciones: 'corregido' });
  });

  it('rectificarTransaccion sin archivo manda JSON', async () => {
    await rectificarTransaccion(7, { monto: 1200, _file: null });
    const [, body] = mockPost.mock.calls[0];
    expect(body).toEqual({ monto: 1200 });
  });
});
