/**
 * Enhanced Secure Token Storage Service
 *
 * SECURITY ARCHITECTURE:
 * =====================
 *
 * PHASE 1 (Completed):
 * - Access tokens: Memory-first, sessionStorage as backup (XSS mitigation)
 * - Refresh tokens: sessionStorage (better than localStorage)
 * - Auto-clear on tab close (sessionStorage behavior)
 * - Token encryption in storage
 * - CSP headers recommended
 *
 * PHASE 2 (CURRENT - SEC-1 Implemented):
 * - Backend now sets httpOnly cookies on login/refresh/logout ✅
 * - JWT strategy reads from cookie first, Bearer header as fallback ✅
 * - Access tokens: Memory + sessionStorage (legacy) + httpOnly cookie (primary)
 * - Refresh tokens: httpOnly cookie (XSS immune) + body (backward compat)
 * - Frontend can gradually remove manual token storage
 *
 * PHASE 3 (Future - Full Production):
 * - All tokens in httpOnly cookies only
 * - Zero tokens in JavaScript
 * - Backend handles all token management
 *
 * CURRENT STATUS: Phase 2 ✅ (httpOnly cookies active, backward compatible)
 * NEXT STEP: Phase 3 (remove manual token storage from frontend)
 *
 * NOTE: axios.ts has withCredentials: true, so httpOnly cookies are sent automatically.
 * The Bearer header is still sent for backward compatibility but cookies take priority.
 */

interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

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
  | 'token-refreshed' // Access token was refreshed
  | 'token-expired'   // Token expired and refresh failed
  | 'user-updated'    // User data was updated
  | 'session-hijack'  // Potential session hijacking detected

export type AuthEventListener = (event: AuthEvent, data?: any) => void

/**
 * Simple XOR encryption for storage (obfuscation layer)
 * Note: This is NOT cryptographic security, just obfuscation to prevent casual inspection
 * Real security comes from httpOnly cookies (Phase 2+)
 */
class StorageEncryption {
  private key: string

  constructor() {
    // Generate unique key per browser instance
    this.key = this.getOrCreateKey()
  }

  private getOrCreateKey(): string {
    // Guard for server-side rendering
    if (typeof window === 'undefined') {
      // Return a dummy key for SSR (won't be used in practice)
      return 'ssr-dummy-key-not-used-in-browser'
    }

    const keyName = '__app_key'
    let key = sessionStorage.getItem(keyName)

    if (!key) {
      // Generate random key
      key = Array.from({ length: 32 }, () =>
        Math.random().toString(36).charAt(2)
      ).join('')
      sessionStorage.setItem(keyName, key)
    }

    return key
  }

  encrypt(data: string): string {
    try {
      const encrypted = Array.from(data).map((char, i) => {
        const keyChar = this.key.charCodeAt(i % this.key.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      }).join('')

      return btoa(encrypted) // Base64 encode
    } catch {
      return data // Fallback to plain if encryption fails
    }
  }

  decrypt(encrypted: string): string {
    try {
      const decoded = atob(encrypted) // Base64 decode
      return Array.from(decoded).map((char, i) => {
        const keyChar = this.key.charCodeAt(i % this.key.length)
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
      }).join('')
    } catch {
      return encrypted // Fallback to plain if decryption fails
    }
  }
}

class SecureAuthStorage {
  private static instance: SecureAuthStorage

  // Primary storage: In-memory (cleared on page reload - most secure)
  private tokenData: TokenData | null = null
  private userData: UserData | null = null

  // Backup storage encryption
  private encryption: StorageEncryption

  // Refresh management
  private refreshPromise: Promise<boolean> | null = null
  private listeners: AuthEventListener[] = []

  // Session hijacking detection
  private sessionFingerprint: string | null = null

  // Storage keys (encrypted)
  private readonly TOKEN_KEY = '__auth_token_v2'
  private readonly USER_KEY = '__user_data_v2'
  private readonly REFRESH_KEY = '__refresh_token_v2'
  private readonly FINGERPRINT_KEY = '__session_fp'

