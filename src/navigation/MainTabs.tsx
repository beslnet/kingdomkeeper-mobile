import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import GruposScreen from '../screens/Grupos';
import ComunicacionesScreen from '../screens/Comunicaciones';
import ProfileScreen from '../screens/Profile';

const Tab = createBottomTabNavigator();

const getScreenOptions = (route: { name: string }) => ({
  headerShown: false,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    let iconName: string = '';
    if (route.name === 'Dashboard') {
      iconName = 'view-dashboard-outline';
    } else if (route.name === 'Grupos') {
      iconName = 'account-multiple-outline';
    } else if (route.name === 'Bandeja') {
      iconName = 'message-outline';
    } else if (route.name === 'Perfil') {
      iconName = 'account-circle-outline';
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
      <Tab.Screen name="Grupos" component={GruposScreen} />
      <Tab.Screen name="Bandeja" component={ComunicacionesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}