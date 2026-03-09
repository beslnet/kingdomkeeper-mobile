import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

import InventarioMainScreen from '../screens/inventario/InventarioMainScreen';
import ArticulosListScreen from '../screens/inventario/ArticulosListScreen';
import ArticuloDetailScreen from '../screens/inventario/ArticuloDetailScreen';
import ArticuloFormScreen from '../screens/inventario/ArticuloFormScreen';
import CategoriasScreen from '../screens/inventario/CategoriasScreen';
import UbicacionesScreen from '../screens/inventario/UbicacionesScreen';
import PrestamosScreen from '../screens/inventario/PrestamosScreen';
import PrestamoFormScreen from '../screens/inventario/PrestamoFormScreen';
import DevolucionFormScreen from '../screens/inventario/DevolucionFormScreen';
import ProveedoresScreen from '../screens/inventario/ProveedoresScreen';
import ReportesScreen from '../screens/inventario/ReportesScreen';

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

export default function InventarioStack() {
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
        name="InventarioMain"
        component={InventarioMainScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Inventario',
          headerLeft: () => <HamburgerButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="ArticulosList"
        component={ArticulosListScreen}
        options={{ title: 'Artículos' }}
      />
      <Stack.Screen
        name="ArticuloDetail"
        component={ArticuloDetailScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.nombre
            ? String((route.params as any).nombre).length > 28
              ? String((route.params as any).nombre).substring(0, 28) + '…'
              : String((route.params as any).nombre)
            : 'Detalle del Artículo',
        })}
      />
      <Stack.Screen
        name="ArticuloForm"
        component={ArticuloFormScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.articulo ? 'Editar Artículo' : 'Nuevo Artículo',
        })}
      />
      <Stack.Screen
        name="Categorias"
        component={CategoriasScreen}
        options={{ title: 'Categorías' }}
      />
      <Stack.Screen
        name="Ubicaciones"
        component={UbicacionesScreen}
        options={{ title: 'Ubicaciones' }}
      />
      <Stack.Screen
        name="Prestamos"
        component={PrestamosScreen}
        options={{ title: 'Préstamos' }}
      />
      <Stack.Screen
        name="PrestamoForm"
        component={PrestamoFormScreen}
        options={{ title: 'Nuevo Préstamo' }}
      />
      <Stack.Screen
        name="DevolucionForm"
        component={DevolucionFormScreen}
        options={{ title: 'Registrar Devolución' }}
      />
      <Stack.Screen
        name="Proveedores"
        component={ProveedoresScreen}
        options={{ title: 'Proveedores' }}
      />
      <Stack.Screen
        name="Reportes"
        component={ReportesScreen}
        options={{ title: 'Reportes de Inventario' }}
      />
    </Stack.Navigator>
  );
}
