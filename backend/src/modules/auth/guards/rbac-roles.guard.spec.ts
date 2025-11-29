import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacRolesGuard } from './rbac-roles.guard';
import { UsersService } from '@modules/users/users.service';

describe('RbacRolesGuard', () => {
  let guard: RbacRolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let usersService: jest.Mocked<UsersService>;

  const mockExecutionContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockUsersService = {
      findOneWithRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacRolesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    guard = module.get<RbacRolesGuard>(RbacRolesGuard);
    reflector = module.get(Reflector);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(usersService.findOneWithRoles).not.toHaveBeenCalled();
    });

    it('should return true when required roles array is empty', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user is not in request', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const context = mockExecutionContext(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user.id is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const context = mockExecutionContext({ email: 'test@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when user not found in database', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      usersService.findOneWithRoles.mockResolvedValue(null as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(usersService.findOneWithRoles).toHaveBeenCalledWith('user-uuid');
    });

    it('should return true when user has one of the required roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin', 'Manager']);
      const userWithRoles = {
        id: 'user-uuid',
        roles: [{ name: 'Manager' }, { name: 'Operator' }],
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when user does not have any required role', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin', 'Manager']);
      const userWithRoles = {
        id: 'user-uuid',
        roles: [{ name: 'Operator' }, { name: 'Viewer' }],
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should always allow SuperAdmin access regardless of required roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(['SpecificRole']);
      const superAdminUser = {
        id: 'admin-uuid',
        roles: [{ name: 'SuperAdmin' }],
      };
      usersService.findOneWithRoles.mockResolvedValue(superAdminUser as any);
      const context = mockExecutionContext({ id: 'admin-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle user with no roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const userWithNoRoles = {
        id: 'user-uuid',
        roles: null,
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithNoRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user with empty roles array', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const userWithEmptyRoles = {
        id: 'user-uuid',
        roles: [],
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithEmptyRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle user with undefined roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const userWithUndefinedRoles = {
        id: 'user-uuid',
        roles: undefined,
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithUndefinedRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should match roles case-sensitively', async () => {
      reflector.getAllAndOverride.mockReturnValue(['Admin']);
      const userWithRoles = {
        id: 'user-uuid',
        roles: [{ name: 'admin' }], // lowercase
      };
      usersService.findOneWithRoles.mockResolvedValue(userWithRoles as any);
      const context = mockExecutionContext({ id: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
