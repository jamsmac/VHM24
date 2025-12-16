/**
 * Two-Factor Authentication API
 *
 * Handles 2FA setup, verification, and management
 */

import apiClient from './axios'

// Types
export interface TwoFactorSetupResponse {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

export interface TwoFactorStatus {
  enabled: boolean
  method?: 'TOTP' | 'SMS' | 'EMAIL'
  enabledAt?: string
  backupCodesRemaining?: number
}

export interface Enable2FADto {
  user_id: string
  email: string
}

export interface Verify2FADto {
  user_id: string
  token: string
}

export interface VerifyBackupCodeDto {
  user_id: string
  code: string
}

export interface VerifyResponse {
  verified: boolean
}

export const twoFactorApi = {
  /**
   * Setup 2FA - generates secret, QR code, and backup codes
   */
  setup: async (userId: string, email: string): Promise<TwoFactorSetupResponse> => {
    const response = await apiClient.post<TwoFactorSetupResponse>('/two-factor-auth/setup', {
      user_id: userId,
      email,
    })
    return response.data
  },

  /**
   * Enable 2FA - verifies token and enables 2FA for user
   */
  enable: async (userId: string, token: string): Promise<VerifyResponse> => {
    const response = await apiClient.post<VerifyResponse>('/two-factor-auth/enable', {
      user_id: userId,
      token,
    })
    return response.data
  },

  /**
   * Verify 2FA token - used during login
   */
  verify: async (userId: string, token: string): Promise<VerifyResponse> => {
    const response = await apiClient.post<VerifyResponse>('/two-factor-auth/verify', {
      user_id: userId,
      token,
    })
    return response.data
  },

  /**
   * Verify backup code - used when TOTP is unavailable
   */
  verifyBackupCode: async (userId: string, code: string): Promise<VerifyResponse> => {
    const response = await apiClient.post<VerifyResponse>('/two-factor-auth/verify-backup-code', {
      user_id: userId,
      code,
    })
    return response.data
  },

  /**
   * Disable 2FA for a user
   */
  disable: async (userId: string): Promise<{ disabled: boolean }> => {
    const response = await apiClient.delete<{ disabled: boolean }>(`/two-factor-auth/${userId}`)
    return response.data
  },

  /**
   * Get 2FA status for current user
   */
  getStatus: async (_userId: string): Promise<TwoFactorStatus> => {
    try {
      // Use the /me endpoint which gets status for current user
      const response = await apiClient.get<TwoFactorStatus>('/two-factor-auth/status/me')
      return response.data
    } catch {
      // If endpoint doesn't exist or error, return default status
      return { enabled: false }
    }
  },

  /**
   * Regenerate backup codes
   * Note: This endpoint may need to be added to the backend
   */
  regenerateBackupCodes: async (userId: string, email: string): Promise<TwoFactorSetupResponse> => {
    // Regenerating backup codes requires re-setup
    return twoFactorApi.setup(userId, email)
  },
}

export default twoFactorApi
