import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import {
  getMisRelaciones,
  addRelacion,
  deleteRelacion,
  getMiembrosIglesia,
} from '../api/relaciones';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

const NUCLEAR_TYPES = ['esposo', 'esposa', 'padre', 'madre', 'hijo', 'hija'];

function getTipoFamilia(tipoRelacion: string): 'nuclear' | 'extendida' {
  return NUCLEAR_TYPES.includes(tipoRelacion) ? 'nuclear' : 'extendida';
}

const TIPO_RELACION_OPTIONS = [
  { value: 'esposo', label: 'Esposo' },
  { value: 'esposa', label: 'Esposa' },
  { value: 'padre', label: 'Padre' },
  { value: 'madre', label: 'Madre' },
  { value: 'hijo', label: 'Hijo' },
  { value: 'hija', label: 'Hija' },
  { value: 'hermano', label: 'Hermano' },
  { value: 'hermana', label: 'Hermana' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'nieto', label: 'Nieto' },
  { value: 'nieta', label: 'Nieta' },
  { value: 'tio', label: 'Tío' },
  { value: 'tia', label: 'Tía' },
  { value: 'sobrino', label: 'Sobrino' },
  { value: 'sobrina', label: 'Sobrina' },
  { value: 'primo', label: 'Primo' },
  { value: 'prima', label: 'Prima' },
  { value: 'suegro', label: 'Suegro' },
  { value: 'suegra', label: 'Suegra' },
  { value: 'yerno', label: 'Yerno' },
  { value: 'nuera', label: 'Nuera' },
  { value: 'cunado', label: 'Cuñado' },
  { value: 'cunada', label: 'Cuñada' },
  { value: 'otro', label: 'Otro' },
];

const TIPOS_MASCULINO = ['esposo', 'padre', 'hijo', 'hermano', 'abuelo', 'nieto', 'tio', 'sobrino', 'primo', 'suegro', 'yerno', 'cunado'];
const TIPOS_FEMENINO = ['esposa', 'madre', 'hija', 'hermana', 'abuela', 'nieta', 'tia', 'sobrina', 'prima', 'suegra', 'nuera', 'cunada'];

function filtrarRelacionesPorGenero(genero: string | null): typeof TIPO_RELACION_OPTIONS {
  if (!genero) return TIPO_RELACION_OPTIONS;
  if (genero === 'M') {
    return TIPO_RELACION_OPTIONS.filter(opt => TIPOS_MASCULINO.includes(opt.value) || opt.value === 'otro');
  }
  if (genero === 'F') {
    return TIPO_RELACION_OPTIONS.filter(opt => TIPOS_FEMENINO.includes(opt.value) || opt.value === 'otro');
  }
  return TIPO_RELACION_OPTIONS;
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');
}

