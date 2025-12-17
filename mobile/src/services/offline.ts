/**
 * VendHub Mobile - Offline Service
 *
 * Service for handling offline operations and background sync
 */

import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore, createOfflineTaskUpdate, createOfflinePhoto } from '../store/offline.store';
import apiClient from './api';
import { TaskStatus } from '../types';

class OfflineService {
  private syncIntervalId: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize the offline service
   * Call this once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[OfflineService] Already initialized');
      return;
    }

    console.log('[OfflineService] Initializing...');

    // Load offline queue from storage
    await useOfflineStore.getState().loadFromStorage();

    // Set up network listener
    this.setupNetworkListener();

    // Start periodic sync (every 5 minutes when online)
    this.startPeriodicSync();

    this.isInitialized = true;
    console.log('[OfflineService] Initialized successfully');
  }

  /**
   * Set up network state change listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected && (state.isInternetReachable !== false);
      useOfflineStore.getState().setOnline(isOnline ?? true);
    });
  }

  /**
   * Start periodic sync every 5 minutes
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Sync every 5 minutes
    this.syncIntervalId = setInterval(async () => {
      const { isOnline, getQueueCount, syncAll } = useOfflineStore.getState();

      if (isOnline && getQueueCount() > 0) {
        console.log('[OfflineService] Periodic sync triggered');
        await syncAll();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Update task status with offline support
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, notes?: string): Promise<boolean> {
    const { isOnline, addTaskToQueue } = useOfflineStore.getState();

    if (isOnline) {
      try {
        if (status === TaskStatus.COMPLETED) {
          await apiClient.completeTask(taskId, notes);
        } else {
          await apiClient.updateTaskStatus(taskId, status);
        }
        return true;
      } catch (error: any) {
        console.error('[OfflineService] Failed to update task online, queueing:', error);
        // Fall through to offline queue
      }
    }

    // Queue for later sync
    const offlineTask = createOfflineTaskUpdate(taskId, status, notes);
    await addTaskToQueue(offlineTask);
    console.log('[OfflineService] Task queued for offline sync:', taskId);
    return false;
  }

  /**
   * Upload photo with offline support
   */
  async uploadPhoto(taskId: string, uri: string, caption?: string): Promise<boolean> {
    const { isOnline, addPhotoToQueue } = useOfflineStore.getState();

    if (isOnline) {
      try {
        await apiClient.uploadTaskPhoto(taskId, uri, caption);
        return true;
      } catch (error: any) {
        console.error('[OfflineService] Failed to upload photo online, queueing:', error);
        // Fall through to offline queue
      }
    }

    // Queue for later sync
    const offlinePhoto = createOfflinePhoto(taskId, uri, caption);
    await addPhotoToQueue(offlinePhoto);
    console.log('[OfflineService] Photo queued for offline sync:', taskId);
    return false;
  }

  /**
   * Manual sync trigger
   */
  async syncNow(): Promise<{ success: boolean; synced: number; failed: number }> {
    return await useOfflineStore.getState().syncAll();
  }

  /**
   * Get current offline queue status
   */
  getQueueStatus(): { taskCount: number; photoCount: number; total: number } {
    const { taskQueue, photoQueue } = useOfflineStore.getState();
    return {
      taskCount: taskQueue.length,
      photoCount: photoQueue.length,
      total: taskQueue.length + photoQueue.length,
    };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return useOfflineStore.getState().isOnline;
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return useOfflineStore.getState().isSyncing;
  }

  /**
   * Clear all queued items (use with caution)
   */
  async clearQueue(): Promise<void> {
    await useOfflineStore.getState().clearQueue();
  }

  /**
   * Clean up on app close/background
   */
  cleanup(): void {
    this.stopPeriodicSync();
    console.log('[OfflineService] Cleaned up');
  }
}

// Singleton instance
export const offlineService = new OfflineService();

export default offlineService;
