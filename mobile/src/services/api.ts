/**
 * VendHub Mobile - API Client
 *
 * Axios-based API client with automatic token refresh and offline support
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApiResponse, AuthTokens, LoginCredentials } from '../types';

import Constants from 'expo-constants';

// Get API URL from app.config.js extra or fallback to defaults
const getApiUrl = () => {
  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configUrl) return configUrl;

  return __DEV__
    ? 'http://localhost:3000/api/v1'
    : 'https://vhm24-production.up.railway.app/api/v1';
};

const API_URL = getApiUrl();

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
  }> = [];

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
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.axiosInstance(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const { data } = await this.axiosInstance.post<ApiResponse<AuthTokens>>(
              '/auth/refresh',
              { refresh_token: refreshToken }
            );

            if (data.success && data.data) {
              await this.saveTokens(data.data);
              this.processQueue(null);
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError);
            await this.clearTokens();
            // Trigger logout in auth store
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve();
      }
    });
    this.failedQueue = [];
  }

  // Token management
  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('access_token');
  }

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('refresh_token');
  }

  async saveTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync('access_token', tokens.access_token);
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthTokens>> {
    const { data } = await this.axiosInstance.post('/auth/login', credentials);
    if (data.success && data.data) {
      await this.saveTokens(data.data);
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async getProfile() {
    const { data } = await this.axiosInstance.get('/auth/profile');
    return data;
  }

  // Tasks endpoints
  async getTasks(params?: any) {
    const { data } = await this.axiosInstance.get('/tasks', { params });
    return data;
  }

  async getTask(id: string) {
    const { data } = await this.axiosInstance.get(`/tasks/${id}`);
    return data;
  }

  async updateTaskStatus(id: string, status: string) {
    const { data } = await this.axiosInstance.patch(`/tasks/${id}/status`, { status });
    return data;
  }

  async completeTask(id: string, notes?: string) {
    const { data } = await this.axiosInstance.post(`/tasks/${id}/complete`, { notes });
    return data;
  }

  async uploadTaskPhoto(taskId: string, photoUri: string, caption?: string) {
    const formData = new FormData();

    // Extract filename from URI
    const filename = photoUri.split('/').pop() || 'photo.jpg';

    // Create file object
    const file = {
      uri: photoUri,
      type: 'image/jpeg',
      name: filename,
    } as any;

    formData.append('photo', file);
    if (caption) {
      formData.append('caption', caption);
    }

    const { data } = await this.axiosInstance.post(
      `/tasks/${taskId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  }

  // Equipment endpoints
  async getEquipment(params?: any) {
    const { data } = await this.axiosInstance.get('/equipment', { params });
    return data;
  }

  async getEquipmentById(id: string) {
    const { data } = await this.axiosInstance.get(`/equipment/${id}`);
    return data;
  }

  // Incidents endpoints
  async getIncidents(params?: any) {
    const { data } = await this.axiosInstance.get('/incidents', { params });
    return data;
  }

  async createIncident(incident: any) {
    const { data } = await this.axiosInstance.post('/incidents', incident);
    return data;
  }

  async updateIncident(id: string, updates: any) {
    const { data } = await this.axiosInstance.patch(`/incidents/${id}`, updates);
    return data;
  }

  // Sync endpoint for offline mode
  async syncOfflineData(offlineData: any) {
    const { data } = await this.axiosInstance.post('/sync', offlineData);
    return data;
  }

  // Get axios instance for custom requests
  getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
