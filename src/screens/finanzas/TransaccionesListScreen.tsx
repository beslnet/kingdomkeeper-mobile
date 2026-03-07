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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarTransacciones,
  Transaccion,
  TIPOS_TRANSACCION,
  ESTADOS_TRANSACCION,
  getEstadoColor,
  getEstadoLabel,
  formatMonto,
} from '../../api/finanzas';

const PAGE_SIZE = 20;

function formatDateDisplay(str: string): string {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function TransaccionItem({ item, onPress }: { item: Transaccion; onPress: () => void }) {
  const isIngreso = item.tipo === 'ingreso';
  const estadoColor = getEstadoColor(item.estado);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.cardBorder, { backgroundColor: isIngreso ? '#4CAF50' : '#E53935' }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <View style={[styles.dot, { backgroundColor: isIngreso ? '#4CAF50' : '#E53935' }]} />
            <Text style={styles.cardCategoria} numberOfLines={1}>
              {item.categoria?.nombre ?? '—'}
            </Text>
          </View>
          <Text style={[styles.cardMonto, { color: isIngreso ? '#4CAF50' : '#E53935' }]}>
            {formatMonto(item.monto)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardCuenta} numberOfLines={1}>
            {item.cuenta?.nombre ?? '—'}
          </Text>
          <Text style={styles.cardFecha}>{formatDateDisplay(item.fecha)}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor }]}>
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(item.estado)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TransaccionesListScreen() {
  const navigation = useNavigation<any>();
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const canView = isSuperAdmin || hasPermission('finanzas', 'ver');

  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchTransacciones = useCallback(
    async (opts: { tipo?: string; estado?: string; pageNum?: number; replace?: boolean } = {}) => {
      const tipo = opts.tipo !== undefined ? opts.tipo : tipoFiltro;
      const estado = opts.estado !== undefined ? opts.estado : estadoFiltro;
      const pageNum = opts.pageNum ?? 1;
      const replace = opts.replace ?? true;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const result = await listarTransacciones({
          tipo: tipo || undefined,
          estado: estado || undefined,
          page: pageNum,
          page_size: PAGE_SIZE,
        });
        setTotalCount(result.count);
        setTransacciones((prev) => (replace ? result.results : [...prev, ...result.results]));
        setPage(pageNum);
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al cargar transacciones.';
        if (typeof d === 'string') msg = d;
        else if (d?.error) msg = d.error;
        else if (d?.detail) msg = d.detail;
        else if (d && typeof d === 'object') {
          const firstKey = Object.keys(d)[0];
          const firstVal = d[firstKey];
          msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        }
        setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [tipoFiltro, estadoFiltro]
  );

  useFocusEffect(
    useCallback(() => {
      fetchTransacciones({ replace: true });
    }, [fetchTransacciones])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransacciones({ replace: true });
  };

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    if (transacciones.length >= totalCount) return;
    fetchTransacciones({ pageNum: page + 1, replace: false });
  };

  const handleTipoChip = (val: string) => {
    const newTipo = tipoFiltro === val ? '' : val;
    setTipoFiltro(newTipo);
    fetchTransacciones({ tipo: newTipo, estado: estadoFiltro, pageNum: 1, replace: true });
  };

  const handleEstadoChip = (val: string) => {
    const newEstado = estadoFiltro === val ? '' : val;
    setEstadoFiltro(newEstado);
    fetchTransacciones({ tipo: tipoFiltro, estado: newEstado, pageNum: 1, replace: true });
  };

  const ListHeader = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chipsContent}
    >
      {TIPOS_TRANSACCION.map((t) => (
        <TouchableOpacity
          key={t.value}
          style={[styles.chip, tipoFiltro === t.value && styles.chipActive]}
          onPress={() => handleTipoChip(t.value)}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, tipoFiltro === t.value && styles.chipTextActive]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
      {ESTADOS_TRANSACCION.map((e) => (
        <TouchableOpacity
          key={e.value}
          style={[
            styles.chip,
            estadoFiltro === e.value && { backgroundColor: e.color, borderColor: e.color },
          ]}
          onPress={() => handleEstadoChip(e.value)}
          activeOpacity={0.75}
        >
          <Text
            style={[styles.chipText, estadoFiltro === e.value && styles.chipTextActive]}
          >
            {e.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (!canView) {
    return (
      <View style={styles.centered}>
        <Icon source="lock-outline" size={48} color="#CCC" />
        <Text style={styles.emptyText}>Sin permisos para ver transacciones.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transacciones}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransaccionItem
            item={item}
            onPress={() => navigation.navigate('TransaccionDetail', { transaccionId: item.id })}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.centered}>
              <Icon source="swap-horizontal" size={40} color="#CCC" />
              <Text style={styles.emptyText}>Sin transacciones.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footer} color={PANTONE_295C} /> : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PANTONE_295C]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TransaccionForm')}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  listContent: {
    paddingBottom: 100,
  },
  chipsScroll: {
    flexGrow: 0,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: PANTONE_295C,
    borderColor: PANTONE_295C,
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardBorder: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  cardCategoria: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  cardMonto: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardCuenta: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cardFecha: {
    fontSize: 12,
    color: '#999',
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 4,
  },
  estadoBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  estadoBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    padding: 12,
    margin: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 14,
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
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
