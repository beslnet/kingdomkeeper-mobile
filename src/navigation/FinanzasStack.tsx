import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';
import FinanzasDashboardScreen from '../screens/finanzas/FinanzasDashboardScreen';
import TransaccionesListScreen from '../screens/finanzas/TransaccionesListScreen';
import TransaccionDetailScreen from '../screens/finanzas/TransaccionDetailScreen';
import TransaccionFormScreen from '../screens/finanzas/TransaccionFormScreen';
import CuentasListScreen from '../screens/finanzas/CuentasListScreen';
import CategoriasListScreen from '../screens/finanzas/CategoriasListScreen';

const Stack = createStackNavigator();

const HamburgerButton = ({ navigation }: { navigation: any }) => (
  <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={{ paddingHorizontal: 16 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
    <Icon source="menu" size={24} color={PANTONE_134C} />
  </TouchableOpacity>
);

export default function FinanzasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: PANTONE_295C }, headerTintColor: PANTONE_134C, headerTitleStyle: { fontWeight: 'bold' }, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="FinanzasDashboard" component={FinanzasDashboardScreen} options={({ navigation }: { navigation: any }) => ({ title: 'Finanzas', headerLeft: () => <HamburgerButton navigation={navigation} /> })} />
      <Stack.Screen name="TransaccionesList" component={TransaccionesListScreen} options={{ title: 'Transacciones' }} />
      <Stack.Screen name="TransaccionDetail" component={TransaccionDetailScreen} options={{ title: 'Detalle' }} />
      <Stack.Screen name="TransaccionForm" component={TransaccionFormScreen} options={({ route }: { route: any }) => ({ title: (route.params as any)?.transaccion ? 'Editar transacción' : 'Nueva transacción' })} />
      <Stack.Screen name="CuentasList" component={CuentasListScreen} options={{ title: 'Cuentas y Fondos' }} />
      <Stack.Screen name="CategoriasList" component={CategoriasListScreen} options={{ title: 'Categorías' }} />
    </Stack.Navigator>
  );
}
