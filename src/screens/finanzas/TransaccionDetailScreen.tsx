import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import {
  obtenerTransaccion,
  obtenerHistorialTransaccion,
  aprobarTransaccion,
  rechazarTransaccion,
  pagarTransaccion,
  anularTransaccion,
  getEstadoColor,
  getEstadoLabel,
  formatMonto,
  Transaccion,
  HistorialTransaccion,
} from '../../api/finanzas';

function formatDateDisplay(str: string): string {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function TransaccionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { transaccionId } = route.params;

  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const canView = isSuperAdmin || hasPermission('finanzas', 'ver');
  const canApprove = isSuperAdmin || hasPermission('finanzas', 'aprobar');

  const [transaccion, setTransaccion] = useState<Transaccion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeAction, setActiveAction] = useState<
    'aprobar' | 'rechazar' | 'pagar' | 'anular' | null
  >(null);
  const [actionInput, setActionInput] = useState('');

  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<HistorialTransaccion[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const loadTransaccion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerTransaccion(transaccionId);
      setTransaccion(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar la transacción.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      else if (d && typeof d === 'object') {
        const firstKey = Object.keys(d)[0];
        const firstVal = d[firstKey];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [transaccionId]);

  // Reload when screen comes back into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadTransaccion();
    }, [loadTransaccion]),
  );

  useLayoutEffect(() => {
    if (!transaccion) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('TransaccionForm', { transaccion })}
          activeOpacity={0.75}
        >
          <Icon source="pencil-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, transaccion]);

  const loadHistorial = async () => {
    setHistorialLoading(true);
    try {
      const data = await obtenerHistorialTransaccion(transaccionId);
      setHistorial(data);
    } catch {
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  const handleToggleHistorial = () => {
    const next = !showHistorial;
    setShowHistorial(next);
    if (next && historial.length === 0) {
      loadHistorial();
    }
  };

  const extractError = (err: any): string => {
    const d = err?.response?.data;
    let msg = 'Error al ejecutar la acción.';
    if (typeof d === 'string') msg = d;
    else if (d?.error) msg = d.error;
    else if (d?.detail) msg = d.detail;
    else if (d && typeof d === 'object') {
      const firstKey = Object.keys(d)[0];
      const firstVal = d[firstKey];
      msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
    }
    return msg;
  };

  const handleConfirmAction = async () => {
    if (!transaccion) return;
    if (activeAction === 'rechazar' && !actionInput.trim()) {
      setActionError('El motivo es obligatorio.');
      return;
    }
    if (activeAction === 'anular' && !actionInput.trim()) {
      setActionError('El motivo es obligatorio.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      let updated: Transaccion;
      if (activeAction === 'aprobar') {
        updated = await aprobarTransaccion(transaccion.id, actionInput);
      } else if (activeAction === 'rechazar') {
        updated = await rechazarTransaccion(transaccion.id, actionInput);
      } else if (activeAction === 'pagar') {
        updated = await pagarTransaccion(transaccion.id, { observaciones: actionInput });
      } else if (activeAction === 'anular') {
        updated = await anularTransaccion(transaccion.id, actionInput);
      } else {
        return;
      }
      setTransaccion(updated);
      setActiveAction(null);
      setActionInput('');
      setHistorial([]);
    } catch (err: any) {
      setActionError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAction = () => {
    setActiveAction(null);
    setActionInput('');
    setActionError(null);
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
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No encontrado.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadTransaccion} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoColor = getEstadoColor(transaccion.estado);
  const isIngreso = transaccion.tipo === 'ingreso';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Monto + badges */}
      <View style={styles.heroSection}>
        <Text style={[styles.heroMonto, { color: isIngreso ? '#4CAF50' : '#E53935' }]}>
          {formatMonto(transaccion.monto)}
        </Text>
        <View style={styles.heroBadges}>
          <View style={[styles.tipoBadge, { backgroundColor: isIngreso ? '#4CAF50' : '#E53935' }]}>
            <Text style={styles.tipoBadgeText}>{isIngreso ? 'Ingreso' : 'Egreso'}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: estadoColor }]}>
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(transaccion.estado)}</Text>
          </View>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.infoCard}>
        <InfoRow label="Categoría" value={transaccion.categoria?.nombre} />
        <InfoRow label="Cuenta" value={transaccion.cuenta?.nombre} />
        <InfoRow label="Fecha" value={formatDateDisplay(transaccion.fecha)} />
        <InfoRow label="Medio de pago" value={transaccion.medio} />
        <InfoRow label="Responsable" value={transaccion.responsable_nombre} />
        <InfoRow label="Observaciones" value={transaccion.observaciones} />
        <InfoRow label="Descripción" value={transaccion.descripcion} />
        {transaccion.motivo_rechazo ? (
          <View style={styles.alertRow}>
            <Icon source="close-circle-outline" size={16} color="#E53935" />
            <Text style={styles.alertRowText}>Motivo rechazo: {transaccion.motivo_rechazo}</Text>
          </View>
        ) : null}
        {transaccion.motivo_anulacion ? (
          <View style={styles.alertRow}>
            <Icon source="cancel" size={16} color="#9E9E9E" />
            <Text style={styles.alertRowText}>Motivo anulación: {transaccion.motivo_anulacion}</Text>
          </View>
        ) : null}
        {transaccion.aprobado_por_nombre ? (
          <InfoRow label="Aprobado por" value={`${transaccion.aprobado_por_nombre}${transaccion.fecha_aprobacion ? ` (${formatDateDisplay(transaccion.fecha_aprobacion.split('T')[0])})` : ''}`} />
        ) : null}
        {transaccion.pagado_por_nombre ? (
          <InfoRow label="Pagado por" value={`${transaccion.pagado_por_nombre}${transaccion.fecha_pago ? ` (${formatDateDisplay(transaccion.fecha_pago.split('T')[0])})` : ''}`} />
        ) : null}
      </View>

      {/* Action buttons */}
      {canView && (
        <View style={styles.actionsSection}>
          {transaccion.estado === 'pendiente' && canApprove && !activeAction && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: PANTONE_295C }]}
                onPress={() => { setActiveAction('aprobar'); setActionInput(''); }}
                activeOpacity={0.8}
              >
                <Icon source="check-circle-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E53935' }]}
                onPress={() => { setActiveAction('rechazar'); setActionInput(''); }}
                activeOpacity={0.8}
              >
                <Icon source="close-circle-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}
          {transaccion.estado === 'aprobado' && canApprove && !activeAction && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                onPress={() => { setActiveAction('pagar'); setActionInput(''); }}
                activeOpacity={0.8}
              >
                <Icon source="cash-check" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Marcar Pagado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#9E9E9E' }]}
                onPress={() => { setActiveAction('anular'); setActionInput(''); }}
                activeOpacity={0.8}
              >
                <Icon source="cancel" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Anular</Text>
              </TouchableOpacity>
            </View>
          )}
          {transaccion.estado === 'pagado' && canApprove && !activeAction && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#9E9E9E' }]}
                onPress={() => { setActiveAction('anular'); setActionInput(''); }}
                activeOpacity={0.8}
              >
                <Icon source="cancel" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Anular</Text>
              </TouchableOpacity>
            </View>
          )}
          {transaccion.estado === 'rechazado' && !activeAction && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
                onPress={() => navigation.navigate('TransaccionForm', { transaccion })}
                activeOpacity={0.8}
              >
                <Icon source="pencil-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Rectificar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inline confirmation panel */}
          {activeAction && (
            <View style={styles.confirmPanel}>
              <Text style={styles.confirmTitle}>
                {activeAction === 'aprobar' && 'Aprobar transacción'}
                {activeAction === 'rechazar' && 'Rechazar transacción'}
                {activeAction === 'pagar' && 'Marcar como pagado'}
                {activeAction === 'anular' && 'Anular transacción'}
              </Text>
              <TextInput
                style={[styles.confirmInput, activeAction === 'rechazar' || activeAction === 'anular' ? styles.confirmInputRequired : null]}
                placeholder={
                  activeAction === 'rechazar' || activeAction === 'anular'
                    ? 'Motivo (obligatorio)'
                    : 'Observaciones (opcional)'
                }
                placeholderTextColor="#AAA"
                value={actionInput}
                onChangeText={setActionInput}
                multiline
                numberOfLines={3}
              />
              {actionError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={handleCancelAction}
                  activeOpacity={0.75}
                  disabled={actionLoading}
                >
                  <Text style={styles.confirmCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmOkBtn, actionLoading && styles.confirmOkBtnDisabled]}
                  onPress={handleConfirmAction}
                  activeOpacity={0.8}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmOkText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Historial */}
      <TouchableOpacity
        style={styles.historialToggle}
        onPress={handleToggleHistorial}
        activeOpacity={0.75}
      >
        <Text style={styles.historialToggleText}>Historial de cambios</Text>
        <Icon source={showHistorial ? 'chevron-up' : 'chevron-down'} size={20} color={PANTONE_295C} />
      </TouchableOpacity>

      {showHistorial && (
        <View style={styles.historialSection}>
          {historialLoading ? (
            <ActivityIndicator color={PANTONE_295C} style={styles.historialLoading} />
          ) : historial.length === 0 ? (
            <Text style={styles.historialEmpty}>Sin historial disponible.</Text>
          ) : (
            historial.map((h, index) => (
              <View key={h.id != null ? String(h.id) : `h-${index}`} style={styles.historialItem}>
                <View style={styles.historialHeader}>
                  <View style={[styles.historialBadge, { backgroundColor: getEstadoColor(h.estado_nuevo) }]}>
                    <Text style={styles.historialBadgeText}>{h.accion}</Text>
                  </View>
                  <Text style={styles.historialFecha}>
                    {h.fecha ? formatDateDisplay(h.fecha.split('T')[0]) : ''}
                  </Text>
                </View>
                {h.usuario_nombre ? (
                  <Text style={styles.historialUsuario}>{h.usuario_nombre}</Text>
                ) : null}
                {h.comentario ? <Text style={styles.historialComentario}>{h.comentario}</Text> : null}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  heroSection: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  heroMonto: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoBadge: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  tipoBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  estadoBadge: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  estadoBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#FFF',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alertRowText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  actionsSection: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmPanel: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  confirmInputRequired: {
    borderColor: '#FF9800',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 13,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmOkBtn: {
    flex: 1,
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmOkBtnDisabled: {
    opacity: 0.6,
  },
  confirmOkText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  historialToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginBottom: 2,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  historialToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: PANTONE_295C,
  },
  historialSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  historialLoading: {
    paddingVertical: 16,
  },
  historialEmpty: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  historialItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 10,
  },
  historialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historialBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  historialBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  historialFecha: {
    fontSize: 12,
    color: '#999',
  },
  historialUsuario: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  historialComentario: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
});
