import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import CasosListScreen from '../screens/casosPastorales/CasosListScreen';
import CasoDetailScreen from '../screens/casosPastorales/CasoDetailScreen';
import CasoFormScreen from '../screens/casosPastorales/CasoFormScreen';

const Stack = createStackNavigator();

function HamburgerButton({ navigation }: { navigation: any }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={{ paddingHorizontal: 16 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon source="menu" size={24} color={PANTONE_134C} />
    </TouchableOpacity>
  );
}

export default function CasosPastoralesStack() {
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
        name="CasosList"
        component={CasosListScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Casos Pastorales',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="CasoDetail"
        component={CasoDetailScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.titulo
            ? String((route.params as any).titulo).length > 28
              ? String((route.params as any).titulo).substring(0, 28) + '…'
              : String((route.params as any).titulo)
            : 'Detalle del Caso',
        })}
      />
      <Stack.Screen
        name="CasoForm"
        component={CasoFormScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.caso ? 'Editar Caso' : 'Nuevo Caso',
        })}
      />
    </Stack.Navigator>
  );
}
