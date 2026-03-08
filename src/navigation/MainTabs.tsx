import React, { useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsFocused } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { DrawerActions } from '@react-navigation/native';

// Pantallas principales
import DashboardScreen from '../screens/Dashboard';
import BandejaEntradaScreen from '../screens/comunicaciones/BandejaEntradaScreen';
import BandejaDetailScreen from '../screens/comunicaciones/BandejaDetailScreen';
import ProfileStack from './ProfileStack';
import { getNoLeidasCount } from '../api/comunicaciones';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

const Tab = createBottomTabNavigator();
const BandejaStack = createStackNavigator();

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

function BandejaNavigator() {
  const isFocused = useIsFocused();
  const { refresh } = useBadgeCount();

  useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused, refresh]);

  return (
    <BandejaStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <BandejaStack.Screen
        name="BandejaEntrada"
        component={BandejaEntradaScreen}
        options={({ navigation }: { navigation: any }) => ({
          title: 'Bandeja de Entrada',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              style={{ paddingHorizontal: 16 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="menu" size={24} color={PANTONE_134C} />
            </TouchableOpacity>
          ),
        })}
      />
      <BandejaStack.Screen
        name="BandejaDetail"
        component={BandejaDetailScreen}
        options={({ route }: { route: any }) => ({
          title: (route.params as any)?.titulo || 'Mensaje',
        })}
      />
    </BandejaStack.Navigator>
  );
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
      <Tab.Screen name="Bandeja" component={BandejaNavigator} />
      <Tab.Screen name="Perfil" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}