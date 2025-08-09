import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator'; // Pantallas de login, recuperar clave, etc.
import AppNavigator from './src/navigation/AppNavigator';   // Dashboard y app principal
import { getAccessToken } from './src/utils/auth';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Chequea si hay sesión iniciada al arrancar la app
    const checkAuth = async () => {
      const token = await getAccessToken();
      setIsLoggedIn(!!token);
    };
    checkAuth();
  }, []);

  // Opcional: puedes escuchar eventos de login/logout para actualizar el estado global

  if (isLoggedIn === null) {
    // Loader/Splash mientras se chequea la sesión
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#183866" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <NavigationContainer>
        {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}