import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGIN_URL } from '../constants/api';

export const login = async (username, password) => {
  try {
    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error('Credenciales inválidas');
    }
    const data = await response.json();
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    return data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
};

export const getAccessToken = async () => {
  return await AsyncStorage.getItem('access_token');
};