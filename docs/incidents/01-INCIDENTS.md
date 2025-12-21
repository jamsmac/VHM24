# Incidents - Инциденты

> **Модуль**: `backend/src/modules/incidents/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система инцидентов отслеживает сбои и проблемы с оборудованием. Инциденты регистрируются сотрудниками, назначаются на исполнение и ведутся до полного закрытия.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       INCIDENT LIFECYCLE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│      ┌────────────┐                                                 │
│      │    OPEN    │◀───────── Создание инцидента                   │
│      │  (открыт)  │                                                 │
│      └─────┬──────┘                                                 │
│            │ assign()                                               │
│            ▼                                                        │
│      ┌────────────┐                                                 │
│      │IN_PROGRESS │◀───────── Назначен исполнитель                 │
│      │ (в работе) │                                                 │
│      └─────┬──────┘                                                 │
│            │ resolve()                                              │
│            ▼                                                        │
│      ┌────────────┐                                                 │
│      │  RESOLVED  │◀───────── Проблема решена                      │
│      │  (решён)   │                                                 │
│      └─────┬──────┘                                                 │
│            │ close()                                                │
│            ▼                                                        │
│      ┌────────────┐         ┌────────────┐                         │
│      │   CLOSED   │────────▶│    OPEN    │ reopen()                │
│      │  (закрыт)  │         │ (повторно) │                         │
│      └────────────┘         └────────────┘                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Incident

```typescript
@Entity('incidents')
@Index(['incident_type'])
@Index(['status'])
@Index(['priority'])
@Index(['machine_id'])
@Index(['reported_at'])
export class Incident extends BaseEntity {
  // Классификация
  @Column({ type: 'enum', enum: IncidentType })
  incident_type: IncidentType;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @Column({ type: 'enum', enum: IncidentPriority, default: IncidentPriority.MEDIUM })
  priority: IncidentPriority;

  // Привязка к аппарату
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE', eager: true })
  machine: Machine;

  // Описание
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  // Кто сообщил
  @Column({ type: 'uuid', nullable: true })
  reported_by_user_id: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  reported_at: Date;

  // Назначение
  @Column({ type: 'uuid', nullable: true })
  assigned_to_user_id: string | null;

  // Временные метки
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closed_at: Date | null;

