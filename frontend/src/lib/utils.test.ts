import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  getStatusColor,
  getPriorityColor,
  truncate,
  debounce,
  getErrorMessage,
} from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge classnames correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'truthy', false && 'falsy')).toBe('base truthy')
    })

    it('should handle objects', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-21')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    })

    it('should handle string dates', () => {
      const formatted = formatDate('2025-01-21')
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
    })
  })

  describe('formatDateTime', () => {
    it('should format datetime with time', () => {
      const date = new Date('2025-01-21T14:30:00')
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/)
      expect(formatted).toMatch(/\d{2}:\d{2}/)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency in UZS', () => {
      expect(formatCurrency(1000)).toContain('1')
      expect(formatCurrency(1000)).toContain('000')
      expect(formatCurrency(1000)).toContain('сўм')
    })

    it('should handle zero', () => {
      const formatted = formatCurrency(0)
      expect(formatted).toBeTruthy()
    })

    it('should handle negative numbers', () => {
      const formatted = formatCurrency(-500)
      expect(formatted).toContain('-')
    })
  })

  describe('formatNumber', () => {
    it('should format number with spaces', () => {
      const formatted = formatNumber(1000000)
      expect(formatted).toBeTruthy()
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('getStatusColor', () => {
    it('should return correct color for task statuses', () => {
      expect(getStatusColor('pending')).toBe('bg-yellow-100 text-yellow-800')
      expect(getStatusColor('completed')).toBe('bg-green-100 text-green-800')
      expect(getStatusColor('cancelled')).toBe('bg-gray-100 text-gray-800')
    })

    it('should return correct color for machine statuses', () => {
      expect(getStatusColor('active')).toBe('bg-green-100 text-green-800')
      expect(getStatusColor('error')).toBe('bg-red-100 text-red-800')
    })

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800')
    })

    it('should handle case insensitivity', () => {
      expect(getStatusColor('PENDING')).toBe('bg-yellow-100 text-yellow-800')
      expect(getStatusColor('Completed')).toBe('bg-green-100 text-green-800')
    })

    it('should return correct color for incident statuses', () => {
      expect(getStatusColor('open')).toBe('bg-red-100 text-red-800')
      expect(getStatusColor('resolved')).toBe('bg-green-100 text-green-800')
      expect(getStatusColor('closed')).toBe('bg-gray-100 text-gray-800')
    })

    it('should return correct color for all machine statuses', () => {
      expect(getStatusColor('low_stock')).toBe('bg-yellow-100 text-yellow-800')
      expect(getStatusColor('maintenance')).toBe('bg-orange-100 text-orange-800')
      expect(getStatusColor('offline')).toBe('bg-gray-100 text-gray-800')
      expect(getStatusColor('disabled')).toBe('bg-gray-100 text-gray-800')
    })

    it('should return correct color for all task statuses', () => {
      expect(getStatusColor('assigned')).toBe('bg-blue-100 text-blue-800')
      expect(getStatusColor('in_progress')).toBe('bg-indigo-100 text-indigo-800')
      expect(getStatusColor('postponed')).toBe('bg-orange-100 text-orange-800')
    })
  })

  describe('getPriorityColor', () => {
    it('should return correct color for priorities', () => {
      expect(getPriorityColor('low')).toBe('bg-blue-100 text-blue-800')
      expect(getPriorityColor('medium')).toBe('bg-yellow-100 text-yellow-800')
      expect(getPriorityColor('high')).toBe('bg-orange-100 text-orange-800')
      expect(getPriorityColor('critical')).toBe('bg-red-100 text-red-800')
    })

    it('should return default color for unknown priority', () => {
      expect(getPriorityColor('unknown')).toBe('bg-gray-100 text-gray-800')
    })

    it('should handle case insensitivity', () => {
      expect(getPriorityColor('LOW')).toBe('bg-blue-100 text-blue-800')
      expect(getPriorityColor('Critical')).toBe('bg-red-100 text-red-800')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...')
    })

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 5)).toBe('Hi')
    })

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(truncate('', 5)).toBe('')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('arg1', 'arg2')

      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn()
      vi.advanceTimersByTime(50)
      debouncedFn()
      vi.advanceTimersByTime(50)

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('getErrorMessage', () => {
    it('should return string error as-is', () => {
      expect(getErrorMessage('Error message')).toBe('Error message')
    })

    it('should extract message from Error object', () => {
      const error = new Error('Something went wrong')
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('should extract message from Axios error response', () => {
      const axiosError = {
        response: {
          data: {
            message: 'Server error message'
          }
        }
      }
      expect(getErrorMessage(axiosError)).toBe('Server error message')
    })

    it('should fall back to error.message if no response data', () => {
      const axiosError = {
        message: 'Network Error'
      }
      expect(getErrorMessage(axiosError)).toBe('Network Error')
    })

    it('should return fallback for null', () => {
      expect(getErrorMessage(null)).toBe('Произошла ошибка')
    })

    it('should return fallback for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('Произошла ошибка')
    })

    it('should return custom fallback', () => {
      expect(getErrorMessage(null, 'Custom error')).toBe('Custom error')
    })

    it('should handle object with response but no data message', () => {
      const error = {
        response: {
          data: {}
        },
        message: 'Fallback message'
      }
      expect(getErrorMessage(error)).toBe('Fallback message')
    })

    it('should return fallback for empty object', () => {
      expect(getErrorMessage({})).toBe('Произошла ошибка')
    })
  })
})
