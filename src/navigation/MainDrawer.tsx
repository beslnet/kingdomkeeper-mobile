import React from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Icon } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

// Pantallas principales
import MainTabs from './MainTabs';
import Finanzas from '../screens/Finanzas';
import Cursos from '../screens/Cursos';
import Comunicaciones from '../screens/Comunicaciones';
import Seguimiento from '../screens/Seguimiento';
import Reportes from '../screens/Reportes';
import Branding from '../screens/Branding';
import Suscripciones from '../screens/Suscripciones';
import Integraciones from '../screens/Integraciones';
import Soporte from '../screens/Soporte';
import Config from '../screens/Config';

const Drawer = createDrawerNavigator();

// Mock de usuario
const userMock = {
  name: 'Juan Pérez',
  email: 'juan.perez@email.com',
};

const MENU_ITEMS = [
  { label: 'Inicio', icon: 'home-outline', screen: 'Inicio' },
  { label: 'Finanzas', icon: 'cash-multiple', screen: 'Finanzas' },
  { label: 'Cursos y Discipulado', icon: 'book-outline', screen: 'Cursos y Discipulado' },
  { label: 'Comunicaciones', icon: 'message-outline', screen: 'Comunicaciones' },
  { label: 'Seguimiento Pastoral', icon: 'account-heart-outline', screen: 'Seguimiento Pastoral' },
  { label: 'Reportes y Analytics', icon: 'chart-bar', screen: 'Reportes y Analytics' },
  { label: 'Personalización', icon: 'palette-outline', screen: 'Personalización' },
  { label: 'Suscripciones', icon: 'credit-card-outline', screen: 'Suscripciones' },
  { label: 'Integraciones', icon: 'puzzle-outline', screen: 'Integraciones' },
  { label: 'Soporte', icon: 'lifebuoy', screen: 'Soporte' },
  { label: 'Configuración', icon: 'cog-outline', screen: 'Configuración' },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const logout = useAuthStore((state) => state.logout);
  const { navigation, state } = props;
  const activeRoute = state?.routeNames[state?.index];

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* HEADER usuario */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.avatarCircle}>
          <Icon source="account-circle" size={54} color="#B0B0B0" />
        </View>
        <Text style={drawerStyles.userName}>{userMock.name}</Text>
        <Text style={drawerStyles.userEmail}>{userMock.email}</Text>
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
                  color={activeRoute === item.screen ? "#2B72FF" : "#555"}
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
        <Text style={drawerStyles.versionText}>v0.1.0 (Prueba)</Text>
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
  userName: { fontWeight: '600', fontSize: 16, color: '#222' },
  userEmail: { fontSize: 13, color: '#666', marginBottom: 2 },
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
  menuLabelActive: { color: '#2B72FF', fontWeight: '600' },
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
      <Drawer.Screen name="Finanzas" component={Finanzas} />
      <Drawer.Screen name="Cursos y Discipulado" component={Cursos} />
      <Drawer.Screen name="Comunicaciones" component={Comunicaciones} />
      <Drawer.Screen name="Seguimiento Pastoral" component={Seguimiento} />
      <Drawer.Screen name="Reportes y Analytics" component={Reportes} />
      <Drawer.Screen name="Personalización" component={Branding} />
      <Drawer.Screen name="Suscripciones" component={Suscripciones} />
      <Drawer.Screen name="Integraciones" component={Integraciones} />
      <Drawer.Screen name="Soporte" component={Soporte} />
      <Drawer.Screen name="Configuración" component={Config} />
    </Drawer.Navigator>
  );
}