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
export function exportToCSV<T extends object>(
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
 * Export data to Excel format using ExcelJS
 */
export async function exportToExcel<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): Promise<void> {
  try {
    // Dynamic import for exceljs
    const ExcelJS = await import('exceljs')
    const { filename, sheetName = 'Sheet1' } = options

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)

    // Add headers
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: String(col.key),
      width: Math.max(col.header.length + 2, 15)
    }))

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Add data rows
    data.forEach(row => {
      const rowData: Record<string, string> = {}
      columns.forEach(col => {
        const value = row[col.key]
        rowData[String(col.key)] = col.format ? col.format(value) : String(value ?? '')
      })
      worksheet.addRow(rowData)
    })

    // Auto-fit column widths based on content
    worksheet.columns.forEach(column => {
      if (column.values) {
        let maxLength = column.header ? String(column.header).length : 10
        column.values.forEach(value => {
          if (value) {
            const length = String(value).length
            if (length > maxLength) maxLength = length
          }
        })
        column.width = Math.min(maxLength + 2, 50)
      }
    })

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    downloadBlob(blob, `${filename}.xlsx`)
  } catch (error) {
    console.warn('ExcelJS export failed, falling back to CSV:', error)
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
