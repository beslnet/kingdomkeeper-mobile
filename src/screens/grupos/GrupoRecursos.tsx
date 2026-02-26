import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { listarRecursosPorGrupo } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function getRecursoIcon(tipo: string): string {
  switch ((tipo ?? '').toLowerCase()) {
    case 'pdf': return 'file-pdf-box';
    case 'imagen':
    case 'image': return 'image-outline';
    case 'video': return 'video-outline';
    case 'audio': return 'music-box-outline';
    case 'enlace':
    case 'link':
    case 'url': return 'link-variant';
    case 'documento':
    case 'doc':
    case 'docx': return 'file-word-box-outline';
    case 'hoja':
    case 'xls':
    case 'xlsx': return 'file-excel-box-outline';
    default: return 'file-outline';
  }
}

function getAccesoColor(nivel: string): { bg: string; text: string } {
  switch ((nivel ?? '').toLowerCase()) {
    case 'público':
    case 'publico':
    case 'all': return { bg: '#E8F5E9', text: '#2E7D32' };
    case 'miembros':
    case 'members': return { bg: '#E3F2FD', text: '#1565C0' };
    case 'líderes':
    case 'lideres':
    case 'leaders': return { bg: '#FFF8E1', text: '#F57F17' };
    default: return { bg: '#F5F5F5', text: '#616161' };
  }
}

export default function GrupoRecursosScreen() {
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};

  const [recursos, setRecursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await listarRecursosPorGrupo(grupoId);
      setRecursos(Array.isArray(result) ? result : result.results ?? []);
    } catch {
      setError('No se pudo cargar los recursos. Toca para reintentar.');
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

  const handleOpen = useCallback(async (recurso: any) => {
    const url = recurso.url ?? recurso.archivo ?? recurso.enlace;
    if (!url) {
      Alert.alert('Sin enlace', 'Este recurso no tiene un enlace disponible.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No disponible', 'No se puede abrir este recurso en tu dispositivo.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir el recurso.');
    }
  }, []);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={recursos}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={recursos.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Icon source="folder-open-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No hay recursos para este grupo</Text>
          </View>
        }
        renderItem={({ item }) => {
          const acceso = getAccesoColor(item.nivel_acceso ?? item.acceso ?? '');
          const iconName = getRecursoIcon(item.tipo ?? '');
          return (
            <View style={styles.card}>
              <View style={styles.cardIcon}>
                <Icon source={iconName} size={32} color={PANTONE_295C} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.nombre ?? item.titulo ?? '—'}</Text>
                {item.descripcion ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
                ) : null}
                {item.nivel_acceso || item.acceso ? (
                  <View style={[styles.accesoChip, { backgroundColor: acceso.bg }]}>
                    <Text style={[styles.accesoText, { color: acceso.text }]}>
                      {item.nivel_acceso ?? item.acceso}
                    </Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={styles.openBtn} onPress={() => handleOpen(item)}>
                <Icon source="open-in-new" size={22} color={PANTONE_295C} />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyText: { marginTop: 12, color: '#999', fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardIcon: { marginRight: 14 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 2 },
  cardDesc: { fontSize: 12, color: '#888', marginBottom: 6, lineHeight: 17 },
  accesoChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  accesoText: { fontSize: 11, fontWeight: '600' },
  openBtn: { padding: 6 },
});
