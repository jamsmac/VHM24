/**
 * VendHub Mobile - Client Store
 *
 * Global state management for client (consumer) app using Zustand
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clientApi, ClientUser } from '../services/clientApi';

interface ClientState {
  user: ClientUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  appMode: 'staff' | 'client';

  // Auth actions
  loginWithTelegram: (initData: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;

  // App mode
  setAppMode: (mode: 'staff' | 'client') => void;
  loadAppMode: () => Promise<void>;
}

const CLIENT_TOKEN_KEY = 'client_access_token';
const APP_MODE_KEY = 'app_mode';

export const useClientStore = create<ClientState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  appMode: 'client',

  loginWithTelegram: async (initData: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await clientApi.loginWithTelegram(initData);

      if (response.access_token) {
        await AsyncStorage.setItem(CLIENT_TOKEN_KEY, response.access_token);
        set({
          user: response.user,
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
      await AsyncStorage.removeItem(CLIENT_TOKEN_KEY);
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
    const token = await AsyncStorage.getItem(CLIENT_TOKEN_KEY);

    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await clientApi.getProfile();

      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ isAuthenticated: false, isLoading: false });
      await AsyncStorage.removeItem(CLIENT_TOKEN_KEY);
    }
  },

  clearError: () => set({ error: null }),

  setAppMode: async (mode: 'staff' | 'client') => {
    await AsyncStorage.setItem(APP_MODE_KEY, mode);
    set({ appMode: mode });
  },

  loadAppMode: async () => {
    const mode = await AsyncStorage.getItem(APP_MODE_KEY);
    if (mode === 'staff' || mode === 'client') {
      set({ appMode: mode });
    }
  },
}));
