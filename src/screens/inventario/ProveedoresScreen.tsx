import React, { useCallback, useEffect, useState } from 'react';
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
  listarProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  Proveedor,
} from '../../api/inventario';

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
};

const INITIAL_FORM: FormState = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
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

export default function ProveedoresScreen() {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [allProveedores, setAllProveedores] = useState<Proveedor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Data loading ───────────────────────────────────────────────────────────

  const loadProveedores = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listarProveedores();
      setAllProveedores(data.results);
      setProveedores(data.results);
    } catch {
      setError('No se pudieron cargar los proveedores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProveedores();
    }, [loadProveedores]),
  );

  // ─── Search filtering ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!search.trim()) {
      setProveedores(allProveedores);
    } else {
      const term = search.toLowerCase();
      setProveedores(
        allProveedores.filter(
          (p) =>
            p.nombre.toLowerCase().includes(term) ||
            p.contacto?.toLowerCase().includes(term) ||
            p.email?.toLowerCase().includes(term),
        ),
      );
    }
  }, [search, allProveedores]);

  // ─── Form handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (prov: Proveedor) => {
    setEditingId(prov.id);
    setForm({
      nombre: prov.nombre,
      contacto: prov.contacto ?? '',
      telefono: prov.telefono ?? '',
      email: prov.email ?? '',
      direccion: prov.direccion ?? '',
      activo: prov.activo,
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
      const payload: Partial<Proveedor> = {
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        direccion: form.direccion.trim(),
        activo: form.activo,
      };
      if (editingId !== null) {
        await actualizarProveedor(editingId, payload);
      } else {
        await crearProveedor(payload);
      }
      handleCancel();
      loadProveedores();
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

  const handleDelete = (prov: Proveedor) => {
    Alert.alert(
      'Eliminar proveedor',
      `¿Eliminar "${prov.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarProveedor(prov.id);
              loadProveedores();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el proveedor.');
            }
          },
        },
      ],
    );
  };

  // ─── Render form ────────────────────────────────────────────────────────────

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {editingId !== null ? 'Editar proveedor' : 'Nuevo proveedor'}
      </Text>

      <FieldLabel label="Nombre" required />
      <TextInput
        style={styles.input}
        value={form.nombre}
        onChangeText={(t) => setForm((f) => ({ ...f, nombre: t }))}
        placeholder="Nombre del proveedor"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Contacto" />
      <TextInput
        style={styles.input}
        value={form.contacto}
        onChangeText={(t) => setForm((f) => ({ ...f, contacto: t }))}
        placeholder="Nombre del contacto"
        placeholderTextColor="#999"
      />

      <FieldLabel label="Teléfono" />
      <TextInput
        style={styles.input}
        value={form.telefono}
        onChangeText={(t) => setForm((f) => ({ ...f, telefono: t }))}
        placeholder="Número de teléfono"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <FieldLabel label="Correo electrónico" />
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
        placeholder="correo@ejemplo.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FieldLabel label="Dirección" />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={form.direccion}
        onChangeText={(t) => setForm((f) => ({ ...f, direccion: t }))}
        placeholder="Dirección del proveedor"
        placeholderTextColor="#999"
        multiline
        numberOfLines={2}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Activo</Text>
        <Switch
          value={form.activo}
          onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))}
          trackColor={{ false: '#ccc', true: PANTONE_295C }}
          thumbColor={form.activo ? PANTONE_134C : '#f4f4f4'}
        />
      </View>

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

  const renderItem = ({ item }: { item: Proveedor }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <View
              style={[
                styles.activoBadge,
                item.activo ? styles.activoBadgeActive : styles.activoBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.activoBadgeText,
                  item.activo ? styles.activoBadgeTextActive : styles.activoBadgeTextInactive,
                ]}
              >
                {item.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          {!!item.contacto && (
            <View style={styles.infoRow}>
              <Icon source="account-outline" size={13} color="#888" />
              <Text style={styles.infoText}>{item.contacto}</Text>
            </View>
          )}
          {!!item.telefono && (
            <View style={styles.infoRow}>
              <Icon source="phone-outline" size={13} color="#888" />
              <Text style={styles.infoText}>{item.telefono}</Text>
            </View>
          )}
          {!!item.email && (
            <View style={styles.infoRow}>
              <Icon source="email-outline" size={13} color="#888" />
              <Text style={styles.infoText}>{item.email}</Text>
            </View>
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
        <TouchableOpacity style={styles.retryButton} onPress={() => loadProveedores()}>
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
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon source="magnify" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar proveedores..."
          placeholderTextColor="#aaa"
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon source="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={proveedores}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProveedores(true)}
            colors={[PANTONE_295C]}
            tintColor={PANTONE_295C}
          />
        }
        ListHeaderComponent={showForm ? renderForm() : null}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Icon source="store-off-outline" size={56} color="#ccc" />
              <Text style={styles.emptyText}>
                {search ? 'Sin resultados para la búsqueda' : 'No hay proveedores registrados'}
              </Text>
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
  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
    paddingVertical: 2,
  },
  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
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
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
  },
  activoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activoBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  activoBadgeInactive: {
    backgroundColor: '#F5F5F5',
  },
  activoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activoBadgeTextActive: {
    color: '#2E7D32',
  },
  activoBadgeTextInactive: {
    color: '#616161',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
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
    minHeight: 64,
    textAlignVertical: 'top',
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
