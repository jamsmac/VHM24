import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { TwoFactorAuth, TwoFactorMethod } from '../entities/two-factor-auth.entity';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorAuthService {
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(
    @InjectRepository(TwoFactorAuth)
    private twoFactorRepository: Repository<TwoFactorAuth>,
    private configService: ConfigService,
  ) {
    // Get encryption key from environment or generate one
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables for 2FA');
    }
    // Ensure key is 32 bytes for AES-256
    this.ENCRYPTION_KEY = Buffer.from(key, 'hex');
    if (this.ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters) for AES-256');
    }
  }

  async generateSecret(
    userId: string,
    email: string,
  ): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `VendHub (${email})`,
      issuer: 'VendHub Manager',
    });

    const qrCodeUrl = secret.otpauth_url ? await QRCode.toDataURL(secret.otpauth_url) : '';

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    );

    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    // Store in database
    const existing = await this.twoFactorRepository.findOne({
      where: { user_id: userId },
    });

    if (existing) {
      existing.secret = this.encryptSecret(secret.base32);
      existing.backup_codes = hashedBackupCodes;
      existing.backup_codes_used = 0;
      existing.is_verified = false;
      await this.twoFactorRepository.save(existing);
    } else {
      const twoFactor = this.twoFactorRepository.create({
        user_id: userId,
        method: TwoFactorMethod.TOTP,
        secret: this.encryptSecret(secret.base32),
        backup_codes: hashedBackupCodes,
        is_enabled: false,
        is_verified: false,
      });
      await this.twoFactorRepository.save(twoFactor);
    }

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId },
    });

    if (!twoFactor || !twoFactor.secret) {
      throw new Error('2FA not configured for this user');
    }

    const secret = this.decryptSecret(twoFactor.secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 steps before/after for time drift
    });

    if (verified) {
      twoFactor.is_enabled = true;
      twoFactor.is_verified = true;
      twoFactor.enabled_at = new Date();
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    return false;
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId, is_enabled: true },
    });

    if (!twoFactor || !twoFactor.secret) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    // Check if account is locked
    if (twoFactor.locked_until && new Date() < new Date(twoFactor.locked_until)) {
      throw new UnauthorizedException('Account temporarily locked due to failed 2FA attempts');
    }

    const secret = this.decryptSecret(twoFactor.secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      twoFactor.last_used_at = new Date();
      twoFactor.failed_attempts = 0;
      twoFactor.locked_until = null;
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    // Increment failed attempts
    twoFactor.failed_attempts++;

    // Lock after 5 failed attempts for 15 minutes
    if (twoFactor.failed_attempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      twoFactor.locked_until = lockUntil;
    }

    await this.twoFactorRepository.save(twoFactor);

    return false;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId, is_enabled: true },
    });

    if (!twoFactor) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const codeIndex = twoFactor.backup_codes.indexOf(hashedCode);

    if (codeIndex !== -1) {
      // Remove used code
      twoFactor.backup_codes.splice(codeIndex, 1);
      twoFactor.backup_codes_used++;
      twoFactor.last_used_at = new Date();
      twoFactor.failed_attempts = 0;
      twoFactor.locked_until = null;
      await this.twoFactorRepository.save(twoFactor);
      return true;
    }

    return false;
  }

  async disable(userId: string): Promise<void> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId },
    });

    if (twoFactor) {
      twoFactor.is_enabled = false;
      await this.twoFactorRepository.save(twoFactor);
    }
  }

  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId },
    });

    return twoFactor?.is_enabled || false;
  }

  /**
   * Get detailed 2FA status for a user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    method?: string;
    enabledAt?: Date;
    backupCodesRemaining?: number;
  }> {
    const twoFactor = await this.twoFactorRepository.findOne({
      where: { user_id: userId },
    });

    if (!twoFactor) {
      return { enabled: false };
    }

    return {
      enabled: twoFactor.is_enabled,
      method: twoFactor.method,
      enabledAt: twoFactor.enabled_at || undefined,
      backupCodesRemaining: twoFactor.backup_codes?.length || 0,
    };
  }

  /**
   * Encrypt 2FA secret using AES-256-GCM
   * Format: iv:authTag:encryptedData (all in hex)
   */
  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16); // 128-bit IV for GCM
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Store as: iv:authTag:encryptedData (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt 2FA secret using AES-256-GCM
   * Expects format: iv:authTag:encryptedData (all in hex)
   */
  private decryptSecret(encryptedSecret: string): string {
    const parts = encryptedSecret.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
