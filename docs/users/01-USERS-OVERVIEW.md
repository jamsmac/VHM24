# Система управления пользователями

> **Модуль**: `backend/src/modules/users/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Содержание

1. [Обзор системы](#обзор-системы)
2. [User Entity](#user-entity)
3. [Роли пользователей (UserRole)](#роли-пользователей-userrole)
4. [Статусы пользователей (UserStatus)](#статусы-пользователей-userstatus)
5. [Жизненный цикл пользователя](#жизненный-цикл-пользователя)
6. [Регистрация через Telegram](#регистрация-через-telegram)
7. [Блокировка и деактивация](#блокировка-и-деактивация)
8. [Безопасность](#безопасность)

---

## Обзор системы

### Архитектура

Система управления пользователями VendHub Manager реализует:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    USER MANAGEMENT SYSTEM                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │   Users     │───▶│   Roles     │───▶│ Permissions │              │
│  │ (Entity)    │    │ (RBAC)      │    │ (Actions)   │              │
│  └─────────────┘    └─────────────┘    └─────────────┘              │
│         │                                                            │
│         │   ┌───────────────────────────────────────┐               │
│         └──▶│           UserRole (enum)              │               │
│             │  SuperAdmin, Admin, Manager,           │               │
│             │  Operator, Collector, Technician,      │               │
│             │  Viewer                                │               │
│             └───────────────────────────────────────┘               │
│                                                                      │
│  Особенности:                                                       │
│  ├── Двухуровневая система: UserRole (быстрая) + RBAC (гибкая)     │
│  ├── Workflow одобрения через Telegram                             │
│  ├── IP Whitelist для администраторов                              │
│  ├── Блокировка при превышении попыток входа                       │
│  └── 2FA (TOTP) опционально                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Структура модуля

```
users/
├── entities/
│   └── user.entity.ts              # Основная сущность
├── services/
│   ├── username-generator.service.ts  # Генерация username
│   └── password-generator.service.ts  # Генерация паролей
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── approve-user.dto.ts
│   ├── update-ip-whitelist.dto.ts
│   └── user-response.dto.ts
├── users.service.ts
├── users.controller.ts
└── users.module.ts
```

---

## User Entity

### Файл

`backend/src/modules/users/entities/user.entity.ts`

### Схема таблицы

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Основные данные
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,

    -- Роль и статус
    role VARCHAR(20) NOT NULL DEFAULT 'Viewer',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    -- Telegram интеграция
    telegram_user_id VARCHAR(50) UNIQUE,
    telegram_username VARCHAR(100),

    -- 2FA
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret TEXT,

    -- Безопасность входа
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    last_failed_login_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,

    -- IP Whitelist
    ip_whitelist_enabled BOOLEAN DEFAULT FALSE,
    allowed_ips TEXT[],

    -- Первый вход
    password_changed_by_user BOOLEAN DEFAULT FALSE,
    requires_password_change BOOLEAN DEFAULT FALSE,

    -- Workflow одобрения
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by_id UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Токены
    refresh_token TEXT,

    -- Настройки
    settings JSONB,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_users_telegram ON users(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
```

### TypeScript Entity

```typescript
@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
@Index(['telegram_user_id'], { unique: true, where: 'telegram_user_id IS NOT NULL' })
@Index(['username'], { unique: true, where: 'username IS NOT NULL' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  full_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', select: false })
  password_hash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // Telegram
  @Column({ type: 'varchar', length: 50, nullable: true })
  telegram_user_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  // 2FA
  @Column({ type: 'boolean', default: false })
  is_2fa_enabled: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  two_fa_secret: string | null;

  // Security
  @Column({ type: 'integer', default: 0 })
  failed_login_attempts: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  account_locked_until: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'inet', nullable: true })
  last_login_ip: string | null;

  // IP Whitelist (REQ-AUTH-60)
  @Column({ type: 'boolean', default: false })
  ip_whitelist_enabled: boolean;

  @Column({ type: 'simple-array', nullable: true })
  allowed_ips: string[] | null;

  // First login (REQ-AUTH-31)
  @Column({ type: 'boolean', default: false })
  requires_password_change: boolean;

  @Column({ type: 'boolean', default: false })
  password_changed_by_user: boolean;

  // Approval workflow
  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  rejected_by_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // Token
  @Column({ type: 'text', nullable: true, select: false })
  refresh_token: string | null;

  // Settings
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;

  // RBAC roles (many-to-many)
  @ManyToMany(() => Role, { eager: false })
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  // Computed property
  get isLocked(): boolean {
    if (!this.account_locked_until) return false;
    return new Date() < this.account_locked_until;
  }
}
```

