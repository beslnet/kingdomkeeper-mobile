import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { usePermissionsStore } from '../../store/permissionsStore';
import { listarMiembrosArchivados, reactivarMiembro, Miembro } from '../../api/miembros';
import { PANTONE_295C } from '../../theme/colors';

function ArchivedCard({
  item,
  onReactivar,
  canReactivar,
}: {
  item: Miembro;
  onReactivar: () => void;
  canReactivar: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardAvatar}>
        <Icon source="archive-outline" size={22} color="#AAA" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>
          {item.nombre} {item.apellidos}
        </Text>
        {item.documento_identidad ? (
          <Text style={styles.cardMeta}>{item.documento_identidad}</Text>
        ) : null}
      </View>
      {canReactivar && (
        <TouchableOpacity style={styles.reactivarBtn} onPress={onReactivar} activeOpacity={0.75}>
          <Icon source="restore" size={16} color={PANTONE_295C} />
          <Text style={styles.reactivarText}>Reactivar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ArchivedMiembrosScreen() {
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const canReactivar = isSuperAdmin || hasPermission('membresia', 'crear');

  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listarMiembrosArchivados();
      setMiembros(result);
    } catch {
      setError('No se pudo cargar los miembros archivados.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleReactivar = (miembro: Miembro) => {
    Alert.alert(
      'Reactivar miembro',
      `¿Deseas reactivar a ${miembro.nombre} ${miembro.apellidos}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar',
          onPress: async () => {
            try {
              await reactivarMiembro(miembro.id);
              setMiembros((prev) => prev.filter((m) => m.id !== miembro.id));
            } catch {
              Alert.alert('Error', 'No se pudo reactivar el miembro.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PANTONE_295C} />
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.centered} onPress={load}>
          <Icon source="alert-circle-outline" size={36} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={miembros}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <ArchivedCard
              item={item}
              canReactivar={canReactivar}
              onReactivar={() => handleReactivar(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[PANTONE_295C]}
              tintColor={PANTONE_295C}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon source="archive-check-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No hay miembros archivados.</Text>
            </View>
          }
          contentContainerStyle={
            miembros.length === 0 ? styles.emptyContainer : { padding: 12 }
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#E53935', marginTop: 8, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#555' },
  cardMeta: { fontSize: 12, color: '#AAA', marginTop: 2 },
  reactivarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reactivarText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
});
