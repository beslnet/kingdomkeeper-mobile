import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import BandejaEntradaScreen from '../screens/comunicaciones/BandejaEntradaScreen';
import BandejaDetailScreen from '../screens/comunicaciones/BandejaDetailScreen';
import GestionListScreen from '../screens/comunicaciones/GestionListScreen';
import ComunicacionDetailScreen from '../screens/comunicaciones/ComunicacionDetailScreen';
import ComunicacionFormScreen from '../screens/comunicaciones/ComunicacionFormScreen';

const Stack = createStackNavigator();

const HamburgerButton = ({ navigation }: { navigation: any }) => (
  <TouchableOpacity
    onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
    style={{ paddingHorizontal: 16 }}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Icon source="menu" size={24} color={PANTONE_134C} />
  </TouchableOpacity>
);

export default function ComunicacionesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="BandejaEntrada"
        component={BandejaEntradaScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Bandeja de Entrada',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="BandejaDetail"
        component={BandejaDetailScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.titulo || 'Mensaje',
        })}
      />
      <Stack.Screen
        name="GestionList"
        component={GestionListScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Gestionar Comunicaciones',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="ComunicacionDetail"
        component={ComunicacionDetailScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.titulo || 'Detalle',
        })}
      />
      <Stack.Screen
        name="ComunicacionForm"
        component={ComunicacionFormScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.comunicacion
            ? 'Editar Comunicación'
            : 'Nueva Comunicación',
        })}
      />
    </Stack.Navigator>
  );
}
