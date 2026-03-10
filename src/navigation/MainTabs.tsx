import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import ProfileStack from './ProfileStack';
import BandejaStack from './BandejaStack';
import { useBadgeStore } from '../store/badgeStore';

const Tab = createBottomTabNavigator();

const getScreenOptions = (route: { name: string }, badgeCount: number | undefined) => ({
  headerShown: false,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    let iconName: string = '';
    if (route.name === 'Dashboard') {
      iconName = 'view-dashboard-outline';
    } else if (route.name === 'Bandeja') {
      iconName = 'message-outline';
    } else if (route.name === 'Perfil') {
      iconName = 'account-circle-outline';
    }
    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
  },
  ...(route.name === 'Bandeja' ? { tabBarBadge: badgeCount } : {}),
});

export default function MainTabs() {
  const count = useBadgeStore((s) => s.count);
  const refresh = useBadgeStore((s) => s.refresh);

  // Initial load + polling every 60s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => getScreenOptions(route, count)}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Bandeja" component={BandejaStack} />
      <Tab.Screen name="Perfil" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}