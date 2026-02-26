import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  obtenerGrupo,
  cambiarLider,
  agregarCoLideres,
  removerCoLideres,
} from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

export default function GrupoLiderazgoScreen() {
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);

  const [grupo, setGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change leader modal
  const [liderModalVisible, setLiderModalVisible] = useState(false);
  // Add co-leader modal
  const [coLiderModalVisible, setCoLiderModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const canManage =
    isSuperAdmin ||
    hasAnyRole(['church_admin', 'pastor', 'leader']);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await obtenerGrupo(grupoId);
      setGrupo(result);
    } catch {
      setError('No se pudo cargar el liderazgo. Toca para reintentar.');
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

  const handleChangeLider = useCallback((miembro: any) => {
    Alert.alert(
      'Cambiar líder',
      `¿Designar a ${miembro.nombre_completo ?? miembro.nombre ?? 'este miembro'} como nuevo líder?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setActionLoading(true);
            try {
              await cambiarLider(grupoId, miembro.id);
              await load();
              setLiderModalVisible(false);
            } catch {
              Alert.alert('Error', 'No se pudo cambiar el líder.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [grupoId, load]);

  const handleAddCoLider = useCallback(async (miembro: any) => {
    setActionLoading(true);
    try {
      await agregarCoLideres(grupoId, [miembro.id]);
      await load();
      setCoLiderModalVisible(false);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el co-líder.');
    } finally {
      setActionLoading(false);
    }
  }, [grupoId, load]);

  const handleRemoveCoLider = useCallback((miembro: any) => {
    Alert.alert(
      'Remover co-líder',
      `¿Remover a ${miembro.nombre_completo ?? miembro.nombre ?? 'este miembro'} como co-líder?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await removerCoLideres(grupoId, [miembro.id]);
              await load();
            } catch {
              Alert.alert('Error', 'No se pudo remover el co-líder.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
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

  const lider = grupo?.lider ?? null;
  const coLideres: any[] = grupo?.co_lideres ?? grupo?.colideres ?? [];
  // Members eligible to be promoted (non-leaders)
  const miembros: any[] = (grupo?.miembros ?? []).filter(
    (m: any) => (m.mi_rol ?? m.rol) !== 'lider' && (m.mi_rol ?? m.rol) !== 'co_lider'
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
    >
      {/* Leader card */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Líder</Text>
      </View>
      <View style={styles.card}>
        {lider ? (
          <View style={styles.personRow}>
            <View style={styles.avatarCircle}>
              <Icon source="account-circle" size={40} color={PANTONE_295C} />
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{lider.nombre_completo ?? lider.nombre ?? '—'}</Text>
              {lider.email ? <Text style={styles.personEmail}>{lider.email}</Text> : null}
            </View>
            <View style={styles.liderBadge}>
              <Text style={styles.liderBadgeText}>Líder</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>No hay líder asignado</Text>
        )}
        {canManage && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setLiderModalVisible(true)}
            disabled={actionLoading}
          >
            <Icon source="account-switch-outline" size={18} color={PANTONE_295C} />
            <Text style={styles.actionBtnText}>Cambiar líder</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Co-leaders */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Co-Líderes</Text>
        {canManage && (
          <TouchableOpacity onPress={() => setCoLiderModalVisible(true)} disabled={actionLoading}>
            <Icon source="plus-circle-outline" size={22} color={PANTONE_295C} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.card}>
        {coLideres.length === 0 ? (
          <Text style={styles.noDataText}>No hay co-líderes asignados</Text>
        ) : (
          coLideres.map((cl: any, idx: number) => (
            <View key={cl.id ?? idx} style={[styles.personRow, idx < coLideres.length - 1 && styles.rowBorder]}>
              <View style={styles.avatarCircle}>
                <Icon source="account-circle" size={36} color="#555" />
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{cl.nombre_completo ?? cl.nombre ?? '—'}</Text>
                {cl.email ? <Text style={styles.personEmail}>{cl.email}</Text> : null}
              </View>
              {canManage && (
                <TouchableOpacity onPress={() => handleRemoveCoLider(cl)} disabled={actionLoading}>
                  <Icon source="close-circle-outline" size={22} color="#E53935" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Change leader modal */}
      <Modal visible={liderModalVisible} animationType="slide" onRequestClose={() => setLiderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar nuevo líder</Text>
            <TouchableOpacity onPress={() => setLiderModalVisible(false)}>
              <Icon source="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={miembros}
            keyExtractor={(item, index) => String(item.id ?? index)}
            contentContainerStyle={miembros.length === 0 ? styles.emptyContainer : { padding: 16 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Icon source="account-search-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>No hay miembros disponibles</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalMemberRow}
                onPress={() => handleChangeLider(item)}
                disabled={actionLoading}
                activeOpacity={0.75}
              >
                <Icon source="account-circle" size={32} color={PANTONE_295C} />
                <View style={styles.modalMemberInfo}>
                  <Text style={styles.personName}>{item.nombre_completo ?? item.nombre ?? '—'}</Text>
                  {item.email ? <Text style={styles.personEmail}>{item.email}</Text> : null}
                </View>
                <Icon source="chevron-right" size={20} color="#BBB" />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Add co-leader modal */}
      <Modal visible={coLiderModalVisible} animationType="slide" onRequestClose={() => setCoLiderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar co-líder</Text>
            <TouchableOpacity onPress={() => setCoLiderModalVisible(false)}>
              <Icon source="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={miembros}
            keyExtractor={(item, index) => String(item.id ?? index)}
            contentContainerStyle={miembros.length === 0 ? styles.emptyContainer : { padding: 16 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Icon source="account-search-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>No hay miembros disponibles</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalMemberRow}
                onPress={() => handleAddCoLider(item)}
                disabled={actionLoading}
                activeOpacity={0.75}
              >
                <Icon source="account-circle" size={32} color={PANTONE_295C} />
                <View style={styles.modalMemberInfo}>
                  <Text style={styles.personName}>{item.nombre_completo ?? item.nombre ?? '—'}</Text>
                  {item.email ? <Text style={styles.personEmail}>{item.email}</Text> : null}
                </View>
                <Icon source="plus-circle-outline" size={22} color={PANTONE_295C} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
  noDataText: { color: '#AAA', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  personRow: { flexDirection: 'row', alignItems: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 12, marginBottom: 12 },
  avatarCircle: { marginRight: 12 },
  personInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '600', color: '#222' },
  personEmail: { fontSize: 12, color: '#888', marginTop: 1 },
  liderBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  liderBadgeText: { fontSize: 12, color: '#F57F17', fontWeight: '600' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PANTONE_295C,
    gap: 6,
  },
  actionBtnText: { color: PANTONE_295C, fontSize: 14, fontWeight: '600' },
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
  modalMemberRow: {
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
  modalMemberInfo: { flex: 1, marginLeft: 12 },
});
