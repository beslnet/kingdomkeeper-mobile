import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';
import type { Iglesia } from '../api/auth';

export default function ChurchSelectorScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const iglesias = useAuthStore((state) => state.iglesias);
  const setIglesia = useIglesiaStore((state) => state.setIglesia);
  const fetchPermissions = usePermissionsStore((state) => state.fetchPermissions);

  const handleSelect = async (iglesia: Iglesia) => {
    setIglesia(iglesia.id, iglesia.nombre);
    await fetchPermissions();
    navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon source="church" size={48} color={PANTONE_134C} />
        <Text style={styles.title}>Selecciona tu iglesia</Text>
        <Text style={styles.subtitle}>Tienes acceso a múltiples iglesias. ¿Con cuál quieres continuar?</Text>
      </View>
      <FlatList
        data={iglesias}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect(item)}
            activeOpacity={0.75}
          >
            <View style={styles.cardIcon}>
              <Icon source="church" size={28} color={PANTONE_295C} />
            </View>
            <Text style={styles.cardText}>{item.nombre}</Text>
            <Icon source="chevron-right" size={22} color="#AAA" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes iglesias asignadas.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: PANTONE_295C,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: PANTONE_295C,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 15,
  },
});
