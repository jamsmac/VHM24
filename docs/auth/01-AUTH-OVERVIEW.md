# VendHub Manager - Аутентификация: Обзор Архитектуры

> **Версия**: 2.0.0
> **Обновлено**: 2025-12-20
> **Исходный код**: `backend/src/modules/auth/`

---

## Содержание

1. [Общая Архитектура](#1-общая-архитектура)
2. [Двойная Платформа](#2-двойная-платформа)
3. [JWT Токены](#3-jwt-токены)
4. [Модель Пользователя](#4-модель-пользователя)
5. [Роли и Статусы](#5-роли-и-статусы)
6. [Хранение Паролей](#6-хранение-паролей)
7. [Конфигурация](#7-конфигурация)
8. [Зависимости Сервисов](#8-зависимости-сервисов)

---

## 1. Общая Архитектура

### 1.1 Компоненты Системы Аутентификации

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION ARCHITECTURE                               │
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │  AuthController │───►│   AuthService   │───►│  UsersService   │             │
│  │                 │    │                 │    │                 │             │
│  │ - login         │    │ - validateUser  │    │ - findByEmail   │             │
│  │ - register      │    │ - login         │    │ - findById      │             │
│  │ - refresh       │    │ - register      │    │ - create        │             │
│  │ - logout        │    │ - refreshTokens │    │ - updatePassword│             │
│  │ - 2fa/*         │    │ - logout        │    │                 │             │
│  │ - sessions/*    │    │ - changePassword│    └─────────────────┘             │
│  │ - password/*    │    │                 │                                     │
│  └─────────────────┘    └────────┬────────┘                                     │
│                                  │                                               │
│           ┌──────────────────────┼──────────────────────┐                       │
│           │                      │                      │                       │
│           ▼                      ▼                      ▼                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ SessionService  │    │TwoFactorService │    │TokenBlacklist   │             │
│  │                 │    │                 │    │    Service      │             │
│  │ - createSession │    │ - generateSecret│    │                 │             │
│  │ - rotateToken   │    │ - enable2FA     │    │ - blacklistToken│             │
│  │ - revokeSession │    │ - verifyToken   │    │ - isBlacklisted │             │
│  │ - getActiveSess │    │ - disable2FA    │    │ - shouldReject  │             │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘             │
│           │                      │                      │                       │
│           ▼                      ▼                      ▼                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   PostgreSQL    │    │   PostgreSQL    │    │     Redis       │             │
│  │  (sessions)     │    │ (2fa secrets)   │    │  (blacklist)    │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Файловая Структура Модуля

```
backend/src/modules/auth/
├── auth.module.ts                    # Главный модуль
├── auth.controller.ts                # REST API контроллер (589 строк)
├── auth.service.ts                   # Основная логика (877 строк)
│
├── dto/                              # Data Transfer Objects
│   ├── login.dto.ts                  # Валидация входа
│   ├── register.dto.ts               # Валидация регистрации
│   ├── refresh-token.dto.ts          # Обновление токенов
│   ├── enable-2fa.dto.ts             # Включение 2FA
│   ├── verify-2fa.dto.ts             # Проверка 2FA кода
│   ├── verify-backup-code.dto.ts     # Резервный код
│   ├── request-password-reset.dto.ts # Запрос сброса пароля
│   ├── validate-reset-token.dto.ts   # Проверка токена сброса
│   ├── reset-password.dto.ts         # Новый пароль
│   ├── first-login-change-password.dto.ts # Первый вход
│   └── auth-response.dto.ts          # Ответы API
│
├── entities/
│   └── password-reset-token.entity.ts # Токены сброса пароля
│
├── guards/                           # Защитные механизмы
│   ├── jwt-auth.guard.ts             # JWT проверка
│   ├── local-auth.guard.ts           # Логин/пароль
│   ├── roles.guard.ts                # Проверка ролей
│   └── ip-whitelist.guard.ts         # Белый список IP
│
├── strategies/                       # Passport стратегии
│   ├── jwt.strategy.ts               # JWT валидация
│   └── local.strategy.ts             # Email/пароль
│
├── decorators/
│   ├── current-user.decorator.ts     # @CurrentUser()
│   ├── roles.decorator.ts            # @Roles()
│   └── public.decorator.ts           # @Public()
│
└── services/                         # Вспомогательные сервисы
    ├── session.service.ts            # Управление сессиями (320 строк)
    ├── two-factor-auth.service.ts    # TOTP 2FA (349 строк)
    ├── token-blacklist.service.ts    # Redis blacklist (238 строк)
    └── cookie.service.ts             # Управление cookies
```

---

## 2. Двойная Платформа

VendHub Manager использует **две раздельные системы аутентификации**:

### 2.1 Сравнение Платформ

| Характеристика | Staff Platform | Client Platform |
|----------------|----------------|-----------------|
| **Пользователи** | Операторы, менеджеры, админы | Покупатели |
| **Таблица** | `users` | `client_users` |
| **Метод входа** | Email + пароль | Telegram initData |
| **2FA** | TOTP (опционально) | Нет |
| **Токены** | Access (15 мин) + Refresh (7 дней) | Один токен |
| **Сессии** | До 5 параллельных | Нет ограничений |
| **Cookies** | httpOnly Secure | Нет |
| **API префикс** | `/api/auth/*` | `/api/client/auth` |

### 2.2 Диаграмма Разделения

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          VendHub Manager                                  │
│                                                                          │
│  ┌────────────────────────────┐    ┌────────────────────────────┐       │
│  │      STAFF PLATFORM        │    │     CLIENT PLATFORM        │       │
│  │                            │    │                            │       │
│  │  Аутентификация:           │    │  Аутентификация:           │       │
│  │  ┌──────────────────────┐  │    │  ┌──────────────────────┐  │       │
│  │  │ POST /api/auth/login │  │    │  │POST /api/client/auth │  │       │
│  │  │ {email, password}    │  │    │  │ {initData}           │  │       │
│  │  └──────────────────────┘  │    │  └──────────────────────┘  │       │
│  │                            │    │                            │       │
│  │  Guards:                   │    │  Guards:                   │       │
│  │  - JwtAuthGuard            │    │  - ClientAuthGuard         │       │
│  │  - RolesGuard              │    │                            │       │
│  │  - IpWhitelistGuard        │    │  Валидация:                │       │
│  │                            │    │  - HMAC-SHA256 подпись     │       │
│  │  Токены:                   │    │  - Bot token secret        │       │
│  │  - access_token (15 min)   │    │  - auth_date freshness     │       │
│  │  - refresh_token (7 days)  │    │                            │       │
│  │  - Unique JTI per token    │    │  Токен:                    │       │
│  │                            │    │  - type: 'client_access'   │       │
│  │  Хранение:                 │    │  - telegram_id             │       │
│  │  - httpOnly Secure cookies │    │                            │       │
│  │  - Response body (backup)  │    │  Хранение:                 │       │
│  │                            │    │  - Client-side storage     │       │
│  │  Entity: User              │    │                            │       │
│  │  - 141 строка              │    │  Entity: ClientUser        │       │
│  │  - 26 полей                │    │  - telegram_id             │       │
│  │                            │    │  - points_balance          │       │
│  └────────────────────────────┘    │  - level                   │       │
│                                    └────────────────────────────┘       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     SHARED INFRASTRUCTURE                         │   │
│  │                                                                   │   │
│  │  • JWT_SECRET - один ключ для подписи всех токенов               │   │
│  │  • Redis - хранение blacklist и сессий                           │   │
│  │  • PostgreSQL - основная база данных                             │   │
│  │  • Audit Logs - логирование всех событий                         │   │
│  │  • Rate Limiting - защита от перебора (@nestjs/throttler)        │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. JWT Токены

### 3.1 Структура Access Token

```typescript
// Payload access_token (декодированный)
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user.id (UUID)
  "email": "operator@vendhub.com",                 // user.email
  "role": "Operator",                              // user.role (UserRole enum)
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // Уникальный ID токена
  "type": "access",                                // Тип токена
  "iat": 1703001234,                               // Issued At (Unix timestamp)
  "exp": 1703002134                                // Expiration (iat + 900 сек = 15 мин)
}
```

### 3.2 Структура Refresh Token

```typescript
// Payload refresh_token (декодированный)
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // user.id (UUID)
  "jti": "f0e1d2c3-b4a5-9687-0123-456789abcdef",  // Уникальный ID (другой чем access)
  "type": "refresh",                               // Тип токена
  "iat": 1703001234,                               // Issued At
  "exp": 1703606034                                // Expiration (iat + 604800 сек = 7 дней)
}
```

### 3.3 Генерация Токенов (auth.service.ts:100-150)

```typescript
// Код из auth.service.ts
private generateTokens(user: User): AuthTokens {
  // Генерация уникальных JTI для каждого токена
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const accessPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: accessJti,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    sub: user.id,
    jti: refreshJti,
    type: 'refresh',
  };

  return {
    access_token: this.jwtService.sign(accessPayload, {
      expiresIn: '15m',  // JWT_ACCESS_EXPIRATION
    }),
    refresh_token: this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',   // JWT_REFRESH_EXPIRATION
    }),
  };
}
```

### 3.4 Уникальный JTI (JWT ID)

**Зачем нужен JTI?**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TOKEN REVOCATION FLOW                        │
│                                                                      │
│  1. Пользователь выходит из системы (logout)                        │
│                                                                      │
│  2. Сервер добавляет JTI токена в Redis blacklist:                  │
│     KEY: vendhub:blacklist:token:{jti}                              │
│     VALUE: {"userId": "...", "reason": "logout", "revokedAt": "..."}│
│     TTL: 7 дней (время жизни refresh token)                         │
│                                                                      │
│  3. При каждом запросе с этим токеном:                              │
│     - JwtStrategy извлекает JTI из payload                          │
│     - Проверяет Redis: EXISTS vendhub:blacklist:token:{jti}         │
│     - Если найден -> 401 Unauthorized                               │
│                                                                      │
│  Преимущества:                                                       │
│  ✓ Мгновенный отзыв токена (без ожидания истечения)                 │
│  ✓ O(1) проверка в Redis                                            │
│  ✓ Автоматическая очистка через TTL                                 │
│  ✓ Поддержка batch revocation (все токены пользователя)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Cookie Settings (cookie.service.ts)

```typescript
// Настройки cookies для токенов
const cookieOptions = {
  httpOnly: true,        // Недоступен через JavaScript (XSS защита)
  secure: true,          // Только HTTPS
  sameSite: 'strict',    // Защита от CSRF
  path: '/',             // Для access_token
  // path: '/auth'        // Для refresh_token (только auth endpoints)
};

// Access Token Cookie
res.cookie('access_token', accessToken, {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,  // 15 минут в миллисекундах
});

// Refresh Token Cookie
res.cookie('refresh_token', refreshToken, {
  ...cookieOptions,
  path: '/auth',           // Ограничен только auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 дней в миллисекундах
});
```

---

## 4. Модель Пользователя

### 4.1 Entity User (user.entity.ts)

```typescript
@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['telegram_user_id'], { unique: true, where: 'telegram_user_id IS NOT NULL' })
@Index(['username'], { unique: true, where: 'username IS NOT NULL' })
export class User extends BaseEntity {
  // ═══════════════════════════════════════════════════════════════
  // ОСНОВНЫЕ ПОЛЯ
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 100 })
  full_name: string;                    // ФИО пользователя

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;                        // Email (уникальный)

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string | null;              // Логин (опционально)

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;                 // Телефон (опционально)

  // ═══════════════════════════════════════════════════════════════
  // АУТЕНТИФИКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'text', select: false })
  password_hash: string;                // bcrypt hash (НЕ возвращается в запросах)

  @Column({ type: 'boolean', default: false })
  password_changed_by_user: boolean;    // Пользователь менял пароль?

  @Column({ type: 'boolean', default: false })
  requires_password_change: boolean;    // Требуется смена при входе (REQ-AUTH-31)

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string | null;         // Текущий refresh token hash

  // ═══════════════════════════════════════════════════════════════
  // ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'boolean', default: false })
  is_2fa_enabled: boolean;              // 2FA включена?

  @Column({ type: 'text', nullable: true, select: false })
  two_fa_secret: string | null;         // TOTP секрет (зашифрован AES-256-GCM)

  // ═══════════════════════════════════════════════════════════════
  // РОЛИ И СТАТУС
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;                       // Системная роль

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;                   // Статус аккаунта

  // RBAC - связь many-to-many с ролями
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  // ═══════════════════════════════════════════════════════════════
  // БЕЗОПАСНОСТЬ - BRUTE FORCE PROTECTION
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'integer', default: 0 })
  failed_login_attempts: number;        // Счётчик неудачных попыток

  @Column({ type: 'timestamp with time zone', nullable: true })
  account_locked_until: Date | null;    // Блокировка до (15 мин после 5 попыток)

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_failed_login_at: Date | null;    // Последняя неудачная попытка

  // ═══════════════════════════════════════════════════════════════
  // БЕЗОПАСНОСТЬ - IP WHITELIST (REQ-AUTH-60)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'boolean', default: false })
  ip_whitelist_enabled: boolean;        // Включён белый список IP?

  @Column({ type: 'simple-array', nullable: true })
  allowed_ips: string[] | null;         // Разрешённые IP адреса

  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 50, nullable: true })
  telegram_user_id: string | null;      // Telegram ID пользователя

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;     // @username в Telegram

  // ═══════════════════════════════════════════════════════════════
  // МЕТАДАННЫЕ
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date | null;           // Последний вход

  @Column({ type: 'inet', nullable: true })
  last_login_ip: string | null;         // IP последнего входа

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null; // Пользовательские настройки

  // ═══════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;        // Кто одобрил

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;             // Когда одобрили

  @Column({ type: 'uuid', nullable: true })
  rejected_by_id: string | null;        // Кто отклонил

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;             // Когда отклонили

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;      // Причина отклонения

  // ═══════════════════════════════════════════════════════════════
  // COMPUTED PROPERTY
  // ═══════════════════════════════════════════════════════════════

  get isLocked(): boolean {
    if (!this.account_locked_until) return false;
    return new Date() < this.account_locked_until;
  }
}
```

### 4.2 Связи Между Таблицами

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   user_roles    │       │     roles       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ user_id (FK)    │       │ id (PK)         │
│ email           │       │ role_id (FK)    │──────►│ name            │
│ password_hash   │       └─────────────────┘       │ permissions     │
│ role (enum)     │                                 └─────────────────┘
│ status (enum)   │
│ is_2fa_enabled  │       ┌─────────────────┐
│ two_fa_secret   │       │    sessions     │
│ ...             │◄──────│ user_id (FK)    │
└─────────────────┘       │ refresh_token_  │
                          │   hash          │
                          │ ip_address      │
                          │ user_agent      │
                          │ expires_at      │
                          └─────────────────┘
```

---

## 5. Роли и Статусы

### 5.1 Системные Роли (UserRole)

```typescript
export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',   // Полный доступ ко всему
  ADMIN = 'Admin',              // Администратор (управление пользователями)
  MANAGER = 'Manager',          // Менеджер (управление операциями)
  OPERATOR = 'Operator',        // Оператор (выполнение задач)
  COLLECTOR = 'Collector',      // Инкассатор (сбор денег)
  TECHNICIAN = 'Technician',    // Техник (обслуживание)
  VIEWER = 'Viewer',            // Только просмотр (по умолчанию)
}
```

### 5.2 Иерархия Ролей

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ROLE HIERARCHY                               │
│                                                                      │
│  SuperAdmin ─────────────────────────────────────────────────────►  │
│      │     Полный доступ: все модули, все действия                  │
│      │                                                               │
│      ▼                                                               │
│    Admin ───────────────────────────────────────────────────────►   │
│      │   Управление: пользователи, роли, настройки системы          │
│      │                                                               │
│      ▼                                                               │
│   Manager ──────────────────────────────────────────────────────►   │
│      │   Операции: задачи, инвентарь, машины, отчёты                │
│      │                                                               │
│      ├──────────────┬──────────────┬──────────────┐                 │
│      ▼              ▼              ▼              ▼                 │
│  Operator      Collector      Technician      Viewer                │
│  Задачи:       Задачи:        Задачи:         Только                │
│  пополнение    инкассация     ремонт,         чтение                │
│                               обслуживание                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Статусы Пользователей (UserStatus)

```typescript
export enum UserStatus {
  PENDING = 'pending',                      // Ожидает одобрения
  ACTIVE = 'active',                        // Активен (может входить)
  PASSWORD_CHANGE_REQUIRED = 'password_change_required',  // Требуется смена пароля
  INACTIVE = 'inactive',                    // Неактивен (временно отключен)
  SUSPENDED = 'suspended',                  // Заблокирован
  REJECTED = 'rejected',                    // Заявка отклонена
}
```

### 5.4 Диаграмма Переходов Статусов

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER STATUS TRANSITIONS                         │
│                                                                      │
│                    ┌───────────────┐                                │
│     Регистрация    │    PENDING    │◄──────── Новая заявка          │
│         │          └───────┬───────┘                                │
│         │                  │                                        │
│         │     ┌────────────┼────────────┐                          │
│         │     │            │            │                          │
│         │     ▼            ▼            ▼                          │
│         │ ┌───────┐   ┌────────┐   ┌──────────┐                    │
│         │ │REJECTED│   │ ACTIVE │   │PASSWORD_ │                    │
│         │ └───────┘   └────┬───┘   │CHANGE_   │                    │
│         │                  │       │REQUIRED  │                    │
│         │                  │       └─────┬────┘                    │
│         │                  │             │                          │
│         │                  │◄────────────┘  После смены пароля     │
│         │                  │                                        │
│         │     ┌────────────┼────────────┐                          │
│         │     │            │            │                          │
│         │     ▼            ▼            ▼                          │
│         │ ┌────────┐   ┌────────┐   ┌─────────┐                    │
│         │ │INACTIVE│◄─►│ ACTIVE │◄─►│SUSPENDED│                    │
│         │ └────────┘   └────────┘   └─────────┘                    │
│         │                                                           │
│         │  Админ может переключать между ACTIVE/INACTIVE/SUSPENDED │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Хранение Паролей

### 6.1 Bcrypt Хеширование

```typescript
// auth.service.ts - хеширование пароля
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;  // Рекомендуемое значение (REQ-AUTH-40)

// При регистрации/смене пароля
async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

// При проверке пароля
async validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 6.2 Формат Bcrypt Hash

```
$2b$10$N9qo8uLOickgx2ZMRZoMye.qKQm9T7.K5k8pqj3/Q8u6CpWLH7kke
 │  │  └──────────────────────┬─────────────────────────────────┘
 │  │                         └── Соль (22 символа) + Hash (31 символ)
 │  └── Cost Factor (10 = 2^10 = 1024 итерации)
 └── Версия алгоритма (2b = современный bcrypt)
```

### 6.3 Безопасность Паролей

| Параметр | Значение | Описание |
|----------|----------|----------|
| Алгоритм | bcrypt | Устойчив к GPU/ASIC атакам |
| Salt Rounds | 10 | ~100ms на хеширование |
| Минимальная длина | 8 символов | class-validator @MinLength |
| Хранение | PostgreSQL TEXT | Никогда не возвращается клиенту |

---

## 7. Конфигурация

### 7.1 Переменные Окружения

```bash
# ═══════════════════════════════════════════════════════════════
# JWT Configuration
# ═══════════════════════════════════════════════════════════════
JWT_SECRET=your-super-secret-key-min-32-chars    # Секрет подписи
JWT_ACCESS_EXPIRATION=15m                        # Время жизни access token
JWT_REFRESH_EXPIRATION=7d                        # Время жизни refresh token
JWT_REFRESH_EXPIRATION_SECONDS=604800            # 7 дней в секундах

# ═══════════════════════════════════════════════════════════════
# Security Configuration
# ═══════════════════════════════════════════════════════════════
BCRYPT_SALT_ROUNDS=10                            # bcrypt сложность
BRUTE_FORCE_MAX_ATTEMPTS=5                       # Попыток до блокировки
BRUTE_FORCE_LOCKOUT_MINUTES=15                   # Время блокировки

# ═══════════════════════════════════════════════════════════════
# 2FA Configuration
# ═══════════════════════════════════════════════════════════════
TWO_FA_APP_NAME=VendHub                          # Имя в authenticator
TWO_FA_ENCRYPTION_KEY=32-byte-encryption-key     # AES-256 ключ

# ═══════════════════════════════════════════════════════════════
# Redis Configuration
# ═══════════════════════════════════════════════════════════════
REDIS_URL=redis://localhost:6379                 # Или отдельные:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ═══════════════════════════════════════════════════════════════
# Telegram Bot (для Client Platform)
# ═══════════════════════════════════════════════════════════════
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...             # Bot token
```

### 7.2 Значения По Умолчанию

```typescript
// Из исходного кода auth.service.ts
const defaults = {
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  JWT_REFRESH_EXPIRATION_SECONDS: 7 * 24 * 60 * 60,  // 604800
  BCRYPT_SALT_ROUNDS: 10,
  BRUTE_FORCE_MAX_ATTEMPTS: 5,
  BRUTE_FORCE_LOCKOUT_MINUTES: 15,
  MAX_SESSIONS_PER_USER: 5,
  SESSION_EXPIRATION_DAYS: 7,
};
```

---

## 8. Зависимости Сервисов

### 8.1 Граф Зависимостей

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE DEPENDENCY GRAPH                          │
│                                                                      │
│  AuthModule                                                          │
│      │                                                               │
│      ├──► JwtModule.registerAsync({                                 │
│      │      secret: JWT_SECRET,                                      │
│      │      signOptions: { expiresIn: '15m' }                       │
│      │    })                                                         │
│      │                                                               │
│      ├──► PassportModule.register({ defaultStrategy: 'jwt' })       │
│      │                                                               │
│      ├──► UsersModule (forwardRef - circular dependency)            │
│      │                                                               │
│      ├──► ConfigModule                                               │
│      │                                                               │
│      └──► TypeOrmModule.forFeature([                                │
│             User, Session, PasswordResetToken                        │
│           ])                                                         │
│                                                                      │
│  AuthService                                                         │
│      │                                                               │
│      ├──► JwtService (генерация/верификация токенов)                │
│      ├──► UsersService (поиск/обновление пользователей)             │
│      ├──► SessionService (управление сессиями)                      │
│      ├──► TwoFactorAuthService (2FA операции)                       │
│      ├──► TokenBlacklistService (Redis blacklist)                   │
│      ├──► AuditLogService (логирование событий)                     │
│      └──► EmailService (отправка писем сброса пароля)               │
│                                                                      │
│  SessionService                                                      │
│      │                                                               │
│      ├──► Repository<Session> (TypeORM)                             │
│      └──► ConfigService                                              │
│                                                                      │
│  TwoFactorAuthService                                                │
│      │                                                               │
│      ├──► UsersService                                               │
│      ├──► ConfigService                                              │
│      └──► AuditLogService                                            │
│                                                                      │
│  TokenBlacklistService                                               │
│      │                                                               │
│      ├──► Redis (ioredis)                                            │
│      └──► ConfigService                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Внешние Библиотеки

| Библиотека | Версия | Назначение |
|------------|--------|------------|
| `@nestjs/jwt` | ^10.x | JWT генерация/валидация |
| `@nestjs/passport` | ^10.x | Стратегии аутентификации |
| `passport-jwt` | ^4.x | JWT стратегия |
| `passport-local` | ^1.x | Email/пароль стратегия |
| `bcrypt` | ^5.x | Хеширование паролей |
| `otplib` | ^12.x | TOTP генерация/валидация |
| `qrcode` | ^1.x | Генерация QR кодов |
| `ioredis` | ^5.x | Redis клиент |
| `@nestjs/throttler` | ^5.x | Rate limiting |
| `uuid` | ^9.x | Генерация UUID (JTI) |
| `ua-parser-js` | ^1.x | Парсинг User-Agent |

---

## Следующий Документ

➡️ [02-AUTH-LOGIN-FLOWS.md](./02-AUTH-LOGIN-FLOWS.md) - Все сценарии входа в систему

---

**Версия документа**: 2.0.0
**Создан**: 2025-12-20
**Автор**: VendHub Development Team
