import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { UserStatus, UserRole } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    status: UserStatus.ACTIVE,
    full_name: 'Test User',
    role: UserRole.OPERATOR,
  };

  beforeEach(async () => {
    const mockUsersService = {
      findOne: jest.fn(),
    };

    const mockTokenBlacklistService = {
      shouldRejectToken: jest.fn(),
      areUserTokensBlacklisted: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
    tokenBlacklistService = module.get(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-uuid',
      email: 'test@example.com',
      role: 'operator',
      jti: 'token-id',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    it('should return user when token is valid and user is active', async () => {
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual(mockUser);
      expect(tokenBlacklistService.shouldRejectToken).toHaveBeenCalledWith(
        validPayload.jti,
        validPayload.sub,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(validPayload.sub);
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(true);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'Токен недействителен (отозван)',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue(null as any);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow('Пользователь не найден');
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue(inactiveUser as any);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow(
        'Аккаунт пользователя неактивен',
      );
    });

    /**
     * SEC-JWT-01: JTI is mandatory for token revocation
     */
    it('should throw UnauthorizedException when jti is missing', async () => {
      const payloadWithoutJti = {
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'operator',
      } as JwtPayload;

      await expect(strategy.validate(payloadWithoutJti)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payloadWithoutJti)).rejects.toThrow(
        'Недействительный токен: отсутствует идентификатор токена',
      );
      expect(tokenBlacklistService.shouldRejectToken).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when jti is empty string', async () => {
      const payloadWithEmptyJti: JwtPayload = {
        sub: 'user-uuid',
        email: 'test@example.com',
        role: 'operator',
        jti: '',
      };

      await expect(strategy.validate(payloadWithEmptyJti)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payloadWithEmptyJti)).rejects.toThrow(
        'Недействительный токен: отсутствует идентификатор токена',
      );
    });

    it('should handle user with pending status as inactive', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue(pendingUser as any);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle user with suspended status as inactive', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      tokenBlacklistService.shouldRejectToken.mockResolvedValue(false);
      usersService.findOne.mockResolvedValue(suspendedUser as any);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
