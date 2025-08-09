import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Login';
import ForgotPasswordScreen from '../screens/ForgotPassword';
import DashboardScreen from '../screens/Dashboard';

const Stack = createStackNavigator();

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
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ headerLeft: null, title: 'Dashboard', gestureEnabled: false }}
        />
          {/* ...otras pantallas */}
        </Stack.Navigator>
    );
}
