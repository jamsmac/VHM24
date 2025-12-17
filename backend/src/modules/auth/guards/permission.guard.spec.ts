import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { RbacService } from '@modules/rbac/rbac.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

// Type for mock user in execution context
interface MockRequestUser {
  sub?: string;
  email?: string;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let rbacService: jest.Mocked<RbacService>;

  const mockExecutionContext = (user?: MockRequestUser | null): ExecutionContext => {
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

    const mockRbacService = {
      checkPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RbacService, useValue: mockRbacService },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get(Reflector);
    rbacService = module.get(RbacService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no permission is required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = mockExecutionContext({ sub: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacService.checkPermission).not.toHaveBeenCalled();
    });

    it('should return true when user has required permission', async () => {
      const requiredPermission = { resource: 'machines', action: 'create' };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);
      rbacService.checkPermission.mockResolvedValue(true);
      const context = mockExecutionContext({ sub: 'user-uuid' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacService.checkPermission).toHaveBeenCalledWith('user-uuid', 'machines', 'create');
    });

    it('should throw ForbiddenException when user not authenticated', async () => {
      const requiredPermission = { resource: 'machines', action: 'create' };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);
      const context = mockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user.sub is missing', async () => {
      const requiredPermission = { resource: 'machines', action: 'create' };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);
      const context = mockExecutionContext({ email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const requiredPermission = { resource: 'machines', action: 'delete' };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);
      rbacService.checkPermission.mockResolvedValue(false);
      const context = mockExecutionContext({ sub: 'user-uuid' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Permission denied: machines.delete',
      );
    });

    it('should check permission with correct resource and action', async () => {
      const requiredPermission = { resource: 'tasks', action: 'read' };
      reflector.getAllAndOverride.mockReturnValue(requiredPermission);
      rbacService.checkPermission.mockResolvedValue(true);
      const context = mockExecutionContext({ sub: 'admin-uuid' });

      await guard.canActivate(context);

      expect(rbacService.checkPermission).toHaveBeenCalledWith('admin-uuid', 'tasks', 'read');
    });

    it('should get permission metadata from handler and class', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = mockExecutionContext({ sub: 'user-uuid' });

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });
  });
});
