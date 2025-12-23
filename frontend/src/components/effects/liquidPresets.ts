/**
 * LiquidEther presets for VendHub Manager
 * Different configurations for various pages
 */

export const liquidPresets = {
  // Login/Register pages - impressive first impression
  auth: {
    colors: ['#3B82F6', '#8B5CF6', '#06B6D4'] as [string, string, string],
    mouseForce: 30,
    cursorSize: 150,
    resolution: 0.6,
    autoDemo: true,
    autoSpeed: 0.4,
    autoIntensity: 2.0,
    className: 'opacity-60'
  },

  // Dashboard - very subtle background
  dashboard: {
    colors: ['#0F172A', '#1E293B', '#334155'] as [string, string, string],
    mouseForce: 12,
    cursorSize: 80,
    resolution: 0.25,
    autoDemo: true,
    autoSpeed: 0.15,
    autoIntensity: 1.0,
    viscous: 50,
    iterationsPoisson: 16,
    iterationsViscous: 16,
    className: 'opacity-15'
  },

  // Public landing page - eye-catching marketing
  landing: {
    colors: ['#3B82F6', '#8B5CF6', '#EC4899'] as [string, string, string],
    mouseForce: 25,
    cursorSize: 120,
    resolution: 0.5,
    autoDemo: true,
    autoSpeed: 0.3,
    autoIntensity: 1.8,
    className: 'opacity-40'
  },

  // Setup wizard / onboarding
  wizard: {
    colors: ['#10B981', '#3B82F6', '#8B5CF6'] as [string, string, string],
    mouseForce: 20,
    cursorSize: 100,
    resolution: 0.4,
    autoDemo: true,
    autoSpeed: 0.25,
    autoIntensity: 1.5,
    className: 'opacity-30'
  },

  // Error/Maintenance pages
  error: {
    colors: ['#EF4444', '#F97316', '#FBBF24'] as [string, string, string],
    mouseForce: 15,
    cursorSize: 100,
    resolution: 0.3,
    autoDemo: true,
    autoSpeed: 0.2,
    autoIntensity: 1.2,
    className: 'opacity-25'
  },

  // Success pages
  success: {
    colors: ['#10B981', '#059669', '#047857'] as [string, string, string],
    mouseForce: 20,
    cursorSize: 120,
    resolution: 0.4,
    autoDemo: true,
    autoSpeed: 0.3,
    autoIntensity: 1.5,
    className: 'opacity-35'
  }
} as const

// VendHub brand color themes
export const VENDHUB_THEMES = {
  primary: {
    fluid: ['#3B82F6', '#8B5CF6', '#06B6D4'] as [string, string, string],
    gradient: 'from-blue-500 via-purple-500 to-cyan-500'
  },
  success: {
    fluid: ['#10B981', '#059669', '#047857'] as [string, string, string],
    gradient: 'from-green-500 to-emerald-600'
  },
  warning: {
    fluid: ['#F59E0B', '#D97706', '#B45309'] as [string, string, string],
    gradient: 'from-amber-500 to-orange-600'
  },
  error: {
    fluid: ['#EF4444', '#DC2626', '#B91C1C'] as [string, string, string],
    gradient: 'from-red-500 to-rose-600'
  },
  premium: {
    fluid: ['#F59E0B', '#8B5CF6', '#EC4899'] as [string, string, string],
    gradient: 'from-amber-500 via-purple-500 to-pink-500'
  }
} as const

export type LiquidPreset = keyof typeof liquidPresets
export type VendHubTheme = keyof typeof VENDHUB_THEMES
