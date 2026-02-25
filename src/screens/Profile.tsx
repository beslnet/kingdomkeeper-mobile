import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Icon, Divider } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { mapRolesToDisplay } from '../utils/roles';
import { PANTONE_295C } from '../theme/colors';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const [loggingOut, setLoggingOut] = useState(false);

  const fullName =
    user?.nombre && user?.apellidos
      ? `${user.nombre} ${user.apellidos}`
      : user?.nombre || user?.username || '—';

  const roleLabels = mapRolesToDisplay(user?.roles ?? []);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Icon source="account-circle" size={72} color={PANTONE_295C} />
        </View>
        <Text style={styles.fullName}>{fullName}</Text>
        <Text style={styles.email}>{user?.email ?? '—'}</Text>
        {iglesiaNombre ? (
          <View style={styles.churchBadge}>
            <Icon source="church" size={14} color={PANTONE_295C} />
            <Text style={styles.churchBadgeText}>{iglesiaNombre}</Text>
          </View>
        ) : null}
      </View>

      {/* Roles */}
      {roleLabels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROLES</Text>
          <Divider style={styles.divider} />
          <View style={styles.rolesContainer}>
            {roleLabels.map((label, idx) => (
              <View key={idx} style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Personal info */}
      {user?.miembro_asociado && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INFORMACIÓN PERSONAL</Text>
          <Divider style={styles.divider} />
          {user.miembro_asociado.telefono ? (
            <InfoRow icon="phone-outline" label="Teléfono" value={user.miembro_asociado.telefono} />
          ) : null}
          {user.miembro_asociado.direccion ? (
            <InfoRow icon="map-marker-outline" label="Dirección" value={user.miembro_asociado.direccion} />
          ) : null}
          {user.miembro_asociado.fecha_nacimiento ? (
            <InfoRow icon="calendar-outline" label="Nacimiento" value={user.miembro_asociado.fecha_nacimiento} />
          ) : null}
        </View>
      )}

      {/* Logout button */}
      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.8}
      >
        <Icon source="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon source={icon} size={18} color={PANTONE_295C} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avatarCircle: {
    backgroundColor: '#EAF0FB',
    borderRadius: 50,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fullName: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 8 },
  churchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
    gap: 4,
  },
  churchBadgeText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 8,
  },
  divider: { marginBottom: 12 },
  rolesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBadge: {
    backgroundColor: '#EAF0FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleBadgeText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoLabel: { fontSize: 14, color: '#888', width: 90 },
  infoValue: { fontSize: 14, color: '#222', flex: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C0392B',
    marginHorizontal: 32,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
