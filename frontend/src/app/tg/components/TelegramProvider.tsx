'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/axios'

// Telegram WebApp types
interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

interface ThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

interface MainButton {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText: (text: string) => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  show: () => void
  hide: () => void
  enable: () => void
  disable: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
}

interface BackButton {
  isVisible: boolean
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
  show: () => void
  hide: () => void
}

interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    query_id?: string
    auth_date?: number
    hash?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: ThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  MainButton: MainButton
  BackButton: BackButton
  HapticFeedback: HapticFeedback
  ready: () => void
  expand: () => void
  close: () => void
  openLink: (url: string) => void
  openTelegramLink: (url: string) => void
  openInvoice: (url: string, callback?: (status: string) => void) => void
  showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (id: string) => void) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  showScanQrPopup: (params: { text?: string }, callback?: (data: string) => boolean | void) => void
  closeScanQrPopup: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramContextValue {
  webApp: TelegramWebApp | null
  user: TelegramUser | null
  isReady: boolean
  isAuthenticated: boolean
  accessToken: string | null
  colorScheme: 'light' | 'dark'
  themeParams: ThemeParams
  // Actions
  authenticate: () => Promise<boolean>
  hapticFeedback: HapticFeedback | null
  showMainButton: (text: string, onClick: () => void) => void
  hideMainButton: () => void
  showBackButton: (onClick: () => void) => void
  hideBackButton: () => void
}

const TelegramContext = createContext<TelegramContextValue | null>(null)

export function useTelegram() {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider')
  }
  return context
}

interface TelegramProviderProps {
  children: ReactNode
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')
  const [themeParams, setThemeParams] = useState<ThemeParams>({})

  // Initialize Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      // Signal that app is ready
      tg.ready()

      // Expand to full height
      tg.expand()

      // Set state
      setWebApp(tg)
      setUser(tg.initDataUnsafe.user || null)
      setColorScheme(tg.colorScheme)
      setThemeParams(tg.themeParams)
      setIsReady(true)

      // Apply theme colors to CSS variables
      if (tg.themeParams.bg_color) {
        document.documentElement.style.setProperty('--tg-bg-color', tg.themeParams.bg_color)
      }
      if (tg.themeParams.text_color) {
        document.documentElement.style.setProperty('--tg-text-color', tg.themeParams.text_color)
      }
      if (tg.themeParams.secondary_bg_color) {
        document.documentElement.style.setProperty('--tg-secondary-bg-color', tg.themeParams.secondary_bg_color)
      }
    } else {
      // Not in Telegram - use mock for development
      console.warn('Telegram WebApp not available. Running in development mode.')
      setIsReady(true)
    }
  }, [])

  // Authenticate with backend
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!webApp?.initData) {
      console.error('No initData available for authentication')
      return false
    }

    try {
      const response = await apiClient.post('/client/auth/telegram', {
        initData: webApp.initData,
      })

      const { access_token } = response.data
      setAccessToken(access_token)
      setIsAuthenticated(true)

      // Store token for API calls
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_access_token', access_token)
      }

      return true
    } catch (error) {
      console.error('Telegram authentication failed:', error)
      return false
    }
  }, [webApp])

  // Store current callbacks for cleanup
  const mainButtonCallbackRef = useRef<(() => void) | null>(null)
  const backButtonCallbackRef = useRef<(() => void) | null>(null)

  // Main Button helpers
  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      // Remove previous callback to prevent memory leaks
      if (mainButtonCallbackRef.current) {
        webApp.MainButton.offClick(mainButtonCallbackRef.current)
      }
      mainButtonCallbackRef.current = onClick
      webApp.MainButton.setText(text)
      webApp.MainButton.onClick(onClick)
      webApp.MainButton.show()
    }
  }, [webApp])

  const hideMainButton = useCallback(() => {
    if (webApp?.MainButton) {
      if (mainButtonCallbackRef.current) {
        webApp.MainButton.offClick(mainButtonCallbackRef.current)
        mainButtonCallbackRef.current = null
      }
      webApp.MainButton.hide()
    }
  }, [webApp])

  // Back Button helpers
  const showBackButton = useCallback((onClick: () => void) => {
    if (webApp?.BackButton) {
      // Remove previous callback to prevent memory leaks
      if (backButtonCallbackRef.current) {
        webApp.BackButton.offClick(backButtonCallbackRef.current)
      }
      backButtonCallbackRef.current = onClick
      webApp.BackButton.onClick(onClick)
      webApp.BackButton.show()
    }
  }, [webApp])

  const hideBackButton = useCallback(() => {
    if (webApp?.BackButton) {
      if (backButtonCallbackRef.current) {
        webApp.BackButton.offClick(backButtonCallbackRef.current)
        backButtonCallbackRef.current = null
      }
      webApp.BackButton.hide()
    }
  }, [webApp])

  const value: TelegramContextValue = {
    webApp,
    user,
    isReady,
    isAuthenticated,
    accessToken,
    colorScheme,
    themeParams,
    authenticate,
    hapticFeedback: webApp?.HapticFeedback || null,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
  }

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  )
}
