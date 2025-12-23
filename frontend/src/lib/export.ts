/**
 * Export utilities for VendHub Manager
 * Supports CSV export without external dependencies
 */

export interface ExportColumn<T> {
  key: keyof T
  header: string
  format?: (value: unknown) => string
}

export interface ExportOptions {
  filename: string
  sheetName?: string
}

/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param columns - Column definitions with headers and formatters
 * @param options - Export options (filename)
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const { filename } = options

  // Build CSV content
  const headers = columns.map(col => escapeCSVValue(col.header)).join(',')

  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      const formattedValue = col.format ? col.format(value) : String(value ?? '')
      return escapeCSVValue(formattedValue)
    }).join(',')
  ).join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const csvContent = `\uFEFF${headers}\n${rows}`

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export data to Excel-like format (actually CSV with .xlsx extension for compatibility)
 * For true Excel format, install xlsx package
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  // Try to use xlsx if available, otherwise fallback to CSV
  try {
    // Dynamic import for xlsx (if installed)
    // @ts-expect-error xlsx is an optional dependency
    import('xlsx').then((XLSX: typeof import('xlsx')) => {
      const { filename, sheetName = 'Sheet1' } = options

      // Prepare data with headers
      const exportData = data.map(row => {
        const exportRow: Record<string, string> = {}
        columns.forEach(col => {
          const value = row[col.key]
          exportRow[col.header] = col.format ? col.format(value) : String(value ?? '')
        })
        return exportRow
      })

      // Create workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Auto-size columns
      const colWidths = columns.map(col => ({
        wch: Math.max(
          col.header.length,
          ...exportData.map(row => String(row[col.header] || '').length)
        ) + 2
      }))
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      // Save file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      downloadBlob(blob, `${filename}.xlsx`)
    }).catch(() => {
      // xlsx not available, use CSV with .xlsx extension (opens in Excel)
      console.warn('xlsx package not available, using CSV format')
      exportToCSV(data, columns, { ...options, filename: options.filename })
    })
  } catch {
    // Fallback to CSV
    exportToCSV(data, columns, options)
  }
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format currency for export (without symbol for better sorting)
 */
export function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0'
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
