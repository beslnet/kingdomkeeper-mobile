import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import {
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  Notificacion,
} from '../../api/notificaciones';
import { useBadgeStore } from '../../store/badgeStore';

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

const TIPO_ICON: Record<string, string> = {
  exportacion_lista: 'download-circle-outline',
  sistema: 'information-outline',
  alerta: 'alert-circle-outline',
};

function NotificacionItem({
  item,
  onPress,
}: {
  item: Notificacion;
  onPress: () => void;
}) {
  const isExport = item.payload?.action === 'download_export';
  const icon = TIPO_ICON[item.tipo] ?? 'bell-outline';

  return (
    <TouchableOpacity
      style={[styles.card, !item.leida && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {!item.leida && <View style={styles.unreadDot} />}
      <View style={styles.iconCol}>
        <Icon source={icon} size={28} color={PANTONE_295C} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.rowBetween}>
          <Text style={[styles.titulo, !item.leida && styles.tituloBold]} numberOfLines={1}>
            {item.titulo}
          </Text>
          <Text style={styles.fecha}>{formatRelative(item.created_at)}</Text>
        </View>
        <Text style={styles.mensaje} numberOfLines={2}>
          {item.mensaje}
        </Text>
        {isExport && (
          <View style={styles.downloadHint}>
            <Icon source="download" size={14} color={PANTONE_295C} />
            <Text style={styles.downloadHintText}>Toca para descargar</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificacionesScreen() {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const refresh = useBadgeStore((s) => s.refresh);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      const data = await getNotificaciones(p);
      setItems(prev => append ? [...prev, ...data.results] : data.results);
      setHasMore(!!data.next);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(1);
    }, [load]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const handleLoadMore = () => {
    if (hasMore) load(page + 1, true);
  };

  const handlePress = async (item: Notificacion) => {
    if (!item.leida) {
      await marcarLeida(item.id).catch(() => {});
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
      refresh();
    }

    if (item.payload?.action === 'download_export') {
      const url: string | undefined = item.payload?.url_descarga;
      if (url) {
        Alert.alert(
          'Descargar respaldo',
          'Se abrirá el enlace en tu navegador para descargar el archivo ZIP.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir descarga',
              onPress: async () => {
                try {
                  await Linking.openURL(url);
                } catch (err: any) {
                  Alert.alert('Error', err?.message ?? 'No se pudo abrir el enlace de descarga.');
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Enlace no disponible', 'El enlace de descarga ha expirado o no está disponible.');
      }
    }
  };

  const handleMarcarTodas = async () => {
    await marcarTodasLeidas().catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, leida: true })));
    refresh();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.some(n => !n.leida) && (
        <TouchableOpacity style={styles.marcarTodasBtn} onPress={handleMarcarTodas}>
          <Text style={styles.marcarTodasText}>Marcar todas como leídas</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <NotificacionItem item={item} onPress={() => handlePress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PANTONE_295C]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon source="bell-off-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>Sin notificaciones</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    position: 'relative',
    overflow: 'hidden',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: PANTONE_295C,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PANTONE_134C,
  },
  iconCol: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  textCol: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo: { flex: 1, fontSize: 14, color: '#333', marginRight: 8 },
  tituloBold: { fontWeight: '700', color: '#111' },
  fecha: { fontSize: 11, color: '#999', marginTop: 1 },
  mensaje: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  downloadHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  downloadHintText: { fontSize: 12, color: PANTONE_295C, fontWeight: '600' },
  marcarTodasBtn: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#EEF2FA',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  marcarTodasText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#AAA' },
});
