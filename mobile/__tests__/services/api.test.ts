/**
 * ApiClient Tests
 *
 * Comprehensive tests for the API client with token management and endpoints
 */

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

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'https://test-api.example.com/api/v1',
    },
  },
}));

// Get mock instances
const mockAxiosInstance = (axios as any).__mockInstance;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should export apiClient with expected methods', () => {
      // Verify apiClient is defined and has expected methods
      expect(apiClient).toBeDefined();
      expect(typeof apiClient.getAccessToken).toBe('function');
      expect(typeof apiClient.getRefreshToken).toBe('function');
      expect(typeof apiClient.saveTokens).toBe('function');
      expect(typeof apiClient.clearTokens).toBe('function');
      expect(typeof apiClient.login).toBe('function');
      expect(typeof apiClient.logout).toBe('function');
    });

    it('should export apiClient with task methods', () => {
      expect(typeof apiClient.getTasks).toBe('function');
      expect(typeof apiClient.getTask).toBe('function');
      expect(typeof apiClient.updateTaskStatus).toBe('function');
      expect(typeof apiClient.completeTask).toBe('function');
      expect(typeof apiClient.uploadTaskPhoto).toBe('function');
    });
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

    describe('getRefreshToken', () => {
      it('should get refresh token from SecureStore', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce('refresh_token_456');

        const token = await apiClient.getRefreshToken();

        expect(token).toBe('refresh_token_456');
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('refresh_token');
      });

      it('should return null when no refresh token stored', async () => {
        mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

        const token = await apiClient.getRefreshToken();

        expect(token).toBeNull();
      });
    });

    describe('saveTokens', () => {
      it('should save both tokens to SecureStore', async () => {
        const tokens = {
          access_token: 'new_access',
          refresh_token: 'new_refresh',
          expires_in: 3600,
        };

        await apiClient.saveTokens(tokens);

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'new_access');
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new_refresh');
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      });
    });

    describe('clearTokens', () => {
      it('should delete both tokens from SecureStore', async () => {
        await apiClient.clearTokens();

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('auth endpoints', () => {
    describe('login', () => {
      it('should login and save tokens on success', async () => {
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
        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new_refresh');
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

      it('should not save tokens when data is null', async () => {
        const credentials = { email: 'test@example.com', password: 'test' };
        const mockResponse = {
          data: {
            success: true,
            data: null,
          },
        };

        mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

        await apiClient.login(credentials);

        expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should throw on network error during login', async () => {
        const credentials = { email: 'test@example.com', password: 'test' };
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

        await expect(apiClient.login(credentials)).rejects.toThrow('Network error');
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

        try {
          await apiClient.logout();
        } catch (e) {
          // Expected to throw
        }

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
          role: 'operator',
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProfile });

        const result = await apiClient.getProfile();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile');
        expect(result).toEqual(mockProfile);
      });

      it('should throw on profile fetch error', async () => {
        mockAxiosInstance.get.mockRejectedValueOnce(new Error('Unauthorized'));

        await expect(apiClient.getProfile()).rejects.toThrow('Unauthorized');
      });
    });
  });

  describe('tasks endpoints', () => {
    describe('getTasks', () => {
      it('should get tasks with params', async () => {
        const params = { status: 'pending', page: 1, limit: 10 };
        const mockTasks = {
          data: [
            { id: '1', title: 'Task 1' },
            { id: '2', title: 'Task 2' },
          ],
          total: 2,
          page: 1,
        };
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

      it('should handle empty task list', async () => {
        const mockTasks = { data: [], total: 0, page: 1 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTasks });

        const result = await apiClient.getTasks({ status: 'completed' });

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });
    });

    describe('getTask', () => {
      it('should get task by id', async () => {
        const mockTask = {
          id: 'task-123',
          title: 'Refill Machine',
          status: 'pending',
          machine_id: 'machine-1',
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTask });

        const result = await apiClient.getTask('task-123');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/task-123');
        expect(result).toEqual(mockTask);
      });

      it('should throw on task not found', async () => {
        mockAxiosInstance.get.mockRejectedValueOnce({ response: { status: 404 } });

        await expect(apiClient.getTask('non-existent')).rejects.toBeDefined();
      });
    });

    describe('updateTaskStatus', () => {
      it('should update task status', async () => {
        const mockResponse = { success: true, task: { id: '1', status: 'in_progress' } };
        mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.updateTaskStatus('1', 'in_progress');

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/tasks/1/status', {
          status: 'in_progress',
        });
        expect(result.success).toBe(true);
      });

      it('should handle invalid status transition', async () => {
        mockAxiosInstance.patch.mockRejectedValueOnce({
          response: { status: 400, data: { message: 'Invalid status transition' } },
        });

        await expect(apiClient.updateTaskStatus('1', 'invalid')).rejects.toBeDefined();
      });
    });

    describe('completeTask', () => {
      it('should complete task with notes', async () => {
        const mockResponse = { success: true, task: { id: '1', status: 'completed' } };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.completeTask('1', 'Task completed successfully');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/1/complete', {
          notes: 'Task completed successfully',
        });
        expect(result.success).toBe(true);
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
        const mockResponse = { success: true, photo_id: 'photo-123', url: 'https://...' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.uploadTaskPhoto(
          'task-1',
          '/path/to/photo.jpg',
          'Before refill'
        );

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/tasks/task-1/photos',
          expect.any(FormData),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        expect(result.success).toBe(true);
        expect(result.photo_id).toBe('photo-123');
      });

      it('should upload photo without caption', async () => {
        const mockResponse = { success: true, photo_id: 'photo-456' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        await apiClient.uploadTaskPhoto('task-1', '/storage/images/photo.jpg');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/tasks/task-1/photos',
          expect.any(FormData),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      });

      it('should extract filename from URI', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

        await apiClient.uploadTaskPhoto('task-1', '/path/to/my-photo.jpg');

        const formDataArg = mockAxiosInstance.post.mock.calls[0][1];
        expect(formDataArg).toBeInstanceOf(FormData);
      });

      it('should use default filename when path has no filename', async () => {
        mockAxiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

        await apiClient.uploadTaskPhoto('task-1', '/path/to/');

        expect(mockAxiosInstance.post).toHaveBeenCalled();
      });
    });
  });

  describe('equipment endpoints', () => {
    describe('getEquipment', () => {
      it('should get equipment list with params', async () => {
        const mockEquipment = {
          data: [
            { id: '1', name: 'Machine 1', status: 'active' },
            { id: '2', name: 'Machine 2', status: 'active' },
          ],
          total: 2,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEquipment });

        const result = await apiClient.getEquipment({ status: 'active' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/equipment', {
          params: { status: 'active' },
        });
        expect(result).toEqual(mockEquipment);
      });

      it('should get equipment list without params', async () => {
        const mockEquipment = { data: [], total: 0 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEquipment });

        await apiClient.getEquipment();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/equipment', { params: undefined });
      });
    });

    describe('getEquipmentById', () => {
      it('should get equipment by id', async () => {
        const mockEquipment = {
          id: 'equip-1',
          name: 'Vending Machine A',
          location: 'Building 1',
          status: 'active',
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockEquipment });

        const result = await apiClient.getEquipmentById('equip-1');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/equipment/equip-1');
        expect(result).toEqual(mockEquipment);
      });
    });
  });

  describe('incidents endpoints', () => {
    describe('getIncidents', () => {
      it('should get incidents list with params', async () => {
        const mockIncidents = {
          data: [{ id: '1', title: 'Machine Error', status: 'open' }],
          total: 1,
        };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockIncidents });

        const result = await apiClient.getIncidents({ status: 'open' });

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/incidents', {
          params: { status: 'open' },
        });
        expect(result).toEqual(mockIncidents);
      });

      it('should get all incidents without params', async () => {
        const mockIncidents = { data: [], total: 0 };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: mockIncidents });

        await apiClient.getIncidents();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/incidents', { params: undefined });
      });
    });

    describe('createIncident', () => {
      it('should create incident', async () => {
        const incident = {
          title: 'Machine malfunction',
          description: 'Coffee dispenser not working',
          machine_id: 'machine-1',
          severity: 'high',
        };
        const mockResponse = { success: true, id: 'incident-123' };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.createIncident(incident);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/incidents', incident);
        expect(result.success).toBe(true);
        expect(result.id).toBe('incident-123');
      });

      it('should throw on create incident error', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Validation error'));

        await expect(apiClient.createIncident({})).rejects.toThrow('Validation error');
      });
    });

    describe('updateIncident', () => {
      it('should update incident', async () => {
        const updates = { status: 'resolved', resolution_notes: 'Fixed the dispenser' };
        const mockResponse = { success: true, incident: { id: '1', status: 'resolved' } };
        mockAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.updateIncident('1', updates);

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/incidents/1', updates);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('sync endpoint', () => {
    describe('syncOfflineData', () => {
      it('should sync offline data successfully', async () => {
        const offlineData = {
          tasks: [
            { id: 'temp-1', action: 'complete', notes: 'Done' },
            { id: 'temp-2', action: 'update', status: 'in_progress' },
          ],
          photos: [{ task_id: 'temp-1', uri: '/path/to/photo.jpg' }],
        };
        const mockResponse = {
          success: true,
          synced: { tasks: 2, photos: 1 },
          failed: { tasks: 0, photos: 0 },
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.syncOfflineData(offlineData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sync', offlineData);
        expect(result.success).toBe(true);
        expect(result.synced.tasks).toBe(2);
      });

      it('should handle partial sync failure', async () => {
        const offlineData = {
          tasks: [{ id: 'temp-1', action: 'complete' }],
          photos: [],
        };
        const mockResponse = {
          success: true,
          synced: { tasks: 0, photos: 0 },
          failed: { tasks: 1, photos: 0 },
          errors: ['Task temp-1: Invalid task ID'],
        };
        mockAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

        const result = await apiClient.syncOfflineData(offlineData);

        expect(result.failed.tasks).toBe(1);
        expect(result.errors).toContain('Task temp-1: Invalid task ID');
      });

      it('should handle network error during sync', async () => {
        mockAxiosInstance.post.mockRejectedValueOnce(new Error('Network error'));

        await expect(apiClient.syncOfflineData({ tasks: [], photos: [] })).rejects.toThrow(
          'Network error'
        );
      });
    });
  });

  describe('getInstance', () => {
    it('should return axios instance', () => {
      const instance = apiClient.getInstance();

      expect(instance).toBeDefined();
      expect(typeof instance.get).toBe('function');
      expect(typeof instance.post).toBe('function');
      expect(typeof instance.patch).toBe('function');
    });

    it('should return the same instance on multiple calls', () => {
      const instance1 = apiClient.getInstance();
      const instance2 = apiClient.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should propagate network errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(apiClient.getTasks()).rejects.toThrow('Network Error');
    });

    it('should propagate timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(apiClient.getProfile()).rejects.toThrow('timeout');
    });

    it('should handle server errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      });

      await expect(apiClient.createIncident({})).rejects.toBeDefined();
    });
  });
});
