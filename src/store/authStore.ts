import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { loginApi, getMe, getMisIglesias } from '../api/auth';
import {
  clearAllTokens,
  deleteRefreshToken,
  getAccessToken,
  getRefreshToken,
  migrateRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../utils/tokenStorage';
import { verificarTerminos, type LegalDocument } from '../api/legal';

export type Iglesia = {
  id: number;
  nombre: string;
  [key: string]: any;
};

export type AuthState = {
  isLoggedIn: boolean | null;
  _hasHydrated: boolean;
  user: any | null;
  iglesias: Iglesia[];
  loading: boolean;
  termsAccepted: boolean | null;
  pendingDocuments: LegalDocument[];
  login: (username: string, password: string) => Promise<void>;
  /** Cierre de sesión pedido por el usuario: avisa al servidor y limpia el teléfono. */
  logout: () => Promise<void>;
  /** La sesión ya no sirve (refresh vencido o revocado): limpia el teléfono sin llamar al servidor. */
  expireSession: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkTerms: () => Promise<void>;
  setTermsAccepted: () => void;
  setUser: (user: any) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: null,
      _hasHydrated: false,
      user: null,
      iglesias: [],
      loading: false,
      termsAccepted: null,
      pendingDocuments: [],

      login: async (username: string, password: string) => {
        set({ loading: true });
        try {
          const tokens = await loginApi(username, password);
          await saveAccessToken(tokens.access);
          await saveRefreshToken(tokens.refresh);
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
          } else if (status === 429) {
            throw new Error('Demasiados intentos. Espera un momento e intenta de nuevo.');
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
        // Antes de borrar nada: ambas llamadas necesitan el token vigente.
        const { unregisterPushDevice } = await import('../services/pushNotifications');
        await unregisterPushDevice();
        // Revoca el refresh token en el servidor: sin esto, copiarlo antes de cerrar
        // sesión seguiría sirviendo 30 días. Si falla (sin red), igual se cierra aquí.
        try {
          const refresh = await getRefreshToken();
          if (refresh) {
            await api.post('/api/token/logout/', { refresh }, { timeout: 5000 });
          }
        } catch {
          // Siempre limpiar la sesión local.
        }
        await get().expireSession();
      },

      expireSession: async () => {
        await clearAllTokens();
        const { clearStoredPushToken } = await import('../services/pushNotifications');
        await clearStoredPushToken();
        const { useIglesiaStore } = await import('./iglesiaStore');
        useIglesiaStore.getState().resetIglesia();
        const { usePermissionsStore } = await import('./permissionsStore');
        usePermissionsStore.getState().reset();
        set({ isLoggedIn: false, user: null, iglesias: [], termsAccepted: null, pendingDocuments: [] });
      },

      checkAuth: async () => {
        // Sesiones de la 1.1.3: el refresh token pasa de AsyncStorage al Keychain.
        await migrateRefreshToken();
        const token = await getAccessToken();
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
          } catch (error: any) {
            // Only clear session on 401 (token truly invalid).
            // Network / connectivity errors must NOT log the user out.
            if (error?.response?.status === 401) {
              await get().expireSession();
            }
            // Otherwise keep the persisted state — user stays logged in
          }
        } else {
          // Sin access token no hay sesión. El Keychain de iOS sobrevive a desinstalar la
          // app: si quedó un refresh token de una instalación anterior, se borra.
          await deleteRefreshToken();
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
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user, iglesias: state.iglesias }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    }
  )
);
