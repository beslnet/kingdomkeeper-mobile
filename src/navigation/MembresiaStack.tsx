import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import MiembrosListScreen from '../screens/membresia/MiembrosListScreen';
import MiembroDetailScreen from '../screens/membresia/MiembroDetailScreen';
import MiembroFormScreen from '../screens/membresia/MiembroFormScreen';
import BitacoraScreen from '../screens/membresia/BitacoraScreen';
import FamilyMiembroScreen from '../screens/membresia/FamilyMiembroScreen';
import ArchivedMiembrosScreen from '../screens/membresia/ArchivedMiembrosScreen';

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

export default function MembresiaStack() {
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
        name="MiembrosList"
        component={MiembrosListScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Membresía',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="MiembroDetail"
        component={MiembroDetailScreen}
        options={({ route }: { route: any }) => ({
          title: route.params?.nombre ?? 'Detalle miembro',
        })}
      />
      <Stack.Screen
        name="MiembroForm"
        component={MiembroFormScreen}
        options={({ route }: { route: any }) => ({
          title: route.params?.miembro ? 'Editar miembro' : 'Nuevo miembro',
        })}
      />
      <Stack.Screen
        name="BitacoraMiembro"
        component={BitacoraScreen}
        options={({ route }: { route: any }) => ({
          title: `Bitácora – ${route.params?.miembroNombre ?? ''}`,
        })}
      />
      <Stack.Screen
        name="FamilyMiembro"
        component={FamilyMiembroScreen}
        options={({ route }: { route: any }) => ({
          title: `Familia – ${route.params?.miembroNombre ?? ''}`,
        })}
      />
      <Stack.Screen
        name="MiembrosArchivados"
        component={ArchivedMiembrosScreen}
        options={{ title: 'Miembros archivados' }}
      />
    </Stack.Navigator>
  );
}
