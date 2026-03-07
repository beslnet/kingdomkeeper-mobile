import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  getFamilia,
  agregarRelacionMiembro,
  eliminarRelacionMiembro,
  listarMiembros,
  RelacionFamiliar,
  TIPOS_RELACION,
  filtrarRelacionesPorGenero,
} from '../../api/miembros';
import { PANTONE_295C } from '../../theme/colors';

function RelacionItem({
  relacion,
  onDelete,
  canDelete,
}: {
  relacion: RelacionFamiliar;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const tipoLabel =
    TIPOS_RELACION.find((t) => t.value === relacion.tipo_relacion)?.label ??
    relacion.tipo_relacion;

  return (
    <View style={styles.relacionItem}>
      <View style={styles.relacionAvatar}>
        <Icon source="account" size={22} color={PANTONE_295C} />
      </View>
      <View style={styles.relacionBody}>
        <Text style={styles.relacionNombre}>{relacion.miembro_relacionado_nombre}</Text>
        <View style={styles.relacionBadges}>
          <View style={styles.tipoBadge}>
            <Text style={styles.tipoBadgeText}>{tipoLabel}</Text>
          </View>
          {relacion.es_contacto_emergencia && (
            <View style={styles.emergenciaBadge}>
              <Icon source="phone-alert" size={12} color="#FFF" />
              <Text style={styles.emergenciaBadgeText}>Emergencia</Text>
            </View>
          )}
        </View>
      </View>
      {canDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} activeOpacity={0.7}>
          <Icon source="close-circle-outline" size={20} color="#E53935" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FamilyMiembroScreen() {
  const route = useRoute<any>();
  const { miembroId } = route.params;

  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const canEdit = isSuperAdmin || hasPermission('membresia', 'crear');

  const [nucleares, setNucleares] = useState<RelacionFamiliar[]>([]);
  const [extendidas, setExtendidas] = useState<RelacionFamiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add relation modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [miembrosSearch, setMiembrosSearch] = useState('');
  const [miembrosResults, setMiembrosResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedMiembro, setSelectedMiembro] = useState<any | null>(null);
  const [tipoRelacion, setTipoRelacion] = useState('');
  const [tipoSelector, setTipoSelector] = useState(false);
  const [esContactoEmergencia, setEsContactoEmergencia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Filtra los tipos de relación según el género del familiar seleccionado
  const relacionesFiltradas = filtrarRelacionesPorGenero(selectedMiembro?.genero);

  const loadFamilia = useCallback(async () => {
    setError(null);
    try {
      const result = await getFamilia(miembroId);
      setNucleares(result.relaciones_nucleares ?? []);
      setExtendidas(result.relaciones_extendidas ?? []);
    } catch {
      setError('No se pudo cargar la familia.');
    }
  }, [miembroId]);

  useEffect(() => {
    setLoading(true);
    loadFamilia().finally(() => setLoading(false));
  }, [loadFamilia]);

  const handleDelete = (relacion: RelacionFamiliar) => {
    Alert.alert(
      'Eliminar relación',
      `¿Eliminar la relación con ${relacion.miembro_relacionado_nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarRelacionMiembro(relacion.id);
              await loadFamilia();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la relación.');
            }
          },
        },
      ],
    );
  };

  const searchMiembros = async (q: string) => {
    if (q.trim().length < 2) {
      setMiembrosResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const result = await listarMiembros({ search: q, page_size: 15 });
      setMiembrosResults(
        (result.results ?? []).filter((m: any) => m.id !== miembroId),
      );
    } catch {
      setMiembrosResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const openAddModal = () => {
    setMiembrosSearch('');
    setMiembrosResults([]);
    setSelectedMiembro(null);
    setTipoRelacion('');
    setEsContactoEmergencia(false);
    setAddError(null);
    setAddModalVisible(true);
  };

  const handleAdd = async () => {
    if (!selectedMiembro) {
      setAddError('Selecciona un miembro.');
      return;
    }
    if (!tipoRelacion) {
      setAddError('Selecciona el tipo de relación.');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await agregarRelacionMiembro(miembroId, {
        miembro_relacionado_id: selectedMiembro.id,
        tipo_relacion: tipoRelacion,
        es_contacto_emergencia: esContactoEmergencia,
      });
      await loadFamilia();
      setAddModalVisible(false);
    } catch (err: any) {
      const data = err?.response?.data;
      let msg = 'No se pudo agregar la relación.';
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error) {
        msg = data.error;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        // Field-level errors: { tipo_relacion: ["msg"], miembro_relacionado: ["msg"] }
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setAddError(msg);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: 'Familia nuclear',
      data: nucleares,
      empty: 'Sin relaciones nucleares registradas.',
    },
    {
      title: 'Familia extendida',
      data: extendidas,
      empty: 'Sin relaciones extendidas registradas.',
    },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <TouchableOpacity style={styles.centered} onPress={loadFamilia}>
          <Icon source="alert-circle-outline" size={36} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <RelacionItem
              relacion={item}
              canDelete={canEdit}
              onDelete={() => handleDelete(item)}
            />
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>{section.empty}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 12 }}
          stickySectionHeadersEnabled={false}
        />
      )}

      {canEdit && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
          <Icon source="account-plus-outline" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Add relation modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar relación</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Icon source="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            {addError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{addError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Buscar miembro</Text>
            <TextInput
              style={styles.input}
              value={miembrosSearch}
              onChangeText={(t) => {
                setMiembrosSearch(t);
                setSelectedMiembro(null);
                searchMiembros(t);
              }}
              placeholder="Escribe nombre o documento..."
              placeholderTextColor="#AAA"
            />

            {loadingSearch && (
              <ActivityIndicator size="small" color={PANTONE_295C} />
            )}

            {selectedMiembro && (
              <View style={styles.selectedMiembro}>
                <Icon source="account-check" size={18} color={PANTONE_295C} />
                <Text style={styles.selectedMiembroText}>
                  {selectedMiembro.nombre} {selectedMiembro.apellidos}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMiembro(null)}>
                  <Icon source="close" size={16} color="#888" />
                </TouchableOpacity>
              </View>
            )}

            {!selectedMiembro && miembrosResults.length > 0 && (
              <FlatList
                data={miembrosResults}
                keyExtractor={(m) => String(m.id)}
                style={styles.searchResults}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSelectedMiembro(item);
                      setMiembrosSearch(`${item.nombre} ${item.apellidos}`);
                      setMiembrosResults([]);
                      setTipoRelacion(''); // resetear al cambiar de miembro
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.searchResultName}>
                      {item.nombre} {item.apellidos}
                    </Text>
                    {item.documento_identidad ? (
                      <Text style={styles.searchResultDoc}>{item.documento_identidad}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}

            <Text style={styles.fieldLabel}>Tipo de relación</Text>
            {!selectedMiembro && (
              <Text style={styles.fieldHint}>Selecciona primero un miembro para ver las opciones según su género</Text>
            )}
            <TouchableOpacity
              style={[styles.selectBtn, !selectedMiembro && styles.selectBtnDisabled]}
              onPress={() => { if (selectedMiembro) setTipoSelector((v) => !v); }}
              activeOpacity={selectedMiembro ? 0.75 : 1}
            >
              <Text style={[styles.selectBtnText, !tipoRelacion && { color: '#AAA' }]}>
                {tipoRelacion
                  ? (relacionesFiltradas.find((t) => t.value === tipoRelacion)?.label ?? tipoRelacion)
                  : 'Seleccionar...'}
              </Text>
              <Icon source={tipoSelector ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
            </TouchableOpacity>
            {tipoSelector && (
              <View style={styles.inlineDropdown}>
                {relacionesFiltradas.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.selectOption,
                      tipoRelacion === item.value && styles.selectOptionActive,
                    ]}
                    onPress={() => {
                      setTipoRelacion(item.value);
                      setTipoSelector(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        tipoRelacion === item.value && styles.selectOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {tipoRelacion === item.value && (
                      <Icon source="check" size={18} color={PANTONE_295C} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setEsContactoEmergencia((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={styles.switchLabel}>
                <Text style={styles.fieldLabel}>Contacto de emergencia</Text>
                <Text style={styles.fieldHint}>Esta persona podrá ser contactada en emergencias</Text>
              </View>
              <Switch
                value={esContactoEmergencia}
                onValueChange={setEsContactoEmergencia}
                trackColor={{ false: '#E0E0E0', true: PANTONE_295C }}
                thumbColor="#FFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                (saving || !selectedMiembro || !tipoRelacion) && styles.saveBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={saving || !selectedMiembro || !tipoRelacion}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Agregar relación</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 14, color: '#E53935', marginTop: 8, textAlign: 'center' },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  relacionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  relacionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  relacionBody: { flex: 1 },
  relacionNombre: { fontSize: 15, fontWeight: '600', color: '#222' },
  relacionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tipoBadge: {
    backgroundColor: PANTONE_295C,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tipoBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '600', textTransform: 'capitalize' },
  emergenciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E53935',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  emergenciaBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  deleteBtn: { padding: 4 },
  emptySection: { paddingVertical: 8 },
  emptySectionText: { fontSize: 13, color: '#AAA', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 10 },
  fieldHint: { fontSize: 12, color: '#AAA', marginBottom: 4, fontStyle: 'italic' },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectedMiembro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    gap: 8,
  },
  selectedMiembroText: { flex: 1, fontSize: 14, color: PANTONE_295C, fontWeight: '600' },
  searchResults: { maxHeight: 160, marginTop: 4 },
  searchResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultName: { fontSize: 14, color: '#222', fontWeight: '500' },
  searchResultDoc: { fontSize: 12, color: '#888' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectBtnDisabled: { opacity: 0.5 },
  selectBtnText: { fontSize: 15, color: '#222' },
  inlineDropdown: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFF',
  },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchLabel: { flex: 1, marginRight: 12 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorBannerText: { fontSize: 13, color: '#E53935' },
  selectSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '60%',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectOptionActive: { backgroundColor: '#EAF2FF' },
  selectOptionText: { fontSize: 15, color: '#444' },
  selectOptionTextActive: { color: PANTONE_295C, fontWeight: '600' },
});
