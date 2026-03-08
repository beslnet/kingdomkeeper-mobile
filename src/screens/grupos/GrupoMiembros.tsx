import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { useAuthStore } from '../../store/authStore';
import { obtenerGrupo, agregarMiembros, removerMiembros, listarMiembrosIglesia } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function getRolColor(rol: string): { bg: string; text: string } {
  switch (rol) {
    case 'leader': return { bg: '#FFF8E1', text: '#F57F17' };
    case 'co_leader': return { bg: '#E8EAF6', text: '#283593' };
    default: return { bg: '#F5F5F5', text: '#616161' };
  }
}

function getRolLabel(rol: string): string {
  switch (rol) {
    case 'leader': return 'Líder';
    case 'co_leader': return 'Co-Líder';
    default: return 'Miembro';
  }
}

export default function GrupoMiembrosScreen() {
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const user = useAuthStore((s) => s.user);

  const [miembros, setMiembros] = useState<any[]>([]);
  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add member modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [iglesiaMiembros, setIglesiaMiembros] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  const miembroId = user?.miembro_id;
  const esLiderPrincipal = miembroId && grupo && Number(miembroId) === Number(grupo.lider_id);
  const esCoLider = miembroId && grupo?.miembros?.some(
    (m: any) => Number(m.miembro_id) === Number(miembroId) && m.rol_en_grupo === 'co_leader'
  );
  const canManage =
    isSuperAdmin ||
    hasAnyRole(['church_admin', 'pastor']) ||
    esLiderPrincipal ||
    esCoLider;

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await obtenerGrupo(grupoId);
      setGrupo(result);
      setMiembros(result.miembros ?? []);
    } catch {
      setError('No se pudo cargar los miembros. Toca para reintentar.');
    }
  }, [grupoId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRemove = useCallback((miembro: any) => {
    Alert.alert(
      'Remover miembro',
      `¿Remover a ${miembro.nombre_completo ?? miembro.nombre ?? 'este miembro'} del grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerMiembros(grupoId, [miembro.miembro_id ?? miembro.id]);
              await load();
            } catch {
              Alert.alert('Error', 'No se pudo remover al miembro.');
            }
          },
        },
      ]
    );
  }, [grupoId, load]);

  const openAddModal = useCallback(async () => {
    setModalVisible(true);
    setModalSearch('');
    setModalLoading(true);
    try {
      const result = await listarMiembrosIglesia();
      setIglesiaMiembros(Array.isArray(result) ? result : result.results ?? []);
    } catch {
      setIglesiaMiembros([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const handleSearchIglesia = useCallback(async (text: string) => {
    setModalSearch(text);
    setModalLoading(true);
    try {
      const result = await listarMiembrosIglesia(text);
      setIglesiaMiembros(Array.isArray(result) ? result : result.results ?? []);
    } catch {
      setIglesiaMiembros([]);
    } finally {
      setModalLoading(false);
    }
  }, []);

  const handleAddMiembro = useCallback(async (miembro: any) => {
    setAddingId(miembro.id);
    try {
      await agregarMiembros(grupoId, [miembro.id]);
      await load();
      setModalVisible(false);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.detail ?? data?.non_field_errors?.[0] ?? data?.miembros_ids?.[0];
      if (msg) {
        Alert.alert('No se pudo agregar', String(msg));
      } else {
        Alert.alert('Error', 'No se pudo agregar al miembro.');
      }
    } finally {
      setAddingId(null);
    }
  }, [grupoId, load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  const filteredIglesia = iglesiaMiembros.filter(
    (m) => !miembros.some((gm) => (gm.miembro_id ?? gm.id) === m.id)
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={miembros}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={miembros.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="account-multiple-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No hay miembros en este grupo</Text>
          </View>
        }
        renderItem={({ item }) => {
          const rolColor = getRolColor(item.rol_en_grupo ?? item.mi_rol ?? item.rol ?? '');
          return (
            <View style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Icon source="account-circle" size={38} color={PANTONE_295C} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.miembro_nombre ?? item.nombre_completo ?? item.nombre ?? '—'}</Text>
                {item.email ? <Text style={styles.memberEmail}>{item.email}</Text> : null}
                {item.fecha_union ? (
                  <Text style={styles.memberDate}>Desde {item.fecha_union}</Text>
                ) : null}
              </View>
              <View style={[styles.rolChip, { backgroundColor: rolColor.bg }]}>
                <Text style={[styles.rolChipText, { color: rolColor.text }]}>
                  {getRolLabel(item.rol_en_grupo ?? item.mi_rol ?? item.rol ?? '')}
                </Text>
              </View>
              {canManage && (item.rol_en_grupo ?? item.mi_rol ?? item.rol) !== 'leader' ? (
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
                  <Icon source="account-remove-outline" size={20} color="#E53935" />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
          <Icon source="account-plus-outline" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add member modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar miembro</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon source="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchBar}>
            <Icon source="magnify" size={20} color="#888" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar miembro..."
              placeholderTextColor="#AAA"
              value={modalSearch}
              onChangeText={handleSearchIglesia}
            />
          </View>
          {modalLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={PANTONE_295C} />
            </View>
          ) : (
            <FlatList
              data={filteredIglesia}
              keyExtractor={(item, index) => String(item.id ?? index)}
              contentContainerStyle={filteredIglesia.length === 0 ? styles.emptyContainer : { padding: 16 }}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Icon source="account-search-outline" size={40} color="#CCC" />
                  <Text style={styles.emptyText}>No se encontraron miembros</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.iglesiaMemberRow}
                  onPress={() => handleAddMiembro(item)}
                  disabled={addingId === item.id}
                  activeOpacity={0.75}
                >
                  <Icon source="account-circle" size={32} color={PANTONE_295C} />
                  <View style={styles.iglesiaMemberInfo}>
                    <Text style={styles.iglesiaMemberName}>{item.nombre_completo ?? item.nombre ?? '—'}</Text>
                    {item.email ? <Text style={styles.memberEmail}>{item.email}</Text> : null}
                  </View>
                  {addingId === item.id ? (
                    <ActivityIndicator size="small" color={PANTONE_295C} />
                  ) : (
                    <Icon source="plus-circle-outline" size={24} color={PANTONE_295C} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 88 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  memberAvatar: { marginRight: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#222' },
  memberEmail: { fontSize: 12, color: '#888', marginTop: 1 },
  memberDate: { fontSize: 11, color: '#AAA', marginTop: 2 },
  rolChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  rolChipText: { fontSize: 11, fontWeight: '600' },
  removeBtn: { marginLeft: 10, padding: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: PANTONE_295C,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  modalContainer: { flex: 1, backgroundColor: '#F5F7FA' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333', paddingVertical: 2 },
  iglesiaMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  iglesiaMemberInfo: { flex: 1, marginLeft: 12 },
  iglesiaMemberName: { fontSize: 15, fontWeight: '600', color: '#222' },
});
