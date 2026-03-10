'use client';

import { create } from 'zustand';
import { authApi } from '@/lib/api';
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
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (phone, password) => {
    const { data } = await authApi.login(phone, password);
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData);
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  registerWithOtp: async (formData) => {
    const { data } = await authApi.registerWithOtp(formData);
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    const { data: profile } = await authApi.profile();
    set({ user: profile, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const { data: profile } = await authApi.profile();
      set({ user: profile, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
