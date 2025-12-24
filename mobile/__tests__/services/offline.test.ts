/**
 * Offline Service Tests
 *
 * Comprehensive tests for offline operations and background sync
 */

import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore, createOfflineTaskUpdate, createOfflinePhoto } from '../../src/store/offline.store';
import apiClient from '../../src/services/api';
import { TaskStatus } from '../../src/types';

// Store the network listener callback for testing
let networkListenerCallback: ((state: any) => void) | null = null;

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback) => {
    networkListenerCallback = callback;
    return jest.fn(); // unsubscribe function
  }),
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
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Import the actual offlineService after mocks are set up
import { offlineService } from '../../src/services/offline';

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    networkListenerCallback = null;
  });

  afterEach(() => {
    offlineService.cleanup();
    jest.useRealTimers();
  });

  describe('initialize and network listener', () => {
    // Note: OfflineService is a singleton, so initialize() only runs once
    // We test that the network listener callback works correctly
    it('should setup and respond to network changes', async () => {
      const setOnline = jest.fn();
      const loadFromStorage = jest.fn().mockResolvedValue(undefined);
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
        loadFromStorage,
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline,
        getQueueCount: jest.fn(() => 0),
        syncAll: jest.fn(),
        clearQueue: jest.fn(),
      } as any);

      await offlineService.initialize();

      // Verify setup
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();

      // Test network listener if callback was captured
      if (networkListenerCallback) {
        // Test online
        networkListenerCallback({ isConnected: true, isInternetReachable: true });
        expect(setOnline).toHaveBeenCalledWith(true);

        // Test offline
        networkListenerCallback({ isConnected: false, isInternetReachable: false });
        expect(setOnline).toHaveBeenCalledWith(false);

        // Test null isInternetReachable
        networkListenerCallback({ isConnected: true, isInternetReachable: null });
        expect(setOnline).toHaveBeenCalledWith(true);
      }
    });
  });

  describe('stopPeriodicSync', () => {
    it('should handle stopPeriodicSync when not started', () => {
      expect(() => offlineService.stopPeriodicSync()).not.toThrow();
    });
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

    it('should queue completed task when API fails', async () => {
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
      mockApiClient.completeTask.mockRejectedValueOnce(new Error('Network error'));

      const result = await offlineService.updateTaskStatus('task-1', TaskStatus.COMPLETED, 'Notes');

      expect(result).toBe(false);
      expect(addTaskToQueue).toHaveBeenCalled();
      expect(createOfflineTaskUpdate).toHaveBeenCalledWith('task-1', TaskStatus.COMPLETED, 'Notes');
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

    it('should upload photo without caption', async () => {
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

      const result = await offlineService.uploadPhoto('task-1', 'file://photo.jpg');

      expect(result).toBe(true);
      expect(mockApiClient.uploadTaskPhoto).toHaveBeenCalledWith('task-1', 'file://photo.jpg', undefined);
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

    it('should queue photo when API fails', async () => {
      const addPhotoToQueue = jest.fn();
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
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
      mockApiClient.uploadTaskPhoto.mockRejectedValueOnce(new Error('Upload failed'));

      const result = await offlineService.uploadPhoto('task-1', 'file://photo.jpg', 'Caption');

      expect(result).toBe(false);
      expect(addPhotoToQueue).toHaveBeenCalled();
      expect(createOfflinePhoto).toHaveBeenCalledWith('task-1', 'file://photo.jpg', 'Caption');
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

    it('should return zero counts when queue is empty', () => {
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

      const status = offlineService.getQueueStatus();

      expect(status.taskCount).toBe(0);
      expect(status.photoCount).toBe(0);
      expect(status.total).toBe(0);
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
    it('should return true when syncing', () => {
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

    it('should return false when not syncing', () => {
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

      expect(offlineService.isSyncing()).toBe(false);
    });
  });

  describe('syncNow', () => {
    it('should trigger sync and return results', async () => {
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
      expect(result.failed).toBe(0);
      expect(syncAll).toHaveBeenCalled();
    });

    it('should return failed results', async () => {
      const syncAll = jest.fn().mockResolvedValue({ success: false, synced: 2, failed: 3 });
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

      expect(result.success).toBe(false);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(3);
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

    it('should stop periodic sync on cleanup', async () => {
      const syncAll = jest.fn().mockResolvedValue({ success: true, synced: 1, failed: 0 });
      mockUseOfflineStore.getState.mockReturnValue({
        isOnline: true,
        isSyncing: false,
        taskQueue: [{ tempId: '1' }],
        photoQueue: [],
        loadFromStorage: jest.fn().mockResolvedValue(undefined),
        addTaskToQueue: jest.fn(),
        addPhotoToQueue: jest.fn(),
        setOnline: jest.fn(),
        getQueueCount: jest.fn(() => 1),
        syncAll,
        clearQueue: jest.fn(),
      } as any);

      await offlineService.initialize();
      offlineService.cleanup();

      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(syncAll).not.toHaveBeenCalled();
    });
  });
});
