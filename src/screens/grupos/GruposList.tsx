import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { listarGrupos } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function getEstadoColor(estado: string): { bg: string; text: string } {
  switch (estado) {
    case 'activo': return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'inactivo': return { bg: '#F5F5F5', text: '#757575' };
    case 'suspendido': return { bg: '#FFF3E0', text: '#E65100' };
    default: return { bg: '#E3F2FD', text: '#1565C0' };
  }
}

function GrupoCard({ item, onPress }: { item: any; onPress: () => void }) {
  const estadoColor = getEstadoColor(item.estado);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre}</Text>
        <View style={[styles.chip, { backgroundColor: estadoColor.bg }]}>
          <Text style={[styles.chipText, { color: estadoColor.text }]}>
            {item.estado_display ?? item.estado}
          </Text>
        </View>
      </View>
      {item.tipo_display || item.tipo ? (
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.tipo_display ?? item.tipo}</Text>
        </View>
      ) : null}
      <View style={styles.cardMeta}>
        {item.lider_nombre ? (
          <View style={styles.metaRow}>
            <Icon source="account-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{item.lider_nombre}</Text>
          </View>
        ) : null}
        {item.total_miembros != null ? (
          <View style={styles.metaRow}>
            <Icon source="account-multiple-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{item.total_miembros} miembros</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function GruposListScreen() {
  const navigation = useNavigation<any>();
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);

  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canCreate = isSuperAdmin || hasPermission('grupos', 'crear');

  const load = useCallback(async (query?: string) => {
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (query) params.search = query;
      const result = await listarGrupos(params);
      setGrupos(Array.isArray(result) ? result : result.results ?? []);
    } catch {
      setError('No se pudo cargar los grupos. Toca para reintentar.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(searchQuery).finally(() => setLoading(false));
  }, [load, searchQuery]);

  // Reload when navigating back from GrupoForm
  useFocusEffect(
    useCallback(() => {
      load(searchQuery);
    }, [load, searchQuery])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(searchQuery);
    setRefreshing(false);
  }, [load, searchQuery]);

  const handleSearchSubmit = useCallback(() => {
    setSearchQuery(search);
  }, [search]);

  const handleSearchClear = useCallback(() => {
    setSearch('');
    setSearchQuery('');
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load(searchQuery).finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon source="magnify" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar grupos..."
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={handleSearchClear}>
            <Icon source="close-circle" size={18} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={grupos}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={({ item }) => (
          <GrupoCard
            item={item}
            onPress={() => navigation.navigate('GrupoDetail', { id: item.id, nombre: item.nombre })}
          />
        )}
        contentContainerStyle={grupos.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="account-multiple-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No hay grupos disponibles</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.archivedLink}
            onPress={() => navigation.navigate('GruposArchivados')}
            activeOpacity={0.7}
          >
            <Icon source="archive-outline" size={16} color="#78909C" />
            <Text style={styles.archivedLinkText}>Ver grupos archivados</Text>
          </TouchableOpacity>
        }
      />

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('GrupoForm')}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333', paddingVertical: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1, marginRight: 8 },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  typeBadgeText: { fontSize: 11, color: PANTONE_295C, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
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
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  archivedLinkText: { fontSize: 13, color: '#78909C' },
});
