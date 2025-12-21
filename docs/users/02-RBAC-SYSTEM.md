# RBAC - Role-Based Access Control

> **Модуль**: `backend/src/modules/rbac/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Содержание

1. [Обзор RBAC](#обзор-rbac)
2. [Архитектура](#архитектура)
3. [Role Entity](#role-entity)
4. [Permission Entity](#permission-entity)
5. [Связи User ↔ Role ↔ Permission](#связи-user--role--permission)
6. [Guards](#guards)
7. [Decorators](#decorators)
8. [RBAC Service](#rbac-service)
9. [API Reference](#api-reference)
10. [Примеры использования](#примеры-использования)

---

## Обзор RBAC

### Двухуровневая система авторизации

VendHub Manager использует **двухуровневую систему авторизации**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  УРОВЕНЬ 1: UserRole (enum)                                        │
│  ─────────────────────────                                          │
│  ├── Быстрая проверка                                              │
│  ├── Встроен в User entity                                         │
│  ├── Фиксированный набор ролей                                     │
│  └── Используется: @Roles(UserRole.ADMIN)                          │
│                                                                     │
│  УРОВЕНЬ 2: RBAC (Role + Permission)                               │
│  ────────────────────────────────────                               │
│  ├── Гибкая система                                                │
│  ├── Динамические роли и разрешения                                │
│  ├── Resource + Action модель                                      │
│  └── Используется: @RequirePermission('machines', 'create')        │
│                                                                     │
│  Когда что использовать:                                           │
│  ├── UserRole: базовые ограничения (админ-only endpoints)         │
│  └── RBAC: тонкая настройка прав внутри роли                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Модель данных

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│    User     │────<│   user_roles    │>────│    Role     │
│             │     │   (join table)  │     │             │
│ id          │     │ user_id         │     │ id          │
│ email       │     │ role_id         │     │ name        │
│ role (enum) │     └─────────────────┘     │ description │
└─────────────┘                             └──────┬──────┘
                                                   │
                                           ┌───────▼───────┐
                                           │role_permissions│
                                           │  (join table)  │
                                           │ role_id        │
                                           │ permission_id  │
                                           └───────┬───────┘
                                                   │
                                           ┌───────▼───────┐
                                           │  Permission   │
                                           │               │
                                           │ id            │
                                           │ name          │
                                           │ resource      │
                                           │ action        │
                                           └───────────────┘
```

---

## Архитектура

### Структура модуля

```
rbac/
├── entities/
│   ├── role.entity.ts          # Роль
│   └── permission.entity.ts    # Разрешение
├── dto/
│   ├── create-role.dto.ts
│   ├── update-role.dto.ts
│   ├── create-permission.dto.ts
│   ├── update-permission.dto.ts
│   └── assign-role.dto.ts
├── rbac.service.ts             # Основной сервис
├── rbac.controller.ts          # API endpoints
└── rbac.module.ts

auth/guards/
├── roles.guard.ts              # Проверка UserRole (enum)
└── rbac-roles.guard.ts         # Проверка RBAC permissions
```

---

## Role Entity

### Файл

`backend/src/modules/rbac/entities/role.entity.ts`

### Схема таблицы

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Join table for role-permission many-to-many
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

### TypeScript Entity

```typescript
@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
```

### Примеры ролей

| Имя | Описание | Пример permissions |
|-----|----------|-------------------|
| `fleet_manager` | Менеджер парка аппаратов | machines:*, tasks:*, inventory:read |
| `finance_viewer` | Просмотр финансов | transactions:read, reports:read |
| `route_planner` | Планирование маршрутов | routes:*, machines:read |
| `inventory_admin` | Управление складом | inventory:*, nomenclature:* |

---

## Permission Entity

### Файл

`backend/src/modules/rbac/entities/permission.entity.ts`

### Схема таблицы

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,    -- "machines:create"
    resource VARCHAR(100) NOT NULL,        -- "machines"
    action VARCHAR(50) NOT NULL,           -- "create"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

### TypeScript Entity

```typescript
@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;  // "machines:create"

  @Column({ type: 'varchar', length: 100 })
  resource: string;  // "machines"

  @Column({ type: 'varchar', length: 50 })
  action: string;  // "create", "read", "update", "delete", "execute"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
```

### PermissionAction Enum

```typescript
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',  // Для действий типа "approve", "complete"
}
```

### Примеры permissions

| Name | Resource | Action | Описание |
|------|----------|--------|----------|
| `machines:create` | machines | create | Создание аппаратов |
| `machines:read` | machines | read | Просмотр аппаратов |
| `machines:update` | machines | update | Редактирование аппаратов |
| `machines:delete` | machines | delete | Удаление аппаратов |
| `tasks:approve` | tasks | execute | Одобрение задач |
| `inventory:transfer` | inventory | execute | Трансферы инвентаря |
| `reports:generate` | reports | execute | Генерация отчётов |

