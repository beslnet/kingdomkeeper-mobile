import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IglesiaState = {
  iglesiaId: number | null;
  iglesiaNombre: string | null;
  setIglesia: (id: number, nombre: string) => void;
  resetIglesia: () => void;
};

export const useIglesiaStore = create<IglesiaState>()(
  persist(
    (set) => ({
      iglesiaId: null,
      iglesiaNombre: null,
      setIglesia: (id, nombre) => set({ iglesiaId: id, iglesiaNombre: nombre }),
      resetIglesia: () => set({ iglesiaId: null, iglesiaNombre: null }),
    }),
    {
      name: 'iglesia-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
