import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PANTONE_295C } from '../../theme/colors';
import { devolverPrestamo, Prestamo } from '../../api/inventario';

// ─── Navigation types ─────────────────────────────────────────────────────────

type DevolucionFormParams = {
  DevolucionForm: { prestamo: Prestamo };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str: string | null | undefined): string {
  if (!str) return '—';
  const isoDate = str.split('T')[0];
  const parts = isoDate.split('-');
  if (parts.length !== 3) return str;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DevolucionFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<DevolucionFormParams, 'DevolucionForm'>>();
  const { prestamo } = route.params;

  const [condicionDevolucion, setCondicionDevolucion] = useState('');
  const [notasDevolucion, setNotasDevolucion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const articuloNombre = prestamo.articulo_data?.nombre ?? `Artículo #${prestamo.articulo}`;
  const prestatarioNombre = prestamo.prestatario_data
    ? `${prestamo.prestatario_data.nombre} ${prestamo.prestatario_data.apellidos}`
    : `ID: ${prestamo.prestatario}`;

  // ─── Handler ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!condicionDevolucion.trim()) {
      setError('La condición de devolución es requerida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await devolverPrestamo(
        prestamo.id,
        condicionDevolucion.trim(),
        notasDevolucion.trim() || undefined,
      );
      navigation.navigate('Prestamos', { refresh: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const detail =
        (e?.response?.data?.detail as string) ||
        (e?.response?.data?.condicion_devolucion as string[])?.[0] ||
        'Error al registrar la devolución.';
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
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Información del préstamo</Text>

          <View style={styles.summaryRow}>
            <Icon source="package-variant" size={16} color="#555" />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Artículo</Text>
              <Text style={styles.summaryValue}>{articuloNombre}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Icon source="account-outline" size={16} color="#555" />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Prestatario</Text>
              <Text style={styles.summaryValue}>{prestatarioNombre}</Text>
            </View>
          </View>

          {(prestamo.cantidad_prestada > 1 || prestamo.articulo_data?.es_consumible) && (
            <View style={styles.summaryRow}>
              <Icon source="package-variant-closed" size={16} color="#555" />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Cantidad prestada</Text>
                <Text style={styles.summaryValue}>
                  {prestamo.cantidad_prestada} {prestamo.articulo_data?.unidad_medida ?? 'uds'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Icon source="calendar-outline" size={16} color="#555" />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Fecha de préstamo</Text>
              <Text style={styles.summaryValue}>{formatDate(prestamo.fecha_prestamo)}</Text>
            </View>
          </View>

          {prestamo.dias_prestado !== undefined && (
            <View style={styles.summaryRow}>
              <Icon source="clock-outline" size={16} color="#555" />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Tiempo prestado</Text>
                <Text style={styles.summaryValue}>{prestamo.dias_prestado} días</Text>
              </View>
            </View>
          )}

          {!!prestamo.condicion_entrega && (
            <View style={styles.summaryRow}>
              <Icon source="clipboard-text-outline" size={16} color="#555" />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Condición de entrega</Text>
                <Text style={styles.summaryValue}>{prestamo.condicion_entrega}</Text>
              </View>
            </View>
          )}

          {prestamo.esta_vencido && (
            <View style={styles.vencidoBanner}>
              <Icon source="alert" size={16} color="#B71C1C" />
              <Text style={styles.vencidoBannerText}>Este préstamo está vencido</Text>
            </View>
          )}
        </View>

        {/* Condición de devolución */}
        <FieldLabel label="Condición del artículo devuelto" required />
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={condicionDevolucion}
          onChangeText={setCondicionDevolucion}
          placeholder="Describe el estado del artículo al momento de la devolución..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />

        {/* Notas de devolución */}
        <FieldLabel label="Notas de devolución" />
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={notasDevolucion}
          onChangeText={setNotasDevolucion}
          placeholder="Observaciones adicionales sobre la devolución..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />

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
              <Text style={styles.saveButtonText}>Confirmar devolución</Text>
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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PANTONE_295C,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  vencidoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  vencidoBannerText: {
    color: '#B71C1C',
    fontWeight: '700',
    fontSize: 13,
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
