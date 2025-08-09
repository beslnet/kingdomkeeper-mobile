import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import MiembrosScreen from '../screens/Miembros';
import GruposScreen from '../screens/Grupos';
import EventosScreen from '../screens/Eventos';

const Tab = createBottomTabNavigator();

const getScreenOptions = (route: { name: string }) => ({
  headerShown: false,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    let iconName: string = '';
    if (route.name === 'Dashboard') {
      iconName = 'view-dashboard-outline';
    } else if (route.name === 'Miembros') {
      iconName = 'account-group-outline';
    } else if (route.name === 'Grupos') {
      iconName = 'account-multiple-outline';
    } else if (route.name === 'Eventos') {
      iconName = 'calendar-outline';
    }
    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
  },
});

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => getScreenOptions(route)}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Miembros" component={MiembrosScreen} />
      <Tab.Screen name="Grupos" component={GruposScreen} />
      <Tab.Screen name="Eventos" component={EventosScreen} />
    </Tab.Navigator>
  );
}