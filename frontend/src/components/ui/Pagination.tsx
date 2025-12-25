'use client'

import { cn } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  siblingCount?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const range = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const generatePages = () => {
    const totalNumbers = siblingCount * 2 + 3 // siblings + current + 2 boundaries
    const totalBlocks = totalNumbers + 2 // + 2 for ellipsis

    if (totalPages <= totalBlocks) {
      return range(1, totalPages)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = range(1, leftItemCount)
      return [...leftRange, 'dots', totalPages]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = range(totalPages - rightItemCount + 1, totalPages)
      return [1, 'dots', ...rightRange]
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex)
      return [1, 'dots', ...middleRange, 'dots', totalPages]
    }

    return range(1, totalPages)
  }

  const pages = generatePages()

  if (totalPages <= 1) return null

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      aria-label="Pagination"
    >
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Первая страница"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Предыдущая страница"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === 'dots' ? (
            <span
              key={`dots-${index}`}
              className="px-2 text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={cn(
                'min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors',
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Следующая страница"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Последняя страница"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  )
}

// Simple pagination (prev/next only)
interface SimplePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: SimplePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад
      </button>

      <span className="text-sm text-muted-foreground">
        Страница {currentPage} из {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Вперёд
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Pagination with page size selector
interface PaginationWithSizeProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function PaginationWithSize({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationWithSizeProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Показано</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          из {totalItems} ({startItem}-{endItem})
        </span>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        showFirstLast={false}
      />
    </div>
  )
}

// Load more button
interface LoadMoreProps {
  hasMore: boolean
  isLoading?: boolean
  onLoadMore: () => void
  className?: string
}

export function LoadMore({
  hasMore,
  isLoading = false,
  onLoadMore,
  className,
}: LoadMoreProps) {
  if (!hasMore) return null

  return (
    <div className={cn('flex justify-center py-4', className)}>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-6 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/10 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
      </button>
    </div>
  )
}

// Infinite scroll trigger
interface InfiniteScrollTriggerProps {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number
  className?: string
}

export function InfiniteScrollTrigger({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  className,
}: InfiniteScrollTriggerProps) {
  const _handleScroll = () => {
    if (isLoading || !hasMore) return

    const scrollTop = document.documentElement.scrollTop
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = document.documentElement.clientHeight

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      onLoadMore()
    }
  }

  // Note: In real usage, attach this to scroll event
  // This is a placeholder component

  if (!hasMore && !isLoading) return null

  return (
    <div className={cn('flex justify-center py-4', className)}>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Загрузка...
        </div>
      )}
    </div>
  )
}

// Cursor-based pagination (for APIs that use cursors)
interface CursorPaginationProps {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  isLoading?: boolean
  className?: string
}

export function CursorPagination({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  isLoading = false,
  className,
}: CursorPaginationProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <button
        onClick={onPrevious}
        disabled={!hasPrevious || isLoading}
        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Предыдущие
      </button>

      <button
        onClick={onNext}
        disabled={!hasNext || isLoading}
        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Следующие
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Page jump input
interface PageJumpProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function PageJump({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PageJumpProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const page = Number(formData.get('page'))
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex items-center gap-2 text-sm', className)}
    >
      <span className="text-muted-foreground">Перейти к</span>
      <input
        type="number"
        name="page"
        min={1}
        max={totalPages}
        defaultValue={currentPage}
        className="w-16 px-2 py-1 border border-input rounded-md bg-background text-foreground text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <span className="text-muted-foreground">из {totalPages}</span>
      <button
        type="submit"
        className="px-3 py-1 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Перейти
      </button>
    </form>
  )
}
