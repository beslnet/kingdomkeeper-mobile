import React, { useRef, useState } from 'react';
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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  crearMiembro,
  editarMiembro,
  Miembro,
  TIPOS_DOCUMENTO,
  ESTADOS_MEMBRESIA,
} from '../../api/miembros';
import { PANTONE_295C } from '../../theme/colors';
import { GOOGLE_MAPS_API_KEY } from '../../config/maps';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateStr(str: string | undefined): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateDisplay(date: Date | null): string {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function toISODateStr(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return 'Error al guardar el miembro.';
  if (typeof data === 'string') return data;
  const firstField = Object.values(data)[0];
  if (Array.isArray(firstField)) return firstField[0] as string;
  if (typeof firstField === 'string') return firstField;
  return data.detail ?? data.error ?? 'Error al guardar el miembro.';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

function SelectField({
  label,
  required,
  value,
  options,
  onSelect,
}: {
  label: string;
  required?: boolean;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity
        style={styles.selectBtn}
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={[styles.selectBtnText, !selected && styles.selectBtnPlaceholder]}>
          {selected?.label ?? 'Seleccionar...'}
        </Text>
        <Icon source="chevron-down" size={20} color="#888" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.selectSheet}>
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.selectOption, item.value === value && styles.selectOptionActive]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      item.value === value && styles.selectOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Icon source="check" size={18} color={PANTONE_295C} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function DateField({
  label,
  required,
  value,
  onChange,
  maxDate,
}: {
  label: string;
  required?: boolean;
  value: Date | null;
  onChange: (date: Date) => void;
  maxDate?: Date;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Text style={[styles.selectBtnText, !value && styles.selectBtnPlaceholder]}>
          {value ? formatDateDisplay(value) : 'Seleccionar fecha...'}
        </Text>
        <Icon source="calendar-outline" size={20} color="#888" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maxDate}
          onChange={(_e, date) => {
            setShow(Platform.OS === 'ios');
            if (date) onChange(date);
          }}
        />
      )}
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

const GENERO_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
];

