import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { UsersService } from '@modules/users/users.service';
import { AuditLogService } from '@modules/security/services/audit-log.service';
import { AuditEventType } from '@modules/security/entities/audit-log.entity';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
    options: {},
  },
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

// Set required environment variable before tests
process.env.ENCRYPTION_KEY = '0'.repeat(64);

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockAuditLogService: jest.Mocked<AuditLogService>;
  let _mockConfigService: ConfigService;

  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockSecret = 'JBSWY3DPEHPK3PXP';
  const mockToken = '123456';
  const mockQrCode = 'data:image/png;base64,mockedQrCodeData';
  const mockIp = '192.168.1.100';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    is_2fa_enabled: false,
    two_fa_secret: null,
  };

  const mockUserWith2FA = {
    ...mockUser,
    is_2fa_enabled: true,
    two_fa_secret: 'encrypted:secret:data', // Will be decrypted by service
  };

  beforeEach(async () => {
    mockUsersService = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<Pick<UsersService, 'findOne' | 'update'>> as jest.Mocked<UsersService>;

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
    } as jest.Mocked<Pick<AuditLogService, 'log'>> as jest.Mocked<AuditLogService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorAuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                ENCRYPTION_KEY: '0'.repeat(64),
                APP_NAME: 'VendHub',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TwoFactorAuthService>(TwoFactorAuthService);
    _mockConfigService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    (authenticator.generateSecret as jest.Mock).mockReturnValue(mockSecret);
    (authenticator.keyuri as jest.Mock).mockReturnValue(
      `otpauth://totp/VendHub:${mockEmail}?secret=${mockSecret}`,
    );
    (authenticator.verify as jest.Mock).mockReturnValue(true);
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate TOTP secret for user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);

      const result = await service.generateSecret(mockUserId);

      expect(result).toEqual({
        secret: mockSecret,
        qrCode: mockQrCode,
        manualEntryKey: mockSecret,
      });
    });

    it('should call authenticator.generateSecret', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);

      await service.generateSecret(mockUserId);

      expect(authenticator.generateSecret).toHaveBeenCalled();
    });

    it('should generate QR code with otpauth URL', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);

      await service.generateSecret(mockUserId);

      expect(authenticator.keyuri).toHaveBeenCalledWith(mockEmail, 'VendHub', mockSecret);
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });

    it('should log 2FA setup initiation to audit log', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);

      await service.generateSecret(mockUserId);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.ACCOUNT_UPDATED,
        user_id: mockUserId,
        description: '2FA setup initiated - secret generated',
        metadata: {
          two_fa_action: 'generate_secret',
        },
      });
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA when token is valid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.enable2FA(mockUserId, mockSecret, mockToken, mockIp);

      expect(result).toEqual({
        success: true,
        message: 'Двухфакторная аутентификация успешно включена',
      });
    });

    it('should update user with encrypted secret and 2FA flag', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.enable2FA(mockUserId, mockSecret, mockToken, mockIp);

      expect(mockUsersService.update).toHaveBeenCalledWith(mockUserId, {
        is_2fa_enabled: true,
        two_fa_secret: expect.any(String), // Encrypted secret
      });

      // Verify the secret is encrypted (contains : separators for iv:authTag:data)
      const updateCall = mockUsersService.update.mock.calls[0][1];
      expect(updateCall.two_fa_secret?.split(':').length).toBe(3);
    });

    it('should throw BadRequestException when token is invalid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(
        service.enable2FA(mockUserId, mockSecret, 'invalid-token', mockIp),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log failed attempt when token is invalid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      try {
        await service.enable2FA(mockUserId, mockSecret, 'invalid-token', mockIp);
      } catch (e) {
        // Expected to throw
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TWO_FA_FAILED,
        user_id: mockUserId,
        ip_address: mockIp,
        description: '2FA enable failed: Invalid verification token',
        success: false,
        metadata: {
          two_fa_action: 'enable_failed',
        },
      });
    });

    it('should log successful enablement to audit log', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.enable2FA(mockUserId, mockSecret, mockToken, mockIp);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TWO_FA_ENABLED,
        user_id: mockUserId,
        ip_address: mockIp,
        description: '2FA successfully enabled',
        metadata: {
          two_fa_action: 'enabled',
        },
      });
    });

    it('should verify token using authenticator', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.enable2FA(mockUserId, mockSecret, mockToken, mockIp);

      expect(authenticator.verify).toHaveBeenCalledWith({
        token: mockToken,
        secret: mockSecret,
      });
    });
  });

  describe('disable2FA', () => {
    beforeEach(() => {
      // Mock the service's verifyToken method by making the user lookup and decrypt work
      const encryptedSecret = (service as any).encrypt(mockSecret);
      mockUsersService.findOne.mockResolvedValue({
        ...mockUserWith2FA,
        two_fa_secret: encryptedSecret,
      } as any);
    });

    it('should disable 2FA when token is valid', async () => {
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.disable2FA(mockUserId, mockToken, mockIp);

      expect(result).toEqual({
        success: true,
        message: 'Двухфакторная аутентификация отключена',
      });
    });

    it('should update user to disable 2FA and clear secret', async () => {
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.disable2FA(mockUserId, mockToken, mockIp);

      expect(mockUsersService.update).toHaveBeenCalledWith(mockUserId, {
        is_2fa_enabled: false,
        two_fa_secret: null,
      });
    });

    it('should throw BadRequestException when 2FA is not enabled', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        is_2fa_enabled: false,
      } as any);

      await expect(service.disable2FA(mockUserId, mockToken, mockIp)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.disable2FA(mockUserId, mockToken, mockIp)).rejects.toThrow(
        '2FA уже отключена',
      );
    });

    it('should throw BadRequestException when token is invalid', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.disable2FA(mockUserId, 'invalid-token', mockIp)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log failed attempt when token is invalid', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      try {
        await service.disable2FA(mockUserId, 'invalid-token', mockIp);
      } catch (e) {
        // Expected to throw
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.TWO_FA_FAILED,
          description: '2FA disable failed: Invalid verification token',
          success: false,
        }),
      );
    });

    it('should log successful disablement to audit log', async () => {
      mockUsersService.update.mockResolvedValue({} as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.disable2FA(mockUserId, mockToken, mockIp);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TWO_FA_DISABLED,
        user_id: mockUserId,
        ip_address: mockIp,
        description: '2FA successfully disabled',
        metadata: {
          two_fa_action: 'disabled',
        },
      });
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      const encryptedSecret = (service as any).encrypt(mockSecret);
      mockUsersService.findOne.mockResolvedValue({
        ...mockUserWith2FA,
        two_fa_secret: encryptedSecret,
      } as any);
    });

    it('should return true when token is valid', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(result).toBe(true);
    });

    it('should return false when token is invalid', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      const result = await service.verifyToken(mockUserId, 'invalid-token', mockIp);

      expect(result).toBe(false);
    });

    it('should return false when 2FA is not enabled', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        is_2fa_enabled: false,
      } as any);

      const result = await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(result).toBe(false);
    });

    it('should return false when user has no 2FA secret', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        is_2fa_enabled: true,
        two_fa_secret: null,
      } as any);

      const result = await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(result).toBe(false);
    });

    it('should log successful verification to audit log', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TWO_FA_VERIFIED,
        user_id: mockUserId,
        ip_address: mockIp,
        description: '2FA token verified successfully',
        metadata: {
          two_fa_action: 'verified',
        },
      });
    });

    it('should log failed verification to audit log', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await service.verifyToken(mockUserId, 'invalid-token', mockIp);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        event_type: AuditEventType.TWO_FA_FAILED,
        user_id: mockUserId,
        ip_address: mockIp,
        description: '2FA token verification failed',
        success: false,
        metadata: {
          two_fa_action: 'verification_failed',
        },
      });
    });

    it('should return false and log error when decryption fails', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUserWith2FA,
        two_fa_secret: 'invalid:encrypted:data',
      } as any);

      const result = await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(result).toBe(false);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.TWO_FA_FAILED,
          description: '2FA verification error',
          success: false,
        }),
      );
    });

    it('should decrypt secret before verification', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      await service.verifyToken(mockUserId, mockToken, mockIp);

      expect(authenticator.verify).toHaveBeenCalledWith({
        token: mockToken,
        secret: mockSecret, // Decrypted secret
      });
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled for user', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        is_2fa_enabled: true,
      } as any);

      const result = await service.is2FAEnabled(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is not enabled for user', async () => {
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        is_2fa_enabled: false,
      } as any);

      const result = await service.is2FAEnabled(mockUserId);

      expect(result).toBe(false);
    });

    it('should call usersService.findOne with correct userId', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser as any);

      await service.is2FAEnabled(mockUserId);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt secret correctly', () => {
      const originalSecret = 'test-secret-12345';

      const encrypted = (service as any).encrypt(originalSecret);
      const decrypted = (service as any).decrypt(encrypted);

      expect(decrypted).toBe(originalSecret);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const originalSecret = 'test-secret-12345';

      const encrypted1 = (service as any).encrypt(originalSecret);
      const encrypted2 = (service as any).encrypt(originalSecret);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same value
      expect((service as any).decrypt(encrypted1)).toBe(originalSecret);
      expect((service as any).decrypt(encrypted2)).toBe(originalSecret);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => (service as any).decrypt('invalid-data')).toThrow(
        'Invalid encrypted data format',
      );
    });
  });

  describe('constructor configuration', () => {
    it('should throw error when ENCRYPTION_KEY is missing', async () => {
      expect.assertions(1);

      try {
        await Test.createTestingModule({
          providers: [
            TwoFactorAuthService,
            {
              provide: UsersService,
              useValue: mockUsersService,
            },
            {
              provide: AuditLogService,
              useValue: mockAuditLogService,
            },
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: string) => {
                  if (key === 'ENCRYPTION_KEY') {
                    return undefined;
                  }
                  return defaultValue;
                }),
              },
            },
          ],
        }).compile();
      } catch (error) {
        expect((error as Error).message).toContain('ENCRYPTION_KEY must be set');
      }
    });

    it('should throw error when ENCRYPTION_KEY is placeholder value', async () => {
      expect.assertions(1);

      try {
        await Test.createTestingModule({
          providers: [
            TwoFactorAuthService,
            {
              provide: UsersService,
              useValue: mockUsersService,
            },
            {
              provide: AuditLogService,
              useValue: mockAuditLogService,
            },
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string, defaultValue?: string) => {
                  if (key === 'ENCRYPTION_KEY') {
                    return 'generate_32_byte_key_with_command_above_64_hex_characters';
                  }
                  return defaultValue;
                }),
              },
            },
          ],
        }).compile();
      } catch (error) {
        expect((error as Error).message).toContain('ENCRYPTION_KEY must be set');
      }
    });
  });
});
