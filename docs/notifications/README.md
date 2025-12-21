# Notifications Documentation

> **Модуль**: `backend/src/modules/notifications/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система уведомлений с поддержкой множества каналов доставки. Уведомления создаются автоматически при различных событиях системы и доставляются пользователям по настроенным каналам.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION SYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   NOTIFICATION                                 │  │
│  │  ├── 16 типов уведомлений                                     │  │
│  │  ├── 5 каналов: telegram, email, sms, web_push, in_app        │  │
│  │  ├── 5 статусов: pending → sent → delivered → read            │  │
│  │  ├── 4 приоритета: low, normal, high, urgent                  │  │
│  │  └── Retry механизм для failed                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              NOTIFICATION PREFERENCE                           │  │
│  │  ├── Настройки на уровне пользователя                         │  │
│  │  ├── Включение/отключение типов                               │  │
│  │  ├── Выбор каналов                                            │  │
│  │  └── Тихие часы (quiet hours)                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Notification

```typescript
@Entity('notifications')
@Index(['recipient_id'])
@Index(['type'])
@Index(['channel'])
@Index(['status'])
@Index(['created_at'])
export class Notification extends BaseEntity {
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'uuid' })
  recipient_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  action_url: string | null;

  // Timestamps
  @Column({ type: 'timestamp with time zone', nullable: true })
  sent_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  delivered_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  read_at: Date | null;

  // Delivery info
  @Column({ type: 'text', nullable: true })
  delivery_response: string | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_retry_at: Date | null;
}
```

---

## NotificationType

```typescript
export enum NotificationType {
  // Задачи
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',

  // Остатки
  LOW_STOCK_WAREHOUSE = 'low_stock_warehouse',
  LOW_STOCK_MACHINE = 'low_stock_machine',

  // Аппараты
  MACHINE_ERROR = 'machine_error',

  // Инциденты и жалобы
  INCIDENT_CREATED = 'incident_created',
  COMPLAINT_RECEIVED = 'complaint_received',

  // Отчёты
  DAILY_REPORT = 'daily_report',

  // Система
  SYSTEM_ALERT = 'system_alert',

  // Оборудование
  COMPONENT_NEEDS_MAINTENANCE = 'component_needs_maintenance',
  COMPONENT_NEARING_LIFETIME = 'component_nearing_lifetime',
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',
  WASHING_OVERDUE = 'washing_overdue',
  WASHING_UPCOMING = 'washing_upcoming',

  OTHER = 'other',
}
```

---

## NotificationChannel

```typescript
export enum NotificationChannel {
  TELEGRAM = 'telegram',   // Telegram Bot
  EMAIL = 'email',         // Email
  SMS = 'sms',             // SMS
  WEB_PUSH = 'web_push',   // Browser push
  IN_APP = 'in_app',       // In-app notifications
}
```

### Каналы доставки

| Канал | Провайдер | Статус |
|-------|-----------|--------|
| telegram | Telegram Bot API | ✅ Активен |
| email | SMTP / SendGrid | ✅ Активен |
| sms | SMS Gateway | 🔜 Планируется |
| web_push | Web Push API | ✅ Активен |
| in_app | WebSocket | ✅ Активен |

---

## NotificationStatus

```typescript
export enum NotificationStatus {
  PENDING = 'pending',       // Ожидает отправки
  SENT = 'sent',             // Отправлено
  DELIVERED = 'delivered',   // Доставлено
  READ = 'read',             // Прочитано
  FAILED = 'failed',         // Ошибка
}
```

### Lifecycle

```
PENDING → SENT → DELIVERED → READ
    │
    └───→ FAILED → (retry) → PENDING
