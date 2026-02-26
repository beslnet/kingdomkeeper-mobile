import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { obtenerResumenFinanzas } from '../../api/grupos';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';

function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryCardIcon}>
        <Icon source={icon} size={24} color={color} />
      </View>
      <View style={styles.summaryCardInfo}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function GrupoFinanzasScreen() {
  const route = useRoute<any>();
  const { grupoId } = route.params ?? {};

  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await obtenerResumenFinanzas(grupoId);
      setResumen(result);
    } catch {
      setError('No se pudo cargar el resumen financiero. Toca para reintentar.');
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

  const totalIngresos = resumen?.total_ingresos ?? resumen?.ingresos ?? 0;
  const totalEgresos = resumen?.total_egresos ?? resumen?.egresos ?? 0;
  const balance = resumen?.balance ?? (totalIngresos - totalEgresos);
  const egresosPendientes = resumen?.egresos_pendientes ?? 0;
  const egresosAprobados = resumen?.egresos_aprobados ?? 0;
  const egresosPagados = resumen?.egresos_pagados ?? 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESUMEN</Text>
        <SummaryCard
          icon="arrow-down-circle-outline"
          label="Total Ingresos"
          value={formatCLP(totalIngresos)}
          color="#2E7D32"
        />
        <SummaryCard
          icon="arrow-up-circle-outline"
          label="Total Egresos"
          value={formatCLP(totalEgresos)}
          color="#C62828"
        />
        <SummaryCard
          icon="scale-balance"
          label="Balance"
          value={formatCLP(balance)}
          color={balance >= 0 ? '#1565C0' : '#C62828'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DESGLOSE EGRESOS</Text>
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.breakdownLabel}>Pendientes</Text>
            <Text style={styles.breakdownCount}>
              {resumen?.count_pendientes ?? egresosPendientes}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: '#1565C0' }]} />
            <Text style={styles.breakdownLabel}>Aprobados</Text>
            <Text style={styles.breakdownCount}>
              {resumen?.count_aprobados ?? egresosAprobados}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.breakdownLabel}>Pagados</Text>
            <Text style={styles.breakdownCount}>
              {resumen?.count_pagados ?? egresosPagados}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.readOnlyNote}>Vista de sólo lectura. La gestión de rendiciones estará disponible próximamente.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryCardIcon: { marginRight: 14 },
  summaryCardInfo: { flex: 1 },
  summaryLabel: { fontSize: 13, color: '#666', marginBottom: 2 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  breakdownLabel: { flex: 1, fontSize: 14, color: '#333' },
  breakdownCount: { fontSize: 16, fontWeight: '700', color: '#333' },
  separator: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },
  readOnlyNote: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 12,
    margin: 16,
    marginTop: 20,
  },
});
