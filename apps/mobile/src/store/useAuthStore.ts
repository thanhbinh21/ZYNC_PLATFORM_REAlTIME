import { create } from 'zustand';
import { getToken, removeToken, saveToken } from '../services/auth';

interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  userInfo: any | null; // Can type this properly later using shared-types
  hydrate: () => Promise<void>;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  isAuthenticated: false,
  accessToken: null,
  userInfo: null,

  hydrate: async () => {
    const token = await getToken();
    if (token) {
      try {
        // Assume api interceptor handles setting Authorization header using getToken()
        const api = (await import('../services/api')).default;
        const res = await api.get('/users/me');
        if (res.data?.success && res.data?.user) {
          set({ isAuthenticated: true, accessToken: token, userInfo: res.data.user, isHydrated: true });
        } else {
          throw new Error('Invalid user response');
        }
      } catch (e) {
        // Token invalid or network error. If unauthorized, clear context.
        await removeToken();
        set({ isAuthenticated: false, accessToken: null, userInfo: null, isHydrated: true });
      }
    } else {
      set({ isHydrated: true });
    }
  },

  login: async (token: string, user: any) => {
    await saveToken(token);
    set({ isAuthenticated: true, accessToken: token, userInfo: user });
  },

  logout: async () => {
    await removeToken();
    set({ isAuthenticated: false, accessToken: null, userInfo: null });
  },
}));

// Hydrate on import
useAuthStore.getState().hydrate();
