import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MachineAccessService } from '../machine-access.service';
import { MachineAccessRole } from '../entities/machine-access.entity';
import { UserRole } from '../../users/entities/user.entity';

export const MACHINE_ACCESS_KEY = 'machine_access_roles';

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
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(MACHINE_ACCESS_KEY, roles, descriptor?.value || target);
    return descriptor || target;
  };
};

/**
 * Guard to check per-machine access.
 *
 * Expects:
 * - JWT user to be present in request (use with JwtAuthGuard)
 * - machineId parameter in request params
 * - @MachineAccessRoles decorator on route
 *
 * Global admins (SUPER_ADMIN, ADMIN) bypass this check.
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

    // Global admins bypass machine-level access checks
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
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
      throw new ForbiddenException(
        `Required machine access level: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
