// Zustand store for authentication state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authClient from '../api/auth-client';

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  image?: string;
  twoFAEnabled?: boolean;
  twoFAVerified?: boolean;
  twoFAMethod?: 'email' | 'sms';
}

interface AuthState {
  user: User | null;
  token: string | null;
  tempToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  twoFAMethod?: 'email' | 'sms';

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setTempToken: (tempToken: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRequiresTwoFactor: (requires: boolean, method?: 'email' | 'sms') => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tempToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      requiresTwoFactor: false,
      twoFAMethod: undefined,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (token) {
          localStorage.setItem('auth_token', token);
          // Also set as cookie for middleware access
          document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        } else {
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; max-age=0';
        }
        set({ token, isAuthenticated: !!token });
      },

      setTempToken: (tempToken) => {
        set({ tempToken });
      },

      login: (user, token) => {
        localStorage.setItem('auth_token', token);

        // Also set as cookie for middleware access
        document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tempToken: null,
          requiresTwoFactor: false,
        });
      },

      logout: async () => {
        try {
          // Call logout API
          await authClient.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear local storage and cookie
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; max-age=0';

          set({
            user: null,
            token: null,
            tempToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            requiresTwoFactor: false,
          });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setRequiresTwoFactor: (requires, method) =>
        set({ requiresTwoFactor: requires, twoFAMethod: method }),

      checkAuth: async () => {
        const token = get().token || localStorage.getItem('auth_token');

        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        // Ensure cookie is set (in case localStorage has token but cookie is missing)
        document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        try {
          set({ isLoading: true });
          const response = await authClient.getProfile();

          set({
            user: {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              phoneNumber: response.user.phoneNumber,
              image: response.user.image,
              twoFAEnabled: response.user.twoFA?.enabled,
              twoFAVerified: response.user.twoFA?.verified,
              twoFAMethod: response.user.twoFA?.method,
            },
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          document.cookie = 'auth_token=; path=/; max-age=0';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired',
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
