import React from 'react';
import renderer, { act } from 'react-test-renderer';

jest.mock('../api/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, [cb]); },
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));
jest.mock('../hooks/useRefreshOnRestore', () => ({ useRefreshOnRestore: () => {} }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../api/pastoral', () => ({
  acompanarPeticion: jest.fn(),
  compartirTestimonioPeticion: jest.fn(),
  crearPeticion: jest.fn(),
  eliminarPeticion: jest.fn(),
  listarPeticiones: jest.fn(async () => []),
  listarResponsablesPeticion: jest.fn(async () => [{ id: 4, nombre: 'Pastor Test' }, { id: 5, nombre: 'Lidia Rojas' }]),
  reabrirPeticion: jest.fn(),
  renovarPeticion: jest.fn(),
  responderPeticion: jest.fn(),
  resumenPeticiones: jest.fn(async () => ({ orando: 0, respondidas_mes: 0 })),
}));

import {
  acompanarPeticion, compartirTestimonioPeticion, listarPeticiones,
} from '../api/pastoral';
import { usePermissionsStore } from '../store/permissionsStore';
import PeticionesScreen from '../screens/peticiones/PeticionesScreen';

const base: any = {
  miembro: null, miembro_nombre: null, fecha: '2026-10-12', visibilidad: 'congregacion',
  consentimiento_publicar: true, estado: 'orando', fecha_respuesta: null, testimonio: '',
  created_at: '2026-10-12T10:00:00Z', registrada_por: 'Otra', puedo_gestionar: false,
  caso_info: null, comunicacion_info: null,
};
const orando = { ...base, id: 1, por_quien: 'La familia Pérez', motivo: 'Por trabajo' };
const privada = { ...base, id: 2, por_quien: 'Mi mamá', motivo: 'Por su salud', visibilidad: 'privada', consentimiento_publicar: false };
const conCaso = {
  ...base, id: 3, por_quien: 'Don Luis', motivo: 'Por su hijo',
  caso_info: { id: 90, titulo: 'Visita: Don Luis', tipo: 'visita', tipo_display: 'Visita', estado: 'nuevo', estado_display: 'Nuevo', es_confidencial: false, responsable_nombre: 'Pastor Test' },
};
const respondidaCompartible = {
  ...base, id: 4, por_quien: 'Rosa', motivo: 'Por su operación', estado: 'respondida',
  fecha_respuesta: '2026-10-13', testimonio: 'Salió muy bien', caso_info: conCaso.caso_info,
};
const respondidaPrivada = { ...respondidaCompartible, id: 5, por_quien: 'Ana', visibilidad: 'privada', consentimiento_publicar: false };
const conBorrador = { ...respondidaCompartible, id: 6, por_quien: 'Julia', comunicacion_info: { id: 8, estado: 'borrador', estado_display: 'Borrador' } };

const plano = (hijos: any): string =>
  [hijos].flat(Infinity).map((h: any) => (typeof h === 'string' || typeof h === 'number' ? String(h) : h?.props ? plano(h.props.children) : '')).join('');
const textos = (tree: renderer.ReactTestRenderer): string[] =>
  tree.root.findAll((n) => (n.type as any) === 'Text' && (n.parent?.type as any) !== 'Text').map((n) => plano(n.props.children));
const cuantos = (tree: renderer.ReactTestRenderer, t: string) => textos(tree).filter((x) => x === t).length;
// Un nodo por botón (el más externo: TouchableOpacity pasa su testID al <View> de adentro).
const porId = (tree: renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => n.props.testID === id && typeof n.props.onPress === 'function' && n.parent?.props.testID !== id);

const montar = async (puede: string[], lista: any[]) => {
  (listarPeticiones as jest.Mock).mockResolvedValue(lista);
  usePermissionsStore.setState({ puede, isSuperAdmin: false });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<PeticionesScreen />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return tree;
};
const tocar = async (nodo: any) => { await act(async () => { await nodo.props.onPress(); }); };

const INTEGRANTE = ['peticiones.ver', 'peticiones.anotar'];
const LIDER = [...INTEGRANTE, 'peticiones.ver_todas', 'peticiones.gestionar', 'peticiones.acompanar'];

