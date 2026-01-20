import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Permission actions for directory operations
 */
export type DirectoryPermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'archive'
  | 'bulk_import'
  | 'sync_external'
  | 'approve';

/**
 * Decorator to set required permission for an endpoint
 */
export const DIRECTORY_PERMISSION_KEY = 'directory_permission';
export const DirectoryPermission = (action: DirectoryPermissionAction) =>
  SetMetadata(DIRECTORY_PERMISSION_KEY, action);

/**
 * Guard that checks directory-specific permissions
 *
 * This guard can be extended to support a permissions table for fine-grained
 * access control. Currently, it uses role-based defaults.
 */
@Injectable()
export class DirectoryPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<DirectoryPermissionAction>(
      DIRECTORY_PERMISSION_KEY,
      context.getHandler(),
    );

    // No permission required
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const directoryId = request.params.directoryId || request.params.id;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get user roles
    const userRoles: string[] = user.roles || [];
    if (user.role) {
      userRoles.push(user.role);
    }

    // Check permission based on role defaults
    const hasPermission = this.checkRolePermission(userRoles, requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions for action: ${requiredPermission}`,
      );
    }

    return true;
  }

  /**
   * Check if any of the user's roles has the required permission
   */
  private checkRolePermission(
    roles: string[],
    action: DirectoryPermissionAction,
  ): boolean {
    // Default role-based permissions
    const rolePermissions: Record<string, DirectoryPermissionAction[]> = {
      SUPER_ADMIN: ['view', 'create', 'edit', 'archive', 'bulk_import', 'sync_external', 'approve'],
      ADMIN: ['view', 'create', 'edit', 'archive', 'bulk_import', 'sync_external', 'approve'],
      MANAGER: ['view', 'create', 'edit', 'approve'],
      OPERATOR: ['view', 'create'],
      TECHNICIAN: ['view'],
      VIEWER: ['view'],
    };

    for (const role of roles) {
      const permissions = rolePermissions[role.toUpperCase()];
      if (permissions?.includes(action)) {
        return true;
      }
    }

    return false;
  }
}
