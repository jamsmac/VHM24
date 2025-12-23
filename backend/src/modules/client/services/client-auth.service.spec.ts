import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientUser } from '../entities/client-user.entity';
import { ClientLoyaltyAccount } from '../entities/client-loyalty-account.entity';
import { ClientLanguage } from '../dto/client-auth.dto';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  const mockUser = { id: 'user-1', telegram_id: 123456, telegram_username: 'testuser', full_name: 'Test User', language: ClientLanguage.RU, is_verified: true, created_at: new Date() };
  const mockLoyalty = { id: 'loyalty-1', client_user_id: 'user-1', points_balance: 100, lifetime_points: 500 };
  const mockUserRepo = {
    findOne: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockReturnValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
  };
  const mockLoyaltyRepo = {
    findOne: jest.fn().mockResolvedValue(mockLoyalty),
    create: jest.fn().mockReturnValue(mockLoyalty),
    save: jest.fn().mockResolvedValue(mockLoyalty),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'test-bot-token';
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      if (key === 'NODE_ENV') return 'development';
      return null;
    }),
  };
  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
    verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'client_refresh' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAuthService,
        { provide: getRepositoryToken(ClientUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(ClientLoyaltyAccount), useValue: mockLoyaltyRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();
    service = module.get<ClientAuthService>(ClientAuthService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('authenticateTelegram', () => {
    const validInitData = 'user=%7B%22id%22%3A123456%2C%22first_name%22%3A%22Test%22%7D&auth_date=' + Math.floor(Date.now() / 1000) + '&hash=test';

    it('should authenticate existing user', async () => {
      const result = await service.authenticateTelegram({ initData: validInitData });
      expect(result.access_token).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should create new user if not exists', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.authenticateTelegram({ initData: validInitData });
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(result.access_token).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid initData', async () => {
      await expect(service.authenticateTelegram({ initData: '' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      const result = await service.refreshToken('valid-refresh-token');
      expect(result.access_token).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should throw for invalid token type', async () => {
      mockJwtService.verify.mockReturnValueOnce({ sub: 'user-1', type: 'wrong_type' });
      await expect(service.refreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for user not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.refreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for invalid token', async () => {
      mockJwtService.verify.mockImplementationOnce(() => { throw new Error('Invalid'); });
      await expect(service.refreshToken('invalid')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      const result = await service.updateProfile('user-1', { full_name: 'New Name' });
      expect(result.full_name).toBeDefined();
    });

    it('should throw for user not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.updateProfile('x', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const result = await service.getCurrentUser('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should throw for user not found', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getCurrentUser('x')).rejects.toThrow(BadRequestException);
    });
  });
});
