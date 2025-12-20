# Client Users - Пользователи

> **Модуль**: `backend/src/modules/client/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

ClientUser — пользователь клиентской платформы, отдельный от Staff Users. Аутентификация через Telegram Web App. Автоматическая регистрация при первом входе.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLIENT USER SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    CLIENT USER                                 │  │
│  │  ├── telegram_id (primary identifier)                         │  │
│  │  ├── telegram_username (optional)                             │  │
│  │  ├── full_name, phone, email                                  │  │
│  │  ├── language: ru, uz, en                                     │  │
│  │  ├── is_verified (true при Telegram auth)                     │  │
│  │  └── preferences (JSON)                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                TELEGRAM WEB APP AUTH                           │  │
│  │  ├── initData validation (HMAC-SHA256)                        │  │
│  │  ├── auth_date check (max 24 hours)                           │  │
│  │  ├── User data extraction                                     │  │
│  │  └── Auto-registration on first login                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   JWT TOKENS                                   │  │
│  │  ├── access_token (1 hour expiry)                             │  │
│  │  ├── refresh_token (30 days expiry)                           │  │
│  │  └── type: 'client_access' / 'client_refresh'                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: ClientUser

```typescript
@Entity('client_users')
@Index(['telegram_username'], { unique: true, where: 'telegram_username IS NOT NULL' })
@Index(['telegram_id'], { unique: true, where: 'telegram_id IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class ClientUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Telegram идентификация
  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'bigint', nullable: true })
  telegram_id: number | null;

  // Профиль
  @Column({ type: 'varchar', length: 100, nullable: true })
  full_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  // Верификация
  @Column({ type: 'boolean', default: false })
  is_verified: boolean;  // true при Telegram auth

  @Column({ type: 'timestamp with time zone', nullable: true })
  verified_at: Date | null;

  // Настройки
  @Column({ type: 'varchar', length: 10, default: 'ru' })
  language: string;  // ru, uz, en

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any> | null;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_active_at: Date | null;
}
```

---

## Staff User vs Client User

| Характеристика | Staff User (users) | Client User (client_users) |
|----------------|-------------------|---------------------------|
| Таблица | `users` | `client_users` |
| Аутентификация | Email/Password | Telegram Web App |
| Роли | 6 системных ролей | Нет ролей |
| Machine Access | Per-machine RBAC | Нет |
| 2FA | TOTP, SMS, Telegram | Нет (Telegram = 2FA) |
| Назначение | Операторы, менеджеры | Клиенты, покупатели |

---

## Telegram Web App Authentication

### Процесс аутентификации

```
┌─────────────────────────────────────────────────────────────────────┐
│              TELEGRAM WEB APP AUTH FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Пользователь открывает Mini App                                 │
│     └── Telegram предоставляет initData                             │
│                                                                     │
│  2. Frontend отправляет initData на backend                         │
│     POST /api/client/auth/telegram                                  │
│     { "initData": "query_id=...&user=...&hash=..." }                │
│                                                                     │
│  3. Backend валидирует initData                                     │
│     ├── Парсинг URLSearchParams                                     │
│     ├── Извлечение hash                                             │
│     ├── Сортировка параметров по алфавиту                           │
│     ├── Формирование data_check_string                              │
│     ├── Вычисление HMAC-SHA256                                      │
│     ├── Сравнение hash с expected hash                              │
│     └── Проверка auth_date (не старше 24 часов)                     │
│                                                                     │
│  4. Создание/обновление ClientUser                                  │
│     ├── Поиск по telegram_id                                        │
│     ├── Создание нового если не найден                              │
│     └── Обновление telegram_username если изменился                 │
│                                                                     │
│  5. Генерация JWT токенов                                           │
│     ├── access_token (1 час)                                        │
│     └── refresh_token (30 дней)                                     │
│                                                                     │
│  6. Создание LoyaltyAccount (для новых пользователей)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Валидация initData

```typescript
/**
 * Validate Telegram initData and extract user data
 * Based on https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
private validateTelegramInitData(initData: string): TelegramUserData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // Sort params alphabetically
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Calculate expected hash
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(this.botToken)
    .digest();

  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Verify hash
  if (hash !== expectedHash) {
    return null;
  }

  // Check auth_date is not too old (24 hours)
  const authDate = parseInt(params.get('auth_date') || '0');
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return null;
  }

  // Parse user data
  const userParam = params.get('user');
  return userParam ? JSON.parse(userParam) : null;
}
```

### initData структура

```
query_id=AAHdF6IQ...
&user=%7B%22id%22%3A12345678%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D
&auth_date=1699999999
&hash=abc123def456...
```

**Decoded user:**
```json
{
  "id": 12345678,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "language_code": "en"
}
```

---

## JWT Tokens

### Access Token

