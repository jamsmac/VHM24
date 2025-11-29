import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { TwoFactorAuth, TwoFactorMethod } from '../entities/two-factor-auth.entity';
import * as crypto from 'crypto';

// Mock speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url:
      'otpauth://totp/VendHub%20(test@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=VendHub%20Manager',
  })),
  totp: {
    verify: jest.fn(),
  },
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}));

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let mockRepository: any;
  let mockConfigService: any;

  // Generate a valid 32-byte key in hex format
  const validEncryptionKey = crypto.randomBytes(32).toString('hex');
  const ENCRYPTION_KEY = Buffer.from(validEncryptionKey, 'hex');

  // Helper function to encrypt a secret using the same format as the service
  function encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // Pre-encrypt a test secret
  const testSecret = 'JBSWY3DPEHPK3PXP';
  let encryptedTestSecret: string;

  beforeEach(async () => {
    // Generate encrypted secret for each test (uses random IV each time)
    encryptedTestSecret = encryptSecret(testSecret);

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(validEncryptionKey),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorAuthService,
        {
          provide: getRepositoryToken(TwoFactorAuth),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TwoFactorAuthService>(TwoFactorAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when ENCRYPTION_KEY is not set', async () => {
      const badConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            TwoFactorAuthService,
            {
              provide: getRepositoryToken(TwoFactorAuth),
              useValue: mockRepository,
            },
            {
              provide: ConfigService,
              useValue: badConfigService,
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY must be set in environment variables for 2FA');
    });

    it('should throw error when ENCRYPTION_KEY is not 32 bytes', async () => {
      const badConfigService = {
        get: jest.fn().mockReturnValue('shortkey'),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            TwoFactorAuthService,
            {
              provide: getRepositoryToken(TwoFactorAuth),
              useValue: mockRepository,
            },
            {
              provide: ConfigService,
              useValue: badConfigService,
            },
          ],
        }).compile(),
      ).rejects.toThrow('ENCRYPTION_KEY must be 32 bytes (64 hex characters) for AES-256');
    });
  });

  describe('generateSecret', () => {
    it('should generate a new 2FA secret for new user', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        id: '2fa-123',
        user_id: 'user-123',
        method: TwoFactorMethod.TOTP,
      });
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateSecret('user-123', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update existing 2FA record for existing user', async () => {
      const existingRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: 'old-secret',
        backup_codes: [],
        backup_codes_used: 5,
        is_verified: true,
      };

      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateSecret('user-123', 'test@example.com');

      expect(result.backupCodes).toHaveLength(10);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_codes_used: 0,
          is_verified: false,
        }),
      );
    });

    it('should generate unique backup codes', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateSecret('user-123', 'test@example.com');

      const uniqueCodes = new Set(result.backupCodes);
      expect(uniqueCodes.size).toBe(result.backupCodes.length);
    });
  });

  describe('verifyAndEnable', () => {
    const speakeasy = require('speakeasy');

    it('should verify token and enable 2FA', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: false,
        is_verified: false,
        enabled_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await service.verifyAndEnable('user-123', '123456');

      expect(result).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: true,
          is_verified: true,
        }),
      );
    });

    it('should return false when token is invalid', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      speakeasy.totp.verify.mockReturnValue(false);

      const result = await service.verifyAndEnable('user-123', 'invalid');

      expect(result).toBe(false);
    });

    it('should throw error when 2FA not configured', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyAndEnable('user-123', '123456')).rejects.toThrow(
        '2FA not configured for this user',
      );
    });

    it('should throw error when no secret stored', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '2fa-123',
        user_id: 'user-123',
        secret: null,
      });

      await expect(service.verifyAndEnable('user-123', '123456')).rejects.toThrow(
        '2FA not configured for this user',
      );
    });
  });

  describe('verify', () => {
    const speakeasy = require('speakeasy');

    it('should verify token successfully', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: true,
        failed_attempts: 0,
        locked_until: null,
        last_used_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await service.verify('user-123', '123456');

      expect(result).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_attempts: 0,
          locked_until: null,
        }),
      );
    });

    it('should throw UnauthorizedException when 2FA not enabled', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.verify('user-123', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      mockRepository.findOne.mockResolvedValue({
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: true,
        locked_until: futureDate,
      });

      await expect(service.verify('user-123', '123456')).rejects.toThrow(
        'Account temporarily locked due to failed 2FA attempts',
      );
    });

    it('should increment failed attempts on invalid token', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: true,
        failed_attempts: 0,
        locked_until: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});
      speakeasy.totp.verify.mockReturnValue(false);

      const result = await service.verify('user-123', 'invalid');

      expect(result).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_attempts: 1,
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: true,
        failed_attempts: 4,
        locked_until: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});
      speakeasy.totp.verify.mockReturnValue(false);

      await service.verify('user-123', 'invalid');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_attempts: 5,
          locked_until: expect.any(Date),
        }),
      );
    });

    it('should allow verification after lock period expires', async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 20);

      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        secret: encryptedTestSecret,
        is_enabled: true,
        failed_attempts: 5,
        locked_until: pastDate,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await service.verify('user-123', '123456');

      expect(result).toBe(true);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify backup code successfully', async () => {
      const backupCode = 'ABCD1234';
      const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');

      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: true,
        backup_codes: [hashedCode],
        backup_codes_used: 0,
        failed_attempts: 3,
        locked_until: new Date(),
        last_used_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});

      const result = await service.verifyBackupCode('user-123', backupCode);

      expect(result).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          backup_codes_used: 1,
          failed_attempts: 0,
          locked_until: null,
        }),
      );
    });

    it('should return false for invalid backup code', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: true,
        backup_codes: ['some-hashed-code'],
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);

      const result = await service.verifyBackupCode('user-123', 'INVALID');

      expect(result).toBe(false);
    });

    it('should throw UnauthorizedException when 2FA not enabled', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyBackupCode('user-123', 'ABCD1234')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should remove used backup code', async () => {
      const backupCode = 'ABCD1234';
      const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');
      const otherHash = crypto.createHash('sha256').update('OTHER').digest('hex');

      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: true,
        backup_codes: [hashedCode, otherHash],
        backup_codes_used: 0,
        failed_attempts: 0,
        locked_until: null,
        last_used_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});

      await service.verifyBackupCode('user-123', backupCode);

      expect(mockRecord.backup_codes).toHaveLength(1);
      expect(mockRecord.backup_codes).not.toContain(hashedCode);
    });
  });

  describe('disable', () => {
    it('should disable 2FA for user', async () => {
      const mockRecord = {
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: true,
      };

      mockRepository.findOne.mockResolvedValue(mockRecord);
      mockRepository.save.mockResolvedValue({});

      await service.disable('user-123');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: false,
        }),
      );
    });

    it('should do nothing when 2FA not configured', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.disable('user-123')).resolves.not.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: true,
      });

      const result = await service.isEnabled('user-123');

      expect(result).toBe(true);
    });

    it('should return false when 2FA is disabled', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: '2fa-123',
        user_id: 'user-123',
        is_enabled: false,
      });

      const result = await service.isEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should return false when no 2FA record exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.isEnabled('user-123');

      expect(result).toBe(false);
    });
  });
});
