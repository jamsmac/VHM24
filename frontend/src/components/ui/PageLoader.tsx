import { LoadingSkeleton } from './LoadingSkeleton'

/**
 * Full-page loading component for route-level code splitting
 *
 * Used as Suspense fallback for lazy-loaded pages
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page header skeleton */}
        <div className="space-y-2">
          <LoadingSkeleton className="h-8 w-64" />
          <LoadingSkeleton className="h-4 w-96" />
        </div>

        {/* Action bar skeleton */}
        <div className="flex gap-4">
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-32" />
        </div>

        {/* Content grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-8 w-32" />
              <LoadingSkeleton className="h-3 w-full" />
              <LoadingSkeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact component-level loader
 *
 * Used for smaller sections within pages
 */
export function ComponentLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      </div>
    </div>
  )
}

/**
 * Inline spinner for button loading states
 */
export function InlineLoader() {
  return (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
  )
}
