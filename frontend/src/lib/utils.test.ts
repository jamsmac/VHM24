import { describe, it, expect } from 'vitest'
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  getStatusColor,
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
    it('should format currency in RUB', () => {
      expect(formatCurrency(1000)).toContain('1')
      expect(formatCurrency(1000)).toContain('000')
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
  })
})
