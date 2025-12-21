# Machine Access Documentation

> **Модуль**: `backend/src/modules/machine-access/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Per-machine RBAC (Role-Based Access Control) — система контроля доступа к аппаратам на уровне отдельных машин. Позволяет назначать разные роли одному пользователю для разных аппаратов.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MACHINE ACCESS SYSTEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   MACHINE ACCESS                               │  │
│  │  ├── machine_id + user_id (уникальная пара)                   │  │
│  │  ├── 6 ролей: owner, admin, manager, operator, technician     │  │
│  │  └── Coexists with assigned_operator_id/assigned_technician_id│  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  ACCESS TEMPLATES                              │  │
│  │  ├── Шаблоны для массового назначения                         │  │
│  │  ├── Template → TemplateRows → Users + Roles                  │  │
│  │  └── Apply template to multiple machines                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 BULK OPERATIONS                                │  │
│  │  ├── Assign user to multiple machines                         │  │
│  │  ├── Apply template to machines                               │  │
│  │  └── Assign owner to all machines                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: MachineAccess

```typescript
@Entity('machine_access')
@Unique(['machine_id', 'user_id'])
@Index(['machine_id'])
@Index(['user_id'])
@Index(['role'])
export class MachineAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEWER,
  })
  role: MachineAccessRole;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;
}
```

---

## MachineAccessRole

```typescript
export enum MachineAccessRole {
  OWNER = 'owner',           // Владелец (полный доступ)
  ADMIN = 'admin',           // Администратор
  MANAGER = 'manager',       // Менеджер
  OPERATOR = 'operator',     // Оператор
  TECHNICIAN = 'technician', // Техник
  VIEWER = 'viewer',         // Только просмотр
}
```

### Иерархия ролей

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ROLE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  OWNER ─────────────────────────────────────────────────────────┐   │
│    │    Полный доступ ко всем функциям аппарата                 │   │
│    │                                                            │   │
│  ADMIN ─────────────────────────────────────────────────────────┤   │
│    │    Управление доступом, настройки                          │   │
│    │                                                            │   │
│  MANAGER ───────────────────────────────────────────────────────┤   │
│    │    Назначение задач, просмотр статистики                   │   │
│    │                                                            │   │
│  OPERATOR ──────────────────────────────────────────────────────┤   │
│    │    Выполнение задач (refill, collection)                   │   │
│    │                                                            │   │
│  TECHNICIAN ────────────────────────────────────────────────────┤   │
│    │    Техническое обслуживание, ремонт                        │   │
│    │                                                            │   │
│  VIEWER ────────────────────────────────────────────────────────┘   │
│         Только просмотр информации                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: AccessTemplate

Шаблоны для массового назначения доступов.

```typescript
@Entity('access_templates')
export class AccessTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @OneToMany(() => AccessTemplateRow, (row) => row.template, { cascade: true })
  rows: AccessTemplateRow[];
}
```

---

## Entity: AccessTemplateRow

Строки шаблона — определяют какие пользователи получат какие роли.

```typescript
@Entity('access_template_rows')
@Unique(['template_id', 'user_id'])
export class AccessTemplateRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => AccessTemplate, (template) => template.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: AccessTemplate;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEWER,
  })
  role: MachineAccessRole;
}
```

---

## Coexistence с существующими полями

**ВАЖНО**: MachineAccess coexists с полями `assigned_operator_id` и `assigned_technician_id` в Machine entity. Не изменяет существующее поведение назначений.

```
┌─────────────────────────────────────────────────────────────────────┐
│              MACHINE ACCESS vs ASSIGNED FIELDS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Machine Entity:                                                    │
│  ├── assigned_operator_id   ← Основной оператор (legacy)           │
│  ├── assigned_technician_id ← Основной техник (legacy)             │
│  └── access[] (via MachineAccess) ← Расширенные доступы            │
│                                                                     │
│  Оба механизма работают параллельно:                                │
│  - assigned_* используется для совместимости                        │
│  - MachineAccess для гранулярного контроля                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Сервис MachineAccessService

### CRUD операции

```typescript
@Injectable()
export class MachineAccessService {
  // Получить все доступы для аппарата
  async findByMachine(machineId: string): Promise<MachineAccess[]>;

  // Получить все доступы пользователя
  async findByUser(userId: string): Promise<MachineAccess[]>;

  // Получить доступ по ID
  async findOne(id: string): Promise<MachineAccess>;

  // Создать доступ (upsert)
  async create(dto: CreateMachineAccessDto, createdById: string): Promise<MachineAccess>;

  // Обновить роль
  async update(id: string, dto: UpdateMachineAccessDto): Promise<MachineAccess>;

  // Удалить доступ
  async remove(id: string): Promise<void>;
}
```

### Bulk операции

```typescript
// Назначить владельца на все аппараты (SuperAdmin only)
async assignOwnerToAllMachines(
  userId: string,
  createdById: string,
): Promise<{ applied: number; updated: number }>;

// Массовое назначение на несколько аппаратов
async bulkAssign(
  dto: BulkAssignDto,
  createdById: string,
): Promise<{ applied: number; updated: number }>;
```

### Шаблоны

