# Audit Logs Documentation

> **Модуль**: `backend/src/modules/audit-logs/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль аудита безопасности для отслеживания всех важных событий в системе: аутентификация, управление аккаунтами, изменение ролей и прав доступа, подозрительные активности.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUDIT LOGS SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    EVENT TYPES (28 типов)                      │  │
│  │                                                                │  │
│  │  AUTHENTICATION          │  ACCOUNT MANAGEMENT                 │  │
│  │  ├── login_success       │  ├── account_created               │  │
│  │  ├── login_failed        │  ├── account_updated               │  │
│  │  ├── logout              │  ├── account_blocked               │  │
│  │  └── token_refresh       │  ├── account_unblocked             │  │
│  │                          │  └── account_deleted               │  │
│  │  PASSWORD                │                                     │  │
│  │  ├── password_changed    │  ROLES & PERMISSIONS               │  │
│  │  ├── password_reset_req  │  ├── role_assigned                 │  │
│  │  └── password_reset_done │  ├── role_removed                  │  │
│  │                          │  └── permission_changed            │  │
│  │  TWO-FACTOR AUTH         │                                     │  │
│  │  ├── 2fa_enabled         │  ACCESS REQUESTS                   │  │
│  │  ├── 2fa_disabled        │  ├── access_request_created        │  │
│  │  ├── 2fa_verified        │  ├── access_request_approved       │  │
│  │  └── 2fa_failed          │  └── access_request_rejected       │  │
│  │                          │                                     │  │
│  │  SECURITY                │  SESSIONS                          │  │
│  │  ├── brute_force_detected│  ├── session_created               │  │
│  │  ├── ip_blocked          │  ├── session_terminated            │  │
│  │  └── suspicious_activity │  └── session_expired               │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    AUDIT LOG ENTRY                             │  │
│  │  ├── event_type (enum) - тип события                          │  │
│  │  ├── severity (info/warning/error/critical)                   │  │
│  │  ├── user_id - кто выполнил действие                          │  │
│  │  ├── target_user_id - над кем выполнено                       │  │
│  │  ├── ip_address (inet) - IP адрес                             │  │
│  │  ├── user_agent - браузер/клиент                              │  │
│  │  ├── description - описание                                   │  │
│  │  ├── metadata (jsonb) - дополнительные данные                 │  │
│  │  ├── success (boolean) - успешно/неуспешно                    │  │
│  │  └── error_message - сообщение об ошибке                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### AuditEventType

28 типов событий аудита согласно REQ-AUTH-80:

```typescript
export enum AuditEventType {
  // ========== AUTHENTICATION EVENTS ==========
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',

  // ========== PASSWORD EVENTS ==========
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',

  // ========== 2FA EVENTS ==========
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',

  // ========== ACCOUNT MANAGEMENT ==========
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_BLOCKED = 'account_blocked',
  ACCOUNT_UNBLOCKED = 'account_unblocked',
  ACCOUNT_DELETED = 'account_deleted',

  // ========== ROLE & PERMISSION CHANGES ==========
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CHANGED = 'permission_changed',

  // ========== ACCESS REQUEST EVENTS ==========
  ACCESS_REQUEST_CREATED = 'access_request_created',
  ACCESS_REQUEST_APPROVED = 'access_request_approved',
  ACCESS_REQUEST_REJECTED = 'access_request_rejected',

  // ========== SECURITY EVENTS ==========
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  IP_BLOCKED = 'ip_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // ========== SESSION EVENTS ==========
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  SESSION_EXPIRED = 'session_expired',
}
```

### AuditSeverity

```typescript
export enum AuditSeverity {
  INFO = 'info',         // Информационное событие
  WARNING = 'warning',   // Предупреждение
  ERROR = 'error',       // Ошибка
  CRITICAL = 'critical', // Критическое событие
}
```

---

## Entity

### AuditLog Entity

```typescript
@Entity('audit_logs')
@Index(['event_type'])
@Index(['user_id'])
@Index(['created_at'])
@Index(['severity'])
@Index(['ip_address'])
export class AuditLog extends BaseEntity {
  // Информация о событии
  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  event_type: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  // Пользователь, выполнивший действие (nullable для неуспешных входов)
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Целевой пользователь для событий управления аккаунтами
  @Column({ type: 'uuid', nullable: true })
  target_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  target_user: User | null;

  // Метаданные запроса
  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  // Детали события
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Статус успеха/неудачи
  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;
}
```

---

## DTOs

### CreateAuditLogDto

```typescript
export class CreateAuditLogDto {
  @IsEnum(AuditEventType)
  event_type: AuditEventType;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  target_user_id?: string;

