import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { listarGruposArchivados, restaurarGrupo } from '../../api/grupos';
import { PANTONE_295C } from '../../theme/colors';

export default function GruposArchivados() {
  const navigation = useNavigation<any>();
  const [grupos, setGrupos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGrupos = useCallback(async () => {
    try {
      setError(null);
      const data = await listarGruposArchivados();
      setGrupos(data?.results ?? data ?? []);
    } catch (err: any) {
      setError('No se pudieron cargar los grupos archivados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); loadGrupos(); }, [loadGrupos]));

  const onRefresh = () => { setRefreshing(true); loadGrupos(); };

  const handleRestaurar = (grupo: any) => {
    Alert.alert(
      'Restaurar grupo',
      `¿Deseas restaurar "${grupo.nombre}"? Volverá a aparecer en el listado principal con estado activo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              await restaurarGrupo(grupo.id);
              loadGrupos();
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? 'No se pudo restaurar el grupo.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadGrupos} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={grupos}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Icon source="archive-outline" size={48} color="#B0BEC5" />
          <Text style={styles.emptyText}>No hay grupos archivados</Text>
        </View>
      }
      contentContainerStyle={grupos.length === 0 ? styles.emptyContainer : styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardInfo}
            onPress={() => navigation.navigate('GrupoDetail', { id: item.id, nombre: item.nombre })}
            activeOpacity={0.7}
          >
            <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
            <Text style={styles.cardMeta}>
              {item.tipo ?? 'Grupo'} · {item.total_miembros ?? 0} miembro{(item.total_miembros ?? 0) !== 1 ? 's' : ''}
            </Text>
            {item.lider_nombre ? (
              <Text style={styles.cardLider}>Líder: {item.lider_nombre}</Text>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.restaurarBtn} onPress={() => handleRestaurar(item)} activeOpacity={0.8}>
            <Icon source="restore" size={16} color="#2E7D32" />
            <Text style={styles.restaurarText}>Restaurar</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  listContent: { padding: 16, gap: 10 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#90A4AE', textAlign: 'center' },
  errorText: { fontSize: 15, color: '#E53935', textAlign: 'center', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: PANTONE_295C, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '600', color: '#37474F', marginBottom: 2 },
  cardMeta: { fontSize: 13, color: '#78909C' },
  cardLider: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  restaurarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginLeft: 10,
  },
  restaurarText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
});
