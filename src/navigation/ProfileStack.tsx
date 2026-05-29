import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import ProfileScreen from '../screens/Profile';
import ChangePasswordScreen from '../screens/ChangePassword';
import FamilyRelationshipsScreen from '../screens/FamilyRelationships';
import DeleteAccountScreen from '../screens/DeleteAccount';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

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
        options={({ navigation }: { navigation: any }) => ({
          title: 'Mi Perfil',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
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
