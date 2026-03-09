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
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import {
  listarPrestamos,
  Prestamo,
  EstadoPrestamo,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ESTADO_FILTERS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Todos' },
  { key: 'activo', label: 'Activo' },
  { key: 'devuelto', label: 'Devuelto' },
  { key: 'vencido', label: 'Vencido' },
  { key: 'cancelado', label: 'Cancelado' },
];

const ESTADO_COLORS: Record<EstadoPrestamo, { bg: string; text: string }> = {
  activo: { bg: '#E3F2FD', text: '#1565C0' },
  devuelto: { bg: '#E8F5E9', text: '#2E7D32' },
  vencido: { bg: '#FFEBEE', text: '#B71C1C' },
  cancelado: { bg: '#F5F5F5', text: '#616161' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string | null | undefined): string {
  if (!str) return 'Sin fecha límite';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateShort(str: string | null | undefined): string {
  if (!str) return '—';
  const parts = str.split('T')[0].split('-');
  if (parts.length !== 3) return str;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrestamosScreen() {
  const navigation = useNavigation<any>();
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadPrestamos = useCallback(
    async (options: { isRefresh?: boolean; newFilter?: string; loadPage?: number } = {}) => {
      const { isRefresh = false, newFilter, loadPage = 1 } = options;
      const filter = newFilter !== undefined ? newFilter : estadoFilter;

      if (isRefresh) setRefreshing(true);
      else if (loadPage === 1) setLoading(true);
      else setLoadingMore(true);

      setError(null);
      try {
        const data = await listarPrestamos({
          estado: filter || undefined,
          page: loadPage,
          page_size: PAGE_SIZE,
        });
        if (loadPage === 1) {
          setPrestamos(data.results);
        } else {
          setPrestamos((prev) => [...prev, ...data.results]);
        }
        setHasMore(data.next !== null);
        setPage(loadPage);
      } catch {
        setError('No se pudieron cargar los préstamos.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [estadoFilter],
  );

  useFocusEffect(
    useCallback(() => {
      loadPrestamos({ loadPage: 1 });
    }, [loadPrestamos]),
  );

  const handleFilterChange = (filter: string) => {
    setEstadoFilter(filter);
    loadPrestamos({ newFilter: filter, loadPage: 1 });
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    loadPrestamos({ loadPage: page + 1 });
  };

  const handleRefresh = () => {
    loadPrestamos({ isRefresh: true, loadPage: 1 });
  };

  // ─── Render item ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Prestamo }) => {
    const estadoStyle = ESTADO_COLORS[item.estado] ?? { bg: '#F5F5F5', text: '#616161' };
    const borrowerName = item.prestatario_data
      ? `${item.prestatario_data.nombre} ${item.prestatario_data.apellidos}`
      : `ID: ${item.prestatario}`;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.articulo_data?.nombre ?? `Artículo #${item.articulo}`}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoStyle.bg }]}>
            <Text style={[styles.estadoBadgeText, { color: estadoStyle.text }]}>
              {item.estado_display ?? item.estado}
            </Text>
          </View>
        </View>

        {item.esta_vencido && (
          <View style={styles.vencidoBanner}>
            <Text style={styles.vencidoBannerText}>⚠️ Vencido</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Icon source="account-outline" size={14} color="#888" />
          <Text style={styles.infoText}>{borrowerName}</Text>
        </View>

        {/* Cantidad prestada — solo visible si es > 1 o es consumible */}
        {(item.cantidad_prestada > 1 || item.articulo_data?.es_consumible) && (
          <View style={styles.infoRow}>
            <Icon source="package-variant-closed" size={14} color="#888" />
            <Text style={styles.infoText}>
              {item.cantidad_prestada} {item.articulo_data?.unidad_medida ?? 'uds'} prestadas
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Icon source="calendar-outline" size={14} color="#888" />
          <Text style={styles.infoText}>
            Préstamo: {formatDateShort(item.fecha_prestamo)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon source="calendar-clock" size={14} color="#888" />
          <Text style={styles.infoText}>
            Devolución esperada: {formatDate(item.fecha_devolucion_esperada)}
          </Text>
        </View>

        {item.dias_prestado !== undefined && (
          <Text style={styles.diasText}>{item.dias_prestado} días prestado</Text>
        )}

        {item.estado === 'activo' && canManage && (
          <TouchableOpacity
            style={styles.devolucionButton}
            onPress={() => navigation.navigate('DevolucionForm', { prestamo: item })}
          >
            <Icon source="keyboard-return" size={16} color="#fff" />
            <Text style={styles.devolucionButtonText}>Registrar devolución</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── Loading / Error states ─────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error && !loading) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={48} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadPrestamos({ loadPage: 1 })}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {ESTADO_FILTERS.map((f) => {
          const active = estadoFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => handleFilterChange(f.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      <FlatList
        data={prestamos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[PANTONE_295C]}
            tintColor={PANTONE_295C}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={PANTONE_295C} style={{ marginVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Icon source="hand-extended-outline" size={56} color="#ccc" />
              <Text style={styles.emptyText}>No hay préstamos registrados</Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('PrestamoForm')}
        >
          <Icon source="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  // ── Filters ──
  filtersScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: PANTONE_295C,
    borderColor: PANTONE_295C,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // ── List ──
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    flexShrink: 0,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vencidoBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  vencidoBannerText: {
    color: '#B71C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  diasText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  devolucionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  devolucionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: PANTONE_134C,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  // ── States ──
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PANTONE_295C,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
});
