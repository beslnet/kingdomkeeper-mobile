import React, { useCallback, useEffect, useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PANTONE_295C } from '../../theme/colors';
import { crearTransaccion, rectificarTransaccion, listarCategorias } from '../../api/finanzas';

const MEDIOS = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Tarjeta', value: 'tarjeta' },
];

export default function RendicionForm() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { grupoId, transaccion, motivoRechazo } = route.params ?? {};

  const isRectifying = !!transaccion;

  const [categorias, setCategorias] = useState<any[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);

  const [categoriaId, setCategoriaId] = useState<string>(transaccion?.categoria_id ? String(transaccion.categoria_id) : '');
  const [fecha, setFecha] = useState<Date>(transaccion?.fecha ? new Date(transaccion.fecha) : new Date());
  const [showFechaPicker, setShowFechaPicker] = useState(false);
  const [monto, setMonto] = useState<string>(transaccion?.monto ? String(transaccion.monto) : '');
  const [medio, setMedio] = useState<string>(transaccion?.medio ?? 'efectivo');
  const [observaciones, setObservaciones] = useState<string>(transaccion?.observaciones ?? '');
  const [usaFondoGeneral, setUsaFondoGeneral] = useState<boolean>(transaccion?.usa_fondo_general ?? false);
  const [archivo, setArchivo] = useState<{ uri: string; type: string; name: string } | null>(null);

  const [saving, setSaving] = useState(false);

  const loadCategorias = useCallback(async () => {
    try {
      setLoadingCat(true);
      const cats = await listarCategorias({ tipo: 'egreso', activo: true });
      setCategorias(cats);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las categorías.');
    } finally {
      setLoadingCat(false);
    }
  }, []);

  useEffect(() => { loadCategorias(); }, [loadCategorias]);

  const pickImage = useCallback(() => {
    Alert.alert('Comprobante', 'Seleccionar desde:', [
      {
        text: 'Cámara',
        onPress: () =>
          launchCamera({ mediaType: 'photo', quality: 0.8 }, (res) => {
            if (!res.didCancel && res.assets?.[0]) {
              const a = res.assets[0];
              setArchivo({ uri: a.uri!, type: a.type ?? 'image/jpeg', name: a.fileName ?? 'comprobante.jpg' });
            }
          }),
      },
      {
        text: 'Galería',
        onPress: () =>
          launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
            if (!res.didCancel && res.assets?.[0]) {
              const a = res.assets[0];
              setArchivo({ uri: a.uri!, type: a.type ?? 'image/jpeg', name: a.fileName ?? 'comprobante.jpg' });
            }
          }),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!categoriaId) { Alert.alert('Error', 'Selecciona una categoría.'); return; }
    const montoNum = parseFloat(monto.replace(',', '.'));
    if (!monto || isNaN(montoNum) || montoNum <= 0) { Alert.alert('Error', 'Ingresa un monto válido.'); return; }

    try {
      setSaving(true);
      const isoFecha = fecha.toISOString().split('T')[0];
      if (isRectifying) {
        await rectificarTransaccion(transaccion.id, {
          categoria_id: categoriaId,
          fecha: isoFecha,
          monto: montoNum,
          medio,
          observaciones,
          _file: archivo,
        });
      } else {
        await crearTransaccion({
          tipo: 'egreso',
          categoria_id: categoriaId,
          fecha: isoFecha,
          monto: montoNum,
          medio,
          observaciones,
          grupo_id: grupoId,
          usa_fondo_general: usaFondoGeneral,
          _file: archivo,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.non_field_errors?.[0] ?? 'No se pudo guardar la rendición.';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  }, [categoriaId, fecha, monto, medio, observaciones, usaFondoGeneral, archivo, grupoId, isRectifying, transaccion, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Motivo rechazo banner (rectificación) */}
          {isRectifying && motivoRechazo ? (
            <View style={styles.warningBanner}>
              <Icon source="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.warningText}><Text style={{ fontWeight: '700' }}>Motivo de rechazo: </Text>{motivoRechazo}</Text>
            </View>
          ) : null}

          {/* Categoría */}
          <Text style={styles.label}>Categoría *</Text>
          {loadingCat ? (
            <ActivityIndicator color={PANTONE_295C} style={{ marginBottom: 16 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, categoriaId === String(cat.id) && styles.chipSelected]}
                  onPress={() => setCategoriaId(String(cat.id))}
                >
                  <Text style={[styles.chipText, categoriaId === String(cat.id) && styles.chipTextSelected]}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Fecha */}
          <Text style={styles.label}>Fecha *</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowFechaPicker(true)}>
            <Text style={styles.inputText}>{fecha.toLocaleDateString('es-CL')}</Text>
            <Icon source="calendar" size={18} color={PANTONE_295C} />
          </TouchableOpacity>
          {showFechaPicker && (
            <DateTimePicker
              value={fecha}
              mode="date"
              display="default"
              onChange={(_, d) => { setShowFechaPicker(false); if (d) setFecha(d); }}
            />
          )}

          {/* Monto */}
          <Text style={styles.label}>Monto (CLP) *</Text>
          <TextInput
            style={styles.textInput}
            value={monto}
            onChangeText={setMonto}
            keyboardType="numeric"
            placeholder="0"
          />

          {/* Medio de pago */}
          <Text style={styles.label}>Medio de pago</Text>
          <View style={styles.chipsRow}>
            {MEDIOS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.chip, medio === m.value && styles.chipSelected]}
                onPress={() => setMedio(m.value)}
              >
                <Text style={[styles.chipText, medio === m.value && styles.chipTextSelected]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Observaciones */}
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Detalle el gasto..."
            multiline
            numberOfLines={3}
          />

          {/* Comprobante */}
          <Text style={styles.label}>Comprobante</Text>
          <TouchableOpacity style={styles.fileBtn} onPress={pickImage}>
            <Icon source={archivo ? 'paperclip-check' : 'paperclip'} size={18} color={PANTONE_295C} />
            <Text style={styles.fileBtnText}>
              {archivo ? archivo.name : 'Adjuntar foto o documento'}
            </Text>
          </TouchableOpacity>
          {archivo ? (
            <TouchableOpacity onPress={() => setArchivo(null)} style={styles.removeFile}>
              <Text style={styles.removeFileText}>✕ Quitar archivo</Text>
            </TouchableOpacity>
          ) : null}

          {/* Usa fondo general */}
          {grupoId ? (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Usar fondos de Tesorería General</Text>
                <Text style={styles.hint}>Requiere aprobación adicional</Text>
              </View>
              <Switch
                value={usaFondoGeneral}
                onValueChange={setUsaFondoGeneral}
                trackColor={{ true: PANTONE_295C }}
              />
            </View>
          ) : null}

          {/* Botón guardar */}
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{isRectifying ? 'Enviar Rectificación' : 'Crear Rendición'}</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6FA' },
  container: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 11, color: '#888', marginTop: 2 },
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4,
  },
  inputText: { color: '#333', fontSize: 15 },
  textInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333', marginBottom: 4,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipsScroll: { flexGrow: 0, marginBottom: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ccc', backgroundColor: '#fff', marginRight: 6, marginBottom: 6,
  },
  chipSelected: { borderColor: PANTONE_295C, backgroundColor: '#EAF2FF' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextSelected: { color: PANTONE_295C, fontWeight: '700' },
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EAF2FF', borderRadius: 10, padding: 12, marginBottom: 4,
  },
  fileBtnText: { color: PANTONE_295C, fontSize: 14, fontWeight: '600' },
  removeFile: { alignSelf: 'flex-start', marginBottom: 4 },
  removeFileText: { fontSize: 12, color: '#C62828' },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 4,
  },
  warningText: { flex: 1, fontSize: 13, color: '#C62828', lineHeight: 18 },
  saveBtn: {
    backgroundColor: PANTONE_295C, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
