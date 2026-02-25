import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';

export default function PerfilScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const rolesDisplay = usePermissionsStore((state) => state.rolesDisplay);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.username
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Icon source="account-circle" size={72} color="#B0B0B0" />
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        {rolesDisplay.length > 0 && (
          <Text style={styles.role}>{rolesDisplay.join(' · ')}</Text>
        )}
      </View>

      {user?.miembro_asociado && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información personal</Text>
          {user.miembro_asociado.telefono ? (
            <View style={styles.row}>
              <Icon source="phone-outline" size={18} color={PANTONE_295C} />
              <Text style={styles.rowText}>{user.miembro_asociado.telefono}</Text>
            </View>
          ) : null}
          {user.miembro_asociado.direccion ? (
            <View style={styles.row}>
              <Icon source="map-marker-outline" size={18} color={PANTONE_295C} />
              <Text style={styles.rowText}>{user.miembro_asociado.direccion}</Text>
            </View>
          ) : null}
        </View>
      )}

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        labelStyle={styles.logoutLabel}
        icon="logout"
      >
        Cerrar sesión
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatarCircle: {
    backgroundColor: '#E0E0E0',
    borderRadius: 44,
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: PANTONE_295C,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  role: {
    fontSize: 13,
    color: PANTONE_134C,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  logoutButton: {
    marginTop: 40,
    borderColor: '#D32F2F',
  },
  logoutLabel: {
    color: '#D32F2F',
  },
});
