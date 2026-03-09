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
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarArticulos,
  crearPrestamo,
  ArticuloList,
} from '../../api/inventario';

// ─── Helper ───────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrestamoFormScreen() {
  const navigation = useNavigation<any>();

  const [articulosDisponibles, setArticulosDisponibles] = useState<ArticuloList[]>([]);
  const [loadingArticulos, setLoadingArticulos] = useState(true);

  const [selectedArticulo, setSelectedArticulo] = useState<ArticuloList | null>(null);
  const [cantidadPrestada, setCantidadPrestada] = useState('1');
  const [prestatarioId, setPrestatarioId] = useState('');
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [condicionEntrega, setCondicionEntrega] = useState('');
  const [notas, setNotas] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load available articles ─────────────────────────────────────────────────

  const loadArticulos = useCallback(async () => {
    setLoadingArticulos(true);
    try {
      // Load all and filter: disponibles or consumibles with stock > 0
      const data = await listarArticulos({ page_size: 200 });
      const prestables = data.results.filter(
        (a) => a.estado === 'disponible' || (a.es_consumible && a.cantidad > 0),
      );
      setArticulosDisponibles(prestables);
    } catch {
      setArticulosDisponibles([]);
    } finally {
      setLoadingArticulos(false);
    }
  }, []);

  useEffect(() => {
    loadArticulos();
  }, [loadArticulos]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const selectArticulo = () => {
    if (loadingArticulos) {
      Alert.alert('Cargando', 'Espera mientras se cargan los artículos disponibles.');
      return;
    }
    if (articulosDisponibles.length === 0) {
      Alert.alert('Sin artículos', 'No hay artículos disponibles para préstamo.');
      return;
    }
    Alert.alert(
      'Seleccionar artículo',
      'Artículos disponibles:',
      [
        ...articulosDisponibles.slice(0, 9).map((a) => ({
          text: a.es_consumible
            ? `${a.nombre}${a.codigo ? ` (${a.codigo})` : ''} — ${a.cantidad} disp.`
            : `${a.nombre}${a.codigo ? ` (${a.codigo})` : ''}`,
          onPress: () => {
            setSelectedArticulo(a);
            setCantidadPrestada('1');
          },
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  const handleSave = async () => {
    if (!selectedArticulo) {
      setError('Debes seleccionar un artículo.');
      return;
    }
    const prestatarioNum = parseInt(prestatarioId, 10);
    if (!prestatarioId.trim() || isNaN(prestatarioNum)) {
      setError('El ID del prestatario es requerido y debe ser un número válido.');
      return;
    }
    const cantNum = parseInt(cantidadPrestada, 10);
    if (isNaN(cantNum) || cantNum < 1) {
      setError('La cantidad a prestar debe ser al menos 1.');
      return;
    }
    if (selectedArticulo.es_consumible && cantNum > selectedArticulo.cantidad) {
      setError(`Stock insuficiente. Disponible: ${selectedArticulo.cantidad} ${selectedArticulo.unidad_medida}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await crearPrestamo({
        articulo: selectedArticulo.id,
        prestatario: prestatarioNum,
        cantidad_prestada: cantNum,
        fecha_devolucion_esperada: fechaDevolucion.trim() || null,
        condicion_entrega: condicionEntrega.trim(),
        notas: notas.trim(),
      });
      navigation.navigate('Prestamos', { refresh: true });
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

  // ─── Main render ────────────────────────────────────────────────────────────

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
          <TouchableOpacity
            style={[styles.selectButton, !selectedArticulo && styles.selectButtonEmpty]}
            onPress={selectArticulo}
          >
            <View style={styles.selectButtonContent}>
              {loadingArticulos ? (
                <ActivityIndicator size="small" color={PANTONE_295C} />
              ) : selectedArticulo ? (
                <>
                  <Icon source="package-variant" size={18} color={PANTONE_295C} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectButtonText} numberOfLines={1}>
                      {selectedArticulo.nombre}
                    </Text>
                    {!!selectedArticulo.codigo && (
                      <Text style={styles.selectButtonSubText}>
                        Código: {selectedArticulo.codigo}
                      </Text>
                    )}
                    {selectedArticulo.es_consumible && (
                      <Text style={[styles.selectButtonSubText, { color: '#388E3C' }]}>
                        Stock disponible: {selectedArticulo.cantidad} {selectedArticulo.unidad_medida}
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.selectButtonPlaceholder}>
                  Seleccionar artículo disponible
                </Text>
              )}
            </View>
            <Icon source="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Cantidad a prestar — solo para consumibles */}
        {selectedArticulo?.es_consumible && (
          <View style={styles.section}>
            <FieldLabel label={`Cantidad a prestar (máx. ${selectedArticulo.cantidad} ${selectedArticulo.unidad_medida})`} required />
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

        {/* Prestatario */}
        <View style={styles.section}>
          <FieldLabel label="ID del prestatario (miembro)" required />
          <TextInput
            style={styles.input}
            value={prestatarioId}
            onChangeText={(t) => setPrestatarioId(t.replace(/[^0-9]/g, ''))}
            placeholder="ID numérico del miembro"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Ingresa el ID numérico del miembro prestatario.</Text>
        </View>

        {/* Fecha de devolución */}
        <View style={styles.section}>
          <FieldLabel label="Fecha de devolución esperada" />
          <TextInput
            style={styles.input}
            value={fechaDevolucion}
            onChangeText={setFechaDevolucion}
            placeholder="YYYY-MM-DD (opcional)"
            placeholderTextColor="#999"
          />
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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 4,
  },
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minHeight: 46,
  },
  selectButtonEmpty: {
    borderStyle: 'dashed',
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  selectButtonSubText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  selectButtonPlaceholder: {
    fontSize: 15,
    color: '#999',
  },
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
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 2,
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
