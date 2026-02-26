import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { listarEventosGrupo } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getEventoStatus(evento: any): { label: string; bg: string; text: string } {
  const now = new Date();
  const inicio = parseDate(evento.fecha_inicio);
  const fin = parseDate(evento.fecha_fin);

  if (fin && fin < now) return { label: 'Finalizado', bg: '#F5F5F5', text: '#757575' };
  if (inicio && inicio <= now && (!fin || fin >= now)) return { label: 'En curso', bg: '#E8F5E9', text: '#2E7D32' };
  return { label: 'Próximo', bg: '#E3F2FD', text: '#1565C0' };
}

export default function GrupoEventosScreen() {
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);

  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    isSuperAdmin ||
    hasAnyRole(['church_admin', 'pastor', 'leader']);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listarEventosGrupo(grupoId);
      setEventos(Array.isArray(result) ? result : result.results ?? []);
    } catch {
      setError('No se pudo cargar los eventos. Toca para reintentar.');
    }
  }, [grupoId]);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={eventos}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={eventos.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="calendar-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No hay eventos para este grupo</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getEventoStatus(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.eventName} numberOfLines={2}>{item.nombre ?? item.titulo ?? '—'}</Text>
                <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.eventDetails}>
                {item.fecha_inicio ? (
                  <View style={styles.detailRow}>
                    <Icon source="calendar-outline" size={14} color="#888" />
                    <Text style={styles.detailText}>{formatDate(item.fecha_inicio)}</Text>
                  </View>
                ) : null}
                {item.hora_inicio ? (
                  <View style={styles.detailRow}>
                    <Icon source="clock-outline" size={14} color="#888" />
                    <Text style={styles.detailText}>{item.hora_inicio}</Text>
                  </View>
                ) : null}
                {item.lugar ?? item.ubicacion ? (
                  <View style={styles.detailRow}>
                    <Icon source="map-marker-outline" size={14} color="#888" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.lugar ?? item.ubicacion}</Text>
                  </View>
                ) : null}
                {item.total_asistentes != null ? (
                  <View style={styles.detailRow}>
                    <Icon source="account-multiple-outline" size={14} color="#888" />
                    <Text style={styles.detailText}>{item.total_asistentes} asistentes</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => Alert.alert('Próximamente', 'La creación de eventos estará disponible en una próxima actualización.')}
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  eventName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  statusChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
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
