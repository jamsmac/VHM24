/**
 * Offline Service Tests
 */

import NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../../src/services/offline';
import { useOfflineStore, createOfflineTaskUpdate, createOfflinePhoto } from '../../src/store/offline.store';
import apiClient from '../../src/services/api';
import { TaskStatus } from '../../src/types';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

// Mock apiClient
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    completeTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    uploadTaskPhoto: jest.fn(),
  },
}));

// Mock useOfflineStore
jest.mock('../../src/store/offline.store', () => ({
  useOfflineStore: {
    getState: jest.fn(() => ({
      isOnline: true,
      isSyncing: false,
      taskQueue: [],
      photoQueue: [],
      loadFromStorage: jest.fn(),
      addTaskToQueue: jest.fn(),
      addPhotoToQueue: jest.fn(),
      setOnline: jest.fn(),
      getQueueCount: jest.fn(() => 0),
      syncAll: jest.fn(() => ({ success: true, synced: 0, failed: 0 })),
      clearQueue: jest.fn(),
    })),
  },
  createOfflineTaskUpdate: jest.fn((taskId, status, notes) => ({
    tempId: 'temp_123',
    task: { id: taskId, status, notes },
    action: status === 'completed' ? 'complete' : 'update',
    timestamp: Date.now(),
    synced: false,
  })),
  createOfflinePhoto: jest.fn((taskId, uri, caption) => ({
    tempId: 'temp_photo_123',
    taskId,
    uri,
    caption,
    timestamp: Date.now(),
    synced: false,
  })),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockUseOfflineStore = useOfflineStore as jest.Mocked<typeof useOfflineStore>;

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('updateTaskStatus', () => {
    it('should update task status online', async () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);
      mockApiClient.updateTaskStatus.mockResolvedValueOnce({ success: true });

      const result = await offlineService.updateTaskStatus('task-1', TaskStatus.IN_PROGRESS);

      expect(result).toBe(true);
      expect(mockApiClient.updateTaskStatus).toHaveBeenCalledWith('task-1', TaskStatus.IN_PROGRESS);
    });

    it('should complete task online', async () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);
      mockApiClient.completeTask.mockResolvedValueOnce({ success: true });

      const result = await offlineService.updateTaskStatus('task-1', TaskStatus.COMPLETED, 'Done');

      expect(result).toBe(true);
      expect(mockApiClient.completeTask).toHaveBeenCalledWith('task-1', 'Done');
    });

    it('should queue task when offline', async () => {
      const addTaskToQueue = jest.fn();
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue,
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      const result = await offlineService.updateTaskStatus('task-1', TaskStatus.IN_PROGRESS);

      expect(result).toBe(false);
      expect(addTaskToQueue).toHaveBeenCalled();
    });

    it('should queue task when API fails', async () => {
      const addTaskToQueue = jest.fn();
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue,
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);
      mockApiClient.updateTaskStatus.mockRejectedValueOnce(new Error('Network error'));

      const result = await offlineService.updateTaskStatus('task-1', TaskStatus.IN_PROGRESS);

      expect(result).toBe(false);
      expect(addTaskToQueue).toHaveBeenCalled();
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo online', async () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);
      mockApiClient.uploadTaskPhoto.mockResolvedValueOnce({ success: true });

      const result = await offlineService.uploadPhoto('task-1', 'file://photo.jpg', 'Test');

      expect(result).toBe(true);
      expect(mockApiClient.uploadTaskPhoto).toHaveBeenCalledWith('task-1', 'file://photo.jpg', 'Test');
    });

    it('should queue photo when offline', async () => {
      const addPhotoToQueue = jest.fn();
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue,
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      const result = await offlineService.uploadPhoto('task-1', 'file://photo.jpg');

      expect(result).toBe(false);
      expect(addPhotoToQueue).toHaveBeenCalled();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [{ tempId: '1' }, { tempId: '2' }],
        photoQueue: [{ tempId: '3' }],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 3),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      const status = offlineService.getQueueStatus();

      expect(status.taskCount).toBe(2);
      expect(status.photoCount).toBe(1);
      expect(status.total).toBe(3);
    });
  });

  describe('isOnline', () => {
    it('should return online status', () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      expect(offlineService.isOnline()).toBe(true);
    });

    it('should return offline status', () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: false,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      expect(offlineService.isOnline()).toBe(false);
    });
  });

  describe('isSyncing', () => {
    it('should return syncing status', () => {
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: true,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      expect(offlineService.isSyncing()).toBe(true);
    });
  });

  describe('syncNow', () => {
    it('should trigger sync', async () => {
      const syncAll = jest.fn().mockResolvedValue({ success: true, synced: 5, failed: 0 });
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll,
        clearQueue: jest.fn(),
        loadFromStorage: jest.fn(),
      } as any);

      const result = await offlineService.syncNow();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(5);
      expect(syncAll).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear queue', async () => {
      const clearQueue = jest.fn();
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue,
        loadFromStorage: jest.fn(),
      } as any);

      await offlineService.clearQueue();

      expect(clearQueue).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup without error', () => {
      expect(() => offlineService.cleanup()).not.toThrow();
    });
  });
});
