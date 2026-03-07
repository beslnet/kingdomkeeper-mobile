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
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import {
  listarCuentas,
  listarTiposCuenta,
  crearCuenta,
  editarCuenta,
  CuentaFondo,
  TipoCuentaFondo,
  formatMonto,
} from '../../api/finanzas';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={{ color: '#E53935' }}> *</Text>}
    </Text>
  );
}

function CuentaCard({
  cuenta,
  canManage,
  onEdit,
}: {
  cuenta: CuentaFondo;
  canManage: boolean;
  onEdit: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardNombre}>{cuenta.nombre}</Text>
          <Text style={styles.cardTipo}>{cuenta.tipo?.nombre ?? '—'}</Text>
        </View>
        {canManage && (
          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.75}>
            <Icon source="pencil-outline" size={20} color={PANTONE_295C} />
          </TouchableOpacity>
        )}
      </View>

      {/* Saldo actual destacado */}
      <Text style={styles.cardSaldoActual}>{formatMonto(cuenta.saldo_disponible)}</Text>
      <Text style={styles.cardSaldoLabel}>Saldo disponible</Text>

      {/* Desglose */}
      <View style={styles.cardDesglose}>
        <View style={styles.desgloseItem}>
          <Text style={styles.desgloseLabel}>Inicial</Text>
          <Text style={styles.desgloseValorNeutro}>{formatMonto(cuenta.saldo_inicial ?? 0)}</Text>
        </View>
        <View style={styles.desgloseItem}>
          <Text style={styles.desgloseLabel}>Ingresos</Text>
          <Text style={styles.desgloseValorIngreso}>+{formatMonto(cuenta.total_ingresos)}</Text>
        </View>
        <View style={styles.desgloseItem}>
          <Text style={styles.desgloseLabel}>Egresos</Text>
          <Text style={styles.desgloseValorEgreso}>-{formatMonto(cuenta.total_egresos)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function CuentasListScreen() {
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const canManage = isSuperAdmin || hasPermission('finanzas', 'crear') || hasPermission('finanzas', 'editar');

  const [cuentas, setCuentas] = useState<CuentaFondo[]>([]);
  const [tiposCuenta, setTiposCuenta] = useState<TipoCuentaFondo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaFondo | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formTipoId, setFormTipoId] = useState<number | null>(null);
  const [formSaldo, setFormSaldo] = useState('');
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cuentasData, tiposData] = await Promise.all([listarCuentas(), listarTiposCuenta()]);
      setCuentas(cuentasData);
      setTiposCuenta(tiposData);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar cuentas.';
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingCuenta(null);
    setFormNombre('');
    setFormTipoId(null);
    setFormSaldo('');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (cuenta: CuentaFondo) => {
    setEditingCuenta(cuenta);
    setFormNombre(cuenta.nombre);
    setFormTipoId(cuenta.tipo?.id ?? null);
    setFormSaldo(String(Math.round(Number(cuenta.saldo_inicial ?? 0))));
    setFormError(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCuenta(null);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formNombre.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (!formTipoId) { setFormError('El tipo es obligatorio.'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: formNombre.trim(),
        tipo_id: formTipoId,
        saldo_inicial: formSaldo ? parseFloat(formSaldo) : 0,
      };
      if (editingCuenta) {
        await editarCuenta(editingCuenta.id, payload);
      } else {
        await crearCuenta(payload);
      }
      setShowForm(false);
      setEditingCuenta(null);
      await loadData();
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

  const tipoLabel = tiposCuenta.find((t) => t.id === formTipoId)?.nombre;

  const FormCard = () => (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>
        {editingCuenta ? `Editar: ${editingCuenta.nombre}` : 'Nueva cuenta'}
      </Text>

      <FieldLabel label="Nombre" required />
      <TextInput
        style={styles.textInput}
        placeholder="Nombre de la cuenta"
        placeholderTextColor="#AAA"
        value={formNombre}
        onChangeText={setFormNombre}
      />

      <FieldLabel label="Tipo de cuenta" required />
      <TouchableOpacity
        style={styles.selectBtn}
        onPress={() => setShowTipoDropdown((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={[styles.selectBtnText, !formTipoId && { color: '#AAA' }]}>
          {tipoLabel ?? 'Seleccionar tipo...'}
        </Text>
        <Icon source={showTipoDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
      </TouchableOpacity>
      {showTipoDropdown && (
        <View style={styles.inlineDropdown}>
          {tiposCuenta.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.selectOption, formTipoId === item.id && styles.selectOptionActive]}
              onPress={() => { setFormTipoId(item.id); setShowTipoDropdown(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.selectOptionText, formTipoId === item.id && styles.selectOptionTextActive]}>
                {item.nombre}
              </Text>
              {formTipoId === item.id && <Icon source="check" size={18} color={PANTONE_295C} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FieldLabel label="Saldo inicial" />
      <TextInput
        style={styles.textInput}
        placeholder="0"
        placeholderTextColor="#AAA"
        value={formSaldo}
        onChangeText={setFormSaldo}
        keyboardType="decimal-pad"
      />

      {formError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{formError}</Text>
        </View>
      ) : null}

      <View style={styles.formBtns}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.75} disabled={saving}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PANTONE_295C} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.75}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Totalizador consolidado */}
            {cuentas.length > 0 && (() => {
              const activas = cuentas.filter((c) => c.activo !== false);
              const totalInicial = activas.reduce((s, c) => s + Number(c.saldo_inicial ?? 0), 0);
              const totalIngresos = activas.reduce((s, c) => s + Number(c.total_ingresos ?? 0), 0);
              const totalEgresos = activas.reduce((s, c) => s + Number(c.total_egresos ?? 0), 0);
              const totalDisponible = activas.reduce((s, c) => s + Number(c.saldo_disponible ?? 0), 0);
              return (
                <View style={styles.totalizadorCard}>
                  <Text style={styles.totalizadorTitle}>Total consolidado</Text>
                  <View style={styles.totalizadorRow}>
                    <View style={styles.totalizadorItem}>
                      <Text style={styles.totalizadorLabel}>Inicial</Text>
                      <Text style={styles.totalizadorNeutro}>{formatMonto(totalInicial)}</Text>
                    </View>
                    <View style={styles.totalizadorItem}>
                      <Text style={styles.totalizadorLabel}>Ingresos</Text>
                      <Text style={styles.totalizadorIngreso}>{formatMonto(totalIngresos)}</Text>
                    </View>
                    <View style={styles.totalizadorItem}>
                      <Text style={styles.totalizadorLabel}>Egresos</Text>
                      <Text style={styles.totalizadorEgreso}>{formatMonto(totalEgresos)}</Text>
                    </View>
                    <View style={styles.totalizadorItem}>
                      <Text style={styles.totalizadorLabel}>Disponible</Text>
                      <Text style={[styles.totalizadorDisponible, totalDisponible < 0 && { color: '#EF9A9A' }]}>
                        {formatMonto(totalDisponible)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Nueva cuenta: form aparece arriba del listado */}
            {showForm && !editingCuenta && <FormCard />}

            {cuentas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon source="wallet-outline" size={44} color="#CCC" />
                <Text style={styles.emptyText}>Sin cuentas registradas.</Text>
              </View>
            ) : (
              cuentas.map((cuenta) => (
                <React.Fragment key={cuenta.id}>
                  <CuentaCard
                    cuenta={cuenta}
                    canManage={canManage}
                    onEdit={() => openEdit(cuenta)}
                  />
                  {/* Editar: form aparece justo debajo de la cuenta seleccionada */}
                  {showForm && editingCuenta?.id === cuenta.id && <FormCard />}
                </React.Fragment>
              ))
            )}
          </ScrollView>
        )}

        {canManage && !showForm && (
          <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
            <Icon source="plus" size={28} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
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
    padding: 12,
    paddingBottom: 100,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  cardTipo: {
    fontSize: 12,
    color: '#888',
  },
  editBtn: {
    padding: 4,
    marginLeft: 8,
  },
  cardSaldoActual: {
    fontSize: 26,
    fontWeight: '800',
    color: PANTONE_295C,
  },
  cardSaldoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    marginTop: 2,
  },
  cardDesglose: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    gap: 4,
  },
  desgloseItem: {
    flex: 1,
    alignItems: 'center',
  },
  desgloseLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  desgloseValorNeutro: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  desgloseValorIngreso: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  desgloseValorEgreso: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E53935',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
  },
  selectBtn: {
    backgroundColor: '#FAFAFA',
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
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  errorBannerText: {
    color: '#B71C1C',
    fontSize: 13,
  },
  formBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: PANTONE_295C,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  totalizadorCard: {
    backgroundColor: PANTONE_295C,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  totalizadorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalizadorRow: {
    flexDirection: 'row',
  },
  totalizadorItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalizadorLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 3,
  },
  totalizadorNeutro: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  totalizadorIngreso: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5D6A7',
  },
  totalizadorEgreso: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF9A9A',
  },
  totalizadorDisponible: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F2C75C',
  },
});
