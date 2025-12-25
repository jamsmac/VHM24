import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Tasks Table Skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <TableSkeleton rows={10} />
      </div>
    </div>
  )
}
