import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  listarArticulos,
  listarCategorias,
  listarUbicaciones,
  ArticuloList,
  CategoriaInventario,
  Ubicacion,
  EstadoArticulo,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS: { value: EstadoArticulo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_uso', label: 'En uso' },
  { value: 'prestado', label: 'Prestado' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'dañado', label: 'Dañado' },
  { value: 'baja', label: 'Baja' },
];

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  disponible: { bg: '#E8F5E9', text: '#2E7D32' },
  en_uso: { bg: '#E3F2FD', text: '#1565C0' },
  prestado: { bg: '#FFF3E0', text: '#E65100' },
  mantenimiento: { bg: '#FFF9C4', text: '#F57F17' },
  dañado: { bg: '#FFEBEE', text: '#B71C1C' },
  baja: { bg: '#F5F5F5', text: '#616161' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoLabel(estado: EstadoArticulo): string {
  return estado.replace('_', ' ');
}

// ─── ArticuloCard ─────────────────────────────────────────────────────────────

function ArticuloCard({ item, onPress }: { item: ArticuloList; onPress: () => void }) {
  const estadoStyle = ESTADO_COLORS[item.estado] ?? { bg: '#F5F5F5', text: '#616161' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={styles.cardChips}>
          <View style={[styles.chip, { backgroundColor: '#EAF0FB' }]}>
            <Text style={[styles.chipText, { color: PANTONE_295C }]} numberOfLines={1}>
              {item.categoria_nombre}
            </Text>
          </View>
          <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
            <Text style={[styles.chipText, { color: estadoStyle.text }]}>
              {estadoLabel(item.estado)}
            </Text>
          </View>
        </View>
        <View style={styles.cardBadges}>
          {item.stock_bajo && (
            <Text style={styles.stockBajoEmoji}>⚠️</Text>
          )}
          <View style={styles.cantidadBadge}>
            <Text style={styles.cantidadBadgeText}>{item.cantidad}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardNombre} numberOfLines={2}>
        {item.nombre}
      </Text>

      {!!item.codigo && (
        <View style={styles.cardMeta}>
          <Icon source="barcode" size={13} color="#888" />
          <Text style={styles.cardMetaText}>{item.codigo}</Text>
        </View>
      )}

      {!!item.ubicacion_nombre && (
        <View style={styles.cardMeta}>
          <Icon source="map-marker-outline" size={13} color="#888" />
          <Text style={styles.cardMetaText} numberOfLines={1}>
            {item.ubicacion_nombre}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ArticulosListScreen() {
  const navigation = useNavigation<any>();
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);

  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoArticulo | ''>('');
  const [selectedCategoria, setSelectedCategoria] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [selectedUbicacion, setSelectedUbicacion] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  // ─── Lookup data ──────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);

  // ─── List state ───────────────────────────────────────────────────────────
  const [articulos, setArticulos] = useState<ArticuloList[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load lookup data ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [cats, ubics] = await Promise.all([
          listarCategorias(),
          listarUbicaciones(),
        ]);
        setCategorias(cats.results ?? []);
        setUbicaciones(ubics.results ?? []);
      } catch {
        // Non-critical — proceed without filter lists
      }
    };
    fetchLookups();
  }, []);

  // ─── Load articles ────────────────────────────────────────────────────────
  const load = useCallback(
    async (opts: {
      estadoKey?: EstadoArticulo | '';
      catId?: number | null;
      ubicId?: number | null;
      searchText?: string;
      pageNum?: number;
      replace?: boolean;
    } = {}) => {
      const estado = opts.estadoKey !== undefined ? opts.estadoKey : estadoFiltro;
      const catId = opts.catId !== undefined ? opts.catId : selectedCategoria?.id ?? null;
      const ubicId = opts.ubicId !== undefined ? opts.ubicId : selectedUbicacion?.id ?? null;
      const buscar = opts.searchText !== undefined ? opts.searchText : search;
      const pageNum = opts.pageNum ?? 1;
      const replace = opts.replace ?? true;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const result = await listarArticulos({
          estado: estado || undefined,
          categoria_id: catId !== null ? catId : undefined,
          ubicacion_id: ubicId !== null ? ubicId : undefined,
          buscar: buscar.trim() || undefined,
          page: pageNum,
        });
        const items = result.results ?? [];
        setArticulos((prev) => (replace ? items : [...prev, ...items]));
        setPage(pageNum);
        setHasMore(!!result.next);
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al cargar artículos.';
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
    [estadoFiltro, selectedCategoria, selectedUbicacion, search]
  );

  useFocusEffect(
    useCallback(() => {
      load({ pageNum: 1, replace: true });
    }, [])
  );

  const handleEstadoSelect = (value: EstadoArticulo | '') => {
    setEstadoFiltro(value);
    load({ estadoKey: value, pageNum: 1, replace: true });
  };

  const handleSearchSubmit = () => {
    load({ searchText: search, pageNum: 1, replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load({ pageNum: 1, replace: true });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      load({ pageNum: page + 1, replace: false });
    }
  };

  const openCategoriaFilter = () => {
    const options = [
      {
        text: 'Todas las categorías',
        onPress: () => {
          setSelectedCategoria(null);
          load({ catId: null, pageNum: 1, replace: true });
        },
      },
      ...categorias.map((c) => ({
        text: c.nombre,
        onPress: () => {
          setSelectedCategoria({ id: c.id, nombre: c.nombre });
          load({ catId: c.id, pageNum: 1, replace: true });
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ];
    Alert.alert('Filtrar por Categoría', '', options);
  };

  const openUbicacionFilter = () => {
    const options = [
      {
        text: 'Todas las ubicaciones',
        onPress: () => {
          setSelectedUbicacion(null);
          load({ ubicId: null, pageNum: 1, replace: true });
        },
      },
      ...ubicaciones.map((u) => ({
        text: u.nombre,
        onPress: () => {
          setSelectedUbicacion({ id: u.id, nombre: u.nombre });
          load({ ubicId: u.id, pageNum: 1, replace: true });
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ];
    Alert.alert('Filtrar por Ubicación', '', options);
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon source="magnify" size={16} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar artículos..."
            placeholderTextColor="#AAA"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                load({ searchText: '', pageNum: 1, replace: true });
              }}
            >
              <Icon source="close-circle" size={16} color="#AAA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Estado chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {ESTADOS.map((e) => (
          <TouchableOpacity
            key={e.value}
            style={[
              styles.estadoChip,
              estadoFiltro === e.value && styles.estadoChipActive,
            ]}
            onPress={() => handleEstadoSelect(e.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.estadoChipText,
                estadoFiltro === e.value && styles.estadoChipTextActive,
              ]}
            >
              {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categoría + Ubicación filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, !!selectedCategoria && styles.filterBtnActive]}
          onPress={openCategoriaFilter}
          activeOpacity={0.75}
        >
          <Icon
            source="tag-outline"
            size={14}
            color={selectedCategoria ? PANTONE_295C : '#888'}
          />
          <Text
            style={[styles.filterBtnText, selectedCategoria && styles.filterBtnTextActive]}
            numberOfLines={1}
          >
            {selectedCategoria?.nombre ?? 'Categoría'}
          </Text>
          <Icon source="chevron-down" size={14} color="#888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, !!selectedUbicacion && styles.filterBtnActive]}
          onPress={openUbicacionFilter}
          activeOpacity={0.75}
        >
          <Icon
            source="map-marker-outline"
            size={14}
            color={selectedUbicacion ? PANTONE_295C : '#888'}
          />
          <Text
            style={[styles.filterBtnText, selectedUbicacion && styles.filterBtnTextActive]}
            numberOfLines={1}
          >
            {selectedUbicacion?.nombre ?? 'Ubicación'}
          </Text>
          <Icon source="chevron-down" size={14} color="#888" />
        </TouchableOpacity>

        {(selectedCategoria || selectedUbicacion) && (
          <TouchableOpacity
            style={styles.clearFiltersBtn}
            onPress={() => {
              setSelectedCategoria(null);
              setSelectedUbicacion(null);
              load({ catId: null, ubicId: null, pageNum: 1, replace: true });
            }}
            activeOpacity={0.75}
          >
            <Icon source="close" size={14} color="#E53935" />
          </TouchableOpacity>
        )}
      </View>

      {/* List / Loading / Error */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => load({ pageNum: 1, replace: true })}
            activeOpacity={0.75}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={articulos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ArticuloCard
              item={item}
              onPress={() =>
                navigation.navigate('ArticuloDetail', { id: item.id, nombre: item.nombre })
              }
            />
          )}
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
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={PANTONE_295C} />
              </View>
            ) : null
          }
          contentContainerStyle={
            articulos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Icon source="package-variant-closed" size={52} color="#CCC" />
              <Text style={styles.emptyText}>Sin artículos en inventario</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ArticuloForm', {})}
          activeOpacity={0.85}
        >
          <Icon source="plus" size={28} color="#FFF" />
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
  searchRow: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    backgroundColor: '#FAFAFA',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#222',
    padding: 0,
  },
  chipsScroll: {
    flexGrow: 0,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  chipsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  estadoChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  estadoChipActive: {
    backgroundColor: PANTONE_295C,
    borderColor: PANTONE_295C,
  },
  estadoChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  estadoChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
    backgroundColor: '#FAFAFA',
  },
  filterBtnActive: {
    borderColor: PANTONE_295C,
    backgroundColor: '#EAF0FB',
  },
  filterBtnText: {
    flex: 1,
    fontSize: 12,
    color: '#888',
  },
  filterBtnTextActive: {
    color: PANTONE_295C,
    fontWeight: '600',
  },
  clearFiltersBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF8F8',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  stockBajoEmoji: {
    fontSize: 14,
  },
  cantidadBadge: {
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignItems: 'center',
  },
  cantidadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
    lineHeight: 21,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#888',
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