---

## Роли пользователей (UserRole)

### Enum определение

```typescript
export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',   // Полный доступ ко всему
  ADMIN = 'Admin',              // Административный доступ
  MANAGER = 'Manager',          // Управление операциями
  OPERATOR = 'Operator',        // Выполнение задач (пополнение)
  COLLECTOR = 'Collector',      // Инкассация
  TECHNICIAN = 'Technician',    // Техническое обслуживание
  VIEWER = 'Viewer',            // Только просмотр
}
```

### Матрица прав доступа

| Роль | Пользователи | Аппараты | Задачи | Инвентарь | Финансы | Настройки |
|------|--------------|----------|--------|-----------|---------|-----------|
| SuperAdmin | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| Admin | CRUD | CRUD | CRUD | CRUD | CRUD | RU |
| Manager | R | CRUD | CRUD | CRUD | RU | R |
| Operator | - | R | RU (свои) | R | - | - |
| Collector | - | R | RU (свои) | - | R | - |
| Technician | - | R | RU (свои) | R | - | - |
| Viewer | - | R | R | R | R | - |

**Легенда**: C = Create, R = Read, U = Update, D = Delete

### Иерархия ролей

```
             ┌───────────────┐
             │  SUPER_ADMIN  │
             └───────┬───────┘
                     │
             ┌───────▼───────┐
             │     ADMIN     │
             └───────┬───────┘
                     │
             ┌───────▼───────┐
             │    MANAGER    │
             └───────┬───────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐      ┌─────▼─────┐    ┌─────▼──────┐
│OPERATOR│     │ COLLECTOR │    │ TECHNICIAN │
└───┬───┘      └─────┬─────┘    └─────┬──────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
             ┌───────▼───────┐
             │    VIEWER     │
             └───────────────┘
```

---

## Статусы пользователей (UserStatus)

### Enum определение

```typescript
export enum UserStatus {
  PENDING = 'pending',                         // Ожидает одобрения
  ACTIVE = 'active',                           // Активен
  PASSWORD_CHANGE_REQUIRED = 'password_change_required', // Требуется смена пароля
  INACTIVE = 'inactive',                       // Деактивирован
  SUSPENDED = 'suspended',                     // Заблокирован
  REJECTED = 'rejected',                       // Заявка отклонена
}
```

### Диаграмма переходов состояний

```
                    ┌───────────────┐
    Telegram ──────▶│   PENDING     │◀────── Создание админом
    /start          └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             │
      ┌───────────┐   ┌───────────┐       │
      │  ACTIVE   │   │ REJECTED  │       │
      └─────┬─────┘   └───────────┘       │
            │                             │
    ┌───────┼───────┬─────────────────────┘
    │       │       │
    ▼       ▼       ▼
┌─────────┐ │  ┌───────────┐
│SUSPENDED│ │  │ INACTIVE  │
└────┬────┘ │  └─────┬─────┘
     │      │        │
     └──────┴────────┘
            │
            ▼
      ┌───────────┐
      │  ACTIVE   │ (восстановление)
      └───────────┘
```

### Описание статусов

| Статус | Может войти? | Описание |
|--------|--------------|----------|
| `PENDING` | ❌ | Пользователь ожидает одобрения администратором |
| `ACTIVE` | ✅ | Активный пользователь с полным доступом |
| `PASSWORD_CHANGE_REQUIRED` | ⚠️ | Может войти, но перенаправлен на смену пароля |
| `INACTIVE` | ❌ | Деактивирован, но данные сохранены |
| `SUSPENDED` | ❌ | Временно заблокирован (возможно с ограничением по времени) |
| `REJECTED` | ❌ | Заявка отклонена |

