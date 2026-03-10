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
  crearArticulo,
  actualizarArticulo,
  listarCategorias,
  listarUbicaciones,
  listarProveedores,
  Articulo,
  CategoriaInventario,
  Ubicacion,
  Proveedor,
  UnidadMedida,
  TipoArticulo,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_ARTICULO_OPTIONS: {
  value: TipoArticulo;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
}[] = [
  {
    value: 'individual',
    label: 'Individual (Codificado)',
    subtitle: 'Cada unidad física tiene código único. Ej: proyector, guitarra',
    icon: 'package-variant-closed',
    color: PANTONE_295C,
  },
  {
    value: 'granel',
    label: 'A Granel',
    subtitle: 'Conjunto de unidades intercambiables sin código. Ej: 50 sillas, 30 biblias',
    icon: 'layers-outline',
    color: '#7B1FA2',
  },
  {
    value: 'consumible',
    label: 'Consumible',
    subtitle: 'Se consume y no se devuelve. Ej: hojas, lapiceros, café',
    icon: 'beaker-outline',
    color: '#388E3C',
  },
];

const UNIDADES_OPTIONS: { value: UnidadMedida; label: string }[] = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'par', label: 'Par' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'gramo', label: 'Gramo' },
  { value: 'litro', label: 'Litro' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'metro', label: 'Metro' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'resma', label: 'Resma' },
  { value: 'galon', label: 'Galón' },
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

