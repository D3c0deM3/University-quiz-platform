'use client';

import { create } from 'zustand';
import { authApi, setAccessToken, getAccessToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (phone: string, password: string) => Promise<void>;
  register: (data: { phone: string; password: string; firstName: string; lastName: string; email?: string }) => Promise<void>;
  registerWithOtp: (data: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    email?: string;
    otpCode: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (phone, password) => {
    const { data } = await authApi.login(phone, password);
    // Access token stored in memory only (NOT localStorage)
    setAccessToken(data.accessToken);
    // Refresh token is automatically set as HttpOnly cookie by the server
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData);
    setAccessToken(data.accessToken);
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  registerWithOtp: async (formData) => {
    const { data } = await authApi.registerWithOtp(formData);
    setAccessToken(data.accessToken);
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout — clear state anyway
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      // If we have no in-memory token, try to refresh from HttpOnly cookie
      if (!getAccessToken()) {
        try {
          const { data: refreshData } = await authApi.refresh();
          setAccessToken(refreshData.accessToken);
        } catch {
          set({ isLoading: false });
          return;
        }
      }
      const { data: profile } = await authApi.profile();
      set({ user: profile, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
