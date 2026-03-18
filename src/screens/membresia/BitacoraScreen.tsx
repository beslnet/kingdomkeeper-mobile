import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  getBitacora,
  crearEntradaBitacora,
  eliminarEntradaBitacora,
  BitacoraEntrada,
  TIPOS_BITACORA,
} from '../../api/miembros';
import { PANTONE_295C } from '../../theme/colors';

function getBitacoraColor(tipo: string): { bg: string; text: string } {
  switch (tipo) {
    case 'nota': return { bg: '#E3F2FD', text: '#1565C0' };
    case 'pastoral': return { bg: '#EDE7F6', text: '#4527A0' };
    case 'consejeria': return { bg: '#E8EAF6', text: '#283593' };
    case 'disciplina': return { bg: '#FFEBEE', text: '#B71C1C' };
    case 'evento': return { bg: '#E8F5E9', text: '#1B5E20' };
    default: return { bg: '#F5F5F5', text: '#555' };
  }
}

function formatRelativeDate(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes.`;
  return `Hace ${Math.floor(diffDays / 365)} año(s)`;
}

function EntradaCard({
  entrada,
  onDelete,
  canDelete,
}: {
  entrada: BitacoraEntrada;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const color = getBitacoraColor(entrada.tipo);
  const tipoLabel = TIPOS_BITACORA.find((t) => t.value === entrada.tipo)?.label ?? entrada.tipo;
  return (
    <View style={styles.entradaCard}>
      <View style={styles.entradaHeader}>
        <View style={[styles.tipoBadge, { backgroundColor: color.bg }]}>
          <Text style={[styles.tipoBadgeText, { color: color.text }]}>{tipoLabel}</Text>
        </View>
        {entrada.es_privado && (
          <View style={styles.privadoBadge}>
            <Icon source="lock-outline" size={12} color="#888" />
            <Text style={styles.privadoText}>Privado</Text>
          </View>
        )}
        {canDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} activeOpacity={0.7}>
            <Icon source="delete-outline" size={18} color="#E53935" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.entradaTitulo}>{entrada.titulo}</Text>
      <Text style={styles.entradaContenido}>{entrada.contenido}</Text>
      <View style={styles.entradaFooter}>
        <Text style={styles.entradaMeta}>{entrada.creado_por_nombre}</Text>
        <Text style={styles.entradaMeta}>{formatRelativeDate(entrada.fecha_creacion)}</Text>
      </View>
    </View>
  );
}

export default function BitacoraScreen() {
  const route = useRoute<any>();
  const { miembroId, cuentaEnEliminacion } = route.params;

  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const canCreate = isSuperAdmin || hasPermission('membresia', 'crear');

  const [entradas, setEntradas] = useState<BitacoraEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New entry form
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoSelector, setTipoSelector] = useState(false);
  const [tipo, setTipo] = useState('nota');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [esPrivado, setEsPrivado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEntradas = useCallback(async () => {
    setError(null);
    try {
      const result = await getBitacora(miembroId);
      setEntradas(result.results ?? []);
    } catch {
      setError('No se pudo cargar la bitácora.');
    }
  }, [miembroId]);

  useEffect(() => {
    setLoading(true);
    loadEntradas().finally(() => setLoading(false));
  }, [loadEntradas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEntradas();
    setRefreshing(false);
  };

  const handleDelete = (entrada: BitacoraEntrada) => {
    Alert.alert('Eliminar entrada', '¿Seguro que deseas eliminar esta entrada de la bitácora?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarEntradaBitacora(entrada.id);
            setEntradas((prev) => prev.filter((e) => e.id !== entrada.id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la entrada.');
          }
        },
      },
    ]);
  };

  const openModal = () => {
    setTipo('nota');
    setTitulo('');
    setContenido('');
    setEsPrivado(false);
    setFormError(null);
    setModalVisible(true);
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!titulo.trim()) {
      setFormError('El título es obligatorio.');
      return;
    }
    if (!contenido.trim()) {
      setFormError('El contenido es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const nueva = await crearEntradaBitacora(miembroId, {
        tipo,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        es_privado: esPrivado,
      });
      setEntradas((prev) => [nueva, ...prev]);
      setModalVisible(false);
    } catch {
      setFormError('No se pudo guardar la entrada.');
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = TIPOS_BITACORA.find((t) => t.value === tipo)?.label ?? tipo;

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.centered} onPress={loadEntradas}>
          <Icon source="alert-circle-outline" size={36} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={entradas}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => (
            <EntradaCard
              entrada={item}
              canDelete={canCreate}
              onDelete={() => handleDelete(item)}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon source="notebook-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No hay entradas en la bitácora.</Text>
            </View>
          }
          contentContainerStyle={entradas.length === 0 ? styles.emptyContainer : { padding: 12 }}
        />
      )}

      {canCreate && !cuentaEnEliminacion && (
        <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
          <Icon source="plus" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Add entry modal — full screen to keep close button always accessible */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva entrada</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon source="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{formError}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Tipo</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setTipoSelector((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.selectBtnText}>{tipoLabel}</Text>
                <Icon source={tipoSelector ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
              </TouchableOpacity>
              {tipoSelector && (
                <View style={styles.inlineDropdown}>
                  {TIPOS_BITACORA.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.selectOption, tipo === opt.value && styles.selectOptionActive]}
                      onPress={() => {
                        setTipo(opt.value);
                        setTipoSelector(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          tipo === opt.value && styles.selectOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {tipo === opt.value && <Icon source="check" size={18} color={PANTONE_295C} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Título de la entrada"
                placeholderTextColor="#AAA"
              />

              <Text style={styles.fieldLabel}>Contenido *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contenido}
                onChangeText={setContenido}
                placeholder="Describe el evento o nota..."
                placeholderTextColor="#AAA"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.privadoRow}
                onPress={() => setEsPrivado((v) => !v)}
                activeOpacity={0.7}
              >
                <Icon
                  source={esPrivado ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={esPrivado ? PANTONE_295C : '#888'}
                />
                <Text style={styles.privadoLabel}>Entrada privada (solo admins)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar entrada</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#E53935', marginTop: 8, textAlign: 'center' },
  entradaCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  entradaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipoBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tipoBadgeText: { fontSize: 11, fontWeight: '700' },
  privadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  privadoText: { fontSize: 11, color: '#888' },
  deleteBtn: { marginLeft: 'auto' },
  entradaTitulo: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 4 },
  entradaContenido: { fontSize: 14, color: '#555', lineHeight: 20 },
  entradaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  entradaMeta: { fontSize: 12, color: '#AAA' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: { minHeight: 90 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectBtnText: { fontSize: 15, color: '#222' },
  privadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  privadoLabel: { fontSize: 14, color: '#555' },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorBannerText: { fontSize: 13, color: '#E53935' },
  inlineDropdown: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFF',
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectOptionActive: { backgroundColor: '#EAF2FF' },
  selectOptionText: { fontSize: 15, color: '#444' },
  selectOptionTextActive: { color: PANTONE_295C, fontWeight: '600' },
});
