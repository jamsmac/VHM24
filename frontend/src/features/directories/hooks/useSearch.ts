'use client';

/**
 * Hook for directory entry search with debouncing
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { directoryApi } from '../api/directory.api';
import type { DirectoryEntry, EntryStatus } from '../types';

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export interface UseSearchParams {
  directoryId: string;
  initialQuery?: string;
  status?: EntryStatus;
  limit?: number;
  includeRecent?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
}

export interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: DirectoryEntry[];
  recent: DirectoryEntry[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for searching directory entries with debouncing and recent selections
 */
export function useSearch({
  directoryId,
  initialQuery = '',
  status = 'active' as EntryStatus,
  limit = 50,
  includeRecent = true,
  debounceMs = 300,
  minQueryLength = 2,
}: UseSearchParams): UseSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  // Determine if we should search
  const shouldSearch = useMemo(() => {
    return debouncedQuery.length >= minQueryLength || debouncedQuery === '';
  }, [debouncedQuery, minQueryLength]);

  // Search query
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['search', directoryId, debouncedQuery, status, limit, includeRecent],
    queryFn: () =>
      directoryApi.searchEntries(directoryId, {
        q: debouncedQuery || undefined,
        status,
        limit,
        include_recent: includeRecent,
      }),
    enabled: !!directoryId && shouldSearch,
    staleTime: 10 * 1000, // 10 seconds
  });

  return {
    query,
    setQuery,
    results: data?.data || [],
    recent: data?.recent || [],
    total: data?.meta?.total || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook for simple search without debouncing (for imperative use)
 */
export function useSearchEntries(directoryId: string) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(
    async (query: string, status?: EntryStatus, limit?: number) => {
      if (!directoryId) return [];

      setIsSearching(true);
      setError(null);

      try {
        const response = await directoryApi.searchEntries(directoryId, {
          q: query,
          status,
          limit,
        });
        setResults(response.data);
        return response.data;
      } catch (err) {
        setError(err as Error);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [directoryId],
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    clear,
    results,
    isSearching,
    error,
  };
}
