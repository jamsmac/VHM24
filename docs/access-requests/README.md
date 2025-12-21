# Access Requests Documentation

> **Модуль**: `backend/src/modules/access-requests/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль управления заявками на доступ к системе. Пользователи могут подать заявку через Telegram-бот, а администраторы одобряют или отклоняют заявки с назначением ролей.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ACCESS REQUESTS SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   ACCESS REQUEST                               │  │
│  │  ├── telegram_id (varchar) - ID пользователя Telegram          │  │
│  │  ├── telegram_username (varchar) - username                    │  │
│  │  ├── telegram_first_name / telegram_last_name                  │  │
│  │  ├── source (enum) - источник заявки                           │  │
│  │  ├── status (enum) - статус обработки                          │  │
│  │  ├── processed_by_user_id - кто обработал                      │  │
│  │  ├── processed_at - когда обработано                           │  │
│  │  ├── rejection_reason - причина отказа                         │  │
│  │  └── created_user_id - созданный пользователь                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    WORKFLOW                                    │  │
│  │                                                                │  │
│  │  Telegram Bot (/start) ───► NEW ───┬───► APPROVED ───► User   │  │
│  │                                    │                          │  │
│  │                                    └───► REJECTED             │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 APPROVAL PROCESS                               │  │
│  │  ├── Admin видит заявки в статусе NEW                         │  │
│  │  ├── Admin назначает роли при одобрении                       │  │
│  │  ├── Генерируется временный пароль                            │  │
│  │  ├── Создаётся учётная запись User                            │  │
│  │  └── Роли назначаются через RbacService                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### AccessRequestStatus

```typescript
export enum AccessRequestStatus {
  NEW = 'new',           // Новая заявка, ожидает рассмотрения
  APPROVED = 'approved', // Одобрена, пользователь создан
  REJECTED = 'rejected', // Отклонена
}
```

### AccessRequestSource

```typescript
export enum AccessRequestSource {
  TELEGRAM = 'telegram', // Через Telegram-бот
  WEB = 'web',           // Через веб-форму
  MANUAL = 'manual',     // Создана вручную админом
}
```

---

## Entity

### AccessRequest Entity

```typescript
@Entity('access_requests')
@Index(['telegram_id'])
@Index(['status'])
@Index(['created_at'])
export class AccessRequest extends BaseEntity {
  // Telegram данные
  @Column({ type: 'varchar', length: 100 })
  telegram_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_first_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_last_name: string | null;

  // Метаданные заявки
  @Column({
    type: 'enum',
    enum: AccessRequestSource,
    default: AccessRequestSource.TELEGRAM,
  })
  source: AccessRequestSource;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    default: AccessRequestStatus.NEW,
  })
  status: AccessRequestStatus;

  // Данные обработки
  @Column({ type: 'uuid', nullable: true })
  processed_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by_user_id' })
  processed_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // Созданный пользователь (после одобрения)
  @Column({ type: 'uuid', nullable: true })
  created_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_user_id' })
  created_user: User | null;

  // Дополнительные данные
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
```

---

## Service

### AccessRequestsService

```typescript
@Injectable()
export class AccessRequestsService {
  /**
   * Создать заявку на доступ
   * REQ-AUTH-32: Упрощённая регистрация - только технические данные
   *
   * @throws ConflictException если пользователь уже существует
   * @throws ConflictException если уже есть активная заявка
   */
  async create(createDto: CreateAccessRequestDto): Promise<AccessRequest>;

  /**
   * Получить все заявки с фильтрами
   */
  async findAll(queryDto: QueryAccessRequestDto): Promise<{
    data: AccessRequest[];
    total: number;
  }>;

  /**
   * Получить заявку по ID
   */
  async findOne(id: string): Promise<AccessRequest>;

  /**
   * Одобрить заявку и создать пользователя
   * REQ-AUTH-33: Админ назначает роли при одобрении
   *
   * @param id - ID заявки
   * @param approveDto - Данные для одобрения (роли, email)
   * @param adminUserId - ID админа
   * @throws BadRequestException если заявка уже обработана
   * @throws BadRequestException если невалидные роли
   */
  async approve(
    id: string,
    approveDto: ApproveAccessRequestDto,
    adminUserId: string,
  ): Promise<AccessRequest>;

  /**
   * Отклонить заявку
   * REQ-AUTH-33: Админ может отклонить с указанием причины
   */
  async reject(
    id: string,
    rejectDto: RejectAccessRequestDto,
    adminUserId: string,
  ): Promise<AccessRequest>;

  /**
   * Удалить заявку (soft delete)
   */
  async remove(id: string): Promise<void>;
}
```

---

## DTOs

### CreateAccessRequestDto

```typescript
export class CreateAccessRequestDto {
  @IsString()
  telegram_id: string;

  @IsOptional()
  @IsString()
  telegram_username?: string;

  @IsOptional()
  @IsString()
  telegram_first_name?: string;

  @IsOptional()
  @IsString()
  telegram_last_name?: string;

  @IsOptional()
  @IsEnum(AccessRequestSource)
  source?: AccessRequestSource;

  @IsOptional()
  metadata?: Record<string, any>;
}
```

### ApproveAccessRequestDto

```typescript
export class ApproveAccessRequestDto {
  @IsArray()
  @IsString({ each: true })
  role_names: string[];

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  temporary_password?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### RejectAccessRequestDto

```typescript
export class RejectAccessRequestDto {
  @IsString()
  rejection_reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### QueryAccessRequestDto

```typescript
export class QueryAccessRequestDto {
  @IsOptional()
  @IsEnum(AccessRequestStatus)
  status?: AccessRequestStatus;

