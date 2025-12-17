import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ru-RU').format(num)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Task statuses
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    postponed: 'bg-orange-100 text-orange-800',

    // Machine statuses
    active: 'bg-green-100 text-green-800',
    low_stock: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    maintenance: 'bg-orange-100 text-orange-800',
    offline: 'bg-gray-100 text-gray-800',
    disabled: 'bg-gray-100 text-gray-800',

    // Incident statuses
    open: 'bg-red-100 text-red-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  return colors[priority.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) {return str}
  return str.slice(0, length) + '...'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {clearTimeout(timeout)}
    timeout = setTimeout(later, wait)
  }
}

/**
 * Axios error response structure
 */
interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string
    }
  }
  message?: string
}

/**
 * Type guard to check if error is an Axios-like error
 */
function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'message' in error)
  )
}

/**
 * Safely extract error message from unknown error
 * Works with Axios errors, standard Error objects, and strings
 */
export function getErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (typeof error === 'string') {
    return error
  }

  if (isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
