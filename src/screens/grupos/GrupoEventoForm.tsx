import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { crearEvento, actualizarEvento, TIPOS_EVENTO, ESTADOS_EVENTO } from '../../api/eventos';
import { PANTONE_295C } from '../../theme/colors';

function formatDateDisplay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GrupoEventoFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { grupoId, evento } = route.params ?? {};
  const isEdit = !!evento;

  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(evento?.descripcion ?? '');
  const [tipo, setTipo] = useState(evento?.tipo ?? 'reunion');
  const [estado, setEstado] = useState(evento?.estado ?? 'planificado');
  const [esOnline, setEsOnline] = useState(evento?.es_online ?? false);
  const [linkOnline, setLinkOnline] = useState(evento?.link_online ?? '');
  const [ubicacion, setUbicacion] = useState(evento?.ubicacion ?? '');
  const [capacidadMaxima, setCapacidadMaxima] = useState(
    evento?.capacidad_maxima != null ? String(evento.capacidad_maxima) : ''
  );

  const parseInitialDate = (raw: string | null | undefined, fallback: Date) => {
    if (!raw) return fallback;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? fallback : d;
  };

  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  const [fechaInicio, setFechaInicio] = useState<Date>(parseInitialDate(evento?.fecha_inicio, defaultStart));
  const [fechaFin, setFechaFin] = useState<Date | null>(
    evento?.fecha_fin ? parseInitialDate(evento.fecha_fin, null as any) : null
  );
  const [hasFechaFin, setHasFechaFin] = useState(!!evento?.fecha_fin);

  // Picker visibility states
  const [showInicioPicker, setShowInicioPicker] = useState(false);
  const [showFinPicker, setShowFinPicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (hasFechaFin && fechaFin && fechaFin <= fechaInicio) {
      setError('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    if (esOnline && !linkOnline.trim()) {
      setError('El link es requerido para eventos online.');
      return;
    }
    if (capacidadMaxima && isNaN(parseInt(capacidadMaxima, 10))) {
      setError('La capacidad máxima debe ser un número.');
      return;
    }

    const payload: Record<string, any> = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      tipo,
      estado,
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: hasFechaFin && fechaFin ? fechaFin.toISOString() : null,
      ubicacion: ubicacion.trim(),
      es_online: esOnline,
      link_online: esOnline ? linkOnline.trim() : '',
      capacidad_maxima: capacidadMaxima ? parseInt(capacidadMaxima, 10) : null,
      grupos_ids: [grupoId],
    };

    setSaving(true);
    try {
      if (isEdit) {
        await actualizarEvento(evento.id, payload);
      } else {
        await crearEvento(payload);
      }
      navigation.goBack();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.detail ?? data?.titulo?.[0] ?? data?.fecha_inicio?.[0] ?? data?.non_field_errors?.[0] ??
        'Error al guardar el evento.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {error ? (
          <View style={styles.errorBanner}>
            <Icon source="alert-circle-outline" size={18} color="#B71C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Título */}
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej: Reunión semanal"
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
          placeholder="Describe el evento..."
          placeholderTextColor="#AAA"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          editable={!saving}
        />

        {/* Tipo */}
        <Text style={styles.label}>Tipo de Evento</Text>
        <View style={styles.chipGroup}>
          {TIPOS_EVENTO.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, tipo === t.value && styles.chipSelected]}
              onPress={() => setTipo(t.value)}
              disabled={saving}
            >
              <Text style={[styles.chipText, tipo === t.value && styles.chipTextSelected]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fecha inicio */}
        <Text style={styles.label}>Fecha y hora de inicio *</Text>
        <TouchableOpacity style={[styles.input, styles.pickerBtn]} onPress={() => setShowInicioPicker(true)} disabled={saving}>
          <Icon source="calendar-clock" size={18} color="#666" />
          <Text style={styles.pickerBtnText}>{formatDateDisplay(fechaInicio)}</Text>
        </TouchableOpacity>
        {showInicioPicker && (
          <DateTimePicker
            value={fechaInicio}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, date) => {
              setShowInicioPicker(Platform.OS === 'ios');
              if (date) setFechaInicio(date);
            }}
          />
        )}

        {/* Fecha fin */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Fecha de fin</Text>
          <Switch
            value={hasFechaFin}
            onValueChange={(v) => {
              setHasFechaFin(v);
              if (v && !fechaFin) {
                const end = new Date(fechaInicio);
                end.setHours(end.getHours() + 2);
                setFechaFin(end);
              }
            }}
            trackColor={{ true: PANTONE_295C }}
            disabled={saving}
          />
        </View>
        {hasFechaFin && fechaFin ? (
          <>
            <TouchableOpacity style={[styles.input, styles.pickerBtn]} onPress={() => setShowFinPicker(true)} disabled={saving}>
              <Icon source="calendar-clock" size={18} color="#666" />
              <Text style={styles.pickerBtnText}>{formatDateDisplay(fechaFin)}</Text>
            </TouchableOpacity>
            {showFinPicker && (
              <DateTimePicker
                value={fechaFin}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={fechaInicio}
                onChange={(_, date) => {
                  setShowFinPicker(Platform.OS === 'ios');
                  if (date) setFechaFin(date);
                }}
              />
            )}
          </>
        ) : null}

        {/* Es online */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Evento online</Text>
          <Switch
            value={esOnline}
            onValueChange={setEsOnline}
            trackColor={{ true: PANTONE_295C }}
            disabled={saving}
          />
        </View>

        {esOnline ? (
          <>
            <Text style={styles.label}>Link del evento *</Text>
            <TextInput
              style={styles.input}
              value={linkOnline}
              onChangeText={setLinkOnline}
              placeholder="https://..."
              placeholderTextColor="#AAA"
              keyboardType="url"
              autoCapitalize="none"
              editable={!saving}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Ubicación</Text>
            <TextInput
              style={styles.input}
              value={ubicacion}
              onChangeText={setUbicacion}
              placeholder="Dirección o lugar del evento"
              placeholderTextColor="#AAA"
              editable={!saving}
            />
          </>
        )}

        {/* Capacidad */}
        <Text style={styles.label}>Capacidad máxima</Text>
        <TextInput
          style={styles.input}
          value={capacidadMaxima}
          onChangeText={setCapacidadMaxima}
          placeholder="Dejar vacío si no hay límite"
          placeholderTextColor="#AAA"
          keyboardType="number-pad"
          editable={!saving}
        />

        {/* Estado */}
        <Text style={styles.label}>Estado</Text>
        <View style={styles.chipGroup}>
          {ESTADOS_EVENTO.map((e) => (
            <TouchableOpacity
              key={e.value}
              style={[styles.chip, estado === e.value && styles.chipSelected]}
              onPress={() => setEstado(e.value)}
              disabled={saving}
            >
              <Text style={[styles.chipText, estado === e.value && styles.chipTextSelected]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear evento'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
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
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerBtnText: { fontSize: 15, color: '#222', flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
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
});
