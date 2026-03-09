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
  TextInput,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  obtenerCasos,
  obtenerMisCasos,
  CasoPastoral,
  TipoCaso,
} from '../../api/pastoral';

// ─── Constants ────────────────────────────────────────────────────────────────

type TabKey = 'mis_casos' | 'todos' | 'cerrados';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'mis_casos', label: 'Mis Casos' },
  { key: 'todos', label: 'Todos' },
  { key: 'cerrados', label: 'Cerrados' },
];

const TIPOS_FILTRO: { value: string; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'visita', label: 'Visita' },
  { value: 'oracion', label: 'Oración' },
  { value: 'consejeria', label: 'Consejería' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otro', label: 'Otro' },
];

const TIPO_COLORS: Record<TipoCaso | string, { bg: string; text: string }> = {
  visita: { bg: '#E8F5E9', text: '#2E7D32' },
  oracion: { bg: '#EDE7F6', text: '#6A1B9A' },
  consejeria: { bg: '#E3F2FD', text: '#1565C0' },
  crisis: { bg: '#FFEBEE', text: '#B71C1C' },
  seguimiento: { bg: '#EAF0FB', text: PANTONE_295C },
  otro: { bg: '#F5F5F5', text: '#616161' },
};

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  nuevo: { bg: '#E3F2FD', text: '#1565C0' },
  en_progreso: { bg: '#FFF3E0', text: '#E65100' },
  cerrado: { bg: '#E8F5E9', text: '#2E7D32' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── CasoCard ─────────────────────────────────────────────────────────────────

function CasoCard({
  item,
  onPress,
}: {
  item: CasoPastoral;
  onPress: () => void;
}) {
  const tipoStyle = TIPO_COLORS[item.tipo] ?? TIPO_COLORS.otro;
  const estadoStyle = ESTADO_COLORS[item.estado] ?? { bg: '#F5F5F5', text: '#757575' };
  const comentariosCount = item.comentarios?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Chips row */}
      <View style={styles.cardChips}>
        <View style={[styles.chip, { backgroundColor: tipoStyle.bg }]}>
          <Text style={[styles.chipText, { color: tipoStyle.text }]}>
            {item.tipo_display ?? item.tipo}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
          <Text style={[styles.chipText, { color: estadoStyle.text }]}>
            {item.estado_display ?? item.estado}
          </Text>
        </View>
        {item.es_confidencial && (
          <Icon source="lock-outline" size={14} color="#888" />
        )}
      </View>

      {/* Title */}
      <Text style={styles.cardTitulo} numberOfLines={2}>
        {item.titulo}
      </Text>

      {/* Description */}
      {!!item.descripcion && (
        <Text style={styles.cardDescripcion} numberOfLines={2}>
          {item.descripcion}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          {item.miembro && (
            <View style={styles.cardMeta}>
              <Icon source="account-outline" size={13} color="#888" />
              <Text style={styles.cardMetaText} numberOfLines={1}>
                {item.miembro.nombre_completo}
              </Text>
            </View>
          )}
          <View style={styles.cardMeta}>
            <Icon source="account-tie-outline" size={13} color="#888" />
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {item.responsable
                ? item.responsable.nombre_completo ||
                  `${item.responsable.nombre} ${item.responsable.apellidos}`
                : 'Sin asignar'}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooterRight}>
          {comentariosCount > 0 && (
            <View style={styles.cardMeta}>
              <Icon source="comment-outline" size={13} color="#888" />
              <Text style={styles.cardMetaText}>{comentariosCount}</Text>
            </View>
          )}
          <Text style={styles.cardFecha}>{formatRelative(item.fecha_apertura)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CasosListScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);

  const puedeGestionar =
    isSuperAdmin || hasAnyRole(['pastor', 'leader', 'church_admin']);

  const [tab, setTab] = useState<TabKey>('mis_casos');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [search, setSearch] = useState('');
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);

  const [casos, setCasos] = useState<CasoPastoral[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: {
      tabKey?: TabKey;
      tipo?: string;
      searchText?: string;
      pageNum?: number;
      replace?: boolean;
    } = {}) => {
      const currentTab = opts.tabKey !== undefined ? opts.tabKey : tab;
      const currentTipo = opts.tipo !== undefined ? opts.tipo : tipoFiltro;
      const currentSearch = opts.searchText !== undefined ? opts.searchText : search;
      const pageNum = opts.pageNum ?? 1;
      const replace = opts.replace ?? true;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        let result: any;
        if (currentTab === 'mis_casos') {
          result = await obtenerMisCasos({ page: pageNum });
        } else {
          result = await obtenerCasos({
            estado: currentTab === 'cerrados' ? 'cerrado' : undefined,
            tipo: currentTipo || undefined,
            search: currentSearch.trim() || undefined,
            page: pageNum,
          });
        }

        const items: CasoPastoral[] = result.results ?? (Array.isArray(result) ? result : []);
        setCasos((prev) => (replace ? items : [...prev, ...items]));
        setPage(pageNum);
        setHasMore(!!result.next);
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al cargar casos.';
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
    [tab, tipoFiltro, search]
  );

  useFocusEffect(
    useCallback(() => {
      load({ tabKey: tab, tipo: tipoFiltro, searchText: search, pageNum: 1, replace: true });
    }, [tab])
  );

  const handleTabChange = (newTab: TabKey) => {
    setTab(newTab);
    setTipoFiltro('');
    setSearch('');
    setShowTipoDropdown(false);
    load({ tabKey: newTab, tipo: '', searchText: '', pageNum: 1, replace: true });
  };

  const handleTipoSelect = (value: string) => {
    setTipoFiltro(value);
    setShowTipoDropdown(false);
    load({ tabKey: tab, tipo: value, searchText: search, pageNum: 1, replace: true });
  };

  const handleSearchSubmit = () => {
    load({ tabKey: tab, tipo: tipoFiltro, searchText: search, pageNum: 1, replace: true });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load({ tabKey: tab, tipo: tipoFiltro, searchText: search, pageNum: 1, replace: true });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      load({ tabKey: tab, tipo: tipoFiltro, searchText: search, pageNum: page + 1, replace: false });
    }
  };

  const selectedTipoLabel =
    TIPOS_FILTRO.find((t) => t.value === tipoFiltro)?.label ?? 'Tipo';

  return (
    <View style={styles.container}>
      {/* Tab bar — miembros sin gestión solo ven "Mis Casos" */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.filter((t) => puedeGestionar || t.key === 'mis_casos').map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => handleTabChange(t.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filters (only for "Todos" tab) */}
      {tab === 'todos' && (
        <View style={styles.filtersRow}>
          {/* Tipo dropdown trigger */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowTipoDropdown((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={styles.filterBtnText} numberOfLines={1}>
              {selectedTipoLabel}
            </Text>
            <Icon
              source={showTipoDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#666"
            />
          </TouchableOpacity>

          {/* Search input */}
          <View style={styles.searchContainer}>
            <Icon source="magnify" size={16} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
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
                  load({ tabKey: tab, tipo: tipoFiltro, searchText: '', pageNum: 1, replace: true });
                }}
              >
                <Icon source="close-circle" size={16} color="#AAA" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Tipo dropdown (inline) */}
      {tab === 'todos' && showTipoDropdown && (
        <View style={styles.tipoDropdown}>
          {TIPOS_FILTRO.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.tipoOption,
                tipoFiltro === t.value && styles.tipoOptionActive,
              ]}
              onPress={() => handleTipoSelect(t.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tipoOptionText,
                  tipoFiltro === t.value && styles.tipoOptionTextActive,
                ]}
              >
                {t.label}
              </Text>
              {tipoFiltro === t.value && (
                <Icon source="check" size={16} color={PANTONE_295C} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() =>
              load({ tabKey: tab, tipo: tipoFiltro, searchText: search, pageNum: 1, replace: true })
            }
            activeOpacity={0.75}
          >
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={casos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CasoCard
              item={item}
              onPress={() =>
                navigation.navigate('CasoDetail', { id: item.id, titulo: item.titulo })
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
            casos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Icon source="heart-outline" size={52} color="#CCC" />
              <Text style={styles.emptyText}>Sin casos pastorales</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {puedeGestionar && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CasoForm', {})}
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
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  tabActive: {
    backgroundColor: PANTONE_295C,
    borderColor: PANTONE_295C,
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  filtersRow: {
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
    backgroundColor: '#FAFAFA',
    maxWidth: 140,
  },
  filterBtnText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: '#FAFAFA',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#222',
    padding: 0,
  },
  tipoDropdown: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 10,
  },
  tipoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tipoOptionActive: {
    backgroundColor: '#EAF2FF',
  },
  tipoOptionText: {
    fontSize: 14,
    color: '#333',
  },
  tipoOptionTextActive: {
    color: PANTONE_295C,
    fontWeight: '600',
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
  cardChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
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
  cardTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
    lineHeight: 21,
  },
  cardDescripcion: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  cardFooterLeft: {
    flex: 1,
    gap: 3,
  },
  cardFooterRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#888',
  },
  cardFecha: {
    fontSize: 11,
    color: '#AAA',
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
