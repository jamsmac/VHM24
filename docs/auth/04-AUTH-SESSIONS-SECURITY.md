# VendHub Manager - Сессии и Безопасность

> **Версия**: 2.0.0
> **Обновлено**: 2025-12-20
> **Исходный код**: `backend/src/modules/auth/services/`

---

## Содержание

1. [Управление Сессиями](#1-управление-сессиями)
2. [Token Blacklist (Redis)](#2-token-blacklist-redis)
3. [Rate Limiting](#3-rate-limiting)
4. [Brute Force Protection](#4-brute-force-protection)
5. [IP Whitelist](#5-ip-whitelist)
6. [Аудит Логирование](#6-аудит-логирование)
7. [Cookie Security](#7-cookie-security)
8. [JWT Security](#8-jwt-security)
9. [Password Security](#9-password-security)
10. [Security Headers](#10-security-headers)

---

## 1. Управление Сессиями

### 1.1 Архитектура Сессий

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SESSION ARCHITECTURE                                    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         SessionService                                   │   │
│  │                         (320 строк)                                      │   │
│  │                                                                          │   │
│  │  Методы:                                                                 │   │
│  │  • createSession()        - Создание новой сессии                       │   │
│  │  • rotateRefreshToken()   - Ротация refresh token                       │   │
│  │  • verifyRefreshToken()   - Проверка токена                             │   │
│  │  • getActiveSessions()    - Список активных сессий                      │   │
│  │  • getAllSessions()       - Все сессии (включая истёкшие)               │   │
│  │  • revokeSession()        - Отзыв конкретной сессии                     │   │
│  │  • revokeOtherSessions()  - Отзыв всех кроме текущей                    │   │
│  │  • revokeAllUserSessions()- Отзыв всех сессий пользователя              │   │
│  │  • cleanupExpired()       - Очистка истёкших сессий                     │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Хранение:                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      PostgreSQL: sessions                                │   │
│  │                                                                          │   │
│  │  id              UUID PRIMARY KEY                                        │   │
│  │  user_id         UUID NOT NULL REFERENCES users(id)                      │   │
│  │  refresh_token_hash  VARCHAR(255) NOT NULL                               │   │
│  │  ip_address      INET                                                    │   │
│  │  user_agent      TEXT                                                    │   │
│  │  device_info     JSONB                                                   │   │
│  │  last_activity   TIMESTAMP WITH TIME ZONE                                │   │
│  │  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL                       │   │
│  │  revoked_at      TIMESTAMP WITH TIME ZONE                                │   │
│  │  revoke_reason   VARCHAR(100)                                            │   │
│  │  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()                  │   │
│  │                                                                          │   │
│  │  INDEXES:                                                                │   │
│  │  • idx_sessions_user_id                                                  │   │
│  │  • idx_sessions_expires_at                                               │   │
│  │  • idx_sessions_refresh_token_hash                                       │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Конфигурация:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  MAX_SESSIONS_PER_USER = 5        // Максимум сессий на пользователя    │   │
│  │  SESSION_EXPIRATION_DAYS = 7      // Время жизни сессии                 │   │
│  │  REFRESH_TOKEN_EXPIRATION = 7d    // Совпадает с сессией                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Создание Сессии

```typescript
// session.service.ts:50-120
async createSession(params: {
  userId: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<Session> {
  const { userId, refreshToken, ipAddress, userAgent } = params;

  // 1. Проверить лимит сессий (максимум 5)
  const activeSessions = await this.getActiveSessions(userId);

  if (activeSessions.length >= this.maxSessionsPerUser) {
    // Удалить самую старую сессию
    const oldestSession = activeSessions.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    )[0];

    await this.revokeSession(oldestSession.id, 'max_sessions_exceeded');

    this.logger.log(
      `Revoked oldest session ${oldestSession.id} for user ${userId} (max sessions exceeded)`
    );
  }

  // 2. Хешировать refresh token
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  // 3. Парсить User-Agent для device info
  const deviceInfo = this.parseUserAgent(userAgent);

  // 4. Вычислить дату истечения (7 дней)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + this.sessionExpirationDays);

  // 5. Создать сессию
  const session = this.sessionRepository.create({
    user_id: userId,
    refresh_token_hash: refreshTokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    device_info: deviceInfo,
    last_activity: new Date(),
    expires_at: expiresAt,
  });

  await this.sessionRepository.save(session);

  this.logger.log(`Created session ${session.id} for user ${userId}`);

  return session;
}
```

### 1.3 Парсинг User-Agent

```typescript
// session.service.ts:130-160
import * as UAParser from 'ua-parser-js';

private parseUserAgent(userAgent?: string): DeviceInfo | null {
  if (!userAgent) return null;

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: {
      name: result.browser.name,
      version: result.browser.version,
    },
    os: {
      name: result.os.name,
      version: result.os.version,
    },
    device: {
      type: result.device.type || 'desktop',  // mobile, tablet, desktop
      vendor: result.device.vendor,
      model: result.device.model,
    },
  };
}

// Пример результата:
// {
//   browser: { name: 'Chrome', version: '120.0.0' },
//   os: { name: 'Windows', version: '10' },
//   device: { type: 'desktop', vendor: undefined, model: undefined }
// }
```

### 1.4 Ротация Refresh Token

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REFRESH TOKEN ROTATION                                    │
│                                                                                  │
│  Зачем нужна ротация?                                                           │
│  • Если refresh token украден, он может быть использован только ОДИН раз       │
│  • При каждом refresh выдаётся НОВЫЙ refresh token                              │
│  • Старый токен сразу становится невалидным                                     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   POST /auth/refresh                                                     │   │
│  │   {refreshToken: "old_token"}                                            │   │
│  │            │                                                             │   │
│  │            ▼                                                             │   │
│  │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │   │ 1. Верифицировать old_token                                      │   │   │
│  │   │ 2. Найти сессию по hash(old_token)                              │   │   │
│  │   │ 3. Генерировать new_token                                        │   │   │
│  │   │ 4. Обновить сессию: refresh_token_hash = hash(new_token)        │   │   │
│  │   │ 5. Blacklist old_token в Redis (на случай повторного использования) │  │
│  │   │ 6. Обновить last_activity                                        │   │   │
│  │   └─────────────────────────────────────────────────────────────────┘   │   │
│  │            │                                                             │   │
│  │            ▼                                                             │   │
│  │   Response: {access_token: "...", refresh_token: "new_token"}           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// session.service.ts:170-210
async rotateRefreshToken(
  sessionId: string,
  newRefreshToken: string,
): Promise<void> {
  // 1. Хешировать новый токен
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

  // 2. Обновить сессию
  await this.sessionRepository.update(sessionId, {
    refresh_token_hash: newRefreshTokenHash,
    last_activity: new Date(),
  });

  this.logger.debug(`Rotated refresh token for session ${sessionId}`);
}

async verifyRefreshToken(refreshToken: string): Promise<Session | null> {
  // 1. Получить все активные сессии
  const activeSessions = await this.sessionRepository.find({
    where: {
      expires_at: MoreThan(new Date()),
      revoked_at: IsNull(),
    },
  });

  // 2. Найти сессию по hash
  for (const session of activeSessions) {
    const isMatch = await bcrypt.compare(
      refreshToken,
      session.refresh_token_hash
    );

    if (isMatch) {
      return session;
    }
  }

  return null;
}
```

### 1.5 Управление Сессиями (API)

```typescript
// GET /auth/sessions - Активные сессии
async getActiveSessions(userId: string): Promise<SessionInfo[]> {
  const sessions = await this.sessionRepository.find({
    where: {
      user_id: userId,
      expires_at: MoreThan(new Date()),
      revoked_at: IsNull(),
    },
    order: { last_activity: 'DESC' },
  });

  return sessions.map(session => ({
    id: session.id,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    device_info: session.device_info,
    last_activity: session.last_activity,
    created_at: session.created_at,
    is_current: false,  // Определяется на уровне контроллера
  }));
}

// POST /auth/sessions/:id/revoke - Отозвать конкретную сессию
async revokeSession(sessionId: string, reason: string): Promise<void> {
  await this.sessionRepository.update(sessionId, {
    revoked_at: new Date(),
    revoke_reason: reason,
  });

  this.logger.log(`Session ${sessionId} revoked: ${reason}`);
}

// POST /auth/sessions/revoke-others - Отозвать все кроме текущей
async revokeOtherSessions(
  userId: string,
  currentRefreshToken: string,
): Promise<number> {
  const sessions = await this.getActiveSessions(userId);
  let revokedCount = 0;

  for (const session of sessions) {
    // Найти полную сессию с hash
    const fullSession = await this.sessionRepository.findOne({
      where: { id: session.id },
    });

    if (!fullSession) continue;

    // Проверить это не текущая сессия
    const isCurrent = await bcrypt.compare(
      currentRefreshToken,
      fullSession.refresh_token_hash
    );

    if (!isCurrent) {
      await this.revokeSession(session.id, 'revoked_other_sessions');
      revokedCount++;
    }
  }

  return revokedCount;
}
```

---

## 2. Token Blacklist (Redis)

### 2.1 Архитектура Blacklist

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN BLACKLIST ARCHITECTURE                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      TokenBlacklistService                               │   │
│  │                      (238 строк)                                         │   │
│  │                                                                          │   │
│  │  Назначение:                                                             │   │
│  │  • Мгновенный отзыв токенов (без ожидания истечения)                    │   │
│  │  • O(1) проверка при каждом запросе                                     │   │
│  │  • Автоматическая очистка через TTL                                     │   │
│  │  • Batch revocation (все токены пользователя)                           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Redis Keys:                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  vendhub:blacklist:token:{jti}                                          │   │
│  │  ├── TTL: 7 дней (время жизни refresh token)                           │   │
│  │  └── Value: {                                                            │   │
│  │        "userId": "uuid",                                                 │   │
│  │        "reason": "logout|password_changed|2fa_disabled|...",            │   │
│  │        "revokedAt": "2025-01-15T14:30:00.000Z"                          │   │
│  │      }                                                                   │   │
│  │                                                                          │   │
│  │  vendhub:blacklist:user:{userId}                                        │   │
│  │  ├── TTL: 7 дней                                                        │   │
│  │  └── Value: {                                                            │   │
│  │        "reason": "all_tokens_revoked",                                  │   │
│  │        "revokedAt": "..."                                               │   │
│  │      }                                                                   │   │
│  │  └── Означает: ВСЕ токены пользователя невалидны                        │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Код Сервиса

```typescript
// token-blacklist.service.ts

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly keyPrefix = 'vendhub:blacklist:';
  private readonly defaultTTL: number;  // 7 дней в секундах

  // ════════════════════════════════════════════════════════════════
  // BLACKLIST SINGLE TOKEN
  // ════════════════════════════════════════════════════════════════

  async blacklistToken(
    jti: string,
    userId: string,
    expiresInSeconds?: number,
    reason?: string,
  ): Promise<void> {
    const ttl = expiresInSeconds || this.defaultTTL;
    const key = `${this.keyPrefix}token:${jti}`;

    const value = JSON.stringify({
      userId,
      reason: reason || 'revoked',
      revokedAt: new Date().toISOString(),
    });

    await this.redis.setex(key, ttl, value);
    this.logger.debug(`Token blacklisted: ${jti} (TTL: ${ttl}s, reason: ${reason})`);
  }

  // ════════════════════════════════════════════════════════════════
  // BLACKLIST ALL USER TOKENS
  // ════════════════════════════════════════════════════════════════

  async blacklistUserTokens(userId: string, reason?: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    const value = JSON.stringify({
      reason: reason || 'all_tokens_revoked',
      revokedAt: new Date().toISOString(),
    });

    await this.redis.setex(key, this.defaultTTL, value);
    this.logger.log(`All tokens blacklisted for user: ${userId} (reason: ${reason})`);
  }

  // ════════════════════════════════════════════════════════════════
  // CHECK IF TOKEN SHOULD BE REJECTED
  // ════════════════════════════════════════════════════════════════

  async shouldRejectToken(jti: string, userId: string): Promise<boolean> {
    // Используем pipeline для эффективной проверки
    const pipeline = this.redis.pipeline();
    pipeline.exists(`${this.keyPrefix}token:${jti}`);    // Конкретный токен
    pipeline.exists(`${this.keyPrefix}user:${userId}`);  // Все токены пользователя

    const results = await pipeline.exec();

    const tokenBlacklisted = results?.[0]?.[1] === 1;
    const userBlacklisted = results?.[1]?.[1] === 1;

    if (tokenBlacklisted || userBlacklisted) {
      this.logger.debug(
        `Token rejected: jti=${jti}, tokenBlacklisted=${tokenBlacklisted}, userBlacklisted=${userBlacklisted}`
      );
    }

    return tokenBlacklisted || userBlacklisted;
  }

  // ════════════════════════════════════════════════════════════════
  // REMOVE USER FROM BLACKLIST (after re-authentication)
  // ════════════════════════════════════════════════════════════════

  async removeUserBlacklist(userId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.del(key);
    this.logger.debug(`User blacklist removed: ${userId}`);
  }
}
```

### 2.3 Интеграция с JwtStrategy

```typescript
// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Сначала из cookie
        (request: Request) => request?.cookies?.access_token,
        // 2. Затем из Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // 1. Проверить blacklist
    const isRejected = await this.tokenBlacklistService.shouldRejectToken(
      payload.jti,
      payload.sub,
    );

    if (isRejected) {
      throw new UnauthorizedException('Token was revoked');
    }

    // 2. Найти пользователя
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Проверить статус
    if (user.status !== UserStatus.ACTIVE &&
        user.status !== UserStatus.PASSWORD_CHANGE_REQUIRED) {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }
}
```

### 2.4 Когда Токены Добавляются в Blacklist

| Событие | Что блокируется | Причина (reason) |
|---------|-----------------|------------------|
| Logout | Все токены пользователя | `logout` |
| Смена пароля | Все токены пользователя | `password_changed` |
| Отключение 2FA | Все токены пользователя | `2fa_disabled` |
| Refresh token rotation | Старый refresh token | `token_rotated` |
| Отзыв сессии | Refresh token сессии | `session_revoked` |
| Admin блокировка | Все токены пользователя | `admin_action` |

---

## 3. Rate Limiting

### 3.1 Конфигурация Throttler

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 секунда
        limit: 3,     // 3 запроса
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 секунд
        limit: 20,    // 20 запросов
      },
      {
        name: 'long',
        ttl: 60000,   // 1 минута
        limit: 100,   // 100 запросов
      },
    ]),
  ],
})
export class AppModule {}
```

### 3.2 Rate Limits по Endpoints

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RATE LIMITS TABLE                                      │
│                                                                                  │
│  ┌───────────────────────────────────┬──────────┬────────────┬────────────────┐│
│  │ Endpoint                          │ Limit    │ Window     │ Назначение     ││
│  ├───────────────────────────────────┼──────────┼────────────┼────────────────┤│
│  │ POST /auth/login                  │ 5        │ 1 минута   │ Brute force    ││
│  │ POST /auth/register               │ 3        │ 5 минут    │ Spam           ││
│  │ POST /auth/refresh                │ 10       │ 1 минута   │ Normal use     ││
│  │ POST /auth/password-reset/*       │ 3        │ 1 час      │ Email spam     ││
│  │ POST /auth/2fa/login              │ 5        │ 1 минута   │ 2FA brute      ││
│  │ POST /auth/2fa/verify             │ 10       │ 1 минута   │ 2FA brute      ││
│  │ POST /auth/2fa/login/backup       │ 5        │ 1 минута   │ Backup brute   ││
│  │ * (default API)                   │ 100      │ 1 минута   │ General        ││
│  └───────────────────────────────────┴──────────┴────────────┴────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Применение Rate Limit

```typescript
// auth.controller.ts
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Post('login')
@UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 запросов в минуту
async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
  // ...
}

@Post('register')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 300000 } })  // 3 запроса за 5 минут
async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
  // ...
}

@Post('password-reset/request')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3 запроса в час
async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<any> {
  // ...
}
```

### 3.4 Ответ при Превышении Лимита

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
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

## 4. Brute Force Protection

### 4.1 Механизм Защиты

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BRUTE FORCE PROTECTION                                    │
│                                                                                  │
│  Конфигурация (environment variables):                                          │
│  • BRUTE_FORCE_MAX_ATTEMPTS = 5                                                 │
│  • BRUTE_FORCE_LOCKOUT_MINUTES = 15                                             │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           FLOW DIAGRAM                                   │   │
│  │                                                                          │   │
│  │   Login Attempt                                                          │   │
│  │        │                                                                 │   │
│  │        ▼                                                                 │   │
│  │   ┌─────────────────┐                                                   │   │
│  │   │ Is account      │──── Yes ────► 401 "Аккаунт заблокирован до HH:MM"│   │
│  │   │ locked?         │                                                   │   │
│  │   └────────┬────────┘                                                   │   │
│  │            │ No                                                          │   │
│  │            ▼                                                             │   │
│  │   ┌─────────────────┐                                                   │   │
│  │   │ Password        │──── Invalid ────┐                                 │   │
│  │   │ correct?        │                 │                                 │   │
│  │   └────────┬────────┘                 ▼                                 │   │
│  │            │                 ┌─────────────────┐                        │   │
│  │       Valid│                 │ Increment       │                        │   │
│  │            │                 │ failed_attempts │                        │   │
│  │            ▼                 └────────┬────────┘                        │   │
│  │   ┌─────────────────┐                 │                                 │   │
│  │   │ Reset           │                 ▼                                 │   │
│  │   │ failed_attempts │        ┌─────────────────┐                        │   │
│  │   │ = 0             │        │ attempts >= 5?  │                        │   │
│  │   └────────┬────────┘        └────────┬────────┘                        │   │
│  │            │                          │                                 │   │
│  │            ▼                     Yes  │  No                             │   │
│  │       SUCCESS                         ▼                                 │   │
│  │                              ┌─────────────────┐                        │   │
│  │                              │ Lock account    │                        │   │
│  │                              │ for 15 minutes  │                        │   │
│  │                              │                 │                        │   │
│  │                              │ Log BRUTE_FORCE │                        │   │
│  │                              │ _DETECTED       │                        │   │
│  │                              └─────────────────┘                        │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Код Реализации

```typescript
// auth.service.ts

// Запись неудачной попытки входа
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

  // Блокировка при превышении лимита
  if (newAttempts >= maxAttempts) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + lockoutMinutes);

    updateData.account_locked_until = lockUntil;

    // Аудит - обнаружен brute force
    await this.auditLogService.log({
      action: 'BRUTE_FORCE_DETECTED',
      userId: user.id,
      details: {
        attempts: newAttempts,
        lockedUntil: lockUntil.toISOString(),
        lastAttemptIp: 'from request',
      },
    });

    this.logger.warn(
      `Account locked for user ${user.email} until ${lockUntil.toISOString()}`
    );
  }

  await this.usersService.update(userId, updateData);
}

// Сброс счётчика при успешном входе
async resetFailedLogins(userId: string): Promise<void> {
  await this.usersService.update(userId, {
    failed_login_attempts: 0,
    account_locked_until: null,
    last_failed_login_at: null,
  });
}
```

### 4.3 Проверка Блокировки

```typescript
// user.entity.ts - computed property
get isLocked(): boolean {
  if (!this.account_locked_until) {
    return false;
  }
  return new Date() < this.account_locked_until;
}

// auth.service.ts - validateUser()
async validateUser(emailOrUsername: string, password: string): Promise<User | null> {
  const user = await this.findUserByEmailOrUsername(emailOrUsername);

  if (!user) {
    return null;
  }

  // Проверка блокировки
  if (user.isLocked) {
    const unlockTime = user.account_locked_until!.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    throw new UnauthorizedException(
      `Аккаунт временно заблокирован. Попробуйте снова после ${unlockTime}`
    );
  }

  // Остальная валидация...
}
```

---

## 5. IP Whitelist

### 5.1 Механизм

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            IP WHITELIST (REQ-AUTH-60)                            │
│                                                                                  │
│  Назначение:                                                                    │
│  • Ограничение доступа к аккаунту только с определённых IP адресов             │
│  • Дополнительная защита для админов и критичных пользователей                 │
│                                                                                  │
│  User Entity:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ip_whitelist_enabled: boolean = false                                   │   │
│  │  allowed_ips: string[] | null = ['192.168.1.100', '10.0.0.0/24', ...]   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  Поддерживаемые форматы:                                                        │
│  • IPv4: 192.168.1.100                                                          │
│  • IPv6: 2001:db8::1                                                            │
│  • CIDR: 10.0.0.0/24 (весь диапазон)                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 IpWhitelistGuard

```typescript
// guards/ip-whitelist.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    // Если whitelist не включен - пропускаем
    if (!user?.ip_whitelist_enabled) {
      return true;
    }

    // Если нет разрешённых IP - пропускаем (некорректная конфигурация)
    if (!user.allowed_ips || user.allowed_ips.length === 0) {
      return true;
    }

    // Получаем IP клиента (учитывая прокси)
    const clientIp = this.getClientIp(request);

    // Проверяем в списке
    const isAllowed = this.isIpAllowed(clientIp, user.allowed_ips);

    if (!isAllowed) {
      throw new ForbiddenException(
        `IP адрес ${clientIp} не находится в списке разрешенных (REQ-AUTH-60)`
      );
    }

    return true;
  }

  private getClientIp(request: Request): string {
    // Порядок проверки:
    // 1. X-Forwarded-For (если за прокси)
    // 2. X-Real-IP (nginx)
    // 3. request.ip
    // 4. socket.remoteAddress

    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    for (const allowed of allowedIps) {
      // Точное совпадение
      if (clientIp === allowed) {
        return true;
      }

      // CIDR проверка (упрощённая)
      if (allowed.includes('/')) {
        if (this.isIpInCidr(clientIp, allowed)) {
          return true;
        }
      }
    }

    return false;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    // Реализация проверки IP в CIDR диапазоне
    // Используется библиотека ip-cidr или ручная реализация
    // ...
  }
}
```

### 5.3 Применение Guard

```typescript
// auth.controller.ts
@Post('login')
@UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)  // ◄── IpWhitelistGuard
async login(...) { }

@Post('logout')
@UseGuards(JwtAuthGuard, IpWhitelistGuard)  // ◄── Тоже проверяем
async logout(...) { }
```

---

## 6. Аудит Логирование

### 6.1 События Аудита

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AUDIT LOG EVENTS                                        │
│                                                                                  │
│  ┌───────────────────────────────────┬──────────────────────────────────────┐  │
│  │ Event                             │ Description                          │  │
│  ├───────────────────────────────────┼──────────────────────────────────────┤  │
│  │ LOGIN_SUCCESS                     │ Успешный вход в систему              │  │
│  │ LOGIN_FAILED                      │ Неудачная попытка входа              │  │
│  │ LOGOUT                            │ Выход из системы                     │  │
│  │ TOKEN_REFRESHED                   │ Обновление токенов                   │  │
│  ├───────────────────────────────────┼──────────────────────────────────────┤  │
│  │ TWO_FA_ENABLED                    │ 2FA включена                         │  │
│  │ TWO_FA_DISABLED                   │ 2FA отключена                        │  │
│  │ TWO_FA_VERIFIED                   │ 2FA код верифицирован                │  │
│  │ TWO_FA_VERIFICATION_FAILED        │ Неверный 2FA код                     │  │
│  │ TWO_FA_LOGIN_SUCCESS              │ Успешный вход с 2FA                  │  │
│  │ TWO_FA_ENABLE_FAILED              │ Ошибка при включении 2FA             │  │
│  │ TWO_FA_DISABLED_BY_ADMIN          │ 2FA отключена администратором        │  │
│  │ BACKUP_CODE_USED                  │ Использован резервный код            │  │
│  ├───────────────────────────────────┼──────────────────────────────────────┤  │
│  │ PASSWORD_CHANGED                  │ Пароль изменён                       │  │
│  │ FIRST_LOGIN_PASSWORD_CHANGED      │ Пароль изменён при первом входе      │  │
│  │ PASSWORD_RESET_REQUESTED          │ Запрошен сброс пароля                │  │
│  │ PASSWORD_RESET_COMPLETED          │ Пароль сброшен                       │  │
│  ├───────────────────────────────────┼──────────────────────────────────────┤  │
│  │ BRUTE_FORCE_DETECTED              │ Обнаружена brute force атака         │  │
│  │ ACCOUNT_LOCKED                    │ Аккаунт заблокирован                 │  │
│  │ ACCOUNT_UNLOCKED                  │ Аккаунт разблокирован                │  │
│  ├───────────────────────────────────┼──────────────────────────────────────┤  │
│  │ SESSION_CREATED                   │ Сессия создана                       │  │
│  │ SESSION_REVOKED                   │ Сессия отозвана                      │  │
│  │ ALL_SESSIONS_REVOKED              │ Все сессии отозваны                  │  │
│  └───────────────────────────────────┴──────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Структура Записи Аудита

```typescript
interface AuditLogEntry {
  id: string;                    // UUID
  action: string;                // Тип события
  user_id: string;               // ID пользователя
  performed_by_id?: string;      // ID выполнившего (для admin действий)
  ip_address: string;            // IP адрес
  user_agent?: string;           // User-Agent
  details?: Record<string, any>; // Дополнительные данные
  created_at: Date;              // Время события
}

// Пример записи:
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "action": "LOGIN_SUCCESS",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  "details": {
    "email": "operator@vendhub.uz",
    "method": "email_password",
    "has_2fa": false
  },
  "created_at": "2025-01-15T14:30:00.000Z"
}
```

### 6.3 Использование в Коде

```typescript
// Пример логирования
await this.auditLogService.log({
  action: 'LOGIN_SUCCESS',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: {
    email: user.email,
    method: user.is_2fa_enabled ? '2fa' : 'password',
  },
});
```

---

## 7. Cookie Security

### 7.1 Настройки Cookies

```typescript
// services/cookie.service.ts
@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly domain?: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
    this.domain = configService.get('COOKIE_DOMAIN');
  }

  setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    // Access Token Cookie
    response.cookie('access_token', accessToken, {
      httpOnly: true,           // Недоступен через JS (защита от XSS)
      secure: this.isProduction, // Только HTTPS в production
      sameSite: 'strict',       // Защита от CSRF
      path: '/',                // Доступен для всех путей
      maxAge: 15 * 60 * 1000,   // 15 минут в миллисекундах
      domain: this.domain,
    });

    // Refresh Token Cookie
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/auth',            // Только для /auth/* endpoints
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 дней
      domain: this.domain,
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/',
      domain: this.domain,
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/auth',
      domain: this.domain,
    });
  }
}
```

### 7.2 Атрибуты Cookie

| Атрибут | Значение | Защита |
|---------|----------|--------|
| `httpOnly` | `true` | XSS - JS не может прочитать cookie |
| `secure` | `true` (prod) | MITM - только через HTTPS |
| `sameSite` | `strict` | CSRF - не отправляется с cross-site запросами |
| `path` | `/` или `/auth` | Ограничение области видимости |
| `maxAge` | 15min / 7d | Автоматическое истечение |

---

## 8. JWT Security

### 8.1 Настройки JWT

```typescript
// Конфигурация
{
  secret: process.env.JWT_SECRET,          // Минимум 32 символа
  signOptions: {
    algorithm: 'HS256',                    // HMAC-SHA256
    expiresIn: '15m',                      // Access token
    issuer: 'vendhub',                     // Издатель
  },
}

// Payload обязательные поля
{
  sub: userId,          // Subject (user ID)
  jti: uuid(),          // Unique token ID (для отзыва)
  type: 'access',       // Тип токена
  iat: timestamp,       // Issued at
  exp: timestamp,       // Expiration
}
```

### 8.2 Рекомендации по JWT_SECRET

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         JWT_SECRET REQUIREMENTS                                  │
│                                                                                  │
│  ✓ Минимум 32 символа (256 бит)                                                │
│  ✓ Криптографически случайный                                                  │
│  ✓ Уникальный для каждого окружения (dev/staging/prod)                         │
│  ✓ Хранится в переменных окружения, НЕ в коде                                  │
│  ✓ Регулярная ротация (каждые 90 дней рекомендуется)                           │
│                                                                                  │
│  Генерация:                                                                      │
│  $ openssl rand -base64 48                                                      │
│  # Пример: "K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols5d4JYKNQ0fjGJNuU1b3sL"  │
│                                                                                  │
│  ✗ НЕ использовать:                                                            │
│  - "secret", "password", "jwt_secret"                                           │
│  - Предсказуемые значения                                                       │
│  - Один секрет для всех окружений                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Password Security

### 9.1 Требования к Паролю

```typescript
// Валидация пароля (class-validator)
@IsString()
@MinLength(8, { message: 'Пароль должен быть минимум 8 символов' })
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  { message: 'Пароль должен содержать заглавные, строчные буквы, цифры и спецсимволы' }
)
password: string;
```

### 9.2 Bcrypt Настройки

```typescript
const SALT_ROUNDS = 10;  // Рекомендуемое значение

// Время хеширования при разных salt rounds:
// 8  = ~40ms
// 10 = ~100ms (рекомендуется)
// 12 = ~400ms
// 14 = ~1600ms

// Хеширование
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Проверка
const isValid = await bcrypt.compare(password, hash);
```

---

## 10. Security Headers

### 10.1 Helmet Configuration

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
```

### 10.2 CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: [
    'https://app.vendhub.uz',
    'https://admin.vendhub.uz',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,  // Для cookies
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
  ],
  maxAge: 86400,  // 24 часа кеширование preflight
});
```

### 10.3 Результирующие Headers

```http
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; ...
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
X-DNS-Prefetch-Control: off
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Резюме Безопасности

### Чеклист Безопасности

| Мера | Статус | Описание |
|------|--------|----------|
| JWT с JTI | ✅ | Уникальный ID для отзыва токенов |
| Token Blacklist | ✅ | Redis-based мгновенный отзыв |
| Rate Limiting | ✅ | @nestjs/throttler |
| Brute Force Protection | ✅ | 5 попыток → 15 мин блокировка |
| IP Whitelist | ✅ | Опциональное ограничение по IP |
| 2FA (TOTP) | ✅ | С AES-256-GCM шифрованием |
| Bcrypt Passwords | ✅ | Salt rounds = 10 |
| httpOnly Cookies | ✅ | Защита от XSS |
| Secure Cookies | ✅ | Только HTTPS |
| SameSite Cookies | ✅ | Защита от CSRF |
| CORS | ✅ | Whitelist доменов |
| Helmet Headers | ✅ | Security headers |
| Audit Logging | ✅ | Все auth события |
| Session Management | ✅ | Max 5, 7 дней TTL |

---

**Версия документа**: 2.0.0
**Создан**: 2025-12-20
**Автор**: VendHub Development Team
