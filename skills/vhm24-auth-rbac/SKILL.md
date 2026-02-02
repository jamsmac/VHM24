---
name: vhm24-auth-rbac
description: |
  VendHub Auth & RBAC - аутентификация и ролевой доступ.
  Telegram auth, роли (Admin, Manager, Technician...), права доступа.
  Использовать при работе с авторизацией и разграничением прав.
---

# VendHub Auth & RBAC

Система аутентификации и ролевого доступа VendHub.

## Когда использовать

- Аутентификация пользователей
- Проверка прав доступа
- Защита роутов/страниц
- Управление ролями

## Роли системы

```typescript
// types/auth.ts
export enum Role {
  ADMIN = "admin",           // Полный доступ
  MANAGER = "manager",       // Управление операциями
  TECHNICIAN = "technician", // Техническое обслуживание
  OPERATOR = "operator",     // Загрузка и инкассация
  COLLECTOR = "collector",   // Только инкассация
  ANALYST = "analyst",       // Только отчёты
  VIEWER = "viewer",         // Только просмотр
}

export interface User {
  id: number;
  telegramId: number;
  name: string;
  role: Role;
  permissions: Permission[];
  avatar?: string;
  isActive: boolean;
}
```

## Разрешения

```typescript
// types/permissions.ts
export enum Permission {
  // Автоматы
  MACHINES_VIEW = "machines:view",
  MACHINES_EDIT = "machines:edit",
  MACHINES_DELETE = "machines:delete",

  // Инвентарь
  INVENTORY_VIEW = "inventory:view",
  INVENTORY_TRANSFER = "inventory:transfer",
  INVENTORY_WRITE_OFF = "inventory:write_off",

  // Задачи
  TASKS_VIEW = "tasks:view",
  TASKS_CREATE = "tasks:create",
  TASKS_ASSIGN = "tasks:assign",

  // Финансы
  FINANCE_VIEW = "finance:view",
  FINANCE_TRANSACTIONS = "finance:transactions",
  FINANCE_RECONCILE = "finance:reconcile",

  // Отчёты
  REPORTS_VIEW = "reports:view",
  REPORTS_CREATE = "reports:create",
  REPORTS_EXPORT = "reports:export",

  // Настройки
  SETTINGS_VIEW = "settings:view",
  SETTINGS_EDIT = "settings:edit",

  // Пользователи
  USERS_VIEW = "users:view",
  USERS_MANAGE = "users:manage",
}

// Маппинг роль → разрешения
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // Все разрешения

  [Role.MANAGER]: [
    Permission.MACHINES_VIEW, Permission.MACHINES_EDIT,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.TASKS_VIEW, Permission.TASKS_CREATE, Permission.TASKS_ASSIGN,
    Permission.FINANCE_VIEW,
    Permission.REPORTS_VIEW, Permission.REPORTS_CREATE, Permission.REPORTS_EXPORT,
    Permission.SETTINGS_VIEW,
    Permission.USERS_VIEW,
  ],

  [Role.TECHNICIAN]: [
    Permission.MACHINES_VIEW, Permission.MACHINES_EDIT,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.TASKS_VIEW, Permission.TASKS_CREATE,
  ],

  [Role.OPERATOR]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW, Permission.INVENTORY_TRANSFER,
    Permission.TASKS_VIEW,
  ],

  [Role.COLLECTOR]: [
    Permission.MACHINES_VIEW,
    Permission.FINANCE_TRANSACTIONS,
    Permission.TASKS_VIEW,
  ],

  [Role.ANALYST]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.FINANCE_VIEW,
    Permission.REPORTS_VIEW, Permission.REPORTS_CREATE, Permission.REPORTS_EXPORT,
  ],

  [Role.VIEWER]: [
    Permission.MACHINES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.TASKS_VIEW,
    Permission.REPORTS_VIEW,
  ],
};
```

## Хуки авторизации

### useAuth

```typescript
// hooks/useAuth.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (initData: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (initData: string) => {
        set({ isLoading: true });
        try {
          const response = await api.auth.telegram.mutate({ initData });
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (permission: Permission) => {
        const { user } = get();
        if (!user) return false;

        // Admin имеет все права
        if (user.role === Role.ADMIN) return true;

        // Проверка кастомных разрешений
        if (user.permissions.includes(permission)) return true;

        // Проверка разрешений роли
        return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
      },

      hasRole: (role: Role) => {
        const { user } = get();
        return user?.role === role;
      },

      hasAnyRole: (roles: Role[]) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

### usePermission

```typescript
// hooks/usePermission.ts
import { useMemo } from "react";
import { useAuth } from "./useAuth";

export function usePermission(permission: Permission | Permission[]) {
  const { hasPermission } = useAuth();

  return useMemo(() => {
    if (Array.isArray(permission)) {
      return permission.every((p) => hasPermission(p));
    }
    return hasPermission(permission);
  }, [permission, hasPermission]);
}

