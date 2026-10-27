import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Reunion, ReunionDelGrupo } from '../../api/asistencia';
import ReunionFormModal from '../asistencia/ReunionFormModal';
import { PANTONE_295C } from '../../theme/colors';

const fechaCorta = (iso: string) => iso.split('-').reverse().join('-');

/** "los viernes", "los miércoles": el día en plural, como se dice. */
export const losDias = (dia: string) => {
  const d = (dia || '').toLowerCase();
  return `los ${d.endsWith('s') ? d : `${d}s`}`;
};

/**
 * «Reunión semanal» arriba en el grupo: cuándo y dónde se reúnen, la última vez que se pasó lista y
 * «Pasar lista». Es la reunión de Asistencia (backend: Reunion con `grupo`), no una actividad: el grupo es su
 * casa y desde aquí la lleva su líder (marketing/GRUPOS-REUNIONES-ASISTENCIA-2026-10.md §6). Igual que la web.
 */
export default function ReunionSemanal({
  grupo,
  gestiona,
  onCambio,
}: {
  grupo: { id: number; nombre: string; reuniones?: ReunionDelGrupo[] };
  gestiona: boolean;
  onCambio: () => void;
}) {
  const navigation = useNavigation<any>();
  // null = cerrado; { reunion: null } = configurar la primera.
  const [formulario, setFormulario] = useState<{ reunion: Reunion | null } | null>(null);
  // Una pausada solo la ve quien gestiona el grupo, para reactivarla desde el lápiz.
  const reuniones = (grupo.reuniones ?? []).filter((r) => r.activa !== false || gestiona);

  if (reuniones.length === 0 && !gestiona) return null;

  const comoReunion = (r: ReunionDelGrupo): Reunion => ({
    ...r, grupo: grupo.id, grupo_nombre: grupo.nombre, activa: r.activa !== false,
  });

  return (
    <View style={styles.contenedor} testID="reunion-semanal">
      {reuniones.length === 0 ? (
        <TouchableOpacity
          style={styles.vacia}
          onPress={() => setFormulario({ reunion: null })}
          activeOpacity={0.8}
          testID="configurar-reunion"
        >
          <Icon source="calendar-sync-outline" size={22} color={PANTONE_295C} />
          <View style={styles.flex1}>
            <Text style={styles.vaciaTitulo}>¿Se reúnen cada semana?</Text>
            <Text style={styles.vaciaTexto}>Configura el día y la hora una vez, y pasa lista desde aquí.</Text>
          </View>
          <Icon source="chevron-right" size={20} color="#BBB" />
        </TouchableOpacity>
      ) : (
        reuniones.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.etiqueta}>REUNIÓN SEMANAL{r.activa === false ? ' · PAUSADA' : ''}</Text>
            <Text style={styles.nombre}>{r.nombre}</Text>
            <Text style={styles.cuando}>
              Se reúnen {losDias(r.dia_semana_display)} a las {r.hora}
              {r.lugar ? ` · ${r.lugar}` : ''}
            </Text>
            <Text style={styles.ultima}>
              {r.ultima
                ? `Última vez que se pasó lista: ${fechaCorta(r.ultima.fecha)} · ${r.ultima.presentes} de ${r.total}${
                    r.ultima.tema ? ` · ${r.ultima.tema}` : ''
                  }`
                : 'Todavía no se ha pasado lista.'}
            </Text>
            {gestiona ? (
              <View style={styles.botones}>
                {r.activa !== false ? (
                  <TouchableOpacity
                    style={styles.pasarLista}
                    onPress={() => navigation.navigate('PasarLista', { reunionId: r.id, titulo: r.nombre })}
                    testID={`pasar-lista-${r.id}`}
                  >
                    <Icon source="clipboard-check-outline" size={18} color="#fff" />
                    <Text style={styles.pasarListaTexto}>Pasar lista</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.ultima, styles.flex1]}>Pausada: toca el lápiz para reactivarla.</Text>
                )}
                <TouchableOpacity
                  style={styles.editar}
                  onPress={() => setFormulario({ reunion: comoReunion(r) })}
                  accessibilityLabel={`Editar ${r.nombre}`}
                  testID={`editar-reunion-${r.id}`}
                >
                  <Icon source="pencil-outline" size={18} color={PANTONE_295C} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      )}

      <ReunionFormModal
        visible={formulario !== null}
        reunion={formulario?.reunion ?? null}
        grupoFijo={{ id: grupo.id, nombre: grupo.nombre }}
        onClose={() => setFormulario(null)}
        onGuardada={() => {
          setFormulario(null);
          onCambio();
        }}
        onQuitada={() => {
          setFormulario(null);
          onCambio();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginHorizontal: 16, marginTop: 12 },
  flex1: { flex: 1 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  etiqueta: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 1 },
  nombre: { fontSize: 18, fontWeight: '700', color: '#222', marginTop: 2 },
  cuando: { fontSize: 15, color: '#333', marginTop: 4 },
  ultima: { fontSize: 13, color: '#777', marginTop: 4 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  pasarLista: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PANTONE_295C, borderRadius: 24, paddingVertical: 12,
  },
  pasarListaTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  editar: {
    width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1.5,
    borderColor: PANTONE_295C,
  },
  vacia: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F0FB', borderRadius: 16, padding: 16,
  },
  vaciaTitulo: { fontSize: 15, fontWeight: '700', color: PANTONE_295C },
  vaciaTexto: { fontSize: 13, color: '#444', marginTop: 2 },
});