function RelacionItem({
  relacion,
  onDelete,
}: {
  relacion: any;
  onDelete: (id: number, nombre: string) => void;
}) {
  return (
    <View style={styles.relacionItem}>
      <View style={styles.avatarCircle}>
        {relacion.miembro_relacionado_foto_url ? (
          <Image
            source={{ uri: relacion.miembro_relacionado_foto_url }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarInitials}>
            {getInitials(relacion.miembro_relacionado_nombre)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.relacionNombre}>{relacion.miembro_relacionado_nombre}</Text>
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{relacion.tipo_relacion_display}</Text>
          </View>
          {relacion.es_contacto_emergencia && (
            <View style={[styles.chip, styles.chipEmergency]}>
              <Text style={[styles.chipText, styles.chipTextEmergency]}>Contacto emergencia</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(relacion.id, relacion.miembro_relacionado_nombre)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon source="trash-can-outline" size={22} color="#E53935" />
      </TouchableOpacity>
    </View>
  );
}

export default function FamilyRelationshipsScreen() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [miembros, setMiembros] = useState<any[]>([]);
  const [miembrosLoading, setMiembrosLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMiembro, setSelectedMiembro] = useState<any>(null);
  const [tipoRelacion, setTipoRelacion] = useState('');
  const [esContactoEmergencia, setEsContactoEmergencia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRelaciones = useCallback(async () => {
    try {
      const res = await getMisRelaciones();
      const nuclear = res.relaciones_nucleares ?? [];
      const extendida = res.relaciones_extendidas ?? [];
      const newSections = [];
      if (nuclear.length > 0) newSections.push({ title: 'Familia Nuclear', data: nuclear });
      if (extendida.length > 0) newSections.push({ title: 'Familia Extendida', data: extendida });
      setSections(newSections);
    } catch {
      setSections([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRelaciones().finally(() => setLoading(false));
  }, [loadRelaciones]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRelaciones();
    setRefreshing(false);
  }, [loadRelaciones]);

  const handleDelete = useCallback(
    (id: number, nombre: string) => {
      Alert.alert(
        'Eliminar relación',
        `¿Eliminar relación con ${nombre}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRelacion(id);
                await loadRelaciones();
              } catch {
                Alert.alert('Error', 'No se pudo eliminar la relación.');
              }
            },
          },
        ]
      );
    },
    [loadRelaciones]
  );

  const openModal = useCallback(async () => {
    setSelectedMiembro(null);
    setTipoRelacion('');
    setEsContactoEmergencia(false);
    setSearchQuery('');
    setFormError(null);
    setShowModal(true);
    setMiembrosLoading(true);
    try {
      const res = await getMiembrosIglesia();
      setMiembros(res);
    } catch {
      setMiembros([]);
    } finally {
      setMiembrosLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedMiembro) { setFormError('Selecciona un familiar.'); return; }
    if (!tipoRelacion) { setFormError('Selecciona el tipo de relación.'); return; }
    setFormError(null);
    setSaving(true);
    try {
      await addRelacion({
        miembro_relacionado: selectedMiembro.id,
        tipo_relacion: tipoRelacion,
        tipo_familia: getTipoFamilia(tipoRelacion),
        es_contacto_emergencia: esContactoEmergencia,
      });
      setShowModal(false);
      await loadRelaciones();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join('\n');
        setFormError(msgs || 'Error al guardar.');
      } else {
        setFormError('No se pudo guardar la relación.');
      }
    } finally {
      setSaving(false);
    }
  }, [selectedMiembro, tipoRelacion, esContactoEmergencia, loadRelaciones]);

  const filteredMiembros = miembros.filter((m) => {
    const fullName = `${m.nombre ?? ''} ${m.apellidos ?? ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const filteredTipoOptions = filtrarRelacionesPorGenero(selectedMiembro?.genero ?? null);

  const totalRelaciones = sections.reduce((acc, s) => acc + s.data.length, 0);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => String(item.id ?? index)}
        style={styles.list}
        contentContainerStyle={totalRelaciones === 0 ? styles.emptyContainer : { paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <RelacionItem relacion={item} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="account-group-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No tienes relaciones familiares registradas</Text>
            <TouchableOpacity style={styles.addButton} onPress={openModal}>
              <Text style={styles.addButtonText}>Agregar familiar</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      {totalRelaciones > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
          <Icon source="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Relation Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar familiar</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close" size={24} color="#555" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            {/* Member search */}
            <Text style={styles.fieldLabel}>Seleccionar familiar</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nombre..."
              placeholderTextColor="#AAA"
            />
            {miembrosLoading ? (
              <ActivityIndicator size="small" color={PANTONE_295C} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.memberList}>
                {filteredMiembros.slice(0, 20).map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberItem,
                      selectedMiembro?.id === m.id && styles.memberItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMiembro(m);
                      const newFilteredOptions = filtrarRelacionesPorGenero(m.genero ?? null);
                      if (tipoRelacion && !newFilteredOptions.some(opt => opt.value === tipoRelacion)) {
                        setTipoRelacion('');
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.memberAvatar}>
                      {m.foto_perfil_url ? (
                        <Image source={{ uri: m.foto_perfil_url }} style={styles.memberAvatarImg} />
                      ) : (
                        <Text style={styles.memberAvatarInitials}>
                          {getInitials(`${m.nombre ?? ''} ${m.apellidos ?? ''}`)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.memberName, selectedMiembro?.id === m.id && { color: '#fff' }]}>
                      {m.nombre} {m.apellidos}
                    </Text>
                    {selectedMiembro?.id === m.id && (
                      <Icon source="check" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredMiembros.length === 0 && (
                  <Text style={styles.emptyText}>No se encontraron miembros.</Text>
                )}
                {filteredMiembros.length > 20 && (
                  <Text style={styles.moreResultsHint}>
                    Mostrando 20 de {filteredMiembros.length} resultados. Escribe más para filtrar.
                  </Text>
                )}
              </View>
            )}

            {/* Tipo de relación */}
            <View style={styles.sectionDivider} />
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Tipo de relación</Text>
            {!selectedMiembro && (
              <Text style={styles.hintText}>Selecciona un miembro para ver las opciones de relación disponibles.</Text>
            )}
            <View style={styles.tipoGrid}>
              {filteredTipoOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.tipoOption,
                    tipoRelacion === opt.value && styles.tipoOptionSelected,
                  ]}
                  onPress={() => setTipoRelacion(opt.value)}
                >
                  <Text
                    style={[
                      styles.tipoOptionText,
                      tipoRelacion === opt.value && styles.tipoOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Emergency contact toggle */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Contacto de emergencia</Text>
              <Switch
                value={esContactoEmergencia}
                onValueChange={setEsContactoEmergencia}
                trackColor={{ false: '#CCC', true: PANTONE_295C }}
                thumbColor={esContactoEmergencia ? PANTONE_134C : '#fff'}
              />
            </View>

            {formError && <Text style={styles.formError}>{formError}</Text>}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={PANTONE_134C} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: '#AAA', marginTop: 12, fontSize: 14, textAlign: 'center' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: '#F5F7FA',
  },
  relacionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF0FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarInitials: { fontSize: 16, fontWeight: 'bold', color: PANTONE_295C },
  relacionNombre: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 6 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#EAF0FB' },
  chipText: { fontSize: 11, fontWeight: '600', color: PANTONE_295C },
  chipEmergency: { backgroundColor: '#FFEBEE' },
  chipTextEmergency: { color: '#C62828' },
  addButton: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  addButtonText: { color: PANTONE_134C, fontWeight: 'bold', fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: PANTONE_295C,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F5F7FA' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    marginHorizontal: 16,
  },
  memberList: { marginHorizontal: 16, marginTop: 8, marginBottom: 16 },
  moreResultsHint: { fontSize: 12, color: '#AAA', textAlign: 'center', paddingVertical: 6 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#fff',
    gap: 10,
  },
  memberItemSelected: { backgroundColor: PANTONE_295C },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF0FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarInitials: { fontSize: 13, fontWeight: 'bold', color: PANTONE_295C },
  memberName: { fontSize: 14, color: '#222', flex: 1 },
  tipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tipoOption: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F7FA',
  },
  tipoOptionSelected: { backgroundColor: PANTONE_295C, borderColor: PANTONE_295C },
  tipoOptionText: { fontSize: 13, color: '#555' },
  tipoOptionTextSelected: { color: '#fff', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 15, color: '#333', fontWeight: '600' },
  formError: { color: '#E53935', fontSize: 13, marginHorizontal: 16, marginTop: 10 },
  saveButton: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  saveButtonText: { color: PANTONE_134C, fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#CCC',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDD',
    marginHorizontal: 16,
    marginTop: 8,
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    marginHorizontal: 16,
    marginBottom: 8,
  },
});