// Использование
function EditButton() {
  const canEdit = usePermission(Permission.MACHINES_EDIT);

  if (!canEdit) return null;
  return <Button>Редактировать</Button>;
}
```

## Защита компонентов

### PermissionGate

```tsx
// components/auth/PermissionGate.tsx
interface PermissionGateProps {
  permission: Permission | Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
  requireAll?: boolean;
}

export function PermissionGate({
  permission,
  fallback = null,
  children,
  requireAll = true,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();

  const hasAccess = useMemo(() => {
    if (Array.isArray(permission)) {
      return requireAll
        ? permission.every((p) => hasPermission(p))
        : permission.some((p) => hasPermission(p));
    }
    return hasPermission(permission);
  }, [permission, hasPermission, requireAll]);

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

// Использование
<PermissionGate permission={Permission.MACHINES_EDIT}>
  <Button onClick={handleEdit}>Редактировать</Button>
</PermissionGate>

<PermissionGate
  permission={[Permission.FINANCE_VIEW, Permission.FINANCE_TRANSACTIONS]}
  requireAll={false}
  fallback={<p>Нет доступа к финансам</p>}
>
  <FinanceModule />
</PermissionGate>
```

### RoleGate

```tsx
// components/auth/RoleGate.tsx
interface RoleGateProps {
  roles: Role | Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { hasAnyRole, hasRole } = useAuth();

  const hasAccess = Array.isArray(roles)
    ? hasAnyRole(roles)
    : hasRole(roles);

  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}

// Использование
<RoleGate roles={[Role.ADMIN, Role.MANAGER]}>
  <AdminPanel />
</RoleGate>
```

## Защита роутов

### ProtectedRoute

```tsx
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  permission?: Permission | Permission[];
  roles?: Role | Role[];
  children: React.ReactNode;
}

export function ProtectedRoute({
  permission,
  roles,
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasPermission, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Проверка прав
  if (permission) {
    const hasAccess = Array.isArray(permission)
      ? permission.every((p) => hasPermission(p))
      : hasPermission(permission);

    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  // Проверка ролей
  if (roles) {
    const hasRole = Array.isArray(roles)
      ? hasAnyRole(roles)
      : user?.role === roles;

    if (!hasRole) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
```

### В роутере

```tsx
// app/layout.tsx или pages/_app.tsx
const routes = [
  {
    path: "/dashboard",
    element: <Dashboard />,
    permission: Permission.MACHINES_VIEW,
  },
  {
    path: "/settings",
    element: <Settings />,
    roles: [Role.ADMIN, Role.MANAGER],
  },
  {
    path: "/finance",
    element: <FinanceModule />,
    permission: Permission.FINANCE_VIEW,
  },
];

function AppRouter() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute permission={route.permission} roles={route.roles}>
              {route.element}
            </ProtectedRoute>
          }
        />
      ))}
    </Routes>
  );
}
```

## tRPC Middleware

```typescript
// server/trpc.ts
import { TRPCError } from "@trpc/server";

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== Role.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const requirePermission = (permission: Permission) => {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userPermissions = ROLE_PERMISSIONS[ctx.user.role] || [];
    const hasPermission =
      ctx.user.role === Role.ADMIN ||
      ctx.user.permissions.includes(permission) ||
      userPermissions.includes(permission);

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Missing permission: ${permission}`,
      });
    }
    return next();
  });
};

// Использование в роутере
export const machineRouter = router({
  list: protectedProcedure.query(...),

  update: requirePermission(Permission.MACHINES_EDIT).mutation(...),

  delete: adminProcedure.mutation(...),
});
```

## Интерфейс управления

```tsx
// screens/TeamManagement.tsx
function UserPermissionsEditor({ user }: { user: User }) {
  const [permissions, setPermissions] = useState(user.permissions);
  const updateMutation = api.users.updatePermissions.useMutation();

  const allPermissions = Object.values(Permission);
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge>{user.role}</Badge>
        <span className="text-sm text-gray-500">
          (базовые права роли: {rolePermissions.length})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allPermissions.map((permission) => {
          const isRolePermission = rolePermissions.includes(permission);
          const isCustomPermission = permissions.includes(permission);

          return (
            <label
              key={permission}
              className={cn(
                "flex items-center gap-2 p-2 rounded border",
                isRolePermission && "bg-green-50 border-green-200"
              )}
            >
              <Checkbox
                checked={isRolePermission || isCustomPermission}
                disabled={isRolePermission}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setPermissions([...permissions, permission]);
                  } else {
                    setPermissions(permissions.filter((p) => p !== permission));
                  }
                }}
              />
              <span className="text-sm">{permission}</span>
              {isRolePermission && (
                <Badge variant="outline" className="text-xs">от роли</Badge>
              )}
            </label>
          );
        })}
      </div>

      <Button
        onClick={() => updateMutation.mutate({ userId: user.id, permissions })}
      >
        Сохранить права
      </Button>
    </div>
  );
}
```

## Ссылки

- `references/roles-matrix.md` - Матрица ролей и разрешений
- `references/telegram-auth.md` - Telegram аутентификация
