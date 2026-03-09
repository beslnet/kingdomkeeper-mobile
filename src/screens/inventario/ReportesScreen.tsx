import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  reporteStockBajo,
  reportePorUbicacion,
  reportePorCategoria,
  ReporteStockBajo,
  ReportePorUbicacion,
  ReportePorCategoria,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  disponible: { bg: '#E8F5E9', text: '#2E7D32' },
  en_uso: { bg: '#E3F2FD', text: '#1565C0' },
  prestado: { bg: '#FFF3E0', text: '#E65100' },
  mantenimiento: { bg: '#FFF9C4', text: '#F57F17' },
  dañado: { bg: '#FFEBEE', text: '#B71C1C' },
  baja: { bg: '#F5F5F5', text: '#616161' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function EstadoChip({ estado, cantidad }: { estado: string; cantidad: number }) {
  const colors = ESTADO_COLORS[estado] ?? { bg: '#F5F5F5', text: '#616161' };
  return (
    <View style={[styles.estadoChip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.estadoChipText, { color: colors.text }]}>
        {estado}: {cantidad}
      </Text>
    </View>
  );
}

function ArticuloRow({
  nombre,
  estado,
  cantidad,
  prestamosActivos,
  extra,
}: {
  nombre: string;
  estado: string;
  cantidad: number;
  prestamosActivos?: number;
  extra?: string;
}) {
  const colors = ESTADO_COLORS[estado] ?? { bg: '#F5F5F5', text: '#616161' };
  return (
    <View style={styles.articuloRow}>
      <View style={styles.articuloInfo}>
        <Text style={styles.articuloNombre} numberOfLines={1}>
          {nombre}
        </Text>
        {!!extra && <Text style={styles.articuloExtra}>{extra}</Text>}
      </View>
      <View style={styles.articuloRight}>
        <Text style={styles.articuloCantidad}>
          {cantidad}
          {(prestamosActivos ?? 0) > 0 && (
            <Text style={{ color: '#E65100', fontSize: 10 }}>
              {' '}({prestamosActivos} prest.)
            </Text>
          )}
        </Text>
        <View style={[styles.articuloEstado, { backgroundColor: colors.bg }]}>
          <Text style={[styles.articuloEstadoText, { color: colors.text }]}>{estado}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportesScreen() {
  const [stockBajo, setStockBajo] = useState<ReporteStockBajo | null>(null);
  const [porUbicacion, setPorUbicacion] = useState<ReportePorUbicacion[]>([]);
  const [porCategoria, setPorCategoria] = useState<ReportePorCategoria[]>([]);

  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingUbicacion, setLoadingUbicacion] = useState(true);
  const [loadingCategoria, setLoadingCategoria] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorStock, setErrorStock] = useState<string | null>(null);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const [errorCategoria, setErrorCategoria] = useState<string | null>(null);

  const [expandedUbicacion, setExpandedUbicacion] = useState<Record<string, boolean>>({});
  const [expandedCategoria, setExpandedCategoria] = useState<Record<string, boolean>>({});

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    setLoadingStock(true);
    setLoadingUbicacion(true);
    setLoadingCategoria(true);
    setErrorStock(null);
    setErrorUbicacion(null);
    setErrorCategoria(null);

    await Promise.all([
      reporteStockBajo()
        .then(setStockBajo)
        .catch(() => setErrorStock('Error al cargar stock bajo.'))
        .finally(() => setLoadingStock(false)),

      reportePorUbicacion()
        .then(setPorUbicacion)
        .catch(() => setErrorUbicacion('Error al cargar reporte por ubicación.'))
        .finally(() => setLoadingUbicacion(false)),

      reportePorCategoria()
        .then(setPorCategoria)
        .catch(() => setErrorCategoria('Error al cargar reporte por categoría.'))
        .finally(() => setLoadingCategoria(false)),
    ]);

    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const isAnyLoading = loadingStock || loadingUbicacion || loadingCategoria;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const toggleUbicacion = (key: string) =>
    setExpandedUbicacion((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleCategoria = (key: string) =>
    setExpandedCategoria((prev) => ({ ...prev, [key]: !prev[key] }));

  const stockColor = (porcentaje: number): string => {
    if (porcentaje < 30) return '#E53935';
    if (porcentaje < 60) return '#FF9800';
    return '#4CAF50';
  };

  // ─── Section: Stock Bajo ────────────────────────────────────────────────────

  const renderStockBajo = () => (
    <View style={styles.section}>
      <SectionHeader
        title="Stock bajo"
        count={stockBajo?.total}
      />

      {loadingStock ? (
        <ActivityIndicator size="small" color={PANTONE_295C} style={styles.sectionLoader} />
      ) : errorStock ? (
        <View style={styles.sectionError}>
          <Text style={styles.sectionErrorText}>{errorStock}</Text>
          <TouchableOpacity onPress={() => loadAll()}>
            <Text style={styles.retryLink}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !stockBajo || stockBajo.articulos.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Icon source="check-circle-outline" size={32} color="#4CAF50" />
          <Text style={styles.sectionEmptyText}>Todos los artículos tienen stock suficiente</Text>
        </View>
      ) : (
        <View style={styles.stockList}>
          {stockBajo.articulos.map((item, idx) => {
            const pct = Math.min(Math.max(item.porcentaje, 0), 100);
            const color = stockColor(pct);
            return (
              <View key={idx} style={styles.stockItem}>
                <View style={styles.stockItemHeader}>
                  <Text style={styles.stockItemNombre} numberOfLines={1}>
                    {item.articulo.nombre}
                  </Text>
                  <Text style={[styles.stockItemCount, { color }]}>
                    {item.stock_actual}/{item.stock_minimo}
                  </Text>
                </View>
                <Text style={styles.stockItemCategoria}>{item.articulo.categoria_nombre}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%` as `${number}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color }]}>
                  {pct.toFixed(0)}% del mínimo
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  // ─── Section: Por Ubicación ─────────────────────────────────────────────────

  const renderPorUbicacion = () => (
    <View style={styles.section}>
      <SectionHeader title="Por ubicación" />

      {loadingUbicacion ? (
        <ActivityIndicator size="small" color={PANTONE_295C} style={styles.sectionLoader} />
      ) : errorUbicacion ? (
        <View style={styles.sectionError}>
          <Text style={styles.sectionErrorText}>{errorUbicacion}</Text>
          <TouchableOpacity onPress={() => loadAll()}>
            <Text style={styles.retryLink}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : porUbicacion.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Icon source="map-marker-off-outline" size={32} color="#ccc" />
          <Text style={styles.sectionEmptyText}>Sin datos de ubicación</Text>
        </View>
      ) : (
        porUbicacion.map((loc, idx) => {
          const key = `ub-${idx}`;
          const expanded = !!expandedUbicacion[key];
          return (
            <View key={key} style={styles.expandableCard}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => toggleUbicacion(key)}
                activeOpacity={0.7}
              >
                <View style={styles.expandableHeaderLeft}>
                  <Icon source="map-marker-outline" size={18} color={PANTONE_295C} />
                  <Text style={styles.expandableTitle} numberOfLines={1}>
                    {loc.ubicacion_nombre}
                  </Text>
                </View>
                <View style={styles.expandableHeaderRight}>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{loc.cantidad_total}</Text>
                  </View>
                  <Icon
                    source={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.expandableContent}>
                  {/* Estado chips */}
                  {Object.keys(loc.por_estado).length > 0 && (
                    <View style={styles.estadoChipsRow}>
                      {Object.entries(loc.por_estado).map(([est, cnt]) => (
                        <EstadoChip key={est} estado={est} cantidad={cnt} />
                      ))}
                    </View>
                  )}
                  {/* Articles */}
                  {loc.articulos.map((art, artIdx) => (
                    <ArticuloRow
                      key={artIdx}
                      nombre={art.nombre}
                      estado={art.estado}
                      cantidad={art.cantidad}
                      prestamosActivos={art.prestamos_activos_count}
                      extra={art.categoria_nombre}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  // ─── Section: Por Categoría ─────────────────────────────────────────────────

  const renderPorCategoria = () => (
    <View style={styles.section}>
      <SectionHeader title="Por categoría" />

      {loadingCategoria ? (
        <ActivityIndicator size="small" color={PANTONE_295C} style={styles.sectionLoader} />
      ) : errorCategoria ? (
        <View style={styles.sectionError}>
          <Text style={styles.sectionErrorText}>{errorCategoria}</Text>
          <TouchableOpacity onPress={() => loadAll()}>
            <Text style={styles.retryLink}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : porCategoria.length === 0 ? (
        <View style={styles.sectionEmpty}>
          <Icon source="folder-off-outline" size={32} color="#ccc" />
          <Text style={styles.sectionEmptyText}>Sin datos de categoría</Text>
        </View>
      ) : (
        porCategoria.map((cat, idx) => {
          const key = `cat-${idx}`;
          const expanded = !!expandedCategoria[key];
          return (
            <View key={key} style={styles.expandableCard}>
              <TouchableOpacity
                style={styles.expandableHeader}
                onPress={() => toggleCategoria(key)}
                activeOpacity={0.7}
              >
                <View style={styles.expandableHeaderLeft}>
                  <Icon source="folder-outline" size={18} color={PANTONE_295C} />
                  <View>
                    <Text style={styles.expandableTitle} numberOfLines={1}>
                      {cat.categoria_nombre}
                    </Text>
                    <Text style={styles.expandableSubtitle}>{cat.tipo}</Text>
                  </View>
                </View>
                <View style={styles.expandableHeaderRight}>
                  <View style={styles.totalBadge}>
                    <Text style={styles.totalBadgeText}>{cat.cantidad_total}</Text>
                  </View>
                  <Icon
                    source={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#888"
                  />
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.expandableContent}>
                  {Object.keys(cat.por_estado).length > 0 && (
                    <View style={styles.estadoChipsRow}>
                      {Object.entries(cat.por_estado).map(([est, cnt]) => (
                        <EstadoChip key={est} estado={est} cantidad={cnt} />
                      ))}
                    </View>
                  )}
                  {cat.articulos.map((art, artIdx) => (
                    <ArticuloRow
                      key={artIdx}
                      nombre={art.nombre}
                      estado={art.estado}
                      cantidad={art.cantidad}
                      prestamosActivos={art.prestamos_activos_count}
                      extra={art.ubicacion_nombre}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAll(true)}
          colors={[PANTONE_295C]}
          tintColor={PANTONE_295C}
        />
      }
    >
      {isAnyLoading && !refreshing && (
        <View style={styles.globalLoader}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
          <Text style={styles.globalLoaderText}>Cargando reportes...</Text>
        </View>
      )}

      {renderStockBajo()}
      {renderPorUbicacion()}
      {renderPorCategoria()}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  globalLoader: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  globalLoaderText: {
    color: '#888',
    fontSize: 14,
  },
  // ── Sections ──
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PANTONE_295C,
  },
  countBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B71C1C',
  },
  sectionLoader: {
    marginVertical: 24,
  },
  sectionError: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  sectionErrorText: {
    color: '#E53935',
    fontSize: 13,
    textAlign: 'center',
  },
  retryLink: {
    color: PANTONE_295C,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  sectionEmptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  // ── Stock bajo ──
  stockList: {
    gap: 10,
  },
  stockItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  stockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stockItemNombre: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
  },
  stockItemCount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  stockItemCategoria: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  // ── Expandable cards ──
  expandableCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  expandableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  expandableSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  totalBadge: {
    backgroundColor: PANTONE_295C,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  totalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  expandableContent: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
    gap: 8,
  },
  estadoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  estadoChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  estadoChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Article rows ──
  articuloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  articuloInfo: {
    flex: 1,
    marginRight: 8,
  },
  articuloNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  articuloExtra: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  articuloRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  articuloCantidad: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    minWidth: 20,
    textAlign: 'right',
  },
  articuloEstado: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  articuloEstadoText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
