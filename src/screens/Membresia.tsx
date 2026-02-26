import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

export default function MembresiaScreen() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <Icon source="account-group-outline" size={72} color={PANTONE_295C} />
      <Text style={styles.title}>Módulo de Membresía</Text>
      <Text style={styles.subtitle}>Próximamente en tu app móvil</Text>
      <Text style={styles.description}>
        Gestión de miembros, perfiles y seguimiento. Accede a la información completa de cada miembro de tu iglesia.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Inicio')}>
        <Text style={styles.buttonText}>Ir al Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: PANTONE_295C, marginTop: 20, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#888', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  button: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonText: { color: PANTONE_134C, fontSize: 15, fontWeight: '600' },
});
