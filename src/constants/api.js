//Login System
import { Platform } from 'react-native';

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';
export const LOGIN_URL = `${API_BASE_URL}/api/token/`;