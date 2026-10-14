import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';
import { usePermissionsStore } from '../store/permissionsStore';

import MiembrosListScreen from '../screens/membresia/MiembrosListScreen';
import MiembroDetailScreen from '../screens/membresia/MiembroDetailScreen';
import MiembroFormScreen from '../screens/membresia/MiembroFormScreen';
import BitacoraScreen from '../screens/membresia/BitacoraScreen';
import FamilyMiembroScreen from '../screens/membresia/FamilyMiembroScreen';
import ArchivedMiembrosScreen from '../screens/membresia/ArchivedMiembrosScreen';
import RegistrarVisitaScreen from '../screens/membresia/RegistrarVisitaScreen';

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
  // Quien llega por la función de bienvenida (rol member, sin `membresia.ver`) no tiene lista de miembros: su
  // primera pantalla es la ficha de la visita. Lo decide el permiso, no un rol.
  const veMiembros = usePermissionsStore((s) => s.hasPermission('membresia', 'ver'));
  return (
    <Stack.Navigator
      initialRouteName={veMiembros ? 'MiembrosList' : 'RegistrarVisita'}
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
      <Stack.Screen
        name="RegistrarVisita"
        component={RegistrarVisitaScreen}
        // Si es la primera pantalla de la pila (no hay a dónde volver) el menú va a la izquierda.
        options={({ navigation }: { navigation: any }) => ({
          title: 'Registrar visita',
          ...(navigation.canGoBack() ? {} : { headerLeft: () => <HamburgerButton navigation={navigation} /> }),
        })}
      />
    </Stack.Navigator>
  );
}
