import React, { useCallback, useEffect, useState } from 'react';
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
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PANTONE_295C } from '../../theme/colors';
import {
  crearTransaccion,
  editarTransaccion,
  listarCategorias,
  listarCuentas,
  Transaccion,
  CategoriaTransaccion,
  CuentaFondo,
  TIPOS_TRANSACCION,
  MEDIOS_PAGO,
} from '../../api/finanzas';

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

function parseDateStr(str: string | undefined): Date {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

export default function TransaccionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const transaccion: Transaccion | undefined = route.params?.transaccion;
  const isEdit = !!transaccion;

  const [tipo, setTipo] = useState(transaccion?.tipo ?? '');
  const [categoriaId, setCategoriaId] = useState<number | null>(transaccion?.categoria?.id ?? null);
  const [cuentaId, setCuentaId] = useState<number | null>(transaccion?.cuenta?.id ?? null);
  const [monto, setMonto] = useState(
    transaccion?.monto ? String(Math.round(Number(transaccion.monto))) : '',
  );
  const [fecha, setFecha] = useState<Date>(parseDateStr(transaccion?.fecha));
  const [medio, setMedio] = useState(transaccion?.medio ?? '');
  const [observaciones, setObservaciones] = useState(transaccion?.observaciones ?? '');

  const [categorias, setCategorias] = useState<CategoriaTransaccion[]>([]);
  const [cuentas, setCuentas] = useState<CuentaFondo[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingCuentas, setLoadingCuentas] = useState(false);

  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
  const [showCuentaDropdown, setShowCuentaDropdown] = useState(false);
  const [showMedioDropdown, setShowMedioDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCuentas = useCallback(async () => {
    setLoadingCuentas(true);
    try {
      const data = await listarCuentas();
      setCuentas(data);
    } catch {
      setCuentas([]);
    } finally {
      setLoadingCuentas(false);
    }
  }, []);

  const loadCategorias = useCallback(async (tipoFiltro: string) => {
    setLoadingCategorias(true);
    try {
      const all = await listarCategorias();
      const filtered = tipoFiltro ? all.filter((c) => c.tipo === tipoFiltro) : all;
      setCategorias(filtered);
    } catch {
      setCategorias([]);
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  useEffect(() => {
    loadCuentas();
    loadCategorias(tipo);
  }, [loadCuentas, loadCategorias, tipo]);

  const handleTipoSelect = (val: string) => {
    setTipo(val);
    setCategoriaId(null);
    setShowTipoDropdown(false);
    loadCategorias(val);
  };

  const validate = (): boolean => {
    if (!tipo) { setFormError('El tipo es obligatorio.'); return false; }
    if (!categoriaId) { setFormError('La categoría es obligatoria.'); return false; }
    if (!cuentaId) { setFormError('La cuenta es obligatoria.'); return false; }
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setFormError('El monto debe ser un número mayor a 0.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const fields = {
        tipo,
        categoria_id: categoriaId!,
        cuenta_id: cuentaId!,
        monto: parseFloat(monto),
        fecha: toISODateStr(fecha),
        medio: medio || undefined,
        observaciones: observaciones || undefined,
      };
      if (isEdit) {
        await editarTransaccion(transaccion!.id, fields);
      } else {
        await crearTransaccion(fields);
      }
      navigation.goBack();
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al guardar la transacción.';
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

  const tipoLabel = TIPOS_TRANSACCION.find((t) => t.value === tipo)?.label;
  // Fallback to transaccion.categoria.nombre while categorias async-load
  const categoriaLabel =
    categorias.find((c) => c.id === categoriaId)?.nombre ??
    (categoriaId ? transaccion?.categoria?.nombre : undefined);
  const cuentaLabel =
    cuentas.find((c) => c.id === cuentaId)?.nombre ??
    (cuentaId ? transaccion?.cuenta?.nombre : undefined);
  // Fallback to raw value for legacy/unknown medio values
  const medioLabel = MEDIOS_PAGO.find((m) => m.value === medio)?.label ?? (medio || undefined);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo */}
        <FieldLabel label="Tipo" required />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowTipoDropdown((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectBtnText, !tipo && { color: '#AAA' }]}>
            {tipoLabel ?? 'Seleccionar tipo...'}
          </Text>
          <Icon source={showTipoDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
        </TouchableOpacity>
        {showTipoDropdown && (
          <View style={styles.inlineDropdown}>
            {TIPOS_TRANSACCION.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.selectOption, tipo === item.value && styles.selectOptionActive]}
                onPress={() => handleTipoSelect(item.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectOptionText, tipo === item.value && styles.selectOptionTextActive]}>
                  {item.label}
                </Text>
                {tipo === item.value && <Icon source="check" size={18} color={PANTONE_295C} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Categoría */}
        <FieldLabel label="Categoría" required />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowCategoriaDropdown((v) => !v)}
          activeOpacity={0.75}
        >
          {loadingCategorias ? (
            <ActivityIndicator size="small" color={PANTONE_295C} />
          ) : (
            <Text style={[styles.selectBtnText, !categoriaId && { color: '#AAA' }]}>
              {categoriaLabel ?? 'Seleccionar categoría...'}
            </Text>
          )}
          <Icon source={showCategoriaDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
        </TouchableOpacity>
        {showCategoriaDropdown && !loadingCategorias && (
          <View style={styles.inlineDropdown}>
            {categorias.length === 0 ? (
              <Text style={styles.emptyDropdown}>
                {tipo ? 'Sin categorías para este tipo.' : 'Seleccione un tipo primero.'}
              </Text>
            ) : (
              categorias.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.selectOption, categoriaId === item.id && styles.selectOptionActive]}
                  onPress={() => { setCategoriaId(item.id); setShowCategoriaDropdown(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectOptionText, categoriaId === item.id && styles.selectOptionTextActive]}>
                    {item.nombre}
                  </Text>
                  {categoriaId === item.id && <Icon source="check" size={18} color={PANTONE_295C} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Cuenta */}
        <FieldLabel label="Cuenta" required />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowCuentaDropdown((v) => !v)}
          activeOpacity={0.75}
        >
          {loadingCuentas ? (
            <ActivityIndicator size="small" color={PANTONE_295C} />
          ) : (
            <Text style={[styles.selectBtnText, !cuentaId && { color: '#AAA' }]}>
              {cuentaLabel ?? 'Seleccionar cuenta...'}
            </Text>
          )}
          <Icon source={showCuentaDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
        </TouchableOpacity>
        {showCuentaDropdown && !loadingCuentas && (
          <View style={styles.inlineDropdown}>
            {cuentas.length === 0 ? (
              <Text style={styles.emptyDropdown}>Sin cuentas disponibles.</Text>
            ) : (
              cuentas.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.selectOption, cuentaId === item.id && styles.selectOptionActive]}
                  onPress={() => { setCuentaId(item.id); setShowCuentaDropdown(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectOptionText, cuentaId === item.id && styles.selectOptionTextActive]}>
                    {item.nombre}
                  </Text>
                  {cuentaId === item.id && <Icon source="check" size={18} color={PANTONE_295C} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Monto */}
        <FieldLabel label="Monto" required />
        <TextInput
          style={styles.textInput}
          placeholder="0"
          placeholderTextColor="#AAA"
          value={monto}
          onChangeText={setMonto}
          keyboardType="decimal-pad"
        />

        {/* Fecha */}
        <FieldLabel label="Fecha" required />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.selectBtnText}>{formatDateDisplay(fecha)}</Text>
          <Icon source="calendar-outline" size={20} color="#888" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={fecha}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_e, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setFecha(date);
            }}
          />
        )}

        {/* Medio de pago */}
        <FieldLabel label="Medio de pago" />
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowMedioDropdown((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[styles.selectBtnText, !medio && { color: '#AAA' }]}>
            {medioLabel ?? 'Seleccionar medio (opcional)...'}
          </Text>
          <Icon source={showMedioDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
        </TouchableOpacity>
        {showMedioDropdown && (
          <View style={styles.inlineDropdown}>
            <TouchableOpacity
              style={[styles.selectOption, !medio && styles.selectOptionActive]}
              onPress={() => { setMedio(''); setShowMedioDropdown(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectOptionText, !medio && styles.selectOptionTextActive]}>
                Sin especificar
              </Text>
              {!medio && <Icon source="check" size={18} color={PANTONE_295C} />}
            </TouchableOpacity>
            {MEDIOS_PAGO.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.selectOption, medio === item.value && styles.selectOptionActive]}
                onPress={() => { setMedio(item.value); setShowMedioDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.selectOptionText, medio === item.value && styles.selectOptionTextActive]}>
                  {item.label}
                </Text>
                {medio === item.value && <Icon source="check" size={18} color={PANTONE_295C} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Observaciones */}
        <FieldLabel label="Observaciones" />
        <TextInput
          style={[styles.textInput, styles.textInputMultiline]}
          placeholder="Observaciones adicionales (opcional)"
          placeholderTextColor="#AAA"
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear transacción'}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 14,
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
    minHeight: 80,
    textAlignVertical: 'top',
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
  emptyDropdown: {
    padding: 14,
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
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
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
});
