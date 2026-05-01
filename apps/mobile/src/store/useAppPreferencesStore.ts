import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type AppThemeMode = 'light' | 'dark';

const THEME_KEY = 'zync.mobile.theme';

interface AppPreferencesState {
  hydrated: boolean;
  theme: AppThemeMode;
  hydrate: () => Promise<void>;
  setTheme: (theme: AppThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

export const useAppPreferencesStore = create<AppPreferencesState>((set, get) => ({
  hydrated: false,
  theme: 'dark',

  hydrate: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        set({ hydrated: true, theme: savedTheme });
        return;
      }
    } catch {
      // ignore storage errors and use default value
    }
    set({ hydrated: true });
  },

  setTheme: async (theme) => {
    set({ theme });
    try {
      await AsyncStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors to avoid blocking UI
    }
  },

  toggleTheme: async () => {
    const nextTheme: AppThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    await get().setTheme(nextTheme);
  },
}));
