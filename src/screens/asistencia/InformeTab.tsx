import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { InformeReunion, obtenerInforme } from '../../api/asistencia';
import { PANTONE_295C } from '../../theme/colors';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre',
  'noviembre', 'diciembre'];

/** AAAA-MM de una fecha, y el mes anterior o siguiente. */
export const mesDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const moverMes = (mes: string, delta: number) => {
  const [a, m] = mes.split('-').map(Number);
  return mesDe(new Date(a, m - 1 + delta, 1));
};
export const nombreMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} ${a}`;
};

/**
 * Informe del mes, igual que en la web (Asistencia → «Informe del mes»): por reunión, cuántas veces se pasó
 * lista, cuántos hermanos vinieron en promedio y las visitas con y sin ficha. Lo ven el pastor, los líderes y
 * quienes lideran la asistencia.
 */
export default function InformeTab() {
  const actual = mesDe(new Date());
  const [mes, setMes] = useState(actual);
  const [filas, setFilas] = useState<InformeReunion[] | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setFilas(null);
    setError(false);
    obtenerInforme(mes)
      .then((d) => setFilas(d.reuniones))
      .catch(() => setError(true));
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <ScrollView contentContainerStyle={styles.contenido}>
      <View style={styles.mesRow}>
        <TouchableOpacity onPress={() => setMes(moverMes(mes, -1))} hitSlop={10} accessibilityLabel="Mes anterior">
          <Icon source="chevron-left" size={28} color={PANTONE_295C} />
        </TouchableOpacity>
        <Text style={styles.mes} testID="informe-mes">{nombreMes(mes)}</Text>
        <TouchableOpacity
          onPress={() => setMes(moverMes(mes, 1))}
          disabled={mes >= actual}
          hitSlop={10}
          accessibilityLabel="Mes siguiente"
        >
          <Icon source="chevron-right" size={28} color={mes >= actual ? '#CCC' : PANTONE_295C} />
        </TouchableOpacity>
      </View>

      {error ? (
        <TouchableOpacity onPress={cargar} style={styles.centrado}>
          <Text style={styles.error}>No se pudo cargar. Toca para reintentar.</Text>
        </TouchableOpacity>
      ) : filas === null ? (
        <ActivityIndicator style={styles.centrado} color={PANTONE_295C} />
      ) : filas.length === 0 ? (
        <Text style={styles.vacio}>No hay reuniones con asistencia este mes.</Text>
      ) : (
        filas.map((r) => {
          const visitas = r.visitas_con_ficha + r.visitas_sin_ficha;
          return (
            <View key={r.reunion_id} style={styles.card} testID={`informe-${r.reunion_id}`}>
              <Text style={styles.nombre}>{r.reunion}</Text>
              <View style={styles.cifras}>
                <Cifra valor={String(r.veces)} etiqueta={r.veces === 1 ? 'vez' : 'veces'} />
                <Cifra valor={r.promedio_hermanos == null ? '—' : String(r.promedio_hermanos)} etiqueta="hermanos (promedio)" />
                <Cifra valor={visitas ? `${r.visitas_con_ficha} de ${visitas}` : '—'} etiqueta="visitas dejaron ficha" />
              </View>
            </View>
          );
        })
      )}
      <Text style={styles.nota}>
        Los hermanos se cuentan por nombre. Las visitas con ficha son las registradas ese día; las que no dejaron
        ficha se anotan al pasar lista. «Dejaron ficha» muestra cómo anda la recepción.
      </Text>
    </ScrollView>
  );
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.cifra}>
      <Text style={styles.cifraValor}>{valor}</Text>
      <Text style={styles.cifraEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 40 },
  mesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mes: { fontSize: 17, fontWeight: '700', color: '#222' },
  centrado: { marginTop: 32, alignItems: 'center' },
  error: { color: '#E53935', fontSize: 14 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 32, fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  nombre: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 8 },
  cifras: { flexDirection: 'row', gap: 8 },
  cifra: { flex: 1 },
  cifraValor: { fontSize: 18, fontWeight: '700', color: PANTONE_295C },
  cifraEtiqueta: { fontSize: 12, color: '#777' },
  nota: { fontSize: 12, color: '#888', marginTop: 8, lineHeight: 17 },
});
