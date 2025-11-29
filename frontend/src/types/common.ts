import { AxiosError } from 'axios'

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  statusCode: number
  message: string | string[]
  error?: string
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
    return error.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Form change handler value type - use union of common field value types
 */
export type FormFieldValue = string | number | boolean | Date | null | undefined

/**
 * Recharts entry type for custom tooltip/label renders
 */
export interface ChartEntry {
  name: string
  value: number
  fill?: string
  payload?: Record<string, unknown>
}

/**
 * Recharts tooltip props type
 */
export interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    fill?: string
    payload?: Record<string, unknown>
  }>
  label?: string
}

/**
 * Recharts label props type
 */
export interface ChartLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index: number
  name: string
  value: number
}
