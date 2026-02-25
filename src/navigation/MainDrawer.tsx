import React from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { usePermissionsStore } from '../store/permissionsStore';
import { PANTONE_295C } from '../theme/colors';
import { EXTERNAL_URLS } from '../constants/api';

// Pantallas principales
import MainTabs from './MainTabs';
import Finanzas from '../screens/Finanzas';
import Comunicaciones from '../screens/Comunicaciones';
import Seguimiento from '../screens/Seguimiento';
import Suscripciones from '../screens/Suscripciones';
import Config from '../screens/Config';
import Miembros from '../screens/Miembros';
import GruposCelulas from '../screens/GruposCelulas';
import Inventario from '../screens/Inventario';

const Drawer = createDrawerNavigator();

type MenuItem = {
  label: string;
  icon: string;
  screen: string;
  permission?: { module: string; action: string };
  roles?: string[];
  alwaysVisible?: boolean;
  onPress?: () => void;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', icon: 'home-outline', screen: 'Inicio', alwaysVisible: true },
  { label: 'Membresía', icon: 'account-group-outline', screen: 'Membresía', permission: { module: 'membresia', action: 'ver' } },
  { label: 'Grupos y Células', icon: 'account-multiple-outline', screen: 'Grupos y Células', permission: { module: 'grupos', action: 'ver' } },
  { label: 'Inventario', icon: 'package-variant-closed', screen: 'Inventario', permission: { module: 'inventario', action: 'ver' } },
  { label: 'Finanzas', icon: 'cash-multiple', screen: 'Finanzas', permission: { module: 'finanzas', action: 'ver' } },
  { label: 'Comunicaciones', icon: 'message-outline', screen: 'Comunicaciones', roles: ['church_admin', 'pastor', 'leader', 'treasurer'] },
  { label: 'Bandeja de Entrada', icon: 'inbox-outline', screen: 'Bandeja de Entrada', alwaysVisible: true },
  { label: 'Casos Pastorales', icon: 'account-heart-outline', screen: 'Casos Pastorales', permission: { module: 'pastoral', action: 'ver' } },
  { label: 'Suscripciones', icon: 'credit-card-outline', screen: 'Suscripciones', roles: ['church_admin', 'super_admin'] },
  { label: 'Configuración', icon: 'cog-outline', screen: 'Configuración', alwaysVisible: true },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { canAccess, hasAnyRole, isSuperAdmin } = usePermissionsStore();
  const { navigation, state } = props;
  const activeRoute = state?.routeNames[state?.index];

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.username
    : '';

  const isItemVisible = (item: MenuItem): boolean => {
    if (item.alwaysVisible) return true;
    if (isSuperAdmin) return true;
    if (item.permission) return canAccess(item.permission.module);
    if (item.roles) return hasAnyRole(item.roles);
    return false;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => { await logout(); },
        },
      ],
    );
  };

  const handleSoporte = () => {
    Linking.openURL(EXTERNAL_URLS.whatsappSupport);
  };

  const visibleItems = MENU_ITEMS.filter(isItemVisible);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* HEADER usuario */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.avatarCircle}>
          <Icon source="account-circle" size={54} color="#B0B0B0" />
        </View>
        <Text style={drawerStyles.userName}>{displayName}</Text>
        <Text style={drawerStyles.userEmail}>{user?.email ?? ''}</Text>
      </View>

      {/* MENÚ */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={drawerStyles.menuList}>
          {visibleItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[
                drawerStyles.menuItem,
                activeRoute === item.screen && drawerStyles.menuItemActive,
              ]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={drawerStyles.menuIconWrapper}>
                <Icon
                  source={item.icon}
                  size={24}
                  color={activeRoute === item.screen ? PANTONE_295C : '#555'}
                />
              </View>
              <Text
                style={[
                  drawerStyles.menuLabel,
                  activeRoute === item.screen && drawerStyles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Soporte siempre visible */}
          <TouchableOpacity
            style={drawerStyles.menuItem}
            onPress={handleSoporte}
            activeOpacity={0.7}
          >
            <View style={drawerStyles.menuIconWrapper}>
              <Icon source="lifebuoy" size={24} color="#555" />
            </View>
            <Text style={drawerStyles.menuLabel}>Soporte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={drawerStyles.footer}>
        <TouchableOpacity style={drawerStyles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
          <View style={drawerStyles.menuIconWrapper}>
            <Icon source="logout" size={22} color="#888" />
          </View>
          <Text style={drawerStyles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <Text style={drawerStyles.versionText}>v0.1.0</Text>
      </View>
    </View>
  );
}

const drawerStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomColor: '#EEE',
    borderBottomWidth: 1,
    marginBottom: 6,
    backgroundColor: PANTONE_295C,
  },
  avatarCircle: {
    backgroundColor: '#E0E0E0',
    borderRadius: 40,
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  userName: { fontWeight: '600', fontSize: 16, color: '#fff' },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
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
      <Drawer.Screen name="Membresía" component={Miembros} />
      <Drawer.Screen name="Grupos y Células" component={GruposCelulas} />
      <Drawer.Screen name="Inventario" component={Inventario} />
      <Drawer.Screen name="Finanzas" component={Finanzas} />
      <Drawer.Screen name="Comunicaciones" component={Comunicaciones} />
      <Drawer.Screen name="Bandeja de Entrada" component={Comunicaciones} />
      <Drawer.Screen name="Casos Pastorales" component={Seguimiento} />
      <Drawer.Screen name="Suscripciones" component={Suscripciones} />
      <Drawer.Screen name="Configuración" component={Config} />
    </Drawer.Navigator>
  );
}