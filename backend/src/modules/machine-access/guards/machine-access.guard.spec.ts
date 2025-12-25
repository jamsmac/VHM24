import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MachineAccessGuard,
  MachineAccessRoles,
  StrictMachineAccess,
  MACHINE_ACCESS_KEY,
  STRICT_MACHINE_ACCESS_KEY,
} from './machine-access.guard';
import { MachineAccessService } from '../machine-access.service';
import { MachineAccessRole } from '../entities/machine-access.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('MachineAccessGuard', () => {
  let guard: MachineAccessGuard;
  let reflector: Reflector;
  let machineAccessService: jest.Mocked<MachineAccessService>;

  const mockMachineAccessService = {
    hasAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachineAccessGuard,
        Reflector,
        {
          provide: MachineAccessService,
          useValue: mockMachineAccessService,
        },
      ],
    }).compile();

    guard = module.get<MachineAccessGuard>(MachineAccessGuard);
    reflector = module.get<Reflector>(Reflector);
    machineAccessService = module.get(MachineAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user: any,
    params: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    describe('when no roles are specified', () => {
      it('should allow access when no roles are required', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue(undefined);
        const context = createMockExecutionContext({ id: 'user-1' });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when roles array is empty', async () => {
        jest.spyOn(reflector, 'get').mockReturnValue([]);
        const context = createMockExecutionContext({ id: 'user-1' });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('when user is not authenticated', () => {
      it('should throw ForbiddenException when no user', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([MachineAccessRole.OPERATOR]);
        const context = createMockExecutionContext(null);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Authentication required',
        );
      });

      it('should throw ForbiddenException when user is undefined', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockReturnValue([MachineAccessRole.OPERATOR]);
        const context = createMockExecutionContext(undefined);

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Authentication required',
        );
      });
    });

    describe('when user is global admin (non-strict mode)', () => {
      it('should allow OWNER to bypass machine access check', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OPERATOR];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        const context = createMockExecutionContext({
          id: 'user-1',
          role: UserRole.OWNER,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(machineAccessService.hasAccess).not.toHaveBeenCalled();
      });

      it('should allow ADMIN to bypass machine access check', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OPERATOR];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        const context = createMockExecutionContext({
          id: 'user-1',
          role: UserRole.ADMIN,
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(machineAccessService.hasAccess).not.toHaveBeenCalled();
      });
    });

    describe('when strict mode is enabled', () => {
      it('should check machine access even for OWNER', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OWNER];
            if (key === STRICT_MACHINE_ACCESS_KEY) return true;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(true);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.OWNER },
          { machineId: 'machine-1' },
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(machineAccessService.hasAccess).toHaveBeenCalledWith(
          'user-1',
          'machine-1',
          [MachineAccessRole.OWNER],
        );
      });

      it('should deny ADMIN without explicit machine access', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.ADMIN];
            if (key === STRICT_MACHINE_ACCESS_KEY) return true;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(false);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.ADMIN },
          { machineId: 'machine-1' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'strict mode enabled',
        );
      });
    });

    describe('when machine ID is missing', () => {
      it('should throw ForbiddenException when no machineId param', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OPERATOR];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.OPERATOR },
          {},
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Machine ID required',
        );
      });
    });

    describe('when checking machine access', () => {
      it('should use machineId param for access check', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OPERATOR];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(true);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.OPERATOR },
          { machineId: 'machine-123' },
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(machineAccessService.hasAccess).toHaveBeenCalledWith(
          'user-1',
          'machine-123',
          [MachineAccessRole.OPERATOR],
        );
      });

      it('should use id param as fallback for machine ID', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY) return [MachineAccessRole.OPERATOR];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(true);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.OPERATOR },
          { id: 'machine-456' },
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(machineAccessService.hasAccess).toHaveBeenCalledWith(
          'user-1',
          'machine-456',
          [MachineAccessRole.OPERATOR],
        );
      });

      it('should allow access when user has required role', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY)
              return [MachineAccessRole.OPERATOR, MachineAccessRole.TECHNICIAN];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(true);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.TECHNICIAN },
          { machineId: 'machine-1' },
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when user lacks required role', async () => {
        jest
          .spyOn(reflector, 'get')
          .mockImplementation((key: string) => {
            if (key === MACHINE_ACCESS_KEY)
              return [MachineAccessRole.OWNER, MachineAccessRole.ADMIN];
            if (key === STRICT_MACHINE_ACCESS_KEY) return false;
            return undefined;
          });
        mockMachineAccessService.hasAccess.mockResolvedValue(false);
        const context = createMockExecutionContext(
          { id: 'user-1', role: UserRole.OPERATOR },
          { machineId: 'machine-1' },
        );

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Required machine access level: owner or admin',
        );
      });
    });
  });
});

describe('MachineAccessRoles decorator', () => {
  it('should set metadata with roles', () => {
    const roles = [MachineAccessRole.OWNER, MachineAccessRole.ADMIN];

    class TestController {
      @MachineAccessRoles(...roles)
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(
      MACHINE_ACCESS_KEY,
      TestController.prototype.testMethod,
    );
    expect(metadata).toEqual(roles);
  });

  it('should work with single role', () => {
    class TestController {
      @MachineAccessRoles(MachineAccessRole.OPERATOR)
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(
      MACHINE_ACCESS_KEY,
      TestController.prototype.testMethod,
    );
    expect(metadata).toEqual([MachineAccessRole.OPERATOR]);
  });

  it('should work with multiple roles', () => {
    class TestController {
      @MachineAccessRoles(
        MachineAccessRole.VIEWER,
        MachineAccessRole.OPERATOR,
        MachineAccessRole.TECHNICIAN,
      )
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(
      MACHINE_ACCESS_KEY,
      TestController.prototype.testMethod,
    );
    expect(metadata).toEqual([
      MachineAccessRole.VIEWER,
      MachineAccessRole.OPERATOR,
      MachineAccessRole.TECHNICIAN,
    ]);
  });
});

describe('StrictMachineAccess decorator', () => {
  it('should set strict mode metadata to true', () => {
    class TestController {
      @StrictMachineAccess()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(
      STRICT_MACHINE_ACCESS_KEY,
      TestController.prototype.testMethod,
    );
    expect(metadata).toBe(true);
  });
});
