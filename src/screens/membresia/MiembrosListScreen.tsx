import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  listarMiembros,
  Miembro,
  getEstadoMembresiaColor,
  getEstadoMembresiaLabel,
} from '../../api/miembros';
import { PANTONE_295C } from '../../theme/colors';

const PAGE_SIZE = 20;

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'visitante', label: 'Visitantes' },
];

function MiembroCard({ item, onPress }: { item: Miembro; onPress: () => void }) {
  const estadoColor = getEstadoMembresiaColor(item.estado_membresia);
  const enEliminacion = item.usuario_asociado?.cuenta_en_eliminacion === true;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <View style={styles.avatarCircle}>
          <Icon source="account" size={26} color={PANTONE_295C} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.nombre} {item.apellidos}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.estadoBadgeText, { color: estadoColor.text }]}>
              {getEstadoMembresiaLabel(item.estado_membresia)}
            </Text>
          </View>
        </View>
        {enEliminacion && (
          <View style={styles.deletionWarningRow}>
            <Icon source="account-remove-outline" size={12} color="#E53935" />
            <Text style={styles.deletionWarningText}>Cuenta en proceso de eliminación</Text>
          </View>
        )}
        <View style={styles.cardMeta}>
          {item.documento_identidad ? (
            <View style={styles.metaRow}>
              <Icon source="card-account-details-outline" size={13} color="#888" />
              <Text style={styles.metaText}>{item.documento_identidad}</Text>
            </View>
          ) : null}
          {item.telefono ? (
            <View style={styles.metaRow}>
              <Icon source="phone-outline" size={13} color="#888" />
              <Text style={styles.metaText}>{item.telefono}</Text>
            </View>
          ) : null}
          {item.email ? (
            <View style={styles.metaRow}>
              <Icon source="email-outline" size={13} color="#888" />
              <Text style={styles.metaText} numberOfLines={1}>{item.email}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Icon source="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>
  );
}

export default function MiembrosListScreen() {
  const navigation = useNavigation<any>();
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);

  const canCreate = isSuperAdmin || hasPermission('membresia', 'crear');
  const canView = isSuperAdmin || hasPermission('membresia', 'ver');

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('activo');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const canLoadMore = miembros.length < totalCount;

  const load = useCallback(
    async (opts: { reset?: boolean; query?: string; estado?: string } = {}) => {
      const { reset = false, query = searchQuery, estado = estadoFiltro } = opts;
      const currentPage = reset ? 1 : page;
      setError(null);
      try {
        const params: Record<string, any> = { page: currentPage, page_size: PAGE_SIZE };
        if (query) params.search = query;
        if (estado) params.estado = estado;
        const result = await listarMiembros(params);
        setTotalCount(result.count);
        if (reset || currentPage === 1) {
          setMiembros(result.results);
          setPage(2);
        } else {
          setMiembros((prev) => [...prev, ...result.results]);
          setPage((p) => p + 1);
        }
      } catch {
        setError('No se pudo cargar los miembros. Toca para reintentar.');
      }
    },
    [page, searchQuery, estadoFiltro],
  );

  useEffect(() => {
    setLoading(true);
    load({ reset: true }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, estadoFiltro]);

  useFocusEffect(
    useCallback(() => {
      load({ reset: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, estadoFiltro]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load({ reset: true });
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    await load();
    setLoadingMore(false);
  };

  const handleSearch = () => setSearchQuery(search.trim());

  const applyFiltro = (value: string) => {
    setEstadoFiltro(value);
    setFilterModalVisible(false);
  };

  const estadoLabel =
    ESTADO_OPTIONS.find((o) => o.value === estadoFiltro)?.label ?? 'Todos';

  if (!canView) {
    return (
      <View style={styles.centered}>
        <Icon source="lock-outline" size={40} color="#CCC" />
        <Text style={styles.emptyText}>No tienes permiso para ver esta sección.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon source="magnify" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, RUT, email..."
            placeholderTextColor="#AAA"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setSearchQuery('');
              }}
            >
              <Icon source="close-circle" size={18} color="#AAA" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterModalVisible(true)}
          activeOpacity={0.75}
        >
          <Icon source="filter-outline" size={20} color={PANTONE_295C} />
          <Text style={styles.filterBtnText}>{estadoLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Count */}
      {!loading && (
        <Text style={styles.countText}>
          {totalCount} {totalCount === 1 ? 'miembro' : 'miembros'}
        </Text>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.centered} onPress={() => load({ reset: true })}>
          <Icon source="alert-circle-outline" size={36} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={miembros}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MiembroCard
              item={item}
              onPress={() => navigation.navigate('MiembroDetail', { miembroId: item.id })}
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
              <ActivityIndicator
                size="small"
                color={PANTONE_295C}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon source="account-group-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Sin resultados para tu búsqueda.'
                  : 'No hay miembros registrados.'}
              </Text>
            </View>
          }
          contentContainerStyle={miembros.length === 0 ? styles.emptyContainer : undefined}
        />
      )}

      {/* Archived link */}
      <TouchableOpacity
        style={styles.archivedBtn}
        onPress={() => navigation.navigate('MiembrosArchivados')}
        activeOpacity={0.7}
      >
        <Icon source="archive-outline" size={16} color="#888" />
        <Text style={styles.archivedBtnText}>Ver miembros archivados</Text>
      </TouchableOpacity>

      {/* FAB add */}
      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('MiembroForm', {})}
          activeOpacity={0.85}
        >
          <Icon source="plus" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Filter modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.filterSheet}>
            <Text style={styles.filterSheetTitle}>Filtrar por estado</Text>
            {ESTADO_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.filterOption,
                  estadoFiltro === opt.value && styles.filterOptionActive,
                ]}
                onPress={() => applyFiltro(opt.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    estadoFiltro === opt.value && styles.filterOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {estadoFiltro === opt.value && (
                  <Icon source="check" size={18} color={PANTONE_295C} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    gap: 4,
  },
  filterBtnText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
  countText: {
    fontSize: 12,
    color: '#888',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardLeft: { marginRight: 10 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1, marginRight: 6 },
  estadoBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  estadoBadgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#666' },
  deletionWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  deletionWarningText: { fontSize: 11, color: '#E53935', fontWeight: '500' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#E53935', marginTop: 8, textAlign: 'center' },
  archivedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  archivedBtnText: { fontSize: 13, color: '#888' },
  fab: {
    position: 'absolute',
    bottom: 68,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  filterSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  filterOptionActive: { backgroundColor: '#EAF2FF' },
  filterOptionText: { fontSize: 15, color: '#444' },
  filterOptionTextActive: { color: PANTONE_295C, fontWeight: '600' },
});
