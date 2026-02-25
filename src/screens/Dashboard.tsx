import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';
import api from '../api/api';

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/api/dashboard/')
      .catch(() => {/* ignore if endpoint not available */})
      .finally(() => setLoading(false));
  }, []);

  const genero = user?.miembro_asociado?.genero;
  const greeting = genero === 'F' ? '¡Bienvenida' : '¡Bienvenido';
  const firstName = user?.nombre || user?.username || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {firstName}!</Text>
          <Text style={styles.subGreeting}>Que tengas un excelente día</Text>
        </View>
        {iglesiaNombre ? (
          <View style={styles.churchChip}>
            <Icon source="church" size={14} color={PANTONE_295C} />
            <Text style={styles.churchChipText}>{iglesiaNombre}</Text>
          </View>
        ) : null}
      </View>

      {/* Loading */}
      {loading && (
        <ActivityIndicator size="small" color={PANTONE_295C} style={{ marginVertical: 20 }} />
      )}

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.quickActions}>
        <QuickCard icon="account-group-outline" label="Grupos" color={PANTONE_295C} />
        <QuickCard icon="message-outline" label="Bandeja" color={PANTONE_295C} />
        <QuickCard icon="account-circle-outline" label="Perfil" color={PANTONE_295C} />
      </View>
    </ScrollView>
  );
}

function QuickCard({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.quickCard}>
      <View style={[styles.quickCardIcon, { backgroundColor: color + '18' }]}>
        <Icon source={icon} size={32} color={color} />
      </View>
      <Text style={styles.quickCardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: PANTONE_295C,
    padding: 24,
    paddingTop: 28,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 13, color: PANTONE_134C, marginTop: 4 },
  churchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    maxWidth: 140,
  },
  churchChipText: { fontSize: 11, color: PANTONE_295C, fontWeight: '600', flexShrink: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
  },
  quickCardIcon: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  quickCardLabel: { fontSize: 12, fontWeight: '600', color: '#444' },
});