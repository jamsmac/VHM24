import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { UserRole, UserStatus } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const mockRequest = { user: { id: 'user-1', role: UserRole.VIEWER } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      const mockRequest = { user: { id: 'user-1', role: UserRole.ADMIN } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.ADMIN, UserRole.MANAGER];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should deny access when user does not have required role', () => {
      const mockRequest = { user: { id: 'user-1', role: UserRole.VIEWER } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.ADMIN, UserRole.MANAGER];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should allow ADMIN role when ADMIN is in required roles', () => {
      const mockRequest = { user: { id: 'admin-1', role: UserRole.ADMIN } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.ADMIN];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow MANAGER role when MANAGER is in required roles', () => {
      const mockRequest = { user: { id: 'manager-1', role: UserRole.MANAGER } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.MANAGER, UserRole.OPERATOR];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should allow OPERATOR role when OPERATOR is in required roles', () => {
      const mockRequest = { user: { id: 'operator-1', role: UserRole.OPERATOR } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.OPERATOR];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should deny VIEWER role when only OPERATOR is required', () => {
      const mockRequest = { user: { id: 'viewer-1', role: UserRole.VIEWER } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.OPERATOR];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle empty required roles array', () => {
      const mockRequest = { user: { id: 'user-1', role: UserRole.ADMIN } };
      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const requiredRoles: UserRole[] = [];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should check metadata from handler and class', () => {
      const mockRequest = { user: { id: 'user-1', role: UserRole.ADMIN } };
      const mockHandler = () => {};
      const mockClass = class {};

      const mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn().mockReturnValue(mockHandler),
        getClass: jest.fn().mockReturnValue(mockClass),
      } as unknown as ExecutionContext;

      const requiredRoles = [UserRole.ADMIN];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [mockHandler, mockClass]);
    });
  });
});
