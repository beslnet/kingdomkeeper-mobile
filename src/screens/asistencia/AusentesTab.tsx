import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import {
  AusentesRespuesta,
  PersonaAusente,
  Reunion,
  ULTIMAS_REUNIONES,
  asignarSeguimientoAusente,
  listarResponsablesSeguimiento,
  obtenerAusentes,
  yaTieneSeguimiento,
} from '../../api/asistencia';
import ElegirResponsableModal from '../../components/ElegirResponsableModal';
import { fechaCorta } from '../../utils/asistencia';
import { PANTONE_295C } from '../../theme/colors';

// Mismo criterio que la web (AsistenciaPage → "No han venido"): quienes faltaron a las últimas N
// reuniones en que se marcaron nombres, con "Asignar seguimiento". Quién puede verlo lo decide el
// backend (`asistencia.seguimiento`); la pantalla solo muestra la pestaña a quien lo tiene.

const mensajeDeError = (err: any, porDefecto: string): string => {
  const data = err?.response?.data;
  if (!data) return porDefecto;
  if (typeof data.detail === 'string') return data.detail;
  const primero: any = Object.values(data)[0];
  return String(Array.isArray(primero) ? primero[0] : primero ?? porDefecto);
};

/** Cuando la persona ya tenía seguimiento (409), se avisa y se recarga: no es un error. */
export type ResultadoAsignar = { tipo: 'asignado' | 'ya_abierto'; mensaje: string };

function AsignarModal({
  reunion,
  persona,
  onClose,
  onHecho,
}: {
  reunion: Reunion;
  persona: PersonaAusente | null;
  onClose: () => void;
  onHecho: (r: ResultadoAsignar) => void;
}) {
  return (
    <ElegirResponsableModal
      visible={!!persona}
      titulo="Asignar seguimiento"
      descripcion={
        <>
          Se abre un caso de seguimiento para <Text style={styles.negrita}>{persona?.nombre}</Text>: no vino a
          las últimas {ULTIMAS_REUNIONES} reuniones de {reunion.nombre}.
        </>
      }
      etiqueta="Quién lo acompaña"
      ayuda="Le llega un aviso al teléfono"
      confirmarLabel="Asignar"
      // De la reunión de un grupo también puede llevarlo su líder o un co-líder.
      cargar={() => listarResponsablesSeguimiento(reunion.id)}
      onClose={onClose}
      onConfirm={async (elegido) => {
        if (!persona) return;
        try {
          await asignarSeguimientoAusente(reunion.id, { miembro_id: persona.id, responsable_id: elegido.id });
        } catch (err) {
          // 409: ya tenía un seguimiento abierto. No es un error: se avisa y se recarga.
          if (yaTieneSeguimiento(err)) {
            return onHecho({ tipo: 'ya_abierto', mensaje: `${persona.nombre} ya tiene un seguimiento abierto.` });
          }
          throw new Error(mensajeDeError(err, 'No se pudo asignar el seguimiento.'));
        }
        onHecho({
          tipo: 'asignado',
          mensaje: `Seguimiento asignado a ${elegido.nombre}. Le llegó un aviso al teléfono.`,
        });
      }}
    />
  );
}

export default function AusentesTab({
  reunion,
  onAviso,
}: {
  reunion: Reunion;
  onAviso: (mensaje: string) => void;
}) {
  const [data, setData] = useState<AusentesRespuesta | null>(null);
  const [error, setError] = useState(false);
  const [asignando, setAsignando] = useState<PersonaAusente | null>(null);

  const cargar = useCallback(() => {
    setData(null);
    setError(false);
    obtenerAusentes(reunion.id, ULTIMAS_REUNIONES)
      .then(setData)
      .catch(() => setError(true));
  }, [reunion.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) {
    return (
      <TouchableOpacity style={styles.centrado} onPress={cargar}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorTexto}>No se pudo cargar. Toca para reintentar.</Text>
      </TouchableOpacity>
    );
  }
  if (!data) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }
  if (!data.suficientes) {
    return (
      <View style={styles.aviso} testID="ausentes-insuficientes">
        <Text style={styles.avisoTexto}>
          Para saber quién no ha venido hace falta marcar por nombre al menos {ULTIMAS_REUNIONES} reuniones. Van{' '}
          {data.marcadas}.
        </Text>
      </View>
    );
  }
  if (data.personas.length === 0) {
    return (
      <View style={[styles.aviso, styles.avisoOk]} testID="ausentes-ninguno">
        <Text style={styles.avisoOkTexto}>
          Todos vinieron al menos a una de las últimas {ULTIMAS_REUNIONES} reuniones.
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={data.personas}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <Text style={styles.encabezado}>
            No vinieron a ninguna de las últimas {ULTIMAS_REUNIONES} reuniones marcadas (desde el{' '}
            {fechaCorta(data.desde)}):
          </Text>
        }
        renderItem={({ item: p }) => (
          <View style={styles.tarjeta} testID={`ausente-${p.id}`}>
            <Text style={styles.nombre}>{p.nombre}</Text>
            <Text style={styles.detalle}>
              {p.ultima_asistencia
                ? `Vino por última vez el ${fechaCorta(p.ultima_asistencia)}`
                : 'No tiene asistencia registrada'}
              {p.telefono ? ` · ${p.telefono}` : ''}
            </Text>
            {p.seguimiento ? (
              <View style={styles.chipOk}>
                <Text style={styles.chipOkTexto}>
                  {`Lo lleva ${p.seguimiento.responsable || 'nadie aún'} · ${p.seguimiento.estado_display}`}
                </Text>
              </View>
            ) : p.no_contactar ? (
              <View style={styles.chipNeutro}>
                <Text style={styles.chipNeutroTexto}>Pidió que no la contacten</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.btnBorde}
                onPress={() => setAsignando(p)}
                accessibilityRole="button"
                accessibilityLabel={`Asignar seguimiento a ${p.nombre}`}
              >
                <Text style={styles.btnBordeTexto}>Asignar seguimiento</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <AsignarModal
        reunion={reunion}
        persona={asignando}
        onClose={() => setAsignando(null)}
        onHecho={(r) => {
          setAsignando(null);
          onAviso(r.mensaje);
          cargar();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTexto: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  aviso: { margin: 16, backgroundColor: '#E8F1FB', borderRadius: 10, padding: 14 },
  avisoTexto: { color: '#14487A', fontSize: 14 },
  avisoOk: { backgroundColor: '#E8F5E9' },
  avisoOkTexto: { color: '#1B5E20', fontSize: 14 },
  lista: { padding: 12, paddingBottom: 40 },
  encabezado: { color: '#666', fontSize: 14, marginBottom: 10, paddingHorizontal: 4 },
  tarjeta: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  nombre: { fontSize: 15, fontWeight: '700', color: '#222' },
  detalle: { fontSize: 13, color: '#777', marginTop: 2 },
  btnBorde: {
    alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: PANTONE_295C, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  btnBordeTexto: { color: PANTONE_295C, fontSize: 13, fontWeight: '700' },
  chipOk: {
    alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: '#2E7D32', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipOkTexto: { color: '#2E7D32', fontSize: 12, fontWeight: '600' },
  chipNeutro: {
    alignSelf: 'flex-start', marginTop: 10, borderWidth: 1, borderColor: '#BDBDBD', borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipNeutroTexto: { color: '#666', fontSize: 12, fontWeight: '600' },
  negrita: { fontWeight: '700' },
});
