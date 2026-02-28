import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { useAuthStore } from '../../store/authStore';
import { obtenerResumenFinanzas, obtenerGrupo } from '../../api/grupos';
import { listarTransacciones } from '../../api/finanzas';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // fecha viene como "YYYY-MM-DD", parsear sin zona horaria
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}-${m}-${y}`;
}

function getEstadoStyle(estado: string): { bg: string; text: string; label: string } {
  switch (estado) {
    case 'pendiente':  return { bg: '#FFF3E0', text: '#E65100', label: 'Pendiente' };
    case 'aprobado':   return { bg: '#E3F2FD', text: '#1565C0', label: 'Aprobado' };
    case 'pagado':     return { bg: '#E8F5E9', text: '#2E7D32', label: 'Pagado' };
    case 'rechazado':  return { bg: '#FFEBEE', text: '#C62828', label: 'Rechazado' };
    case 'anulado':    return { bg: '#F5F5F5', text: '#757575', label: 'Anulado' };
    default:           return { bg: '#F5F5F5', text: '#555',    label: estado };
  }
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryCardIcon}>
        <Icon source={icon} size={24} color={color} />
      </View>
      <View style={styles.summaryCardInfo}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const PAGE_SIZE = 15;

export default function GrupoFinanzasScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};

  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const user = useAuthStore((s) => s.user);

  const [resumen, setResumen] = useState<any>(null);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Permission: puedeGestionar = superAdmin | church_admin | pastor | lider | co-lider
  const miembroId = user?.miembro_id;
  const esLiderPrincipal = miembroId && grupo && Number(miembroId) === Number(grupo.lider_id);
  const esCoLider = miembroId && grupo?.miembros?.some(
    (m: any) => Number(m.miembro_id) === Number(miembroId) && m.rol_en_grupo === 'co_leader'
  );
  const puedeGestionar = isSuperAdmin || hasAnyRole(['church_admin', 'pastor']) || esLiderPrincipal || esCoLider;

  const loadResumen = useCallback(async () => {
    try {
      const r = await obtenerResumenFinanzas(grupoId);
      setResumen(r);
    } catch {
      // Non-fatal: resumen might fail with partial permissions
    }
  }, [grupoId]);

  const loadTransacciones = useCallback(async (pageNum: number, searchTerm: string, estadoFilter: string | null, append = false) => {
    try {
      const result = await listarTransacciones({
        grupo_id: grupoId,
        page: pageNum,
        page_size: PAGE_SIZE,
        ordering: '-fecha,-created_at',
        search: searchTerm,
        estado: estadoFilter ?? '',
      });
      const newItems: any[] = result.results ?? [];
      setTotalCount(result.count ?? 0);
      setHasMore(!!result.next);
      if (append) {
        setTransacciones((prev) => [...prev, ...newItems]);
      } else {
        setTransacciones(newItems);
      }
    } catch {
      if (!append) setError('No se pudieron cargar las transacciones.');
    }
  }, [grupoId]);

  const loadAll = useCallback(async () => {
    setError(null);
    setPage(1);
    const [grupoData] = await Promise.all([
      grupo ? Promise.resolve(grupo) : obtenerGrupo(grupoId),
    ]);
    if (!grupo) setGrupo(grupoData);
    await Promise.all([loadResumen(), loadTransacciones(1, search, estadoFiltro)]);
  }, [grupoId, grupo, search, estadoFiltro, loadResumen, loadTransacciones]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([loadResumen(), loadTransacciones(1, search, estadoFiltro)]);
    setRefreshing(false);
  }, [loadResumen, loadTransacciones, search, estadoFiltro]);

  const onLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadTransacciones(nextPage, search, estadoFiltro, true);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, search, estadoFiltro, loadTransacciones]);

  const onSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setPage(1);
      await loadTransacciones(1, text, estadoFiltro);
    }, 400);
  }, [loadTransacciones, estadoFiltro]);

  const onEstadoFiltroChange = useCallback(async (estado: string | null) => {
    const next = estadoFiltro === estado ? null : estado; // toggle
    setEstadoFiltro(next);
    setPage(1);
    await loadTransacciones(1, search, next);
  }, [estadoFiltro, search, loadTransacciones]);

  const totalIngresos = resumen?.total_ingresos ?? resumen?.ingresos ?? 0;
  const totalEgresos = resumen?.total_egresos ?? resumen?.egresos ?? 0;
  const balance = resumen?.balance ?? (totalIngresos - totalEgresos);
  const egresosPendientes = resumen?.egresos_pendientes ?? 0;
  const egresosAprobados = resumen?.egresos_aprobados ?? 0;
  const egresosPagados = resumen?.egresos_pagados ?? 0;

  const ListHeader = () => (
    <View>
      {/* Summary cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESUMEN</Text>
        <SummaryCard icon="arrow-down-circle-outline" label="Total Ingresos"    value={formatCLP(totalIngresos)} color="#2E7D32" />
        <SummaryCard icon="arrow-up-circle-outline"   label="Total Egresos"     value={formatCLP(totalEgresos)}  color="#C62828" />
        <SummaryCard
          icon="scale-balance"
          label="Balance"
          value={formatCLP(balance)}
          color={balance >= 0 ? PANTONE_295C : '#C62828'}
        />
      </View>

      {/* Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DESGLOSE EGRESOS</Text>
        <View style={styles.breakdownCard}>
          {[
            { label: 'Pendientes', color: '#FF9800', value: resumen?.cantidad_egresos_pendientes ?? egresosPendientes, estado: 'pendiente' },
            { label: 'Aprobados',  color: PANTONE_295C, value: resumen?.cantidad_egresos_aprobados ?? egresosAprobados, estado: 'aprobado' },
            { label: 'Pagados',    color: '#2E7D32', value: resumen?.cantidad_egresos_pagados ?? egresosPagados, estado: 'pagado' },
          ].map((item, i, arr) => {
            const isActive = estadoFiltro === item.estado;
            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={[styles.breakdownRow, isActive && { backgroundColor: item.color + '18' }]}
                  onPress={() => onEstadoFiltroChange(item.estado)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={[styles.breakdownLabel, isActive && { color: item.color, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.breakdownCount, isActive && { color: item.color }]}>
                    {item.value}
                  </Text>
                  <Icon
                    source={isActive ? 'filter-check' : 'filter-outline'}
                    size={16}
                    color={isActive ? item.color : '#CCC'}
                  />
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Transactions header */}
      <View style={[styles.section, { marginBottom: 8 }]}>
        <View style={styles.txHeaderRow}>
          <Text style={styles.sectionTitle}>TRANSACCIONES ({totalCount})</Text>
          {estadoFiltro ? (
            <TouchableOpacity style={styles.filterChip} onPress={() => onEstadoFiltroChange(null)}>
              <Text style={styles.filterChipText}>{estadoFiltro}</Text>
              <Icon source="close" size={13} color={PANTONE_295C} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.searchBar}>
          <Icon source="magnify" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Buscar transacción..."
            placeholderTextColor="#AAA"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Icon source="close-circle" size={18} color="#AAA" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error && transacciones.length === 0) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transacciones}
        keyExtractor={(item, i) => String(item.id ?? i)}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={PANTONE_295C} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyTx}>
              <Icon source="receipt" size={40} color="#CCC" />
              <Text style={styles.emptyTxText}>
                {estadoFiltro ? `Sin transacciones con estado "${estadoFiltro}"` : search ? 'Sin resultados para la búsqueda' : 'No hay transacciones registradas'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const estado = getEstadoStyle(item.estado);
          const isIngreso = item.tipo === 'ingreso';
          return (
            <TouchableOpacity
              style={styles.txCard}
              onPress={() => navigation.navigate('TransaccionDetail', {
                transaccionId: item.id,
                grupoId,
                puedeGestionar,
              })}
              activeOpacity={0.75}
            >
              {/* Top row: date + tipo chip + estado chip */}
              <View style={styles.txTopRow}>
                <Text style={styles.txDate}>{formatDate(item.fecha)}</Text>
                <View style={[styles.tipoBadge, { backgroundColor: isIngreso ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.tipoBadgeText, { color: isIngreso ? '#2E7D32' : '#E65100' }]}>
                    {isIngreso ? '↑ Ingreso' : '↓ Egreso'}
                  </Text>
                </View>
                <View style={[styles.estadoChip, { backgroundColor: estado.bg }]}>
                  <Text style={[styles.estadoText, { color: estado.text }]}>{estado.label}</Text>
                </View>
              </View>

              {/* Concepto / categoría */}
              <Text style={styles.txConcepto} numberOfLines={1}>
                {item.categoria?.nombre ?? item.categoria_nombre ?? item.descripcion ?? '—'}
              </Text>

              {/* Bottom row: responsable + monto */}
              <View style={styles.txBottomRow}>
                <View style={styles.txResponsableRow}>
                  <Icon source="account-outline" size={13} color="#999" />
                  <Text style={styles.txResponsable} numberOfLines={1}>
                    {item.responsable_nombre ?? item.responsable?.nombre_completo ?? '—'}
                  </Text>
                </View>
                <Text style={[styles.txMonto, { color: isIngreso ? '#2E7D32' : '#C62828' }]}>
                  {isIngreso ? '+' : '-'}{formatCLP(item.monto)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FABs for leaders */}
      {puedeGestionar && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: '#2E7D32' }]}
            onPress={() => navigation.navigate('IngresoForm', { grupoId })}
            activeOpacity={0.85}
          >
            <Icon source="plus" size={20} color="#fff" />
            <Text style={styles.fabText}>Ingreso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: PANTONE_295C }]}
            onPress={() => navigation.navigate('RendicionForm', { grupoId })}
            activeOpacity={0.85}
          >
            <Icon source="receipt" size={20} color="#fff" />
            <Text style={styles.fabText}>Rendición</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  listContent: { paddingBottom: 100 },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  summaryCardIcon: { marginRight: 14 },
  summaryCardInfo: { flex: 1 },
  summaryLabel: { fontSize: 13, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  breakdownCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  breakdownLabel: { flex: 1, fontSize: 14, color: '#333' },
  breakdownCount: { fontSize: 16, fontWeight: '700', color: '#333' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },
  txHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EAF2FF', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: PANTONE_295C,
  },
  filterChipText: { fontSize: 12, color: PANTONE_295C, fontWeight: '600', textTransform: 'capitalize' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E0E0E0', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 2 },
  txCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginHorizontal: 16, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  txTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  txDate: { fontSize: 12, color: '#888', minWidth: 72 },
  tipoBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tipoBadgeText: { fontSize: 11, fontWeight: '600' },
  estadoChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 'auto' },
  estadoText: { fontSize: 11, fontWeight: '600' },
  txConcepto: { fontSize: 14, fontWeight: '600', color: '#222', marginBottom: 8 },
  txBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txResponsableRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  txResponsable: { fontSize: 12, color: '#888', flex: 1 },
  txMonto: { fontSize: 15, fontWeight: '700' },
  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  emptyTx: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyTxText: { marginTop: 12, color: '#999', fontSize: 14, textAlign: 'center' },
  fabContainer: {
    position: 'absolute', bottom: 24, right: 16,
    flexDirection: 'row', gap: 10,
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

