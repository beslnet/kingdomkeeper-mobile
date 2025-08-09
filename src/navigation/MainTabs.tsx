import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import MiembrosScreen from '../screens/Miembros';
import GruposScreen from '../screens/Grupos';
import EventosScreen from '../screens/Eventos';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }} // Puedes mostrar el header si quieres
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Miembros" component={MiembrosScreen} />
      <Tab.Screen name="Grupos" component={GruposScreen} />
      <Tab.Screen name="Eventos" component={EventosScreen} />
    </Tab.Navigator>
  );
}