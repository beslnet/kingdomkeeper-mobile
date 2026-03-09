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
  EstadoArticulo,
  UnidadMedida,
} from '../../api/inventario';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS_OPTIONS: { value: EstadoArticulo; label: string }[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_uso', label: 'En uso' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'dañado', label: 'Dañado' },
  { value: 'baja', label: 'Baja' },
];

const UNIDADES_OPTIONS: { value: UnidadMedida; label: string }[] = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'par', label: 'Par' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
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

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ArticuloFormScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const articulo: Articulo | undefined = route.params?.articulo;
  const isEdit = !!articulo;

  // ─── Form state ───────────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(articulo?.nombre ?? '');
  const [codigo, setCodigo] = useState(articulo?.codigo ?? '');
  const [descripcion, setDescripcion] = useState(articulo?.descripcion ?? '');
  const [marca, setMarca] = useState(articulo?.marca ?? '');
  const [modelo, setModelo] = useState(articulo?.modelo ?? '');
  const [numeroSerie, setNumeroSerie] = useState(articulo?.numero_serie ?? '');
  const [unidadMedida, setUnidadMedida] = useState<UnidadMedida>(
    articulo?.unidad_medida ?? 'unidad'
  );
  const [selectedCategoria, setSelectedCategoria] = useState<{
    id: number;
    nombre: string;
  } | null>(
    articulo?.categoria_data
      ? { id: articulo.categoria, nombre: articulo.categoria_data.nombre }
      : null
  );
  const [selectedUbicacion, setSelectedUbicacion] = useState<{
    id: number;
    nombre: string;
  } | null>(
    articulo?.ubicacion_data && articulo.ubicacion !== null
      ? { id: articulo.ubicacion, nombre: articulo.ubicacion_data.nombre }
      : null
  );
  const [cantidad, setCantidad] = useState(String(articulo?.cantidad ?? 1));
  const [stockMinimo, setStockMinimo] = useState(
    articulo?.stock_minimo != null ? String(articulo.stock_minimo) : ''
  );
  const [estado, setEstado] = useState<EstadoArticulo>(articulo?.estado ?? 'disponible');
  const [valorAdquisicion, setValorAdquisicion] = useState(
    articulo?.valor_adquisicion ?? ''
  );
  const [fechaAdquisicion, setFechaAdquisicion] = useState(
    articulo?.fecha_adquisicion ?? ''
  );
  const [selectedProveedor, setSelectedProveedor] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [notas, setNotas] = useState(articulo?.notas ?? '');

  // ─── Dropdown visibility ──────────────────────────────────────────────────
  const [showUnidad, setShowUnidad] = useState(false);
  const [showEstado, setShowEstado] = useState(false);
  const [showAdquisicion, setShowAdquisicion] = useState(false);

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
  }, []);

  // ─── Alert-based pickers ──────────────────────────────────────────────────
  const openCategoriaPicker = () => {
    if (loadingData) return;
    const options: any[] = [
      {
        text: 'Sin categoría',
        onPress: () => setSelectedCategoria(null),
      },
      ...categorias.map((c) => ({
        text: c.nombre,
        onPress: () => setSelectedCategoria({ id: c.id, nombre: c.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' },
    ];
    Alert.alert('Seleccionar Categoría', '', options);
  };

  const openUbicacionPicker = () => {
    if (loadingData) return;
    const options: any[] = [
      {
        text: 'Sin ubicación',
        onPress: () => setSelectedUbicacion(null),
      },
      ...ubicaciones.map((u) => ({
        text: u.nombre,
        onPress: () => setSelectedUbicacion({ id: u.id, nombre: u.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' },
    ];
    Alert.alert('Seleccionar Ubicación', '', options);
  };

  const openProveedorPicker = () => {
    if (loadingData) return;
    const options: any[] = [
      {
        text: 'Sin proveedor',
        onPress: () => setSelectedProveedor(null),
      },
      ...proveedores.map((p) => ({
        text: p.nombre,
        onPress: () => setSelectedProveedor({ id: p.id, nombre: p.nombre }),
      })),
      { text: 'Cancelar', style: 'cancel' },
    ];
    Alert.alert('Seleccionar Proveedor', '', options);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
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
    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum < 1) {
      setFormError('La cantidad debe ser mayor o igual a 1.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Articulo> = {
        nombre: nombre.trim(),
        codigo: codigo.trim() || undefined,
        descripcion: descripcion.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim(),
        unidad_medida: unidadMedida,
        categoria: selectedCategoria.id,
        ubicacion: selectedUbicacion?.id ?? null,
        cantidad: cantidadNum,
        stock_minimo: stockMinimo ? parseInt(stockMinimo, 10) : null,
        estado,
        valor_adquisicion: valorAdquisicion.trim() || null,
        fecha_adquisicion: fechaAdquisicion.trim() || null,
        proveedor: selectedProveedor?.id ?? null,
        notas: notas.trim(),
      };

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
        {/* ── Información Básica ─────────────────────────────────────────── */}
        <SectionHeader title="Información Básica" />
        <View style={styles.sectionCard}>
          <FieldLabel label="Nombre" required />
          <TextInput
            style={styles.textInput}
            placeholder="Nombre del artículo..."
            placeholderTextColor="#AAA"
            value={nombre}
            onChangeText={setNombre}
          />

          <FieldLabel label="Código (opcional)" />
          <TextInput
            style={styles.textInput}
            placeholder="Código o número de inventario..."
            placeholderTextColor="#AAA"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
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
        </View>

        {/* ── Detalles ───────────────────────────────────────────────────── */}
        <SectionHeader title="Detalles" />
        <View style={styles.sectionCard}>
          <FieldLabel label="Marca" />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: Sony, Samsung, 3M..."
            placeholderTextColor="#AAA"
            value={marca}
            onChangeText={setMarca}
          />

          <FieldLabel label="Modelo" />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: WH-1000XM4..."
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

          <InlineDropdown
            label="Unidad de Medida"
            value={unidadMedida}
            options={UNIDADES_OPTIONS}
            show={showUnidad}
            onToggle={() => {
              setShowUnidad((v) => !v);
              setShowEstado(false);
            }}
            onSelect={(v) => {
              setUnidadMedida(v as UnidadMedida);
              setShowUnidad(false);
            }}
          />
        </View>

        {/* ── Categoría y Ubicación ──────────────────────────────────────── */}
        <SectionHeader title="Categoría y Ubicación" />
        <View style={styles.sectionCard}>
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
        </View>

        {/* ── Stock ─────────────────────────────────────────────────────── */}
        <SectionHeader title="Stock" />
        <View style={styles.sectionCard}>
          <FieldLabel label="Cantidad" required />
          <TextInput
            style={styles.textInput}
            placeholder="1"
            placeholderTextColor="#AAA"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
          />

          <FieldLabel label="Stock Mínimo (opcional)" />
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 5"
            placeholderTextColor="#AAA"
            value={stockMinimo}
            onChangeText={setStockMinimo}
            keyboardType="numeric"
          />

          <InlineDropdown
            label="Estado"
            value={estado}
            options={ESTADOS_OPTIONS}
            show={showEstado}
            onToggle={() => {
              setShowEstado((v) => !v);
              setShowUnidad(false);
            }}
            onSelect={(v) => {
              setEstado(v as EstadoArticulo);
              setShowEstado(false);
            }}
          />
        </View>

        {/* ── Adquisición (collapsible) ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setShowAdquisicion((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={styles.collapsibleHeaderText}>Adquisición (opcional)</Text>
          <Icon
            source={showAdquisicion ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={PANTONE_295C}
          />
        </TouchableOpacity>

        {showAdquisicion && (
          <View style={styles.sectionCard}>
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

            <FieldLabel label="Proveedor" />
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
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
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
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 12,
  },
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
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  collapsibleHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: PANTONE_295C,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
  selectOptionActive: {
    backgroundColor: '#EAF2FF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectOptionTextActive: {
    color: PANTONE_295C,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: {
    flex: 1,
    color: '#E53935',
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 32,
  },
});
