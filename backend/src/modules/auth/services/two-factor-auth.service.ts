import { Injectable, BadRequestException, forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { AuditLogService } from '@modules/security/services/audit-log.service';
import { AuditEventType } from '@modules/security/entities/audit-log.entity';

/**
 * Two-Factor Authentication Service
 *
 * REQ-AUTH-42: 2FA Setup for Admins
 * REQ-AUTH-43: 2FA Verification
 *
 * Provides TOTP-based two-factor authentication using:
 * - otplib for TOTP generation and verification
 * - qrcode for QR code generation
 * - AES-256-GCM encryption for storing secrets
 *
 * Features:
 * - Generate TOTP secret and QR code
 * - Enable/disable 2FA for users
 * - Verify TOTP tokens
 * - Encrypted secret storage
 * - Audit logging of all 2FA events
 */
@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly encryptionKey: Buffer;
  private readonly appName: string;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {
    // Load encryption key from environment
    const keyString = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyString || keyString === 'generate_32_byte_key_with_command_above_64_hex_characters') {
      throw new Error(
        'ENCRYPTION_KEY must be set in environment variables for 2FA. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    // Get salt from environment or derive from key (MEDIUM-001 fix)
    // Using unique salt per deployment is more secure than static salt
    const saltString = this.configService.get<string>('ENCRYPTION_SALT');
    let salt: Buffer;

    if (saltString && saltString.length >= 16) {
      // Use provided salt (recommended for production)
      salt = Buffer.from(saltString, 'hex');
    } else {
      // Derive salt from key using SHA-256 (backward compatible)
      // This is more secure than a static 'salt' string
      salt = crypto.createHash('sha256').update(keyString + '_2fa_salt').digest().slice(0, 16);
      this.logger.warn(
        'ENCRYPTION_SALT not set. Using derived salt. ' +
          'For production, set ENCRYPTION_SALT with: ' +
          "node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"",
      );
    }

    this.encryptionKey = crypto.scryptSync(keyString, salt, 32);
    this.appName = this.configService.get<string>('APP_NAME', 'VendHub');

    // Configure otplib
    authenticator.options = {
      window: [1, 1], // Allow 1 step before and after current time (30s window each side)
    };
  }

  /**
   * Generate TOTP secret for user
   *
   * Creates a new TOTP secret but does not save it yet.
   * User must verify the secret by providing a valid token.
   *
   * @param userId - User ID
   * @returns Object with secret, QR code data URL, and manual entry key
   */
  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
  }> {
    const user = await this.usersService.findOne(userId);

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(user.email, this.appName, secret);

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    // Log setup initiation (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.ACCOUNT_UPDATED,
      user_id: userId,
      description: '2FA setup initiated - secret generated',
      metadata: {
        two_fa_action: 'generate_secret',
      },
    });

    return {
      secret,
      qrCode,
      manualEntryKey: secret, // Same as secret, for manual entry
    };
  }

  /**
   * Enable 2FA for user
   *
   * Verifies the token and enables 2FA if valid.
   * Encrypts and stores the secret.
   *
   * @param userId - User ID
   * @param secret - TOTP secret to enable
   * @param token - Verification token from authenticator app
   * @param ip - Request IP address
   * @returns Success status
   */
  async enable2FA(
    userId: string,
    secret: string,
    token: string,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify token is valid
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      // Log failed attempt (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.TWO_FA_FAILED,
        user_id: userId,
        ip_address: ip,
        description: '2FA enable failed: Invalid verification token',
        success: false,
        metadata: {
          two_fa_action: 'enable_failed',
        },
      });

      throw new BadRequestException(
        'Неверный код подтверждения. Проверьте время на устройстве и попробуйте снова',
      );
    }

    // Encrypt secret
    const encryptedSecret = this.encrypt(secret);

    // Update user
    await this.usersService.update(userId, {
      is_2fa_enabled: true,
      two_fa_secret: encryptedSecret,
    });

    // Log successful enablement (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.TWO_FA_ENABLED,
      user_id: userId,
      ip_address: ip,
      description: '2FA successfully enabled',
      metadata: {
        two_fa_action: 'enabled',
      },
    });

    return {
      success: true,
      message: 'Двухфакторная аутентификация успешно включена',
    };
  }

  /**
   * Disable 2FA for user
   *
   * Requires current password or admin privileges.
   *
   * @param userId - User ID
   * @param token - Current TOTP token for verification
   * @param ip - Request IP address
   * @returns Success status
   */
  async disable2FA(
    userId: string,
    token: string,
    ip?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findOne(userId);

    if (!user.is_2fa_enabled) {
      throw new BadRequestException('2FA уже отключена');
    }

    // Verify current token
    const isValid = await this.verifyToken(userId, token);

    if (!isValid) {
      // Log failed attempt (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.TWO_FA_FAILED,
        user_id: userId,
        ip_address: ip,
        description: '2FA disable failed: Invalid verification token',
        success: false,
        metadata: {
          two_fa_action: 'disable_failed',
        },
      });

      throw new BadRequestException('Неверный код подтверждения. 2FA не может быть отключена');
    }

    // Update user
    await this.usersService.update(userId, {
      is_2fa_enabled: false,
      two_fa_secret: null,
    });

    // Log successful disablement (REQ-AUTH-80)
    await this.auditLogService.log({
      event_type: AuditEventType.TWO_FA_DISABLED,
      user_id: userId,
      ip_address: ip,
      description: '2FA successfully disabled',
      metadata: {
        two_fa_action: 'disabled',
      },
    });

    return {
      success: true,
      message: 'Двухфакторная аутентификация отключена',
    };
  }

  /**
   * Verify TOTP token for user
   *
   * @param userId - User ID
   * @param token - TOTP token to verify
   * @param ip - Request IP address (for audit logging)
   * @returns true if valid, false otherwise
   */
  async verifyToken(userId: string, token: string, ip?: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);

    if (!user.is_2fa_enabled || !user.two_fa_secret) {
      return false;
    }

    try {
      // Decrypt secret
      const secret = this.decrypt(user.two_fa_secret);

      // Verify token
      const isValid = authenticator.verify({ token, secret });

      if (isValid) {
        // Log successful verification (REQ-AUTH-80)
        await this.auditLogService.log({
          event_type: AuditEventType.TWO_FA_VERIFIED,
          user_id: userId,
          ip_address: ip,
          description: '2FA token verified successfully',
          metadata: {
            two_fa_action: 'verified',
          },
        });
      } else {
        // Log failed verification (REQ-AUTH-80)
        await this.auditLogService.log({
          event_type: AuditEventType.TWO_FA_FAILED,
          user_id: userId,
          ip_address: ip,
          description: '2FA token verification failed',
          success: false,
          metadata: {
            two_fa_action: 'verification_failed',
          },
        });
      }

      return isValid;
    } catch (error) {
      // Log error (REQ-AUTH-80)
      await this.auditLogService.log({
        event_type: AuditEventType.TWO_FA_FAILED,
        user_id: userId,
        ip_address: ip,
        description: '2FA verification error',
        success: false,
        error_message: error.message,
        metadata: {
          two_fa_action: 'verification_error',
        },
      });

      return false;
    }
  }

  /**
   * Check if user has 2FA enabled
   *
   * @param userId - User ID
   * @returns true if 2FA is enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    return user.is_2fa_enabled;
  }

  /**
   * Encrypt text using AES-256-GCM
   *
   * @param text - Text to encrypt
   * @returns Encrypted text in format: iv:authTag:encryptedData
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + AuthTag + EncryptedData
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt text using AES-256-GCM
   *
   * @param encryptedData - Encrypted text in format: iv:authTag:encryptedData
   * @returns Decrypted text
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
