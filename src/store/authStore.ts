import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGIN_URL } from '../constants/api';

export type AuthState = {
  isLoggedIn: boolean | null;
  user: any | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: null,
      user: null,
      loading: false,

      login: async (username: string, password: string) => {
        set({ loading: true });
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
          set({ isLoggedIn: true, loading: false, user: data.user ?? null });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        set({ isLoggedIn: false, user: null });
      },

      checkAuth: async () => {
        const token = await AsyncStorage.getItem('access_token');
        set({ isLoggedIn: !!token });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage), // <--- ADAPTADOR CORRECTO
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user }),
    }
  )
);