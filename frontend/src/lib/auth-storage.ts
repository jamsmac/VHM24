/**
 * Secure Token Storage Service - Phase 2
 *
 * SEC-1: httpOnly Cookie Authentication
 *
 * This file re-exports the secure storage implementation.
 * See auth-storage-secure.ts for implementation details.
 *
 * Phase 2 Features:
 * - ✅ Tokens stored in httpOnly cookies (XSS immune)
 * - ✅ User data stored in sessionStorage (for UI only)
 * - ✅ Automatic cookie management by browser
 * - ✅ CSRF protection via SameSite=Strict
 *
 * @see backend/src/modules/auth/utils/cookie.utils.ts for cookie settings
 */

// Re-export everything from the secure implementation
export {
  authStorage,
  type TokenData,
  type UserData,
  type AuthEvent,
  type AuthEventListener,
} from './auth-storage-secure'
