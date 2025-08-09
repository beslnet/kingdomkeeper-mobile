import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';

export default function GruposCelulasScreen({ navigation: _navigation }: { navigation: any }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon size={48} icon="account-multiple" style={styles.avatar} />
        <Text variant="titleLarge" style={styles.title}>Grupos / Células</Text>
      </View>
      <Text variant="bodyMedium" style={styles.paragraph}>
        Gestiona aquí los grupos, células, asigna miembros, líderes y consulta la información relevante.
      </Text>
      {/* Próximamente: buscador, listado, filtros, botón agregar grupo/célula */}
      <Button
        mode="contained"
        icon="plus-circle"
        style={styles.button}
        onPress={() => {/* navegación a pantalla de creación de grupo/célula */}}
      >
        Nuevo grupo/célula
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { marginRight: 12, backgroundColor: "#e0e7ef" },
  title: { color: "#183866" },
  paragraph: { color: "#475569", marginBottom: 24 },
  button: { marginTop: 12, backgroundColor: "#FFD95B" },
});