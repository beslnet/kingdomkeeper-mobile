import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  CategoriaInventario,
  TipoCategoria,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_OPTIONS: TipoCategoria[] = [
  'equipo',
  'mobiliario',
  'insumo',
  'herramienta',
  'vehiculo',
  'otro',
];

const TIPO_LABELS: Record<TipoCategoria, string> = {
  equipo: 'Equipo',
  mobiliario: 'Mobiliario',
  insumo: 'Insumo',
  herramienta: 'Herramienta',
  vehiculo: 'Vehículo',
  otro: 'Otro',
};

const TIPO_COLORS: Record<TipoCategoria, { bg: string; text: string }> = {
  equipo: { bg: '#E3F2FD', text: '#1565C0' },
  mobiliario: { bg: '#F3E5F5', text: '#7B1FA2' },
  insumo: { bg: '#E8F5E9', text: '#2E7D32' },
  herramienta: { bg: '#FFF3E0', text: '#E65100' },
  vehiculo: { bg: '#FFF9C4', text: '#F57F17' },
  otro: { bg: '#F5F5F5', text: '#616161' },
};

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  nombre: string;
  descripcion: string;
  tipo: TipoCategoria;
  es_consumible: boolean;
  stock_minimo: string;
};

const INITIAL_FORM: FormState = {
  nombre: '',
  descripcion: '',
  tipo: 'equipo',
  es_consumible: false,
  stock_minimo: '',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoriasScreen() {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (showForm) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
    }
  }, [showForm]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadCategorias = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listarCategorias();
      setCategorias(data.results);
    } catch {
      setError('No se pudieron cargar las categorías.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategorias();
    }, [loadCategorias]),
  );

  // ─── Form handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (cat: CategoriaInventario) => {
    setEditingId(cat.id);
    setForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? '',
      tipo: cat.tipo,
      es_consumible: cat.es_consumible,
      stock_minimo: cat.stock_minimo !== null ? String(cat.stock_minimo) : '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormError('El nombre es requerido.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Partial<CategoriaInventario> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        tipo: form.tipo,
        es_consumible: form.es_consumible,
        stock_minimo:
          form.es_consumible && form.stock_minimo.trim() !== ''
            ? Number(form.stock_minimo)
            : null,
      };
      if (editingId !== null) {
        await actualizarCategoria(editingId, payload);
      } else {
        await crearCategoria(payload);
      }
      handleCancel();
      loadCategorias();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail =
        (e?.response?.data?.detail as string) ||
        (e?.response?.data?.nombre as string[])?.[0] ||
        'Error al guardar.';
      setFormError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: CategoriaInventario) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${cat.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarCategoria(cat.id);
              loadCategorias();
            } catch {
              Alert.alert('Error', 'No se puede eliminar: tiene artículos asociados.');
            }
          },
        },
      ],
    );
  };

  const selectTipo = () => {
    Alert.alert(
      'Tipo de categoría',
      'Selecciona el tipo:',
      [
        ...TIPO_OPTIONS.map((t) => ({
          text: TIPO_LABELS[t],
          onPress: () => setForm((f) => ({ ...f, tipo: t })),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  // ─── Render form ────────────────────────────────────────────────────────────

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {editingId !== null ? 'Editar categoría' : 'Nueva categoría'}
      </Text>

      <FieldLabel label="Nombre" required />
      <TextInput
        style={styles.input}
        value={form.nombre}
        onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
        placeholder="Nombre de la categoría"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Descripción" />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={form.descripcion}
        onChangeText={(t) => setForm((f) => ({ ...f, descripcion: t }))}
        placeholder="Descripción opcional"
        placeholderTextColor="#999"
        multiline
        numberOfLines={2}
      />

      <FieldLabel label="Tipo" />
      <TouchableOpacity style={styles.selectButton} onPress={selectTipo}>
        <View
          style={[
            styles.tipoBadge,
            { backgroundColor: TIPO_COLORS[form.tipo].bg },
          ]}
        >
          <Text style={[styles.tipoBadgeText, { color: TIPO_COLORS[form.tipo].text }]}>
            {TIPO_LABELS[form.tipo]}
          </Text>
        </View>
        <Icon source="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Es consumible</Text>
        <Switch
          value={form.es_consumible}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, es_consumible: v, stock_minimo: v ? f.stock_minimo : '' }))
          }
          trackColor={{ false: '#ccc', true: PANTONE_295C }}
          thumbColor={form.es_consumible ? PANTONE_134C : '#f4f4f4'}
        />
      </View>

      {form.es_consumible && (
        <>
          <FieldLabel label="Stock mínimo" />
          <TextInput
            style={styles.input}
            value={form.stock_minimo}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, stock_minimo: t.replace(/[^0-9]/g, '') }))
            }
            placeholder="Ej: 10"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </>
      )}

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <View style={styles.formButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Render item ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: CategoriaInventario }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.nombre}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.tipoBadge, { backgroundColor: TIPO_COLORS[item.tipo].bg }]}>
              <Text style={[styles.tipoBadgeText, { color: TIPO_COLORS[item.tipo].text }]}>
                {TIPO_LABELS[item.tipo]}
              </Text>
            </View>
            {item.es_consumible && (
              <View style={styles.consumibleBadge}>
                <Text style={styles.consumibleBadgeText}>Consumible</Text>
              </View>
            )}
          </View>
          {item.articulos_count !== undefined && (
            <Text style={styles.cardMeta}>{item.articulos_count} artículos</Text>
          )}
        </View>
        {canManage && (
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
              <Icon source="pencil-outline" size={20} color={PANTONE_295C} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
              <Icon source="trash-can-outline" size={20} color="#E53935" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {!!item.descripcion && <Text style={styles.cardDesc}>{item.descripcion}</Text>}
    </View>
  );

  // ─── Loading / Error states ─────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error && !loading) {
    return (
      <View style={styles.centered}>
        <Icon source="alert-circle-outline" size={48} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadCategorias()}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={categorias}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCategorias(true)}
            colors={[PANTONE_295C]}
            tintColor={PANTONE_295C}
          />
        }
        ListHeaderComponent={showForm ? renderForm() : null}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Icon source="folder-open-outline" size={56} color="#ccc" />
              <Text style={styles.emptyText}>No hay categorías registradas</Text>
            </View>
          ) : null
        }
      />
      {canManage && !showForm && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Icon source="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
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
    padding: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tipoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tipoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  consumibleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  consumibleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  // ── Form ──
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PANTONE_295C,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  formError: {
    color: '#E53935',
    fontSize: 13,
    marginTop: 10,
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    backgroundColor: PANTONE_295C,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  // ── States ──
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PANTONE_295C,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
  },
});
