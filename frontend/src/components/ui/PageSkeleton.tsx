'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'
import { StatsCardSkeleton, MachineCardSkeleton, TaskCardSkeleton, ActivityItemSkeleton } from './CardSkeleton'
import { TableSkeleton } from './TableSkeleton'

// Dashboard page skeleton
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Welcome section */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Quick actions */}
      <div className="bg-card rounded-lg border border-border p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" className="h-12" />
          ))}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="bg-card rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-1 divide-y divide-border">
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
            <ActivityItemSkeleton />
          </div>
        </div>

        {/* Tasks summary */}
        <div className="bg-card rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-36 mb-4" />
          <div className="space-y-3">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}

// Machines list page skeleton
export function MachinesPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton variant="rounded" className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" className="h-10 w-64" />
        <Skeleton variant="rounded" className="h-10 w-32" />
        <Skeleton variant="rounded" className="h-10 w-32" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MachineCardSkeleton />
        <MachineCardSkeleton />
        <MachineCardSkeleton />
        <MachineCardSkeleton />
        <MachineCardSkeleton />
        <MachineCardSkeleton />
      </div>
    </div>
  )
}

// Tasks list page skeleton
export function TasksPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton variant="rounded" className="h-10 w-36" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton variant="rounded" className="h-8 w-20" />
        <Skeleton variant="rounded" className="h-8 w-24" />
        <Skeleton variant="rounded" className="h-8 w-28" />
        <Skeleton variant="rounded" className="h-8 w-24" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton variant="rounded" className="h-10 flex-1 max-w-xs" />
        <Skeleton variant="rounded" className="h-10 w-32" />
        <Skeleton variant="rounded" className="h-10 w-32" />
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    </div>
  )
}

// Table page skeleton (generic for users, incidents, etc.)
export function TablePageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton variant="rounded" className="h-10 w-32" />
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton variant="rounded" className="h-10 w-64" />
        <Skeleton variant="rounded" className="h-10 w-32" />
        <Skeleton variant="rounded" className="h-10 w-32" />
        <div className="flex-1" />
        <Skeleton variant="rounded" className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <TableSkeleton rows={8} columns={5} showCheckbox showActions />
      </div>
    </div>
  )
}

// Detail page skeleton (for machine detail, task detail, etc.)
export function DetailPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Back button */}
      <Skeleton className="h-4 w-24" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Skeleton variant="rounded" className="h-16 w-16" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-6 w-20" />
              <Skeleton variant="rounded" className="h-6 w-24" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="rounded" className="h-10 w-24" />
          <Skeleton variant="rounded" className="h-10 w-10" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton variant="rounded" className="h-8 w-24" />
        <Skeleton variant="rounded" className="h-8 w-28" />
        <Skeleton variant="rounded" className="h-8 w-20" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main info card */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-card rounded-lg border border-border p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
              <ActivityItemSkeleton />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-4 space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-2">
              <Skeleton variant="rounded" className="h-10 w-full" />
              <Skeleton variant="rounded" className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings page skeleton
export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Skeleton variant="rounded" className="h-8 w-24" />
        <Skeleton variant="rounded" className="h-8 w-28" />
        <Skeleton variant="rounded" className="h-8 w-32" />
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="bg-card rounded-lg border border-border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton variant="rounded" className="h-10 w-full max-w-md" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Skeleton variant="rounded" className="h-10 w-32" />
      </div>
    </div>
  )
}