  @IsOptional()
  @IsIP()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsString()
  error_message?: string;
}
```

### QueryAuditLogDto

```typescript
export class QueryAuditLogDto {
  @IsOptional()
  @IsEnum(AuditEventType)
  event_type?: AuditEventType;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsUUID()
  target_user_id?: string;

  @IsOptional()
  @IsIP()
  ip_address?: string;

  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}
```

---

## API Endpoints

### Получить логи аудита

```http
GET /api/audit-logs?event_type=login_failed&severity=warning&date_from=2025-01-01
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "event_type": "login_failed",
      "severity": "warning",
      "user_id": null,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "description": "Failed login attempt for email: user@example.com",
      "metadata": {
        "email": "user@example.com",
        "attempt_count": 3
      },
      "success": false,
      "error_message": "Invalid credentials",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Получить лог по ID

```http
GET /api/audit-logs/:id
Authorization: Bearer <admin_token>
```

### Получить статистику

```http
GET /api/audit-logs/statistics?date_from=2025-01-01&date_to=2025-01-31
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total": 5000,
  "by_event_type": [
    { "event_type": "login_success", "count": 3500 },
    { "event_type": "login_failed", "count": 150 },
    { "event_type": "logout", "count": 1200 }
  ],
  "by_severity": [
    { "severity": "info", "count": 4800 },
    { "severity": "warning", "count": 180 },
    { "severity": "error", "count": 15 },
    { "severity": "critical", "count": 5 }
  ],
  "failed_events": 170,
  "success_rate": 96.6
}
```

### Получить активность пользователя

```http
GET /api/audit-logs/users/:userId?date_from=2025-01-01
Authorization: Bearer <admin_token>
```

### Получить подозрительные активности

```http
GET /api/audit-logs/suspicious
Authorization: Bearer <admin_token>
```

---

## Категории событий

### Authentication Events

| Event | Severity | Description |
|-------|----------|-------------|
| `login_success` | info | Успешный вход в систему |
| `login_failed` | warning | Неудачная попытка входа |
| `logout` | info | Выход из системы |
| `token_refresh` | info | Обновление JWT токена |

### Password Events

| Event | Severity | Description |
|-------|----------|-------------|
| `password_changed` | info | Пароль изменён |
| `password_reset_requested` | info | Запрошен сброс пароля |
| `password_reset_completed` | info | Сброс пароля завершён |

### 2FA Events

| Event | Severity | Description |
|-------|----------|-------------|
| `2fa_enabled` | info | 2FA включена |
| `2fa_disabled` | warning | 2FA отключена |
| `2fa_verified` | info | 2FA код подтверждён |
| `2fa_failed` | warning | Неверный 2FA код |

### Account Management Events

| Event | Severity | Description |
|-------|----------|-------------|
| `account_created` | info | Аккаунт создан |
| `account_updated` | info | Аккаунт обновлён |
| `account_blocked` | warning | Аккаунт заблокирован |
| `account_unblocked` | info | Аккаунт разблокирован |
| `account_deleted` | warning | Аккаунт удалён |

### Role & Permission Events

| Event | Severity | Description |
|-------|----------|-------------|
| `role_assigned` | info | Роль назначена |
| `role_removed` | warning | Роль удалена |
| `permission_changed` | warning | Права изменены |

### Access Request Events

| Event | Severity | Description |
|-------|----------|-------------|
| `access_request_created` | info | Заявка на доступ создана |
| `access_request_approved` | info | Заявка одобрена |
| `access_request_rejected` | warning | Заявка отклонена |

### Security Events

| Event | Severity | Description |
|-------|----------|-------------|
| `brute_force_detected` | critical | Обнаружена brute-force атака |
| `ip_blocked` | warning | IP заблокирован |
| `suspicious_activity` | warning | Подозрительная активность |

### Session Events

| Event | Severity | Description |
|-------|----------|-------------|
| `session_created` | info | Сессия создана |
| `session_terminated` | info | Сессия завершена |
| `session_expired` | info | Сессия истекла |

---

## Примеры использования

### Логирование успешного входа

```typescript
await auditLogService.log({
  event_type: AuditEventType.LOGIN_SUCCESS,
  severity: AuditSeverity.INFO,
  user_id: user.id,
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
  description: `User ${user.email} logged in successfully`,
  metadata: {
    method: 'email_password',
    session_id: session.id,
  },
  success: true,
});
```

