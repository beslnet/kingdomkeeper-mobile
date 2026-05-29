import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import ChurchSelectorScreen from './src/screens/ChurchSelector';
import TermsAcceptanceScreen from './src/screens/TermsAcceptanceScreen';
import { ActivityIndicator, View, Platform, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { useIglesiaStore } from './src/store/iglesiaStore';
import { useAppStore } from './src/store/appStore';
import { useBadgeStore } from './src/store/badgeStore';
import { initializePushNotifications, syncPushDeviceToken } from './src/services/pushNotifications';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ForceUpdateModal } from './src/components/ForceUpdateModal';
import { InAppNotificationBanner, InAppNotification } from './src/components/InAppNotificationBanner';
import { APP_VERSION } from './src/version';
import { isVersionOutdated } from './src/utils/versionCheck';
import { STORE_URLS } from './src/version';
import { navigationRef } from './src/navigation/navigationRef';
import { handleNotificationNavigation } from './src/utils/notificationNavigation';

export default function App() {
  const { isLoggedIn, checkAuth, termsAccepted } = useAuthStore();
  const iglesiaId = useIglesiaStore((state) => state.iglesiaId);
  const { forceUpdateRequired, forceUpdateUrl, setForceUpdate } = useAppStore();
  const refreshBadge = useBadgeStore((state) => state.refresh);
  const [foregroundNotif, setForegroundNotif] = useState<InAppNotification | null>(null);
  // Store initial notification to navigate once nav is ready (killed state)
  const pendingNotifRef = useRef<any>(null);

  useEffect(() => {
    // Killed state: app opened by tapping notification — check initial notification
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        // Navigation may not be ready yet; store and handle on nav ready
        pendingNotifRef.current = remoteMessage;
      }
    });
  }, []);

  const handleNavReady = () => {
    if (pendingNotifRef.current) {
      handleNotificationNavigation(pendingNotifRef.current);
      pendingNotifRef.current = null;
    }
  };

  // Refresh badge when app comes back to foreground (clears icon badge if all read)
  useEffect(() => {
    if (!isLoggedIn) return;
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        refreshBadge();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isLoggedIn, refreshBadge]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // iOS proactive version check against iTunes API (production only)
  useEffect(() => {
    if (__DEV__ || Platform.OS !== 'ios') return;
    const checkiOSVersion = async () => {
      try {
        const res = await fetch(
          'https://itunes.apple.com/lookup?bundleId=com.kingdomkeeper.mobile&country=cl',
        );
        const json = await res.json();
        const storeVersion: string = json?.results?.[0]?.version;
        if (storeVersion && isVersionOutdated(APP_VERSION, storeVersion)) {
          setForceUpdate(true, STORE_URLS.ios);
        }
      } catch {
        // Non-critical — ignore network errors during version check
      }
    };
    checkiOSVersion();
  }, [setForceUpdate]);

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
      const title = remoteMessage.notification?.title ?? 'Nueva notificación';
      const body = remoteMessage.notification?.body ?? '';
      setForegroundNotif({
        id: remoteMessage.messageId ?? String(Date.now()),
        title,
        body,
        remoteMessage, // stored for navigation on tap
      });
      // Refresh badge count to reflect this new unread notification
      refreshBadge();
    });

    // Background: app in background, user taps notification
    const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationNavigation(remoteMessage);
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeBackground();
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
        <NavigationContainer ref={navigationRef} onReady={handleNavReady}>
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
      {/* OfflineBanner: absolute position, renders above everything */}
      <OfflineBanner />
      <InAppNotificationBanner
        notification={foregroundNotif}
        onDismiss={() => setForegroundNotif(null)}
        onNavigate={handleNotificationNavigation}
      />
      {/* ForceUpdateModal: non-dismissable fullscreen modal (production only) */}
      <ForceUpdateModal
        visible={!__DEV__ && forceUpdateRequired}
        storeUrl={forceUpdateUrl ?? undefined}
      />
    </SafeAreaProvider>
  );
}
