import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { clientApi, ClientUser, MenuItem, PublicLocation, QrResolveResult } from '../../src/services/clientApi';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    __mockInstance: mockAxiosInstance,
  };
});

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Get mock instances
const mockAxiosInstance = (axios as any).__mockInstance;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const mockClientUser: ClientUser = {
  id: 'client-1',
  telegram_id: '123456789',
  telegram_username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  full_name: 'Test User',
  phone: '+1234567890',
  email: 'test@example.com',
  is_verified: true,
  language: 'ru',
  loyalty_points: 100,
  points_balance: 100,
  total_orders: 5,
};

const mockLocation: PublicLocation = {
  id: 'loc-1',
  name: 'Mall Location',
  address: '123 Main St',
  city: 'Tashkent',
  lat: 41.311,
  lng: 69.279,
  machine_count: 5,
  working_hours: '09:00-21:00',
};

const mockMenuItem: MenuItem = {
  id: 'item-1',
  name: 'Coffee',
  description: 'Fresh brewed coffee',
  price: 15000,
  currency: 'UZS',
  category: 'Beverages',
  is_available: true,
  stock: 10,
  points_earned: 15,
};

describe('ClientApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token management', () => {
    describe('saveTokens', () => {
      it('should save both access and refresh tokens', async () => {
        await clientApi.saveTokens('access_123', 'refresh_456');

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          'client_access_token',
          'access_123'
        );
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          'client_refresh_token',
          'refresh_456'
        );
      });
    });

    describe('clearTokens', () => {
      it('should delete both tokens', async () => {
        await clientApi.clearTokens();

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('client_access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('client_refresh_token');
      });
    });

    describe('isAuthenticated', () => {
      it('should return true when token exists', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce('valid_token');

        const result = await clientApi.isAuthenticated();

        expect(result).toBe(true);
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('client_access_token');
      });

      it('should return false when no token', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

        const result = await clientApi.isAuthenticated();

        expect(result).toBe(false);
      });
    });
  });

  describe('public endpoints', () => {
    describe('getLocations', () => {
      it('should get locations without params', async () => {
        const mockResponse = { data: [mockLocation], total: 1 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

        const result = await clientApi.getLocations();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/public/locations', {
          params: undefined,
        });
        expect(result).toEqual(mockResponse);
      });

      it('should get locations with search params', async () => {
        const params = { city: 'Tashkent', lat: 41.311, lng: 69.279 };
        const mockResponse = { data: [mockLocation], total: 1 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

        const result = await clientApi.getLocations(params);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/public/locations', { params });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCities', () => {
      it('should get list of cities', async () => {
        const mockCities = ['Tashkent', 'Samarkand', 'Bukhara'];
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockCities });

        const result = await clientApi.getCities();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/public/cities');
        expect(result).toEqual(mockCities);
      });
    });

    describe('getMenu', () => {
      it('should get machine menu', async () => {
        const mockResponse = { data: [mockMenuItem] };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockResponse });

        const result = await clientApi.getMenu('machine-1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/public/menu', {
          params: { machine_id: 'machine-1' },
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle array response format', async () => {
        const mockArray = [mockMenuItem];
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockArray });

        const result = await clientApi.getMenu('machine-1');

        expect(result).toEqual({ data: mockArray });
      });
    });

    describe('resolveQrCode', () => {
      it('should resolve QR code to machine info', async () => {
        const mockQrResult: QrResolveResult = {
          machine_id: 'machine-1',
          machine_number: 'M-001',
          machine_name: 'Coffee Machine',
          location: mockLocation,
          is_available: true,
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockQrResult });

        const result = await clientApi.resolveQrCode('qr-code-data');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/public/qr/resolve', {
          qr_code: 'qr-code-data',
        });
        expect(result).toEqual(mockQrResult);
      });

      it('should handle unavailable machine', async () => {
        const mockQrResult: QrResolveResult = {
          machine_id: 'machine-1',
          machine_number: 'M-001',
          machine_name: 'Coffee Machine',
          is_available: false,
          unavailable_reason: 'Under maintenance',
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockQrResult });

        const result = await clientApi.resolveQrCode('qr-code-data');

        expect(result.is_available).toBe(false);
        expect(result.unavailable_reason).toBe('Under maintenance');
      });
    });
  });

  describe('auth endpoints', () => {
    describe('authenticateTelegram', () => {
      it('should authenticate with Telegram and save tokens', async () => {
        const mockResponse = {
          access_token: 'access_123',
          refresh_token: 'refresh_456',
          user: mockClientUser,
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await clientApi.authenticateTelegram('init_data_string');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/telegram', {
          initData: 'init_data_string',
        });
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          'client_access_token',
          'access_123'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should not save tokens if no access_token in response', async () => {
        const mockResponse = {
          access_token: '',
          user: mockClientUser,
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        await clientApi.authenticateTelegram('init_data_string');

        expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      });
    });

    describe('refreshToken', () => {
      it('should refresh token using stored refresh token', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce('old_refresh_token');
        const mockResponse = {
          access_token: 'new_access',
          refresh_token: 'new_refresh',
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        await clientApi.refreshToken();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh', {
          refresh_token: 'old_refresh_token',
        });
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          'client_access_token',
          'new_access'
        );
      });

      it('should throw error if no refresh token', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

        await expect(clientApi.refreshToken()).rejects.toThrow('No refresh token');
      });
    });

    describe('getCurrentUser', () => {
      it('should get current user profile', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockClientUser });

        const result = await clientApi.getCurrentUser();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
        expect(result).toEqual(mockClientUser);
      });
    });

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        const updates = { full_name: 'New Name', language: 'en' as const };
        const updatedUser = { ...mockClientUser, ...updates };
        mockAxiosInstance.patch.mockResolvedValueOnce({ data: updatedUser });

        const result = await clientApi.updateProfile(updates);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/auth/profile', updates);
        expect(result).toEqual(updatedUser);
      });
    });
  });

  describe('loyalty endpoints', () => {
    describe('getLoyaltyBalance', () => {
      it('should get loyalty balance', async () => {
        const mockBalance = {
          points_balance: 100,
          lifetime_points: 500,
          points_value_uzs: 10000,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockBalance });

        const result = await clientApi.getLoyaltyBalance();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/loyalty/balance');
        expect(result).toEqual(mockBalance);
      });
    });

    describe('getLoyaltyHistory', () => {
      it('should get loyalty history with pagination', async () => {
        const mockHistory = {
          data: [
            { id: 'tx-1', delta: 50, reason: 'purchase', balance_after: 150, created_at: '2025-01-01' },
          ],
          total: 1,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockHistory });

        const result = await clientApi.getLoyaltyHistory({ page: 1, limit: 10 });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/loyalty/history', {
          params: { page: 1, limit: 10 },
        });
        expect(result).toEqual(mockHistory);
      });
    });
  });

  describe('orders endpoints', () => {
    describe('getOrders', () => {
      it('should get orders list', async () => {
        const mockOrders = {
          data: [{ id: 'order-1', status: 'completed' }],
          total: 1,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockOrders });

        const result = await clientApi.getOrders({ status: 'completed' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders', {
          params: { status: 'completed' },
        });
        expect(result).toEqual(mockOrders);
      });
    });

    describe('getOrder', () => {
      it('should get order by id', async () => {
        const mockOrder = {
          id: 'order-1',
          status: 'completed',
          total_amount: 50000,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockOrder });

        const result = await clientApi.getOrder('order-1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orders/order-1');
        expect(result).toEqual(mockOrder);
      });
    });
  });

  describe('alias methods', () => {
    describe('loginWithTelegram', () => {
      it('should be alias for authenticateTelegram', async () => {
        const mockResponse = {
          access_token: 'access_123',
          refresh_token: 'refresh_456',
          user: mockClientUser,
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await clientApi.loginWithTelegram('init_data');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/telegram', {
          initData: 'init_data',
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getProfile', () => {
      it('should be alias for getCurrentUser', async () => {
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockClientUser });

        const result = await clientApi.getProfile();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
        expect(result).toEqual(mockClientUser);
      });
    });
  });
});
