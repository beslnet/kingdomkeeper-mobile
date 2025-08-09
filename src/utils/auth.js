import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAccessToken = async () => {
  return await AsyncStorage.getItem('access_token');
};