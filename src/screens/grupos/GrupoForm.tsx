import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { crearGrupo, actualizarGrupo, listarLideresIglesia, listarMiembrosIglesia } from '../../api/grupos';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

const TIPOS = [
  { value: 'celula', label: 'Célula' },
  { value: 'ministerio', label: 'Ministerio' },
  { value: 'clase', label: 'Clase' },
  { value: 'comision', label: 'Comisión' },
  { value: 'especial', label: 'Especial' },
];

// Lo que hace un ministerio por la iglesia: SUMA permisos a su gente sin tocar sus roles (igual que la web;
// la regla la resuelve el backend: iglesia/services/permisos_funcion.py).
export const FUNCIONES = [
  { value: '', label: 'Ninguna', ayuda: 'Un ministerio común' },
  { value: 'bienvenida', label: 'Bienvenida', ayuda: 'Registra visitas y les hace el seguimiento' },
  { value: 'intercesion', label: 'Intercesión', ayuda: 'Anota y lleva las peticiones de oración' },
  { value: 'asistencia', label: 'Asistencia', ayuda: 'Marca quién vino y ve a quienes no han venido' },
];

const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'suspendido', label: 'Suspendido' },
];

export default function GrupoFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { grupo } = route.params ?? {}; // grupo present → edit mode

  const isEdit = !!grupo;

  const [nombre, setNombre] = useState(grupo?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(grupo?.descripcion ?? '');
  const [tipo, setTipo] = useState(grupo?.tipo ?? 'celula');
  const [funcion, setFuncion] = useState<string>(grupo?.funcion ?? '');
  // Darle una función a un ministerio es darle permisos a su gente: lo decide el pastor o la administración.
  const puedeConfigurarFuncion = usePermissionsStore((s) => s.can('ministerios.configurar_funcion'));
  const esMinisterio = tipo === 'ministerio';
  const [estado, setEstado] = useState(grupo?.estado ?? 'activo');
  const [liderId, setLiderId] = useState<number | null>(grupo?.lider_id ?? null);
  const [liderNombre, setLiderNombre] = useState(grupo?.lider_nombre ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leader search modal
  const [liderModalVisible, setLiderModalVisible] = useState(false);
  const [liderSearch, setLiderSearch] = useState('');
  const [lideres, setLideres] = useState<any[]>([]);
  const [loadingLideres, setLoadingLideres] = useState(false);

  const loadLideres = useCallback(async (query?: string) => {
    setLoadingLideres(true);
    try {
      // Un ministerio lo puede liderar cualquier hermano; una célula, quien tiene el rol «Líder» (igual que la web).
      const result = esMinisterio ? await listarMiembrosIglesia(query) : await listarLideresIglesia(query);
      setLideres(result?.results ?? result ?? []);
    } catch {
      setLideres([]);
    } finally {
      setLoadingLideres(false);
    }
  }, [esMinisterio]);

  const openLiderModal = () => {
    setLiderSearch('');
    setLiderModalVisible(true);
    loadLideres();
  };

  const handleLiderSearch = (text: string) => {
    setLiderSearch(text);
    loadLideres(text);
  };

  const selectLider = (m: any) => {
    setLiderId(m.id);
    setLiderNombre(m.nombre_completo ?? `${m.nombre} ${m.apellidos}`.trim());
    setLiderModalVisible(false);
  };

  const handleSave = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!liderId) {
      setError('Debe seleccionar un líder.');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      tipo,
      lider_id: liderId,
      estado,
      // Sin permiso no se manda: el backend lo rechazaría aunque no haya cambiado.
      ...(puedeConfigurarFuncion ? { funcion: esMinisterio ? funcion : '' } : {}),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await actualizarGrupo(grupo.id, payload);
      } else {
        await crearGrupo(payload);
      }
      // Go back and signal refresh
      navigation.goBack();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.error ?? data?.detail ?? data?.nombre?.[0] ?? data?.lider_id?.[0] ?? data?.funcion?.[0] ??
        'Error al guardar el grupo.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Icon source="alert-circle-outline" size={18} color="#B71C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Nombre */}
        <Text style={styles.label}>Nombre del Grupo *</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Célula Central"
          placeholderTextColor="#AAA"
          editable={!saving}
          autoFocus
        />

        {/* Descripción */}
        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe el propósito y enfoque del grupo..."
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!saving}
        />

        {/* Tipo */}
        <Text style={styles.label}>Tipo de Grupo</Text>
        <View style={styles.chipGroup}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, tipo === t.value && styles.chipSelected]}
              onPress={() => setTipo(t.value)}
              disabled={saving}
            >
              <Text style={[styles.chipText, tipo === t.value && styles.chipTextSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Función del ministerio */}
        {esMinisterio ? (
          <>
            <Text style={styles.label}>Función del ministerio</Text>
            <View style={styles.chipGroup}>
              {FUNCIONES.map((f) => (
                <TouchableOpacity
                  key={f.value || 'ninguna'}
                  style={[styles.chip, funcion === f.value && styles.chipSelected, !puedeConfigurarFuncion && styles.chipDisabled]}
                  onPress={() => setFuncion(f.value)}
                  disabled={saving || !puedeConfigurarFuncion}
                  testID={`funcion-${f.value || 'ninguna'}`}
                >
                  <Text style={[styles.chipText, funcion === f.value && styles.chipTextSelected]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {puedeConfigurarFuncion
                ? `${FUNCIONES.find((f) => f.value === funcion)?.ayuda}. Quienes están en el ministerio reciben los permisos de esa función; el líder y los co-líderes, todos.`
                : 'La función la define el pastor o la administración de la iglesia.'}
            </Text>
          </>
        ) : null}

        {/* Líder */}
        <Text style={styles.label}>Líder del Grupo *</Text>
        <TouchableOpacity
          style={[styles.input, styles.pickerBtn]}
          onPress={openLiderModal}
          disabled={saving}
        >
          {liderId ? (
            <Text style={styles.pickerBtnText}>{liderNombre}</Text>
          ) : (
            <Text style={styles.pickerPlaceholder}>Seleccionar líder...</Text>
          )}
          <Icon source="magnify" size={18} color="#888" />
        </TouchableOpacity>
        <Text style={styles.helperText}>
          {esMinisterio
            ? 'Cualquier hermano activo puede liderar un ministerio.'
            : 'El líder de una célula tiene el rol «Líder». Sus co-líderes pueden ser cualquier hermano con cuenta.'}
        </Text>

        {/* Estado */}
        <Text style={styles.label}>Estado</Text>
        <View style={styles.chipGroup}>
          {ESTADOS.map((e) => (
            <TouchableOpacity
              key={e.value}
              style={[styles.chip, estado === e.value && styles.chipSelected]}
              onPress={() => setEstado(e.value)}
              disabled={saving}
            >
              <Text style={[styles.chipText, estado === e.value && styles.chipTextSelected]}>
                {e.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear grupo'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Leader search modal */}
      <Modal
        visible={liderModalVisible}
        animationType="slide"
        onRequestClose={() => setLiderModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar líder</Text>
            <TouchableOpacity onPress={() => setLiderModalVisible(false)}>
              <Icon source="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchBar}>
            <Icon source="magnify" size={18} color="#888" />
            <TextInput
              style={styles.modalSearchInput}
              value={liderSearch}
              onChangeText={handleLiderSearch}
              placeholder="Buscar por nombre..."
              placeholderTextColor="#AAA"
              autoFocus
            />
            {loadingLideres && <ActivityIndicator size="small" color={PANTONE_295C} />}
          </View>
          <FlatList
            data={lideres}
            keyExtractor={(item, i) => String(item.id ?? i)}
            contentContainerStyle={lideres.length === 0 ? styles.emptyContainer : { padding: 12 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Icon source="account-search-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>
                  {loadingLideres ? 'Cargando...' : 'No se encontraron líderes'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.liderRow} onPress={() => selectLider(item)}>
                <Icon source="account-circle" size={36} color={PANTONE_295C} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.liderName}>
                    {item.nombre_completo ?? `${item.nombre} ${item.apellidos}`.trim()}
                  </Text>
                  {item.email ? (
                    <Text style={styles.liderEmail}>{item.email}</Text>
                  ) : null}
                </View>
                <Icon source="chevron-right" size={20} color="#BBB" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20, paddingBottom: 40 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: '#B71C1C', fontSize: 13, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
  },
  textarea: { height: 90, paddingTop: 12 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBtnText: { fontSize: 15, color: '#222', flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: '#AAA', flex: 1 },
  helperText: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipSelected: { borderColor: PANTONE_295C, backgroundColor: '#EAF2FF' },
  chipDisabled: { opacity: 0.5 },
  chipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  chipTextSelected: { color: PANTONE_295C, fontWeight: '700' },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F5F7FA' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 2 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 14 },
  liderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  liderName: { fontSize: 15, fontWeight: '600', color: '#222' },
  liderEmail: { fontSize: 12, color: '#888', marginTop: 2 },
});
