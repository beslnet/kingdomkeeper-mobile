import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../screens/Profile';
import ChangePasswordScreen from '../screens/ChangePassword';
import FamilyRelationshipsScreen from '../screens/FamilyRelationships';
import DeleteAccountScreen from '../screens/DeleteAccount';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Mi Perfil' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Cambiar Contraseña' }}
      />
      <Stack.Screen
        name="FamilyRelationships"
        component={FamilyRelationshipsScreen}
        options={{ title: 'Relaciones Familiares' }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ title: 'Eliminar Cuenta' }}
      />
    </Stack.Navigator>
  );
}
