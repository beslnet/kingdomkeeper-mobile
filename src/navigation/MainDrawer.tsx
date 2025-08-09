import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';

import { logout } from '../utils/auth';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { Icon } from 'react-native-paper';

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

import { DrawerContentComponentProps } from '@react-navigation/drawer';

const LogoutIcon = ({ color, size }: { color: string; size: number }) => (
  <Icon source="logout" color={color} size={size} />
);

function CustomDrawerContent(props: DrawerContentComponentProps) {

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
            await logout(); // Esto borra el token, y App.js detecta el cambio en el próximo render
          }
        }
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Cerrar sesión"
        onPress={handleLogout}
        icon={LogoutIcon}
      />
    </DrawerContentScrollView>
  );
}

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