---

## Жизненный цикл пользователя

### Создание администратором

```typescript
// 1. Админ создаёт пользователя
async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
  // Проверка уникальности email/phone
  const existingUser = await this.userRepository.findOne({
    where: { email: createUserDto.email },
  });
  if (existingUser) {
    throw new ConflictException('Email уже существует');
  }

  // Хеширование пароля (bcrypt, salt=12)
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(createUserDto.password, salt);

  // Создание с флагом requires_password_change
  const user = this.userRepository.create({
    ...createUserDto,
    password_hash,
    status: UserStatus.ACTIVE,
    requires_password_change: true,  // REQ-AUTH-31
  });

  return await this.userRepository.save(user);
}
```

### Первый вход

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ПЕРВЫЙ ВХОД ПОЛЬЗОВАТЕЛЯ                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Пользователь вводит временный пароль                           │
│     │                                                               │
│     ▼                                                               │
│  2. Проверка: requires_password_change === true?                   │
│     │                                                               │
│     ├── Да: Перенаправление на /change-password                    │
│     │       └── После смены: requires_password_change = false      │
│     │           password_changed_by_user = true                    │
│     │                                                               │
│     └── Нет: Обычный вход                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Регистрация через Telegram

### Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TELEGRAM REGISTRATION FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Пользователь отправляет /start боту                            │
│     │                                                               │
│     ▼                                                               │
│  2. Бот проверяет: существует ли TelegramUser?                     │
│     │                                                               │
│     ├── Да (verified): Показать главное меню                       │
│     │                                                               │
│     └── Нет: Создать AccessRequest + User (PENDING)                │
│              │                                                      │
│              ▼                                                      │
│  3. Уведомление админам с кнопками Approve/Reject                  │
│     │                                                               │
│     ├── APPROVE:                                                   │
│     │   ├── Генерация username из full_name                        │
│     │   ├── Генерация временного пароля                            │
│     │   ├── status = ACTIVE                                        │
│     │   ├── requires_password_change = true                        │
│     │   └── Отправка credentials в Telegram                        │
│     │                                                               │
│     └── REJECT:                                                    │
│         ├── status = REJECTED                                      │
│         ├── rejection_reason = "..."                               │
│         └── Уведомление пользователю                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Код одобрения

```typescript
async approveUser(
  userId: string,
  approveUserDto: ApproveUserDto,
  adminId: string,
): Promise<{ user: User; credentials: { username: string; password: string } }> {
  const user = await this.findOneEntity(userId);

  if (user.status !== UserStatus.PENDING) {
    throw new BadRequestException('Only pending users can be approved');
  }

  // Генерация credentials
  const username = await this.usernameGeneratorService.generateUsername(user.full_name);
  const tempPassword = this.passwordGeneratorService.generatePassword();

  // Хеширование
  const salt = await bcrypt.genSalt(12);
  const password_hash = await bcrypt.hash(tempPassword, salt);

  // Обновление пользователя
  user.username = username;
  user.password_hash = password_hash;
  user.role = approveUserDto.role;
  user.status = UserStatus.ACTIVE;
  user.requires_password_change = true;
  user.approved_by_id = adminId;
  user.approved_at = new Date();

  const savedUser = await this.userRepository.save(user);

  return {
    user: savedUser,
    credentials: { username, password: tempPassword },
  };
}
```

### Генерация username

```typescript
// username-generator.service.ts
async generateUsername(fullName: string): Promise<string> {
  // "Иван Петров" → "ivan.petrov"
  const transliterated = this.transliterate(fullName);
  const base = transliterated.toLowerCase().replace(/\s+/g, '.');

  // Проверка уникальности
  let username = base;
  let counter = 1;

  while (await this.usersService.findByUsername(username)) {
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}
```

---

## Блокировка и деактивация

### Временная блокировка (Suspend)

