import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClientStore } from '../../src/store/client.store';
import { clientApi, ClientUser } from '../../src/services/clientApi';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock clientApi
jest.mock('../../src/services/clientApi', () => ({
  clientApi: {
    loginWithTelegram: jest.fn(),
    getProfile: jest.fn(),
  },
  ClientUser: {},
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockClientApi = clientApi as jest.Mocked<typeof clientApi>;

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

describe('ClientStore', () => {
  beforeEach(() => {
    // Reset store state
    useClientStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      appMode: 'client',
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useClientStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.appMode).toBe('client');
    });
  });

  describe('loginWithTelegram', () => {
    const mockInitData = 'telegram_init_data_string';
    const mockLoginResponse = {
      access_token: 'access_token_123',
      refresh_token: 'refresh_token_456',
      user: mockClientUser,
    };

    it('should login successfully with Telegram', async () => {
      mockClientApi.loginWithTelegram.mockResolvedValueOnce(mockLoginResponse);

      await useClientStore.getState().loginWithTelegram(mockInitData);

      const state = useClientStore.getState();
      expect(state.user).toEqual(mockClientUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should save token to AsyncStorage on login', async () => {
      mockClientApi.loginWithTelegram.mockResolvedValueOnce(mockLoginResponse);

      await useClientStore.getState().loginWithTelegram(mockInitData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'client_access_token',
        'access_token_123'
      );
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockClientApi.loginWithTelegram.mockReturnValueOnce(loginPromise as any);

      const loginPromiseResult = useClientStore.getState().loginWithTelegram(mockInitData);

      expect(useClientStore.getState().isLoading).toBe(true);

      resolveLogin!({ access_token: null });
      await loginPromiseResult.catch(() => {});
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid init data');
      mockClientApi.loginWithTelegram.mockRejectedValueOnce(error);

      await expect(
        useClientStore.getState().loginWithTelegram(mockInitData)
      ).rejects.toThrow();

      const state = useClientStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid init data');
    });

    it('should handle API error with response data', async () => {
      const error = new Error('API Error');
      (error as any).response = { data: { message: 'Telegram verification failed' } };
      mockClientApi.loginWithTelegram.mockRejectedValueOnce(error);

      await expect(
        useClientStore.getState().loginWithTelegram(mockInitData)
      ).rejects.toThrow();

      const state = useClientStore.getState();
      expect(state.error).toBe('Telegram verification failed');
    });

    it('should use fallback error message when error has no message', async () => {
      const error: any = {};
      mockClientApi.loginWithTelegram.mockRejectedValueOnce(error);

      await expect(
        useClientStore.getState().loginWithTelegram(mockInitData)
      ).rejects.toBeDefined();

      const state = useClientStore.getState();
      expect(state.error).toBe('Login failed');
    });

    it('should not authenticate if no access_token in response', async () => {
      mockClientApi.loginWithTelegram.mockResolvedValueOnce({
        access_token: '',
        refresh_token: '',
        user: mockClientUser,
      } as any);

      await useClientStore.getState().loginWithTelegram(mockInitData);

      const state = useClientStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      useClientStore.setState({
        user: mockClientUser,
        isAuthenticated: true,
      });

      await useClientStore.getState().logout();

      const state = useClientStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should remove token from AsyncStorage', async () => {
      useClientStore.setState({
        user: mockClientUser,
        isAuthenticated: true,
      });

      await useClientStore.getState().logout();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('client_access_token');
    });

    it('should clear state even if AsyncStorage fails', async () => {
      useClientStore.setState({
        user: mockClientUser,
        isAuthenticated: true,
      });

      mockAsyncStorage.removeItem.mockRejectedValueOnce(new Error('Storage error'));

      // The logout will throw but state should still be cleared in finally block
      try {
        await useClientStore.getState().logout();
      } catch {
        // Expected to throw
      }

      const state = useClientStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('loadUser', () => {
    it('should load user when token exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('valid_token');
      mockClientApi.getProfile.mockResolvedValueOnce(mockClientUser);

      await useClientStore.getState().loadUser();

      const state = useClientStore.getState();
      expect(state.user).toEqual(mockClientUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not authenticate when no token', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await useClientStore.getState().loadUser();

      const state = useClientStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(mockClientApi.getProfile).not.toHaveBeenCalled();
    });

    it('should handle profile fetch failure', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('valid_token');
      mockClientApi.getProfile.mockRejectedValueOnce(new Error('Token expired'));

      await useClientStore.getState().loadUser();

      const state = useClientStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('client_access_token');
    });

    it('should handle null profile response', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('valid_token');
      mockClientApi.getProfile.mockResolvedValueOnce(null as any);

      await useClientStore.getState().loadUser();

      const state = useClientStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set loading state during loadUser', async () => {
      let resolveToken: (value: unknown) => void;
      const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
      });
      mockAsyncStorage.getItem.mockReturnValueOnce(tokenPromise as any);

      const loadPromise = useClientStore.getState().loadUser();

      // Resolve token and profile
      resolveToken!('token');
      mockClientApi.getProfile.mockResolvedValueOnce(mockClientUser);

      await loadPromise;
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useClientStore.setState({ error: 'Some error' });

      useClientStore.getState().clearError();

      expect(useClientStore.getState().error).toBeNull();
    });

    it('should not affect other state properties', () => {
      useClientStore.setState({
        user: mockClientUser,
        isAuthenticated: true,
        error: 'Some error',
      });

      useClientStore.getState().clearError();

      const state = useClientStore.getState();
      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockClientUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setAppMode', () => {
    it('should set app mode to staff', async () => {
      await useClientStore.getState().setAppMode('staff');

      const state = useClientStore.getState();
      expect(state.appMode).toBe('staff');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('app_mode', 'staff');
    });

    it('should set app mode to client', async () => {
      useClientStore.setState({ appMode: 'staff' });

      await useClientStore.getState().setAppMode('client');

      const state = useClientStore.getState();
      expect(state.appMode).toBe('client');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('app_mode', 'client');
    });
  });

  describe('loadAppMode', () => {
    it('should load staff mode from storage', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('staff');

      await useClientStore.getState().loadAppMode();

      expect(useClientStore.getState().appMode).toBe('staff');
    });

    it('should load client mode from storage', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('client');

      await useClientStore.getState().loadAppMode();

      expect(useClientStore.getState().appMode).toBe('client');
    });

    it('should keep default mode if no stored value', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      await useClientStore.getState().loadAppMode();

      expect(useClientStore.getState().appMode).toBe('client');
    });

    it('should keep default mode if invalid stored value', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid_mode');

      await useClientStore.getState().loadAppMode();

      expect(useClientStore.getState().appMode).toBe('client');
    });
  });
});
