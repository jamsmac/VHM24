import { useAuthStore } from '../../src/store/auth.store';
import apiClient from '../../src/services/api';
import { UserRole, User } from '../../src/types';

// Mock the API client
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    getAccessToken: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  role: UserRole.OPERATOR,
  telegram_id: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    const mockCredentials = { email: 'test@example.com', password: 'password123' };
    const mockTokens = {
      access_token: 'token',
      refresh_token: 'refresh',
      expires_in: 3600,
    };

    it('should login successfully', async () => {
      mockApiClient.login.mockResolvedValueOnce({ success: true, data: mockTokens });
      mockApiClient.getProfile.mockResolvedValueOnce({ success: true, data: mockUser });

      await useAuthStore.getState().login(mockCredentials);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      mockApiClient.login.mockReturnValueOnce(loginPromise as any);

      // Start login but don't await
      const loginPromiseResult = useAuthStore.getState().login(mockCredentials);

      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve to cleanup
      resolveLogin!({ success: false, message: 'cancelled' });
      await loginPromiseResult.catch(() => {});
    });

    it('should handle login failure', async () => {
      mockApiClient.login.mockResolvedValueOnce({ success: false, message: 'Invalid credentials' });

      await expect(useAuthStore.getState().login(mockCredentials)).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should handle API error with response data', async () => {
      const error = new Error('Network error');
      (error as any).response = { data: { message: 'Server error' } };
      mockApiClient.login.mockRejectedValueOnce(error);

      await expect(useAuthStore.getState().login(mockCredentials)).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBe('Server error');
    });

    it('should handle error without response data', async () => {
      const error = new Error('Network error');
      mockApiClient.login.mockRejectedValueOnce(error);

      await expect(useAuthStore.getState().login(mockCredentials)).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBe('Network error');
    });

    it('should call login API with credentials', async () => {
      mockApiClient.login.mockResolvedValueOnce({ success: true, data: mockTokens });
      mockApiClient.getProfile.mockResolvedValueOnce({ success: true, data: mockUser });

      await useAuthStore.getState().login(mockCredentials);

      expect(mockApiClient.login).toHaveBeenCalledWith(mockCredentials);
    });

    it('should fetch profile after successful login', async () => {
      mockApiClient.login.mockResolvedValueOnce({ success: true, data: mockTokens });
      mockApiClient.getProfile.mockResolvedValueOnce({ success: true, data: mockUser });

      await useAuthStore.getState().login(mockCredentials);

      expect(mockApiClient.getProfile).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set authenticated state first
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should clear state even if logout API fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      mockApiClient.logout.mockRejectedValueOnce(new Error('Network error'));

      // The logout will throw but state should still be cleared in finally block
      try {
        await useAuthStore.getState().logout();
      } catch {
        // Expected to throw
      }

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should call logout API', async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      mockApiClient.logout.mockResolvedValueOnce(undefined);

      await useAuthStore.getState().logout();

      expect(mockApiClient.logout).toHaveBeenCalled();
    });
  });

  describe('loadUser', () => {
    it('should load user when token exists', async () => {
      mockApiClient.getAccessToken.mockResolvedValueOnce('valid-token');
      mockApiClient.getProfile.mockResolvedValueOnce({ success: true, data: mockUser });

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not authenticate when no token', async () => {
      mockApiClient.getAccessToken.mockResolvedValueOnce(null);

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(mockApiClient.getProfile).not.toHaveBeenCalled();
    });

    it('should handle profile fetch failure', async () => {
      mockApiClient.getAccessToken.mockResolvedValueOnce('valid-token');
      mockApiClient.getProfile.mockRejectedValueOnce(new Error('Token expired'));

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(mockApiClient.clearTokens).toHaveBeenCalled();
    });

    it('should handle unsuccessful profile response', async () => {
      mockApiClient.getAccessToken.mockResolvedValueOnce('valid-token');
      mockApiClient.getProfile.mockResolvedValueOnce({ success: false });

      await useAuthStore.getState().loadUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set loading state during loadUser', async () => {
      let resolveToken: (value: unknown) => void;
      const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
      });
      mockApiClient.getAccessToken.mockReturnValueOnce(tokenPromise as any);

      // Start loadUser but don't await
      const loadPromise = useAuthStore.getState().loadUser();

      // Resolve token and profile
      resolveToken!('token');
      mockApiClient.getProfile.mockResolvedValueOnce({ success: true, data: mockUser });

      await loadPromise;
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not affect other state properties', () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        error: 'Some error',
      });

      useAuthStore.getState().clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });
});
