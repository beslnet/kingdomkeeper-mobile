import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import ProfileStack from './ProfileStack';
import { getNoLeidasCount } from '../api/comunicaciones';

const Tab = createBottomTabNavigator();

function useBadgeCount() {
  const [count, setCount] = useState<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await getNoLeidasCount();
      setCount(res.count > 0 ? res.count : undefined);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count, refresh };
}

// Placeholder vacío — el tab press siempre redirige, nunca se renderiza
function EmptyBandeja() {
  return <View style={{ flex: 1 }} />;
}

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
  const { count } = useBadgeCount();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => getScreenOptions(route, count)}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Bandeja"
        component={EmptyBandeja}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Navegar al ComunicacionesStack en el drawer (mismo header azul que el sidebar)
            navigation.getParent()?.navigate('Comunicaciones', { screen: 'BandejaEntrada' });
          },
        })}
      />
      <Tab.Screen name="Perfil" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}