'use client'

import { useQuery } from '@tanstack/react-query'
import { alertsApi } from '@/lib/alerts-api'

/**
 * Hook to fetch the count of active alerts
 * Refreshes every 30 seconds
 */
export function useActiveAlertsCount() {
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['alerts', 'active-count'],
    queryFn: () => alertsApi.getActiveAlertsCount(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider fresh for 10 seconds
  })

  return { count, isLoading }
}
