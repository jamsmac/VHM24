import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function MachinesLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Machines Grid/Table Skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <TableSkeleton rows={8} />
      </div>
    </div>
  )
}