  // Решение
  @Column({ type: 'text', nullable: true })
  resolution_notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  repair_task_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  repair_cost: number | null;

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Типы инцидентов (IncidentType)

```typescript
export enum IncidentType {
  TECHNICAL_FAILURE = 'technical_failure', // Техническая неисправность
  OUT_OF_STOCK = 'out_of_stock',           // Закончился товар
  CASH_FULL = 'cash_full',                 // Купюроприемник переполнен
  CASH_DISCREPANCY = 'cash_discrepancy',   // Расхождение в инкассации
  VANDALISM = 'vandalism',                 // Вандализм
  POWER_OUTAGE = 'power_outage',           // Отключение электричества
  OTHER = 'other',                         // Прочее
}
```

| Тип | Описание | Типичный приоритет |
|-----|----------|-------------------|
| `technical_failure` | Сбой оборудования (кофемолка, терминал, и т.д.) | HIGH/CRITICAL |
| `out_of_stock` | Закончились ингредиенты или продукты | MEDIUM |
| `cash_full` | Переполнен сейф или купюроприёмник | HIGH |
| `cash_discrepancy` | Расхождение между отчётом и инкассацией | HIGH |
| `vandalism` | Повреждение аппарата | CRITICAL |
| `power_outage` | Аппарат обесточен | MEDIUM |
| `other` | Прочие инциденты | LOW/MEDIUM |

---

## Статусы (IncidentStatus)

```typescript
export enum IncidentStatus {
  OPEN = 'open',             // Открыт, ожидает назначения
  IN_PROGRESS = 'in_progress', // В работе
  RESOLVED = 'resolved',     // Решён, ожидает проверки
  CLOSED = 'closed',         // Закрыт
}
```

### Правила переходов

| Из статуса | В статус | Метод | Условие |
|------------|----------|-------|---------|
| OPEN | IN_PROGRESS | `assign()` | Назначен исполнитель |
| OPEN, IN_PROGRESS | RESOLVED | `resolve()` | Проблема решена |
| RESOLVED | CLOSED | `close()` | Проверка пройдена |
| CLOSED | OPEN | `reopen()` | Проблема повторилась |

---

## Приоритеты (IncidentPriority)

```typescript
export enum IncidentPriority {
  LOW = 'low',           // Низкий - можно отложить
  MEDIUM = 'medium',     // Средний - в течение дня
  HIGH = 'high',         // Высокий - срочно
  CRITICAL = 'critical', // Критический - немедленно
}
```

### SLA по приоритетам

| Приоритет | Время реакции | Время решения |
|-----------|---------------|---------------|
| CRITICAL | 15 минут | 2 часа |
| HIGH | 1 час | 4 часа |
| MEDIUM | 4 часа | 24 часа |
| LOW | 24 часа | 72 часа |

---

## Сервис IncidentsService

### Основные методы

```typescript
@Injectable()
export class IncidentsService {
  // Создание инцидента
  async create(dto: CreateIncidentDto): Promise<Incident>;

  // Получение списка с фильтрацией
  async findAll(
    status?: IncidentStatus,
    type?: IncidentType,
    machineId?: string,
    priority?: IncidentPriority,
    assignedToUserId?: string,
  ): Promise<Incident[]>;

  // Получение по ID
  async findOne(id: string): Promise<Incident>;

  // Обновление
  async update(id: string, dto: UpdateIncidentDto): Promise<Incident>;

  // Назначить исполнителя
  async assign(id: string, userId: string): Promise<Incident>;

  // Отметить решённым
  async resolve(id: string, dto: ResolveIncidentDto): Promise<Incident>;

  // Закрыть
  async close(id: string): Promise<Incident>;

  // Переоткрыть
  async reopen(id: string, reason: string): Promise<Incident>;

  // Удаление (soft delete)
  async remove(id: string): Promise<void>;

  // Статистика
  async getStats(): Promise<IncidentStats>;

  // Критические инциденты
  async getCriticalIncidents(): Promise<Incident[]>;
}
```

---

## API Endpoints

### Создать инцидент

```http
POST /api/incidents
Authorization: Bearer <token>

{
  "incident_type": "technical_failure",
  "machine_id": "uuid",
  "title": "Не работает купюроприёмник",
  "description": "Аппарат не принимает купюры, показывает ошибку E42",
  "priority": "high",
  "reported_by_user_id": "uuid"
}
```

**Роли**: Admin, Manager, SuperAdmin

### Получить список

```http
GET /api/incidents?status=open&priority=critical&machineId=uuid
Authorization: Bearer <token>
```

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| status | enum | Фильтр по статусу |
| type | enum | Фильтр по типу |
| machineId | uuid | Фильтр по аппарату |
| priority | enum | Фильтр по приоритету |
| assignedToUserId | uuid | Фильтр по исполнителю |

### Получить статистику

```http
GET /api/incidents/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 150,
  "by_status": [
    { "status": "open", "count": 12 },
    { "status": "in_progress", "count": 8 },
    { "status": "resolved", "count": 30 },
    { "status": "closed", "count": 100 }
  ],
  "by_type": [
    { "type": "technical_failure", "count": 50 },
    { "type": "out_of_stock", "count": 40 }
  ],
  "by_priority": [
    { "priority": "critical", "count": 5 },
    { "priority": "high", "count": 25 }
  ],
  "avg_resolution_time_hours": 4.5,
  "total_repair_cost": 2500000
}
```

### Критические инциденты

```http
GET /api/incidents/critical
Authorization: Bearer <token>
```

Возвращает открытые инциденты с приоритетом CRITICAL.

### Назначить исполнителя

```http
POST /api/incidents/:id/assign
Authorization: Bearer <token>

{
  "userId": "uuid-исполнителя"
}
```

Автоматически:
- Меняет статус на `IN_PROGRESS`
- Устанавливает `started_at`

### Решить инцидент

```http
POST /api/incidents/:id/resolve
Authorization: Bearer <token>

{
  "resolution_notes": "Заменён модуль купюроприёмника",
  "repair_cost": 150000,
  "repair_task_id": "uuid-задачи"
}
```

### Закрыть инцидент

```http
POST /api/incidents/:id/close
Authorization: Bearer <token>
```

Только для инцидентов в статусе `RESOLVED`.

### Переоткрыть инцидент

```http
POST /api/incidents/:id/reopen
Authorization: Bearer <token>

{
  "reason": "Проблема повторилась"
}
```

Только для закрытых инцидентов. Причина сохраняется в metadata.

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр | Все авторизованные |
| Создание | Admin, Manager, SuperAdmin |
| Редактирование | Admin, Manager, SuperAdmin |
| Назначение | Admin, Manager, SuperAdmin |
| Решение | Admin, Manager, SuperAdmin |
| Закрытие | Admin, Manager, SuperAdmin |
| Переоткрытие | Admin, Manager, SuperAdmin |
| Удаление | Admin, Manager, SuperAdmin |

---

## Связи с другими модулями

- **Machines** - каждый инцидент привязан к аппарату
- **Users** - reported_by и assigned_to
- **Tasks** - может быть создана задача на ремонт (repair_task_id)
- **Notifications** - уведомления о критических инцидентах

---

## Уведомления

| Событие | Получатели | Каналы |
|---------|------------|--------|
| Создан критический инцидент | Manager, Admin | Push, Telegram, Email |
| Инцидент назначен | Исполнитель | Push, Telegram |
| Инцидент решён | Reporter | Push |
| SLA нарушен | Manager | Push, Email |

---

## Метрики

```sql
-- Среднее время решения по типам
SELECT
  incident_type,
  AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at)) / 3600) as avg_hours
FROM incidents
WHERE resolved_at IS NOT NULL
GROUP BY incident_type;

-- Топ проблемных аппаратов
SELECT
  m.machine_number,
  COUNT(i.id) as incident_count
FROM incidents i
JOIN machines m ON i.machine_id = m.id
WHERE i.reported_at > NOW() - INTERVAL '30 days'
GROUP BY m.id
ORDER BY incident_count DESC
LIMIT 10;
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-INC-01 | Регистрация инцидентов |
| REQ-INC-02 | 7 типов инцидентов |
| REQ-INC-03 | 4 уровня приоритета |
| REQ-INC-10 | Workflow назначения и решения |
| REQ-INC-11 | Переоткрытие закрытых инцидентов |
| REQ-INC-20 | Связь с задачами ремонта |
| REQ-INC-30 | Учёт стоимости ремонта |
| REQ-INC-40 | Статистика и метрики |
