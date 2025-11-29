import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStrategy, { provide: AuthService, useValue: mockAuthService }],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      const req = { body: { email: 'test@example.com', password: 'password123' } };
      authService.validateUser.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(req, 'test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const req = { body: { email: 'test@example.com', password: 'password123' } };
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate(req, 'test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(req, 'test@example.com', 'password123')).rejects.toThrow(
        'Неверные учетные данные',
      );
    });

    it('should use email from request body when available', async () => {
      const req = { body: { email: 'body@example.com', password: 'password123' } };
      authService.validateUser.mockResolvedValue(mockUser as any);

      await strategy.validate(req, 'param@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('body@example.com', 'password123');
    });

    it('should use username from request body when email not provided', async () => {
      const req = { body: { username: 'testuser', password: 'password123' } };
      authService.validateUser.mockResolvedValue(mockUser as any);

      await strategy.validate(req, '', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('testuser', 'password123');
    });

    it('should fallback to email parameter when body fields are empty', async () => {
      const req = { body: { password: 'password123' } };
      authService.validateUser.mockResolvedValue(mockUser as any);

      await strategy.validate(req, 'param@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('param@example.com', 'password123');
    });

    it('should handle empty request body gracefully', async () => {
      const req = { body: {} };
      authService.validateUser.mockResolvedValue(mockUser as any);

      await strategy.validate(req, 'test@example.com', 'password123');

      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
