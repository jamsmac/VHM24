# RBAC Module

## Overview

The RBAC (Role-Based Access Control) module provides fine-grained permission management for VendHub Manager. It enables defining custom roles with specific permissions and assigning them to users for controlling access to system resources.

## Key Features

- Custom role definitions
- Granular permissions (resource + action)
- Role-permission mapping
- User-role assignment
- Permission inheritance
- Dynamic permission checking

## Entities

### Role

**File**: `backend/src/modules/rbac/entities/role.entity.ts`

```typescript
@Entity('roles')
export class Role extends BaseEntity {
  name: string;              // Role name (unique)
  description: string | null; // Role description
  is_active: boolean;        // Active status
  permissions: Permission[]; // Assigned permissions
}
```

### Permission

**File**: `backend/src/modules/rbac/entities/permission.entity.ts`

```typescript
@Entity('permissions')
export class Permission extends BaseEntity {
  name: string;              // Permission name (unique)
  resource: string;          // Resource name (e.g., 'machines')
  action: string;            // Action (create, read, update, delete, execute)
  description: string | null; // Description
  roles: Role[];             // Roles with this permission
}
```

### Role-Permission Junction

```typescript
// Many-to-Many relationship via role_permissions table
@ManyToMany(() => Permission, (permission) => permission.roles)
@JoinTable({
  name: 'role_permissions',
  joinColumn: { name: 'role_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
})
permissions: Permission[];
```

## Standard Roles

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| SUPER_ADMIN | Full system access | All permissions |
| ADMIN | Administrative access | Most permissions except system config |
| MANAGER | Operations manager | Tasks, machines, inventory, reports |
| OPERATOR | Field operator | Own tasks, limited machine access |
| TECHNICIAN | Technical support | Maintenance, incidents, equipment |
| VIEWER | Read-only access | Read permissions only |

## Permission Naming Convention

```
{resource}:{action}

Examples:
- machines:create
- machines:read
- machines:update
- machines:delete
- tasks:assign
- reports:export
- users:manage
```

### Standard Actions

| Action | Description |
|--------|-------------|
| `create` | Create new resources |
| `read` | View resources |
| `update` | Modify resources |
| `delete` | Delete resources |
| `execute` | Execute operations |
| `manage` | Full management access |
| `assign` | Assign to others |
| `approve` | Approve requests |
| `export` | Export data |

### Resources

| Resource | Description |
|----------|-------------|
| `machines` | Vending machines |
| `tasks` | Operator tasks |
| `inventory` | Inventory management |
| `users` | User accounts |
| `reports` | Reports and analytics |
| `incidents` | Incident management |
| `complaints` | Customer complaints |
| `settings` | System settings |
| `integrations` | External integrations |

## API Endpoints

### Roles

```
POST   /api/rbac/roles           Create role
GET    /api/rbac/roles           List roles
GET    /api/rbac/roles/:id       Get role
PUT    /api/rbac/roles/:id       Update role
DELETE /api/rbac/roles/:id       Delete role
POST   /api/rbac/roles/:id/permissions  Assign permissions
DELETE /api/rbac/roles/:id/permissions/:permId  Remove permission
```

### Permissions

```
POST   /api/rbac/permissions     Create permission
GET    /api/rbac/permissions     List permissions
GET    /api/rbac/permissions/:id Get permission
PUT    /api/rbac/permissions/:id Update permission
DELETE /api/rbac/permissions/:id Delete permission
```

### User-Role Assignment

```
POST   /api/rbac/assign          Assign role to user
DELETE /api/rbac/revoke          Revoke role from user
GET    /api/rbac/user/:id/roles  Get user's roles
GET    /api/rbac/user/:id/permissions  Get user's permissions
```

## DTOs

### CreateRoleDto

```typescript
class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  permission_ids?: string[];
}
```

### CreatePermissionDto

