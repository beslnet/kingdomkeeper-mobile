import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { registerPushDevice, unregisterPushDeviceToken } from '../api/pushNotifications';

const PUSH_TOKEN_STORAGE_KEY = 'push-token';

const requestPushPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
};

const ensureRemoteMessagesRegistration = async () => {
  if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }
};

export const syncPushDeviceToken = async (providedToken?: string) => {
  try {
    const hasPermission = await requestPushPermission();
    if (!hasPermission) {
      console.warn('Push notifications permission was not granted.');
      return;
    }

    await ensureRemoteMessagesRegistration();

    const token = providedToken ?? await messaging().getToken();
    if (!token) {
      console.warn('Firebase messaging did not return a device token.');
      return;
    }

    const deviceName = await DeviceInfo.getDeviceName();
    await registerPushDevice({
      token,
      device_type: Platform.OS === 'ios' ? 'ios' : 'android',
      device_name: deviceName,
    });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn('Failed to synchronize push token.', error);
  }
};

export const initializePushNotifications = async () => {
  await syncPushDeviceToken();
};

export const unregisterPushDevice = async () => {
  try {
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    const currentToken = storedToken ?? await messaging().getToken();

    if (currentToken) {
      await unregisterPushDeviceToken(currentToken);
    }

    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to unregister push token.', error);
  }
};

export const getInitialPushNotification = async (): Promise<FirebaseMessagingTypes.RemoteMessage | null> => {
  try {
    return await messaging().getInitialNotification();
  } catch (error) {
    console.warn('Failed to obtain initial push notification.', error);
    return null;
  }
};
