'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  X,
  RefreshCw,
  Star,
  Trash2,
  Download,
  Send,
  Settings,
} from 'lucide-react'

export interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onRefreshAll?: () => void
  onAddToFavorites?: () => void
  onExport?: () => void
  onSendNotification?: () => void
  onBulkSettings?: () => void
  onDelete?: () => void
  className?: string
}

/**
 * BulkActionsBar - Fixed bottom bar for bulk operations
 * Part of VendHub "Warm Brew" design system
 */
export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onRefreshAll,
  onAddToFavorites,
  onExport,
  onSendNotification,
  onBulkSettings,
  onDelete,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-stone-900 text-white rounded-2xl shadow-2xl',
        'flex items-center gap-1 px-2 py-2',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      {/* Selected Count */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 rounded-xl mr-2">
        <span className="font-semibold">{selectedCount}</span>
        <span className="text-sm text-amber-100">выбрано</span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-stone-700" />

      {/* Actions */}
      <div className="flex items-center gap-1 px-2">
        {onRefreshAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshAll}
            className="text-stone-300 hover:text-white hover:bg-stone-800 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
        )}

        {onAddToFavorites && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddToFavorites}
            className="text-stone-300 hover:text-white hover:bg-stone-800 gap-2"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">В избранное</span>
          </Button>
        )}

        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="text-stone-300 hover:text-white hover:bg-stone-800 gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Экспорт</span>
          </Button>
        )}

        {onSendNotification && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSendNotification}
            className="text-stone-300 hover:text-white hover:bg-stone-800 gap-2"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Уведомление</span>
          </Button>
        )}

        {onBulkSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBulkSettings}
            className="text-stone-300 hover:text-white hover:bg-stone-800 gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Настройки</span>
          </Button>
        )}

        {onDelete && (
          <>
            <div className="w-px h-8 bg-stone-700 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Удалить</span>
            </Button>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-stone-700" />

      {/* Clear Selection */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="text-stone-400 hover:text-white hover:bg-stone-800 ml-1"
        title="Снять выделение"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  )
}

export default BulkActionsBar
