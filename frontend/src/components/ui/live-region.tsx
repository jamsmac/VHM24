'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface LiveRegionProps {
  /** Content to announce to screen readers */
  children?: React.ReactNode
  /** Message to announce (alternative to children) */
  message?: string
  /** Politeness level: 'polite' waits, 'assertive' interrupts */
  politeness?: 'polite' | 'assertive'
  /** ARIA role: 'status' for updates, 'alert' for important messages, 'log' for history */
  role?: 'status' | 'alert' | 'log'
  /** Whether entire region is re-read when updated (default: true) */
  atomic?: boolean
  /** Which parts are announced: 'all', 'additions', 'removals', 'text' */
  relevant?: 'all' | 'additions' | 'removals' | 'text' | 'additions text'
  /** Additional classes for the container */
  className?: string
  /** Whether to visually hide the region (default: true) */
  visuallyHidden?: boolean
}

/**
 * LiveRegion component creates an ARIA live region for screen reader announcements.
 *
 * Use this for:
 * - Form validation messages
 * - Status updates (loading, saving, etc.)
 * - Real-time data changes
 * - Notification messages
 *
 * @example
 * // Status message (polite)
 * <LiveRegion message={isLoading ? 'Загрузка...' : 'Данные загружены'} />
 *
 * @example
 * // Error alert (assertive)
 * <LiveRegion
 *   politeness="assertive"
 *   role="alert"
 *   message={error}
 * />
 *
 * @example
 * // Visible status with live updates
 * <LiveRegion visuallyHidden={false} className="text-sm text-green-600">
 *   Сохранено успешно
 * </LiveRegion>
 */
export const LiveRegion = React.forwardRef<HTMLDivElement, LiveRegionProps>(
  (
    {
      children,
      message,
      politeness = 'polite',
      role = politeness === 'assertive' ? 'alert' : 'status',
      atomic = true,
      relevant = 'additions text',
      className,
      visuallyHidden = true,
    },
    ref
  ) => {
    const content = message ?? children

    return (
      <div
        ref={ref}
        aria-live={politeness}
        aria-atomic={atomic}
        aria-relevant={relevant}
        role={role}
        className={cn(
          visuallyHidden && 'sr-only',
          className
        )}
      >
        {content}
      </div>
    )
  }
)

LiveRegion.displayName = 'LiveRegion'

/**
 * Hook to manage live region announcements with state
 */
export function useLiveRegion(
  initialMessage = '',
  options: Omit<LiveRegionProps, 'children' | 'message'> = {}
) {
  const [message, setMessage] = React.useState(initialMessage)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const announce = React.useCallback((newMessage: string, duration?: number) => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Clear message first to ensure re-announcement
    setMessage('')

    // Set new message after brief delay
    setTimeout(() => {
      setMessage(newMessage)

      // Auto-clear after duration if specified
      if (duration) {
        timeoutRef.current = setTimeout(() => {
          setMessage('')
        }, duration)
      }
    }, 100)
  }, [])

  const clear = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setMessage('')
  }, [])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const LiveRegionComponent = React.useMemo(
    () => (
      <LiveRegion message={message} {...options} />
    ),
    [message, options]
  )

  return {
    message,
    announce,
    clear,
    LiveRegion: LiveRegionComponent,
  }
}

export default LiveRegion
