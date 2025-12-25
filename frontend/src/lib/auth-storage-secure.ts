/**
 * Secure Authentication Storage Service - Phase 2
 *
 * SECURITY ARCHITECTURE (SEC-1):
 * =============================
 *
 * PHASE 2 (Current - httpOnly Cookies):
 * - Access tokens: httpOnly cookie (XSS immune) - set by backend
 * - Refresh tokens: httpOnly cookie (XSS immune) - set by backend
 * - Browser handles all cookie management automatically
 * - Frontend stores ONLY user data (non-sensitive) for UI display
 * - No tokens in JavaScript memory or storage
 *
 * Benefits:
 * - XSS attacks cannot steal tokens (httpOnly)
 * - CSRF protection via SameSite=Strict cookies
 * - Automatic cookie expiration handling
 * - Simplified frontend code
 *
 * @see backend/src/modules/auth/utils/cookie.utils.ts for cookie configuration
 * @see frontend/src/lib/axios.ts for request/response interceptors
 */

interface UserData {
  id: string
  email: string
  full_name: string
  role: string
}

/**
 * Authentication events that can be subscribed to
 */
export type AuthEvent =
  | 'login'           // User successfully logged in
  | 'logout'          // User logged out
  | 'token-refreshed' // Access token was refreshed (via cookie)
  | 'token-expired'   // Token expired and refresh failed
  | 'user-updated'    // User data was updated

export type AuthEventListener = (event: AuthEvent, data?: unknown) => void

/**
 * Phase 2 Authentication Storage
 *
 * With httpOnly cookies, this class now only manages:
 * - User data (for UI display)
 * - Authentication events
 * - Session state (logged in / logged out)
 *
 * Tokens are handled entirely by the browser via httpOnly cookies.
 */
class SecureAuthStorage {
  private static instance: SecureAuthStorage

  // User data for UI display (non-sensitive)
  private userData: UserData | null = null
  private isAuthenticated: boolean = false

  // Event listeners
  private listeners: AuthEventListener[] = []

  // Storage keys
  private readonly USER_KEY = '__user_data_v3'

  private constructor() {
    // Load user data from sessionStorage on page load
    this.loadFromStorage()
  }

  static getInstance(): SecureAuthStorage {
    /* c8 ignore start - Singleton pattern: instance creation only happens once on module load */
    if (!SecureAuthStorage.instance) {
      SecureAuthStorage.instance = new SecureAuthStorage()
    }
    /* c8 ignore stop */
    return SecureAuthStorage.instance
  }

