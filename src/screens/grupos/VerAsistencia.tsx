import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { obtenerAsistencia, obtenerEvento } from '../../api/eventos';
import { obtenerGrupo } from '../../api/grupos';
import { PANTONE_295C } from '../../theme/colors';

type Asistente = {
  id: number;
  miembro_id: number;
  miembro_nombre: string;
  miembro_email?: string;
  estado_asistencia: string;
};

export default function VerAsistenciaScreen() {
  const route = useRoute<any>();
  const { eventoId, grupoId, titulo } = route.params ?? {};

  const [sections, setSections] = useState<{ title: string; data: Asistente[] }[]>([]);
  const [totalAsistieron, setTotalAsistieron] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [asistenciaData, grupoData] = await Promise.all([
        obtenerAsistencia(eventoId),
        grupoId ? obtenerGrupo(grupoId) : Promise.resolve(null),
      ]);

      const participantes: Asistente[] = asistenciaData?.participantes ?? (Array.isArray(asistenciaData) ? asistenciaData : []);
      const asistieron = participantes.filter((p) => p.estado_asistencia === 'asistio');
      setTotalAsistieron(asistieron.length);

      if (grupoData) {
        const miembrosGrupoIds = new Set<number>((grupoData.miembros ?? []).map((m: any) => Number(m.miembro_id ?? m.id)));
        const delGrupo = asistieron.filter((a) => miembrosGrupoIds.has(Number(a.miembro_id)));
        const otros = asistieron.filter((a) => !miembrosGrupoIds.has(Number(a.miembro_id)));
        const result: { title: string; data: Asistente[] }[] = [];
        if (delGrupo.length > 0) result.push({ title: `Miembros del grupo (${delGrupo.length})`, data: delGrupo });
        if (otros.length > 0) result.push({ title: `Otros asistentes (${otros.length})`, data: otros });
        setSections(result);
      } else {
        setSections(asistieron.length > 0 ? [{ title: `Asistentes (${asistieron.length})`, data: asistieron }] : []);
      }
    } catch {
      setError('No se pudo cargar la asistencia. Toca para reintentar.');
    }
  }, [eventoId, grupoId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  const isEmpty = sections.length === 0;

  return (
    <View style={styles.container}>
      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        <Icon source="account-check-outline" size={22} color="#fff" />
        <Text style={styles.summaryText}>Total asistentes: {totalAsistieron}</Text>
      </View>

      {isEmpty ? (
        <View style={styles.centered}>
          <Icon source="calendar-remove-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>Aún no hay asistencia registrada para este evento.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={styles.avatarCircle}>
                <Icon source="account" size={20} color={PANTONE_295C} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.miembro_nombre ?? '—'}</Text>
                {item.miembro_email ? (
                  <Text style={styles.memberEmail}>{item.miembro_email}</Text>
                ) : null}
              </View>
              <Icon source="check-circle" size={22} color="#2E7D32" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15, textAlign: 'center' },
  summaryBanner: {
    backgroundColor: PANTONE_295C,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  summaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  listContent: { padding: 16, paddingBottom: 32 },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#222' },
  memberEmail: { fontSize: 12, color: '#888', marginTop: 2 },
});
