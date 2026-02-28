import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { useAuthStore } from '../../store/authStore';
import { listarEventos } from '../../api/eventos';
import { obtenerGrupo } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getEstadoStyle(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'planificado': return { bg: '#E3F2FD', text: '#1565C0' };
    case 'abierto': return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'en_curso': return { bg: '#FFF8E1', text: '#F57F17' };
    case 'finalizado': return { bg: '#F5F5F5', text: '#757575' };
    case 'cancelado': return { bg: '#FFEBEE', text: '#C62828' };
    default: return { bg: '#F5F5F5', text: '#555' };
  }
}

export default function GrupoEventosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};

  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<'futuros' | 'pasados'>('futuros');
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<any>(null);

  // Permission: isLeader = superAdmin | church_admin | pastor | lider principal | co-lider
  const miembroId = user?.miembro_id;
  const esLiderPrincipal = miembroId && grupo && Number(miembroId) === Number(grupo.lider_id);
  const esCoLider = miembroId && grupo?.miembros?.some(
    (m: any) => Number(m.miembro_id) === Number(miembroId) && m.rol_en_grupo === 'co_leader'
  );
  const canCreate = isSuperAdmin || hasAnyRole(['church_admin', 'pastor']) || esLiderPrincipal || esCoLider;

  const load = useCallback(async (filtro: 'futuros' | 'pasados' = 'futuros') => {
    setError(null);
    try {
      const [result, grupoData] = await Promise.all([
        listarEventos({ grupo_id: grupoId, filtro_fecha: filtro }),
        grupo ? Promise.resolve(grupo) : obtenerGrupo(grupoId),
      ]);
      setEventos(Array.isArray(result) ? result : result.results ?? []);
      if (!grupo) setGrupo(grupoData);
    } catch {
      setError('No se pudo cargar los eventos. Toca para reintentar.');
    }
  }, [grupoId, grupo]);

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  }, [load, tab]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load(tab).finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['futuros', 'pasados'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'futuros' ? 'Próximos' : 'Pasados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={eventos}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={eventos.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="calendar-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>
              {tab === 'futuros' ? 'No hay eventos próximos' : 'No hay eventos pasados'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const estadoStyle = getEstadoStyle(item.estado);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('GrupoEventoDetail', {
                eventoId: item.id,
                titulo: item.titulo,
                grupoId,
                grupo,
              })}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <Text style={styles.eventName} numberOfLines={2}>{item.titulo ?? '—'}</Text>
                <View style={[styles.statusChip, { backgroundColor: estadoStyle.bg }]}>
                  <Text style={[styles.statusText, { color: estadoStyle.text }]}>
                    {item.estado_display ?? item.estado}
                  </Text>
                </View>
              </View>
              {item.tipo_display || item.tipo ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{item.tipo_display ?? item.tipo}</Text>
                </View>
              ) : null}
              <View style={styles.eventDetails}>
                {item.fecha_inicio ? (
                  <View style={styles.detailRow}>
                    <Icon source="calendar-clock" size={14} color="#888" />
                    <Text style={styles.detailText}>{formatDate(item.fecha_inicio)}</Text>
                  </View>
                ) : null}
                {item.es_online ? (
                  <View style={styles.detailRow}>
                    <Icon source="video-outline" size={14} color="#888" />
                    <Text style={styles.detailText}>Online</Text>
                  </View>
                ) : item.ubicacion ? (
                  <View style={styles.detailRow}>
                    <Icon source="map-marker-outline" size={14} color="#888" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.ubicacion}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Icon source="account-multiple-outline" size={14} color="#888" />
                  <Text style={styles.detailText}>
                    {item.miembros_grupo_asistieron ?? 0}/{item.total_miembros_grupo ?? 0} del grupo
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('GrupoEventoForm', { grupoId })}
          activeOpacity={0.85}
        >
          <Icon source="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 88 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PANTONE_295C },
  tabText: { fontSize: 14, fontWeight: '500', color: '#888' },
  tabTextActive: { color: PANTONE_295C, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  eventName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  statusChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  typeBadgeText: { fontSize: 11, color: PANTONE_295C, fontWeight: '500' },
  eventDetails: { gap: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#666' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: PANTONE_295C,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
});

