import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { PANTONE_295C, PANTONE_134C } from '../../theme/colors';
import { usePermissionsStore } from '../../store/permissionsStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type MenuSection = {
  label: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
  manageOnly?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: MenuSection[] = [
  {
    label: 'Artículos',
    description: 'Gestiona el inventario de bienes y equipos',
    icon: 'package-variant',
    screen: 'ArticulosList',
    color: PANTONE_295C,
  },
  {
    label: 'Préstamos',
    description: 'Controla préstamos y devoluciones',
    icon: 'swap-horizontal',
    screen: 'Prestamos',
    color: '#1565C0',
  },
  {
    label: 'Categorías',
    description: 'Organiza artículos por tipo',
    icon: 'tag-multiple-outline',
    screen: 'Categorias',
    color: '#6A1B9A',
    manageOnly: true,
  },
  {
    label: 'Ubicaciones',
    description: 'Administra lugares de almacenamiento',
    icon: 'map-marker-outline',
    screen: 'Ubicaciones',
    color: '#2E7D32',
    manageOnly: true,
  },
  {
    label: 'Proveedores',
    description: 'Gestiona los proveedores registrados',
    icon: 'truck-outline',
    screen: 'Proveedores',
    color: '#E65100',
    manageOnly: true,
  },
  {
    label: 'Reportes',
    description: 'Stock bajo, por ubicación y categoría',
    icon: 'chart-bar',
    screen: 'Reportes',
    color: '#00695C',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InventarioMainScreen() {
  const navigation = useNavigation<any>();
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const canManage = isSuperAdmin || hasAnyRole(['church_admin', 'inventory_manager']);

  const visibleSections = SECTIONS.filter(
    (s) => !s.manageOnly || canManage,
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Módulos de Inventario</Text>
      {visibleSections.map((section) => (
        <TouchableOpacity
          key={section.screen}
          style={styles.card}
          onPress={() => navigation.navigate(section.screen)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: section.color + '1A' }]}>
            <Icon source={section.icon} size={28} color={section.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>{section.label}</Text>
            <Text style={styles.cardDescription}>{section.description}</Text>
          </View>
          <Icon source="chevron-right" size={20} color="#BDBDBD" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 3 },
  cardDescription: { fontSize: 13, color: '#777', lineHeight: 18 },
});
