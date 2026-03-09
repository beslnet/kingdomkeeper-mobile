import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, getMe, getMisIglesias } from '../api/auth';
import { verificarTerminos, type LegalDocument } from '../api/legal';

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
  termsAccepted: boolean | null;
  pendingDocuments: LegalDocument[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkTerms: () => Promise<void>;
  setTermsAccepted: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: null,
      user: null,
      iglesias: [],
      loading: false,
      termsAccepted: null,
      pendingDocuments: [],

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const tokens = await loginApi(username, password);
          await AsyncStorage.setItem('access_token', tokens.access);
          await AsyncStorage.setItem('refresh_token', tokens.refresh);
          const [user, iglesias] = await Promise.all([getMe(), getMisIglesias()]);
          // Check terms after obtaining token
          let termsAccepted = true;
          let pendingDocuments: LegalDocument[] = [];
          try {
            const termsResult = await verificarTerminos();
            termsAccepted = termsResult.todo_aceptado;
            pendingDocuments = termsResult.documentos_pendientes;
          } catch {
            // If terms check fails, allow navigation (non-blocking)
          }
          set({ isLoggedIn: true, loading: false, user, iglesias: iglesias ?? [], termsAccepted, pendingDocuments });
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
        const { usePermissionsStore } = await import('./permissionsStore');
        usePermissionsStore.getState().reset();
        set({ isLoggedIn: false, user: null, iglesias: [], termsAccepted: null, pendingDocuments: [] });
      },

      checkAuth: async () => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          try {
            const [user, iglesias] = await Promise.all([getMe(), getMisIglesias()]);
            let termsAccepted = true;
            let pendingDocuments: LegalDocument[] = [];
            try {
              const termsResult = await verificarTerminos();
              termsAccepted = termsResult.todo_aceptado;
              pendingDocuments = termsResult.documentos_pendientes;
            } catch {
              // Non-blocking
            }
            set({ isLoggedIn: true, user, iglesias: iglesias ?? [], termsAccepted, pendingDocuments });
          } catch {
            set({ isLoggedIn: false, user: null, iglesias: [] });
          }
        } else {
          set({ isLoggedIn: false });
        }
      },

      checkTerms: async () => {
        try {
          const result = await verificarTerminos();
          set({ termsAccepted: result.todo_aceptado, pendingDocuments: result.documentos_pendientes });
        } catch {
          // Non-blocking
        }
      },

      setTermsAccepted: () => {
        set({ termsAccepted: true, pendingDocuments: [] });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user }),
    }
  )
);