import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  reporteStockBajo,
  reportePorCategoria,
  ReporteStockBajo,
  ReportePorCategoria,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_ACTIVOS    = PANTONE_295C;
const COLOR_CONSUMIBLE = '#388E3C';

const ESTADO_META: Record<string, { bg: string; text: string; label: string }> = {
  disponible:    { bg: '#E8F5E9', text: '#2E7D32', label: 'Disponible' },
  en_uso:        { bg: '#E3F2FD', text: '#1565C0', label: 'En uso' },
  prestado:      { bg: '#FFF3E0', text: '#E65100', label: 'Prestado' },
  mantenimiento: { bg: '#FFF9C4', text: '#F57F17', label: 'Mantenimiento' },
  dañado:        { bg: '#FFEBEE', text: '#B71C1C', label: 'Dañado' },
  baja:          { bg: '#F5F5F5', text: '#616161', label: 'Baja' },
};

type ActiveTab = 'activos' | 'consumibles';

// ─── Flat article types ───────────────────────────────────────────────────────

type ArticuloFlat = {
  id: number;
  codigo: string;
  nombre: string;
  categoria_nombre: string;
  ubicacion_nombre: string;
  estado: string;
  cantidad: number;
  unidad_medida: string;
  stock_minimo?: number | null;
  stock_porcentaje?: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockColor(pct: number) {
  if (pct < 30) return '#E53935';
  if (pct < 60) return '#FF9800';
  return '#4CAF50';
}

function FilterPill({
  label,
  value,
  onPress,
  color,
}: {
  label: string;
  value: string;
  onPress: () => void;
  color: string;
}) {
  const active = value !== 'Todos';
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && { borderColor: color, backgroundColor: color + '15' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.filterPillText, active && { color }]} numberOfLines={1}>
        {active ? value : label}
      </Text>
      <Icon source={active ? 'close-circle' : 'chevron-down'} size={14} color={active ? color : '#999'} />
    </TouchableOpacity>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportesScreen() {
  const [porCategoria, setPorCategoria] = useState<ReportePorCategoria[]>([]);
  const [stockBajo, setStockBajo]       = useState<ReporteStockBajo | null>(null);

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [activeTab, setActiveTab]           = useState<ActiveTab>('activos');
  const [filterCategoria, setFilterCategoria] = useState('Todos');
  const [filterUbicacion, setFilterUbicacion] = useState('Todos');

  // ─── Load ─────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [pc, sb] = await Promise.all([reportePorCategoria(), reporteStockBajo()]);
      setPorCategoria(pc);
      setStockBajo(sb);
    } catch {
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ─── Derived data ─────────────────────────────────────────────────────────

  const { activosFlat, consumiblesFlat } = useMemo(() => {
    const sbMap = new Map(
      (stockBajo?.articulos ?? []).map((s) => [
        s.articulo.id,
        { stock_minimo: s.stock_minimo, porcentaje: s.porcentaje },
      ]),
    );

    const activosFlat: ArticuloFlat[] = [];
    const consumiblesFlat: ArticuloFlat[] = [];

    for (const cat of porCategoria) {
      for (const art of cat.articulos) {
        const sb = sbMap.get(art.id);
        const item: ArticuloFlat = {
          id: art.id,
          codigo: art.codigo ?? '',
          nombre: art.nombre,
          categoria_nombre: cat.categoria_nombre,
          ubicacion_nombre: art.ubicacion_nombre ?? 'Sin ubicación',
          estado: art.estado,
          cantidad: art.cantidad,
          unidad_medida: art.unidad_medida ?? 'unidad',
          stock_minimo: sb?.stock_minimo ?? null,
          stock_porcentaje: sb?.porcentaje ?? null,
        };
        if (cat.es_consumible) consumiblesFlat.push(item);
        else activosFlat.push(item);
      }
    }

    return { activosFlat, consumiblesFlat };
  }, [porCategoria, stockBajo]);

  const currentFlat = activeTab === 'activos' ? activosFlat : consumiblesFlat;

  // Unique filter options
  const categorias = useMemo(
    () => ['Todos', ...Array.from(new Set(currentFlat.map((a) => a.categoria_nombre))).sort()],
    [currentFlat],
  );
  const ubicaciones = useMemo(
    () => ['Todos', ...Array.from(new Set(currentFlat.map((a) => a.ubicacion_nombre))).sort()],
    [currentFlat],
  );

  // Apply filters
  const filtered = useMemo(
    () =>
      currentFlat.filter(
        (a) =>
          (filterCategoria === 'Todos' || a.categoria_nombre === filterCategoria) &&
          (filterUbicacion === 'Todos' || a.ubicacion_nombre === filterUbicacion),
      ),
    [currentFlat, filterCategoria, filterUbicacion],
  );

  // Summary for current tab
  const summary = useMemo(() => {
    if (activeTab === 'activos') {
      const disponibles  = filtered.filter((a) => a.estado === 'disponible').length;
      const prestados    = filtered.filter((a) => a.estado === 'prestado').length;
      const noDisp       = filtered.filter((a) =>
        ['mantenimiento', 'dañado', 'baja'].includes(a.estado),
      ).length;
      return { total: filtered.length, disponibles, prestados, noDisp };
    } else {
      const totalUnidades = filtered.reduce((s, a) => s + a.cantidad, 0);
      const stockBajoCount = filtered.filter(
        (a) => a.stock_porcentaje !== null && (a.stock_porcentaje ?? 100) < 100,
      ).length;
      return { total: filtered.length, totalUnidades, stockBajoCount };
    }
  }, [filtered, activeTab]);

  // ─── Filter pickers ───────────────────────────────────────────────────────

  const pickCategoria = () => {
    Alert.alert('Filtrar por categoría', '', [
      ...categorias.map((c) => ({
        text: c,
        onPress: () => { setFilterCategoria(c); setFilterUbicacion('Todos'); },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const pickUbicacion = () => {
    Alert.alert('Filtrar por ubicación', '', [
      ...ubicaciones.map((u) => ({
        text: u,
        onPress: () => setFilterUbicacion(u),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setFilterCategoria('Todos');
    setFilterUbicacion('Todos');
  };

  // ─── Render: Activo card ──────────────────────────────────────────────────

  const renderActivoCard = (art: ArticuloFlat, idx: number) => {
    const m = ESTADO_META[art.estado] ?? { bg: '#F5F5F5', text: '#616161', label: art.estado };
    return (
      <View key={`a-${art.id}-${idx}`} style={styles.articleCard}>
        <View style={styles.articleCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.articleNombre} numberOfLines={2}>{art.nombre}</Text>
            {art.codigo ? (
              <Text style={styles.articleCodigo}>{art.codigo}</Text>
            ) : null}
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: m.bg }]}>
            <Text style={[styles.estadoBadgeText, { color: m.text }]}>{m.label}</Text>
          </View>
        </View>
        <View style={styles.articleMeta}>
          <View style={styles.metaItem}>
            <Icon source="folder-outline" size={12} color="#aaa" />
            <Text style={styles.metaText} numberOfLines={1}>{art.categoria_nombre}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon source="map-marker-outline" size={12} color="#aaa" />
            <Text style={styles.metaText} numberOfLines={1}>{art.ubicacion_nombre}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── Render: Consumible card ───────────────────────────────────────────────

  const renderConsumibleCard = (art: ArticuloFlat, idx: number) => {
    const hasBarra = art.stock_porcentaje !== null && art.stock_minimo !== null;
    const pct      = hasBarra ? Math.min(Math.max(art.stock_porcentaje ?? 0, 0), 100) : null;
    const color    = pct !== null ? stockColor(pct) : COLOR_CONSUMIBLE;
    const isBajo   = pct !== null && pct < 100;

    return (
      <View key={`c-${art.id}-${idx}`} style={[styles.articleCard, isBajo && styles.articleCardAlert]}>
        <View style={styles.articleCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.articleNombre} numberOfLines={2}>{art.nombre}</Text>
            <View style={styles.metaItem}>
              <Icon source="folder-outline" size={12} color="#aaa" />
              <Text style={styles.metaText}>{art.categoria_nombre}</Text>
            </View>
          </View>
          <View style={styles.stockBox}>
            <Text style={[styles.stockCount, { color }]}>{art.cantidad}</Text>
            <Text style={styles.stockUnit}>{art.unidad_medida}</Text>
          </View>
        </View>

        {hasBarra && pct !== null && (
          <View style={{ marginTop: 8 }}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={[styles.progressLabel, { color }]}>
                {pct.toFixed(0)}% del mínimo
              </Text>
              <Text style={styles.progressLabel}>
                mín. {art.stock_minimo} {art.unidad_medida}
              </Text>
            </View>
          </View>
        )}

        {!hasBarra && (
          <Text style={styles.noMinimoLabel}>Sin stock mínimo configurado</Text>
        )}

        <View style={[styles.metaItem, { marginTop: 4 }]}>
          <Icon source="map-marker-outline" size={12} color="#aaa" />
          <Text style={styles.metaText}>{art.ubicacion_nombre}</Text>
        </View>
      </View>
    );
  };

  // ─── Summary bar ──────────────────────────────────────────────────────────

  const renderSummary = () => {
    const color = activeTab === 'activos' ? COLOR_ACTIVOS : COLOR_CONSUMIBLE;
    if (activeTab === 'activos') {
      const s = summary as { total: number; disponibles: number; prestados: number; noDisp: number };
      return (
        <View style={[styles.summaryBar, { borderLeftColor: color }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color }]}>{s.total}</Text>
            <Text style={styles.summaryLbl}>Total</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#2E7D32' }]}>{s.disponibles}</Text>
            <Text style={styles.summaryLbl}>Disponibles</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: s.prestados > 0 ? '#E65100' : '#2E7D32' }]}>
              {s.prestados}
            </Text>
            <Text style={styles.summaryLbl}>Prestados</Text>
          </View>
          {s.noDisp > 0 && (
            <>
              <View style={styles.summarySep} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: '#B71C1C' }]}>{s.noDisp}</Text>
                <Text style={styles.summaryLbl}>No disp.</Text>
              </View>
            </>
          )}
        </View>
      );
    } else {
      const s = summary as { total: number; totalUnidades: number; stockBajoCount: number };
      return (
        <View style={[styles.summaryBar, { borderLeftColor: color }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color }]}>{s.total}</Text>
            <Text style={styles.summaryLbl}>Artículos</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color }]}>{s.totalUnidades}</Text>
            <Text style={styles.summaryLbl}>Unidades</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: s.stockBajoCount > 0 ? '#E53935' : '#2E7D32' }]}>
              {s.stockBajoCount > 0 ? `⚠ ${s.stockBajoCount}` : '✓ 0'}
            </Text>
            <Text style={styles.summaryLbl}>Stock bajo</Text>
          </View>
        </View>
      );
    }
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

  const accentColor = activeTab === 'activos' ? COLOR_ACTIVOS : COLOR_CONSUMIBLE;

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activos' && styles.tabActive]}
          onPress={() => switchTab('activos')}
          activeOpacity={0.75}
        >
          <Icon
            source="package-variant-closed"
            size={16}
            color={activeTab === 'activos' ? COLOR_ACTIVOS : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'activos' && { color: COLOR_ACTIVOS }]}>
            Activos
          </Text>
          <View style={[styles.tabCount, activeTab === 'activos' && { backgroundColor: COLOR_ACTIVOS }]}>
            <Text style={[styles.tabCountText, activeTab === 'activos' && { color: '#fff' }]}>
              {activosFlat.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'consumibles' && styles.tabActiveGreen]}
          onPress={() => switchTab('consumibles')}
          activeOpacity={0.75}
        >
          <Icon
            source="layers-outline"
            size={16}
            color={activeTab === 'consumibles' ? COLOR_CONSUMIBLE : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'consumibles' && { color: COLOR_CONSUMIBLE }]}>
            Insumos
          </Text>
          <View style={[styles.tabCount, activeTab === 'consumibles' && { backgroundColor: COLOR_CONSUMIBLE }]}>
            <Text style={[styles.tabCountText, activeTab === 'consumibles' && { color: '#fff' }]}>
              {consumiblesFlat.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterRow}>
        <FilterPill
          label="Categoría"
          value={filterCategoria}
          onPress={filterCategoria !== 'Todos'
            ? () => setFilterCategoria('Todos')
            : pickCategoria}
          color={accentColor}
        />
        <FilterPill
          label="Ubicación"
          value={filterUbicacion}
          onPress={filterUbicacion !== 'Todos'
            ? () => setFilterUbicacion('Todos')
            : pickUbicacion}
          color={accentColor}
        />
        {(filterCategoria !== 'Todos' || filterUbicacion !== 'Todos') && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setFilterCategoria('Todos'); setFilterUbicacion('Todos'); }}
          >
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Summary bar ── */}
      {renderSummary()}

      {/* ── Article list ── */}
      {error ? (
        <View style={styles.errorBox}>
          <Icon source="alert-circle-outline" size={32} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadAll()}>
            <Text style={styles.retryLink}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              colors={[PANTONE_295C]}
              tintColor={PANTONE_295C}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon source="magnify-close" size={40} color="#ccc" />
              <Text style={styles.emptyText}>
                {currentFlat.length === 0
                  ? `No hay ${activeTab === 'activos' ? 'activos' : 'insumos'} registrados`
                  : 'Sin resultados para los filtros aplicados'}
              </Text>
            </View>
          ) : (
            filtered.map((art, idx) =>
              activeTab === 'activos'
                ? renderActivoCard(art, idx)
                : renderConsumibleCard(art, idx),
            )
          )}
        </ScrollView>
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
  },
  loadingText: { color: '#888', fontSize: 14 },
  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: PANTONE_295C,
  },
  tabActiveGreen: {
    borderBottomColor: '#388E3C',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabCount: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#ECECEC',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  // ── Filters ──
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
    maxWidth: 160,
  },
  filterPillText: {
    fontSize: 13,
    color: '#666',
    flexShrink: 1,
  },
  clearBtn: {
    marginLeft: 'auto',
  },
  clearBtnText: {
    fontSize: 13,
    color: '#E53935',
    fontWeight: '600',
  },
  // ── Summary bar ──
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  summaryLbl: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  summarySep: {
    width: 1,
    height: 30,
    backgroundColor: '#EEE',
  },
  // ── Article cards ──
  listContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 8,
  },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  articleCardAlert: {
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  articleCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  articleNombre: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 18,
  },
  articleCodigo: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  estadoBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  articleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#888',
  },
  // ── Stock (consumibles) ──
  stockBox: {
    alignItems: 'center',
    flexShrink: 0,
  },
  stockCount: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 28,
  },
  stockUnit: {
    fontSize: 10,
    color: '#888',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  noMinimoLabel: {
    fontSize: 11,
    color: '#bbb',
    fontStyle: 'italic',
    marginTop: 6,
  },
  // ── Empty / Error ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryLink: {
    color: PANTONE_295C,
    fontWeight: '700',
    fontSize: 14,
  },
});
