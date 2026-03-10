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

const COLOR_INDIVIDUAL = PANTONE_295C;   // blue
const COLOR_GRANEL     = '#7B1FA2';      // purple
const COLOR_CONSUMIBLE = '#388E3C';      // green

type ActiveTab = 'individual' | 'granel' | 'consumible';

// ─── Flat article type ────────────────────────────────────────────────────────

type ArticuloFlat = {
  id: number;
  codigo: string;
  nombre: string;
  categoria_nombre: string;
  ubicacion_nombre: string;
  estado: string;
  cantidad: number;
  unidad_medida: string;
  tipo_articulo: 'individual' | 'granel' | 'consumible';
  stock_minimo?: number | null;
  stock_porcentaje?: number | null;
  prestamos_activos_count?: number | null;
};

type ProductoGroup = {
  nombre: string;
  categoria_nombre: string;
  ubicaciones: string[];
  total: number;
  disponibles: number;
  prestados: number;
  otros: number;
  articulos: ArticuloFlat[];
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

  const [activeTab, setActiveTab]             = useState<ActiveTab>('individual');
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

  const { individualesFlat, granelFlat, consumiblesFlat } = useMemo(() => {
    const sbMap = new Map(
      (stockBajo?.articulos ?? []).map((s) => [
        s.articulo.id,
        { stock_minimo: s.stock_minimo, porcentaje: s.porcentaje },
      ]),
    );

    const individualesFlat: ArticuloFlat[] = [];
    const granelFlat: ArticuloFlat[] = [];
    const consumiblesFlat: ArticuloFlat[] = [];

    for (const cat of porCategoria) {
      for (const art of cat.articulos) {
        const sb = sbMap.get(art.id);
        const tipo = art.tipo_articulo ?? 'individual';
        const item: ArticuloFlat = {
          id: art.id,
          codigo: art.codigo ?? '',
          nombre: art.nombre,
          categoria_nombre: cat.categoria_nombre,
          ubicacion_nombre: art.ubicacion_nombre ?? 'Sin ubicación',
          estado: art.estado,
          cantidad: art.cantidad,
          unidad_medida: art.unidad_medida ?? 'unidad',
          tipo_articulo: tipo,
          stock_minimo: sb?.stock_minimo ?? null,
          stock_porcentaje: sb?.porcentaje ?? null,
          prestamos_activos_count: art.prestamos_activos_count ?? null,
        };
        if (tipo === 'individual') individualesFlat.push(item);
        else if (tipo === 'granel') granelFlat.push(item);
        else consumiblesFlat.push(item);
      }
    }

    return { individualesFlat, granelFlat, consumiblesFlat };
  }, [porCategoria, stockBajo]);

  const currentFlat = useMemo(() => {
    if (activeTab === 'individual') return individualesFlat;
    if (activeTab === 'granel') return granelFlat;
    return consumiblesFlat;
  }, [activeTab, individualesFlat, granelFlat, consumiblesFlat]);

  // Filter options
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

  // Group individual by product name
  const groupedIndividual = useMemo<ProductoGroup[]>(() => {
    if (activeTab !== 'individual') return [];
    const map = new Map<string, ProductoGroup>();
    for (const art of filtered) {
      const key = `${art.nombre}||${art.categoria_nombre}`;
      if (!map.has(key)) {
        map.set(key, {
          nombre: art.nombre,
          categoria_nombre: art.categoria_nombre,
          ubicaciones: [],
          total: 0,
          disponibles: 0,
          prestados: 0,
          otros: 0,
          articulos: [],
        });
      }
      const g = map.get(key)!;
      const units = art.cantidad > 0 ? art.cantidad : 1;
      g.total += units;
      if (art.estado === 'disponible') g.disponibles += units;
      else if (art.estado === 'prestado') g.prestados += units;
      else g.otros += units;
      if (!g.ubicaciones.includes(art.ubicacion_nombre)) g.ubicaciones.push(art.ubicacion_nombre);
      g.articulos.push(art);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filtered, activeTab]);

  // Summary per tab
  const summary = useMemo(() => {
    if (activeTab === 'individual') {
      const totalUnidades = filtered.reduce((s, a) => s + (a.cantidad > 0 ? a.cantidad : 1), 0);
      const disponibles   = filtered.filter((a) => a.estado === 'disponible').reduce((s, a) => s + (a.cantidad > 0 ? a.cantidad : 1), 0);
      const prestados     = filtered.filter((a) => a.estado === 'prestado').reduce((s, a) => s + (a.cantidad > 0 ? a.cantidad : 1), 0);
      return { productos: groupedIndividual.length, total: totalUnidades, disponibles, prestados };
    }
    if (activeTab === 'granel') {
      const totalDisponible = filtered.reduce((s, a) => s + a.cantidad, 0);
      const totalPrestamos  = filtered.reduce((s, a) => s + (a.prestamos_activos_count ?? 0), 0);
      return { total: filtered.length, totalDisponible, totalPrestamos };
    }
    // consumible
    const totalUnidades  = filtered.reduce((s, a) => s + a.cantidad, 0);
    const stockBajoCount = filtered.filter((a) => a.stock_porcentaje !== null && (a.stock_porcentaje ?? 100) < 100).length;
    return { total: filtered.length, totalUnidades, stockBajoCount };
  }, [filtered, activeTab, groupedIndividual]);

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

  // ─── Render: Individual (codificado) group card ───────────────────────────

  const renderIndividualGroupCard = (g: ProductoGroup, idx: number) => {
    const allDisp = g.prestados === 0 && g.otros === 0;
    const hasPrest = g.prestados > 0;
    return (
      <View key={`ig-${g.nombre}-${idx}`} style={[styles.articleCard, hasPrest && styles.articleCardWarning]}>
        <View style={styles.articleCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.articleNombre} numberOfLines={2}>{g.nombre}</Text>
            <View style={styles.metaItem}>
              <Icon source="folder-outline" size={12} color="#aaa" />
              <Text style={styles.metaText}>{g.categoria_nombre}</Text>
            </View>
          </View>
          <View style={styles.totalBadge}>
            <Text style={[styles.totalBadgeNum, { color: COLOR_INDIVIDUAL }]}>{g.total}</Text>
            <Text style={styles.totalBadgeLbl}>unidades</Text>
          </View>
        </View>

        <View style={styles.stockIndicatorRow}>
          <View style={styles.stockIndicator}>
            <View style={[styles.stockDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.stockIndicatorNum}>{g.disponibles}</Text>
            <Text style={styles.stockIndicatorLbl}>Disponibles</Text>
          </View>
          <View style={styles.stockIndicator}>
            <View style={[styles.stockDot, { backgroundColor: g.prestados > 0 ? '#E65100' : '#BDBDBD' }]} />
            <Text style={[styles.stockIndicatorNum, { color: g.prestados > 0 ? '#E65100' : '#BDBDBD' }]}>
              {g.prestados}
            </Text>
            <Text style={[styles.stockIndicatorLbl, { color: g.prestados > 0 ? '#E65100' : '#BDBDBD' }]}>
              Prestados
            </Text>
          </View>
          {g.otros > 0 && (
            <View style={styles.stockIndicator}>
              <View style={[styles.stockDot, { backgroundColor: '#9E9E9E' }]} />
              <Text style={[styles.stockIndicatorNum, { color: '#9E9E9E' }]}>{g.otros}</Text>
              <Text style={[styles.stockIndicatorLbl, { color: '#9E9E9E' }]}>Otros</Text>
            </View>
          )}
        </View>

        <View style={styles.progressTrack}>
          {g.disponibles > 0 && (
            <View style={[styles.progressFill, {
              width: `${(g.disponibles / g.total) * 100}%` as `${number}%`,
              backgroundColor: allDisp ? '#4CAF50' : '#66BB6A',
            }]} />
          )}
          {g.prestados > 0 && (
            <View style={[styles.progressFill, {
              width: `${(g.prestados / g.total) * 100}%` as `${number}%`,
              backgroundColor: '#FF7043',
            }]} />
          )}
          {g.otros > 0 && (
            <View style={[styles.progressFill, {
              width: `${(g.otros / g.total) * 100}%` as `${number}%`,
              backgroundColor: '#BDBDBD',
            }]} />
          )}
        </View>

        {g.ubicaciones.length > 0 && (
          <View style={[styles.metaItem, { marginTop: 6 }]}>
            <Icon source="map-marker-outline" size={12} color="#aaa" />
            <Text style={styles.metaText} numberOfLines={1}>
              {g.ubicaciones.join(', ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Render: Granel card ──────────────────────────────────────────────────

  const renderGranelCard = (art: ArticuloFlat, idx: number) => {
    const hasPrestamos = (art.prestamos_activos_count ?? 0) > 0;
    const isBajo = art.stock_porcentaje !== null && (art.stock_porcentaje ?? 100) < 100;
    return (
      <View key={`g-${art.id}-${idx}`} style={[styles.articleCard, isBajo && styles.articleCardAlert]}>
        <View style={styles.articleCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.articleNombre} numberOfLines={2}>{art.nombre}</Text>
            <View style={styles.metaItem}>
              <Icon source="folder-outline" size={12} color="#aaa" />
              <Text style={styles.metaText}>{art.categoria_nombre}</Text>
            </View>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: '#F3E5F5' }]}>
            <Text style={[styles.totalBadgeNum, { color: COLOR_GRANEL }]}>{art.cantidad}</Text>
            <Text style={styles.totalBadgeLbl}>{art.unidad_medida}</Text>
          </View>
        </View>

        <View style={styles.stockIndicatorRow}>
          <View style={styles.stockIndicator}>
            <View style={[styles.stockDot, { backgroundColor: COLOR_GRANEL }]} />
            <Text style={[styles.stockIndicatorNum, { color: COLOR_GRANEL }]}>{art.cantidad}</Text>
            <Text style={styles.stockIndicatorLbl}>Disponibles</Text>
          </View>
          {hasPrestamos && (
            <View style={styles.stockIndicator}>
              <View style={[styles.stockDot, { backgroundColor: '#E65100' }]} />
              <Text style={[styles.stockIndicatorNum, { color: '#E65100' }]}>
                {art.prestamos_activos_count}
              </Text>
              <Text style={[styles.stockIndicatorLbl, { color: '#E65100' }]}>En préstamo</Text>
            </View>
          )}
        </View>

        <View style={[styles.metaItem, { marginTop: 4 }]}>
          <Icon source="map-marker-outline" size={12} color="#aaa" />
          <Text style={styles.metaText}>{art.ubicacion_nombre}</Text>
        </View>
      </View>
    );
  };

  // ─── Render: Consumible card ──────────────────────────────────────────────

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
              <View style={[styles.progressFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
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

  const accentColor =
    activeTab === 'individual' ? COLOR_INDIVIDUAL :
    activeTab === 'granel'     ? COLOR_GRANEL :
                                 COLOR_CONSUMIBLE;

  const renderSummary = () => {
    if (activeTab === 'individual') {
      const s = summary as { productos: number; total: number; disponibles: number; prestados: number };
      return (
        <View style={[styles.summaryBar, { borderLeftColor: accentColor }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: accentColor }]}>{s.productos}</Text>
            <Text style={styles.summaryLbl}>Productos</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#888' }]}>{s.total}</Text>
            <Text style={styles.summaryLbl}>Unidades</Text>
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
        </View>
      );
    }
    if (activeTab === 'granel') {
      const s = summary as { total: number; totalDisponible: number; totalPrestamos: number };
      return (
        <View style={[styles.summaryBar, { borderLeftColor: accentColor }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: accentColor }]}>{s.total}</Text>
            <Text style={styles.summaryLbl}>Artículos</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#888' }]}>{s.totalDisponible}</Text>
            <Text style={styles.summaryLbl}>Disponibles</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: s.totalPrestamos > 0 ? '#E65100' : '#888' }]}>
              {s.totalPrestamos}
            </Text>
            <Text style={styles.summaryLbl}>En préstamo</Text>
          </View>
        </View>
      );
    }
    // consumible
    const s = summary as { total: number; totalUnidades: number; stockBajoCount: number };
    return (
      <View style={[styles.summaryBar, { borderLeftColor: accentColor }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: accentColor }]}>{s.total}</Text>
          <Text style={styles.summaryLbl}>Artículos</Text>
        </View>
        <View style={styles.summarySep} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: '#888' }]}>{s.totalUnidades}</Text>
          <Text style={styles.summaryLbl}>Unidades totales</Text>
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

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {/* Codificados */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'individual' && { borderBottomColor: COLOR_INDIVIDUAL }]}
          onPress={() => switchTab('individual')}
          activeOpacity={0.75}
        >
          <Icon
            source="package-variant-closed"
            size={15}
            color={activeTab === 'individual' ? COLOR_INDIVIDUAL : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'individual' && { color: COLOR_INDIVIDUAL }]}>
            Codificados
          </Text>
          <View style={[styles.tabCount, activeTab === 'individual' && { backgroundColor: COLOR_INDIVIDUAL }]}>
            <Text style={[styles.tabCountText, activeTab === 'individual' && { color: '#fff' }]}>
              {individualesFlat.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* A Granel */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'granel' && { borderBottomColor: COLOR_GRANEL }]}
          onPress={() => switchTab('granel')}
          activeOpacity={0.75}
        >
          <Icon
            source="layers-outline"
            size={15}
            color={activeTab === 'granel' ? COLOR_GRANEL : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'granel' && { color: COLOR_GRANEL }]}>
            A Granel
          </Text>
          <View style={[styles.tabCount, activeTab === 'granel' && { backgroundColor: COLOR_GRANEL }]}>
            <Text style={[styles.tabCountText, activeTab === 'granel' && { color: '#fff' }]}>
              {granelFlat.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Consumibles */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'consumible' && { borderBottomColor: COLOR_CONSUMIBLE }]}
          onPress={() => switchTab('consumible')}
          activeOpacity={0.75}
        >
          <Icon
            source="beaker-outline"
            size={15}
            color={activeTab === 'consumible' ? COLOR_CONSUMIBLE : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'consumible' && { color: COLOR_CONSUMIBLE }]}>
            Consumibles
          </Text>
          <View style={[styles.tabCount, activeTab === 'consumible' && { backgroundColor: COLOR_CONSUMIBLE }]}>
            <Text style={[styles.tabCountText, activeTab === 'consumible' && { color: '#fff' }]}>
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
          onPress={filterCategoria !== 'Todos' ? () => setFilterCategoria('Todos') : pickCategoria}
          color={accentColor}
        />
        <FilterPill
          label="Ubicación"
          value={filterUbicacion}
          onPress={filterUbicacion !== 'Todos' ? () => setFilterUbicacion('Todos') : pickUbicacion}
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
                  ? `No hay ${activeTab === 'individual' ? 'artículos codificados' : activeTab === 'granel' ? 'artículos a granel' : 'consumibles'} registrados`
                  : 'Sin resultados para los filtros aplicados'}
              </Text>
            </View>
          ) : activeTab === 'individual' ? (
            groupedIndividual.map((g, idx) => renderIndividualGroupCard(g, idx))
          ) : activeTab === 'granel' ? (
            filtered.map((art, idx) => renderGranelCard(art, idx))
          ) : (
            filtered.map((art, idx) => renderConsumibleCard(art, idx))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingHorizontal: 8,
    paddingTop: 10,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#ECECEC',
  },
  tabCountText: {
    fontSize: 10,
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
  filterPillText: { fontSize: 13, color: '#666', flexShrink: 1 },
  clearBtn: { marginLeft: 'auto' },
  clearBtnText: { fontSize: 13, color: '#E53935', fontWeight: '600' },
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
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  summaryLbl: { fontSize: 10, color: '#888', marginTop: 1 },
  summarySep: { width: 1, height: 30, backgroundColor: '#EEE' },
  // ── Article cards ──
  listContent: { padding: 16, paddingBottom: 48, gap: 8 },
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
  articleCardAlert: { borderLeftWidth: 3, borderLeftColor: '#E53935' },
  articleCardWarning: { borderLeftWidth: 3, borderLeftColor: '#FF7043' },
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
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#888' },
  // ── Total badge ──
  totalBadge: {
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalBadgeNum: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  totalBadgeLbl: { fontSize: 9, color: '#888', marginTop: 1 },
  // ── Stock indicators ──
  stockIndicatorRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  stockIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockIndicatorNum: { fontSize: 14, fontWeight: '700', color: '#444' },
  stockIndicatorLbl: { fontSize: 11, color: '#888' },
  // ── Stock (consumibles) ──
  stockBox: { alignItems: 'center', flexShrink: 0 },
  stockCount: { fontSize: 26, fontWeight: '800', lineHeight: 28 },
  stockUnit: { fontSize: 10, color: '#888' },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  noMinimoLabel: { fontSize: 11, color: '#bbb', fontStyle: 'italic', marginTop: 6 },
  // ── Empty / Error ──
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  errorText: { color: '#E53935', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retryLink: { color: PANTONE_295C, fontWeight: '700', fontSize: 14 },
});
