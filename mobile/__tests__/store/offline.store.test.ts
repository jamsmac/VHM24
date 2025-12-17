/**
 * Offline Store Tests
 */

import { useOfflineStore, generateTempId, createOfflineTaskUpdate, createOfflinePhoto } from '../../src/store/offline.store';
import { TaskStatus } from '../../src/types';

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
  });
});
