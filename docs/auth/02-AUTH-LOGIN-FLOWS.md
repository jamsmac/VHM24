# VendHub Manager - Сценарии Входа в Систему

> **Версия**: 2.0.0
> **Обновлено**: 2025-12-20
> **Исходный код**: `backend/src/modules/auth/auth.service.ts`

---

## Содержание

1. [Обзор Процесса Входа](#1-обзор-процесса-входа)
2. [Сценарий 1: Успешный Вход](#2-сценарий-1-успешный-вход)
3. [Сценарий 2: Вход с 2FA](#3-сценарий-2-вход-с-2fa)
4. [Сценарий 3: Первый Вход (Смена Пароля)](#4-сценарий-3-первый-вход-смена-пароля)
5. [Сценарий 4: Неверные Учётные Данные](#5-сценарий-4-неверные-учётные-данные)
6. [Сценарий 5: Аккаунт Заблокирован](#6-сценарий-5-аккаунт-заблокирован)
7. [Сценарий 6: Rate Limit](#7-сценарий-6-rate-limit)
8. [Сценарий 7: IP не в Whitelist](#8-сценарий-7-ip-не-в-whitelist)
9. [Сценарий 8: Неактивный Аккаунт](#9-сценарий-8-неактивный-аккаунт)
10. [Обновление Токенов (Refresh)](#10-обновление-токенов-refresh)
11. [Выход из Системы (Logout)](#11-выход-из-системы-logout)
12. [Сброс Пароля](#12-сброс-пароля)

---

## 1. Обзор Процесса Входа

### 1.1 Общая Схема Аутентификации

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LOGIN DECISION TREE                                    │
│                                                                                  │
│  POST /api/auth/login                                                            │
│  {email/username, password}                                                      │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────┐                                                            │
│  │ ThrottlerGuard  │──── 429 Too Many Requests ────►  STOP                      │
│  │ (5 req/min)     │                                                            │
│  └────────┬────────┘                                                            │
│           │ OK                                                                   │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ LocalAuthGuard  │                                                            │
│  │ (validate user) │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ Find user by    │──── User not found ────► 401 "Неверные учетные данные"    │
│  │ email/username  │                                                            │
│  └────────┬────────┘                                                            │
│           │ Found                                                                │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ Account locked? │──── Yes ────► 401 "Аккаунт временно заблокирован"         │
│  │ (isLocked)      │                                                            │
│  └────────┬────────┘                                                            │
│           │ No                                                                   │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ Validate        │──── Invalid ────► recordFailedLogin() ──►                  │
│  │ password        │                   401 "Неверные учетные данные"            │
│  │ (bcrypt.compare)│                                                            │
│  └────────┬────────┘                                                            │
│           │ Valid                                                                │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ Status = ACTIVE?│──── No ────► 401 "Неверные учетные данные"                │
│  └────────┬────────┘                                                            │
│           │ Yes                                                                  │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ IpWhitelistGuard│──── IP blocked ────► 403 "IP не в списке разрешенных"     │
│  └────────┬────────┘                                                            │
│           │ OK                                                                   │
│           ▼                                                                      │
│  ┌─────────────────┐                                                            │
│  │ AuthService.    │                                                            │
│  │ login()         │                                                            │
│  └────────┬────────┘                                                            │
│           │                                                                      │
│           ▼                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐           │
│  │ requires_       │     │ is_2fa_enabled? │     │ Normal login    │           │
│  │ password_change?│     │                 │     │                 │           │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘           │
│           │                       │                       │                     │
│      Yes  │                  Yes  │                  No   │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐           │
│  │ 200 OK          │     │ 200 OK          │     │ 200 OK          │           │
│  │ requires_       │     │ requires_2fa:   │     │ access_token    │           │
│  │ password_change:│     │ true            │     │ refresh_token   │           │
│  │ true            │     │ (limited token) │     │ user            │           │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Guards Pipeline (Порядок Проверок)

```typescript
// auth.controller.ts:50-52
@Post('login')
@UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 попыток в минуту
```

**Порядок выполнения Guards:**

| # | Guard | Проверка | Ошибка |
|---|-------|----------|--------|
| 1 | `ThrottlerGuard` | Rate limit (5 req/min) | 429 Too Many Requests |
| 2 | `LocalAuthGuard` | Email/password валидация | 401 Unauthorized |
| 3 | `IpWhitelistGuard` | IP в белом списке (если включен) | 403 Forbidden |

### 1.3 LoginDto - Валидация Входных Данных

```typescript
// dto/login.dto.ts
export class LoginDto {
  @ApiPropertyOptional({
    example: 'admin@vendhub.uz',
    description: 'Email address (required if username not provided)',
  })
  @IsOptional()
  @ValidateIf((o) => !o.username)  // Требуется если нет username
  @IsEmail({}, { message: 'Неверный формат email' })
  email?: string;

  @ApiPropertyOptional({
    example: 'admin_user_12345',
    description: 'Username (required if email not provided)',
  })
  @IsOptional()
  @ValidateIf((o) => !o.email)     // Требуется если нет email
  @IsString({ message: 'Имя пользователя должно быть строкой' })
  @MinLength(1, { message: 'Имя пользователя обязательно' })
  username?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(1, { message: 'Пароль обязателен' })
  password: string;
}
```

---

## 2. Сценарий 1: Успешный Вход

### 2.1 Диаграмма Последовательности

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  Client  │          │Controller│          │  Service │          │ Database │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                     │
     │ POST /auth/login    │                     │                     │
     │ {email, password}   │                     │                     │
     │────────────────────►│                     │                     │
     │                     │                     │                     │
     │                     │ validateUser()      │                     │
     │                     │────────────────────►│                     │
     │                     │                     │                     │
     │                     │                     │ findByEmail()       │
     │                     │                     │────────────────────►│
     │                     │                     │                     │
     │                     │                     │◄────────────────────│
     │                     │                     │ User entity         │
     │                     │                     │                     │
     │                     │                     │ bcrypt.compare()    │
     │                     │                     │ (validate password) │
     │                     │                     │                     │
     │                     │◄────────────────────│                     │
     │                     │ User (validated)    │                     │
     │                     │                     │                     │
     │                     │ login(user, ip, ua) │                     │
     │                     │────────────────────►│                     │
     │                     │                     │                     │
     │                     │                     │ resetFailedLogins() │
     │                     │                     │────────────────────►│
     │                     │                     │                     │
     │                     │                     │ generateTokens()    │
     │                     │                     │ (access + refresh)  │
     │                     │                     │                     │
     │                     │                     │ createSession()     │
     │                     │                     │────────────────────►│
     │                     │                     │                     │
     │                     │                     │ updateLastLogin()   │
     │                     │                     │────────────────────►│
     │                     │                     │                     │
     │                     │                     │ auditLog(LOGIN_OK)  │
     │                     │                     │────────────────────►│
     │                     │                     │                     │
     │                     │◄────────────────────│                     │
     │                     │ AuthResponse        │                     │
     │                     │                     │                     │
     │◄────────────────────│                     │                     │
     │ 200 OK              │                     │                     │
     │ + Set-Cookie        │                     │                     │
     │                     │                     │                     │
```

### 2.2 Код Сервиса (auth.service.ts:200-280)

```typescript
async login(user: User, ip?: string, userAgent?: string): Promise<AuthResponse> {
  // 1. Сбросить счётчик неудачных попыток
  await this.resetFailedLogins(user.id);

  // 2. Проверить требуется ли смена пароля (REQ-AUTH-31)
  if (user.requires_password_change) {
    // Генерируем ограниченные токены только для смены пароля
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      requires_password_change: true,  // Флаг для фронтенда
    };
  }

  // 3. Проверить включена ли 2FA (REQ-AUTH-42)
  if (user.is_2fa_enabled) {
    // Генерируем ограниченные токены для 2FA верификации
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
      requires_2fa: true,  // Флаг для фронтенда
    };
  }

  // 4. Стандартный вход - полные токены
  const tokens = this.generateTokens(user);

  // 5. Создать сессию
  await this.sessionService.createSession({
    userId: user.id,
    refreshToken: tokens.refresh_token,
    ipAddress: ip,
    userAgent: userAgent,
  });

  // 6. Обновить метаданные последнего входа
  await this.usersService.updateLastLogin(user.id, ip);

  // 7. Записать в аудит лог
  await this.auditLogService.log({
    action: 'LOGIN_SUCCESS',
    userId: user.id,
    ip: ip,
    userAgent: userAgent,
    details: { email: user.email },
  });

  return {
    ...tokens,
    user: this.sanitizeUser(user),
  };
}
```

### 2.3 HTTP Запрос и Ответ

**Запрос:**
```http
POST /api/auth/login HTTP/1.1
Host: api.vendhub.uz
Content-Type: application/json

{
  "email": "operator@vendhub.uz",
  "password": "SecurePass123!"
}
```

**Успешный Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6Im9wZXJhdG9yQHZlbmRodWIudXoiLCJyb2xlIjoiT3BlcmF0b3IiLCJqdGkiOiJhMWIyYzNkNC1lNWY2LTc4OTAtYWJjZC1lZjEyMzQ1Njc4OTAiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzAzMDAxMjM0LCJleHAiOjE3MDMwMDIxMzR9.signature",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJqdGkiOiJmMGUxZDJjMy1iNGE1LTk2ODctMDEyMy00NTY3ODlhYmNkZWYiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMzAwMTIzNCwiZXhwIjoxNzAzNjA2MDM0fQ.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "operator@vendhub.uz",
    "full_name": "Иван Операторов",
    "role": "Operator",
    "status": "active",
    "is_2fa_enabled": false,
    "last_login_at": "2025-01-15T10:00:00.000Z"
  }
}
```

**HTTP Headers (Cookies):**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### 2.4 Декодированные Токены

**Access Token Payload:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "operator@vendhub.uz",
  "role": "Operator",
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "access",
  "iat": 1703001234,
  "exp": 1703002134
}
```

**Refresh Token Payload:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "jti": "f0e1d2c3-b4a5-9687-0123-456789abcdef",
  "type": "refresh",
  "iat": 1703001234,
  "exp": 1703606034
}
```

---

## 3. Сценарий 2: Вход с 2FA

### 3.1 Двухэтапный Процесс

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           2FA LOGIN FLOW                                         │
│                                                                                  │
│  ЭТАП 1: Ввод email/password                                                    │
│  ════════════════════════════                                                   │
│                                                                                  │
│  POST /api/auth/login                                                            │
│  {"email": "admin@vendhub.uz", "password": "AdminPass123!"}                     │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Response (200 OK):                                                       │   │
│  │ {                                                                        │   │
│  │   "access_token": "eyJ...",     // Ограниченный токен                   │   │
│  │   "refresh_token": "eyJ...",    // Ограниченный токен                   │   │
│  │   "user": {...},                                                         │   │
│  │   "requires_2fa": true          // ◄── ФЛАГ: требуется 2FA              │   │
│  │ }                                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         │  Клиент показывает форму ввода 2FA кода                               │
│         │                                                                        │
│         ▼                                                                        │
│                                                                                  │
│  ЭТАП 2: Ввод TOTP кода                                                         │
│  ══════════════════════                                                         │
│                                                                                  │
│  POST /api/auth/2fa/login                                                        │
│  Authorization: Bearer <access_token из этапа 1>                                │
│  {"token": "123456"}                                                             │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Проверки:                                                                │   │
│  │ 1. JWT валиден?                                                          │   │
│  │ 2. verifyToken(userId, "123456") - TOTP проверка                        │   │
│  │ 3. Код в пределах 30-секундного окна?                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Response (200 OK):                                                       │   │
│  │ {                                                                        │   │
│  │   "access_token": "eyJ...",     // НОВЫЙ полный токен                   │   │
│  │   "refresh_token": "eyJ...",    // НОВЫЙ полный токен                   │   │
│  │   "user": {...}                                                          │   │
│  │ }                                                                        │   │
│  │                                                                          │   │
│  │ + Создаётся полноценная сессия                                          │   │
│  │ + Обновляется last_login_at                                             │   │
│  │ + Записывается аудит лог                                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Код Завершения 2FA Входа (auth.service.ts:300-350)

```typescript
async complete2FALogin(
  userId: string,
  token: string,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> {
  // 1. Найти пользователя
  const user = await this.usersService.findById(userId);
  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Проверить 2FA код (если не backup)
  if (token !== 'backup') {
    const isValid = await this.twoFactorAuthService.verifyToken(userId, token, ip);
    if (!isValid) {
      throw new BadRequestException('Неверный код двухфакторной аутентификации');
    }
  }

  // 3. Генерировать новые полные токены
  const tokens = this.generateTokens(user);

  // 4. Создать полноценную сессию
  await this.sessionService.createSession({
    userId: user.id,
    refreshToken: tokens.refresh_token,
    ipAddress: ip,
    userAgent: userAgent,
  });

  // 5. Обновить метаданные
  await this.usersService.updateLastLogin(user.id, ip);

  // 6. Аудит лог
  await this.auditLogService.log({
    action: 'TWO_FA_LOGIN_SUCCESS',
    userId: user.id,
    ip: ip,
    details: { method: token === 'backup' ? 'backup_code' : 'totp' },
  });

  return {
    ...tokens,
    user: this.sanitizeUser(user),
  };
}
```

### 3.3 HTTP Примеры

**Этап 1 - Логин:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{"email": "admin@vendhub.uz", "password": "AdminPass123!"}
```

**Ответ Этапа 1:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@vendhub.uz",
    "is_2fa_enabled": true
  },
  "requires_2fa": true
}
```

**Этап 2 - 2FA Верификация:**
```http
POST /api/auth/2fa/login HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/json

{"token": "123456"}
```

**Ответ Этапа 2:**
```json
{
  "access_token": "eyJ...(новый)...",
  "refresh_token": "eyJ...(новый)...",
  "user": {
    "id": "...",
    "email": "admin@vendhub.uz",
    "is_2fa_enabled": true
  }
}
```

### 3.4 Альтернатива: Вход с Резервным Кодом

```http
POST /api/auth/2fa/login/backup HTTP/1.1
Authorization: Bearer eyJ...
Content-Type: application/json

{"code": "ABCD-EFGH-1234"}
```

**Важно:** Каждый резервный код можно использовать только ОДИН раз!

---

## 4. Сценарий 3: Первый Вход (Смена Пароля)

### 4.1 Когда Применяется

Флаг `requires_password_change = true` устанавливается:
- При создании пользователя админом с временным паролем
- После сброса пароля администратором
- После одобрения заявки на доступ (access request)

### 4.2 Диаграмма Процесса

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     FIRST LOGIN PASSWORD CHANGE FLOW                             │
│                                                                                  │
│  POST /api/auth/login                                                            │
│  {"email": "newuser@vendhub.uz", "password": "TempPass123"}                     │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Response (200 OK):                                                       │   │
│  │ {                                                                        │   │
│  │   "access_token": "eyJ...",                                              │   │
│  │   "refresh_token": "eyJ...",                                             │   │
│  │   "user": {...},                                                         │   │
│  │   "requires_password_change": true  // ◄── ФЛАГ                         │   │
│  │ }                                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         │  Клиент показывает форму смены пароля                                 │
│         │  (текущий пароль + новый пароль + подтверждение)                      │
│         │                                                                        │
│         ▼                                                                        │
│                                                                                  │
│  POST /api/auth/first-login-change-password                                      │
│  Authorization: Bearer <access_token>                                           │
│  {                                                                               │
│    "currentPassword": "TempPass123",                                            │
│    "newPassword": "MyNewSecurePass123!"                                         │
│  }                                                                               │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Проверки:                                                                │   │
│  │ 1. requires_password_change == true?                                     │   │
│  │ 2. currentPassword верный? (bcrypt.compare)                              │   │
│  │ 3. newPassword != currentPassword?                                       │   │
│  │ 4. newPassword соответствует требованиям?                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Действия:                                                                │   │
│  │ 1. Hash нового пароля (bcrypt)                                          │   │
│  │ 2. Обновить password_hash                                               │   │
│  │ 3. Установить requires_password_change = false                          │   │
│  │ 4. Установить password_changed_by_user = true                           │   │
│  │ 5. Invalidate все старые сессии                                         │   │
│  │ 6. Blacklist все старые токены                                          │   │
│  │ 7. Создать новую сессию                                                 │   │
│  │ 8. Генерировать новые токены                                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  Response (200 OK):                                                              │
│  {                                                                               │
│    "access_token": "eyJ...(новый)...",                                          │
│    "refresh_token": "eyJ...(новый)...",                                         │
│    "user": {...}                                                                 │
│  }                                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Код Сервиса (auth.service.ts:450-520)

```typescript
async firstLoginChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> {
  // 1. Найти пользователя с паролем
  const user = await this.usersService.findByIdWithPassword(userId);
  if (!user) {
    throw new NotFoundException('Пользователь не найден');
  }

  // 2. Проверить что требуется смена пароля
  if (!user.requires_password_change) {
    throw new BadRequestException('Смена пароля не требуется');
  }

  // 3. Проверить текущий пароль
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Неверный текущий пароль');
  }

  // 4. Проверить что новый пароль отличается
  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    throw new BadRequestException('Новый пароль должен отличаться от текущего');
  }

  // 5. Хешировать новый пароль
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // 6. Обновить пользователя
  await this.usersService.update(userId, {
    password_hash: newPasswordHash,
    requires_password_change: false,
    password_changed_by_user: true,
  });

  // 7. Blacklist все старые токены пользователя
  await this.tokenBlacklistService.blacklistUserTokens(userId, 'password_changed');

  // 8. Отозвать все старые сессии
  await this.sessionService.revokeAllUserSessions(userId, 'password_changed');

  // 9. Генерировать новые токены
  const tokens = this.generateTokens({ ...user, requires_password_change: false });

  // 10. Создать новую сессию
  await this.sessionService.createSession({
    userId: user.id,
    refreshToken: tokens.refresh_token,
    ipAddress: ip,
    userAgent: userAgent,
  });

  // 11. Аудит лог
  await this.auditLogService.log({
    action: 'FIRST_LOGIN_PASSWORD_CHANGED',
    userId: user.id,
    ip: ip,
  });

  return {
    ...tokens,
    user: this.sanitizeUser({ ...user, requires_password_change: false }),
  };
}
```

### 4.4 FirstLoginChangePasswordDto

```typescript
// dto/first-login-change-password.dto.ts
export class FirstLoginChangePasswordDto {
  @ApiProperty({ description: 'Текущий (временный) пароль' })
  @IsString()
  @MinLength(1, { message: 'Текущий пароль обязателен' })
  currentPassword: string;

  @ApiProperty({ description: 'Новый пароль' })
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Пароль должен содержать буквы, цифры и спецсимволы',
  })
  newPassword: string;
}
```

---

## 5. Сценарий 4: Неверные Учётные Данные

### 5.1 Обработка Неудачного Входа

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FAILED LOGIN HANDLING                                     │
│                                                                                  │
│  POST /api/auth/login                                                            │
│  {"email": "user@vendhub.uz", "password": "WrongPassword"}                      │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  LocalAuthGuard.validate()                                                       │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ validateUser(email, password)                                            │   │
│  │                                                                          │   │
│  │ 1. Найти пользователя по email                                          │   │
│  │    - Не найден? → return null                                            │   │
│  │                                                                          │   │
│  │ 2. Проверить заблокирован ли аккаунт                                     │   │
│  │    - user.isLocked? → throw UnauthorizedException                        │   │
│  │                                                                          │   │
│  │ 3. Сравнить пароли (bcrypt.compare)                                      │   │
│  │    - Не совпадают? → recordFailedLogin() → return null                   │   │
│  │                                                                          │   │
│  │ 4. Проверить статус                                                      │   │
│  │    - status != 'active'? → return null                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │ return null                                                            │
│         ▼                                                                        │
│  LocalAuthGuard throws UnauthorizedException                                     │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  Response (401 Unauthorized):                                                    │
│  {                                                                               │
│    "statusCode": 401,                                                            │
│    "message": "Неверные учетные данные",                                        │
│    "error": "Unauthorized"                                                       │
│  }                                                                               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ВАЖНО: Одинаковое сообщение для всех случаев!                           │   │
│  │                                                                          │   │
│  │ • Пользователь не найден      → "Неверные учетные данные"               │   │
│  │ • Неверный пароль             → "Неверные учетные данные"               │   │
│  │ • Аккаунт неактивен           → "Неверные учетные данные"               │   │
│  │                                                                          │   │
│  │ Это предотвращает enumeration attack (перебор email'ов)                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Код Записи Неудачной Попытки (auth.service.ts:600-650)

```typescript
async recordFailedLogin(userId: string): Promise<void> {
  const user = await this.usersService.findById(userId);
  if (!user) return;

  const maxAttempts = this.configService.get<number>('BRUTE_FORCE_MAX_ATTEMPTS', 5);
  const lockoutMinutes = this.configService.get<number>('BRUTE_FORCE_LOCKOUT_MINUTES', 15);

  const newAttempts = user.failed_login_attempts + 1;

  const updateData: Partial<User> = {
    failed_login_attempts: newAttempts,
    last_failed_login_at: new Date(),
  };

  // Заблокировать аккаунт после превышения лимита
  if (newAttempts >= maxAttempts) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + lockoutMinutes);

    updateData.account_locked_until = lockUntil;

    // Аудит лог - обнаружен brute force
    await this.auditLogService.log({
      action: 'BRUTE_FORCE_DETECTED',
      userId: user.id,
      details: {
        attempts: newAttempts,
        lockedUntil: lockUntil.toISOString(),
      },
    });

    this.logger.warn(
      `Account locked for user ${user.email} until ${lockUntil.toISOString()}`
    );
  }

  await this.usersService.update(userId, updateData);
}
```

### 5.3 HTTP Пример

**Запрос:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{"email": "user@vendhub.uz", "password": "WrongPassword"}
```

**Ответ (401):**
```json
{
  "statusCode": 401,
  "message": "Неверные учетные данные",
  "error": "Unauthorized",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "path": "/api/auth/login"
}
```

---

## 6. Сценарий 5: Аккаунт Заблокирован

### 6.1 Проверка Блокировки

```typescript
// user.entity.ts - computed property
get isLocked(): boolean {
  if (!this.account_locked_until) {
    return false;
  }
  return new Date() < this.account_locked_until;
}
```

### 6.2 Обработка Заблокированного Аккаунта

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LOCKED ACCOUNT HANDLING                                   │
│                                                                                  │
│  Условия блокировки:                                                            │
│  • failed_login_attempts >= 5 (BRUTE_FORCE_MAX_ATTEMPTS)                        │
│  • account_locked_until = now + 15 минут                                        │
│                                                                                  │
│  При попытке входа:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ if (user.isLocked) {                                                     │   │
│  │   const unlockTime = user.account_locked_until.toLocaleTimeString();    │   │
│  │   throw new UnauthorizedException(                                       │   │
│  │     `Аккаунт временно заблокирован. Попробуйте снова после ${unlockTime}`│   │
│  │   );                                                                     │   │
│  │ }                                                                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  После истечения времени блокировки:                                            │
│  • isLocked возвращает false                                                    │
│  • Пользователь может попытаться войти                                         │
│  • При успешном входе: failed_login_attempts = 0                               │
│  • При неудачном входе: счётчик продолжает расти                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 HTTP Ответ

```json
{
  "statusCode": 401,
  "message": "Аккаунт временно заблокирован. Попробуйте снова после 15:30:00",
  "error": "Unauthorized",
  "timestamp": "2025-01-15T15:15:00.000Z",
  "path": "/api/auth/login"
}
```

---

## 7. Сценарий 6: Rate Limit

### 7.1 Конфигурация Rate Limiting

```typescript
// auth.controller.ts
@Post('login')
@UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 запросов в минуту

@Post('register')
@Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 запроса за 5 минут

@Post('refresh')
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 запросов в минуту

@Post('password-reset/request')
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 запроса в час

@Post('2fa/login')
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 запросов в минуту

@Post('2fa/verify')
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 запросов в минуту
```

### 7.2 Таблица Rate Limits

| Endpoint | Лимит | Окно | Назначение |
|----------|-------|------|------------|
| `POST /auth/login` | 5 | 1 мин | Защита от brute force |
| `POST /auth/register` | 3 | 5 мин | Защита от спама регистраций |
| `POST /auth/refresh` | 10 | 1 мин | Нормальное использование |
| `POST /auth/password-reset/*` | 3 | 1 час | Защита от email спама |
| `POST /auth/2fa/*` | 5-10 | 1 мин | Защита 2FA кодов |

### 7.3 HTTP Ответ при Превышении

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703001294

{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## 8. Сценарий 7: IP не в Whitelist

### 8.1 IP Whitelist Guard

```typescript
// guards/ip-whitelist.guard.ts
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Если whitelist не включен - пропускаем
    if (!user.ip_whitelist_enabled) {
      return true;
    }

    // Если нет разрешённых IP - пропускаем
    if (!user.allowed_ips || user.allowed_ips.length === 0) {
      return true;
    }

    // Получаем IP клиента
    const clientIp = request.ip ||
                     request.socket.remoteAddress ||
                     request.headers['x-forwarded-for']?.split(',')[0];

    // Проверяем в списке
    const isAllowed = user.allowed_ips.includes(clientIp);

    if (!isAllowed) {
      throw new ForbiddenException(
        `IP адрес ${clientIp} не находится в списке разрешенных (REQ-AUTH-60)`
      );
    }

    return true;
  }
}
```

### 8.2 HTTP Ответ

```json
{
  "statusCode": 403,
  "message": "IP адрес 192.168.1.100 не находится в списке разрешенных (REQ-AUTH-60)",
  "error": "Forbidden",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "path": "/api/auth/login"
}
```

---

## 9. Сценарий 8: Неактивный Аккаунт

### 9.1 Проверка Статуса

```typescript
// auth.service.ts - validateUser()
async validateUser(email: string, password: string): Promise<User | null> {
  const user = await this.usersService.findByEmailWithPassword(email);

  if (!user) {
    return null;  // Пользователь не найден
  }

  // Проверка блокировки
  if (user.isLocked) {
    throw new UnauthorizedException(
      `Аккаунт временно заблокирован. Попробуйте снова после ${user.account_locked_until}`
    );
  }

  // Проверка пароля
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    await this.recordFailedLogin(user.id);
    return null;
  }

  // ════════════════════════════════════════════════════════════════
  // ПРОВЕРКА СТАТУСА - только ACTIVE могут входить
  // ════════════════════════════════════════════════════════════════
  if (user.status !== UserStatus.ACTIVE &&
      user.status !== UserStatus.PASSWORD_CHANGE_REQUIRED) {
    // Для безопасности возвращаем null (как будто не найден)
    return null;
  }

  return user;
}
```

### 9.2 Какие Статусы Блокируют Вход

| Статус | Может войти? | Описание |
|--------|--------------|----------|
| `ACTIVE` | ✅ Да | Обычный вход |
| `PASSWORD_CHANGE_REQUIRED` | ✅ Да* | Вход с флагом requires_password_change |
| `PENDING` | ❌ Нет | Ожидает одобрения |
| `INACTIVE` | ❌ Нет | Временно отключен |
| `SUSPENDED` | ❌ Нет | Заблокирован |
| `REJECTED` | ❌ Нет | Заявка отклонена |

---

## 10. Обновление Токенов (Refresh)

### 10.1 Диаграмма Процесса

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TOKEN REFRESH FLOW                                     │
│                                                                                  │
│  POST /api/auth/refresh                                                          │
│  Body: {"refreshToken": "eyJ..."} ИЛИ Cookie: refresh_token=eyJ...              │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Получить refresh token                                                │   │
│  │    - Сначала из cookie (приоритет)                                       │   │
│  │    - Затем из body                                                       │   │
│  │    - Если нет → 400 "Refresh token не предоставлен"                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 2. Верифицировать JWT                                                    │   │
│  │    - Подпись валидна?                                                    │   │
│  │    - Не истёк?                                                           │   │
│  │    - type === 'refresh'?                                                 │   │
│  │    - Если нет → 401 "Неверный refresh token"                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 3. Проверить blacklist (Redis)                                           │   │
│  │    - tokenBlacklistService.shouldRejectToken(jti, userId)               │   │
│  │    - Если в blacklist → 401 "Token отозван"                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 4. Найти сессию по refresh token                                         │   │
│  │    - sessionService.verifyRefreshToken(refreshToken)                     │   │
│  │    - Сессия существует?                                                  │   │
│  │    - Не истекла?                                                         │   │
│  │    - Не отозвана?                                                        │   │
│  │    - Если нет → 401 "Сессия не найдена или истекла"                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 5. Ротация токенов                                                       │   │
│  │    - Генерировать новую пару access + refresh                           │   │
│  │    - sessionService.rotateRefreshToken(session, newRefreshToken)        │   │
│  │    - Blacklist старый refresh token                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  Response (200 OK):                                                              │
│  {                                                                               │
│    "access_token": "eyJ...(новый)...",                                          │
│    "refresh_token": "eyJ...(новый)..."                                          │
│  }                                                                               │
│  + Set-Cookie: access_token=...                                                  │
│  + Set-Cookie: refresh_token=...                                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Код Сервиса (auth.service.ts:350-420)

```typescript
async refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    // 1. Верифицировать JWT
    const payload = this.jwtService.verify(refreshToken);

    // 2. Проверить тип токена
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    // 3. Проверить blacklist
    const isRejected = await this.tokenBlacklistService.shouldRejectToken(
      payload.jti,
      payload.sub
    );
    if (isRejected) {
      throw new UnauthorizedException('Token был отозван');
    }

    // 4. Найти и верифицировать сессию
    const session = await this.sessionService.verifyRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Сессия не найдена или истекла');
    }

    // 5. Найти пользователя
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // 6. Проверить статус пользователя
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Аккаунт не активен');
    }

    // 7. Генерировать новые токены
    const newTokens = this.generateTokens(user);

    // 8. Blacklist старый refresh token
    await this.tokenBlacklistService.blacklistToken(
      payload.jti,
      user.id,
      undefined,
      'token_rotated'
    );

    // 9. Ротировать refresh token в сессии
    await this.sessionService.rotateRefreshToken(session.id, newTokens.refresh_token);

    // 10. Обновить last_activity
    await this.sessionService.updateLastActivity(session.id);

    return newTokens;

  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new UnauthorizedException('Refresh token истёк');
    }
    if (error instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Неверный refresh token');
    }
    throw error;
  }
}
```

### 10.3 HTTP Пример

**Запрос (с body):**
```http
POST /api/auth/refresh HTTP/1.1
Content-Type: application/json

{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Запрос (с cookie):**
```http
POST /api/auth/refresh HTTP/1.1
Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ответ (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(новый)...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(новый)..."
}
```

---

## 11. Выход из Системы (Logout)

### 11.1 Глобальный Logout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOGOUT FLOW                                         │
│                                                                                  │
│  POST /api/auth/logout                                                           │
│  Authorization: Bearer <access_token>                                           │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. JwtAuthGuard - верификация access token                              │   │
│  │ 2. IpWhitelistGuard - проверка IP (если включено)                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ AuthService.logout(userId, ip)                                           │   │
│  │                                                                          │   │
│  │ 1. Blacklist ВСЕ токены пользователя в Redis                            │   │
│  │    tokenBlacklistService.blacklistUserTokens(userId, 'logout')          │   │
│  │    KEY: vendhub:blacklist:user:{userId}                                  │   │
│  │    TTL: 7 дней                                                           │   │
│  │                                                                          │   │
│  │ 2. Отозвать ВСЕ сессии пользователя                                     │   │
│  │    sessionService.revokeAllUserSessions(userId, 'logout')               │   │
│  │                                                                          │   │
│  │ 3. Записать аудит лог                                                   │   │
│  │    action: 'LOGOUT'                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ CookieService.clearAuthCookies(response)                                 │   │
│  │                                                                          │   │
│  │ Set-Cookie: access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT│   │
│  │ Set-Cookie: refresh_token=; Path=/auth; Expires=...                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  Response: 204 No Content                                                        │
│                                                                                  │
│  ══════════════════════════════════════════════════════════════════════════    │
│  ВАЖНО: Logout ГЛОБАЛЬНЫЙ - отзывает ВСЕ сессии на ВСЕХ устройствах!           │
│  ══════════════════════════════════════════════════════════════════════════    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Код Сервиса (auth.service.ts:550-590)

```typescript
async logout(userId: string, ip?: string): Promise<void> {
  // 1. Blacklist все токены пользователя
  await this.tokenBlacklistService.blacklistUserTokens(userId, 'logout');

  // 2. Отозвать все сессии
  await this.sessionService.revokeAllUserSessions(userId, 'logout');

  // 3. Аудит лог
  await this.auditLogService.log({
    action: 'LOGOUT',
    userId: userId,
    ip: ip,
  });

  this.logger.log(`User ${userId} logged out from all sessions`);
}
```

---

## 12. Сброс Пароля

### 12.1 Полный Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PASSWORD RESET FLOW                                     │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  ШАГ 1: Запрос сброса пароля                                                    │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  POST /api/auth/password-reset/request                                           │
│  {"email": "user@vendhub.uz"}                                                   │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Найти пользователя по email                                          │   │
│  │    - Не найден? → Всё равно вернуть success (безопасность)              │   │
│  │                                                                          │   │
│  │ 2. Инвалидировать старые токены сброса                                  │   │
│  │    UPDATE password_reset_tokens SET used = true WHERE user_id = ?       │   │
│  │                                                                          │   │
│  │ 3. Создать новый токен сброса                                           │   │
│  │    - token: UUID v4                                                      │   │
│  │    - expires_at: now + 1 час                                            │   │
│  │    - used: false                                                         │   │
│  │                                                                          │   │
│  │ 4. Отправить email с ссылкой                                            │   │
│  │    https://app.vendhub.uz/reset-password?token={token}                  │   │
│  │                                                                          │   │
│  │ 5. Аудит лог: PASSWORD_RESET_REQUESTED                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Response (200 OK):                                                              │
│  {"success": true, "message": "Если email существует, письмо отправлено"}      │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  ШАГ 2: Валидация токена (опционально)                                          │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  POST /api/auth/password-reset/validate                                          │
│  {"token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}                             │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Проверки:                                                                │   │
│  │ - Токен существует?                                                      │   │
│  │ - expires_at > now?                                                      │   │
│  │ - used = false?                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Response: {"valid": true} или {"valid": false, "message": "Токен истёк"}      │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  ШАГ 3: Установка нового пароля                                                 │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                  │
│  POST /api/auth/password-reset/confirm                                           │
│  {"token": "...", "newPassword": "NewSecurePass123!"}                           │
│                                                                                  │
│         │                                                                        │
│         ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Валидировать токен (как в шаге 2)                                    │   │
│  │                                                                          │   │
│  │ 2. Hash нового пароля (bcrypt, 10 rounds)                               │   │
│  │                                                                          │   │
│  │ 3. Обновить пользователя:                                               │   │
│  │    - password_hash = newHash                                             │   │
│  │    - failed_login_attempts = 0                                           │   │
│  │    - account_locked_until = null                                         │   │
│  │                                                                          │   │
│  │ 4. Blacklist все токены пользователя                                    │   │
│  │                                                                          │   │
│  │ 5. Отозвать все сессии                                                  │   │
│  │                                                                          │   │
│  │ 6. Пометить токен как использованный (used = true)                      │   │
│  │                                                                          │   │
│  │ 7. Аудит лог: PASSWORD_RESET_COMPLETED                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Response (200 OK):                                                              │
│  {"success": true, "message": "Пароль успешно изменён"}                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 PasswordResetToken Entity

```typescript
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  token: string;  // UUID v4

  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;  // now + 1 hour

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'inet', nullable: true })
  requested_from_ip: string;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

---

## Следующий Документ

➡️ [03-AUTH-2FA.md](./03-AUTH-2FA.md) - Двухфакторная аутентификация (TOTP)

---

**Версия документа**: 2.0.0
**Создан**: 2025-12-20
**Автор**: VendHub Development Team