```typescript
const payload = {
  sub: clientUser.id,        // ClientUser UUID
  telegram_id: clientUser.telegram_id,
  type: 'client_access',     // Distinguishes from staff tokens
};

const access_token = jwtService.sign(payload, {
  secret: jwtSecret,
  expiresIn: '1h',          // 1 hour expiry
});
```

### Refresh Token

```typescript
const refresh_token = jwtService.sign(
  { ...payload, type: 'client_refresh' },
  {
    secret: jwtSecret,
    expiresIn: '30d',       // 30 days expiry
  },
);
```

### Token Usage

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## ClientAuthGuard

```typescript
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload.type !== 'client_access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach user info to request
      request.clientUser = {
        id: payload.sub,
        telegram_id: payload.telegram_id,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

---

## Языки

| Код | Язык | По умолчанию |
|-----|------|--------------|
| ru | Русский | ✅ |
| uz | Узбекский | |
| en | English | |

Язык определяется из Telegram `language_code`:
- `uz*` → `uz`
- `en*` → `en`
- остальные → `ru`

---

## Сервис ClientAuthService

### Основные методы

```typescript
@Injectable()
export class ClientAuthService {
  // Аутентификация через Telegram
  async authenticateTelegram(dto: TelegramAuthDto): Promise<ClientAuthResponseDto>;

  // Обновление токена
  async refreshToken(refreshToken: string): Promise<ClientAuthResponseDto>;

  // Обновление профиля
  async updateProfile(clientUserId: string, dto: ClientProfileDto): Promise<ClientUserResponseDto>;

  // Получение текущего пользователя
  async getCurrentUser(clientUserId: string): Promise<ClientUserResponseDto>;

  // Валидация initData (private)
  private validateTelegramInitData(initData: string): TelegramUserData | null;

  // Генерация токенов (private)
  private generateTokens(clientUser: ClientUser): { access_token: string; refresh_token: string };

  // Маппинг языкового кода (private)
  private mapLanguageCode(code?: string): ClientLanguage;
}
```

---

## API Endpoints

### Аутентификация

```http
POST /api/client/auth/telegram
Content-Type: application/json

{
  "initData": "query_id=AAH...&user=%7B...&hash=..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "telegram_username": "johndoe",
    "telegram_id": 12345678,
    "full_name": "John Doe",
    "is_verified": true,
    "language": "en",
    "created_at": "2025-01-15T10:30:00Z",
    "loyalty_points": 0
  }
}
```

### Обновление токена

```http
POST /api/client/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Получение профиля

```http
GET /api/client/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "telegram_username": "johndoe",
  "telegram_id": 12345678,
  "full_name": "John Doe",
  "phone": "+998901234567",
  "email": "john@example.com",
  "is_verified": true,
  "language": "ru",
  "created_at": "2025-01-15T10:30:00Z",
  "loyalty_points": 1500
}
```

### Обновление профиля

```http
PATCH /api/client/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "full_name": "John Smith",
  "phone": "+998901234567",
  "email": "john.smith@example.com",
  "language": "uz"
}
```

---

## DTO

### TelegramAuthDto

```typescript
export class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData: string;
}
```

### ClientProfileDto

```typescript
export class ClientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+998\d{9}$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(ClientLanguage)
  language?: ClientLanguage;
}
```

### ClientUserResponseDto

```typescript
export interface ClientUserResponseDto {
  id: string;
  telegram_username?: string;
  telegram_id: number | null;
  full_name?: string;
  phone?: string;
  email?: string;
  is_verified: boolean;
  language: ClientLanguage;
  created_at: Date;
  loyalty_points: number;
}
```

---

## Автоматические действия

### При первом входе

1. Создание `ClientUser` с данными из Telegram
2. Создание `ClientLoyaltyAccount` с нулевым балансом
3. Установка `is_verified = true`
4. Логирование события

### При повторном входе

1. Обновление `telegram_username` если изменился
2. Обновление `last_active_at`

---

## Preferences (JSON)

Пример структуры предпочтений:

```json
{
  "notifications": {
    "orders": true,
    "promos": false
  },
  "favorite_machines": ["uuid-1", "uuid-2"],
  "default_payment": "click"
}
```

---

## Связи

- **ClientLoyaltyAccount** - 1:1 счёт лояльности
- **ClientWallet** - 1:1 кошелёк (Phase 2)
- **ClientOrder** - 1:N заказы
- **ClientPayment** - 1:N платежи

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-CLIENT-01 | Telegram Web App аутентификация |
| REQ-CLIENT-02 | Отдельная таблица от Staff Users |
| REQ-CLIENT-03 | Автоматическая регистрация |
| REQ-CLIENT-04 | JWT токены (access: 1h, refresh: 30d) |
| REQ-CLIENT-05 | Поддержка языков: ru, uz, en |
| REQ-CLIENT-06 | Валидация initData по HMAC |
| REQ-CLIENT-07 | Проверка auth_date (max 24h) |