describe('Peticiones: «Necesita acompañamiento» y «Compartir el testimonio», solo con peticiones.acompanar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('el integrante de intercesión no ve ninguna de las dos acciones', async () => {
    const tree = await montar(INTEGRANTE, [orando, respondidaCompartible]);
    expect(cuantos(tree, 'Necesita acompañamiento')).toBe(0);
    expect(cuantos(tree, 'Compartir el testimonio')).toBe(0);
    // ...pero sí el caso ya abierto, que es información de la petición.
    expect(textos(tree)).toContain('Acompañamiento: Visita · Nuevo · Pastor Test');
  });

  it('quien acompaña ve «Necesita acompañamiento» solo en las que no tienen caso, y el caso enlazado en las que sí', async () => {
    const tree = await montar(LIDER, [orando, conCaso]);
    expect(cuantos(tree, 'Necesita acompañamiento')).toBe(1);
    expect(porId(tree, 'peticion-acompanar')).toHaveLength(1);
    expect(textos(tree)).toContain('Acompañamiento: Visita · Nuevo · Pastor Test');
  });

  it('«Compartir el testimonio»: activo si se puede, con el motivo si no, y nada si ya hay borrador', async () => {
    const tree = await montar(LIDER, [respondidaCompartible, respondidaPrivada, conBorrador]);
    expect(cuantos(tree, 'Compartir el testimonio')).toBe(2); // la del borrador no lo ofrece
    expect(textos(tree)).toContain('Es privada: no se puede compartir con la congregación.');
    expect(textos(tree)).toContain('Comunicado: Borrador');
    const botones = porId(tree, 'peticion-compartir');
    expect(botones).toHaveLength(2);
    expect(botones[0].props.disabled).toBe(false);
    expect(botones[1].props.disabled).toBe(true);
  });

  it('una que sigue en oración no ofrece compartir', async () => {
    const tree = await montar(LIDER, [orando]);
    expect(cuantos(tree, 'Compartir el testimonio')).toBe(0);
  });

  it('abrir el caso: tipo Visita, responsable y nota viajan al backend; avisa y recarga la lista', async () => {
    (acompanarPeticion as jest.Mock).mockResolvedValue({});
    const tree = await montar(LIDER, [orando]);
    await tocar(porId(tree, 'peticion-acompanar')[0]);
    await act(async () => { await Promise.resolve(); });
    await tocar(porId(tree, 'acompanar-tipo-visita')[0]);
    await tocar(porId(tree, 'acompanar-responsable-5')[0]);
    await act(async () => { tree.root.findAll((n) => n.props.testID === 'acompanar-nota')[0].props.onChangeText(' Llamar el lunes '); });
    const antes = (listarPeticiones as jest.Mock).mock.calls.length;
    await tocar(porId(tree, 'acompanar-confirmar')[0]);
    expect(acompanarPeticion).toHaveBeenCalledWith(1, { tipo: 'visita', responsable_id: 5, nota: 'Llamar el lunes' });
    expect(textos(tree)).toContain('Caso abierto y responsable avisado');
    expect((listarPeticiones as jest.Mock).mock.calls.length).toBeGreaterThan(antes);
  });

  it('sin elegir responsable, no manda responsable_id (queda quien abre el caso)', async () => {
    (acompanarPeticion as jest.Mock).mockResolvedValue({});
    const tree = await montar(LIDER, [orando]);
    await tocar(porId(tree, 'peticion-acompanar')[0]);
    await act(async () => { await Promise.resolve(); });
    await tocar(porId(tree, 'acompanar-confirmar')[0]);
    expect(acompanarPeticion).toHaveBeenCalledWith(1, { tipo: 'oracion' });
  });

  it('la petición privada avisa que el caso será confidencial; la de congregación no', async () => {
    const tree = await montar(LIDER, [privada, orando]);
    await tocar(porId(tree, 'peticion-acompanar')[0]); // la privada
    await act(async () => { await Promise.resolve(); });
    expect(tree.root.findAll((n) => n.props.testID === 'acompanar-aviso-privada')).not.toHaveLength(0);
    expect(textos(tree)).toContain('La petición es privada: el caso será confidencial (lo ven el responsable, usted y la administración).');
  });

  it('409 (ya tenía un caso): lo dice, cierra y recarga, sin dejar el diálogo abierto', async () => {
    (acompanarPeticion as jest.Mock).mockRejectedValue({ response: { status: 409, data: { detail: 'Esta petición ya tiene un caso de acompañamiento.' } } });
    const tree = await montar(LIDER, [orando]);
    await tocar(porId(tree, 'peticion-acompanar')[0]);
    await act(async () => { await Promise.resolve(); });
    const antes = (listarPeticiones as jest.Mock).mock.calls.length;
    await tocar(porId(tree, 'acompanar-confirmar')[0]);
    expect(textos(tree)).toContain('Esta petición ya tiene un caso de acompañamiento.');
    expect((listarPeticiones as jest.Mock).mock.calls.length).toBeGreaterThan(antes);
  });

  it('compartir: deja el borrador y dice a cuántos llegaría, sin prometer que ya se envió', async () => {
    (compartirTestimonioPeticion as jest.Mock).mockResolvedValue({
      ...respondidaCompartible, comunicacion_info: { id: 8, estado: 'borrador', estado_display: 'Borrador' },
      alcance: { miembros_activos: 59, con_cuenta: 12 },
    });
    const tree = await montar(LIDER, [respondidaCompartible]);
    await tocar(porId(tree, 'peticion-compartir')[0]);
    expect(compartirTestimonioPeticion).toHaveBeenCalledWith(4);
    const t = textos(tree);
    expect(t).toContain('Borrador listo');
    expect(t).toContain('El testimonio de Rosa quedó como borrador de comunicado. Todavía no se envió a nadie.');
    expect(t).toContain('Llegará a 12 de 59 hermanos activos: solo a quienes tienen cuenta en la app. Revíselo y envíelo desde Comunicaciones.');
  });

  it('compartir con error del servidor muestra el mensaje y no abre el borrador', async () => {
    (compartirTestimonioPeticion as jest.Mock).mockRejectedValue({ response: { status: 400, data: { detail: 'Esta petición es privada: no se puede compartir con la congregación.' } } });
    const tree = await montar(LIDER, [respondidaCompartible]);
    await tocar(porId(tree, 'peticion-compartir')[0]);
    expect(textos(tree)).not.toContain('Borrador listo');
    expect(textos(tree)).toContain('Esta petición es privada: no se puede compartir con la congregación.');
  });
});
