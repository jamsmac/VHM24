import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../src/services/api';

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

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token management', () => {
    describe('getAccessToken', () => {
      it('should get access token from SecureStore', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce('access_token_123');

        const token = await apiClient.getAccessToken();

        expect(token).toBe('access_token_123');
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('access_token');
      });

      it('should return null when no token stored', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

        const token = await apiClient.getAccessToken();

        expect(token).toBeNull();
      });
    });

    describe('saveTokens', () => {
      it('should save tokens to SecureStore', async () => {
        const tokens = {
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_in: 3600,
        };

        await apiClient.saveTokens(tokens);

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new_access');
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new_refresh');
      });
    });

    describe('clearTokens', () => {
      it('should delete tokens from SecureStore', async () => {
        await apiClient.clearTokens();

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      });
    });
  });

  describe('auth endpoints', () => {
    describe('login', () => {
      it('should login and save tokens', async () => {
        const credentials = { email: 'test@example.com', password: 'password123' };
        const mockResponse = {
          data: {
            success: true,
            data: {
              access_token: 'new_access',
              refresh_token: 'new_refresh',
              expires_in: 3600,
            },
          },
        };

        mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

        const result = await apiClient.login(credentials);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
        expect(result.success).toBe(true);
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new_access');
      });

      it('should not save tokens on failed login', async () => {
        const credentials = { email: 'test@example.com', password: 'wrong' };
        const mockResponse = {
          data: {
            success: false,
            message: 'Invalid credentials',
          },
        };

        mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

        const result = await apiClient.login(credentials);

        expect(result.success).toBe(false);
        expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      });
    });

    describe('logout', () => {
      it('should logout and clear tokens', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

        await apiClient.logout();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      });

      it('should clear tokens even if API call fails', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

        await apiClient.logout().catch(() => {});

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      });
    });

    describe('getProfile', () => {
      it('should get user profile', async () => {
        const mockProfile = {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProfile });

        const result = await apiClient.getProfile();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile');
        expect(result).toEqual(mockProfile);
      });
    });
  });

  describe('tasks endpoints', () => {
    describe('getTasks', () => {
      it('should get tasks with params', async () => {
        const params = { status: 'pending' };
        const mockTasks = { data: [{ id: '1', title: 'Task 1' }], total: 1 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });

        const result = await apiClient.getTasks(params);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', { params });
        expect(result).toEqual(mockTasks);
      });

      it('should get tasks without params', async () => {
        const mockTasks = { data: [], total: 0 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });

        await apiClient.getTasks();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', { params: undefined });
      });
    });

    describe('getTask', () => {
      it('should get task by id', async () => {
        const mockTask = { id: '1', title: 'Task 1' };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTask });

        const result = await apiClient.getTask('1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/1');
        expect(result).toEqual(mockTask);
      });
    });

    describe('updateTaskStatus', () => {
      it('should update task status', async () => {
        const mockResponse = { success: true };
        mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.updateTaskStatus('1', 'in_progress');

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/tasks/1/status', {
          status: 'in_progress',
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('completeTask', () => {
      it('should complete task with notes', async () => {
        const mockResponse = { success: true };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.completeTask('1', 'Completed successfully');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/1/complete', {
          notes: 'Completed successfully',
        });
        expect(result).toEqual(mockResponse);
      });

      it('should complete task without notes', async () => {
        const mockResponse = { success: true };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        await apiClient.completeTask('1');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/1/complete', {
          notes: undefined,
        });
      });
    });

    describe('uploadTaskPhoto', () => {
      it('should upload photo with caption', async () => {
        const mockResponse = { success: true, photo_id: 'photo-1' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.uploadTaskPhoto('1', '/path/to/photo.jpg', 'Before');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/tasks/1/photos',
          expect.any(FormData),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should upload photo without caption', async () => {
        const mockResponse = { success: true, photo_id: 'photo-1' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        await apiClient.uploadTaskPhoto('1', '/path/to/photo.jpg');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/tasks/1/photos',
          expect.any(FormData),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      });
    });
  });

  describe('equipment endpoints', () => {
    describe('getEquipment', () => {
      it('should get equipment list', async () => {
        const mockEquipment = { data: [{ id: '1', name: 'Machine 1' }] };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEquipment });

        const result = await apiClient.getEquipment({ status: 'active' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/equipment', {
          params: { status: 'active' },
        });
        expect(result).toEqual(mockEquipment);
      });
    });

    describe('getEquipmentById', () => {
      it('should get equipment by id', async () => {
        const mockEquipment = { id: '1', name: 'Machine 1' };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEquipment });

        const result = await apiClient.getEquipmentById('1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/equipment/1');
        expect(result).toEqual(mockEquipment);
      });
    });
  });

  describe('incidents endpoints', () => {
    describe('getIncidents', () => {
      it('should get incidents list', async () => {
        const mockIncidents = { data: [{ id: '1', title: 'Incident 1' }] };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockIncidents });

        const result = await apiClient.getIncidents({ status: 'open' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/incidents', {
          params: { status: 'open' },
        });
        expect(result).toEqual(mockIncidents);
      });
    });

    describe('createIncident', () => {
      it('should create incident', async () => {
        const incident = { title: 'New Incident', description: 'Test' };
        const mockResponse = { success: true, id: 'incident-1' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.createIncident(incident);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/incidents', incident);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateIncident', () => {
      it('should update incident', async () => {
        const updates = { status: 'resolved' };
        const mockResponse = { success: true };
        mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.updateIncident('1', updates);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/incidents/1', updates);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('sync endpoint', () => {
    it('should sync offline data', async () => {
      const offlineData = {
        tasks: [{ id: 'temp-1', action: 'complete' }],
        photos: [],
      };
      const mockResponse = { success: true, synced: 1 };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await apiClient.syncOfflineData(offlineData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sync', offlineData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getInstance', () => {
    it('should return axios instance', () => {
      const instance = apiClient.getInstance();

      expect(instance).toBeDefined();
      expect(instance.get).toBeDefined();
      expect(instance.post).toBeDefined();
    });
  });
});
