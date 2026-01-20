'use client';

/**
 * Hooks for directory operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { directoryApi, DirectoryFilters } from '../api/directory.api';
import type { Directory, CreateDirectoryDto, UpdateDirectoryDto } from '../types';

/**
 * Query key factory for directories
 */
export const directoryKeys = {
  all: ['directories'] as const,
  lists: () => [...directoryKeys.all, 'list'] as const,
  list: (filters?: DirectoryFilters) => [...directoryKeys.lists(), filters] as const,
  details: () => [...directoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...directoryKeys.details(), id] as const,
  slug: (slug: string) => [...directoryKeys.all, 'slug', slug] as const,
  stats: (id: string) => [...directoryKeys.all, 'stats', id] as const,
};

/**
 * Hook to get a single directory by ID
 */
export function useDirectory(id: string) {
  return useQuery({
    queryKey: directoryKeys.detail(id),
    queryFn: () => directoryApi.getDirectory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a directory by slug
 */
export function useDirectoryBySlug(slug: string) {
  return useQuery({
    queryKey: directoryKeys.slug(slug),
    queryFn: () => directoryApi.getDirectoryBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all directories with optional filters
 */
export function useDirectories(filters?: DirectoryFilters) {
  return useQuery({
    queryKey: directoryKeys.list(filters),
    queryFn: () => directoryApi.getDirectories(filters),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get directory statistics
 */
export function useDirectoryStats(id: string) {
  return useQuery({
    queryKey: directoryKeys.stats(id),
    queryFn: () => directoryApi.getDirectoryStats(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a new directory
 */
export function useCreateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateDirectoryDto) => directoryApi.createDirectory(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: directoryKeys.lists() });
    },
  });
}

/**
 * Hook to update a directory
 */
export function useUpdateDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDirectoryDto }) =>
      directoryApi.updateDirectory(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: directoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: directoryKeys.lists() });
    },
  });
}

/**
 * Hook to archive a directory
 */
export function useArchiveDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => directoryApi.archiveDirectory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: directoryKeys.lists() });
    },
  });
}

/**
 * Hook to restore an archived directory
 */
export function useRestoreDirectory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => directoryApi.restoreDirectory(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: directoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: directoryKeys.lists() });
    },
  });
}
