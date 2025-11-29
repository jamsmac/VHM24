/**
 * Secure Token Storage Service
 *
 * ⚠️ MIGRATION NOTICE: This file now re-exports from auth-storage-secure.ts
 *
 * All code now uses the enhanced secure storage implementation with:
 * - ✅ Token encryption in storage
 * - ✅ Session hijacking detection
 * - ✅ Auto-refresh before expiry
 * - ✅ Memory-first storage strategy
 *
 * See auth-storage-secure.ts for implementation details.
 * See SECURITY.md for full security architecture documentation.
 *
 * Future: Phase 2 will add httpOnly cookie support (requires backend update)
 */

// Re-export everything from the new secure implementation
export {
  authStorage,
  type TokenData,
  type UserData,
  type AuthEvent,
  type AuthEventListener,
} from './auth-storage-secure'
