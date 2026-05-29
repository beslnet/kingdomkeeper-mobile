import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { DrawerActions, RouteProp } from '@react-navigation/native';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import NotificacionDetailScreen from '../screens/notificaciones/NotificacionDetailScreen';
import { NotificacionesStackParamList } from '../types/navigation';

const Stack = createStackNavigator<NotificacionesStackParamList>();

export default function NotificacionesStack({ navigation }: { navigation: any }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="NotificacionesList"
        component={NotificacionesScreen}
        options={{
          title: 'Notificaciones',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ paddingHorizontal: 16 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="menu" size={24} color={PANTONE_134C} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="NotificacionDetail"
        component={NotificacionDetailScreen}
        options={({ route }: { route: RouteProp<NotificacionesStackParamList, 'NotificacionDetail'> }) => ({
          title: route.params?.notificacion?.titulo ?? 'Detalle',
        })}
      />
    </Stack.Navigator>
  );
}