  private readonly API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  private constructor() {
    this.encryption = new StorageEncryption()
    this.sessionFingerprint = this.generateFingerprint()

    // Initialize from sessionStorage on page load
    this.loadFromStorage()

    // Auto-refresh tokens before expiry
    this.startTokenRefreshTimer()

    // Clear on tab close (additional safety)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Keep refresh token, clear access token
        this.clearAccessTokenFromStorage()
      })
    }
  }

  static getInstance(): SecureAuthStorage {
    if (!SecureAuthStorage.instance) {
      SecureAuthStorage.instance = new SecureAuthStorage()
    }
    return SecureAuthStorage.instance
  }

  /**
   * Generate browser fingerprint for session hijacking detection
   */
  private generateFingerprint(): string {
    if (typeof window === 'undefined') {return ''}

    const data = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|')

    // Simple hash
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }

    return hash.toString(36)
  }

  /**
   * Verify session integrity (detect potential hijacking)
   */
  private verifySessionIntegrity(): boolean {
    if (typeof window === 'undefined') {return true}

    const storedFp = sessionStorage.getItem(this.FINGERPRINT_KEY)
    if (!storedFp) {
      sessionStorage.setItem(this.FINGERPRINT_KEY, this.sessionFingerprint!)
      return true
    }

    if (storedFp !== this.sessionFingerprint) {
      console.error('Session fingerprint mismatch - potential hijacking detected')
      this.notify('session-hijack', {
        stored: storedFp,
        current: this.sessionFingerprint
      })
      this.clearStorage()
      return false
    }

    return true
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
  private notify(event: AuthEvent, data?: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Error in auth event listener:', error)
      }
    })
  }

  /**
   * Load tokens from encrypted sessionStorage into memory
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {return}

    // Verify session integrity first
    if (!this.verifySessionIntegrity()) {
      return
    }

    try {
      const encryptedToken = sessionStorage.getItem(this.TOKEN_KEY)
      const encryptedUser = sessionStorage.getItem(this.USER_KEY)
      const encryptedRefresh = sessionStorage.getItem(this.REFRESH_KEY)

      if (encryptedToken) {
        const tokenStr = this.encryption.decrypt(encryptedToken)
        const tokenData = JSON.parse(tokenStr) as TokenData

        // Check if token is expired
        if (tokenData.expiresAt > Date.now()) {
          this.tokenData = tokenData

          if (encryptedRefresh) {
            const refreshToken = this.encryption.decrypt(encryptedRefresh)
            this.tokenData.refreshToken = refreshToken
          }
        } else {
          console.info('Stored token expired, clearing')
          this.clearStorage()
        }
      }

      if (encryptedUser) {
        const userStr = this.encryption.decrypt(encryptedUser)
        this.userData = JSON.parse(userStr) as UserData
      }
    } catch (error) {
      console.error('Failed to load auth data from storage:', error)
      this.clearStorage()
    }
  }

  /**
   * Auto-refresh tokens before expiry
   */
  private startTokenRefreshTimer(): void {
    if (typeof window === 'undefined') {return}

    setInterval(() => {
      if (this.tokenData && this.isTokenExpiringSoon()) {
        console.info('Token expiring soon, auto-refreshing...')
        this.refreshAccessToken().catch(err => {
          console.error('Auto-refresh failed:', err)
        })
      }
    }, 60000) // Check every minute
  }

  /**
   * Check if token is expiring soon (within 2 minutes)
   */
  private isTokenExpiringSoon(): boolean {
    if (!this.tokenData) {return false}

    const twoMinutes = 2 * 60 * 1000
    return this.tokenData.expiresAt - twoMinutes < Date.now()
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      console.warn('No refresh token available')
      return false
    }

    try {
      const response = await fetch(`${this.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for future httpOnly cookies
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        console.error('Token refresh failed:', response.status)
        this.clearStorage()
        this.notify('token-expired')
        return false
      }

      const data = await response.json()

      // Update tokens with new access token
      this.setTokens(
        data.access_token,
        data.refresh_token || refreshToken,
        data.expires_in || 900 // 15 minutes default
      )

      console.info('Access token refreshed successfully')
      this.notify('token-refreshed', { accessToken: data.access_token })
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      this.notify('token-expired')
      this.clearStorage()
      return false
    }
  }

  /**
   * Ensure a valid access token is available
   * Handles race conditions by ensuring only one refresh happens at a time
   */
  async ensureValidToken(): Promise<string | null> {
    // Verify session integrity
    if (!this.verifySessionIntegrity()) {
      return null
    }

    // If token is still valid, return it
    if (!this.isTokenExpired()) {
      return this.getAccessToken()
    }

    // If already refreshing, wait for that promise
    if (this.refreshPromise) {
      await this.refreshPromise
      return this.getAccessToken()
    }

    // Start a new refresh
    this.refreshPromise = this.refreshAccessToken()

    try {
      const success = await this.refreshPromise
      return success ? this.getAccessToken() : null
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Set authentication tokens (encrypted in storage)
   */
  setTokens(accessToken: string, refreshToken?: string, expiresIn: number = 3600): void {
    const expiresAt = Date.now() + (expiresIn * 1000)
    const isLogin = !this.tokenData

    // Store in memory (primary)
    this.tokenData = {
      accessToken,
      refreshToken,
      expiresAt,
    }

    // Store encrypted in sessionStorage (backup for page reload)
    if (typeof window !== 'undefined') {
      try {
        const tokenStr = JSON.stringify({
          accessToken,
          expiresAt,
        })

        sessionStorage.setItem(
          this.TOKEN_KEY,
          this.encryption.encrypt(tokenStr)
        )

        if (refreshToken) {
          sessionStorage.setItem(
            this.REFRESH_KEY,
            this.encryption.encrypt(refreshToken)
          )
        }

        // Store session fingerprint
        sessionStorage.setItem(this.FINGERPRINT_KEY, this.sessionFingerprint!)
      } catch (error) {
        console.error('Failed to save tokens to storage:', error)
      }
    }

    if (isLogin) {
      this.notify('login', { accessToken })
    }
  }

  /**
   * Get current access token (memory-first)
   */
  getAccessToken(): string | null {
    // Return from memory if available and valid
    const currentToken = this.tokenData
    if (currentToken) {
      if (currentToken.expiresAt > Date.now()) {
        return currentToken.accessToken
      } else {
        this.clearTokens()
        return null
      }
    }

    // Fallback: try to load from storage
    this.loadFromStorage()
    const loadedToken = this.tokenData
    if (loadedToken && loadedToken.expiresAt > Date.now()) {
      return loadedToken.accessToken
    }

    return null
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.tokenData?.refreshToken || null
  }

  /**
   * Check if token is expired (with 5-minute buffer)
   */
  isTokenExpired(): boolean {
    if (!this.tokenData) {return true}

    const bufferTime = 5 * 60 * 1000 // 5 minutes
    return this.tokenData.expiresAt - bufferTime < Date.now()
  }

  /**
   * Set user data (encrypted in storage)
   */
  setUser(user: UserData): void {
    this.userData = user

    if (typeof window !== 'undefined') {
      try {
        const userStr = JSON.stringify(user)
        sessionStorage.setItem(
          this.USER_KEY,
          this.encryption.encrypt(userStr)
        )
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
    if (!this.userData && typeof window !== 'undefined') {
      this.loadFromStorage()
    }
    return this.userData
  }

  /**
   * Clear access token from storage (keep refresh token)
   */
  private clearAccessTokenFromStorage(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_KEY)
    }
  }

  /**
   * Clear tokens from memory and storage
   */
  clearTokens(): void {
    this.tokenData = null

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_KEY)
      sessionStorage.removeItem(this.REFRESH_KEY)
    }
  }

  /**
   * Clear all auth data and notify listeners
   */
  clearStorage(): void {
    this.tokenData = null
    this.userData = null

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_KEY)
      sessionStorage.removeItem(this.USER_KEY)
      sessionStorage.removeItem(this.REFRESH_KEY)
      sessionStorage.removeItem(this.FINGERPRINT_KEY)

      // Also clear old localStorage data if exists
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')

      // Clear old unencrypted sessionStorage keys
      sessionStorage.removeItem('__auth_token')
      sessionStorage.removeItem('__user_data')
      sessionStorage.removeItem('__refresh_token')
    }

    this.notify('logout')
  }

  /**
   * Migrate from old storage implementation
   */
  migrateFromOldStorage(): void {
    if (typeof window === 'undefined') {return}

    try {
      // Check for old unencrypted keys
      const oldToken = sessionStorage.getItem('__auth_token')
      const oldUser = sessionStorage.getItem('__user_data')
      const oldRefresh = sessionStorage.getItem('__refresh_token')

      if (oldToken || oldUser || oldRefresh) {
        console.info('Migrating to encrypted storage...')

        if (oldToken) {
          const tokenData = JSON.parse(oldToken)
          this.setTokens(
            tokenData.accessToken,
            oldRefresh || undefined,
            3600
          )
        }

        if (oldUser) {
          this.setUser(JSON.parse(oldUser))
        }

        // Clear old keys
        sessionStorage.removeItem('__auth_token')
        sessionStorage.removeItem('__user_data')
        sessionStorage.removeItem('__refresh_token')

        console.info('Migration to encrypted storage complete')
      }

      // Also check localStorage
      const lsToken = localStorage.getItem('auth_token')
      const lsUser = localStorage.getItem('user_data')

      if (lsToken || lsUser) {
        console.info('Migrating from localStorage...')

        if (lsToken && lsUser) {
          this.setTokens(lsToken, undefined, 3600)
          this.setUser(JSON.parse(lsUser))
        }

        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')

        console.info('Migration from localStorage complete')
      }
    } catch (error) {
      console.error('Failed to migrate auth data:', error)
    }
  }

  /**
   * Get security info for debugging
   */
  getSecurityInfo() {
    return {
      phase: 'Phase 2 - httpOnly Cookies Active (SEC-1)',
      storageType: 'Memory + Encrypted sessionStorage + httpOnly Cookies',
      encrypted: true,
      httpOnlyCookies: true, // SEC-1: Backend now sets httpOnly cookies
      sessionIntegrity: this.verifySessionIntegrity(),
      hasAccessToken: !!this.tokenData?.accessToken,
      hasRefreshToken: !!this.tokenData?.refreshToken,
      tokenExpiresIn: this.tokenData
        ? Math.max(0, Math.floor((this.tokenData.expiresAt - Date.now()) / 1000))
        : 0,
    }
  }
}

export const authStorage = SecureAuthStorage.getInstance()
export type { TokenData, UserData }
