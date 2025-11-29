import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '@modules/rbac/rbac.service';
import { PERMISSION_KEY, PermissionMetadata } from '../decorators/permission.decorator';

/**
 * Permission Guard - Permission-based access control
 *
 * Checks if the authenticated user has the required permission
 * Uses RBAC system to validate permissions
 *
 * Must be used after JwtAuthGuard to ensure user is authenticated
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('machines', PermissionAction.CREATE)
 * @Post('machines')
 * createMachine() { ... }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permission from decorator metadata
    const requiredPermission = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission required, allow access
    if (!requiredPermission) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has the required permission
    const hasPermission = await this.rbacService.checkPermission(
      user.sub,
      requiredPermission.resource,
      requiredPermission.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${requiredPermission.resource}.${requiredPermission.action}`,
      );
    }

    return true;
  }
}