```typescript
class CreatePermissionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  resource: string;

  @IsString()
  @IsIn(['create', 'read', 'update', 'delete', 'execute', 'manage', 'assign', 'approve', 'export'])
  action: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### AssignRoleDto

```typescript
class AssignRoleDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  role_id: string;
}
```

## Service Methods

### RbacService

| Method | Description |
|--------|-------------|
| `createRole()` | Create new role |
| `updateRole()` | Update role |
| `deleteRole()` | Delete role |
| `findAllRoles()` | List all roles |
| `createPermission()` | Create permission |
| `findAllPermissions()` | List permissions |
| `assignPermissionToRole()` | Add permission to role |
| `removePermissionFromRole()` | Remove permission from role |
| `assignRoleToUser()` | Assign role to user |
| `revokeRoleFromUser()` | Remove role from user |
| `getUserPermissions()` | Get all user permissions |
| `hasPermission()` | Check if user has permission |

## Permission Checking

### Guard-based Checking

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('machines:update')
@Put(':id')
async updateMachine(@Param('id') id: string, @Body() dto: UpdateMachineDto) {
  return this.machinesService.update(id, dto);
}
```

### Programmatic Checking

```typescript
async canUserPerformAction(userId: string, permission: string): Promise<boolean> {
  const permissions = await this.rbacService.getUserPermissions(userId);
  return permissions.some(p => p.name === permission);
}
```

### Multiple Permissions

```typescript
@RequirePermissions('tasks:create', 'tasks:assign')
@Post()
async createAndAssignTask(@Body() dto: CreateTaskDto) {
  // User must have both permissions
}
```

### Any Permission

```typescript
@RequireAnyPermission('reports:read', 'reports:export')
@Get()
async getReports() {
  // User needs at least one of these permissions
}
```

## Role Hierarchy Example

```
SUPER_ADMIN
├── All Permissions
│
ADMIN
├── users:*
├── machines:*
├── tasks:*
├── inventory:*
├── reports:*
├── settings:read
│
MANAGER
├── machines:read, update
├── tasks:*
├── inventory:read, update
├── reports:read, export
├── users:read
│
OPERATOR
├── machines:read
├── tasks:read, update (own only)
├── inventory:read
│
TECHNICIAN
├── machines:read, update
├── incidents:*
├── equipment:*
├── tasks:read
│
VIEWER
├── machines:read
├── tasks:read
├── inventory:read
├── reports:read
```

## Permission Matrix

| Resource | ADMIN | MANAGER | OPERATOR | TECHNICIAN | VIEWER |
|----------|-------|---------|----------|------------|--------|
| machines:create | ✓ | ✗ | ✗ | ✗ | ✗ |
| machines:read | ✓ | ✓ | ✓ | ✓ | ✓ |
| machines:update | ✓ | ✓ | ✗ | ✓ | ✗ |
| machines:delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| tasks:create | ✓ | ✓ | ✗ | ✗ | ✗ |
| tasks:assign | ✓ | ✓ | ✗ | ✗ | ✗ |
| tasks:update | ✓ | ✓ | Own | ✓ | ✗ |
| reports:export | ✓ | ✓ | ✗ | ✗ | ✗ |

## Caching

Permissions are cached in Redis for performance:

```typescript
async getUserPermissions(userId: string): Promise<Permission[]> {
  const cacheKey = `user:${userId}:permissions`;

  // Check cache first
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Load from database
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['roles', 'roles.permissions'],
  });

  const permissions = user.roles.flatMap(role => role.permissions);

  // Cache for 5 minutes
  await this.redis.set(cacheKey, JSON.stringify(permissions), 'EX', 300);

  return permissions;
}
```

### Cache Invalidation

```typescript
async assignRoleToUser(userId: string, roleId: string): Promise<void> {
  await this.userRoleRepository.save({ user_id: userId, role_id: roleId });

  // Invalidate cache
  await this.redis.del(`user:${userId}:permissions`);
}
```

## Best Practices

1. **Least Privilege**: Assign minimum required permissions
2. **Role-Based**: Prefer roles over individual permissions
3. **Consistent Naming**: Follow naming conventions
4. **Regular Audit**: Review role assignments periodically
5. **Cache Wisely**: Invalidate cache on changes
6. **Document Roles**: Keep role descriptions updated

## Related Modules

- [Users](../users/README.md) - User management
- [Auth](../auth/README.md) - Authentication
- [Machine Access](../machine-access/README.md) - Per-machine access
- [Audit Logs](../audit-logs/README.md) - Permission changes tracking
