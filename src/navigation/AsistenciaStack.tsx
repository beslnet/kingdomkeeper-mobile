import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import AsistenciaScreen from '../screens/asistencia/AsistenciaScreen';

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

export default function AsistenciaStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C, shadowOpacity: 0, elevation: 0 },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="AsistenciaMain"
        component={AsistenciaScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Asistencia',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
    </Stack.Navigator>
  );
}
