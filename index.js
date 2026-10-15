import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { dlog } from './src/utils/debugLogger';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  dlog('Background push received:', remoteMessage.messageId);
});

AppRegistry.registerComponent(appName, () => App);
