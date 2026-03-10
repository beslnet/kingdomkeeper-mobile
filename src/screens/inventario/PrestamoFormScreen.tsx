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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarArticulos,
  crearPrestamo,
  ArticuloList,
} from '../../api/inventario';
import { listarMiembros, Miembro } from '../../api/miembros';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrestamoFormScreen() {
  const navigation = useNavigation<any>();

  // Article search (like member search)
  const [articuloSearch, setArticuloSearch]       = useState('');
  const [articuloResults, setArticuloResults]     = useState<ArticuloList[]>([]);
  const [loadingArticulos, setLoadingArticulos]   = useState(false);
  const [selectedArticulo, setSelectedArticulo]   = useState<ArticuloList | null>(null);
  const [cantidadPrestada, setCantidadPrestada]   = useState('1');

  // Member search
  const [miembroSearch, setMiembroSearch] = useState('');
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loadingMiembros, setLoadingMiembros] = useState(false);
  const [selectedMiembro, setSelectedMiembro] = useState<{ id: number; nombre: string } | null>(null);

  // Date picker
  const [fechaDevolucion, setFechaDevolucion] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Other fields
  const [condicionEntrega, setCondicionEntrega] = useState('');
  const [notas, setNotas] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Article search (debounced) ──────────────────────────────────────────────

  useEffect(() => {
    if (articuloSearch.trim().length < 2) {
      setArticuloResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingArticulos(true);
      try {
        const res = await listarArticulos({
          buscar: articuloSearch.trim(),
          estado: 'disponible',
          page_size: 20,
        });
        setArticuloResults(res.results ?? []);
      } catch {
        setArticuloResults([]);
      } finally {
        setLoadingArticulos(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [articuloSearch]);

  // ─── Member search ───────────────────────────────────────────────────────────

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

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedArticulo) { setError('Debes seleccionar un artículo.'); return; }
    if (!selectedMiembro) { setError('Debes seleccionar el prestatario.'); return; }
    const cantNum = parseInt(cantidadPrestada, 10);
    if (isNaN(cantNum) || cantNum < 1) { setError('La cantidad a prestar debe ser al menos 1.'); return; }
    if (selectedArticulo.tipo_articulo !== 'individual' && cantNum > selectedArticulo.cantidad) {
      setError(`Stock insuficiente. Disponible: ${selectedArticulo.cantidad} ${selectedArticulo.unidad_medida}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await crearPrestamo({
        articulo: selectedArticulo.id,
        prestatario: selectedMiembro.id,
        cantidad_prestada: cantNum,
        fecha_devolucion_esperada: fechaDevolucion ? toISODateStr(fechaDevolucion) : null,
        condicion_entrega: condicionEntrega.trim(),
        notas: notas.trim(),
      });
      navigation.goBack();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail =
        (e?.response?.data?.detail as string) ||
        (e?.response?.data?.non_field_errors as string[])?.[0] ||
        'Error al registrar el préstamo.';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Artículo */}
        <View style={styles.section}>
          <FieldLabel label="Artículo" required />
          {selectedArticulo ? (
            <View style={styles.selectedChip}>
              <Icon source="package-variant" size={16} color={PANTONE_295C} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedChipText} numberOfLines={1}>
                  {selectedArticulo.nombre}
                </Text>
                {selectedArticulo.tipo_articulo === 'individual' ? (
                  <>
                    <Text style={[styles.selectedChipSub, { color: PANTONE_295C }]}>
                      Unidad individual · disponible
                    </Text>
                    {!!selectedArticulo.codigo && (
                      <Text style={styles.selectedChipSub}>
                        Se prestará: {selectedArticulo.codigo}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={[styles.selectedChipSub, { color: selectedArticulo.tipo_articulo === 'granel' ? '#7B1FA2' : '#388E3C' }]}>
                    {selectedArticulo.tipo_articulo === 'granel' ? 'A Granel' : 'Consumible'} · Stock disponible: {selectedArticulo.cantidad} {selectedArticulo.unidad_medida}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => { setSelectedArticulo(null); setArticuloSearch(''); setCantidadPrestada('1'); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon source="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Buscar artículo disponible..."
                placeholderTextColor="#999"
                value={articuloSearch}
                onChangeText={setArticuloSearch}
              />
              {articuloSearch.trim().length >= 2 && (
                <View style={styles.suggestionList}>
                  {loadingArticulos ? (
                    <ActivityIndicator size="small" color={PANTONE_295C} style={{ padding: 10 }} />
                  ) : articuloResults.length === 0 ? (
                    <Text style={styles.noResults}>Sin artículos disponibles con ese nombre</Text>
                  ) : (
                    articuloResults.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={styles.suggestionItem}
                        onPress={() => { setSelectedArticulo(a); setArticuloSearch(''); setCantidadPrestada('1'); }}
                        activeOpacity={0.7}
                      >
                        <Icon
                          source={
                            a.tipo_articulo === 'individual'
                              ? 'package-variant-closed'
                              : a.tipo_articulo === 'granel'
                              ? 'layers-outline'
                              : 'beaker-outline'
                          }
                          size={16}
                          color="#888"
                        />
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName} numberOfLines={1}>{a.nombre}</Text>
                          <Text style={styles.suggestionSub}>
                            {a.tipo_articulo === 'individual'
                              ? (a.codigo ? `Código: ${a.codigo}` : 'Sin código')
                              : (a.tipo_articulo === 'granel' ? 'A Granel' : 'Consumible')}
                            {a.ubicacion_nombre ? ` · ${a.ubicacion_nombre}` : ''}
                          </Text>
                          {a.tipo_articulo !== 'individual' ? (
                            <Text style={[styles.suggestionSub, { color: a.tipo_articulo === 'granel' ? '#7B1FA2' : '#388E3C' }]}>
                              Stock: {a.cantidad} {a.unidad_medida}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Cantidad — solo granel y consumible */}
        {selectedArticulo && selectedArticulo.tipo_articulo !== 'individual' && (
          <View style={styles.section}>
            <FieldLabel
              label={`Cantidad a prestar (máx. ${selectedArticulo.cantidad} ${selectedArticulo.unidad_medida})`}
              required
            />
            <TextInput
              style={styles.input}
              value={cantidadPrestada}
              onChangeText={(t) => setCantidadPrestada(t.replace(/[^0-9]/g, ''))}
              placeholder="1"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Prestatario — member search */}
        <View style={styles.section}>
          <FieldLabel label="Prestatario" required />
          {selectedMiembro ? (
            <View style={styles.memberChip}>
              <Icon source="account" size={16} color={PANTONE_295C} />
              <Text style={styles.memberChipText} numberOfLines={1}>
                {selectedMiembro.nombre}
              </Text>
              <TouchableOpacity
                onPress={() => { setSelectedMiembro(null); setMiembroSearch(''); }}
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
                          setSelectedMiembro({ id: m.id, nombre: `${m.nombre} ${m.apellidos}` });
                          setMiembroSearch('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon source="account-outline" size={16} color="#888" />
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>{m.nombre} {m.apellidos}</Text>
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

        {/* Fecha de devolución — native date picker */}
        <View style={styles.section}>
          <FieldLabel label="Fecha de devolución esperada" />
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateButton, { flex: 1 }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Icon source="calendar-outline" size={18} color="#666" />
              <Text style={[styles.dateButtonText, !fechaDevolucion && { color: '#999' }]}>
                {fechaDevolucion ? formatDateDisplay(fechaDevolucion) : 'Sin fecha (opcional)'}
              </Text>
            </TouchableOpacity>
            {fechaDevolucion && (
              <TouchableOpacity
                style={styles.dateClearBtn}
                onPress={() => setFechaDevolucion(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon source="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
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
                value={fechaDevolucion ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_e, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (date) setFechaDevolucion(date);
                }}
              />
            </View>
          )}
        </View>

        {/* Condición de entrega */}
        <View style={styles.section}>
          <FieldLabel label="Condición de entrega" />
          <TextInput
            style={styles.input}
            value={condicionEntrega}
            onChangeText={setCondicionEntrega}
            placeholder="Estado del artículo al entregarlo"
            placeholderTextColor="#999"
          />
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <FieldLabel label="Notas" />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={notas}
            onChangeText={setNotas}
            placeholder="Observaciones adicionales..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? <Text style={styles.formError}>{error}</Text> : null}

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
              <Text style={styles.saveButtonText}>Registrar préstamo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
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
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Article chip (selected state)
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF0FB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C5D6F0',
  },
  selectedChipText: {
    fontSize: 14,
    color: PANTONE_295C,
    fontWeight: '600',
  },
  selectedChipSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // Member chip (selected state)
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF0FB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C5D6F0',
  },
  memberChipText: {
    flex: 1,
    fontSize: 15,
    color: PANTONE_295C,
    fontWeight: '600',
  },
  // Member suggestions dropdown
  suggestionList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
    overflow: 'hidden',
  },
  noResults: {
    padding: 12,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  suggestionSub: { fontSize: 12, color: '#888', marginTop: 2 },
  // Date picker
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: { fontSize: 15, color: '#1A1A2E' },
  dateClearBtn: {
    padding: 2,
  },
  iosPickerDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PANTONE_295C,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  iosPickerDoneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Form
  formError: {
    color: '#E53935',
    fontSize: 13,
    marginTop: 12,
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: { color: '#666', fontWeight: '600', fontSize: 15 },
  saveButton: {
    flex: 2,
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
