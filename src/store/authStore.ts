import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginRequest, fetchUserProfile, fetchMisIglesias } from '../api/auth';
import type { UserProfile, Iglesia } from '../api/auth';

export type AuthState = {
  isLoggedIn: boolean | null;
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  iglesias: Iglesia[];
  loading: boolean;
  login: (username: string, password: string) => Promise<{ user: UserProfile; iglesias: Iglesia[] }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: UserProfile) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: null,
      accessToken: null,
      refreshToken: null,
      user: null,
      iglesias: [],
      loading: false,

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const tokens = await loginRequest(username, password);
          const user = await fetchUserProfile(tokens.access);
          const iglesias = await fetchMisIglesias(tokens.access);
          set({
            isLoggedIn: true,
            accessToken: tokens.access,
            refreshToken: tokens.refresh,
            user,
            iglesias,
            loading: false,
          });
          return { user, iglesias };
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        await AsyncStorage.removeItem('auth-store');
        await AsyncStorage.removeItem('iglesia-store');
        set({
          isLoggedIn: false,
          accessToken: null,
          refreshToken: null,
          user: null,
          iglesias: [],
        });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        set({ isLoggedIn: !!accessToken });
      },

      setUser: (user: UserProfile) => set({ user }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        iglesias: state.iglesias,
      }),
    },
  ),
);