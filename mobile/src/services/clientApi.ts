/**
 * VendHub Mobile - Client Public API
 *
 * API client for client-facing (customer) endpoints
 * Separate from staff API for security and clarity
 */

import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = __DEV__
  ? 'http://localhost:3000/api/v1/client'
  : 'https://your-domain.com/api/v1/client';

// Types
export interface PublicLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  machine_count: number;
  working_hours?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category?: string;
  image_url?: string;
  is_available: boolean;
  is_new?: boolean;
  is_popular?: boolean;
  stock?: number;
  points_earned?: number;
}

// Alias for backward compatibility
export type PublicMenuItem = MenuItem;

export interface QrResolveResult {
  machine_id: string;
  machine_number: string;
  machine_name: string;
  location?: PublicLocation;
  is_available: boolean;
  unavailable_reason?: string;
}

export interface ClientUser {
  id: string;
  telegram_id: string;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  is_verified: boolean;
  language: 'ru' | 'uz' | 'en';
  loyalty_points?: number;
  points_balance?: number;
  total_orders?: number;
}

export interface LoyaltyBalance {
  points_balance: number;
  lifetime_points: number;
  points_value_uzs: number;
}

export interface LoyaltyTransaction {
  id: string;
  delta: number;
  reason: string;
  description?: string;
  balance_after: number;
  created_at: string;
}

export interface ClientOrder {
  id: string;
  status: string;
  items: any[];
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  points_earned: number;
  points_redeemed: number;
  payment_provider: string;
  machine?: {
    id: string;
    name: string;
    machine_number: string;
  };
  created_at: string;
  paid_at?: string;
}

class ClientApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('client_access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Token management
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync('client_access_token', accessToken);
    await SecureStore.setItemAsync('client_refresh_token', refreshToken);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('client_access_token');
    await SecureStore.deleteItemAsync('client_refresh_token');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync('client_access_token');
    return !!token;
  }

  // Public endpoints (no auth required)
  async getLocations(params?: {
    search?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }): Promise<{ data: PublicLocation[]; total: number }> {
    const { data } = await this.axiosInstance.get('/public/locations', { params });
    return data;
  }

  async getCities(): Promise<string[]> {
    const { data } = await this.axiosInstance.get('/public/cities');
    return data;
  }

  async getMenu(machineId: string): Promise<{ data: MenuItem[] }> {
    const { data } = await this.axiosInstance.get('/public/menu', {
      params: { machine_id: machineId },
    });
    // Ensure consistent response structure
    if (Array.isArray(data)) {
      return { data };
    }
    return data;
  }

  async resolveQrCode(qrCode: string): Promise<QrResolveResult> {
    const { data } = await this.axiosInstance.post('/public/qr/resolve', {
      qr_code: qrCode,
    });
    return data;
  }

  // Auth endpoints
  async authenticateTelegram(initData: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: ClientUser;
  }> {
    const { data } = await this.axiosInstance.post('/auth/telegram', {
      initData,
    });

    if (data.access_token) {
      await this.saveTokens(data.access_token, data.refresh_token);
    }

    return data;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = await SecureStore.getItemAsync('client_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const { data } = await this.axiosInstance.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (data.access_token) {
      await this.saveTokens(data.access_token, data.refresh_token);
    }
  }

  async getCurrentUser(): Promise<ClientUser> {
    const { data } = await this.axiosInstance.get('/auth/me');
    return data;
  }

  async updateProfile(profile: {
    full_name?: string;
    phone?: string;
    email?: string;
    language?: 'ru' | 'uz' | 'en';
  }): Promise<ClientUser> {
    const { data } = await this.axiosInstance.patch('/auth/profile', profile);
    return data;
  }

  // Loyalty endpoints (auth required)
  async getLoyaltyBalance(): Promise<LoyaltyBalance> {
    const { data } = await this.axiosInstance.get('/loyalty/balance');
    return data;
  }

  async getLoyaltyHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: LoyaltyTransaction[]; total: number }> {
    const { data } = await this.axiosInstance.get('/loyalty/history', { params });
    return data;
  }

  // Orders endpoints (auth required)
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ClientOrder[]; total: number }> {
    // Note: Orders endpoint will be implemented in Phase 2
    const { data } = await this.axiosInstance.get('/orders', { params });
    return data;
  }

  async getOrder(orderId: string): Promise<ClientOrder> {
    const { data } = await this.axiosInstance.get(`/orders/${orderId}`);
    return data;
  }

  // Alias methods for store compatibility
  async loginWithTelegram(initData: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: ClientUser;
  }> {
    return this.authenticateTelegram(initData);
  }

  async getProfile(): Promise<ClientUser> {
    return this.getCurrentUser();
  }
}

export const clientApi = new ClientApiService();
export default clientApi;
