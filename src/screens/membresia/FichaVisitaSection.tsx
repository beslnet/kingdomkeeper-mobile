import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import {
  FichaVisitaDetalle,
  asignarSeguimientoVisita,
  getFichaVisita,
  listarResponsablesVisita,
  revocarConsentimientoVisita,
} from '../../api/miembros';
import ElegirResponsableModal from '../../components/ElegirResponsableModal';
import { usePermissionsStore } from '../../store/permissionsStore';
import { fechaCorta } from '../../utils/asistencia';
import {
  BORRAR_DATOS,
  SIN_FICHA,
  accionesVisita,
  textoAsignar,
  textoConsentimiento,
  textoSeguimiento,
} from '../../utils/visitaDetalle';
import { PANTONE_295C } from '../../theme/colors';

const mensajeDe = (err: any, porDefecto: string): string => {
  const data = err?.response?.data;
  if (!data) return porDefecto;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  const primero: any = Object.values(data)[0];
  return String(Array.isArray(primero) ? primero[0] : primero ?? porDefecto);
};

function Fila({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <View style={styles.fila}>
      <View style={styles.filaIcono}>
        <Icon source={icono} size={18} color={PANTONE_295C} />
      </View>
      <View style={styles.filaTexto}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>
    </View>
  );
}

/**
 * «Ficha de la visita» en el detalle de un visitante: cómo llegó, quién la invitó, cómo prefiere el contacto,
 * la autorización y su fecha, las notas y quién lleva su seguimiento (y en qué va), con asignar / reasignar
 * y «Borrar sus datos». Es lo que la web muestra en Membresía → Visitas. Quién ve y quién puede lo resuelve
 * el backend (`visitas.*`); si no tiene acceso a las visitas, la sección no aparece.
 */