export default function MiembroFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { miembro } = route.params ?? {};
  const isEdit = !!miembro;

  // Basic info
  const [nombre, setNombre] = useState<string>(miembro?.nombre ?? '');
  const [apellidos, setApellidos] = useState<string>(miembro?.apellidos ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(
    parseDateStr(miembro?.fecha_nacimiento),
  );
  const [tipoDocumento, setTipoDocumento] = useState<string>(
    miembro?.tipo_documento ?? 'rut',
  );
  const [documentoIdentidad, setDocumentoIdentidad] = useState<string>(
    miembro?.documento_identidad ?? '',
  );
  const [genero, setGenero] = useState<string>(miembro?.genero ?? '');

  // Membership
  const [fechaIngreso, setFechaIngreso] = useState<Date | null>(
    parseDateStr(miembro?.fecha_ingreso) ?? new Date(),
  );
  const [estadoMembresia, setEstadoMembresia] = useState<string>(
    miembro?.estado_membresia ?? 'activo',
  );

  // Contact
  const [telefono, setTelefono] = useState<string>(miembro?.telefono ?? '');
  const [email, setEmail] = useState<string>(miembro?.email ?? '');

  // Address
  const placesRef = useRef<any>(null);
  const [pais, setPais] = useState<string>(miembro?.pais ?? '');
  const [direccionFormateada, setDireccionFormateada] = useState<string>(
    miembro?.direccion_formateada ?? '',
  );
  const [ciudad, setCiudad] = useState<string>(miembro?.ciudad ?? '');
  const [region, setRegion] = useState<string>(miembro?.region ?? '');
  const [codigoPostal, setCodigoPostal] = useState<string>(miembro?.codigo_postal ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!nombre.trim() || nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (!apellidos.trim() || apellidos.trim().length < 2) return 'Los apellidos deben tener al menos 2 caracteres.';
    if (!fechaNacimiento) return 'La fecha de nacimiento es obligatoria.';
    if (!documentoIdentidad.trim()) return 'El documento de identidad es obligatorio.';
    if (!fechaIngreso) return 'La fecha de ingreso es obligatoria.';
    if (email.trim() && !email.includes('@')) return 'El email no es válido.';
    return null;
  };

  const handleSave = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: Partial<Miembro> = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      fecha_nacimiento: toISODateStr(fechaNacimiento),
      tipo_documento: tipoDocumento as Miembro['tipo_documento'],
      documento_identidad: documentoIdentidad.trim(),
      genero: (genero as Miembro['genero']) || null,
      fecha_ingreso: toISODateStr(fechaIngreso),
      estado_membresia: estadoMembresia as Miembro['estado_membresia'],
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      pais: pais.trim() || null,
      direccion_formateada: direccionFormateada.trim() || null,
      ciudad: ciudad.trim() || null,
      region: region.trim() || null,
      codigo_postal: codigoPostal.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await editarMiembro(miembro.id, payload);
      } else {
        await crearMiembro(payload);
      }
      navigation.goBack();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Icon source="alert-circle-outline" size={18} color="#E53935" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* ─ Datos personales ─ */}
          <Text style={styles.groupTitle}>Datos personales</Text>
          <View style={styles.card}>
            <FieldLabel label="Nombre" required />
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Juan"
              placeholderTextColor="#AAA"
              autoCapitalize="words"
            />

            <FieldLabel label="Apellidos" required />
            <TextInput
              style={styles.input}
              value={apellidos}
              onChangeText={setApellidos}
              placeholder="Ej: Pérez González"
              placeholderTextColor="#AAA"
              autoCapitalize="words"
            />

            <DateField
              label="Fecha de nacimiento"
              required
              value={fechaNacimiento}
              onChange={setFechaNacimiento}
              maxDate={new Date()}
            />

            <SelectField
              label="Tipo de documento"
              required
              value={tipoDocumento}
              options={TIPOS_DOCUMENTO}
              onSelect={setTipoDocumento}
            />

            <FieldLabel label="Documento de identidad" required />
            <TextInput
              style={styles.input}
              value={documentoIdentidad}
              onChangeText={setDocumentoIdentidad}
              placeholder="Ej: 12.345.678-9"
              placeholderTextColor="#AAA"
              autoCapitalize="characters"
            />

            <SelectField
              label="Género"
              value={genero}
              options={GENERO_OPTIONS}
              onSelect={setGenero}
            />
          </View>

          {/* ─ Membresía ─ */}
          <Text style={styles.groupTitle}>Membresía</Text>
          <View style={styles.card}>
            <DateField
              label="Fecha de ingreso"
              required
              value={fechaIngreso}
              onChange={setFechaIngreso}
              maxDate={new Date()}
            />

            <SelectField
              label="Estado"
              required
              value={estadoMembresia}
              options={ESTADOS_MEMBRESIA}
              onSelect={setEstadoMembresia}
            />
          </View>

          {/* ─ Contacto ─ */}
          <Text style={styles.groupTitle}>Contacto</Text>
          <View style={styles.card}>
            <FieldLabel label="Teléfono" />
            <TextInput
              style={styles.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: +56 9 1234 5678"
              placeholderTextColor="#AAA"
              keyboardType="phone-pad"
            />

            <FieldLabel label="Email" />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Ej: juan@ejemplo.com"
              placeholderTextColor="#AAA"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* ─ Dirección ─ */}
          <Text style={styles.groupTitle}>Dirección</Text>
          <View style={styles.card}>
            {direccionFormateada ? (
              <View style={styles.addressSelected}>
                <Icon source="map-marker-check" size={20} color={PANTONE_295C} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressSelectedText}>{direccionFormateada}</Text>
                  {ciudad ? <Text style={styles.addressSelectedSub}>{ciudad}{region ? `, ${region}` : ''}{pais ? ` · ${pais}` : ''}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => {
                  setDireccionFormateada('');
                  setPais('');
                  setCiudad('');
                  setRegion('');
                  setCodigoPostal('');
                  placesRef.current?.clear();
                }}>
                  <Icon source="close-circle-outline" size={20} color="#888" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FieldLabel label="Buscar dirección" />
                <GooglePlacesAutocomplete
                  ref={placesRef}
                  placeholder="Escribe la dirección..."
                  onPress={(data, details = null) => {
                    const components = details?.address_components ?? [];
                    const get = (type: string) =>
                      components.find((c: any) => c.types.includes(type))?.long_name ?? '';
                    setDireccionFormateada(data.description);
                    setPais(get('country'));
                    setCiudad(get('locality') || get('administrative_area_level_2'));
                    setRegion(get('administrative_area_level_1'));
                    setCodigoPostal(get('postal_code'));
                  }}
                  query={{ key: GOOGLE_MAPS_API_KEY, language: 'es' }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  styles={{
                    textInput: {
                      backgroundColor: '#F5F5F5',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                      paddingHorizontal: 12,
                      fontSize: 15,
                      color: '#222',
                      height: 44,
                    },
                    row: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12 },
                    description: { fontSize: 14, color: '#333' },
                    listView: {
                      borderWidth: 1,
                      borderColor: '#E8E8E8',
                      borderRadius: 8,
                      marginTop: 2,
                    },
                  }}
                  textInputProps={{ placeholderTextColor: '#AAA' }}
                />
              </>
            )}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon source="content-save-outline" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {isEdit ? 'Guardar cambios' : 'Crear miembro'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16 },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  addressSelected: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    padding: 12,
  },
  addressSelectedText: { fontSize: 14, color: '#222', fontWeight: '600' },
  addressSelectedSub: { fontSize: 12, color: '#666', marginTop: 2 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 10,
  },
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
  selectBtnText: { fontSize: 15, color: '#222' },
  selectBtnPlaceholder: { color: '#AAA' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: '#E53935' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  selectSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '70%',
  },
  selectSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectOptionActive: { backgroundColor: '#EAF2FF' },
  selectOptionText: { fontSize: 15, color: '#444' },
  selectOptionTextActive: { color: PANTONE_295C, fontWeight: '600' },
});