```typescript
// CRUD шаблонов
async findAllTemplates(): Promise<AccessTemplate[]>;
async findTemplateById(id: string): Promise<AccessTemplate>;
async createTemplate(dto: CreateAccessTemplateDto, createdById: string): Promise<AccessTemplate>;
async updateTemplate(id: string, dto: UpdateAccessTemplateDto): Promise<AccessTemplate>;
async deleteTemplate(id: string): Promise<void>;

// Строки шаблона
async addTemplateRow(templateId: string, dto: CreateTemplateRowDto): Promise<AccessTemplateRow>;
async removeTemplateRow(templateId: string, rowId: string): Promise<void>;

// Применение шаблона
async applyTemplate(
  templateId: string,
  dto: ApplyTemplateDto,
  createdById: string,
): Promise<ApplyTemplateResponseDto>;
```

### Helpers

```typescript
// Проверка доступа
async hasAccess(userId: string, machineId: string, roles?: MachineAccessRole[]): Promise<boolean>;

// Резолв машин по номерам
async resolveMachineIds(machineNumbers?: string[], machineIds?: string[]): Promise<string[]>;

// Резолв пользователя
async resolveUser(identifier: string): Promise<User | null>;
```

---

## API Endpoints

### Machine Access CRUD

#### Получить доступы аппарата

```http
GET /api/machine-access/machine/:machineId
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "machine_id": "uuid",
    "user_id": "uuid",
    "role": "operator",
    "user": {
      "id": "uuid",
      "full_name": "Иван Петров",
      "email": "ivan@example.com"
    },
    "created_at": "2025-01-15T10:00:00Z",
    "created_by": { ... }
  }
]
```

#### Получить доступы пользователя

```http
GET /api/machine-access/user/:userId
Authorization: Bearer <token>
```

#### Создать/обновить доступ

```http
POST /api/machine-access
Authorization: Bearer <token>
Content-Type: application/json

{
  "machine_id": "uuid-машины",
  "user_id": "uuid-пользователя",
  "role": "operator"
}
```

**Поведение**: Если доступ уже существует — обновляет роль. Иначе создаёт новый.

#### Обновить роль

```http
PATCH /api/machine-access/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "manager"
}
```

#### Удалить доступ

```http
DELETE /api/machine-access/:id
Authorization: Bearer <token>
```

---

### Bulk Operations

#### Массовое назначение

```http
POST /api/machine-access/bulk-assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid-пользователя",
  "role": "operator",
  "machineIds": ["uuid-1", "uuid-2"],
  "machineNumbers": ["M-001", "M-002"]
}
```

**Response:**
```json
{
  "applied": 3,
  "updated": 1
}
```

#### Назначить владельца на все аппараты

```http
POST /api/machine-access/assign-owner-all
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid-пользователя"
}
```

---

### Templates

#### Получить все шаблоны

```http
GET /api/machine-access/templates
Authorization: Bearer <token>
```

#### Создать шаблон

```http
POST /api/machine-access/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Стандартная команда",
  "description": "Шаблон для типового аппарата"
}
```

#### Добавить строку в шаблон

```http
POST /api/machine-access/templates/:templateId/rows
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid-пользователя",
  "role": "operator"
}
```

#### Применить шаблон к аппаратам

```http
POST /api/machine-access/templates/:templateId/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "machineIds": ["uuid-1", "uuid-2"],
  "machineNumbers": ["M-003", "M-004"]
}
```

**Response:**
```json
{
  "applied_count": 5,
  "updated_count": 2,
  "machines_processed": 4,
  "errors": []
}
```

---

## Workflow использования

### Сценарий 1: Назначить оператора на аппарат

```http
POST /api/machine-access
{
  "machine_id": "uuid-машины",
  "user_id": "uuid-оператора",
  "role": "operator"
}
```

### Сценарий 2: Создать шаблон и применить

```
1. Создать шаблон
   POST /api/machine-access/templates
   { "name": "Команда А" }

2. Добавить пользователей
   POST /api/machine-access/templates/:id/rows
   { "user_id": "uuid-менеджера", "role": "manager" }

   POST /api/machine-access/templates/:id/rows
   { "user_id": "uuid-оператора", "role": "operator" }

3. Применить к аппаратам
   POST /api/machine-access/templates/:id/apply
   { "machineNumbers": ["M-001", "M-002", "M-003"] }
```

### Сценарий 3: Проверка доступа в коде

```typescript
// В service или guard
const hasAccess = await this.machineAccessService.hasAccess(
  userId,
  machineId,
  [MachineAccessRole.OPERATOR, MachineAccessRole.MANAGER],
);

if (!hasAccess) {
  throw new ForbiddenException('No access to this machine');
}
```

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр доступов | Admin, Manager, Owner (своих машин) |
| Назначение доступов | Admin, Owner |
| Bulk operations | Admin |
| Шаблоны (CRUD) | Admin |
| Apply template | Admin |
| Assign owner to all | SuperAdmin |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ACC-01 | Per-machine RBAC |
| REQ-ACC-02 | 6 ролей: owner, admin, manager, operator, technician, viewer |
| REQ-ACC-03 | Уникальность machine_id + user_id |
| REQ-ACC-10 | Bulk assign пользователя на несколько машин |
| REQ-ACC-11 | Access templates для массового назначения |
| REQ-ACC-12 | Apply template to machines |
| REQ-ACC-20 | Coexistence с assigned_operator_id |
| REQ-ACC-21 | hasAccess() helper method |
