'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  showCheckbox?: boolean
  showActions?: boolean
  className?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  showCheckbox = false,
  showActions = true,
  className,
}: TableSkeletonProps) {
  const _totalColumns = columns + (showCheckbox ? 1 : 0) + (showActions ? 1 : 0)

  return (
    <div className={cn('w-full', className)}>
      {/* Table header */}
      {showHeader && (
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b border-border rounded-t-lg">
          {showCheckbox && (
            <Skeleton className="h-4 w-4 flex-shrink-0" />
          )}
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={`header-${index}`}
              className={cn(
                'h-4',
                index === 0 ? 'w-32' : 'w-24',
                index === 0 ? 'flex-1' : ''
              )}
            />
          ))}
          {showActions && (
            <Skeleton className="h-4 w-16 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Table rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex items-center gap-4 px-4 py-4"
          >
            {showCheckbox && (
              <Skeleton className="h-4 w-4 flex-shrink-0" />
            )}
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className={cn(
                  'h-4',
                  colIndex === 0 ? 'w-40 flex-1' : 'w-20'
                )}
              />
            ))}
            {showActions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Skeleton className="h-8 w-8" variant="rounded" />
                <Skeleton className="h-8 w-8" variant="rounded" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" variant="rounded" />
          <Skeleton className="h-8 w-8" variant="rounded" />
          <Skeleton className="h-8 w-8" variant="rounded" />
          <Skeleton className="h-8 w-8" variant="rounded" />
        </div>
      </div>
    </div>
  )
}

// Compact table skeleton for smaller tables
export function CompactTableSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('w-full', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between py-3 border-b border-border last:border-0"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="h-8 w-8" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// Data grid skeleton
export function DataGridSkeleton({
  rows = 3,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('grid gap-4', className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: rows * columns }).map((_, index) => (
        <div key={index} className="bg-card rounded-lg border border-border p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}
