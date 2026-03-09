import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import ChurchSelectorScreen from './src/screens/ChurchSelector';
import TermsAcceptanceScreen from './src/screens/TermsAcceptanceScreen';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { useIglesiaStore } from './src/store/iglesiaStore';

export default function App() {
  const { isLoggedIn, checkAuth, termsAccepted } = useAuthStore();
  const iglesiaId = useIglesiaStore((state) => state.iglesiaId);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoggedIn === null) {
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
          {!isLoggedIn
            ? <AuthNavigator />
            : termsAccepted === false
              ? <TermsAcceptanceScreen />
              : iglesiaId
                ? <AppNavigator />
                : <ChurchSelectorScreen />
          }
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}