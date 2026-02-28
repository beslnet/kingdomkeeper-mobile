import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { obtenerTransaccion, anularTransaccion } from '../../api/finanzas';
import { PANTONE_295C } from '../../theme/colors';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}-${m}-${y}`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type EstadoStyle = { bg: string; text: string; label: string };

function getEstadoStyle(estado: string): EstadoStyle {
  switch (estado) {
    case 'pendiente': return { bg: '#FFF3E0', text: '#E65100', label: 'Pendiente' };
    case 'aprobado':  return { bg: '#E3F2FD', text: '#1565C0', label: 'Aprobado' };
    case 'pagado':    return { bg: '#E8F5E9', text: '#2E7D32', label: 'Pagado' };
    case 'rechazado': return { bg: '#FFEBEE', text: '#C62828', label: 'Rechazado' };
    case 'anulado':   return { bg: '#F5F5F5', text: '#757575', label: 'Anulado' };
    default:          return { bg: '#F5F5F5', text: '#555',    label: estado };
  }
}

function getCategoriaNombre(t: any): string {
  if (!t.categoria) return '—';
  if (typeof t.categoria === 'object') return t.categoria.nombre ?? '—';
  return t.categoria_nombre ?? String(t.categoria);
}

function getCuentaNombre(t: any): string {
  if (!t.cuenta) return '—';
  if (typeof t.cuenta === 'object') return t.cuenta.nombre ?? '—';
  return t.cuenta_nombre ?? String(t.cuenta);
}

function getResponsableNombre(t: any): string {
  if (!t.responsable) return t.responsable_nombre ?? '—';
  if (typeof t.responsable === 'object') {
    return [t.responsable.nombre, t.responsable.apellidos].filter(Boolean).join(' ') || '—';
  }
  return t.responsable_nombre ?? String(t.responsable);
}

function getComprobanteUrl(t: any): string | null {
  return t.archivo_respaldo_url ?? t.comprobante_adjunto ?? t.comprobante_url ?? null;
}

// ─── Row component ───────────────────────────────────────────────────────────

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={4}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { flex: 1, fontSize: 13, color: '#888', marginRight: 8 },
  value: { flex: 2, fontSize: 14, color: '#222', fontWeight: '500', textAlign: 'right' },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TransaccionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { transaccionId, puedeGestionar } = route.params ?? {};

  const [transaccion, setTransaccion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Anular modal state
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await obtenerTransaccion(Number(transaccionId));
      setTransaccion(data);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar la transacción.');
    }
  }, [transaccionId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleVerComprobante = () => {
    const url = getComprobanteUrl(transaccion);
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el comprobante.'));
  };

  const handleAnularConfirm = async () => {
    if (!motivoAnulacion.trim()) {
      Alert.alert('Requerido', 'Ingresa el motivo de anulación.');
      return;
    }
    setAnulando(true);
    try {
      await anularTransaccion(Number(transaccionId), motivoAnulacion.trim());
      setShowAnularModal(false);
      setMotivoAnulacion('');
      Alert.alert('Éxito', 'Transacción anulada correctamente.', [
        { text: 'OK', onPress: () => { load(); } },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.detail ?? err?.message ?? 'No se pudo anular.';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setAnulando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error || !transaccion) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error ?? 'Sin datos'}</Text>
      </TouchableOpacity>
    );
  }

  const estadoStyle = getEstadoStyle(transaccion.estado);
  const isIngreso = transaccion.tipo === 'ingreso';
  const comprobanteUrl = getComprobanteUrl(transaccion);
  const puedeAnular = puedeGestionar && transaccion.estado !== 'anulado';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Estado y tipo banner */}
        <View style={[styles.banner, { backgroundColor: estadoStyle.bg }]}>
          <View style={[styles.estadoChip, { backgroundColor: estadoStyle.text }]}>
            <Text style={styles.estadoChipText}>{estadoStyle.label}</Text>
          </View>
          <Text style={[styles.bannerMonto, { color: isIngreso ? '#2E7D32' : '#C62828' }]}>
            {isIngreso ? '+' : '-'}{formatCLP(transaccion.monto)}
          </Text>
          <View style={[styles.tipoBadge, { backgroundColor: isIngreso ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.tipoBadgeText, { color: isIngreso ? '#2E7D32' : '#E65100' }]}>
              {isIngreso ? '↑ Ingreso' : '↓ Egreso'}
            </Text>
          </View>
        </View>

        {/* Main details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DATOS PRINCIPALES</Text>
          <DetailRow label="Fecha"        value={formatDate(transaccion.fecha)} />
          <DetailRow label="Categoría"    value={getCategoriaNombre(transaccion)} />
          <DetailRow label="Cuenta/Fondo" value={getCuentaNombre(transaccion)} />
          <DetailRow label="Medio de pago" value={transaccion.medio_display ?? transaccion.medio ?? '—'} />
          <DetailRow
            label="Monto"
            value={formatCLP(transaccion.monto)}
            valueColor={isIngreso ? '#2E7D32' : '#C62828'}
          />
        </View>

        {/* Responsable + observaciones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RESPONSABLE Y OBSERVACIONES</Text>
          <DetailRow label="Responsable" value={getResponsableNombre(transaccion)} />
          {transaccion.observaciones ? (
            <DetailRow label="Observaciones" value={transaccion.observaciones} />
          ) : null}
          {transaccion.descripcion ? (
            <DetailRow label="Descripción" value={transaccion.descripcion} />
          ) : null}
          {transaccion.notas ? (
            <DetailRow label="Notas" value={transaccion.notas} />
          ) : null}
        </View>

        {/* Historial / motivo rechazo / anulación */}
        {(transaccion.motivo_rechazo || transaccion.motivo_anulacion) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>HISTORIAL</Text>
            {transaccion.motivo_rechazo ? (
              <DetailRow label="Motivo rechazo" value={transaccion.motivo_rechazo} valueColor="#C62828" />
            ) : null}
            {transaccion.motivo_anulacion ? (
              <DetailRow label="Motivo anulación" value={transaccion.motivo_anulacion} valueColor="#757575" />
            ) : null}
          </View>
        ) : null}

        {/* Metadata */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REGISTRO</Text>
          <DetailRow label="Creado"       value={formatDateTime(transaccion.created_at)} />
          <DetailRow label="Actualizado"  value={formatDateTime(transaccion.updated_at)} />
        </View>

        {/* Comprobante */}
        {comprobanteUrl ? (
          <TouchableOpacity style={styles.comprobanteBtn} onPress={handleVerComprobante} activeOpacity={0.8}>
            <Icon source="paperclip" size={20} color={PANTONE_295C} />
            <Text style={styles.comprobanteBtnText}>Ver comprobante adjunto</Text>
            <Icon source="open-in-new" size={16} color={PANTONE_295C} />
          </TouchableOpacity>
        ) : null}

        {/* Anular button */}
        {puedeAnular ? (
          <TouchableOpacity
            style={styles.anularBtn}
            onPress={() => setShowAnularModal(true)}
            activeOpacity={0.8}
          >
            <Icon source="cancel" size={20} color="#C62828" />
            <Text style={styles.anularBtnText}>Anular transacción</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Anular modal */}
      <Modal
        visible={showAnularModal}
        transparent
        animationType="slide"
        onRequestClose={() => !anulando && setShowAnularModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Anular Transacción</Text>
            <Text style={styles.modalSubtitle}>
              Esta acción quedará registrada en el historial.
            </Text>
            <TextInput
              style={styles.motivoInput}
              multiline
              numberOfLines={4}
              value={motivoAnulacion}
              onChangeText={setMotivoAnulacion}
              placeholder="Ingresa el motivo de anulación..."
              placeholderTextColor="#AAA"
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowAnularModal(false); setMotivoAnulacion(''); }}
                disabled={anulando}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm, anulando && { opacity: 0.6 }]}
                onPress={handleAnularConfirm}
                disabled={anulando}
              >
                {anulando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Anular</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },

  // Banner
  banner: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  estadoChip: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5,
  },
  estadoChipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bannerMonto: { fontSize: 32, fontWeight: '800' },
  tipoBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  tipoBadgeText: { fontSize: 13, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Comprobante
  comprobanteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: PANTONE_295C,
  },
  comprobanteBtnText: { flex: 1, color: PANTONE_295C, fontWeight: '600', fontSize: 14 },

  // Anular
  anularBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#C62828',
  },
  anularBtnText: { color: '#C62828', fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  motivoInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#222',
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1.5, borderColor: '#CCC' },
  modalBtnCancelText: { color: '#666', fontWeight: '600', fontSize: 15 },
  modalBtnConfirm: { backgroundColor: '#C62828' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
