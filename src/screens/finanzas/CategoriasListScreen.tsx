import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarCategorias,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  CategoriaTransaccion,
  TIPOS_TRANSACCION,
} from '../../api/finanzas';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

export default function CategoriasListScreen() {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const canManage = isSuperAdmin || hasPermission('finanzas', 'crear') || hasPermission('finanzas', 'editar');

  const [categorias, setCategorias] = useState<CategoriaTransaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formTipo, setFormTipo] = useState<'ingreso' | 'egreso' | ''>('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCategorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarCategorias();
      setCategorias(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar categorías.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      else if (d && typeof d === 'object') {
        const firstKey = Object.keys(d)[0];
        const firstVal = d[firstKey];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategorias();
  }, [loadCategorias]);

  const openCreate = () => {
    setEditingId(null);
    setFormNombre('');
    setFormTipo('');
    setFormDescripcion('');
    setFormError(null);
    setShowNewForm(true);
  };

  const openEdit = (cat: CategoriaTransaccion) => {
    setShowNewForm(false);
    setEditingId(cat.id);
    setFormNombre(cat.nombre);
    setFormTipo(cat.tipo);
    setFormDescripcion(cat.descripcion ?? '');
    setFormError(null);
  };

  const handleCancel = () => {
    setShowNewForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formNombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!formTipo) { setFormError('El tipo es obligatorio.'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: formNombre.trim(),
        tipo: formTipo as 'ingreso' | 'egreso',
        descripcion: formDescripcion.trim() || undefined,
      };
      if (editingId !== null) {
        await editarCategoria(editingId, payload);
      } else {
        await crearCategoria(payload);
      }
      setShowNewForm(false);
      setEditingId(null);
      await loadCategorias();
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al guardar.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      else if (d && typeof d === 'object') {
        const firstKey = Object.keys(d)[0];
        const firstVal = d[firstKey];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = (cat: CategoriaTransaccion) => {
    const action = cat.activo ? 'desactivar' : 'activar';
    Alert.alert(
      cat.activo ? 'Desactivar categoría' : 'Activar categoría',
      `¿Deseas ${action} la categoría "${cat.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: cat.activo ? 'Desactivar' : 'Activar',
          style: cat.activo ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await editarCategoria(cat.id, { activo: !cat.activo });
              await loadCategorias();
            } catch {
              Alert.alert('Error', 'No se pudo cambiar el estado de la categoría.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = (cat: CategoriaTransaccion) => {
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
              await loadCategorias();
            } catch (err: any) {
              const msg = err?.response?.data?.detail ?? err?.response?.data?.error ?? 'No se pudo eliminar la categoría.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };


  const ingresos = categorias.filter((c) => c.tipo === 'ingreso');
  const egresos = categorias.filter((c) => c.tipo === 'egreso');

  const tipoLabel = TIPOS_TRANSACCION.find((t) => t.value === formTipo)?.label;

  function FormCard() {
    return (
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          {editingId !== null ? 'Editar categoría' : 'Nueva categoría'}
        </Text>

        <FieldLabel label="Nombre" required />
        <TextInput
          style={styles.textInput}
          placeholder="Nombre de la categoría"
          placeholderTextColor="#AAA"
          value={formNombre}
          onChangeText={setFormNombre}
        />

        <FieldLabel label="Tipo" required />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowTipoDropdown((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectBtnText, !formTipo && { color: '#AAA' }]}>
            {tipoLabel ?? 'Seleccionar tipo...'}
          </Text>
          <Icon source={showTipoDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
        </TouchableOpacity>
        {showTipoDropdown && (
          <View style={styles.inlineDropdown}>
            {TIPOS_TRANSACCION.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.selectOption, formTipo === item.value && styles.selectOptionActive]}
                onPress={() => { setFormTipo(item.value as 'ingreso' | 'egreso'); setShowTipoDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectOptionText, formTipo === item.value && styles.selectOptionTextActive]}>
                  {item.label}
                </Text>
                {formTipo === item.value && <Icon source="check" size={18} color={PANTONE_295C} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FieldLabel label="Descripción" />
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Descripción (opcional)"
          placeholderTextColor="#AAA"
          value={formDescripcion}
          onChangeText={setFormDescripcion}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.formBtns}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.75} disabled={saving}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PANTONE_295C} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadCategorias} activeOpacity={0.75}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Nueva categoría: form al tope */}
            {showNewForm && <FormCard />}

            {/* Ingresos */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.sectionTitle}>Ingresos</Text>
            </View>
            <View style={styles.sectionCard}>
              {ingresos.length === 0 ? (
                <Text style={styles.emptySection}>Sin categorías de ingreso.</Text>
              ) : (
                ingresos.map((cat, idx) => (
                  <React.Fragment key={cat.id}>
                    <View style={[styles.categoriaItem, !cat.activo && styles.categoriaItemInactive, idx === ingresos.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.dot, { backgroundColor: '#4CAF50', opacity: cat.activo ? 1 : 0.4 }]} />
                      <Text style={[styles.categoriaNombre, !cat.activo && styles.categoriaInactiveText]}>
                        {cat.nombre}
                      </Text>
                      {!cat.activo && <Text style={styles.inactiveBadge}>Inactiva</Text>}
                      {canManage && (
                        <View style={styles.actionIcons}>
                          <TouchableOpacity onPress={() => openEdit(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source="pencil-outline" size={17} color="#1976D2" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleToggleActivo(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source={cat.activo ? 'toggle-switch' : 'toggle-switch-off-outline'} size={19} color={cat.activo ? '#FF9800' : '#4CAF50'} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source="trash-can-outline" size={17} color="#E53935" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {editingId === cat.id && <FormCard />}
                  </React.Fragment>
                ))
              )}
            </View>

            {/* Egresos */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#E53935' }]} />
              <Text style={styles.sectionTitle}>Egresos</Text>
            </View>
            <View style={styles.sectionCard}>
              {egresos.length === 0 ? (
                <Text style={styles.emptySection}>Sin categorías de egreso.</Text>
              ) : (
                egresos.map((cat, idx) => (
                  <React.Fragment key={cat.id}>
                    <View style={[styles.categoriaItem, !cat.activo && styles.categoriaItemInactive, idx === egresos.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.dot, { backgroundColor: '#E53935', opacity: cat.activo ? 1 : 0.4 }]} />
                      <Text style={[styles.categoriaNombre, !cat.activo && styles.categoriaInactiveText]}>
                        {cat.nombre}
                      </Text>
                      {!cat.activo && <Text style={styles.inactiveBadge}>Inactiva</Text>}
                      {canManage && (
                        <View style={styles.actionIcons}>
                          <TouchableOpacity onPress={() => openEdit(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source="pencil-outline" size={17} color="#1976D2" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleToggleActivo(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source={cat.activo ? 'toggle-switch' : 'toggle-switch-off-outline'} size={19} color={cat.activo ? '#FF9800' : '#4CAF50'} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(cat)} style={styles.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Icon source="trash-can-outline" size={17} color="#E53935" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {editingId === cat.id && <FormCard />}
                  </React.Fragment>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {canManage && editingId === null && !showNewForm && (
          <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
            <Icon source="plus" size={28} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
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
    marginBottom: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emptySection: {
    color: '#999',
    fontSize: 13,
    padding: 14,
    textAlign: 'center',
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  categoriaItemInactive: {
    backgroundColor: '#FAFAFA',
  },
  categoriaInactiveText: {
    color: '#AAA',
  },
  inactiveBadge: {
    fontSize: 11,
    color: '#9E9E9E',
    backgroundColor: '#EEEEEE',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
    overflow: 'hidden',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  categoriaNombre: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
  },
  textInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  selectBtn: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBtnText: {
    fontSize: 15,
    color: '#222',
    flex: 1,
  },
  inlineDropdown: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginTop: 2,
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectOptionActive: {
    backgroundColor: '#EAF2FF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectOptionTextActive: {
    color: PANTONE_295C,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 13,
  },
  formBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
