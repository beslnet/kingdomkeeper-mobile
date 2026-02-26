import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getRecibidas } from '../api/comunicaciones';
import { PANTONE_295C } from '../theme/colors';

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function priorityColor(prioridad: string): { text: string; bg: string } {
  switch (prioridad) {
    case 'urgente': return { text: '#B71C1C', bg: '#FFEBEE' };
    case 'alta': return { text: '#E65100', bg: '#FFF3E0' };
    default: return { text: PANTONE_295C, bg: '#EAF0FB' };
  }
}

export default function InboxScreen() {
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pageNum: number, replace: boolean) => {
    setError(null);
    try {
      const res = await getRecibidas(pageNum);
      const results: any[] = res.results ?? res;
      if (replace) {
        setMessages(results);
      } else {
        setMessages((prev) => [...prev, ...results]);
      }
      setHasMore(!!(res.next));
      setPage(pageNum);
    } catch {
      setError('No se pudo cargar los mensajes.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(1, true).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }, [load]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, false);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const pColors = priorityColor(item.prioridad);
    return (
      <TouchableOpacity
        style={[styles.messageItem, !item.leida && styles.unreadItem]}
        onPress={() => navigation.navigate('MessageDetail', { id: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.messageLeft}>
          {!item.leida && <View style={styles.unreadDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.messageHeader}>
            <Text style={[styles.messageTitle, !item.leida && { fontWeight: 'bold' }]} numberOfLines={1}>
              {item.titulo}
            </Text>
            <Text style={styles.messageDate}>{formatRelativeDate(item.fecha_envio)}</Text>
          </View>
          {item.resumen || item.contenido ? (
            <Text style={styles.messageSummary} numberOfLines={2}>
              {item.resumen ?? item.contenido}
            </Text>
          ) : null}
          <View style={styles.messageMeta}>
            <Text style={styles.messageSender}>{item.remitente}</Text>
            {(item.tipo_display || item.prioridad_display) && (
              <View style={[styles.chip, { backgroundColor: pColors.bg }]}>
                <Text style={[styles.chipText, { color: pColors.text }]}>
                  {item.tipo_display ?? item.prioridad_display}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={messages}
      keyExtractor={(item, index) => String(item.id ?? index)}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={messages.length === 0 ? styles.emptyContainer : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Icon source="email-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>No tienes mensajes</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator size="small" color={PANTONE_295C} style={{ margin: 16 }} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  errorText: { color: '#E53935', marginTop: 12, textAlign: 'center', fontSize: 14 },
  emptyText: { color: '#AAA', marginTop: 12, fontSize: 15 },
  messageItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
    gap: 10,
  },
  unreadItem: { backgroundColor: '#F0F4FF' },
  messageLeft: { width: 10, alignItems: 'center', paddingTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PANTONE_295C },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  messageTitle: { fontSize: 14, color: '#222', flex: 1, marginRight: 8 },
  messageDate: { fontSize: 11, color: '#AAA', flexShrink: 0 },
  messageSummary: { fontSize: 13, color: '#777', marginBottom: 6 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageSender: { fontSize: 12, color: '#999', flex: 1 },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: 11, fontWeight: '600' },
});
