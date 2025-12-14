import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { IpWhitelistGuard } from './ip-whitelist.guard';
import { UsersService } from '@modules/users/users.service';
import { UserRole, UserStatus } from '@modules/users/entities/user.entity';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';

describe('IpWhitelistGuard', () => {
  let guard: IpWhitelistGuard;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpWhitelistGuard,
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<IpWhitelistGuard>(IpWhitelistGuard);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    userId?: string,
    ip?: string,
    headers?: Record<string, string>,
  ): ExecutionContext => {
    const request = {
      user: userId ? { id: userId } : undefined,
      ip: ip || '127.0.0.1',
      headers: headers || {},
      socket: {
        remoteAddress: ip || '127.0.0.1',
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  const createMockUserResponse = (overrides?: Partial<UserResponseDto>): UserResponseDto => {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      ip_whitelist_enabled: false,
      allowed_ips: null,
      requires_password_change: false,
      phone: null,
      telegram_user_id: null,
      telegram_username: null,
      is_2fa_enabled: false,
      last_login_at: null,
      last_login_ip: null,
      failed_login_attempts: 0,
      account_locked_until: null,
      last_failed_login_at: null,
      settings: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    } as UserResponseDto;
  };

  describe('canActivate', () => {
    it('should allow access if user is not authenticated', async () => {
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should allow access if IP Whitelist is disabled', async () => {
      const context = createMockExecutionContext('user-id');
      const user = createMockUserResponse({ ip_whitelist_enabled: false });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(usersService.findOne).toHaveBeenCalledWith('user-id');
    });

    it('should throw ForbiddenException if IP Whitelist enabled but allowed_ips is empty', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: [],
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'IP Whitelist включен, но список разрешенных IP пуст',
      );
    });

    it('should throw ForbiddenException if IP Whitelist enabled but allowed_ips is null', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: null,
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access for exact IP match', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100', '10.0.0.1'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access if IP not in whitelist', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.50');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100', '10.0.0.1'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Доступ запрещен. Ваш IP адрес (192.168.1.50) не находится в списке разрешенных.',
      );
    });

    it('should allow access for CIDR notation match', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.150');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.0/24'], // Allows 192.168.1.0 - 192.168.1.255
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for IP outside CIDR range', async () => {
      const context = createMockExecutionContext('user-id', '192.168.2.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.0/24'], // Allows 192.168.1.0 - 192.168.1.255
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access for wildcard match', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.200');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.*'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for wildcard mismatch', async () => {
      const context = createMockExecutionContext('user-id', '192.168.2.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.*'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const context = createMockExecutionContext('user-id', '127.0.0.1', {
        'x-forwarded-for': '203.0.113.50, 198.51.100.1',
      });
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['203.0.113.50'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract IP from x-real-ip header', async () => {
      const context = createMockExecutionContext('user-id', '127.0.0.1', {
        'x-real-ip': '203.0.113.75',
      });
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['203.0.113.75'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow multiple IP formats in allowed list', async () => {
      const context = createMockExecutionContext('user-id', '10.0.5.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: [
          '192.168.1.100', // Exact
          '10.0.0.0/16', // CIDR (allows 10.0.0.0 - 10.0.255.255)
          '172.16.1.*', // Wildcard
        ],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if any IP in list matches', async () => {
      const context = createMockExecutionContext('user-id', '10.0.0.50');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100', '10.0.0.50', '172.16.1.*'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle IPv4 edge cases correctly', async () => {
      const context = createMockExecutionContext('user-id', '10.0.0.0');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['10.0.0.0/24'], // Allows 10.0.0.0 - 10.0.0.255
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle /32 CIDR (single IP) correctly', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.100');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100/32'], // Only 192.168.1.100
      });

      usersService.findOne.mockResolvedValue(user as any);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for /32 CIDR with different IP', async () => {
      const context = createMockExecutionContext('user-id', '192.168.1.101');
      const user = createMockUserResponse({
        ip_whitelist_enabled: true,
        allowed_ips: ['192.168.1.100/32'],
      });

      usersService.findOne.mockResolvedValue(user as any);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
