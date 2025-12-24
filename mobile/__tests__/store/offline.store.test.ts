/**
 * Offline Store Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfflineStore, generateTempId, createOfflineTaskUpdate, createOfflinePhoto } from '../../src/store/offline.store';
import { TaskStatus } from '../../src/types';
import apiClient from '../../src/services/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock apiClient
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    updateTaskStatus: jest.fn(),
    completeTask: jest.fn(),
    uploadTaskPhoto: jest.fn(),
    syncOfflineData: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Offline Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOfflineStore.setState({
      taskQueue: [],
      photoQueue: [],
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      isOnline: true,
    });
  });

  describe('generateTempId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateTempId();
      const id2 = generateTempId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^temp_\d+_[a-z0-9]+$/);
    });
  });

  describe('createOfflineTaskUpdate', () => {
    it('should create task update action', () => {
      const task = createOfflineTaskUpdate('task-123', TaskStatus.IN_PROGRESS);

      expect(task.tempId).toBeDefined();
      expect(task.task.id).toBe('task-123');
      expect(task.task.status).toBe(TaskStatus.IN_PROGRESS);
      expect(task.action).toBe('update');
      expect(task.synced).toBe(false);
    });

    it('should create complete action for completed status', () => {
      const task = createOfflineTaskUpdate('task-123', TaskStatus.COMPLETED, 'Done!');

      expect(task.action).toBe('complete');
      expect((task.task as any).notes).toBe('Done!');
    });
  });

  describe('createOfflinePhoto', () => {
    it('should create offline photo object', () => {
      const photo = createOfflinePhoto('task-123', 'file://photo.jpg', 'Test caption');

      expect(photo.tempId).toBeDefined();
      expect(photo.taskId).toBe('task-123');
      expect(photo.uri).toBe('file://photo.jpg');
      expect(photo.caption).toBe('Test caption');
      expect(photo.synced).toBe(false);
    });
  });

  describe('addTaskToQueue', () => {
    it('should add task to queue', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);

      await useOfflineStore.getState().addTaskToQueue(task);

      const state = useOfflineStore.getState();
      expect(state.taskQueue).toHaveLength(1);
      expect(state.taskQueue[0].tempId).toBe(task.tempId);
    });
  });

  describe('addPhotoToQueue', () => {
    it('should add photo to queue', async () => {
      const photo = createOfflinePhoto('task-1', 'file://test.jpg');

      await useOfflineStore.getState().addPhotoToQueue(photo);

      const state = useOfflineStore.getState();
      expect(state.photoQueue).toHaveLength(1);
      expect(state.photoQueue[0].tempId).toBe(photo.tempId);
    });
  });

  describe('removeTaskFromQueue', () => {
    it('should remove task from queue', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);
      await useOfflineStore.getState().addTaskToQueue(task);

      await useOfflineStore.getState().removeTaskFromQueue(task.tempId);

      const state = useOfflineStore.getState();
      expect(state.taskQueue).toHaveLength(0);
    });
  });

  describe('getQueueCount', () => {
    it('should return total queue count', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);
      const photo = createOfflinePhoto('task-1', 'file://test.jpg');

      await useOfflineStore.getState().addTaskToQueue(task);
      await useOfflineStore.getState().addPhotoToQueue(photo);

      const count = useOfflineStore.getState().getQueueCount();
      expect(count).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('should clear all queues', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);
      const photo = createOfflinePhoto('task-1', 'file://test.jpg');

      await useOfflineStore.getState().addTaskToQueue(task);
      await useOfflineStore.getState().addPhotoToQueue(photo);
      await useOfflineStore.getState().clearQueue();

      const state = useOfflineStore.getState();
      expect(state.taskQueue).toHaveLength(0);
      expect(state.photoQueue).toHaveLength(0);
    });
  });

  describe('setOnline', () => {
    it('should update online status', () => {
      useOfflineStore.getState().setOnline(false);
      expect(useOfflineStore.getState().isOnline).toBe(false);

      useOfflineStore.getState().setOnline(true);
      expect(useOfflineStore.getState().isOnline).toBe(true);
    });

    it('should trigger sync when coming back online', () => {
      jest.useFakeTimers();

      // Start offline
      useOfflineStore.setState({ isOnline: false });

      // Come back online
      useOfflineStore.getState().setOnline(true);

      // Fast-forward timers
      jest.advanceTimersByTime(2500);

      jest.useRealTimers();
    });
  });

  describe('removePhotoFromQueue', () => {
    it('should remove photo from queue', async () => {
      const photo = createOfflinePhoto('task-1', 'file://test.jpg');
      await useOfflineStore.getState().addPhotoToQueue(photo);

      await useOfflineStore.getState().removePhotoFromQueue(photo.tempId);

      const state = useOfflineStore.getState();
      expect(state.photoQueue).toHaveLength(0);
    });
  });

  describe('getPendingTasks', () => {
    it('should return only unsynced tasks', async () => {
      const task1 = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);
      const task2 = createOfflineTaskUpdate('task-2', TaskStatus.COMPLETED);

      await useOfflineStore.getState().addTaskToQueue(task1);
      await useOfflineStore.getState().addTaskToQueue(task2);

      // Mark task1 as synced
      useOfflineStore.setState({
        taskQueue: [
          { ...task1, synced: true },
          task2,
        ],
      });

      const pending = useOfflineStore.getState().getPendingTasks();
      expect(pending).toHaveLength(1);
      expect(pending[0].tempId).toBe(task2.tempId);
    });
  });

  describe('getPendingPhotos', () => {
    it('should return only unsynced photos', async () => {
      const photo1 = createOfflinePhoto('task-1', 'file://photo1.jpg');
      const photo2 = createOfflinePhoto('task-1', 'file://photo2.jpg');

      await useOfflineStore.getState().addPhotoToQueue(photo1);
      await useOfflineStore.getState().addPhotoToQueue(photo2);

      // Mark photo1 as synced
      useOfflineStore.setState({
        photoQueue: [
          { ...photo1, synced: true },
          photo2,
        ],
      });

      const pending = useOfflineStore.getState().getPendingPhotos();
      expect(pending).toHaveLength(1);
      expect(pending[0].tempId).toBe(photo2.tempId);
    });
  });

  describe('loadFromStorage', () => {
    it('should load queues from AsyncStorage', async () => {
      const storedTasks = [createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS)];
      const storedPhotos = [createOfflinePhoto('task-1', 'file://photo.jpg')];

      mockAsyncStorage.multiGet.mockResolvedValueOnce([
        ['vendhub_offline_queue', JSON.stringify(storedTasks)],
        ['vendhub_offline_photos', JSON.stringify(storedPhotos)],
      ]);

      await useOfflineStore.getState().loadFromStorage();

      const state = useOfflineStore.getState();
      expect(state.taskQueue).toHaveLength(1);
      expect(state.photoQueue).toHaveLength(1);
    });

    it('should handle empty storage', async () => {
      mockAsyncStorage.multiGet.mockResolvedValueOnce([
        ['vendhub_offline_queue', null],
        ['vendhub_offline_photos', null],
      ]);

      await useOfflineStore.getState().loadFromStorage();

      const state = useOfflineStore.getState();
      expect(state.taskQueue).toHaveLength(0);
      expect(state.photoQueue).toHaveLength(0);
    });

    it('should handle storage errors', async () => {
      mockAsyncStorage.multiGet.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw
      await useOfflineStore.getState().loadFromStorage();
    });
  });

  describe('syncAll', () => {
    it('should return early if offline', async () => {
      useOfflineStore.setState({ isOnline: false });

      const result = await useOfflineStore.getState().syncAll();

      expect(result).toEqual({ success: false, synced: 0, failed: 0 });
    });

    it('should return early if already syncing', async () => {
      useOfflineStore.setState({ isSyncing: true });

      const result = await useOfflineStore.getState().syncAll();

      expect(result).toEqual({ success: false, synced: 0, failed: 0 });
    });

    it('should return success if nothing to sync', async () => {
      useOfflineStore.setState({
        isOnline: true,
        isSyncing: false,
        taskQueue: [],
        photoQueue: [],
      });

      const result = await useOfflineStore.getState().syncAll();

      expect(result).toEqual({ success: true, synced: 0, failed: 0 });
    });

    it('should sync tasks and photos', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);
      const photo = createOfflinePhoto('task-1', 'file://photo.jpg');

      useOfflineStore.setState({
        isOnline: true,
        isSyncing: false,
        taskQueue: [task],
        photoQueue: [photo],
      });

      mockApiClient.updateTaskStatus.mockResolvedValueOnce({ success: true });
      mockApiClient.uploadTaskPhoto.mockResolvedValueOnce({ success: true });

      const result = await useOfflineStore.getState().syncAll();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
    });

    it('should handle sync errors', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);

      useOfflineStore.setState({
        isOnline: true,
        isSyncing: false,
        taskQueue: [task],
        photoQueue: [],
      });

      mockApiClient.updateTaskStatus.mockRejectedValueOnce(new Error('Network error'));

      const result = await useOfflineStore.getState().syncAll();

      expect(result.success).toBe(true); // Still completes even if individual items fail
    });
  });

  describe('syncTasks', () => {
    it('should sync update tasks', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);

      useOfflineStore.setState({ taskQueue: [task] });
      mockApiClient.updateTaskStatus.mockResolvedValueOnce({ success: true });

      const synced = await useOfflineStore.getState().syncTasks();

      expect(synced).toBe(1);
      expect(mockApiClient.updateTaskStatus).toHaveBeenCalledWith('task-1', TaskStatus.IN_PROGRESS);
    });

    it('should sync complete tasks', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.COMPLETED, 'Done');

      useOfflineStore.setState({ taskQueue: [task] });
      mockApiClient.completeTask.mockResolvedValueOnce({ success: true });

      const synced = await useOfflineStore.getState().syncTasks();

      expect(synced).toBe(1);
      expect(mockApiClient.completeTask).toHaveBeenCalledWith('task-1', 'Done');
    });

    it('should keep failed tasks in queue', async () => {
      const task = createOfflineTaskUpdate('task-1', TaskStatus.IN_PROGRESS);

      useOfflineStore.setState({ taskQueue: [task] });
      mockApiClient.updateTaskStatus.mockRejectedValueOnce(new Error('Network error'));

      const synced = await useOfflineStore.getState().syncTasks();

      expect(synced).toBe(0);
      // Task should still be in queue
      expect(useOfflineStore.getState().taskQueue).toHaveLength(1);
    });
  });

  describe('syncPhotos', () => {
    it('should sync photos', async () => {
      const photo = createOfflinePhoto('task-1', 'file://photo.jpg', 'Test caption');

      useOfflineStore.setState({ photoQueue: [photo] });
      mockApiClient.uploadTaskPhoto.mockResolvedValueOnce({ success: true });

      const synced = await useOfflineStore.getState().syncPhotos();

      expect(synced).toBe(1);
      expect(mockApiClient.uploadTaskPhoto).toHaveBeenCalledWith(
        'task-1',
        'file://photo.jpg',
        'Test caption'
      );
    });

    it('should handle photo without caption', async () => {
      const photo = createOfflinePhoto('task-1', 'file://photo.jpg');

      useOfflineStore.setState({ photoQueue: [photo] });
      mockApiClient.uploadTaskPhoto.mockResolvedValueOnce({ success: true });

      await useOfflineStore.getState().syncPhotos();

      expect(mockApiClient.uploadTaskPhoto).toHaveBeenCalledWith(
        'task-1',
        'file://photo.jpg',
        undefined
      );
    });

    it('should keep failed photos in queue', async () => {
      const photo = createOfflinePhoto('task-1', 'file://photo.jpg');

      useOfflineStore.setState({ photoQueue: [photo] });
      mockApiClient.uploadTaskPhoto.mockRejectedValueOnce(new Error('Upload failed'));

      const synced = await useOfflineStore.getState().syncPhotos();

      expect(synced).toBe(0);
      expect(useOfflineStore.getState().photoQueue).toHaveLength(1);
    });
  });
});