  /**
   * Subscribe to authentication events
   */
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Notify all listeners of an authentication event
   */
  private notify(event: AuthEvent, data?: unknown): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Error in auth event listener:', error)
      }
    })
  }

  /**
   * Load user data from sessionStorage
   */
  private loadFromStorage(): void {
    /* c8 ignore start - SSR guard, cannot test in jsdom where window is always defined */
    if (typeof window === 'undefined') {
      return
    }
    /* c8 ignore stop */

    try {
      const userStr = sessionStorage.getItem(this.USER_KEY)
      if (userStr) {
        this.userData = JSON.parse(userStr) as UserData
        this.isAuthenticated = true
      }

      // Clean up old storage keys from Phase 1
      this.cleanupOldStorage()
    } catch (error) {
      console.error('Failed to load user data from storage:', error)
      this.clearStorage()
    }
  }

  /**
   * Clean up old storage keys from Phase 1
   */
  private cleanupOldStorage(): void {
    /* c8 ignore start - SSR guard, cannot test in jsdom where window is always defined */
    if (typeof window === 'undefined') {
      return
    }
    /* c8 ignore stop */

    // Remove Phase 1 token storage keys
    const oldKeys = [
      '__auth_token_v2',
      '__refresh_token_v2',
      '__user_data_v2',
      '__session_fp',
      '__app_key',
      '__auth_token',
      '__user_data',
      '__refresh_token',
      'auth_token',
      'user_data',
    ]

    oldKeys.forEach((key) => {
      sessionStorage.removeItem(key)
      localStorage.removeItem(key)
    })
  }

  /**
   * Handle successful login
   * Called after backend sets httpOnly cookies
   *
   * @param user - User data from login response
   */
  handleLogin(user: UserData): void {
    this.userData = user
    this.isAuthenticated = true

    /* c8 ignore start - SSR guard: window is always defined in jsdom tests */
    if (typeof window !== 'undefined') {
    /* c8 ignore stop */
      try {
        // Clean up old storage keys from Phase 1 before saving new data
        this.cleanupOldStorage()
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user))
      } catch (error) {
        console.error('Failed to save user data:', error)
      }
    }

    this.notify('login', { user })
  }

  /**
   * Handle token refresh
   * Called after backend sets new httpOnly cookies
   */
  handleTokenRefresh(): void {
    this.notify('token-refreshed')
  }

  /**
   * Set user data (for updates after login)
   */
  setUser(user: UserData): void {
    this.userData = user

    /* c8 ignore start - SSR guard: window is always defined in jsdom tests */
    if (typeof window !== 'undefined') {
    /* c8 ignore stop */
      try {
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user))
      } catch (error) {
        console.error('Failed to save user data:', error)
      }
    }

    this.notify('user-updated', { user })
  }

  /**
   * Get current user data
   */
  getUser(): UserData | null {
    /* c8 ignore start - SSR guard: window is always defined in jsdom tests */
    if (!this.userData && typeof window !== 'undefined') {
    /* c8 ignore stop */
      this.loadFromStorage()
    }
    return this.userData
  }

  /**
   * Check if user is authenticated
   * Note: This is a frontend state indicator, actual auth is validated by backend via cookies
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated && this.userData !== null
  }

  /**
   * Clear all auth data (logout)
   * Note: Backend endpoint /auth/logout clears httpOnly cookies
   */
  clearStorage(): void {
    this.userData = null
    this.isAuthenticated = false

    /* c8 ignore start - SSR guard: window is always defined in jsdom tests */
    if (typeof window !== 'undefined') {
    /* c8 ignore stop */
      sessionStorage.removeItem(this.USER_KEY)
      this.cleanupOldStorage()
    }

    this.notify('logout')
  }

  /**
   * Handle authentication failure
   * Called when token refresh fails or session is invalid
   */
  handleAuthFailure(): void {
    this.clearStorage()
    this.notify('token-expired')
  }

  /**
   * Get security info for debugging
   */
  getSecurityInfo() {
    return {
      phase: 'Phase 2 - httpOnly Cookie Authentication',
      tokenStorage: 'httpOnly cookies (browser-managed)',
      userDataStorage: 'sessionStorage',
      xssProtection: 'Full (tokens not accessible to JavaScript)',
      csrfProtection: 'SameSite=Strict cookies',
      isAuthenticated: this.isAuthenticated,
      hasUserData: this.userData !== null,
    }
  }

  // ============================================
  // DEPRECATED METHODS - Kept for backward compatibility
  // These are no longer functional in Phase 2
  // ============================================

  /**
   * @deprecated Tokens are now in httpOnly cookies
   */
  getAccessToken(): string | null {
    console.warn('getAccessToken() is deprecated in Phase 2. Tokens are in httpOnly cookies.')
    return null
  }

  /**
   * @deprecated Tokens are now in httpOnly cookies
   */
  getRefreshToken(): string | null {
    console.warn('getRefreshToken() is deprecated in Phase 2. Tokens are in httpOnly cookies.')
    return null
  }

  /**
   * @deprecated Tokens are now in httpOnly cookies
   */
  setTokens(): void {
    console.warn('setTokens() is deprecated in Phase 2. Backend sets httpOnly cookies.')
  }

  /**
   * @deprecated Use clearStorage() instead
   */
  clearTokens(): void {
    console.warn('clearTokens() is deprecated in Phase 2. Use clearStorage().')
    this.clearStorage()
  }

  /**
   * @deprecated Token expiry is managed by cookies
   */
  isTokenExpired(): boolean {
    console.warn('isTokenExpired() is deprecated in Phase 2. Cookie expiry is browser-managed.')
    return false
  }

  /**
   * @deprecated Refresh is handled by axios interceptor
   */
  async ensureValidToken(): Promise<string | null> {
    console.warn('ensureValidToken() is deprecated in Phase 2. Use axios with withCredentials.')
    return null
  }

  /**
   * @deprecated Refresh is handled by axios interceptor
   */
  async refreshAccessToken(): Promise<boolean> {
    console.warn('refreshAccessToken() is deprecated in Phase 2. Use axios /auth/refresh endpoint.')
    return false
  }
}

export const authStorage = SecureAuthStorage.getInstance()
export type { UserData }

// For backward compatibility
export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}
