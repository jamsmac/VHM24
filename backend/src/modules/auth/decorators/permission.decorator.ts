import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@modules/rbac/dto';

/**
 * Permission metadata interface
 */
export interface PermissionMetadata {
  resource: string;
  action: PermissionAction;
}

/**
 * Metadata key for permission decorator
 */
export const PERMISSION_KEY = 'required_permission';

/**
 * Permission decorator - Requires specific permission to access endpoint
 *
 * Use with PermissionGuard to enforce permission-based access control
 *
 * @example
 * ```typescript
 * @RequirePermission('machines', PermissionAction.CREATE)
 * @Post('machines')
 * createMachine() { ... }
 * ```
 *
 * @param resource - Resource name (e.g., 'machines', 'users')
 * @param action - Action (create, read, update, delete, execute, manage)
 */
export const RequirePermission = (resource: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { resource, action } as PermissionMetadata);
