import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_134C, PANTONE_295C } from '../../theme/colors';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  obtenerArticulo,
  eliminarArticulo,
  Articulo,
  MovimientoInventario,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

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

function formatCurrency(value: string | null | undefined): string {
  if (!value) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `$${num.toLocaleString('es-CL')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function SectionTitle({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon && <Icon source={icon} size={16} color={PANTONE_295C} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function MovimientoRow({ mov }: { mov: MovimientoInventario }) {
  const isPositive = mov.cantidad > 0;
  return (
    <View style={styles.movRow}>
      <View style={styles.movLeft}>
        <Text style={styles.movTipo}>{mov.tipo_display ?? mov.tipo}</Text>
        {!!mov.notas && (
          <Text style={styles.movNotas} numberOfLines={2}>
            {mov.notas}
          </Text>
        )}
      </View>
      <View style={styles.movRight}>
        <Text style={[styles.movCantidad, isPositive ? styles.movPositive : styles.movNegative]}>
          {isPositive ? `+${mov.cantidad}` : String(mov.cantidad)}
        </Text>
        <Text style={styles.movFecha}>{formatRelative(mov.created_at)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

export default function ArticuloDetailScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const { id } = route.params as { id: number; nombre?: string };

  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerArticulo(id);
      setArticulo(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar el artículo.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ─── Header menu ──────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!canManage || !articulo) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    const handleDelete = async () => {
      setActionLoading(true);
      try {
        await eliminarArticulo(id);
        navigation.goBack();
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al eliminar.';
        if (typeof d === 'string') msg = d;
        else if (d?.error) msg = d.error;
        else if (d?.detail) msg = d.detail;
        Alert.alert('Error', msg);
      } finally {
        setActionLoading(false);
      }
    };

    const handleMenu = () => {
      Alert.alert('Opciones', '', [
        {
          text: 'Editar',
          onPress: () => navigation.navigate('ArticuloForm', { articulo }),
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Eliminar artículo',
              `¿Eliminar "${articulo.nombre}"? Esta acción no se puede deshacer.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: handleDelete },
              ]
            ),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    };

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMenu}
          style={headerStyles.menuBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="dots-vertical" size={24} color={PANTONE_134C} />
        </TouchableOpacity>
      ),
    });
  }, [canManage, articulo, id, navigation]);

  // ─── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error || !articulo) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={44} color="#CCC" />
        <Text style={styles.errorText}>{error ?? 'Artículo no encontrado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoStyle = ESTADO_COLORS[articulo.estado] ?? { bg: '#F5F5F5', text: '#616161' };
  const tieneIdentificacion = !!(articulo.marca || articulo.modelo || articulo.numero_serie);
  const tieneAdquisicion = !!(
    articulo.valor_adquisicion ||
    articulo.fecha_adquisicion ||
    articulo.proveedor
  );
  const movimientos = articulo.movimientos ?? [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <SectionCard>
        <View style={styles.headerRow}>
          <View style={styles.headerChips}>
            <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
              <Text style={[styles.chipText, { color: estadoStyle.text }]}>
                {articulo.estado_display ?? articulo.estado.replace('_', ' ')}
              </Text>
            </View>
            {articulo.stock_bajo && (
              <View style={[styles.chip, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.chipText, { color: '#E65100' }]}>⚠️ Stock bajo</Text>
              </View>
            )}
          </View>
          {!!articulo.codigo && (
            <View style={styles.codigoContainer}>
              <Icon source="barcode" size={14} color="#888" />
              <Text style={styles.codigoText}>{articulo.codigo}</Text>
            </View>
          )}
        </View>
        <Text style={styles.articuloNombre}>{articulo.nombre}</Text>
        {!!articulo.descripcion && (
          <Text style={styles.articuloDescripcion}>{articulo.descripcion}</Text>
        )}
      </SectionCard>

      {/* Clasificación */}
      <SectionCard>
        <SectionTitle title="Clasificación" icon="tag-outline" />
        {articulo.categoria_data && (
          <>
            <InfoRow label="Categoría" value={articulo.categoria_data.nombre} />
            <InfoRow
              label="Tipo"
              value={articulo.categoria_data.tipo_display ?? articulo.categoria_data.tipo}
            />
          </>
        )}
        <InfoRow label="Ubicación" value={articulo.ubicacion_data?.nombre} />
        <InfoRow label="Unidad de Medida" value={articulo.unidad_medida} />
      </SectionCard>

      {/* Inventario */}
      <SectionCard>
        <SectionTitle title="Inventario" icon="package-variant-closed" />
        <InfoRow label="Cantidad" value={articulo.cantidad} />
        <InfoRow
          label="Stock Mínimo"
          value={articulo.stock_minimo !== null ? articulo.stock_minimo : '—'}
        />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado</Text>
          <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
            <Text style={[styles.chipText, { color: estadoStyle.text }]}>
              {articulo.estado_display ?? articulo.estado}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Identificación */}
      {tieneIdentificacion && (
        <SectionCard>
          <SectionTitle title="Identificación" icon="information-outline" />
          <InfoRow label="Marca" value={articulo.marca} />
          <InfoRow label="Modelo" value={articulo.modelo} />
          <InfoRow label="Número de Serie" value={articulo.numero_serie} />
        </SectionCard>
      )}

      {/* Adquisición */}
      {tieneAdquisicion && (
        <SectionCard>
          <SectionTitle title="Adquisición" icon="receipt" />
          <InfoRow label="Valor" value={formatCurrency(articulo.valor_adquisicion)} />
          <InfoRow label="Fecha" value={formatDate(articulo.fecha_adquisicion)} />
        </SectionCard>
      )}

      {/* Responsable */}
      {articulo.responsable_data && (
        <SectionCard>
          <SectionTitle title="Responsable" icon="account-outline" />
          <View style={styles.responsableRow}>
            <View style={styles.responsableAvatar}>
              <Text style={styles.responsableInitial}>
                {articulo.responsable_data.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.responsableNombre}>
              {articulo.responsable_data.nombre} {articulo.responsable_data.apellidos}
            </Text>
          </View>
        </SectionCard>
      )}

      {/* Notas */}
      {!!articulo.notas && (
        <SectionCard>
          <SectionTitle title="Notas" icon="note-text-outline" />
          <Text style={styles.notasText}>{articulo.notas}</Text>
        </SectionCard>
      )}

      {/* Historial de Movimientos */}
      {movimientos.length > 0 && (
        <SectionCard>
          <SectionTitle title="Historial de Movimientos" icon="history" />
          {movimientos.slice(0, 10).map((mov) => (
            <MovimientoRow key={mov.id} mov={mov} />
          ))}
        </SectionCard>
      )}

      {/* Action buttons */}
      {canManage && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('ArticuloForm', { articulo })}
            activeOpacity={0.8}
          >
            <Icon source="pencil-outline" size={18} color="#FFF" />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            disabled={actionLoading}
            onPress={() =>
              Alert.alert(
                'Eliminar artículo',
                `¿Eliminar "${articulo.nombre}"? Esta acción no se puede deshacer.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                      setActionLoading(true);
                      try {
                        await eliminarArticulo(id);
                        navigation.goBack();
                      } catch (err: any) {
                        const d = err?.response?.data;
                        let msg = 'Error al eliminar.';
                        if (typeof d === 'string') msg = d;
                        else if (d?.error) msg = d.error;
                        else if (d?.detail) msg = d.detail;
                        Alert.alert('Error', msg);
                      } finally {
                        setActionLoading(false);
                      }
                    },
                  },
                ]
              )
            }
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#E53935" />
            ) : (
              <>
                <Icon source="trash-can-outline" size={18} color="#E53935" />
                <Text style={styles.deleteBtnText}>Eliminar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
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
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: PANTONE_295C,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerChips: {
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
  codigoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  codigoText: {
    fontSize: 12,
    color: '#888',
  },
  articuloNombre: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
    lineHeight: 27,
    marginBottom: 6,
  },
  articuloDescripcion: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  responsableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  responsableAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responsableInitial: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  responsableNombre: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  notasText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
  },
  movRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  movLeft: {
    flex: 1,
  },
  movTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  movNotas: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  movRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  movCantidad: {
    fontSize: 15,
    fontWeight: '700',
  },
  movPositive: {
    color: '#2E7D32',
  },
  movNegative: {
    color: '#E53935',
  },
  movFecha: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    paddingVertical: 13,
    gap: 6,
  },
  editBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 13,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#E53935',
  },
  deleteBtnText: {
    color: '#E53935',
    fontWeight: '700',
    fontSize: 15,
  },
  bottomSpacer: {
    height: 24,
  },
});