function SectionHeader({ title, color }: { title: string; color?: string }) {
  return <Text style={[styles.sectionHeader, color ? { color } : {}]}>{title}</Text>;
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
              {value === opt.value && <Icon source="check" size={18} color={PANTONE_295C} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ArticuloFormScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const articulo: Articulo | undefined = route.params?.articulo;
  const isEdit = !!articulo;

  // ─── Tipo artículo ────────────────────────────────────────────────────────
  const [tipoArticulo, setTipoArticulo] = useState<TipoArticulo>(
    articulo?.tipo_articulo ?? 'individual',
  );

  // ─── Common fields ────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(articulo?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(articulo?.descripcion ?? '');
  const [notas, setNotas] = useState(articulo?.notas ?? '');
  const [selectedCategoria, setSelectedCategoria] = useState<{
    id: number;
    nombre: string;
  } | null>(
    articulo?.categoria_data
      ? { id: articulo.categoria, nombre: articulo.categoria_data.nombre }
      : null,
  );
  const [selectedUbicacion, setSelectedUbicacion] = useState<{
    id: number;
    nombre: string;
  } | null>(
    articulo?.ubicacion_data && articulo.ubicacion !== null
      ? { id: articulo.ubicacion, nombre: articulo.ubicacion_data.nombre }
      : null,
  );
  const [selectedProveedor, setSelectedProveedor] = useState<{
    id: number;
    nombre: string;
  } | null>(null);

  // ─── Individual fields ────────────────────────────────────────────────────
  const [codigo, setCodigo] = useState(articulo?.codigo ?? '');
  const [marca, setMarca] = useState(articulo?.marca ?? '');
  const [modelo, setModelo] = useState(articulo?.modelo ?? '');
  const [numeroSerie, setNumeroSerie] = useState(articulo?.numero_serie ?? '');
  const [valorAdquisicion, setValorAdquisicion] = useState(
    articulo?.valor_adquisicion ?? '',
  );
  const [fechaAdquisicion, setFechaAdquisicion] = useState(
    articulo?.fecha_adquisicion ?? '',
  );

  // ─── Granel / Consumible fields ───────────────────────────────────────────
  const [cantidad, setCantidad] = useState(
    articulo?.cantidad != null ? String(articulo.cantidad) : '',
  );
  const [unidadMedida, setUnidadMedida] = useState<UnidadMedida>(
    articulo?.unidad_medida ?? 'unidad',
  );
  const [stockMinimo, setStockMinimo] = useState(
    articulo?.stock_minimo != null ? String(articulo.stock_minimo) : '',
  );

  // ─── Dropdown visibility ──────────────────────────────────────────────────
  const [showUnidad, setShowUnidad] = useState(false);

  // ─── Lookup data ──────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // ─── Save state ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Load lookup data ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [catsData, ubicData, provData] = await Promise.all([
          listarCategorias(),
          listarUbicaciones(),
          listarProveedores(),
        ]);
        setCategorias(catsData.results ?? []);
        setUbicaciones(ubicData.results ?? []);
        const provList = provData.results ?? [];
        setProveedores(provList);
        if (articulo?.proveedor) {
          const prov = provList.find((p: Proveedor) => p.id === articulo.proveedor);
          if (prov) setSelectedProveedor({ id: prov.id, nombre: prov.nombre });
        }
      } catch {
        // Non-critical — proceed with empty lists
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Alert-based pickers ──────────────────────────────────────────────────
  const openCategoriaPicker = () => {
    if (loadingData) return;
    Alert.alert('Seleccionar Categoría', '', [
      { text: 'Sin categoría', onPress: () => setSelectedCategoria(null) },
      ...categorias.map((c) => ({
        text: c.nombre,
        onPress: () => setSelectedCategoria({ id: c.id, nombre: c.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const openUbicacionPicker = () => {
    if (loadingData) return;
    Alert.alert('Seleccionar Ubicación', '', [
      { text: 'Sin ubicación', onPress: () => setSelectedUbicacion(null) },
      ...ubicaciones.map((u) => ({
        text: u.nombre,
        onPress: () => setSelectedUbicacion({ id: u.id, nombre: u.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const openProveedorPicker = () => {
    if (loadingData) return;
    Alert.alert('Seleccionar Proveedor', '', [
      { text: 'Sin proveedor', onPress: () => setSelectedProveedor(null) },
      ...proveedores.map((p) => ({
        text: p.nombre,
        onPress: () => setSelectedProveedor({ id: p.id, nombre: p.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  // ─── Validation & Submit ──────────────────────────────────────────────────
  const handleSave = async () => {
    setFormError(null);

    if (!nombre.trim()) {
      setFormError('El nombre del artículo es obligatorio.');
      return;
    }
    if (!selectedCategoria) {
      setFormError('La categoría es obligatoria.');
      return;
    }
    if (tipoArticulo === 'individual' && !codigo.trim()) {
      setFormError('El código es obligatorio para artículos individuales.');
      return;
    }
    if (tipoArticulo !== 'individual') {
      const cantNum = parseInt(cantidad, 10);
      if (isNaN(cantNum) || cantNum < 0) {
        setFormError('La cantidad debe ser un número válido mayor o igual a 0.');
        return;
      }
      if (tipoArticulo === 'consumible') {
        if (!unidadMedida) {
          setFormError('La unidad de medida es obligatoria para consumibles.');
          return;
        }
        if (!stockMinimo.trim()) {
          setFormError('El stock mínimo es obligatorio para consumibles.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: Partial<Articulo> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tipo_articulo: tipoArticulo,
        categoria: selectedCategoria.id,
        ubicacion: selectedUbicacion?.id ?? null,
        proveedor: selectedProveedor?.id ?? null,
        notas: notas.trim(),
      };

      if (tipoArticulo === 'individual') {
        payload.codigo = codigo.trim() || undefined;
        payload.marca = marca.trim();
        payload.modelo = modelo.trim();
        payload.numero_serie = numeroSerie.trim();
        payload.valor_adquisicion = valorAdquisicion.trim() || null;
        payload.fecha_adquisicion = fechaAdquisicion.trim() || null;
        payload.cantidad = 1;
        payload.unidad_medida = 'unidad';
        payload.stock_minimo = null;
      } else {
        payload.cantidad = parseInt(cantidad, 10) || 0;
        payload.unidad_medida = unidadMedida;
        payload.stock_minimo = stockMinimo.trim() ? parseInt(stockMinimo, 10) : null;
      }

      if (isEdit && articulo) {
        await actualizarArticulo(articulo.id, payload);
        Alert.alert('Guardado', 'Artículo actualizado correctamente.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await crearArticulo(payload);
        Alert.alert('Creado', 'Artículo agregado al inventario.', [
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

  const selectedTipoOpt = TIPO_ARTICULO_OPTIONS.find((t) => t.value === tipoArticulo)!;

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
        {/* ── Tipo de Artículo ─────────────────────────────────────────── */}
        <SectionHeader title="Tipo de Artículo" />
        <View style={styles.sectionCard}>
          {TIPO_ARTICULO_OPTIONS.map((opt) => {
            const isSelected = tipoArticulo === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.tipoCard,
                  isSelected && { borderColor: opt.color, backgroundColor: opt.color + '12' },
                ]}
                onPress={() => {
                  setTipoArticulo(opt.value);
                  setShowUnidad(false);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.tipoIconBox, { backgroundColor: opt.color + '20' }]}>
                  <Icon source={opt.icon} size={22} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tipoLabel, isSelected && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.tipoSubtitle} numberOfLines={2}>
                    {opt.subtitle}
                  </Text>
                </View>
                {isSelected && <Icon source="check-circle" size={20} color={opt.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Información General ───────────────────────────────────────── */}
        <SectionHeader title="Información General" />
        <View style={styles.sectionCard}>
          <FieldLabel label="Nombre" required />
          <TextInput
            style={styles.textInput}
            placeholder="Nombre del artículo..."
            placeholderTextColor="#AAA"
            value={nombre}
            onChangeText={setNombre}
          />

          <FieldLabel label="Descripción" />
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            placeholder="Descripción del artículo..."
            placeholderTextColor="#AAA"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <FieldLabel label="Categoría" required />
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={openCategoriaPicker}
            activeOpacity={0.75}
          >
            {loadingData ? (
              <ActivityIndicator size="small" color={PANTONE_295C} />
            ) : (
              <>
                <Text style={[styles.selectBtnText, !selectedCategoria && { color: '#AAA' }]}>
                  {selectedCategoria?.nombre ?? 'Seleccionar categoría...'}
                </Text>
                <Icon source="chevron-down" size={18} color="#888" />
              </>
            )}
          </TouchableOpacity>

          <FieldLabel label="Ubicación (opcional)" />
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={openUbicacionPicker}
            activeOpacity={0.75}
          >
            {loadingData ? (
              <ActivityIndicator size="small" color={PANTONE_295C} />
            ) : (
              <>
                <Text style={[styles.selectBtnText, !selectedUbicacion && { color: '#AAA' }]}>
                  {selectedUbicacion?.nombre ?? 'Sin ubicación asignada'}
                </Text>
                <Icon source="chevron-down" size={18} color="#888" />
              </>
            )}
          </TouchableOpacity>

          <FieldLabel label="Proveedor (opcional)" />
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={openProveedorPicker}
            activeOpacity={0.75}
          >
            {loadingData ? (
              <ActivityIndicator size="small" color={PANTONE_295C} />
            ) : (
              <>
                <Text style={[styles.selectBtnText, !selectedProveedor && { color: '#AAA' }]}>
                  {selectedProveedor?.nombre ?? 'Sin proveedor'}
                </Text>
                <Icon source="chevron-down" size={18} color="#888" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Individual fields ─────────────────────────────────────────── */}
        {tipoArticulo === 'individual' && (
          <>
            <SectionHeader title="Identificación del Equipo" color={PANTONE_295C} />
            <View style={styles.sectionCard}>
              <FieldLabel label="Código" required />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: PROY-EP-001"
                placeholderTextColor="#AAA"
                value={codigo}
                onChangeText={setCodigo}
                autoCapitalize="characters"
              />

              <FieldLabel label="Marca" />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Sony, Samsung..."
                placeholderTextColor="#AAA"
                value={marca}
                onChangeText={setMarca}
              />

              <FieldLabel label="Modelo" />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: WH-1000XM4"
                placeholderTextColor="#AAA"
                value={modelo}
                onChangeText={setModelo}
              />

              <FieldLabel label="Número de Serie" />
              <TextInput
                style={styles.textInput}
                placeholder="Número de serie..."
                placeholderTextColor="#AAA"
                value={numeroSerie}
                onChangeText={setNumeroSerie}
              />

              <FieldLabel label="Valor de Adquisición" />
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#AAA"
                value={valorAdquisicion}
                onChangeText={setValorAdquisicion}
                keyboardType="decimal-pad"
              />

              <FieldLabel label="Fecha de Adquisición (YYYY-MM-DD)" />
              <TextInput
                style={styles.textInput}
                placeholder="2024-01-15"
                placeholderTextColor="#AAA"
                value={fechaAdquisicion}
                onChangeText={setFechaAdquisicion}
              />
            </View>
          </>
        )}

        {/* ── Granel fields ─────────────────────────────────────────────── */}
        {tipoArticulo === 'granel' && (
          <>
            <SectionHeader title="Stock a Granel" color="#7B1FA2" />
            <View style={styles.sectionCard}>
              <FieldLabel label="Cantidad total" required />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 50"
                placeholderTextColor="#AAA"
                value={cantidad}
                onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />

              <InlineDropdown
                label="Unidad de medida"
                value={unidadMedida}
                options={UNIDADES_OPTIONS}
                show={showUnidad}
                onToggle={() => setShowUnidad((v) => !v)}
                onSelect={(v) => {
                  setUnidadMedida(v as UnidadMedida);
                  setShowUnidad(false);
                }}
              />

              <FieldLabel label="Stock mínimo (opcional)" />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 5"
                placeholderTextColor="#AAA"
                value={stockMinimo}
                onChangeText={(t) => setStockMinimo(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {/* ── Consumible fields ─────────────────────────────────────────── */}
        {tipoArticulo === 'consumible' && (
          <>
            <SectionHeader title="Stock Consumible" color="#388E3C" />
            <View style={styles.sectionCard}>
              <FieldLabel label="Cantidad actual" required />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 100"
                placeholderTextColor="#AAA"
                value={cantidad}
                onChangeText={(t) => setCantidad(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />

              <InlineDropdown
                label="Unidad de medida"
                value={unidadMedida}
                options={UNIDADES_OPTIONS}
                show={showUnidad}
                onToggle={() => setShowUnidad((v) => !v)}
                onSelect={(v) => {
                  setUnidadMedida(v as UnidadMedida);
                  setShowUnidad(false);
                }}
                required
              />

              <FieldLabel label="Stock mínimo" required />
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 10"
                placeholderTextColor="#AAA"
                value={stockMinimo}
                onChangeText={(t) => setStockMinimo(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {/* ── Notas ─────────────────────────────────────────────────────── */}
        <SectionHeader title="Notas" />
        <View style={styles.sectionCard}>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            placeholder="Notas adicionales sobre el artículo..."
            placeholderTextColor="#AAA"
            value={notas}
            onChangeText={setNotas}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Error banner */}
        {!!formError && (
          <View style={styles.errorBanner}>
            <Icon source="alert-circle-outline" size={16} color="#E53935" />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: selectedTipoOpt.color },
            saving && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon
                source={isEdit ? 'content-save-outline' : 'plus-circle-outline'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Guardar cambios' : 'Crear artículo'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 12 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  // ── Tipo selector ──
  tipoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  tipoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  tipoSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  // ── Inputs ──
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    minHeight: 44,
  },
  selectBtnText: {
    flex: 1,
    fontSize: 14,
    color: '#222',
  },
  inlineDropdown: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginTop: 2,
    overflow: 'hidden',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectOptionActive: { backgroundColor: '#EAF2FF' },
  selectOptionText: { fontSize: 14, color: '#333' },
  selectOptionTextActive: { color: PANTONE_295C, fontWeight: '600' },
  // ── Error / Save ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: { flex: 1, color: '#E53935', fontSize: 13 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bottomSpacer: { height: 32 },
});
