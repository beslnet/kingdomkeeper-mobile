import React, { useEffect } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

// Pantallas principales
import MainTabs from './MainTabs';
import GruposStack from './GruposStack';
import ComunicacionesStack from './ComunicacionesStack';
import MembresiaStack from './MembresiaStack';
import FinanzasStack from './FinanzasStack';
import CasosPastoralesStack from './CasosPastoralesStack';
import InventarioStack from './InventarioStack';

const Drawer = createDrawerNavigator();

type MenuItem = {
  label: string;
  icon: string;
  screen: string;
  nestedTab?: string;
  nestedScreen?: string;
  permission?: { module: string; action: string };
  roles?: string[];
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', icon: 'home-outline', screen: 'Inicio', nestedTab: 'Dashboard' },
  { label: 'Membresía', icon: 'account-group-outline', screen: 'Membresía', permission: { module: 'membresia', action: 'ver' } },
  { label: 'Grupos y Células', icon: 'account-multiple-outline', screen: 'GruposCelulas', permission: { module: 'grupos', action: 'ver' } },
  { label: 'Finanzas', icon: 'cash-multiple', screen: 'Finanzas', permission: { module: 'finanzas', action: 'ver' } },
  { label: 'Comunicaciones', icon: 'forum-outline', screen: 'Comunicaciones', nestedScreen: 'GestionList', roles: ['church_admin', 'pastor', 'leader', 'treasurer'] },
  { label: 'Bandeja de Entrada', icon: 'message-outline', screen: 'Comunicaciones', nestedScreen: 'BandejaEntrada' },
  { label: 'Casos Pastorales', icon: 'heart-outline', screen: 'Casos Pastorales', permission: { module: 'pastoral', action: 'ver' } },
  { label: 'Inventario', icon: 'package-variant', screen: 'Inventario', permission: { module: 'inventario', action: 'ver' } },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const iglesias = useAuthStore((state) => state.iglesias);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const iglesiaId = useIglesiaStore((state) => state.iglesiaId);
  const resetIglesia = useIglesiaStore((state) => state.resetIglesia);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const isLoading = usePermissionsStore((s) => s.isLoading);
  const hasPermission = usePermissionsStore((s) => s.hasPermission);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);
  const tieneCasosAsignados = usePermissionsStore((s) => s.tieneCasosAsignados);
  const fetchPermissions = usePermissionsStore((s) => s.fetchPermissions);
  const { navigation, state } = props;
  const activeRoute = state?.routeNames[state?.index];

  // Para items con nestedTab (ej: Inicio→Dashboard, Inicio→Bandeja),
  // necesitamos saber cuál tab está activo dentro de MainTabs
  const inicioRoute = state?.routes?.find(r => r.name === 'Inicio');
  const activeNestedTab = inicioRoute?.state?.routes?.[inicioRoute?.state?.index ?? 0]?.name;

  // Para ComunicacionesStack: saber qué pantalla del stack está activa
  const comunicacionesRoute = state?.routes?.find(r => r.name === 'Comunicaciones');
  const comunicacionesStack = comunicacionesRoute?.state as any;
  const activeComunicacionesScreen = comunicacionesStack?.routes?.[comunicacionesStack?.index ?? 0]?.name;

  // Pantallas de gestión (del stack de Comunicaciones)
  const GESTION_SCREENS = new Set(['GestionList', 'ComunicacionDetail', 'ComunicacionForm']);

  const isItemActive = (item: MenuItem): boolean => {
    if (item.nestedTab) {
      return activeRoute === item.screen && activeNestedTab === item.nestedTab;
    }
    // Diferencia "Bandeja de Entrada" de "Comunicaciones" dentro del mismo stack
    if (item.screen === 'Comunicaciones') {
      // También activo cuando se está en el tab Bandeja del bottom bar (MainTabs)
      const inBottomBandeja = activeRoute === 'Inicio' && activeNestedTab === 'Bandeja';

      if (item.nestedScreen && GESTION_SCREENS.has(item.nestedScreen)) {
        // "Comunicaciones" (gestión): activo cuando estamos en pantallas de gestión
        return activeRoute === 'Comunicaciones' && (activeComunicacionesScreen
          ? GESTION_SCREENS.has(activeComunicacionesScreen)
          : false);
      } else {
        // "Bandeja de Entrada": activo cuando estamos en pantallas de bandeja o tab bottom
        if (inBottomBandeja) return true;
        if (activeRoute !== 'Comunicaciones') return false;
        return activeComunicacionesScreen
          ? !GESTION_SCREENS.has(activeComunicacionesScreen)
          : true;
      }
    }
    return activeRoute === item.screen;
  };
  useEffect(() => {
    if (iglesiaId) {
      fetchPermissions();
    }
  }, [iglesiaId, fetchPermissions]);

  const canSeeItem = (item: MenuItem): boolean => {
    if (isSuperAdmin) return true;
    if (isLoading) return !item.permission && !item.roles;
    if (item.roles && item.roles.length > 0 && !hasAnyRole(item.roles)) return false;
    // Casos Pastorales: visible si tiene permiso de gestión O tiene casos asignados
    if (item.screen === 'Casos Pastorales') {
      return hasPermission('pastoral', 'ver') || tieneCasosAsignados;
    }
    if (item.permission && !hasPermission(item.permission.module, item.permission.action)) return false;
    return true;
  };

  const displayName =
    user?.nombre && user?.apellidos
      ? `${user.nombre} ${user.apellidos}`
      : user?.nombre || user?.username || '—';

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* HEADER usuario */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.avatarCircle}>
          <Icon source="account-circle" size={54} color={PANTONE_134C} />
        </View>
        <Text style={drawerStyles.userName}>{displayName}</Text>
        <Text style={drawerStyles.userEmail}>{user?.email ?? '—'}</Text>
        {iglesias.length > 1 && (
          <TouchableOpacity style={drawerStyles.changeChurchBtn} onPress={resetIglesia} activeOpacity={0.8}>
            <Icon source="swap-horizontal" size={15} color={PANTONE_295C} />
            <Text style={drawerStyles.changeChurchText}>{iglesiaNombre ?? 'Cambiar iglesia'}</Text>
            <Icon source="chevron-down" size={15} color={PANTONE_295C} />
          </TouchableOpacity>
        )}
      </View>

      {/* MENÚ */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={drawerStyles.menuList}>
          {MENU_ITEMS.filter(canSeeItem).map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                drawerStyles.menuItem,
                isItemActive(item) && drawerStyles.menuItemActive,
              ]}
              onPress={() => {
                if (item.nestedTab) {
                  navigation.navigate(item.screen, { screen: item.nestedTab });
                } else if (item.nestedScreen) {
                  navigation.navigate(item.screen, { screen: item.nestedScreen });
                } else {
                  navigation.navigate(item.screen);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={drawerStyles.menuIconWrapper}>
                <Icon
                  source={item.icon}
                  size={24}
                  color={isItemActive(item) ? PANTONE_295C : '#555'}
                />
              </View>
              <Text
                style={[
                  drawerStyles.menuLabel,
                  isItemActive(item) && drawerStyles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={drawerStyles.footer}>
        <TouchableOpacity
          style={drawerStyles.logoutItem}
          onPress={() => Linking.openURL('https://wa.me/56973798921')}
          activeOpacity={0.7}
        >
          <View style={drawerStyles.menuIconWrapper}>
            <Icon source="whatsapp" size={22} color="#25D366" />
          </View>
          <Text style={[drawerStyles.logoutText, { color: '#25D366' }]}>Soporte por WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={drawerStyles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <View style={drawerStyles.menuIconWrapper}>
            <Icon source="logout" size={22} color="#888" />
          </View>
          <Text style={drawerStyles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const drawerStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingTop: 48,
    borderBottomColor: '#EEE',
    borderBottomWidth: 1,
    marginBottom: 6,
    backgroundColor: PANTONE_295C,
  },
  avatarCircle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 40,
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userName: { fontWeight: '600', fontSize: 16, color: '#fff' },
  userEmail: { fontSize: 13, color: PANTONE_134C, marginBottom: 2 },
  changeChurchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PANTONE_134C,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
    gap: 5,
  },
  changeChurchText: { fontSize: 13, color: PANTONE_295C, fontWeight: '600', flexShrink: 1 },
  menuList: { paddingVertical: 12 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 22,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: '#EAF2FF',
  },
  menuLabel: { fontSize: 15, color: '#444', flex: 1 },
  menuLabelActive: { color: PANTONE_295C, fontWeight: '600' },
  menuIconWrapper: { marginRight: 15 },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
    borderTopColor: '#EEE',
    borderTopWidth: 1,
    marginHorizontal: 10,
    marginTop: 8,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 16,
    marginLeft: 12,
  },
  logoutText: { color: '#888', fontSize: 15, marginLeft: 6 },
  footerText: { fontSize: 13, color: '#999', marginTop: 4, marginBottom: 2 },
  versionText: { fontSize: 11, color: '#BBB' },
});

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Inicio"
      drawerContent={CustomDrawerContent}
      screenOptions={{ headerShown: true }}
    >
      <Drawer.Screen name="Inicio" component={MainTabs} />
      <Drawer.Screen name="GruposCelulas" component={GruposStack} options={{ headerShown: false }} />
      <Drawer.Screen name="Membresía" component={MembresiaStack} options={{ headerShown: false }} />
      <Drawer.Screen name="Finanzas" component={FinanzasStack} options={{ headerShown: false }} />
      <Drawer.Screen name="Comunicaciones" component={ComunicacionesStack} options={{ headerShown: false }} />
      <Drawer.Screen name="Casos Pastorales" component={CasosPastoralesStack} options={{ headerShown: false }} />
      <Drawer.Screen name="Inventario" component={InventarioStack} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
}