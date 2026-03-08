import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { listarComunicaciones, Comunicacion, EstadoComunicacion } from '../../api/comunicaciones';

type FiltroEstado = 'todos' | 'borrador' | 'enviada' | 'fallida';

const FILTROS: { key: FiltroEstado; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviada', label: 'Enviada' },
  { key: 'fallida', label: 'Fallida' },
];

const ESTADO_STYLES: Record<string, { bg: string; text: string }> = {
  borrador: { bg: '#FFF3E0', text: '#E65100' },
  programada: { bg: '#EDE7F6', text: '#6A1B9A' },
  enviada: { bg: '#E8F5E9', text: '#2E7D32' },
  enviada_con_fallos: { bg: '#FFF3E0', text: '#E65100' },
  fallida: { bg: '#FFEBEE', text: '#C62828' },
  cancelada: { bg: '#F5F5F5', text: '#757575' },
};

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  notificacion: { bg: '#EAF0FB', text: PANTONE_295C },
  anuncio: { bg: '#EAF0FB', text: PANTONE_295C },
  recordatorio: { bg: '#FFF3E0', text: '#E65100' },
  alerta: { bg: '#FFEBEE', text: '#B71C1C' },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ComunicacionItem({
  item,
  onPress,
}: {
  item: Comunicacion;
  onPress: () => void;
}) {
  const estadoStyle = ESTADO_STYLES[item.estado] ?? { bg: '#F5F5F5', text: '#757575' };
  const tipoStyle = TIPO_COLORS[item.tipo] ?? TIPO_COLORS.notificacion;
  const fecha = item.fecha_envio ?? item.fecha_programada ?? item.created_at;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo} numberOfLines={2}>
          {item.titulo}
        </Text>
        <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
          <Text style={[styles.chipText, { color: estadoStyle.text }]}>
            {item.estado_display ?? item.estado}
          </Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={[styles.chip, { backgroundColor: tipoStyle.bg }]}>
          <Text style={[styles.chipText, { color: tipoStyle.text }]}>
            {item.tipo_display ?? item.tipo}
          </Text>
        </View>
        <View style={styles.cardMetaRight}>
          <Icon source="account-multiple-outline" size={14} color="#888" />
          <Text style={styles.cardMetaText}>{item.num_destinatarios_display ?? item.num_destinatarios}</Text>
          <Text style={styles.cardFecha}>{formatDate(fecha)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function GestionListScreen() {
  const navigation = useNavigation<any>();
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: { estadoFiltro?: FiltroEstado; pageNum?: number; replace?: boolean } = {}) => {
      const estado = opts.estadoFiltro !== undefined ? opts.estadoFiltro : filtro;
      const pageNum = opts.pageNum ?? 1;
      const replace = opts.replace ?? true;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const result = await listarComunicaciones({
          estado: estado === 'todos' ? undefined : estado,
          page: pageNum,
        });
        const items: Comunicacion[] = result.results ?? result ?? [];
        const count: number = result.count ?? items.length;
        const current = replace ? items : [...comunicaciones, ...items];
        setComunicaciones(current);
        setPage(pageNum);
        setHasMore(current.length < count);
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al cargar comunicaciones.';
        if (typeof d === 'string') msg = d;
        else if (d?.error) msg = d.error;
        else if (d?.detail) msg = d.detail;
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filtro, comunicaciones]
  );

  useFocusEffect(
    useCallback(() => {
      load({ estadoFiltro: filtro, pageNum: 1, replace: true });
    }, [filtro])
  );

  const handleFiltro = (f: FiltroEstado) => {
    setFiltro(f);
    load({ estadoFiltro: f, pageNum: 1, replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load({ estadoFiltro: filtro, pageNum: 1, replace: true });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      load({ estadoFiltro: filtro, pageNum: page + 1, replace: false });
    }
  };

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filtro === f.key && styles.filterTabActive]}
            onPress={() => handleFiltro(f.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterTabText, filtro === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load({ estadoFiltro: filtro, pageNum: 1, replace: true })} activeOpacity={0.75}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={comunicaciones}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ComunicacionItem
              item={item}
              onPress={() =>
                navigation.navigate('ComunicacionDetail', { id: item.id, titulo: item.titulo })
              }
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PANTONE_295C]} tintColor={PANTONE_295C} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={PANTONE_295C} />
              </View>
            ) : null
          }
          contentContainerStyle={
            comunicaciones.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Icon source="forum-outline" size={52} color="#CCC" />
              <Text style={styles.emptyText}>Sin comunicaciones</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ComunicacionForm', {})}
        activeOpacity={0.85}
      >
        <Icon source="plus" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  filterScroll: {
    flexGrow: 0,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  filterTabActive: {
    backgroundColor: PANTONE_295C,
    borderColor: PANTONE_295C,
  },
  filterTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
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
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  cardFecha: {
    fontSize: 12,
    color: '#AAA',
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
  fab: {
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
