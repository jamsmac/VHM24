# Users & RBAC Documentation

> **Модули**: `backend/src/modules/users/`, `backend/src/modules/rbac/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система управления пользователями и контроля доступа VendHub Manager включает:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER & ACCESS MANAGEMENT                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        USERS                                 │   │
│  │  ├── 7 системных ролей (UserRole enum)                      │   │
│  │  ├── 6 статусов (UserStatus enum)                           │   │
│  │  ├── Telegram интеграция                                    │   │
│  │  ├── 2FA (TOTP)                                             │   │
│  │  ├── IP Whitelist                                           │   │
│  │  └── Workflow одобрения                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                        RBAC                                  │   │
│  │  ├── Динамические роли (Role entity)                        │   │
│  │  ├── Гранулярные permissions (Permission entity)            │   │
│  │  ├── Resource + Action модель                               │   │
│  │  └── Guards и Decorators                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Документация

| Документ | Описание |
|----------|----------|
| [01-USERS-OVERVIEW.md](./01-USERS-OVERVIEW.md) | Система пользователей: entity, роли, статусы, жизненный цикл |
| [02-RBAC-SYSTEM.md](./02-RBAC-SYSTEM.md) | RBAC: роли, permissions, guards, API |

---

## Системные роли (UserRole)

```typescript
enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',   // Полный доступ
  ADMIN = 'Admin',              // Административный доступ
  MANAGER = 'Manager',          // Управление операциями
  OPERATOR = 'Operator',        // Выполнение задач
  COLLECTOR = 'Collector',      // Инкассация
  TECHNICIAN = 'Technician',    // Техобслуживание
  VIEWER = 'Viewer',            // Только просмотр
}
```

---

## Статусы пользователей (UserStatus)

```typescript
enum UserStatus {
  PENDING = 'pending',                         // Ожидает одобрения
  ACTIVE = 'active',                           // Активен
  PASSWORD_CHANGE_REQUIRED = 'password_change_required',
  INACTIVE = 'inactive',                       // Деактивирован
  SUSPENDED = 'suspended',                     // Заблокирован
  REJECTED = 'rejected',                       // Отклонён
}
```

---

## Быстрый старт

### Создание пользователя

```bash
POST /api/users
{
  "full_name": "Иван Петров",
  "email": "ivan@example.com",
  "password": "TempPassword123!",
  "role": "Operator",
  "phone": "+998901234567"
}
```

### Проверка роли в коде

```typescript
// Декоратор для ограничения по роли
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Post()
createMachine(@Body() dto: CreateMachineDto) { ... }
```

### Проверка permission (RBAC)

```typescript
// Декоратор для гранулярных прав
@RequirePermission('machines', PermissionAction.CREATE)
@UseGuards(JwtAuthGuard, RbacRolesGuard)
@Post()
createMachine(@Body() dto: CreateMachineDto) { ... }
```

---

## API Endpoints

### Users

| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/users` | Создать пользователя |
| `GET` | `/users` | Список пользователей |
| `GET` | `/users/:id` | Получить пользователя |
| `PATCH` | `/users/:id` | Обновить пользователя |
| `DELETE` | `/users/:id` | Удалить (soft) |
| `POST` | `/users/:id/block` | Заблокировать |
| `POST` | `/users/:id/unblock` | Разблокировать |
| `POST` | `/users/:id/approve` | Одобрить заявку |
| `POST` | `/users/:id/reject` | Отклонить заявку |

### RBAC

| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/rbac/roles` | Создать роль |
| `GET` | `/rbac/roles` | Список ролей |
| `POST` | `/rbac/permissions` | Создать permission |
| `GET` | `/rbac/permissions` | Список permissions |
| `POST` | `/rbac/users/:id/roles` | Назначить роли |

---

## Безопасность

- **Пароли**: bcrypt с salt=12
- **Блокировка**: после 5 неудачных попыток на 30 минут
- **IP Whitelist**: опционально для админов
- **2FA**: TOTP (Google Authenticator)
- **Первый вход**: принудительная смена пароля

---

## Связанные модули

- **Auth** - Аутентификация, JWT токены
- **Telegram** - Регистрация через бота
- **Access Requests** - Заявки на доступ
- **Machine Access** - Доступ к конкретным аппаратам

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-AUTH-03 | Роли: SuperAdmin, Admin, Manager, Operator, Technician |
| REQ-AUTH-31 | Принудительная смена пароля при первом входе |
| REQ-AUTH-34 | Блокировка/деактивация учётных записей |
| REQ-AUTH-40 | Хеширование паролей (bcrypt, salt ≥ 10) |
| REQ-AUTH-60 | IP Whitelist для администраторов |
| REQ-AUTH-70-72 | Guards для проверки ролей |
