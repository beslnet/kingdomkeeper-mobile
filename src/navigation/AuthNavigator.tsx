import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Login';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import ChurchSelectorScreen from '../screens/ChurchSelector';
import type { AuthStackParamList } from '../types/navigation';

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar contraseña' }}
      />
      <Stack.Screen
        name="ChurchSelector"
        component={ChurchSelectorScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
