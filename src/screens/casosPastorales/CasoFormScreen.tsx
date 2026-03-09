import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { listarMiembros, Miembro } from '../../api/miembros';
import {
  crearCaso,
  actualizarCaso,
  listarUsuarios,
  CasoPastoral,
  CasoPastoralPayload,
  Usuario,
} from '../../api/pastoral';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS: { value: string; label: string }[] = [
  { value: 'visita', label: 'Visita' },
  { value: 'oracion', label: 'Oración' },
  { value: 'consejeria', label: 'Consejería' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otro', label: 'Otro' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

function InlineDropdown({
  label,
  value,
  options,
  show,
  onToggle,
  onSelect,
  required,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  show: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
  required?: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <View>
      <FieldLabel label={label} required={required} />
      <TouchableOpacity style={styles.selectBtn} onPress={onToggle} activeOpacity={0.75}>
        <Text style={[styles.selectBtnText, !value && { color: '#AAA' }]}>
          {selected?.label ?? 'Seleccionar...'}
        </Text>
        <Icon source={show ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
      </TouchableOpacity>
      {show && (
        <View style={styles.inlineDropdown}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.selectOption, value === opt.value && styles.selectOptionActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  value === opt.value && styles.selectOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {value === opt.value && (
                <Icon source="check" size={18} color={PANTONE_295C} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Selected entity chip ─────────────────────────────────────────────────────

function SelectedChip({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}) {
  return (
    <View style={styles.selectedChip}>
      <Icon source="account-check" size={16} color={PANTONE_295C} />
      <Text style={styles.selectedChipText} numberOfLines={1}>
        {name}
      </Text>
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Icon source="close-circle" size={18} color="#999" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CasoFormScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const caso: CasoPastoral | undefined = route.params?.caso;
  const isEdit = !!caso;

  // ─── Form state ───────────────────────────────────────────────────────────
  const [titulo, setTitulo] = useState(caso?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(caso?.descripcion ?? '');
  const [tipo, setTipo] = useState(caso?.tipo ?? 'visita');
  const [esConfidencial, setEsConfidencial] = useState(caso?.es_confidencial ?? false);

  const [selectedMiembro, setSelectedMiembro] = useState<{
    id: number;
    nombre: string;
  } | null>(
    caso?.miembro
      ? { id: caso.miembro.id, nombre: caso.miembro.nombre_completo }
      : null
  );
  const [selectedResponsable, setSelectedResponsable] = useState<{
    id: number;
    nombre: string;
  } | null>(
    caso?.responsable
      ? {
          id: caso.responsable.id,
          nombre:
            caso.responsable.nombre_completo ||
            `${caso.responsable.nombre} ${caso.responsable.apellidos}`,
        }
      : null
  );

  // ─── Dropdown state ───────────────────────────────────────────────────────
  const [showTipo, setShowTipo] = useState(false);

  // ─── Search state ─────────────────────────────────────────────────────────
  const [miembroSearch, setMiembroSearch] = useState('');
  const [responsableSearch, setResponsableSearch] = useState('');

  // ─── Data state ───────────────────────────────────────────────────────────
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ─── Save state ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [miembrosData, usuariosData] = await Promise.all([
          listarMiembros({ page_size: 200 }),
          listarUsuarios(),
        ]);
        setMiembros(miembrosData.results ?? []);
        setUsuarios(usuariosData);
      } catch {
        // Proceed without lists if API fails
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // ─── Filtered lists ───────────────────────────────────────────────────────
  const filteredMiembros = miembroSearch.trim()
    ? miembros.filter((m) =>
        `${m.nombre} ${m.apellidos}`
          .toLowerCase()
          .includes(miembroSearch.toLowerCase())
      )
    : miembros;

  const filteredUsuarios = responsableSearch.trim()
    ? usuarios.filter((u) => {
        const fullName =
          u.nombre_completo || `${u.nombre} ${u.apellidos}`;
        return (
          fullName.toLowerCase().includes(responsableSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(responsableSearch.toLowerCase())
        );
      })
    : usuarios;

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setFormError(null);
    if (!titulo.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!descripcion.trim()) {
      setFormError('La descripción es obligatoria.');
      return;
    }
    if (!tipo) {
      setFormError('El tipo de caso es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      const payload: CasoPastoralPayload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        miembro_id: selectedMiembro?.id ?? null,
        responsable_id: selectedResponsable?.id ?? null,
        es_confidencial: esConfidencial,
      };

      if (isEdit && caso) {
        await actualizarCaso(caso.id, payload);
        Alert.alert('Guardado', 'Caso actualizado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await crearCaso(payload);
        Alert.alert('Creado', 'Caso pastoral creado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Título */}
        <FieldLabel label="Título" required />
        <TextInput
          style={styles.textInput}
          placeholder="Título del caso..."
          placeholderTextColor="#AAA"
          value={titulo}
          onChangeText={setTitulo}
        />

        {/* Descripción */}
        <FieldLabel label="Descripción" required />
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Descripción del caso..."
          placeholderTextColor="#AAA"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Tipo */}
        <InlineDropdown
          label="Tipo de Caso"
          value={tipo}
          options={TIPOS}
          show={showTipo}
          onToggle={() => setShowTipo((v) => !v)}
          onSelect={(v) => {
            setTipo(v as typeof tipo);
            setShowTipo(false);
          }}
          required
        />

        {/* Miembro relacionado */}
        <FieldLabel label="Miembro Relacionado (opcional)" />
        {selectedMiembro ? (
          <SelectedChip
            name={selectedMiembro.nombre}
            onClear={() => {
              setSelectedMiembro(null);
              setMiembroSearch('');
            }}
          />
        ) : (
          <>
            <TextInput
              style={[styles.textInput, styles.searchInputField]}
              placeholder="Buscar miembro..."
              placeholderTextColor="#AAA"
              value={miembroSearch}
              onChangeText={setMiembroSearch}
            />
            {miembroSearch.trim().length > 0 && (
              <View style={styles.suggestionList}>
                {loadingData ? (
                  <ActivityIndicator
                    size="small"
                    color={PANTONE_295C}
                    style={styles.loaderSmall}
                  />
                ) : filteredMiembros.length === 0 ? (
                  <Text style={styles.noResultsText}>Sin resultados</Text>
                ) : (
                  filteredMiembros.slice(0, 10).map((m) => (
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
                        {m.email && (
                          <Text style={styles.suggestionSub}>{m.email}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* Responsable */}
        <FieldLabel label="Responsable (opcional)" />
        {selectedResponsable ? (
          <SelectedChip
            name={selectedResponsable.nombre}
            onClear={() => {
              setSelectedResponsable(null);
              setResponsableSearch('');
            }}
          />
        ) : (
          <>
            <TextInput
              style={[styles.textInput, styles.searchInputField]}
              placeholder="Buscar usuario responsable..."
              placeholderTextColor="#AAA"
              value={responsableSearch}
              onChangeText={setResponsableSearch}
            />
            {responsableSearch.trim().length > 0 && (
              <View style={styles.suggestionList}>
                {loadingData ? (
                  <ActivityIndicator
                    size="small"
                    color={PANTONE_295C}
                    style={styles.loaderSmall}
                  />
                ) : filteredUsuarios.length === 0 ? (
                  <Text style={styles.noResultsText}>Sin resultados</Text>
                ) : (
                  filteredUsuarios.slice(0, 10).map((u) => {
                    const fullName =
                      u.nombre_completo || `${u.nombre} ${u.apellidos}`;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setSelectedResponsable({ id: u.id, nombre: fullName });
                          setResponsableSearch('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Icon source="account-tie-outline" size={16} color="#888" />
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>{fullName}</Text>
                          <Text style={styles.suggestionSub}>{u.email}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}

        {/* Confidencial */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Icon source="lock-outline" size={20} color="#555" />
            <View>
              <Text style={styles.switchLabel}>Caso Confidencial</Text>
              <Text style={styles.switchHint}>
                Solo visible para administradores y responsable
              </Text>
            </View>
          </View>
          <Switch
            value={esConfidencial}
            onValueChange={setEsConfidencial}
            trackColor={{ false: '#DDD', true: PANTONE_295C }}
            thumbColor="#FFF"
          />
        </View>

        {/* Error */}
        {formError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Guardar cambios' : 'Crear Caso'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 18,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
  },
  textInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  searchInputField: {
    marginBottom: 0,
  },
  selectBtn: {
    backgroundColor: '#FFF',
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
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  selectedChipText: {
    flex: 1,
    fontSize: 14,
    color: PANTONE_295C,
    fontWeight: '600',
  },
  suggestionList: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  noResultsText: {
    fontSize: 13,
    color: '#999',
    padding: 12,
    textAlign: 'center',
  },
  loaderSmall: {
    marginVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 18,
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
