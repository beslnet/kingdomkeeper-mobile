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

// ─── Palette ──────────────────────────────────────────────────────────────────

const ESTADO_META: Record<string, { bg: string; text: string; label: string }> = {
  disponible:    { bg: '#E8F5E9', text: '#2E7D32', label: 'Disponible' },
  en_uso:        { bg: '#E3F2FD', text: '#1565C0', label: 'En uso' },
  prestado:      { bg: '#FFF3E0', text: '#E65100', label: 'Prestado' },
  mantenimiento: { bg: '#FFF9C4', text: '#F57F17', label: 'Mantenimiento' },
  dañado:        { bg: '#FFEBEE', text: '#B71C1C', label: 'Dañado' },
  baja:          { bg: '#F5F5F5', text: '#616161', label: 'Baja' },
};

const COLOR_ACTIVOS   = PANTONE_295C;      // azul institucional
const COLOR_CONSUMIBLE = '#388E3C';        // verde
const COLOR_UBICACION  = '#5C6BC0';        // índigo

// ─── Shared helpers ───────────────────────────────────────────────────────────

function BlockHeader({
  icon,
  label,
  color,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  color: string;
  badge?: string | number;
  badgeColor?: string;
}) {
  return (
    <View style={[styles.blockHeader, { borderLeftColor: color }]}>
      <Icon source={icon} size={20} color={color} />
      <Text style={[styles.blockHeaderText, { color }]}>{label}</Text>
      {badge !== undefined && (
        <View style={[styles.blockBadge, { backgroundColor: badgeColor ?? color }]}>
          <Text style={styles.blockBadgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function EstadoChip({ estado, cantidad }: { estado: string; cantidad: number }) {
  if (cantidad === 0) return null;
  const m = ESTADO_META[estado] ?? { bg: '#F5F5F5', text: '#616161', label: estado };
  return (
    <View style={[styles.estadoChip, { backgroundColor: m.bg }]}>
      <Text style={[styles.estadoChipText, { color: m.text }]}>
        {m.label}: <Text style={{ fontWeight: '700' }}>{cantidad}</Text>
      </Text>
    </View>
  );
}

function stockColor(pct: number) {
  if (pct < 30) return '#E53935';
  if (pct < 60) return '#FF9800';
  return '#4CAF50';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportesScreen() {
  const [stockBajo, setStockBajo]         = useState<ReporteStockBajo | null>(null);
  const [porUbicacion, setPorUbicacion]   = useState<ReportePorUbicacion[]>([]);
  const [porCategoria, setPorCategoria]   = useState<ReportePorCategoria[]>([]);

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [expandedActivos, setExpandedActivos]       = useState<Record<string, boolean>>({});
  const [expandedConsumibles, setExpandedConsumibles] = useState<Record<string, boolean>>({});
  const [expandedUbicacion, setExpandedUbicacion]   = useState<Record<string, boolean>>({});

  // ─── Load ────────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [sb, pu, pc] = await Promise.all([
        reporteStockBajo(),
        reportePorUbicacion(),
        reportePorCategoria(),
      ]);
      setStockBajo(sb);
      setPorUbicacion(pu);
      setPorCategoria(pc);
    } catch {
      setError('No se pudieron cargar los reportes. Tire para refrescar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ─── Derived data ─────────────────────────────────────────────────────────────

  const activos     = porCategoria.filter((c) => !c.es_consumible);
  const consumibles = porCategoria.filter((c) => c.es_consumible);

  const totalActivos     = activos.reduce((s, c) => s + c.total_articulos, 0);
  const totalPrestados   = activos.reduce((s, c) => s + (c.por_estado.prestado ?? 0), 0);
  const totalNoDisp      = activos.reduce((s, c) =>
    s + (c.por_estado.mantenimiento ?? 0) + (c.por_estado.dañado ?? 0) + (c.por_estado.baja ?? 0), 0);

  const totalUnidades    = consumibles.reduce((s, c) => s + c.cantidad_total, 0);
  const stockBajoCount   = stockBajo?.total ?? 0;

  // ─── Render helpers ───────────────────────────────────────────────────────────

  const toggle = (
    key: string,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  ) => setter((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── PANEL: Activos Institucionales ──────────────────────────────────────────

  const renderActivos = () => (
    <View style={styles.section}>
      <BlockHeader
        icon="package-variant-closed"
        label="Activos Institucionales"
        color={COLOR_ACTIVOS}
        badge={totalActivos}
      />

      {/* Mini-resumen */}
      <View style={styles.summaryCard}>
        <SummaryRow label="Total artículos registrados" value={totalActivos} />
        <SummaryRow
          label="Disponibles"
          value={activos.reduce((s, c) => s + (c.por_estado.disponible ?? 0), 0)}
          valueColor="#2E7D32"
        />
        <SummaryRow
          label="Prestados actualmente"
          value={totalPrestados}
          valueColor={totalPrestados > 0 ? '#E65100' : '#2E7D32'}
        />
        {totalNoDisp > 0 && (
          <SummaryRow
            label="Fuera de servicio (mant./dañado/baja)"
            value={totalNoDisp}
            valueColor="#B71C1C"
          />
        )}
      </View>

      {/* Por categoría */}
      {activos.length === 0 ? (
        <View style={styles.emptyRow}>
          <Icon source="package-variant-closed-remove" size={28} color="#ccc" />
          <Text style={styles.emptyText}>Sin categorías de activos</Text>
        </View>
      ) : (
        activos.map((cat, idx) => {
          const key = `act-${idx}`;
          const expanded = !!expandedActivos[key];
          const disponible  = cat.por_estado.disponible ?? 0;
          const prestado    = cat.por_estado.prestado ?? 0;
          const otrosNoDisp = (cat.por_estado.mantenimiento ?? 0)
                            + (cat.por_estado.dañado ?? 0)
                            + (cat.por_estado.baja ?? 0);
          return (
            <View key={key} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(key, setExpandedActivos)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <Icon source="folder-outline" size={17} color={COLOR_ACTIVOS} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{cat.categoria_nombre}</Text>
                    <Text style={styles.cardSubtitle}>{cat.categoria_tipo} · {cat.total_articulos} unidades</Text>
                  </View>
                </View>
                <View style={styles.cardHeaderRight}>
                  {prestado > 0 && (
                    <View style={[styles.miniChip, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '700' }}>
                        {prestado} prest.
                      </Text>
                    </View>
                  )}
                  {otrosNoDisp > 0 && (
                    <View style={[styles.miniChip, { backgroundColor: '#FFEBEE' }]}>
                      <Text style={{ fontSize: 11, color: '#B71C1C', fontWeight: '700' }}>
                        {otrosNoDisp} n/d
                      </Text>
                    </View>
                  )}
                  <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.cardBody}>
                  {/* Estado summary chips */}
                  <View style={styles.chipsRow}>
                    {Object.entries(cat.por_estado).map(([est, cnt]) => (
                      <EstadoChip key={est} estado={est} cantidad={cnt} />
                    ))}
                  </View>
                  {/* Item list */}
                  {cat.articulos.map((art, i) => {
                    const m = ESTADO_META[art.estado] ?? { bg: '#F5F5F5', text: '#616161', label: art.estado };
                    return (
                      <View key={i} style={styles.itemRow}>
                        <View style={[styles.itemDot, { backgroundColor: m.bg, borderColor: m.text }]} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemNombre} numberOfLines={1}>{art.nombre}</Text>
                          {art.codigo ? (
                            <Text style={styles.itemCodigo}>{art.codigo}</Text>
                          ) : null}
                        </View>
                        <View style={[styles.itemEstadoBadge, { backgroundColor: m.bg }]}>
                          <Text style={[styles.itemEstadoText, { color: m.text }]}>{m.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  // ─── PANEL: Inventario Consumible ─────────────────────────────────────────────

  const renderConsumibles = () => (
    <View style={styles.section}>
      <BlockHeader
        icon="layers-outline"
        label="Inventario Consumible"
        color={COLOR_CONSUMIBLE}
        badge={stockBajoCount > 0 ? `${stockBajoCount} con stock bajo` : undefined}
        badgeColor="#E53935"
      />

      {/* Mini-resumen */}
      <View style={styles.summaryCard}>
        <SummaryRow label="Categorías de insumos" value={consumibles.length} />
        <SummaryRow label="Unidades totales en stock" value={totalUnidades} />
        <SummaryRow
          label="Alertas de stock bajo"
          value={stockBajoCount === 0 ? 'Ninguna ✓' : stockBajoCount}
          valueColor={stockBajoCount > 0 ? '#E53935' : '#2E7D32'}
        />
      </View>

      {consumibles.length === 0 ? (
        <View style={styles.emptyRow}>
          <Icon source="layers-remove" size={28} color="#ccc" />
          <Text style={styles.emptyText}>Sin categorías consumibles</Text>
        </View>
      ) : (
        consumibles.map((cat, idx) => {
          const key = `cons-${idx}`;
          const expanded = !!expandedConsumibles[key];
          const stockMinimoCategoria = stockBajo?.articulos
            .find((a) => a.articulo.categoria_nombre === cat.categoria_nombre)
            ?.stock_minimo ?? null;

          return (
            <View key={key} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(key, setExpandedConsumibles)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <Icon source="layers-outline" size={17} color={COLOR_CONSUMIBLE} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{cat.categoria_nombre}</Text>
                    <Text style={styles.cardSubtitle}>{cat.total_articulos} artículo(s) · {cat.cantidad_total} unidades</Text>
                  </View>
                </View>
                <View style={styles.cardHeaderRight}>
                  {stockBajoCount > 0 && stockBajo?.articulos.some(
                    (a) => a.articulo.categoria_nombre === cat.categoria_nombre,
                  ) && (
                    <View style={[styles.miniChip, { backgroundColor: '#FFEBEE' }]}>
                      <Text style={{ fontSize: 11, color: '#E53935', fontWeight: '700' }}>⚠ bajo</Text>
                    </View>
                  )}
                  <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.cardBody}>
                  {cat.articulos.map((art, i) => {
                    const sbItem = stockBajo?.articulos.find(
                      (s) => s.articulo.id === art.id,
                    );
                    const pct = sbItem
                      ? Math.min(Math.max(sbItem.porcentaje, 0), 100)
                      : null;
                    const color = pct !== null ? stockColor(pct) : '#4CAF50';
                    const hasMinimo = sbItem !== null && sbItem !== undefined;

                    return (
                      <View key={i} style={styles.stockItemCard}>
                        <View style={styles.stockItemTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.stockItemNombre} numberOfLines={1}>{art.nombre}</Text>
                            <Text style={styles.stockItemUnidad}>Unidad: {art.unidad_medida ?? 'unidad'}</Text>
                          </View>
                          <View style={styles.stockItemRight}>
                            <Text style={[styles.stockCount, { color }]}>
                              {art.cantidad}
                            </Text>
                            <Text style={styles.stockUnit}>en stock</Text>
                          </View>
                        </View>
                        {hasMinimo && pct !== null && (
                          <>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${pct}%` as `${number}%`,
                                    backgroundColor: color,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[styles.progressLabel, { color }]}>
                              {pct.toFixed(0)}% del mínimo ({sbItem!.stock_minimo} u.)
                            </Text>
                          </>
                        )}
                        {!hasMinimo && (
                          <Text style={styles.noMinimoLabel}>Sin stock mínimo definido</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  // ─── PANEL: Por Ubicación ─────────────────────────────────────────────────────

  const renderUbicaciones = () => (
    <View style={styles.section}>
      <BlockHeader
        icon="map-marker-outline"
        label="Por Ubicación"
        color={COLOR_UBICACION}
      />

      {porUbicacion.length === 0 ? (
        <View style={styles.emptyRow}>
          <Icon source="map-marker-off-outline" size={28} color="#ccc" />
          <Text style={styles.emptyText}>Sin ubicaciones registradas</Text>
        </View>
      ) : (
        porUbicacion.map((loc, idx) => {
          const key = `ub-${idx}`;
          const expanded = !!expandedUbicacion[key];

          const activosLoc     = loc.articulos?.filter((a) => !a.es_consumible) ?? [];
          const consumiblesLoc = loc.articulos?.filter((a) => a.es_consumible)  ?? [];
          const prestadosLoc   = activosLoc.filter((a) => a.estado === 'prestado').length;

          return (
            <View key={key} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => toggle(key, setExpandedUbicacion)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderLeft}>
                  <Icon source="map-marker-outline" size={17} color={COLOR_UBICACION} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{loc.ubicacion_nombre}</Text>
                    <Text style={styles.cardSubtitle}>
                      {activosLoc.length} activo(s) · {consumiblesLoc.length} tipo(s) insumo
                    </Text>
                  </View>
                </View>
                <View style={styles.cardHeaderRight}>
                  {prestadosLoc > 0 && (
                    <View style={[styles.miniChip, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '700' }}>
                        {prestadosLoc} prest.
                      </Text>
                    </View>
                  )}
                  <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
                </View>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.cardBody}>
                  {/* Activos en ubicación */}
                  {activosLoc.length > 0 && (
                    <>
                      <Text style={[styles.subGroupLabel, { color: COLOR_ACTIVOS }]}>
                        📦 Activos ({activosLoc.length})
                      </Text>
                      {activosLoc.map((art, i) => {
                        const m = ESTADO_META[art.estado] ?? { bg: '#F5F5F5', text: '#616161', label: art.estado };
                        return (
                          <View key={i} style={styles.itemRow}>
                            <View style={[styles.itemDot, { backgroundColor: m.bg, borderColor: m.text }]} />
                            <View style={styles.itemInfo}>
                              <Text style={styles.itemNombre} numberOfLines={1}>{art.nombre}</Text>
                              {art.codigo && <Text style={styles.itemCodigo}>{art.codigo}</Text>}
                            </View>
                            <View style={[styles.itemEstadoBadge, { backgroundColor: m.bg }]}>
                              <Text style={[styles.itemEstadoText, { color: m.text }]}>{m.label}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  )}

                  {/* Consumibles en ubicación */}
                  {consumiblesLoc.length > 0 && (
                    <>
                      <Text style={[styles.subGroupLabel, { color: COLOR_CONSUMIBLE, marginTop: activosLoc.length > 0 ? 12 : 0 }]}>
                        🗂 Insumos ({consumiblesLoc.length})
                      </Text>
                      {consumiblesLoc.map((art, i) => (
                        <View key={i} style={styles.itemRow}>
                          <View style={[styles.itemDot, { backgroundColor: '#E8F5E9', borderColor: COLOR_CONSUMIBLE }]} />
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemNombre} numberOfLines={1}>{art.nombre}</Text>
                          </View>
                          <Text style={[styles.stockCountSmall, art.cantidad < 10 ? { color: '#E53935' } : { color: '#388E3C' }]}>
                            {art.cantidad} {art.unidad_medida ?? 'u.'}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                  {activosLoc.length === 0 && consumiblesLoc.length === 0 && (
                    <Text style={styles.emptyText}>Sin artículos en esta ubicación</Text>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  // ─── Main render ──────────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
        <Text style={styles.loadingText}>Cargando reportes...</Text>
      </View>
    );
  }

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
      {error ? (
        <View style={styles.errorBox}>
          <Icon source="alert-circle-outline" size={32} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {renderActivos()}
          {renderConsumibles()}
          {renderUbicaciones()}
        </>
      )}
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
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
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
  section: {
    marginBottom: 28,
  },
  // ── Block header ──
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 12,
    minHeight: 28,
  },
  blockHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  blockBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  blockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // ── Summary card ──
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  // ── Cards ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  miniChip: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  // ── Estado chips ──
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  estadoChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  estadoChipText: {
    fontSize: 12,
  },
  // ── Item rows (activos) ──
  subGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 8,
  },
  itemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
  },
  itemNombre: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  itemCodigo: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  itemEstadoBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemEstadoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Stock items (consumibles) ──
  stockItemCard: {
    backgroundColor: '#F9FBF9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  stockItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stockItemNombre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  stockItemUnidad: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  stockItemRight: {
    alignItems: 'center',
    marginLeft: 8,
  },
  stockCount: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  stockUnit: {
    fontSize: 10,
    color: '#888',
  },
  stockCountSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  noMinimoLabel: {
    fontSize: 11,
    color: '#bbb',
    fontStyle: 'italic',
  },
  // ── Empty states ──
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 13,
  },
});
