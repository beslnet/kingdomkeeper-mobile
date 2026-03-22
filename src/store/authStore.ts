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
  setUser: (user: any) => void;
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
          // Register push token in background (non-blocking)
          import('../services/pushNotifications').then(({ initializePushNotifications }) => {
            initializePushNotifications().catch(() => {});
          });
        } catch (error: any) {
          set({ loading: false });
          // Translate HTTP errors to user-friendly messages
          const status = error?.response?.status;
          const detail = error?.response?.data?.detail;
          if (status === 401) {
            throw new Error('Usuario o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
          } else if (status === 400) {
            throw new Error(detail || 'Datos inválidos. Revisa tu usuario y contraseña.');
          } else if (status === 403) {
            throw new Error('Tu cuenta no tiene acceso. Contacta al administrador.');
          } else if (!error?.response) {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
          } else {
            throw new Error(detail || 'Error al iniciar sesión. Intenta de nuevo.');
          }
        }
      },

      logout: async () => {
        const { unregisterPushDevice } = await import('../services/pushNotifications');
        await unregisterPushDevice();
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

      setUser: (user: any) => {
        set({ user });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user }),
    }
  )
);
