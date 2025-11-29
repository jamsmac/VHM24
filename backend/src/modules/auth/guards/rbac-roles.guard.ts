import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '@modules/users/users.service';

/**
 * RBAC-based Roles Guard
 *
 * Checks user permissions using the new RBAC system (roles and permissions tables)
 * Replaces the old enum-based RolesGuard
 *
 * REQ-AUTH-03, REQ-AUTH-70, REQ-AUTH-72
 */
@Injectable()
export class RbacRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No specific roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return false;
    }

    // Load user with RBAC roles
    const userWithRoles = await this.usersService.findOneWithRoles(user.id);

    if (!userWithRoles) {
      return false;
    }

    // Check if user has any of the required roles
    const userRoleNames = userWithRoles.roles?.map((role) => role.name) || [];

    // SuperAdmin always has access (REQ-AUTH-04)
    if (userRoleNames.includes('SuperAdmin')) {
      return true;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((requiredRole) => userRoleNames.includes(requiredRole));
  }
}