export default function FichaVisitaSection({
  miembroId,
  nombre,
  estadoMembresia,
  onBorrada,
}: {
  miembroId: number;
  nombre: string;
  estadoMembresia: string;
  /** Los datos se borraron: el detalle ya no tiene a quién mostrar. */
  onBorrada: () => void;
}) {
  const puedeVer = usePermissionsStore((s) => s.can('visitas.ver') || s.can('visitas.ver_propias'));
  const puedeAsignar = usePermissionsStore((s) => s.can('visitas.asignar'));
  const puedeBorrar = usePermissionsStore((s) => s.isSuperAdmin || s.hasPermission('membresia', 'editar'));
  const esVisitante = estadoMembresia === 'visitante';

  const [ficha, setFicha] = useState<FichaVisitaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [asignando, setAsignando] = useState<'asignar' | 'reasignar' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFicha(await getFichaVisita(miembroId));
    } catch {
      // 403 (no ve visitas) o 404 (no es una visita suya): la sección simplemente no aparece.
      setFicha(null);
    } finally {
      setCargando(false);
    }
  }, [miembroId]);

  useEffect(() => {
    if (esVisitante && puedeVer) cargar();
    else setCargando(false);
  }, [esVisitante, puedeVer, cargar]);

  if (!esVisitante || !puedeVer) return null;
  if (cargando) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="small" color={PANTONE_295C} />
      </View>
    );
  }
  if (!ficha) return null;

  const acciones = accionesVisita(ficha, { puedeAsignar, puedeBorrar });

  const confirmarBorrado = () => {
    Alert.alert(
      BORRAR_DATOS.titulo,
      `${BORRAR_DATOS.descripcion(nombre)}\n\n${BORRAR_DATOS.conserva}\n\n${BORRAR_DATOS.advertencia}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: BORRAR_DATOS.boton,
          style: 'destructive',
          onPress: async () => {
            setBorrando(true);
            try {
              await revocarConsentimientoVisita(miembroId);
              Alert.alert('Listo', BORRAR_DATOS.hecho);
              onBorrada();
            } catch (err) {
              Alert.alert('No se pudo completar', `${mensajeDe(err, 'No se pudieron borrar los datos de la visita.')} No se borró nada.`);
            } finally {
              setBorrando(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View testID="ficha-visita">
      <Text style={styles.titulo}>Ficha de la visita</Text>
      <View style={styles.card}>
        {!ficha.tiene_ficha ? (
          <Text style={styles.sinFicha} testID="ficha-sin-ficha">{SIN_FICHA}</Text>
        ) : (
          <>
            <Fila icono="map-marker-path" etiqueta="Cómo llegó" valor={ficha.como_llego} />
            <Fila icono="account-arrow-left-outline" etiqueta="Quién la invitó" valor={ficha.invitado_por} />
            <Fila icono="message-text-outline" etiqueta="Cómo prefiere el contacto" valor={ficha.quiere_contacto} />
            <Fila icono="shield-check-outline" etiqueta="Autorización de sus datos" valor={textoConsentimiento(ficha)} />
            <Fila icono="note-text-outline" etiqueta="Notas" valor={ficha.notas} />
          </>
        )}
        <Fila icono="calendar-check-outline" etiqueta="Llegó el" valor={fechaCorta(ficha.fecha)} />
        <Fila icono="hand-heart-outline" etiqueta="Seguimiento" valor={textoSeguimiento(ficha)} />

        {!!aviso && <Text style={styles.aviso} testID="ficha-aviso">{aviso}</Text>}

        {(acciones.asignar || acciones.reasignar || acciones.borrar) && (
          <View style={styles.acciones}>
            {acciones.asignar && (
              <TouchableOpacity testID="ficha-asignar" style={styles.btn} onPress={() => setAsignando('asignar')}>
                <Text style={styles.btnTexto}>Asignar seguimiento</Text>
              </TouchableOpacity>
            )}
            {acciones.reasignar && (
              <TouchableOpacity testID="ficha-reasignar" style={styles.btn} onPress={() => setAsignando('reasignar')}>
                <Text style={styles.btnTexto}>Reasignar</Text>
              </TouchableOpacity>
            )}
            {acciones.borrar && (
              <TouchableOpacity testID="ficha-borrar" style={styles.btn} onPress={confirmarBorrado} disabled={borrando}>
                <Text style={[styles.btnTexto, styles.peligro]}>{BORRAR_DATOS.boton}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ElegirResponsableModal
        visible={asignando !== null}
        titulo={asignando === 'reasignar' ? 'Reasignar seguimiento' : 'Asignar seguimiento'}
        descripcion={textoAsignar(nombre, ficha.seguimiento?.responsable, asignando === 'reasignar')}
        etiqueta="Seguimiento a cargo de"
        confirmarLabel={asignando === 'reasignar' ? 'Reasignar' : 'Asignar'}
        cargar={listarResponsablesVisita}
        onClose={() => setAsignando(null)}
        onConfirm={async (r) => {
          const reasignar = asignando === 'reasignar';
          try {
            await asignarSeguimientoVisita(miembroId, r.id, { reasignar });
          } catch (err) {
            throw new Error(mensajeDe(err, reasignar ? 'No se pudo reasignar el seguimiento.' : 'No se pudo asignar el seguimiento.'));
          }
          setAsignando(null);
          setAviso(
            reasignar
              ? 'Seguimiento reasignado: se le avisó a quien lo lleva ahora.'
              : 'Seguimiento asignado: se le avisó a quien lo lleva.',
          );
          cargar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cargando: { padding: 16, alignItems: 'center' },
  titulo: {
    fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 20,
    marginBottom: 6, marginHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFF', marginHorizontal: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7 },
  filaIcono: { width: 28, paddingTop: 2 },
  filaTexto: { flex: 1 },
  etiqueta: { fontSize: 12, color: '#888' },
  valor: { fontSize: 15, color: '#222', marginTop: 1 },
  sinFicha: { fontSize: 13, color: '#888', paddingVertical: 4 },
  aviso: { color: '#2E7D32', fontSize: 13, fontWeight: '600', marginTop: 8 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { borderWidth: 1, borderColor: PANTONE_295C, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  btnTexto: { color: PANTONE_295C, fontSize: 13, fontWeight: '700' },
  peligro: { color: '#C62828' },
});
