'use client'

import { useState, useEffect } from 'react'

interface LiquidSettings {
  resolution: number
  enabled: boolean
  isMobile: boolean
}

/**
 * Hook for responsive LiquidEther settings
 * Disables effect on mobile for performance/battery
 */
export function useLiquidSettings(): LiquidSettings {
  const [settings, setSettings] = useState<LiquidSettings>({
    resolution: 0.5,
    enabled: true,
    isMobile: false
  })

  useEffect(() => {
    const checkSettings = () => {
      const width = window.innerWidth

      if (width < 768) {
        // Mobile - disable for battery
        setSettings({ resolution: 0.2, enabled: false, isMobile: true })
      } else if (width < 1024) {
        // Tablet - lower quality
        setSettings({ resolution: 0.3, enabled: true, isMobile: false })
      } else if (width < 1440) {
        // Laptop
        setSettings({ resolution: 0.4, enabled: true, isMobile: false })
      } else {
        // Desktop - full quality
        setSettings({ resolution: 0.5, enabled: true, isMobile: false })
      }
    }

    checkSettings()

    window.addEventListener('resize', checkSettings)
    return () => window.removeEventListener('resize', checkSettings)
  }, [])

  return settings
}

/**
 * Hook for checking reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}