  @IsOptional()
  @IsEnum(AccessRequestSource)
  source?: AccessRequestSource;

  @IsOptional()
  @IsString()
  telegram_id?: string;

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

### Получить все заявки

```http
GET /api/access-requests?status=new&limit=20&offset=0
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "telegram_id": "123456789",
      "telegram_username": "john_doe",
      "telegram_first_name": "John",
      "telegram_last_name": "Doe",
      "source": "telegram",
      "status": "new",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

### Создать заявку (из Telegram-бота)

```http
POST /api/access-requests
Content-Type: application/json

{
  "telegram_id": "123456789",
  "telegram_username": "john_doe",
  "telegram_first_name": "John",
  "telegram_last_name": "Doe",
  "source": "telegram"
}
```

### Одобрить заявку

```http
POST /api/access-requests/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role_names": ["OPERATOR"],
  "email": "john@company.com",
  "notes": "Новый оператор для локации Центр"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "approved",
  "processed_by_user_id": "admin-uuid",
  "processed_at": "2025-01-15T12:00:00Z",
  "created_user_id": "new-user-uuid",
  "created_user": {
    "id": "new-user-uuid",
    "full_name": "John Doe",
    "email": "john@company.com",
    "telegram_user_id": "123456789"
  }
}
```

### Отклонить заявку

```http
POST /api/access-requests/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rejection_reason": "Недостаточно информации для идентификации",
  "notes": "Пользователь не прошёл верификацию"
}
```

### Удалить заявку

```http
DELETE /api/access-requests/:id
Authorization: Bearer <admin_token>
```

---

## Workflow

### 1. Создание заявки через Telegram-бот

```
Пользователь                    Telegram-бот                AccessRequestsService
     │                              │                              │
     │  /start                      │                              │
     │─────────────────────────────>│                              │
     │                              │  create()                    │
     │                              │─────────────────────────────>│
     │                              │                              │──┐ Проверка существующего
     │                              │                              │<─┘ пользователя и заявок
     │                              │                              │
     │                              │  AccessRequest (NEW)         │
     │                              │<─────────────────────────────│
     │  "Заявка создана"            │                              │
     │<─────────────────────────────│                              │
```

### 2. Одобрение заявки

```
Admin                          Dashboard                 AccessRequestsService
  │                              │                              │
  │  Просмотр заявок             │                              │
  │─────────────────────────────>│  findAll({status: 'new'})    │
  │                              │─────────────────────────────>│
  │                              │                              │
  │  Список заявок               │                              │
  │<─────────────────────────────│<─────────────────────────────│
  │                              │                              │
  │  Одобрить с ролями           │                              │
  │─────────────────────────────>│  approve(id, dto)            │
  │                              │─────────────────────────────>│
  │                              │                              │──┐ 1. Валидация ролей
  │                              │                              │  │ 2. Генерация пароля
  │                              │                              │  │ 3. Создание User
  │                              │                              │<─┘ 4. Назначение ролей
  │                              │                              │
  │  Пользователь создан         │                              │
  │<─────────────────────────────│<─────────────────────────────│
```

---

## Генерация временного пароля

```typescript
private generateTemporaryPassword(): string {
  return randomBytes(12).toString('base64').slice(0, 16);
}
```

Если пароль не указан в `ApproveAccessRequestDto`, генерируется случайный 16-символьный пароль.

---

## Формирование имени пользователя

```typescript
private buildFullName(request: AccessRequest): string {
  const parts: string[] = [];

  if (request.telegram_first_name) {
    parts.push(request.telegram_first_name);
  }

  if (request.telegram_last_name) {
    parts.push(request.telegram_last_name);
  }

  if (parts.length === 0 && request.telegram_username) {
    return `@${request.telegram_username}`;
  }

  return parts.join(' ') || `Telegram User ${request.telegram_id}`;
}
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-AUTH-32 | Упрощённая регистрация через Telegram |
| REQ-AUTH-33 | Назначение ролей при одобрении |
| REQ-ACC-01 | Три статуса заявки (new, approved, rejected) |
| REQ-ACC-02 | Три источника (telegram, web, manual) |
| REQ-ACC-10 | Проверка на дублирование telegram_id |
| REQ-ACC-11 | Проверка на существующую активную заявку |
| REQ-ACC-20 | Создание пользователя при одобрении |
| REQ-ACC-21 | Генерация временного пароля |
| REQ-ACC-22 | Назначение ролей через RBAC |
| REQ-ACC-30 | Указание причины при отклонении |

---

## Интеграции

### UsersService

При одобрении заявки вызывается `usersService.create()` для создания пользователя:

```typescript
const user = await this.usersService.create({
  full_name: this.buildFullName(request),
  email,
  password: temporaryPassword,
  phone: undefined,
  telegram_user_id: request.telegram_id,
  telegram_username: request.telegram_username ?? undefined,
  status: UserStatus.ACTIVE,
  role: UserRole.OPERATOR,
});
```

### RbacService

Роли назначаются через RBAC-сервис:

```typescript
const roles = await this.rbacService.findRolesByNames(approveDto.role_names);
await this.rbacService.assignRolesToUser(user.id, roleIds);
```

### Telegram-бот

Telegram-бот создаёт заявки через публичный endpoint:

```typescript
// telegram.service.ts
async handleStartCommand(ctx: Context) {
  const telegramUser = ctx.from;

  await this.accessRequestsService.create({
    telegram_id: telegramUser.id.toString(),
    telegram_username: telegramUser.username,
    telegram_first_name: telegramUser.first_name,
    telegram_last_name: telegramUser.last_name,
    source: AccessRequestSource.TELEGRAM,
  });

  await ctx.reply('Ваша заявка принята и ожидает рассмотрения.');
}
```
