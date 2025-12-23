import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MachineAccessService } from '../machine-access.service';
import { MachineAccessRole } from '../entities/machine-access.entity';
import { UserRole } from '../../users/entities/user.entity';

export const MACHINE_ACCESS_KEY = 'machine_access_roles';
export const STRICT_MACHINE_ACCESS_KEY = 'strict_machine_access';

/**
 * Decorator to specify required machine access roles.
 * Use with MachineAccessGuard.
 *
 * @example
 * @MachineAccessRoles(MachineAccessRole.OWNER, MachineAccessRole.ADMIN)
 * @Get(':machineId/sensitive-data')
 * async getSensitiveData(@Param('machineId') machineId: string) {}
 */
export const MachineAccessRoles = (...roles: MachineAccessRole[]) => {
  return <T>(
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> | void => {
    Reflect.defineMetadata(MACHINE_ACCESS_KEY, roles, descriptor?.value || target);
    return descriptor;
  };
};

/**
 * Decorator to enforce strict machine access checks.
 * When applied, even OWNER and ADMIN users must have explicit machine-level access.
 *
 * Use this for sensitive operations where machine-level audit trail is required,
 * or when you need to ensure admins are explicitly assigned to specific machines.
 *
 * @example
 * @StrictMachineAccess()
 * @MachineAccessRoles(MachineAccessRole.OWNER)
 * @Delete(':machineId')
 * async deleteMachine(@Param('machineId') machineId: string) {}
 */
export const StrictMachineAccess = () => SetMetadata(STRICT_MACHINE_ACCESS_KEY, true);

/**
 * Guard to check per-machine access.
 *
 * Expects:
 * - JWT user to be present in request (use with JwtAuthGuard)
 * - machineId parameter in request params
 * - @MachineAccessRoles decorator on route
 *
 * By default, global admins (OWNER, ADMIN) bypass this check.
 * Use @StrictMachineAccess() decorator to enforce checks for admins too.
 */
@Injectable()
export class MachineAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private machineAccessService: MachineAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<MachineAccessRole[]>(
      MACHINE_ACCESS_KEY,
      context.getHandler(),
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user = no access
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if strict mode is enabled (MEDIUM-002 fix)
    // When strict, even OWNER/ADMIN must have explicit machine-level access
    const strictMode = this.reflector.get<boolean>(
      STRICT_MACHINE_ACCESS_KEY,
      context.getHandler(),
    );

    // Global admins bypass machine-level access checks UNLESS strict mode is enabled
    if (!strictMode && (user.role === UserRole.OWNER || user.role === UserRole.ADMIN)) {
      return true;
    }

    // Get machine ID from request params
    const machineId = request.params.machineId || request.params.id;
    if (!machineId) {
      throw new ForbiddenException('Machine ID required');
    }

    // Check if user has required access level
    const hasAccess = await this.machineAccessService.hasAccess(
      user.id,
      machineId,
      requiredRoles,
    );

    if (!hasAccess) {
      const strictNote = strictMode ? ' (strict mode enabled)' : '';
      throw new ForbiddenException(
        `Required machine access level: ${requiredRoles.join(' or ')}${strictNote}`,
      );
    }

    return true;
  }
}
