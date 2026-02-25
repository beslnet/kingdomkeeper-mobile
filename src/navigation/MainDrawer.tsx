import React from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

// Pantallas principales
import MainTabs from './MainTabs';
import Comunicaciones from '../screens/Comunicaciones';
import Soporte from '../screens/Soporte';
import Config from '../screens/Config';

const Drawer = createDrawerNavigator();

const MENU_ITEMS = [
  { label: 'Inicio', icon: 'home-outline', screen: 'Inicio' },
  { label: 'Bandeja de Entrada', icon: 'message-outline', screen: 'Bandeja de Entrada' },
  { label: 'Configuración', icon: 'cog-outline', screen: 'Configuración' },
  { label: 'Soporte', icon: 'lifebuoy', screen: 'Soporte' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const iglesias = useAuthStore((state) => state.iglesias);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const resetIglesia = useIglesiaStore((state) => state.resetIglesia);
  const { navigation, state } = props;
  const activeRoute = state?.routeNames[state?.index];

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
          {MENU_ITEMS.map((item) => (
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
        <Text style={drawerStyles.footerText}>
          Hecho con <Icon source="heart" size={13} color="#F44" /> por tu equipo
        </Text>
        <Text style={drawerStyles.versionText}>v0.1.0</Text>
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
      <Drawer.Screen name="Bandeja de Entrada" component={Comunicaciones} />
      <Drawer.Screen name="Soporte" component={Soporte} />
      <Drawer.Screen name="Configuración" component={Config} />
    </Drawer.Navigator>
  );
}