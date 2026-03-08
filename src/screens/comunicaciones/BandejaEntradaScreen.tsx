import React, { useCallback, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import { getRecibidas, Comunicacion } from '../../api/comunicaciones';

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  urgente: { bg: '#FFEBEE', text: '#B71C1C' },
  alerta: { bg: '#FFEBEE', text: '#B71C1C' },
  alta: { bg: '#FFF3E0', text: '#E65100' },
  recordatorio: { bg: '#FFF3E0', text: '#E65100' },
  notificacion: { bg: '#EAF0FB', text: PANTONE_295C },
  anuncio: { bg: '#EAF0FB', text: PANTONE_295C },
};

function formatRelative(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function MensajeItem({
  item,
  onPress,
}: {
  item: Comunicacion;
  onPress: () => void;
}) {
  const unread = !item.leida;
  const tipoColors = TIPO_COLORS[item.prioridad ?? item.tipo] ?? TIPO_COLORS.notificacion;
  const preview = item.resumen || item.contenido || '';
  const fecha = item.fecha_envio || item.created_at;

  return (
    <TouchableOpacity
      style={[styles.messageCard, unread && styles.messageCardUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {unread && <View style={styles.unreadDot} />}
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTitulo, unread && styles.messageTituloBold]} numberOfLines={1}>
            {item.titulo}
          </Text>
          <Text style={styles.messageFecha}>{formatRelative(fecha)}</Text>
        </View>
        <Text style={styles.messageRemitente} numberOfLines={1}>
          {item.remitente ?? '—'}
        </Text>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {preview}
        </Text>
        <View style={styles.messageFooter}>
          <View style={[styles.chip, { backgroundColor: tipoColors.bg }]}>
            <Text style={[styles.chipText, { color: tipoColors.text }]}>
              {item.tipo_display ?? item.tipo}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BandejaEntradaScreen() {
  const navigation = useNavigation<any>();
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const puedeGestionar =
    isSuperAdmin || hasAnyRole(['church_admin', 'pastor', 'leader', 'treasurer']);

  const [mensajes, setMensajes] = useState<Comunicacion[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pageNum = 1, replace = true) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result = await getRecibidas(pageNum);
      const items: Comunicacion[] = result.results ?? result ?? [];
      setMensajes((prev) => (replace ? items : [...prev, ...items]));
      setPage(pageNum);
      setHasMore(!!result.next);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar mensajes.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(1, true);
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      load(page + 1, false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={PANTONE_295C} />
      </View>
    );
  };

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
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(1, true)} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={mensajes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MensajeItem
            item={item}
            onPress={() => navigation.navigate('BandejaDetail', { id: item.id, titulo: item.titulo })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PANTONE_295C]} tintColor={PANTONE_295C} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        contentContainerStyle={mensajes.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Icon source="email-outline" size={52} color="#CCC" />
            <Text style={styles.emptyText}>No tienes mensajes</Text>
          </View>
        }
      />
      {puedeGestionar && (
        <TouchableOpacity
          style={styles.gestionBtn}
          onPress={() => navigation.navigate('GestionList')}
          activeOpacity={0.85}
        >
          <Icon source="view-list" size={22} color={PANTONE_134C} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyInner: {
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 14,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  messageCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: PANTONE_295C,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PANTONE_295C,
    marginTop: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  messageTitulo: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  messageTituloBold: {
    fontWeight: '700',
    color: '#111',
  },
  messageFecha: {
    fontSize: 11,
    color: '#999',
    flexShrink: 0,
  },
  messageRemitente: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  messageFooter: {
    flexDirection: 'row',
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gestionBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
