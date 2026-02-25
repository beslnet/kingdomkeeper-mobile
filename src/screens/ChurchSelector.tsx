import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';

export default function ChurchSelectorScreen() {
  const iglesias = useAuthStore((state) => state.iglesias);
  const setIglesia = useIglesiaStore((state) => state.setIglesia);

  const handleSelect = (id: number, nombre: string) => {
    setIglesia(id, nombre);
    // App.tsx will re-render to MainDrawer once iglesiaId is set
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Icon source="church" size={48} color={PANTONE_134C} />
        <Text style={styles.title}>Selecciona tu iglesia</Text>
        <Text style={styles.subtitle}>Tienes acceso a más de una iglesia</Text>
      </View>
      <FlatList
        data={iglesias}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect(item.id, item.nombre)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <Icon source="church" size={28} color={PANTONE_295C} />
            </View>
            <Text style={styles.cardText}>{item.nombre}</Text>
            <Icon source="chevron-right" size={22} color={PANTONE_295C} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
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
    color: PANTONE_134C,
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E4EC',
  },
  cardIcon: {
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: PANTONE_295C,
  },
});
