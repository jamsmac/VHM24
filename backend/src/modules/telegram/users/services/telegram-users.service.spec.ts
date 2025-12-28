import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TelegramUsersService } from './telegram-users.service';
import {
  TelegramUser,
  TelegramUserStatus,
  TelegramLanguage,
} from '../../shared/entities/telegram-user.entity';

describe('TelegramUsersService', () => {
  let service: TelegramUsersService;
  let repository: jest.Mocked<Repository<TelegramUser>>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'telegram-user-uuid',
    user_id: 'user-uuid',
    telegram_id: '123456789',
    chat_id: '123456789',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    language: TelegramLanguage.RU,
    status: TelegramUserStatus.ACTIVE,
    is_verified: true,
    verification_code: null,
    verification_code_expires_at: null,
    verification_attempts: 0,
    last_verification_attempt_at: null,
    blocked_until: null,
    notification_preferences: {},
    last_interaction_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramUsersService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TelegramUsersService>(TelegramUsersService);
    repository = module.get(getRepositoryToken(TelegramUser));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all telegram users', async () => {
      repository.find.mockResolvedValue([mockTelegramUser] as TelegramUser[]);

      const result = await service.findAll();

      expect(result).toEqual([mockTelegramUser]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return telegram user when found', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      const result = await service.findOne('telegram-user-uuid');

      expect(result).toEqual(mockTelegramUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'telegram-user-uuid' },
        relations: ['user'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('should return telegram user when found by user ID', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      const result = await service.findByUserId('user-uuid');

      expect(result).toEqual(mockTelegramUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-uuid' },
        relations: ['user'],
      });
    });

    it('should return null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByTelegramId', () => {
    it('should return telegram user when found by telegram ID', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      const result = await service.findByTelegramId('123456789');

      expect(result).toEqual(mockTelegramUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { telegram_id: '123456789' },
        relations: ['user'],
      });
    });

    it('should return null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByTelegramId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByVerificationCode', () => {
    it('should return user when valid code found', async () => {
      const unverifiedUser = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      };
      repository.findOne.mockResolvedValue(unverifiedUser as TelegramUser);

      const result = await service.findByVerificationCode('ABC123');

      expect(result).toEqual(unverifiedUser);
    });

    it('should return null when code not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByVerificationCode('INVALID');

      expect(result).toBeNull();
    });

    it('should return null and clear code when expired', async () => {
      const expiredUser = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() - 1000), // Expired
      };
      repository.findOne.mockResolvedValue(expiredUser as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.findByVerificationCode('ABC123');

      expect(result).toBeNull();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate code for new user', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        ...mockTelegramUser,
        is_verified: false,
      } as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
      expect(result).toHaveLength(12); // 6 bytes hex = 12 characters
      expect(repository.save).toHaveBeenCalled();
    });

    it('should update existing unverified user with new code', async () => {
      const existingUnverified = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OLD123',
      };
      repository.findOne.mockResolvedValue(existingUnverified as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
      expect(result).toHaveLength(12);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already verified', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      await expect(service.generateVerificationCode('user-uuid')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('linkTelegramAccount', () => {
    it('should link telegram account with valid code', async () => {
      const unverifiedUser = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      };
      repository.findOne
        .mockResolvedValueOnce(unverifiedUser as TelegramUser) // For verification code lookup
        .mockResolvedValueOnce(unverifiedUser as TelegramUser) // For findByVerificationCode
        .mockResolvedValueOnce(null); // For findByTelegramId
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.linkTelegramAccount(
        '987654321',
        '987654321',
        'newuser',
        'New',
        'User',
        { verification_code: 'ABC123' },
      );

      expect(result.is_verified).toBe(true);
      expect(result.telegram_id).toBe('987654321');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid code', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'INVALID',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is blocked', async () => {
      const blockedUser = {
        ...mockTelegramUser,
        is_verified: false,
        blocked_until: new Date(Date.now() + 30 * 60 * 1000), // Blocked for 30 more minutes
      };
      repository.findOne.mockResolvedValue(blockedUser as TelegramUser);

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'ABC123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update telegram user language', async () => {
      repository.findOne.mockResolvedValue({ ...mockTelegramUser } as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.update('telegram-user-uuid', {
        language: TelegramLanguage.EN,
      });

      expect(result.language).toBe(TelegramLanguage.EN);
    });

    it('should update telegram user status', async () => {
      repository.findOne.mockResolvedValue({ ...mockTelegramUser } as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.update('telegram-user-uuid', {
        status: TelegramUserStatus.BLOCKED,
      });

      expect(result.status).toBe(TelegramUserStatus.BLOCKED);
    });

    it('should merge notification preferences', async () => {
      const userWithPrefs = {
        ...mockTelegramUser,
        notification_preferences: { task_assigned: true },
      };
      repository.findOne.mockResolvedValue(userWithPrefs as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.update('telegram-user-uuid', {
        notification_preferences: { task_completed: true },
      });

      expect(result.notification_preferences).toEqual({
        task_assigned: true,
        task_completed: true,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { language: TelegramLanguage.EN }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastInteraction', () => {
    it('should update last interaction timestamp', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateLastInteraction('123456789');

      expect(repository.update).toHaveBeenCalledWith(
        { telegram_id: '123456789' },
        { last_interaction_at: expect.any(Date) },
      );
    });
  });

  describe('delete', () => {
    it('should soft delete telegram user', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      repository.softRemove.mockResolvedValue(mockTelegramUser as TelegramUser);

      await service.delete('telegram-user-uuid');

      expect(repository.softRemove).toHaveBeenCalledWith(mockTelegramUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlinkAccount', () => {
    it('should unlink telegram account for user', async () => {
      repository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      repository.softRemove.mockResolvedValue(mockTelegramUser as TelegramUser);

      await service.unlinkAccount('user-uuid');

      expect(repository.softRemove).toHaveBeenCalledWith(mockTelegramUser);
    });

    it('should throw NotFoundException when no linked account', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.unlinkAccount('user-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return telegram user statistics', async () => {
      repository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(75) // verified
        .mockResolvedValueOnce(25); // unverified

      const result = await service.getStatistics();

      expect(result).toEqual({
        total: 100,
        active: 80,
        verified: 75,
        unverified: 25,
      });
    });
  });

  describe('findByVerificationCode edge cases', () => {
    it('should return user when verification_code_expires_at is null', async () => {
      const userWithNullExpiry = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: null, // No expiry set
      };
      repository.findOne.mockResolvedValue(userWithNullExpiry as TelegramUser);

      const result = await service.findByVerificationCode('ABC123');

      expect(result).toEqual(userWithNullExpiry);
    });
  });

  describe('generateVerificationCode edge cases', () => {
    it('should throw BadRequestException when exceeded max code generation attempts', async () => {
      const existingWithManyAttempts = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        verification_attempts: 3, // Max is 3
        last_verification_attempt_at: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago (within hour)
      };
      repository.findOne.mockResolvedValue(existingWithManyAttempts as TelegramUser);

      await expect(service.generateVerificationCode('user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow code generation when last attempt was over an hour ago', async () => {
      const existingWithOldAttempts = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        verification_attempts: 5,
        last_verification_attempt_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      repository.findOne.mockResolvedValue(existingWithOldAttempts as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
      expect(result).toHaveLength(12);
    });

    it('should allow code generation when verification_code_expires_at is null', async () => {
      const existingWithNoExpiry = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code_expires_at: null,
        verification_attempts: 0,
      };
      repository.findOne.mockResolvedValue(existingWithNoExpiry as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
    });

    it('should allow code generation when max attempts but last_verification_attempt_at is null', async () => {
      // This tests the branch where verification_attempts >= max but lastAttemptTime is null
      const existingWithMaxAttemptsNoTime = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        verification_attempts: 5, // At max
        last_verification_attempt_at: null, // But no timestamp
      };
      repository.findOne.mockResolvedValue(existingWithMaxAttemptsNoTime as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
      expect(result).toHaveLength(12);
    });

    it('should allow code generation when verification_code_expires_at set but attempts under max', async () => {
      // This tests the false branch of line 106: verification_attempts < CODE_GENERATION_MAX_PER_HOUR
      const existingWithExpiryButLowAttempts = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code_expires_at: new Date(Date.now() + 10 * 60 * 1000),
        verification_attempts: 2, // Under max (3)
        last_verification_attempt_at: new Date(), // Recent
      };
      repository.findOne.mockResolvedValue(existingWithExpiryButLowAttempts as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.generateVerificationCode('user-uuid');

      expect(result).toBeDefined();
      expect(result).toHaveLength(12);
    });
  });

  describe('linkTelegramAccount edge cases', () => {
    it('should clear block when it has expired', async () => {
      const userWithExpiredBlock = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
        blocked_until: new Date(Date.now() - 1000), // Block expired
      };
      repository.findOne
        .mockResolvedValueOnce(userWithExpiredBlock as TelegramUser)
        .mockResolvedValueOnce(userWithExpiredBlock as TelegramUser)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.linkTelegramAccount(
        '987654321',
        '987654321',
        'user',
        'First',
        'Last',
        { verification_code: 'ABC123' },
      );

      expect(result.is_verified).toBe(true);
    });

    it('should throw ConflictException when telegram account already linked to another user', async () => {
      const unverifiedUser = {
        ...mockTelegramUser,
        id: 'user-1',
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      };
      const existingLinkedUser = {
        ...mockTelegramUser,
        id: 'user-2', // Different user
        telegram_id: '987654321',
      };
      repository.findOne
        .mockResolvedValueOnce(unverifiedUser as TelegramUser)
        .mockResolvedValueOnce(unverifiedUser as TelegramUser)
        .mockResolvedValueOnce(existingLinkedUser as TelegramUser); // findByTelegramId returns another user

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'ABC123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle undefined username, firstName, lastName', async () => {
      const unverifiedUser = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'ABC123',
        verification_code_expires_at: new Date(Date.now() + 15 * 60 * 1000),
      };
      repository.findOne
        .mockResolvedValueOnce(unverifiedUser as TelegramUser)
        .mockResolvedValueOnce(unverifiedUser as TelegramUser)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.linkTelegramAccount(
        '987654321',
        '987654321',
        undefined, // username
        undefined, // firstName
        undefined, // lastName
        { verification_code: 'ABC123' },
      );

      expect(result.username).toBeNull();
      expect(result.first_name).toBeNull();
      expect(result.last_name).toBeNull();
    });

    it('should track failed attempt when code is invalid', async () => {
      const unverifiedUser = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OTHER123',
        verification_attempts: 0,
      };
      repository.findOne
        .mockResolvedValueOnce(unverifiedUser as TelegramUser) // First findOne for code lookup
        .mockResolvedValueOnce(null); // findByVerificationCode returns null (invalid code)
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'WRONG',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(repository.save).toHaveBeenCalled(); // Failed attempt tracked
    });

    it('should reset verification attempts when rate limit window expired', async () => {
      const userWithOldAttempt = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OTHER123',
        verification_attempts: 3,
        last_verification_attempt_at: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago (beyond 15 min window)
      };
      repository.findOne
        .mockResolvedValueOnce(userWithOldAttempt as TelegramUser) // First findOne for code lookup
        .mockResolvedValueOnce(null); // findByVerificationCode returns null (invalid code)
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'WRONG',
        }),
      ).rejects.toThrow(NotFoundException);

      // Verify that attempts were reset (save was called with reset attempts)
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_attempts: 1, // Reset to 0, then incremented to 1
        }),
      );
    });

    it('should block user when max verification attempts exceeded', async () => {
      const userNearMaxAttempts = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OTHER123',
        verification_attempts: 4, // One more attempt will hit max (5)
        last_verification_attempt_at: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago (within window)
      };
      repository.findOne
        .mockResolvedValueOnce(userNearMaxAttempts as TelegramUser) // First findOne for code lookup
        .mockResolvedValueOnce(null); // findByVerificationCode returns null (invalid code)
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'WRONG',
        }),
      ).rejects.toThrow(NotFoundException);

      // Verify that user was blocked (save was called with blocked_until set)
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_attempts: 5,
          blocked_until: expect.any(Date),
        }),
      );
    });

    it('should increment attempts without blocking when under max attempts', async () => {
      const userWithSomeAttempts = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OTHER123',
        verification_attempts: 2,
        last_verification_attempt_at: new Date(Date.now() - 5 * 60 * 1000), // Within window
      };
      repository.findOne
        .mockResolvedValueOnce(userWithSomeAttempts as TelegramUser)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'WRONG',
        }),
      ).rejects.toThrow(NotFoundException);

      // Attempts should be incremented but not blocked
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_attempts: 3,
        }),
      );
      // Verify blocked_until was not set (remains null/undefined)
      const savedEntity = repository.save.mock.calls[0][0];
      expect(savedEntity.blocked_until).toBeFalsy();
    });

    it('should track attempt when last_verification_attempt_at is null', async () => {
      const userWithNoAttemptHistory = {
        ...mockTelegramUser,
        is_verified: false,
        verification_code: 'OTHER123',
        verification_attempts: 0,
        last_verification_attempt_at: null,
      };
      repository.findOne
        .mockResolvedValueOnce(userWithNoAttemptHistory as TelegramUser)
        .mockResolvedValueOnce(null);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      await expect(
        service.linkTelegramAccount('987654321', '987654321', 'user', 'First', 'Last', {
          verification_code: 'WRONG',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_attempts: 1,
          last_verification_attempt_at: expect.any(Date),
        }),
      );
    });
  });

  describe('update edge cases', () => {
    it('should handle update with no fields specified', async () => {
      repository.findOne.mockResolvedValue({ ...mockTelegramUser } as TelegramUser);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as TelegramUser));

      const result = await service.update('telegram-user-uuid', {});

      expect(result.language).toBe(mockTelegramUser.language);
      expect(result.status).toBe(mockTelegramUser.status);
    });
  });

  // Tests for private methods (dead code but covered for completeness)
  // Note: isCodeExpired and checkAndIncrementAttempts are defined but never called
  // The rate limiting logic is implemented inline in generateVerificationCode and trackFailedVerificationAttempt
  describe('isCodeExpired (private method - dead code)', () => {
    it('should return true when codeGeneratedAt is null', () => {
      const result = (service as any).isCodeExpired(null);
      expect(result).toBe(true);
    });

    it('should return true when code has expired', () => {
      // Code generated 20 minutes ago (expired - limit is 15 minutes)
      const codeGeneratedAt = new Date(Date.now() - 20 * 60 * 1000);
      const result = (service as any).isCodeExpired(codeGeneratedAt);
      expect(result).toBe(true);
    });

    it('should return false when code is still valid', () => {
      // Code generated 5 minutes ago (still valid - limit is 15 minutes)
      const codeGeneratedAt = new Date(Date.now() - 5 * 60 * 1000);
      const result = (service as any).isCodeExpired(codeGeneratedAt);
      expect(result).toBe(false);
    });
  });

  describe('checkAndIncrementAttempts (private method - dead code)', () => {
    it('should reset attempts when last_verification_attempt_at is null', () => {
      const telegramUser = {
        ...mockTelegramUser,
        verification_attempts: 3,
        last_verification_attempt_at: null,
      } as TelegramUser;

      (service as any).checkAndIncrementAttempts(telegramUser);

      expect(telegramUser.verification_attempts).toBe(1); // Reset to 0, then incremented to 1
      expect(telegramUser.last_verification_attempt_at).toBeInstanceOf(Date);
    });

    it('should reset attempts when window has passed', () => {
      const telegramUser = {
        ...mockTelegramUser,
        verification_attempts: 3,
        last_verification_attempt_at: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago (beyond 15 min window)
      } as TelegramUser;

      (service as any).checkAndIncrementAttempts(telegramUser);

      expect(telegramUser.verification_attempts).toBe(1); // Reset to 0, then incremented to 1
    });

    it('should throw BadRequestException when max attempts exceeded', () => {
      const telegramUser = {
        ...mockTelegramUser,
        verification_attempts: 5, // At max (VERIFICATION_ATTEMPT_MAX is 5)
        last_verification_attempt_at: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago (within window)
      } as TelegramUser;

      expect(() => (service as any).checkAndIncrementAttempts(telegramUser)).toThrow(
        BadRequestException,
      );
    });

    it('should increment attempts when under max and within window', () => {
      const telegramUser = {
        ...mockTelegramUser,
        verification_attempts: 2,
        last_verification_attempt_at: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago (within window)
      } as TelegramUser;

      (service as any).checkAndIncrementAttempts(telegramUser);

      expect(telegramUser.verification_attempts).toBe(3);
      expect(telegramUser.last_verification_attempt_at).toBeInstanceOf(Date);
    });
  });
});
