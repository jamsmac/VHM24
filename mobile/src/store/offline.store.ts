/**
 * VendHub Mobile - Offline Store
 *
 * Zustand store for managing offline queue and sync state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineTask, OfflinePhoto, TaskStatus } from '../types';
import apiClient from '../services/api';

const OFFLINE_QUEUE_KEY = 'vendhub_offline_queue';
const OFFLINE_PHOTOS_KEY = 'vendhub_offline_photos';

interface OfflineState {
  // Queue state
  taskQueue: OfflineTask[];
  photoQueue: OfflinePhoto[];

  // Sync state
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;

  // Network state (will be updated by useNetworkStatus hook)
  isOnline: boolean;

  // Actions - Queue management
  addTaskToQueue: (task: OfflineTask) => Promise<void>;
  addPhotoToQueue: (photo: OfflinePhoto) => Promise<void>;
  removeTaskFromQueue: (tempId: string) => Promise<void>;
  removePhotoFromQueue: (tempId: string) => Promise<void>;
  clearQueue: () => Promise<void>;

  // Actions - Sync
  syncAll: () => Promise<{ success: boolean; synced: number; failed: number }>;
  syncTasks: () => Promise<number>;
  syncPhotos: () => Promise<number>;

  // Actions - State
  setOnline: (isOnline: boolean) => void;
  loadFromStorage: () => Promise<void>;

  // Getters
  getQueueCount: () => number;
  getPendingTasks: () => OfflineTask[];
  getPendingPhotos: () => OfflinePhoto[];
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  // Initial state
  taskQueue: [],
  photoQueue: [],
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  isOnline: true,

  // Add task to offline queue
  addTaskToQueue: async (task: OfflineTask) => {
    const queue = [...get().taskQueue, task];
    set({ taskQueue: queue });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[OfflineStore] Task added to queue:', task.tempId);
  },

  // Add photo to offline queue
  addPhotoToQueue: async (photo: OfflinePhoto) => {
    const queue = [...get().photoQueue, photo];
    set({ photoQueue: queue });
    await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(queue));
    console.log('[OfflineStore] Photo added to queue:', photo.tempId);
  },

  // Remove task from queue
  removeTaskFromQueue: async (tempId: string) => {
    const queue = get().taskQueue.filter((t) => t.tempId !== tempId);
    set({ taskQueue: queue });
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[OfflineStore] Task removed from queue:', tempId);
  },

  // Remove photo from queue
  removePhotoFromQueue: async (tempId: string) => {
    const queue = get().photoQueue.filter((p) => p.tempId !== tempId);
    set({ photoQueue: queue });
    await AsyncStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(queue));
    console.log('[OfflineStore] Photo removed from queue:', tempId);
  },

  // Clear all queues
  clearQueue: async () => {
    set({ taskQueue: [], photoQueue: [] });
    await AsyncStorage.multiRemove([OFFLINE_QUEUE_KEY, OFFLINE_PHOTOS_KEY]);
    console.log('[OfflineStore] Queue cleared');
  },

  // Sync all pending items
  syncAll: async () => {
    const { isOnline, taskQueue, photoQueue, isSyncing } = get();

    if (!isOnline) {
      console.log('[OfflineStore] Cannot sync - offline');
      return { success: false, synced: 0, failed: 0 };
    }

    if (isSyncing) {
      console.log('[OfflineStore] Already syncing');
      return { success: false, synced: 0, failed: 0 };
    }

    if (taskQueue.length === 0 && photoQueue.length === 0) {
      console.log('[OfflineStore] Nothing to sync');
      return { success: true, synced: 0, failed: 0 };
    }

    set({ isSyncing: true, syncError: null });
    console.log('[OfflineStore] Starting sync...');

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Sync tasks first
      const tasksSynced = await get().syncTasks();
      syncedCount += tasksSynced;

      // Then sync photos
      const photosSynced = await get().syncPhotos();
      syncedCount += photosSynced;

      set({
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        syncError: null,
      });

      console.log(`[OfflineStore] Sync complete. Synced: ${syncedCount}`);
      return { success: true, synced: syncedCount, failed: failedCount };
    } catch (error: any) {
      console.error('[OfflineStore] Sync failed:', error);
      set({
        isSyncing: false,
        syncError: error.message || 'Sync failed',
      });
      return { success: false, synced: syncedCount, failed: failedCount };
    }
  },

  // Sync pending tasks
  syncTasks: async () => {
    const { taskQueue, removeTaskFromQueue } = get();
    let syncedCount = 0;

    for (const offlineTask of taskQueue) {
      try {
        console.log(`[OfflineStore] Syncing task: ${offlineTask.tempId}, action: ${offlineTask.action}`);

        switch (offlineTask.action) {
          case 'update':
            if (offlineTask.task.id && offlineTask.task.status) {
              await apiClient.updateTaskStatus(offlineTask.task.id, offlineTask.task.status);
            }
            break;

          case 'complete':
            if (offlineTask.task.id) {
              await apiClient.completeTask(
                offlineTask.task.id,
                (offlineTask.task as any).notes || ''
              );
            }
            break;

          case 'create':
            // For future use - creating tasks offline
            await apiClient.syncOfflineData(offlineTask);
            break;
        }

        // Mark as synced and remove from queue
        await removeTaskFromQueue(offlineTask.tempId);
        syncedCount++;
        console.log(`[OfflineStore] Task synced successfully: ${offlineTask.tempId}`);
      } catch (error: any) {
        console.error(`[OfflineStore] Failed to sync task ${offlineTask.tempId}:`, error);
        // Keep in queue for retry
      }
    }

    return syncedCount;
  },

  // Sync pending photos
  syncPhotos: async () => {
    const { photoQueue, removePhotoFromQueue } = get();
    let syncedCount = 0;

    for (const offlinePhoto of photoQueue) {
      try {
        console.log(`[OfflineStore] Syncing photo: ${offlinePhoto.tempId}`);

        await apiClient.uploadTaskPhoto(
          offlinePhoto.taskId,
          offlinePhoto.uri,
          offlinePhoto.caption || undefined
        );

        // Mark as synced and remove from queue
        await removePhotoFromQueue(offlinePhoto.tempId);
        syncedCount++;
        console.log(`[OfflineStore] Photo synced successfully: ${offlinePhoto.tempId}`);
      } catch (error: any) {
        console.error(`[OfflineStore] Failed to sync photo ${offlinePhoto.tempId}:`, error);
        // Keep in queue for retry
      }
    }

    return syncedCount;
  },

  // Set online status
  setOnline: (isOnline: boolean) => {
    const wasOffline = !get().isOnline;
    set({ isOnline });

    // Auto-sync when coming back online
    if (isOnline && wasOffline) {
      console.log('[OfflineStore] Network restored - triggering sync');
      // Delay sync slightly to allow connection to stabilize
      setTimeout(() => {
        get().syncAll();
      }, 2000);
    }
  },

  // Load queues from AsyncStorage
  loadFromStorage: async () => {
    try {
      const [taskQueueJson, photoQueueJson] = await AsyncStorage.multiGet([
        OFFLINE_QUEUE_KEY,
        OFFLINE_PHOTOS_KEY,
      ]);

      const taskQueue: OfflineTask[] = taskQueueJson[1]
        ? JSON.parse(taskQueueJson[1])
        : [];
      const photoQueue: OfflinePhoto[] = photoQueueJson[1]
        ? JSON.parse(photoQueueJson[1])
        : [];

      set({ taskQueue, photoQueue });
      console.log(
        `[OfflineStore] Loaded from storage: ${taskQueue.length} tasks, ${photoQueue.length} photos`
      );
    } catch (error) {
      console.error('[OfflineStore] Failed to load from storage:', error);
    }
  },

  // Get total queue count
  getQueueCount: () => {
    const { taskQueue, photoQueue } = get();
    return taskQueue.length + photoQueue.length;
  },

  // Get pending (not synced) tasks
  getPendingTasks: () => {
    return get().taskQueue.filter((t) => !t.synced);
  },

  // Get pending (not synced) photos
  getPendingPhotos: () => {
    return get().photoQueue.filter((p) => !p.synced);
  },
}));

// Helper function to generate unique temp IDs
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to create offline task action
export function createOfflineTaskUpdate(
  taskId: string,
  status: TaskStatus,
  notes?: string
): OfflineTask {
  return {
    tempId: generateTempId(),
    task: {
      id: taskId,
      status,
      ...(notes && { notes }),
    },
    action: status === TaskStatus.COMPLETED ? 'complete' : 'update',
    timestamp: Date.now(),
    synced: false,
  };
}

// Helper to create offline photo
export function createOfflinePhoto(
  taskId: string,
  uri: string,
  caption?: string | null
): OfflinePhoto {
  return {
    tempId: generateTempId(),
    taskId,
    uri,
    caption: caption || null,
    timestamp: Date.now(),
    synced: false,
  };
}

export default useOfflineStore;
