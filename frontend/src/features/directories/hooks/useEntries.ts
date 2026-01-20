'use client';

/**
 * Hooks for directory entry operations
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { directoryApi } from '../api/directory.api';
import type {
  DirectoryEntry,
  CreateEntryDto,
  UpdateEntryDto,
  SearchQueryParams,
  EntryStatus,
  EntryOrigin,
} from '../types';

/**
 * Query key factory for entries
 */
export const entryKeys = {
  all: ['entries'] as const,
  lists: () => [...entryKeys.all, 'list'] as const,
  list: (directoryId: string, filters?: SearchQueryParams) =>
    [...entryKeys.lists(), directoryId, filters] as const,
  details: () => [...entryKeys.all, 'detail'] as const,
  detail: (directoryId: string, entryId: string) =>
    [...entryKeys.details(), directoryId, entryId] as const,
  tree: (directoryId: string, parentId?: string) =>
    [...entryKeys.all, 'tree', directoryId, parentId] as const,
  ancestors: (directoryId: string, entryId: string) =>
    [...entryKeys.all, 'ancestors', directoryId, entryId] as const,
  history: (directoryId: string, entryId: string) =>
    [...entryKeys.all, 'history', directoryId, entryId] as const,
};

/**
 * Hook to get entries with infinite scroll
 */
export function useEntries(params: {
  directoryId: string;
  status?: EntryStatus;
  origin?: EntryOrigin;
  parent_id?: string | null;
  tags?: string[];
  sort?: string;
  limit?: number;
}) {
  const { directoryId, ...filters } = params;

  return useInfiniteQuery({
    queryKey: entryKeys.list(directoryId, filters),
    queryFn: ({ pageParam = 1 }) =>
      directoryApi.getEntries(directoryId, { ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage.meta;
      return page < total_pages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!directoryId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get a single entry by ID
 */
export function useEntry(directoryId: string, entryId: string) {
  return useQuery({
    queryKey: entryKeys.detail(directoryId, entryId),
    queryFn: () => directoryApi.getEntry(directoryId, entryId),
    enabled: !!directoryId && !!entryId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get hierarchical tree of entries
 */
export function useEntryTree(directoryId: string, parentId?: string, maxDepth?: number) {
  return useQuery({
    queryKey: entryKeys.tree(directoryId, parentId),
    queryFn: () => directoryApi.getTree(directoryId, parentId, maxDepth),
    enabled: !!directoryId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get entry ancestors (breadcrumb)
 */
export function useEntryAncestors(directoryId: string, entryId: string) {
  return useQuery({
    queryKey: entryKeys.ancestors(directoryId, entryId),
    queryFn: () => directoryApi.getAncestors(directoryId, entryId),
    enabled: !!directoryId && !!entryId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get entry audit history
 */
export function useEntryHistory(
  directoryId: string,
  entryId: string,
  page?: number,
  limit?: number,
) {
  return useQuery({
    queryKey: [...entryKeys.history(directoryId, entryId), page, limit],
    queryFn: () => directoryApi.getEntryHistory(directoryId, entryId, page, limit),
    enabled: !!directoryId && !!entryId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new entry
 */
export function useCreateEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateEntryDto) => directoryApi.createEntry(directoryId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to update an entry
 */
export function useUpdateEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, dto }: { entryId: string; dto: UpdateEntryDto }) =>
      directoryApi.updateEntry(directoryId, entryId, dto),
    onSuccess: (_, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: entryKeys.detail(directoryId, entryId),
      });
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to archive an entry
 */
export function useArchiveEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => directoryApi.archiveEntry(directoryId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to restore an archived entry
 */
export function useRestoreEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => directoryApi.restoreEntry(directoryId, entryId),
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({
        queryKey: entryKeys.detail(directoryId, entryId),
      });
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to approve a pending entry
 */
export function useApproveEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => directoryApi.approveEntry(directoryId, entryId),
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({
        queryKey: entryKeys.detail(directoryId, entryId),
      });
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to reject a pending entry
 */
export function useRejectEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      directoryApi.rejectEntry(directoryId, entryId, reason),
    onSuccess: (_, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: entryKeys.detail(directoryId, entryId),
      });
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook to deprecate an entry
 */
export function useDeprecateEntry(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      replacementEntryId,
    }: {
      entryId: string;
      replacementEntryId?: string;
    }) => directoryApi.deprecateEntry(directoryId, entryId, replacementEntryId),
    onSuccess: (_, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: entryKeys.detail(directoryId, entryId),
      });
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}

/**
 * Hook for bulk import
 */
export function useBulkImport(directoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entries,
      mode,
      uniqueKeyField,
      isAtomic,
    }: {
      entries: CreateEntryDto[];
      mode: 'insert' | 'upsert' | 'sync';
      uniqueKeyField?: string;
      isAtomic?: boolean;
    }) =>
      directoryApi.bulkImport(directoryId, entries, {
        mode,
        unique_key_field: uniqueKeyField,
        is_atomic: isAtomic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entryKeys.lists() });
    },
  });
}