```

---

## NotificationPriority

```typescript
export enum NotificationPriority {
  LOW = 'low',         // Низкий
  NORMAL = 'normal',   // Обычный
  HIGH = 'high',       // Высокий
  URGENT = 'urgent',   // Срочный
}
```

| Приоритет | Описание | Пример |
|-----------|----------|--------|
| low | Информационные | daily_report |
| normal | Стандартные | task_assigned |
| high | Важные | low_stock_machine |
| urgent | Критические | machine_error |

---

## Entity: NotificationPreference

Настройки уведомлений на уровне пользователя.

```typescript
@Entity('notification_preferences')
@Unique(['user_id', 'notification_type', 'channel'])
@Index(['user_id'])
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  notification_type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    quiet_hours_start?: string;  // "22:00"
    quiet_hours_end?: string;    // "08:00"
    min_priority?: NotificationPriority;
    frequency?: 'instant' | 'hourly' | 'daily';
  } | null;
}
```

---

## Workflow

### 1. Создание уведомления

```typescript
// При назначении задачи
async notifyTaskAssigned(task: Task, operator: User) {
  await this.notificationService.create({
    type: NotificationType.TASK_ASSIGNED,
    recipient_id: operator.id,
    title: 'Новая задача назначена',
    message: `Вам назначена задача ${task.task_type} для аппарата ${task.machine.machine_number}`,
    priority: NotificationPriority.NORMAL,
    data: { task_id: task.id, machine_id: task.machine_id },
    action_url: `/tasks/${task.id}`,
  });
}
```

### 2. Выбор каналов

```typescript
// Система автоматически:
// 1. Получает preferences пользователя
// 2. Фильтрует по is_enabled
// 3. Проверяет quiet_hours
// 4. Создаёт notification для каждого канала
```

### 3. Доставка

```
┌─────────────────────────────────────────────────────────────────────┐
│                   DELIVERY PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Create notification (status: PENDING)                           │
│     │                                                               │
│  2. Queue for delivery (Bull/BullMQ)                                │
│     │                                                               │
│  3. Check preferences and quiet hours                               │
│     │                                                               │
│  4. Send via channel provider                                       │
│     ├── Telegram: telegraf.telegram.sendMessage()                   │
│     ├── Email: nodemailer/SendGrid                                  │
│     ├── Web Push: web-push library                                  │
│     └── In-app: WebSocket emit                                      │
│     │                                                               │
│  5. Update status (SENT → DELIVERED)                                │
│     │                                                               │
│  6. If failed → schedule retry (max 3 attempts)                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Получить уведомления пользователя

```http
GET /api/notifications?status=pending&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "task_assigned",
      "channel": "in_app",
      "status": "delivered",
      "priority": "normal",
      "title": "Новая задача назначена",
      "message": "Вам назначена задача пополнения для M-001",
      "data": { "task_id": "uuid", "machine_id": "uuid" },
      "action_url": "/tasks/uuid",
      "created_at": "2025-01-15T10:00:00Z",
      "read_at": null
    }
  ],
  "total": 15,
  "unread": 5
}
```

### Пометить как прочитанное

```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

### Пометить все как прочитанные

```http
PATCH /api/notifications/read-all
Authorization: Bearer <token>
```

### Получить настройки

```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "notification_type": "task_assigned",
    "channel": "telegram",
    "is_enabled": true,
    "settings": { "quiet_hours_start": "22:00", "quiet_hours_end": "08:00" }
  },
  {
    "notification_type": "task_assigned",
    "channel": "email",
    "is_enabled": false,
    "settings": null
  }
]
```

### Обновить настройки

```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "notification_type": "task_assigned",
  "channel": "telegram",
  "is_enabled": true,
  "settings": {
    "quiet_hours_start": "23:00",
    "quiet_hours_end": "07:00"
  }
}
```

---

## Retry механизм

При ошибке доставки:
1. `retry_count` увеличивается
2. `next_retry_at` устанавливается с экспоненциальной задержкой
3. Максимум 3 попытки
4. После 3 неудач — статус FAILED

```
Retry schedule:
- 1st retry: +5 minutes
- 2nd retry: +30 minutes
- 3rd retry: +2 hours
```

---

## Связи

- **User** - получатель уведомления
- **Task** - уведомления о задачах
- **Machine** - уведомления об аппаратах
- **Incident** - уведомления об инцидентах
- **Telegram Bot** - доставка через Telegram
- **Web Push** - браузерные уведомления

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-NOTIF-01 | 16 типов уведомлений |
| REQ-NOTIF-02 | 5 каналов доставки |
| REQ-NOTIF-03 | Настройки на уровне пользователя |
| REQ-NOTIF-10 | Quiet hours (тихие часы) |
| REQ-NOTIF-11 | Приоритеты уведомлений |
| REQ-NOTIF-20 | Retry механизм (max 3 attempts) |
| REQ-NOTIF-21 | Статусы доставки |
| REQ-NOTIF-30 | Telegram интеграция |
| REQ-NOTIF-31 | Web Push интеграция |
