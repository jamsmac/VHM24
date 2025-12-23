'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { exportToExcel, exportToCSV, type ExportColumn } from '@/lib/export'
import { cn } from '@/lib/utils'

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[]
  columns: ExportColumn<T>[]
  filename: string
  className?: string
  disabled?: boolean
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  className,
  disabled = false,
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true)
    setIsOpen(false)

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100))

      if (format === 'xlsx') {
        exportToExcel(data, columns, { filename })
      } else {
        exportToCSV(data, columns, { filename })
      }
    } finally {
      setIsExporting(false)
    }
  }

  const isDisabled = disabled || isExporting || data.length === 0

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
          'text-gray-700 dark:text-gray-200',
          'hover:bg-gray-50 dark:hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Экспорт</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => handleExport('xlsx')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Excel (.xlsx)</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{data.length} записей</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-t border-gray-100 dark:border-slate-700"
            >
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">CSV (.csv)</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{data.length} записей</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
