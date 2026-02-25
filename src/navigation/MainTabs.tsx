import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList } from '../types/navigation';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import GruposScreen from '../screens/Grupos';
import BandejaScreen from '../screens/Comunicaciones';
import PerfilScreen from '../screens/Perfil';

const Tab = createBottomTabNavigator<MainTabParamList>();

const getScreenOptions = (route: { name: keyof MainTabParamList }) => ({
  headerShown: false,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    let iconName: string = '';
    if (route.name === 'Dashboard') {
      iconName = 'home-outline';
    } else if (route.name === 'Grupos') {
      iconName = 'account-group-outline';
    } else if (route.name === 'Bandeja') {
      iconName = 'inbox-outline';
    } else if (route.name === 'Perfil') {
      iconName = 'account-outline';
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
      <Tab.Screen name="Bandeja" component={BandejaScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}