### Логирование неудачного входа

```typescript
await auditLogService.log({
  event_type: AuditEventType.LOGIN_FAILED,
  severity: AuditSeverity.WARNING,
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
  description: `Failed login attempt for email: ${email}`,
  metadata: {
    email,
    attempt_count: failedAttempts,
    reason: 'invalid_password',
  },
  success: false,
  error_message: 'Invalid credentials',
});
```

### Логирование изменения роли

```typescript
await auditLogService.log({
  event_type: AuditEventType.ROLE_ASSIGNED,
  severity: AuditSeverity.INFO,
  user_id: adminId,
  target_user_id: userId,
  ip_address: request.ip,
  description: `Role ${roleName} assigned to user ${userId}`,
  metadata: {
    role_name: roleName,
    role_id: roleId,
    previous_roles: previousRoles,
  },
  success: true,
});
```

### Логирование brute-force атаки

```typescript
await auditLogService.log({
  event_type: AuditEventType.BRUTE_FORCE_DETECTED,
  severity: AuditSeverity.CRITICAL,
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
  description: `Brute force attack detected from IP ${request.ip}`,
  metadata: {
    failed_attempts: 10,
    time_window_minutes: 5,
    targeted_email: email,
    action_taken: 'ip_blocked',
  },
  success: false,
  error_message: 'Too many failed login attempts',
});
```

---

## Хранение и ротация

### Политика хранения

| Severity | Срок хранения |
|----------|---------------|
| INFO | 90 дней |
| WARNING | 180 дней |
| ERROR | 365 дней |
| CRITICAL | 3 года |

### Архивация

Старые логи архивируются в отдельную таблицу или экспортируются:

```typescript
// Scheduled job для архивации
@Cron('0 2 * * *') // Каждый день в 2:00
async archiveOldLogs() {
  const cutoffDate = subDays(new Date(), 90);

  await this.auditLogRepository
    .createQueryBuilder()
    .where('severity = :severity', { severity: AuditSeverity.INFO })
    .andWhere('created_at < :cutoffDate', { cutoffDate })
    .delete()
    .execute();
}
```

---

## Индексы

```sql
-- Основные индексы для быстрого поиска
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Составной индекс для частых запросов
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-AUTH-80 | Логирование ключевых событий авторизации |
| REQ-AUTH-81 | Доступ к логам для администраторов |
| REQ-AUD-01 | 28 типов событий аудита |
| REQ-AUD-02 | 4 уровня важности |
| REQ-AUD-10 | Хранение IP-адреса и User-Agent |
| REQ-AUD-11 | Связь с пользователем-исполнителем |
| REQ-AUD-12 | Связь с целевым пользователем |
| REQ-AUD-20 | Фильтрация по типу события |
| REQ-AUD-21 | Фильтрация по дате |
| REQ-AUD-22 | Фильтрация по IP |
| REQ-AUD-30 | Статистика по событиям |
| REQ-AUD-31 | Обнаружение подозрительной активности |
| REQ-AUD-40 | Политика хранения по severity |
| REQ-AUD-41 | Архивация старых логов |

---

## Интеграции

### AuthService

```typescript
// При входе
async login(credentials: LoginDto, request: Request) {
  try {
    const user = await this.validateUser(credentials);

    await this.auditLogService.log({
      event_type: AuditEventType.LOGIN_SUCCESS,
      user_id: user.id,
      ip_address: request.ip,
      // ...
    });

    return this.generateTokens(user);
  } catch (error) {
    await this.auditLogService.log({
      event_type: AuditEventType.LOGIN_FAILED,
      ip_address: request.ip,
      success: false,
      error_message: error.message,
      // ...
    });
    throw error;
  }
}
```

### RbacService

```typescript
// При назначении роли
async assignRoleToUser(userId: string, roleId: string, adminId: string) {
  await this.userRoleRepository.save({ user_id: userId, role_id: roleId });

  await this.auditLogService.log({
    event_type: AuditEventType.ROLE_ASSIGNED,
    user_id: adminId,
    target_user_id: userId,
    metadata: { role_id: roleId },
    // ...
  });
}
```

### Rate Limiter

```typescript
// При блокировке IP
async blockIp(ip: string, reason: string) {
  await this.blockedIpsRepository.save({ ip, reason });

  await this.auditLogService.log({
    event_type: AuditEventType.IP_BLOCKED,
    severity: AuditSeverity.WARNING,
    ip_address: ip,
    metadata: { reason },
    // ...
  });
}
```
