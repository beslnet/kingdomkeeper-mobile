import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainDrawer from './MainDrawer';
import MessageDetailScreen from '../screens/MessageDetail';
import { PANTONE_295C, PANTONE_134C } from '../theme/colors';

const RootStack = createStackNavigator();

export default function AppNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PANTONE_295C },
        headerTintColor: PANTONE_134C,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <RootStack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
      <RootStack.Screen
        name="MessageDetail"
        component={MessageDetailScreen}
        options={{ title: 'Mensaje' }}
      />
    </RootStack.Navigator>
  );
}
