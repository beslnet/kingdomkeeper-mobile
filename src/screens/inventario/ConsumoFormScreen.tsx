import React, { useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { createConsumo } from '../../api/inventario';
import { listarMiembros, Miembro } from '../../api/miembros';
import { getGruposLideradosPor } from '../../api/grupos';

type ConsumoFormRouteParams = {
  articuloId: number;
  articuloNombre: string;
  articuloUnidad: string;
  stockDisponible: number;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

function formatDateDisplay(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function toISODateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function ConsumoFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: ConsumoFormRouteParams }, 'params'>>();
  const { articuloId, articuloNombre, articuloUnidad, stockDisponible } = route.params;

  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [fechaConsumo, setFechaConsumo] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Member search
  const [miembroSearch, setMiembroSearch] = useState('');
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loadingMiembros, setLoadingMiembros] = useState(false);
  const [selectedMiembro, setSelectedMiembro] = useState<{ id: number; nombre: string } | null>(null);

  // Grupos liderados
  const [gruposLiderados, setGruposLiderados] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Member search effect
  useEffect(() => {
    if (miembroSearch.trim().length < 2) {
      setMiembros([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingMiembros(true);
      try {
        const res = await listarMiembros({ search: miembroSearch.trim(), page_size: 10 });
        setMiembros(res.results ?? []);
      } catch {
        setMiembros([]);
      } finally {
        setLoadingMiembros(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [miembroSearch]);

  // Load grupos when member is selected
  useEffect(() => {
    if (!selectedMiembro) {
      setGruposLiderados([]);
      setSelectedGrupo(null);
      return;
    }
    const loadGrupos = async () => {
      setLoadingGrupos(true);
      try {
        const grupos = await getGruposLideradosPor(selectedMiembro.id);
        setGruposLiderados(grupos);
      } catch {
        setGruposLiderados([]);
      } finally {
        setLoadingGrupos(false);
      }
    };
    loadGrupos();
  }, [selectedMiembro]);

  const handleSave = async () => {
    if (!selectedMiembro) {
      setError('Debes seleccionar el responsable.');
      return;
    }
    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum < 1) {
      setError('La cantidad debe ser al menos 1.');
      return;
    }
    if (cantNum > stockDisponible) {
      setError(`Stock insuficiente. Disponible: ${stockDisponible} ${articuloUnidad}.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createConsumo({
        articulo: articuloId,
        cantidad: cantNum,
        consumido_por: selectedMiembro.id,
        grupo: selectedGrupo,
        fecha_consumo: toISODateStr(fechaConsumo),
        motivo: motivo.trim(),
      });
      Alert.alert('Éxito', 'Consumo registrado correctamente.');
      navigation.goBack();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail =
        (e?.response?.data?.detail as string) ||
        (e?.response?.data?.non_field_errors as string[])?.[0] ||
        'Error al registrar el consumo.';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Icon source="beaker-outline" size={20} color="#388E3C" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.infoBannerTitle}>{articuloNombre}</Text>
            <Text style={styles.infoBannerSub}>
              Stock disponible: {stockDisponible} {articuloUnidad}
            </Text>
          </View>
        </View>

        {/* Cantidad */}
        <View style={styles.section}>
          <FieldLabel label="Cantidad a consumir" required />
          <TextInput
            style={styles.input}
            value={cantidad}
            onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ''))}
            placeholder={`máx. ${stockDisponible}`}
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          <Text style={styles.helper}>Unidad: {articuloUnidad}</Text>
        </View>

        {/* Responsable - member search */}
        <View style={styles.section}>
          <FieldLabel label="Responsable" required />
          {selectedMiembro ? (
            <View style={styles.memberChip}>
              <Icon source="account" size={16} color={PANTONE_295C} />
              <Text style={styles.memberChipText} numberOfLines={1}>
                {selectedMiembro.nombre}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedMiembro(null);
                  setMiembroSearch('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon source="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Buscar por nombre..."
                placeholderTextColor="#999"
                value={miembroSearch}
                onChangeText={setMiembroSearch}
              />
              {miembroSearch.trim().length >= 2 && (
                <View style={styles.suggestionList}>
                  {loadingMiembros ? (
                    <ActivityIndicator size="small" color={PANTONE_295C} style={{ padding: 10 }} />
                  ) : miembros.length === 0 ? (
                    <Text style={styles.noResults}>Sin resultados</Text>
                  ) : (
                    miembros.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setSelectedMiembro({
                            id: m.id,
                            nombre: `${m.nombre} ${m.apellidos}`,
                          });
                          setMiembroSearch('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon source="account-outline" size={16} color="#888" />
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>
                            {m.nombre} {m.apellidos}
                          </Text>
                          {m.email && <Text style={styles.suggestionSub}>{m.email}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Grupo (conditional) */}
        {gruposLiderados.length > 0 && (
          <View style={styles.section}>
            <FieldLabel label="¿Representa a un grupo? (opcional)" />
            {loadingGrupos ? (
              <ActivityIndicator size="small" color={PANTONE_295C} />
            ) : (
              <View style={styles.groupPickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.groupOption,
                    selectedGrupo === null && styles.groupOptionActive,
                  ]}
                  onPress={() => setSelectedGrupo(null)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.groupOptionText,
                      selectedGrupo === null && styles.groupOptionTextActive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                {gruposLiderados.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.groupOption,
                      selectedGrupo === g.id && styles.groupOptionActive,
                    ]}
                    onPress={() => setSelectedGrupo(g.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.groupOptionText,
                        selectedGrupo === g.id && styles.groupOptionTextActive,
                      ]}
                    >
                      {g.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Motivo */}
        <View style={styles.section}>
          <FieldLabel label="¿Para qué se usa?" />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Ej: Reunión de jóvenes, actividad pastoral..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Fecha de consumo */}
        <View style={styles.section}>
          <FieldLabel label="Fecha de consumo" required />
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
          >
            <Icon source="calendar-outline" size={18} color="#666" />
            <Text style={styles.dateButtonText}>{formatDateDisplay(fechaConsumo)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.iosPickerDoneBtn}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.iosPickerDoneText}>Listo ✓</Text>
                </TouchableOpacity>
              )}
              <DateTimePicker
                value={fechaConsumo}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_e, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setFechaConsumo(date);
                }}
              />
            </View>
          )}
        </View>

        {error ? <Text style={styles.formError}>{error}</Text> : null}

        {/* Buttons */}
        <View style={styles.formButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
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
              <Text style={styles.saveButtonText}>Registrar Consumo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  infoBannerSub: {
    fontSize: 13,
    color: '#388E3C',
    marginTop: 2,
  },
  section: { marginBottom: 4 },
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
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#333',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helper: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  memberChipText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  suggestionList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, color: '#333', fontWeight: '500' },
  suggestionSub: { fontSize: 12, color: '#777', marginTop: 2 },
  noResults: {
    padding: 16,
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
  },
  groupPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  groupOptionActive: {
    borderColor: '#388E3C',
    backgroundColor: '#E8F5E9',
  },
  groupOptionText: {
    fontSize: 13,
    color: '#666',
  },
  groupOptionTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
  },
  iosPickerDoneBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  iosPickerDoneText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  formError: {
    color: '#E53935',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#388E3C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
