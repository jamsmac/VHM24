/**
 * VendHub Mobile - Authentication Store
 *
 * Global state management for authentication using Zustand
 */

import { create } from 'zustand';
import { User, LoginCredentials } from '../types';
import apiClient from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(credentials);

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      // Load user profile after successful login
      const profileResponse = await apiClient.getProfile();

      if (profileResponse.success && profileResponse.data) {
        set({
          user: profileResponse.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.response?.data?.message || error.message || 'Login failed',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadUser: async () => {
    const token = await apiClient.getAccessToken();

    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.getProfile();

      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ isAuthenticated: false, isLoading: false });
      await apiClient.clearTokens();
    }
  },

  clearError: () => set({ error: null }),
}));
