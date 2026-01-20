'use client';

/**
 * Directory System Store (Zustand)
 *
 * Manages client-side state for directories including:
 * - Directory/entry cache for offline support
 * - Pending changes queue for offline operations
 * - UI state (selected directory, filters, etc.)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Directory, DirectoryEntry, CreateEntryDto, UpdateEntryDto } from '../types';

// ============================================================================
// Types
// ============================================================================

interface DirectoryCache {
  directory: Directory;
  entries: DirectoryEntry[];
  updatedAt: string;
}

type PendingChangeAction = 'create' | 'update' | 'archive' | 'restore';

interface PendingChange {
  id: string;
  directoryId: string;
  entryId?: string;
  action: PendingChangeAction;
  data: CreateEntryDto | UpdateEntryDto | null;
  createdAt: string;
  retryCount: number;
  error?: string;
}

interface DirectoryState {
  // -------------------------------------------------------------------------
  // Cache (for offline support)
  // -------------------------------------------------------------------------
  cache: Record<string, DirectoryCache>;

  /** Set cache for a directory */
  setCache: (directoryId: string, data: DirectoryCache) => void;

  /** Get cache for a directory */
  getCache: (directoryId: string) => DirectoryCache | null;

  /** Invalidate cache for a directory */
  invalidateCache: (directoryId: string) => void;

  /** Clear all cache */
  clearCache: () => void;

  /** Check if cache is stale (older than maxAge in ms) */
  isCacheStale: (directoryId: string, maxAge?: number) => boolean;

  // -------------------------------------------------------------------------
  // Offline Queue
  // -------------------------------------------------------------------------
  pendingChanges: PendingChange[];

  /** Add a pending change to the queue */
  addPendingChange: (
    change: Omit<PendingChange, 'id' | 'createdAt' | 'retryCount'>,
  ) => void;

  /** Remove a pending change by ID */
  removePendingChange: (id: string) => void;

  /** Update retry count for a pending change */
  updatePendingChangeRetry: (id: string, error?: string) => void;

  /** Clear all pending changes */
  clearPendingChanges: () => void;

  /** Get pending changes for a directory */
  getPendingChanges: (directoryId: string) => PendingChange[];

  // -------------------------------------------------------------------------
  // UI State
  // -------------------------------------------------------------------------
  selectedDirectoryId: string | null;
  searchQuery: string;
  filters: {
    status?: string;
    origin?: string;
    tags?: string[];
  };

  /** Set the currently selected directory */
  setSelectedDirectoryId: (id: string | null) => void;

  /** Set search query */
  setSearchQuery: (query: string) => void;

  /** Set filters */
  setFilters: (filters: DirectoryState['filters']) => void;

  /** Clear filters */
  clearFilters: () => void;

  // -------------------------------------------------------------------------
  // Recent Selections (client-side tracking)
  // -------------------------------------------------------------------------
  recentSelections: Record<string, string[]>; // directoryId -> entryIds

  /** Add a recent selection */
  addRecentSelection: (directoryId: string, entryId: string) => void;

  /** Get recent selections for a directory */
  getRecentSelections: (directoryId: string, limit?: number) => string[];

  /** Clear recent selections for a directory */
  clearRecentSelections: (directoryId: string) => void;
}

// ============================================================================
// Store
// ============================================================================

const MAX_RECENT_SELECTIONS = 10;
const DEFAULT_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set, get) => ({
      // -----------------------------------------------------------------------
      // Cache
      // -----------------------------------------------------------------------
      cache: {},

      setCache: (directoryId, data) =>
        set((state) => ({
          cache: {
            ...state.cache,
            [directoryId]: data,
          },
        })),

      getCache: (directoryId) => get().cache[directoryId] || null,

      invalidateCache: (directoryId) =>
        set((state) => {
          const { [directoryId]: _, ...rest } = state.cache;
          return { cache: rest };
        }),

      clearCache: () => set({ cache: {} }),

      isCacheStale: (directoryId, maxAge = DEFAULT_CACHE_MAX_AGE) => {
        const cached = get().cache[directoryId];
        if (!cached) return true;
        const age = Date.now() - new Date(cached.updatedAt).getTime();
        return age > maxAge;
      },

      // -----------------------------------------------------------------------
      // Offline Queue
      // -----------------------------------------------------------------------
      pendingChanges: [],

      addPendingChange: (change) =>
        set((state) => ({
          pendingChanges: [
            ...state.pendingChanges,
            {
              ...change,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              retryCount: 0,
            },
          ],
        })),

      removePendingChange: (id) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.filter((c) => c.id !== id),
        })),

      updatePendingChangeRetry: (id, error) =>
        set((state) => ({
          pendingChanges: state.pendingChanges.map((c) =>
            c.id === id
              ? { ...c, retryCount: c.retryCount + 1, error }
              : c,
          ),
        })),

      clearPendingChanges: () => set({ pendingChanges: [] }),

      getPendingChanges: (directoryId) =>
        get().pendingChanges.filter((c) => c.directoryId === directoryId),

      // -----------------------------------------------------------------------
      // UI State
      // -----------------------------------------------------------------------
      selectedDirectoryId: null,
      searchQuery: '',
      filters: {},

      setSelectedDirectoryId: (id) => set({ selectedDirectoryId: id }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      clearFilters: () => set({ filters: {} }),

      // -----------------------------------------------------------------------
      // Recent Selections
      // -----------------------------------------------------------------------
      recentSelections: {},

      addRecentSelection: (directoryId, entryId) =>
        set((state) => {
          const current = state.recentSelections[directoryId] || [];
          // Remove if already exists, then add to front
          const filtered = current.filter((id) => id !== entryId);
          const updated = [entryId, ...filtered].slice(0, MAX_RECENT_SELECTIONS);
          return {
            recentSelections: {
              ...state.recentSelections,
              [directoryId]: updated,
            },
          };
        }),

      getRecentSelections: (directoryId, limit = 5) => {
        const selections = get().recentSelections[directoryId] || [];
        return selections.slice(0, limit);
      },

      clearRecentSelections: (directoryId) =>
        set((state) => {
          const { [directoryId]: _, ...rest } = state.recentSelections;
          return { recentSelections: rest };
        }),
    }),
    {
      name: 'directory-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist cache, pending changes, and recent selections
      partialize: (state) => ({
        cache: state.cache,
        pendingChanges: state.pendingChanges,
        recentSelections: state.recentSelections,
      }),
    },
  ),
);

// ============================================================================
// Selectors (for optimized re-renders)
// ============================================================================

export const selectCache = (directoryId: string) => (state: DirectoryState) =>
  state.cache[directoryId];

export const selectPendingChanges = (directoryId: string) => (state: DirectoryState) =>
  state.pendingChanges.filter((c) => c.directoryId === directoryId);

export const selectHasPendingChanges = (directoryId: string) => (state: DirectoryState) =>
  state.pendingChanges.some((c) => c.directoryId === directoryId);

export const selectRecentSelections = (directoryId: string) => (state: DirectoryState) =>
  state.recentSelections[directoryId] || [];

export default useDirectoryStore;
