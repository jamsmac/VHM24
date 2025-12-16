'use client'

import { useCallback, useRef, useEffect } from 'react'

/**
 * Hook for announcing messages to screen readers via aria-live regions.
 * Useful for dynamic content updates, form validation, and status changes.
 *
 * @example
 * const { announce, announcePolite, announceAssertive } = useAnnounce()
 *
 * // Polite announcement (waits for screen reader to finish current speech)
 * announcePolite('Данные загружены')
 *
 * // Assertive announcement (interrupts current speech)
 * announceAssertive('Ошибка: неверный формат')
 */
export function useAnnounce() {
  const politeRef = useRef<HTMLDivElement | null>(null)
  const assertiveRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create live regions on mount
    const politeRegion = document.createElement('div')
    politeRegion.setAttribute('aria-live', 'polite')
    politeRegion.setAttribute('aria-atomic', 'true')
    politeRegion.setAttribute('role', 'status')
    politeRegion.className = 'sr-only'
    politeRegion.id = 'a11y-polite-announcer'

    const assertiveRegion = document.createElement('div')
    assertiveRegion.setAttribute('aria-live', 'assertive')
    assertiveRegion.setAttribute('aria-atomic', 'true')
    assertiveRegion.setAttribute('role', 'alert')
    assertiveRegion.className = 'sr-only'
    assertiveRegion.id = 'a11y-assertive-announcer'

    // Only add if not already present
    if (!document.getElementById('a11y-polite-announcer')) {
      document.body.appendChild(politeRegion)
    }
    if (!document.getElementById('a11y-assertive-announcer')) {
      document.body.appendChild(assertiveRegion)
    }

    politeRef.current = document.getElementById('a11y-polite-announcer') as HTMLDivElement
    assertiveRef.current = document.getElementById('a11y-assertive-announcer') as HTMLDivElement

    return () => {
      // Cleanup on unmount - only if we created them
      const polite = document.getElementById('a11y-polite-announcer')
      const assertive = document.getElementById('a11y-assertive-announcer')
      if (polite?.parentNode === document.body) {
        document.body.removeChild(polite)
      }
      if (assertive?.parentNode === document.body) {
        document.body.removeChild(assertive)
      }
    }
  }, [])

  /**
   * Announce a message politely (waits for screen reader to finish)
   */
  const announcePolite = useCallback((message: string) => {
    if (politeRef.current) {
      // Clear and re-set to trigger announcement
      politeRef.current.textContent = ''
      // Use timeout to ensure the change is detected
      setTimeout(() => {
        if (politeRef.current) {
          politeRef.current.textContent = message
        }
      }, 100)
    }
  }, [])

  /**
   * Announce a message assertively (interrupts screen reader)
   */
  const announceAssertive = useCallback((message: string) => {
    if (assertiveRef.current) {
      assertiveRef.current.textContent = ''
      setTimeout(() => {
        if (assertiveRef.current) {
          assertiveRef.current.textContent = message
        }
      }, 100)
    }
  }, [])

  /**
   * Generic announce function with configurable politeness
   */
  const announce = useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      if (politeness === 'assertive') {
        announceAssertive(message)
      } else {
        announcePolite(message)
      }
    },
    [announcePolite, announceAssertive]
  )

  return {
    announce,
    announcePolite,
    announceAssertive,
  }
}

/**
 * Utility function to announce messages without using a hook.
 * Useful for event handlers or non-component code.
 */
export function announceToScreenReader(
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
) {
  const id = politeness === 'assertive' ? 'a11y-assertive-announcer' : 'a11y-polite-announcer'
  const region = document.getElementById(id)

  if (region) {
    region.textContent = ''
    setTimeout(() => {
      region.textContent = message
    }, 100)
  }
}
