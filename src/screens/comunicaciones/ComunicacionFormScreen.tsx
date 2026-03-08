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
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  crearComunicacion,
  actualizarComunicacion,
  listarDestinatarios,
  listarGruposDestinatarios,
  Comunicacion,
  Destinatario,
  GrupoDestinatario,
  ComunicacionPayload,
} from '../../api/comunicaciones';

const TIPOS = [
  { value: 'notificacion', label: 'Notificación' },
  { value: 'anuncio', label: 'Anuncio' },
  { value: 'recordatorio', label: 'Recordatorio' },
  { value: 'alerta', label: 'Alerta' },
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

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
                style={[styles.selectOptionText, value === opt.value && styles.selectOptionTextActive]}
              >
                {opt.label}
              </Text>
              {value === opt.value && <Icon source="check" size={18} color={PANTONE_295C} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ComunicacionFormScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const comunicacion: Comunicacion | undefined = route.params?.comunicacion;
  const isEdit = !!comunicacion;

  // Form fields
  const [titulo, setTitulo] = useState(comunicacion?.titulo ?? '');
  const [contenido, setContenido] = useState(comunicacion?.contenido ?? '');
  const [resumen, setResumen] = useState(comunicacion?.resumen ?? '');
  const [tipo, setTipo] = useState(comunicacion?.tipo ?? 'notificacion');
  const [prioridad, setPrioridad] = useState(comunicacion?.prioridad ?? 'normal');

  // Dropdown visibility
  const [showTipo, setShowTipo] = useState(false);
  const [showPrioridad, setShowPrioridad] = useState(false);

  // Recipients
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [grupos, setGrupos] = useState<GrupoDestinatario[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedDestinatarios, setSelectedDestinatarios] = useState<Set<number>>(
    new Set(comunicacion?.destinatarios_detalle?.map((d) => d.id) ?? [])
  );
  const [selectedGrupos, setSelectedGrupos] = useState<Set<number>>(
    new Set(comunicacion?.grupos_destinatarios_detalle?.map((g) => g.id) ?? [])
  );
  const [destSearch, setDestSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [destData, gruposData] = await Promise.all([
          listarDestinatarios(),
          listarGruposDestinatarios(),
        ]);
        setDestinatarios(destData);
        const gruposConTodos: GrupoDestinatario[] = [
          { id: 0, nombre: 'Todos los miembros activos', num_miembros: 0 },
          ...gruposData,
        ];
        setGrupos(gruposConTodos);
      } catch {
        // Proceed without lists if API fails
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const toggleDestinatario = (id: number) => {
    setSelectedDestinatarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGrupo = (id: number) => {
    setSelectedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setFormError(null);
    if (!titulo.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!contenido.trim()) {
      setFormError('El contenido es obligatorio.');
      return;
    }
    if (selectedDestinatarios.size === 0 && selectedGrupos.size === 0) {
      setFormError('Debes seleccionar al menos un destinatario o grupo.');
      return;
    }

    setSaving(true);
    try {
      const payload: ComunicacionPayload = {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        resumen: resumen.trim() || undefined,
        tipo,
        canal: 'in_app',
        prioridad,
        destinatarios: Array.from(selectedDestinatarios),
        grupos_destinatarios: Array.from(selectedGrupos),
      };

      if (isEdit && comunicacion) {
        await actualizarComunicacion(comunicacion.id, payload);
        Alert.alert('Guardado', 'Comunicación actualizada.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await crearComunicacion(payload);
        Alert.alert('Creado', 'Borrador guardado correctamente.', [
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

  const filteredDestinatarios = destSearch.trim()
    ? destinatarios.filter((d) =>
        d.nombre.toLowerCase().includes(destSearch.toLowerCase())
      )
    : destinatarios;

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
          placeholder="Título de la comunicación"
          placeholderTextColor="#AAA"
          value={titulo}
          onChangeText={setTitulo}
        />

        {/* Contenido */}
        <FieldLabel label="Contenido" required />
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Escribe el mensaje..."
          placeholderTextColor="#AAA"
          value={contenido}
          onChangeText={setContenido}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Resumen */}
        <FieldLabel label="Resumen (opcional)" />
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Resumen breve..."
          placeholderTextColor="#AAA"
          value={resumen}
          onChangeText={setResumen}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* Tipo */}
        <InlineDropdown
          label="Tipo"
          value={tipo}
          options={TIPOS}
          show={showTipo}
          onToggle={() => { setShowTipo((v) => !v); setShowPrioridad(false); }}
          onSelect={(v) => { setTipo(v as typeof tipo); setShowTipo(false); }}
          required
        />

        {/* Prioridad */}
        <InlineDropdown
          label="Prioridad"
          value={prioridad}
          options={PRIORIDADES}
          show={showPrioridad}
          onToggle={() => { setShowPrioridad((v) => !v); setShowTipo(false); }}
          onSelect={(v) => { setPrioridad(v as typeof prioridad); setShowPrioridad(false); }}
          required
        />

        {/* Grupos destinatarios */}
        <FieldLabel label="Grupos destinatarios" />
        {loadingData ? (
          <ActivityIndicator size="small" color={PANTONE_295C} style={styles.loaderSmall} />
        ) : (
          <View style={styles.checkboxList}>
            {grupos.map((g) => {
              const checked = selectedGrupos.has(g.id);
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.checkboxRow}
                  onPress={() => toggleGrupo(g.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    source={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={checked ? PANTONE_295C : '#AAA'}
                  />
                  <Text style={styles.checkboxLabel}>
                    {g.nombre}
                    {g.num_miembros > 0 ? ` (${g.num_miembros})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Destinatarios individuales */}
        <FieldLabel label="Destinatarios individuales" />
        <TextInput
          style={[styles.textInput, styles.searchInput]}
          placeholder="Buscar miembro..."
          placeholderTextColor="#AAA"
          value={destSearch}
          onChangeText={setDestSearch}
        />
        {selectedDestinatarios.size > 0 && (
          <Text style={styles.selectedCount}>
            {selectedDestinatarios.size} seleccionado(s)
          </Text>
        )}
        {loadingData ? (
          <ActivityIndicator size="small" color={PANTONE_295C} style={styles.loaderSmall} />
        ) : (
          <View style={styles.checkboxList}>
            {filteredDestinatarios.slice(0, 50).map((d) => {
              const checked = selectedDestinatarios.has(d.id);
              return (
                <TouchableOpacity
                  key={d.id}
                  style={styles.checkboxRow}
                  onPress={() => toggleDestinatario(d.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    source={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={checked ? PANTONE_295C : '#AAA'}
                  />
                  <View style={styles.destInfo}>
                    <Text style={styles.checkboxLabel}>{d.nombre}</Text>
                    {d.email ? (
                      <Text style={styles.destEmail}>{d.email}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
            {filteredDestinatarios.length > 50 && (
              <Text style={styles.masText}>
                Mostrando 50 de {filteredDestinatarios.length}. Usa la búsqueda para filtrar.
              </Text>
            )}
            {filteredDestinatarios.length === 0 && destSearch.trim() && (
              <Text style={styles.emptyText}>Sin resultados.</Text>
            )}
          </View>
        )}

        {/* Error */}
        {formError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* Guardar */}
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
              {isEdit ? 'Guardar cambios' : 'Guardar borrador'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    marginTop: 16,
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
    minHeight: 90,
  },
  searchInput: {
    marginBottom: 8,
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
  checkboxList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  destInfo: {
    flex: 1,
  },
  destEmail: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  selectedCount: {
    fontSize: 12,
    color: PANTONE_295C,
    fontWeight: '600',
    marginBottom: 6,
  },
  loaderSmall: {
    marginVertical: 12,
  },
  masText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    padding: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    padding: 12,
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
    marginTop: 24,
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
