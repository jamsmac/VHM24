import { TableSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Inventory Table Skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <TableSkeleton rows={12} />
      </div>
    </div>
  )
}
