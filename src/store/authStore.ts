import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, getMe, getMisIglesias } from '../api/auth';

export type Iglesia = {
  id: number;
  nombre: string;
  [key: string]: any;
};

export type AuthState = {
  isLoggedIn: boolean | null;
  user: any | null;
  iglesias: Iglesia[];
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
      iglesias: [],
      loading: false,

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const tokens = await loginApi(username, password);
          await AsyncStorage.setItem('access_token', tokens.access);
          await AsyncStorage.setItem('refresh_token', tokens.refresh);
          const [user, iglesias] = await Promise.all([getMe(), getMisIglesias()]);
          set({ isLoggedIn: true, loading: false, user, iglesias: iglesias ?? [] });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        const { useIglesiaStore } = await import('./iglesiaStore');
        useIglesiaStore.getState().resetIglesia();
        set({ isLoggedIn: false, user: null, iglesias: [] });
      },

      checkAuth: async () => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          try {
            const [user, iglesias] = await Promise.all([getMe(), getMisIglesias()]);
            set({ isLoggedIn: true, user, iglesias: iglesias ?? [] });
          } catch {
            set({ isLoggedIn: false, user: null, iglesias: [] });
          }
        } else {
          set({ isLoggedIn: false });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user }),
    }
  )
);