```typescript
// REQ-AUTH-34: Блокировка учётной записи
async blockUser(
  userId: string,
  reason?: string,
  durationMinutes?: number,
): Promise<UserResponseDto> {
  const user = await this.findOneEntity(userId);

  // Установить статус SUSPENDED
  user.status = UserStatus.SUSPENDED;

  // Опционально: время блокировки
  if (durationMinutes) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + durationMinutes);
    user.account_locked_until = lockUntil;
  }

  // Инвалидация refresh token (принудительный logout)
  user.refresh_token = null;

  // Сохранение причины
  if (reason) {
    user.settings = {
      ...user.settings,
      block_reason: reason,
      blocked_at: new Date().toISOString(),
    };
  }

  return await this.userRepository.save(user);
}
```

### Разблокировка

```typescript
async unblockUser(userId: string): Promise<UserResponseDto> {
  const user = await this.findOneEntity(userId);

  user.status = UserStatus.ACTIVE;
  user.account_locked_until = null;
  user.failed_login_attempts = 0;
  user.last_failed_login_at = null;

  // Очистка причины блокировки
  if (user.settings?.block_reason) {
    const { block_reason, blocked_at, ...otherSettings } = user.settings;
    user.settings = otherSettings;
  }

  return await this.userRepository.save(user);
}
```

### Деактивация (мягкое удаление)

```typescript
// REQ-AUTH-34: Деактивация без удаления истории
async deactivateUser(userId: string): Promise<UserResponseDto> {
  const user = await this.findOneEntity(userId);

  user.status = UserStatus.INACTIVE;
  user.refresh_token = null;  // Logout

  user.settings = {
    ...user.settings,
    deactivated_at: new Date().toISOString(),
  };

  return await this.userRepository.save(user);
}
```

---

## Безопасность

### Хеширование паролей

```typescript
// Bcrypt с salt factor 12
const salt = await bcrypt.genSalt(12);
const password_hash = await bcrypt.hash(password, salt);

// Проверка пароля
async validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}
```

### Защита от брутфорса

```typescript
// При неудачной попытке входа
user.failed_login_attempts++;
user.last_failed_login_at = new Date();

// Блокировка после 5 попыток
if (user.failed_login_attempts >= 5) {
  const lockUntil = new Date();
  lockUntil.setMinutes(lockUntil.getMinutes() + 30); // 30 минут
  user.account_locked_until = lockUntil;
}

// Проверка блокировки
get isLocked(): boolean {
  if (!this.account_locked_until) return false;
  return new Date() < this.account_locked_until;
}
```

### IP Whitelist (REQ-AUTH-60)

```typescript
// Обновление whitelist
async updateIpWhitelist(
  userId: string,
  dto: UpdateIpWhitelistDto,
): Promise<UserResponseDto> {
  const user = await this.findOneEntity(userId);

  // Валидация: если включен, должен быть хотя бы один IP
  if (dto.ip_whitelist_enabled && (!dto.allowed_ips || dto.allowed_ips.length === 0)) {
    throw new BadRequestException('При включенном IP Whitelist нужен хотя бы один IP');
  }

  user.ip_whitelist_enabled = dto.ip_whitelist_enabled;
  user.allowed_ips = dto.allowed_ips || null;

  return await this.userRepository.save(user);
}

// Проверка при входе (в auth guard)
if (user.ip_whitelist_enabled && user.allowed_ips?.length) {
  const clientIp = request.ip;
  if (!user.allowed_ips.includes(clientIp)) {
    throw new ForbiddenException('IP address not allowed');
  }
}
```

### Скрытые поля

```typescript
// Поля с select: false не возвращаются по умолчанию
@Column({ type: 'text', select: false })
password_hash: string;

@Column({ type: 'text', nullable: true, select: false })
two_fa_secret: string | null;

@Column({ type: 'text', nullable: true, select: false })
refresh_token: string | null;

// Явное включение для аутентификации
async findByEmail(email: string): Promise<User | null> {
  return this.userRepository
    .createQueryBuilder('user')
    .where('user.email = :email', { email })
    .addSelect('user.password_hash')
    .addSelect('user.two_fa_secret')
    .addSelect('user.refresh_token')
    .getOne();
}
```

---

## См. также

- [02-RBAC-SYSTEM.md](./02-RBAC-SYSTEM.md) - Система ролей и разрешений
- [../auth/README.md](../auth/README.md) - Аутентификация
- [../tasks/README.md](../tasks/README.md) - Система задач
