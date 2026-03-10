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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
  Ubicacion,
} from '../../api/inventario';

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  nombre: string;
  descripcion: string;
  ubicacion_padre: number | null;
  ubicacion_padre_nombre: string | null;
};

const INITIAL_FORM: FormState = {
  nombre: '',
  descripcion: '',
  ubicacion_padre: null,
  ubicacion_padre_nombre: null,
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

export default function UbicacionesScreen() {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Scroll to top when form opens so user always sees it
  useEffect(() => {
    if (showForm) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
    }
  }, [showForm]);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadUbicaciones = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listarUbicaciones();
      setUbicaciones(data.results);
    } catch {
      setError('No se pudieron cargar las ubicaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUbicaciones();
    }, [loadUbicaciones]),
  );

  // ─── Form handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (loc: Ubicacion) => {
    setEditingId(loc.id);
    setForm({
      nombre: loc.nombre,
      descripcion: loc.descripcion ?? '',
      ubicacion_padre: loc.ubicacion_padre,
      ubicacion_padre_nombre: loc.ubicacion_padre_nombre,
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
      const payload: Partial<Ubicacion> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        ubicacion_padre: form.ubicacion_padre,
      };
      if (editingId !== null) {
        await actualizarUbicacion(editingId, payload);
      } else {
        await crearUbicacion(payload);
      }
      handleCancel();
      loadUbicaciones();
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

  const handleDelete = (loc: Ubicacion) => {
    Alert.alert(
      'Eliminar ubicación',
      `¿Eliminar "${loc.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarUbicacion(loc.id);
              loadUbicaciones();
            } catch {
              Alert.alert('Error', 'No se puede eliminar: tiene artículos asociados.');
            }
          },
        },
      ],
    );
  };

  const selectPadre = () => {
    const candidates = ubicaciones.filter((u) => u.id !== editingId);
    if (candidates.length === 0) {
      Alert.alert('Sin opciones', 'No hay otras ubicaciones disponibles como padre.');
      return;
    }
    Alert.alert(
      'Ubicación padre',
      'Selecciona la ubicación padre:',
      [
        {
          text: 'Sin ubicación padre',
          onPress: () => setForm((f) => ({ ...f, ubicacion_padre: null, ubicacion_padre_nombre: null })),
        },
        ...candidates.map((u) => ({
          text: u.nombre,
          onPress: () =>
            setForm((f) => ({ ...f, ubicacion_padre: u.id, ubicacion_padre_nombre: u.nombre })),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  // ─── Render form ────────────────────────────────────────────────────────────

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {editingId !== null ? 'Editar ubicación' : 'Nueva ubicación'}
      </Text>

      <FieldLabel label="Nombre" required />
      <TextInput
        style={styles.input}
        value={form.nombre}
        onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
        placeholder="Nombre de la ubicación"
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

      <FieldLabel label="Ubicación padre" />
      <TouchableOpacity style={styles.selectButton} onPress={selectPadre}>
        <View style={styles.selectButtonContent}>
          {form.ubicacion_padre_nombre ? (
            <>
              <Icon source="map-marker" size={16} color={PANTONE_295C} />
              <Text style={[styles.selectButtonText, { color: PANTONE_295C }]}>
                {form.ubicacion_padre_nombre}
              </Text>
            </>
          ) : (
            <Text style={styles.selectButtonPlaceholder}>Sin ubicación padre</Text>
          )}
        </View>
        <Icon source="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

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

  const renderItem = ({ item }: { item: Ubicacion }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.nombre}</Text>
          {!!item.ubicacion_padre_nombre && (
            <Text style={styles.cardParent}>📍 {item.ubicacion_padre_nombre}</Text>
          )}
          {item.responsable_data && (
            <Text style={styles.cardMeta}>
              👤 {item.responsable_data.nombre} {item.responsable_data.apellidos}
            </Text>
          )}
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
        <TouchableOpacity style={styles.retryButton} onPress={() => loadUbicaciones()}>
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
        data={ubicaciones}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUbicaciones(true)}
            colors={[PANTONE_295C]}
            tintColor={PANTONE_295C}
          />
        }
        ListHeaderComponent={showForm ? renderForm() : null}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Icon source="map-marker-off-outline" size={56} color="#ccc" />
              <Text style={styles.emptyText}>No hay ubicaciones registradas</Text>
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
  cardParent: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
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
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
  },
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
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectButtonPlaceholder: {
    fontSize: 15,
    color: '#999',
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
