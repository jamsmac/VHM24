'use client'

import { cn } from '@/lib/utils'
import { Skeleton, TextSkeleton, AvatarSkeleton, BadgeSkeleton } from './Skeleton'

// Stats card skeleton (for dashboard KPIs)
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton variant="rounded" className="h-12 w-12" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

// Machine card skeleton
export function MachineCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <div className="flex items-start gap-4">
        <Skeleton variant="rounded" className="h-16 w-16 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2">
            <BadgeSkeleton />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton variant="rounded" className="h-8 w-20" />
      </div>
    </div>
  )
}

// Task card skeleton
export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <BadgeSkeleton />
            <BadgeSkeleton className="w-20" />
          </div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <AvatarSkeleton size="sm" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

// Incident card skeleton
export function IncidentCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <div className="flex items-start gap-3">
        <Skeleton variant="rounded" className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <BadgeSkeleton />
          </div>
          <TextSkeleton lines={2} lastLineWidth="80%" />
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
}

// User card skeleton
export function UserCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-4', className)}>
      <div className="flex items-center gap-4">
        <AvatarSkeleton size="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2">
            <BadgeSkeleton />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton variant="rounded" className="h-8 w-8" />
      </div>
    </div>
  )
}

// Activity item skeleton
export function ActivityItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 py-3', className)}>
      <Skeleton variant="circular" className="h-8 w-8 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-full max-w-xs" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

// Notification item skeleton
export function NotificationItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg', className)}>
      <Skeleton variant="rounded" className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full max-w-md" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

// Simple list item skeleton
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      <Skeleton variant="circular" className="h-6 w-6" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}
