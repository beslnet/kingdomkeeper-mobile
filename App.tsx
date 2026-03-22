import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import ChurchSelectorScreen from './src/screens/ChurchSelector';
import TermsAcceptanceScreen from './src/screens/TermsAcceptanceScreen';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { useIglesiaStore } from './src/store/iglesiaStore';
import { initializePushNotifications, syncPushDeviceToken } from './src/services/pushNotifications';

export default function App() {
  const { isLoggedIn, checkAuth, termsAccepted } = useAuthStore();
  const iglesiaId = useIglesiaStore((state) => state.iglesiaId);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const startPushSetup = async () => {
      await initializePushNotifications();
    };

    startPushSetup().catch((error) => {
      console.warn('Push initialization failed.', error);
    });

    const unsubscribeTokenRefresh = messaging().onTokenRefresh((token) => {
      syncPushDeviceToken(token).catch((error) => {
        console.warn('Push token refresh sync failed.', error);
      });
    });

    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground push received:', remoteMessage.messageId);
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
    };
  }, [isLoggedIn]);

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