---

## Связи User ↔ Role ↔ Permission

### User → Roles

```typescript
// User entity
@ManyToMany(() => Role, { eager: false })
@JoinTable({
  name: 'user_roles',
  joinColumn: { name: 'user_id', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
})
roles: Role[];
```

### Загрузка с ролями

```typescript
async findOneWithRoles(id: string): Promise<User> {
  const user = await this.userRepository.findOne({
    where: { id },
    relations: ['roles', 'roles.permissions'],
  });

  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }

  return user;
}
```

### Получение всех permissions пользователя

```typescript
async getUserPermissions(userId: string): Promise<Permission[]> {
  const userRoles = await this.getUserRoles(userId);
  const allPermissions = userRoles.flatMap((role) => role.permissions);

  // Удаление дубликатов
  const uniquePermissions = Array.from(
    new Map(allPermissions.map((perm) => [perm.id, perm])).values(),
  );

  return uniquePermissions;
}
```

---

## Guards

### RolesGuard (UserRole enum)

Простая проверка enum-роли пользователя:

```typescript
// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;  // Нет ограничений
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### RbacRolesGuard (RBAC permissions)

Проверка динамических permissions:

```typescript
// auth/guards/rbac-roles.guard.ts
@Injectable()
export class RbacRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<{
      resource: string;
      action: PermissionAction;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // SuperAdmin bypass
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    return this.rbacService.checkPermission(
      user.id,
      requiredPermission.resource,
      requiredPermission.action,
    );
  }
}
```

---

## Decorators

### @Roles (для UserRole enum)

```typescript
// auth/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Использование
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Post()
createMachine(@Body() dto: CreateMachineDto) { ... }
```

### @RequirePermission (для RBAC)

```typescript
// auth/decorators/require-permission.decorator.ts
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (resource: string, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { resource, action });

// Использование
@RequirePermission('machines', PermissionAction.CREATE)
@UseGuards(JwtAuthGuard, RbacRolesGuard)
@Post()
createMachine(@Body() dto: CreateMachineDto) { ... }
```

### @Public (без авторизации)

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Использование
@Public()
@Get('health')
healthCheck() { return { status: 'ok' }; }
```

---

## RBAC Service

### Основные методы

```typescript
@Injectable()
export class RbacService {
  // ============= ROLE MANAGEMENT =============

  async createRole(dto: CreateRoleDto): Promise<Role>;
  async findAllRoles(isActive?: boolean): Promise<Role[]>;
  async findOneRole(id: string): Promise<Role>;
  async findRoleByName(name: string): Promise<Role | null>;
  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role>;
  async removeRole(id: string): Promise<void>;

  // ============= PERMISSION MANAGEMENT =============

  async createPermission(dto: CreatePermissionDto): Promise<Permission>;
  async findAllPermissions(): Promise<Permission[]>;
  async findOnePermission(id: string): Promise<Permission>;
  async updatePermission(id: string, dto: UpdatePermissionDto): Promise<Permission>;
  async removePermission(id: string): Promise<void>;

  // ============= ROLE-PERMISSION ASSIGNMENT =============

  async addPermissionsToRole(roleId: string, permissionIds: string[]): Promise<Role>;
  async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<Role>;

  // ============= USER-ROLE ASSIGNMENT =============

  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void>;
  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void>;
  async getUserRoles(userId: string): Promise<Role[]>;
  async getUserPermissions(userId: string): Promise<Permission[]>;

  // ============= AUTHORIZATION CHECKS =============

  async checkPermission(userId: string, resource: string, action: PermissionAction): Promise<boolean>;
  async hasRole(userId: string, roleName: string): Promise<boolean>;
}
```

### Проверка разрешения

```typescript
async checkPermission(
  userId: string,
  resource: string,
  action: PermissionAction,
): Promise<boolean> {
  const userRoles = await this.getUserRoles(userId);
  const permissions = userRoles.flatMap((role) => role.permissions);

  return permissions.some(
    (p) => p.resource === resource && p.action === action
  );
}
```

### Назначение ролей пользователю

```typescript
async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['roles'],
  });

  if (!user) {
    throw new NotFoundException(`User ${userId} not found`);
  }

  const roles = await this.roleRepository.find({
    where: { id: In(roleIds) },
  });

  if (roles.length !== roleIds.length) {
    throw new BadRequestException('Invalid role IDs');
  }

  user.roles = roles;  // Заменяет все роли
  await this.userRepository.save(user);
}
```

---

## API Reference

### Roles

| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/rbac/roles` | Создать роль |
| `GET` | `/rbac/roles` | Получить все роли |
| `GET` | `/rbac/roles/:id` | Получить роль по ID |
| `PATCH` | `/rbac/roles/:id` | Обновить роль |
| `DELETE` | `/rbac/roles/:id` | Удалить роль |
| `POST` | `/rbac/roles/:id/permissions` | Добавить permissions к роли |
| `DELETE` | `/rbac/roles/:id/permissions` | Удалить permissions из роли |

### Permissions

| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/rbac/permissions` | Создать permission |
| `GET` | `/rbac/permissions` | Получить все permissions |
| `GET` | `/rbac/permissions/:id` | Получить permission по ID |
| `PATCH` | `/rbac/permissions/:id` | Обновить permission |
| `DELETE` | `/rbac/permissions/:id` | Удалить permission |

### User Roles

| Method | Endpoint | Описание |
|--------|----------|----------|
| `GET` | `/rbac/users/:userId/roles` | Получить роли пользователя |
| `POST` | `/rbac/users/:userId/roles` | Назначить роли пользователю |
| `DELETE` | `/rbac/users/:userId/roles` | Удалить роли у пользователя |
| `GET` | `/rbac/users/:userId/permissions` | Получить все permissions пользователя |

---

## Примеры использования

### Создание роли с permissions

```bash
# 1. Создать permissions
POST /api/rbac/permissions
{
  "name": "inventory:transfer",
  "resource": "inventory",
  "action": "execute",
  "description": "Transfer inventory between levels"
}

# 2. Создать роль
POST /api/rbac/roles
{
  "name": "warehouse_manager",
  "description": "Управление складом",
  "permission_ids": ["perm-uuid-1", "perm-uuid-2"]
}

# 3. Назначить роль пользователю
POST /api/rbac/users/{userId}/roles
{
  "role_ids": ["role-uuid"]
}
```

### Использование в контроллере

```typescript
@Controller('inventory')
@UseGuards(JwtAuthGuard, RbacRolesGuard)
export class InventoryController {
  // Требует permission 'inventory:read'
  @Get()
  @RequirePermission('inventory', PermissionAction.READ)
  findAll() { ... }

  // Требует permission 'inventory:execute' (для transfer)
  @Post('transfer')
  @RequirePermission('inventory', PermissionAction.EXECUTE)
  transfer(@Body() dto: TransferDto) { ... }

  // Требует роль Admin или SuperAdmin
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) { ... }
}
```

### Проверка в сервисе

```typescript
@Injectable()
export class TasksService {
  async approveTask(taskId: string, userId: string): Promise<Task> {
    // Проверка permission программно
    const canApprove = await this.rbacService.checkPermission(
      userId,
      'tasks',
      PermissionAction.EXECUTE,
    );

    if (!canApprove) {
      throw new ForbiddenException('No permission to approve tasks');
    }

    // ... логика одобрения
  }
}
```

---

## Seed данные

### Базовые permissions

```typescript
const permissions = [
  // Machines
  { name: 'machines:create', resource: 'machines', action: 'create' },
  { name: 'machines:read', resource: 'machines', action: 'read' },
  { name: 'machines:update', resource: 'machines', action: 'update' },
  { name: 'machines:delete', resource: 'machines', action: 'delete' },

  // Tasks
  { name: 'tasks:create', resource: 'tasks', action: 'create' },
  { name: 'tasks:read', resource: 'tasks', action: 'read' },
  { name: 'tasks:update', resource: 'tasks', action: 'update' },
  { name: 'tasks:delete', resource: 'tasks', action: 'delete' },
  { name: 'tasks:approve', resource: 'tasks', action: 'execute' },

  // Inventory
  { name: 'inventory:read', resource: 'inventory', action: 'read' },
  { name: 'inventory:transfer', resource: 'inventory', action: 'execute' },
  { name: 'inventory:adjust', resource: 'inventory', action: 'execute' },

  // Transactions
  { name: 'transactions:read', resource: 'transactions', action: 'read' },
  { name: 'transactions:create', resource: 'transactions', action: 'create' },

  // Reports
  { name: 'reports:read', resource: 'reports', action: 'read' },
  { name: 'reports:generate', resource: 'reports', action: 'execute' },

  // Users
  { name: 'users:read', resource: 'users', action: 'read' },
  { name: 'users:create', resource: 'users', action: 'create' },
  { name: 'users:update', resource: 'users', action: 'update' },
  { name: 'users:delete', resource: 'users', action: 'delete' },
];
```

---

## См. также

- [01-USERS-OVERVIEW.md](./01-USERS-OVERVIEW.md) - Обзор системы пользователей
- [../auth/README.md](../auth/README.md) - Аутентификация
- [API Documentation](/api/docs) - Swagger
