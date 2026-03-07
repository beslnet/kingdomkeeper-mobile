import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usePermissionsStore } from '../../store/permissionsStore';
import { PANTONE_295C } from '../../theme/colors';
import { obtenerResumen, formatMonto, ResumenFinanzas } from '../../api/finanzas';

export default function FinanzasDashboardScreen() {
  const navigation = useNavigation<any>();
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const canView = isSuperAdmin || hasPermission('finanzas', 'ver');

  const [resumen, setResumen] = useState<ResumenFinanzas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerResumen();
      setResumen(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar el resumen.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      else if (d && typeof d === 'object') {
        const firstKey = Object.keys(d)[0];
        const firstVal = d[firstKey];
        msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!canView) {
    return (
      <View style={styles.lockedContainer}>
        <Icon source="lock-outline" size={56} color="#CCC" />
        <Text style={styles.lockedText}>Sin permisos para ver finanzas.</Text>
      </View>
    );
  }

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
        <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendientesCount =
    (resumen?.cantidad_egresos_pendientes ?? 0) +
    (resumen?.cantidad_ingresos_pendientes ?? 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Resumen General</Text>

        <View style={styles.cardsGrid}>
          <View style={[styles.summaryCard, styles.summaryCardGreen]}>
            <Icon source="arrow-up-circle-outline" size={28} color="#4CAF50" />
            <Text style={styles.summaryCardValue}>{formatMonto(resumen?.total_ingresos ?? 0)}</Text>
            <Text style={styles.summaryCardLabel}>Ingresos</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardRed]}>
            <Icon source="arrow-down-circle-outline" size={28} color="#E53935" />
            <Text style={styles.summaryCardValue}>{formatMonto(resumen?.total_egresos ?? 0)}</Text>
            <Text style={styles.summaryCardLabel}>Egresos</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardBlue]}>
            <Icon source="bank-outline" size={28} color={PANTONE_295C} />
            <Text style={styles.summaryCardValue}>{formatMonto(resumen?.balance ?? 0)}</Text>
            <Text style={styles.summaryCardLabel}>Balance</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardOrange]}>
            <Icon source="clock-outline" size={28} color="#FF9800" />
            <Text style={styles.summaryCardValueLarge}>{pendientesCount}</Text>
            <Text style={styles.summaryCardLabel}>transacciones</Text>
            <Text style={styles.summaryCardSubLabel}>Pendientes</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Acceso Rápido</Text>
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('TransaccionesList')}
            activeOpacity={0.75}
          >
            <Icon source="swap-horizontal" size={26} color={PANTONE_295C} />
            <Text style={styles.quickBtnText}>Ver Transacciones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('CuentasList')}
            activeOpacity={0.75}
          >
            <Icon source="wallet-outline" size={26} color={PANTONE_295C} />
            <Text style={styles.quickBtnText}>Cuentas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('CategoriasList')}
            activeOpacity={0.75}
          >
            <Icon source="tag-outline" size={26} color={PANTONE_295C} />
            <Text style={styles.quickBtnText}>Categorías</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TransaccionForm')}
        activeOpacity={0.85}
      >
        <Icon source="plus" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockedText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
    marginTop: 8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardGreen: {
    backgroundColor: '#E8F5E9',
  },
  summaryCardRed: {
    backgroundColor: '#FFEBEE',
  },
  summaryCardBlue: {
    backgroundColor: '#E3EAF5',
  },
  summaryCardOrange: {
    backgroundColor: '#FFF3E0',
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCardValueLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF9800',
    marginTop: 8,
  },
  summaryCardLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  summaryCardSubLabel: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: PANTONE_295C,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionLink: {
    fontSize: 13,
    color: PANTONE_295C,
    fontWeight: '600',
  },
  cuentaCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cuentaCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cuentaCardHeaderLeft: {
    flex: 1,
  },
  cuentaNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  cuentaTipo: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cuentaSaldoDisponible: {
    fontSize: 16,
    fontWeight: '800',
    color: PANTONE_295C,
  },
  cuentaDesglose: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  desgloseCol: {
    flex: 1,
    alignItems: 'center',
  },
  desgloseLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  desgloseNeutro: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  desgloseIngreso: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  desgloseEgreso: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E53935',
  },
  desgloseSep: {
    fontSize: 14,
    color: '#BBB',
    fontWeight: '300',
    paddingHorizontal: 2,
  },
  totalizadorCard: {
    backgroundColor: PANTONE_295C,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  totalizadorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalizadorRow: {
    flexDirection: 'row',
  },
  totalizadorItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalizadorLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 3,
  },
  totalizadorNeutro: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  totalizadorIngreso: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5D6A7',
  },
  totalizadorEgreso: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF9A9A',
  },
  totalizadorDisponible: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F2C75C',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
