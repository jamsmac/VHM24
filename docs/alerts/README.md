# Alerts Documentation

> **Модуль**: `backend/src/modules/alerts/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-21

---

## Обзор

Модуль системных оповещений с поддержкой правил, пороговых значений, эскалации и уведомлений. Мониторинг различных метрик аппаратов и бизнес-процессов.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ALERTS SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    ALERT RULES                                 │  │
│  │  ├── name - название правила                                  │  │
│  │  ├── metric (10 типов) - отслеживаемая метрика               │  │
│  │  ├── operator (6 типов) - оператор сравнения                  │  │
│  │  ├── threshold - пороговое значение                           │  │
│  │  ├── severity (4 уровня) - важность                           │  │
│  │  ├── cooldown_minutes - пауза между срабатываниями            │  │
│  │  ├── scope_filters - фильтры (machines/locations)             │  │
│  │  ├── notify_user_ids - кого уведомлять                        │  │
│  │  ├── notification_channels - каналы уведомлений               │  │
│  │  └── escalation_config - настройки эскалации                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   ALERT HISTORY                                │  │
│  │  ├── alert_rule_id - связь с правилом                         │  │
│  │  ├── status (5 статусов) - жизненный цикл                     │  │
│  │  ├── severity - важность                                       │  │
│  │  ├── title / message - заголовок и текст                      │  │
│  │  ├── triggered_at - когда сработало                           │  │
│  │  ├── machine_id / location_id - контекст                      │  │
│  │  ├── metric_snapshot - снимок метрики                         │  │
│  │  ├── acknowledged_at/by - подтверждение                       │  │
│  │  ├── resolved_at/by - разрешение                              │  │
│  │  └── escalated_at - эскалация                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 ALERT LIFECYCLE                                │  │
│  │                                                                │  │
│  │  ACTIVE ──► ACKNOWLEDGED ──► RESOLVED                          │  │
│  │     │                                                          │  │
│  │     └──► ESCALATED ──► RESOLVED                                │  │
│  │     │                                                          │  │
│  │     └──► EXPIRED                                               │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Enums

### AlertMetric

10 типов отслеживаемых метрик:

```typescript
export enum AlertMetric {
  LOW_STOCK_PERCENTAGE = 'low_stock_percentage',           // Уровень заполнения
  MACHINE_ERROR_COUNT = 'machine_error_count',             // Кол-во ошибок
  TASK_OVERDUE_HOURS = 'task_overdue_hours',               // Просрочка задачи
  INCIDENT_COUNT = 'incident_count',                       // Кол-во инцидентов
  COLLECTION_DUE_DAYS = 'collection_due_days',             // Дней до инкассации
  COMPONENT_LIFETIME_PERCENTAGE = 'component_lifetime_percentage', // Ресурс компонента
  WASHING_OVERDUE_DAYS = 'washing_overdue_days',           // Просрочка мойки
  DAILY_SALES_DROP_PERCENTAGE = 'daily_sales_drop_percentage', // Падение продаж
  MACHINE_OFFLINE_HOURS = 'machine_offline_hours',         // Офлайн часов
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',           // Запас запчастей
}
```

### AlertSeverity

```typescript
export enum AlertSeverity {
  INFO = 'info',           // Информационное
  WARNING = 'warning',     // Предупреждение
  CRITICAL = 'critical',   // Критическое
  EMERGENCY = 'emergency', // Аварийное
}
```

### AlertOperator

```typescript
export enum AlertOperator {
  GREATER_THAN = '>',              // Больше
  LESS_THAN = '<',                 // Меньше
  GREATER_THAN_OR_EQUAL = '>=',    // Больше или равно
  LESS_THAN_OR_EQUAL = '<=',       // Меньше или равно
  EQUAL = '==',                    // Равно
  NOT_EQUAL = '!=',                // Не равно
}
```

### AlertStatus

```typescript
export enum AlertStatus {
  ACTIVE = 'active',             // Активное, требует внимания
  ACKNOWLEDGED = 'acknowledged', // Подтверждено, в работе
  RESOLVED = 'resolved',         // Разрешено
  ESCALATED = 'escalated',       // Эскалировано
  EXPIRED = 'expired',           // Истекло
}
```

---

## Entities

### AlertRule Entity

```typescript
@Entity('alert_rules')
@Index(['metric'])
@Index(['severity'])
@Index(['is_enabled'])
@Index(['created_by_id'])
export class AlertRule extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: AlertMetric })
  metric: AlertMetric;

  @Column({ type: 'enum', enum: AlertOperator })
  operator: AlertOperator;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold: number;

  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.WARNING })
  severity: AlertSeverity;

  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  @Column({ type: 'integer', default: 60 })
  cooldown_minutes: number;

  @Column({ type: 'jsonb', nullable: true })
  scope_filters: {
    machine_ids?: string[];
    location_ids?: string[];
    machine_types?: string[];
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  notify_user_ids: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  notify_roles: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  notification_channels: string[] | null;

  @Column({ type: 'integer', nullable: true })
  escalation_minutes: number | null;

  @Column({ type: 'jsonb', nullable: true })
  escalation_config: {
    escalation_roles?: string[];
    escalation_user_ids?: string[];
    auto_create_task?: boolean;
    task_type?: string;
  } | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_triggered_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  trigger_count: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updated_by: User | null;
}
```

### AlertHistory Entity

```typescript
@Entity('alert_history')
@Index(['alert_rule_id'])
@Index(['status'])
@Index(['severity'])
@Index(['triggered_at'])
@Index(['machine_id'])
@Index(['location_id'])
export class AlertHistory extends BaseEntity {
  @Column({ type: 'uuid' })
  alert_rule_id: string;

  @ManyToOne(() => AlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_rule_id' })
  alert_rule: AlertRule;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'timestamp with time zone' })
  triggered_at: Date;

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metric_snapshot: {
    current_value: number;
    threshold: number;
    metric: string;
    additional_data?: Record<string, any>;
  } | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledged_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledged_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledged_by: User | null;

  @Column({ type: 'text', nullable: true })
  acknowledgement_note: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolved_by: User | null;

  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  escalated_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  escalation_level: number;

  @Column({ type: 'jsonb', nullable: true })
  notification_ids: string[] | null;

  @Column({ type: 'uuid', nullable: true })
  auto_created_task_id: string | null;
}
```

---

## Service

### AlertsService

```typescript
@Injectable()
export class AlertsService {
  // ========== ALERT RULES CRUD ==========

  /**
   * Создать правило оповещения
   */
  async createRule(dto: CreateAlertRuleDto, userId?: string): Promise<AlertRule>;

  /**
   * Получить все правила с фильтрами
   */
  async findAllRules(filters?: {
    is_enabled?: boolean;
    metric?: AlertMetric;
    severity?: AlertSeverity;
  }): Promise<AlertRule[]>;

  /**
   * Получить правило по ID
   */
  async findRuleById(id: string): Promise<AlertRule>;

  /**
   * Обновить правило
   */
  async updateRule(id: string, dto: UpdateAlertRuleDto, userId?: string): Promise<AlertRule>;

  /**
   * Удалить правило (soft delete)
   */
  async deleteRule(id: string): Promise<void>;

  /**
   * Включить/выключить правило
   */
  async toggleRule(id: string, isEnabled: boolean): Promise<AlertRule>;

  // ========== ALERT HISTORY ==========

  /**
   * Получить историю оповещений
   */
  async getAlertHistory(filters?: FilterAlertHistoryDto): Promise<AlertHistory[]>;

  /**
   * Получить кол-во активных оповещений
   */
  async getActiveAlertsCount(): Promise<number>;

  /**
   * Получить оповещение по ID
   */
  async findAlertById(id: string): Promise<AlertHistory>;

  /**
   * Подтвердить оповещение
   */
  async acknowledgeAlert(id: string, dto: AcknowledgeAlertDto, userId: string): Promise<AlertHistory>;

  /**
   * Разрешить оповещение
   */
  async resolveAlert(id: string, dto: ResolveAlertDto, userId: string): Promise<AlertHistory>;

  // ========== EVALUATION ==========

  /**
   * Оценить правило и создать оповещение при необходимости
   */
  async evaluateRule(
    ruleId: string,
    currentValue: number,
    context: { machine_id?: string; location_id?: string; additional_data?: Record<string, any> }
  ): Promise<AlertHistory | null>;

  /**
   * Запустить оповещение
   */
  async triggerAlert(
    rule: AlertRule,
    currentValue: number,
    context: { machine_id?: string; location_id?: string; additional_data?: Record<string, any> }
  ): Promise<AlertHistory>;

  // ========== ESCALATION ==========

  /**
   * Обработать эскалации (вызывается по расписанию)
   */
  async processEscalations(): Promise<void>;

  // ========== STATISTICS ==========

  /**
   * Получить статистику оповещений
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date): Promise<AlertStatistics>;
}
```

---

## Оценка условий

```typescript
private evaluateCondition(
  value: number,
  operator: AlertOperator,
  threshold: number
): boolean {
  switch (operator) {
    case AlertOperator.GREATER_THAN:
      return value > threshold;
    case AlertOperator.LESS_THAN:
      return value < threshold;
    case AlertOperator.GREATER_THAN_OR_EQUAL:
      return value >= threshold;
    case AlertOperator.LESS_THAN_OR_EQUAL:
      return value <= threshold;
    case AlertOperator.EQUAL:
      return value === threshold;
    case AlertOperator.NOT_EQUAL:
      return value !== threshold;
    default:
      return false;
  }
}
```

---

## Cooldown механизм

Предотвращает повторное срабатывание правила в течение указанного периода:

```typescript
// Проверка cooldown
if (rule.last_triggered_at) {
  const cooldownEnd = new Date(rule.last_triggered_at);
  cooldownEnd.setMinutes(cooldownEnd.getMinutes() + rule.cooldown_minutes);

  if (new Date() < cooldownEnd) {
    // Правило в cooldown, не срабатывает
    return null;
  }
}
```

---

## Эскалация

Если оповещение не подтверждено за указанное время, происходит эскалация:

```typescript
async processEscalations(): Promise<void> {
  const alertsToEscalate = await this.alertHistoryRepository
    .createQueryBuilder('alert')
    .leftJoinAndSelect('alert.alert_rule', 'rule')
    .where('alert.status = :status', { status: AlertStatus.ACTIVE })
    .andWhere('rule.escalation_minutes IS NOT NULL')
    .andWhere('alert.escalated_at IS NULL')
    .getMany();

  for (const alert of alertsToEscalate) {
    const rule = alert.alert_rule;
    const escalationTime = new Date(alert.triggered_at);
    escalationTime.setMinutes(escalationTime.getMinutes() + rule.escalation_minutes);

    if (new Date() >= escalationTime) {
      await this.escalateAlert(alert);
    }
  }
}
```

---

## API Endpoints

### Rules

#### Получить все правила

```http
GET /api/alerts/rules?is_enabled=true&metric=low_stock_percentage
Authorization: Bearer <token>
```

#### Создать правило

```http
POST /api/alerts/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Низкий уровень заполнения",
  "description": "Оповещение при заполнении ниже 20%",
  "metric": "low_stock_percentage",
  "operator": "<",
  "threshold": 20,
  "severity": "warning",
  "cooldown_minutes": 120,
  "scope_filters": {
    "location_ids": ["location-uuid-1"]
  },
  "notify_user_ids": ["user-uuid-1", "user-uuid-2"],
  "notification_channels": ["telegram", "in_app"],
  "escalation_minutes": 60,
  "escalation_config": {
    "escalation_roles": ["ADMIN"],
    "auto_create_task": true,
    "task_type": "refill"
  }
}
```

#### Включить/выключить правило

```http
PATCH /api/alerts/rules/:id/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_enabled": false
}
```

### History

#### Получить историю

```http
GET /api/alerts/history?status=active&severity=critical&machine_id=uuid
Authorization: Bearer <token>
```

#### Подтвердить оповещение

```http
POST /api/alerts/:id/acknowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "note": "Принято в работу, планируется пополнение завтра"
}
```

#### Разрешить оповещение

```http
POST /api/alerts/:id/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "note": "Аппарат пополнен, уровень 95%"
}
```

### Статистика

```http
GET /api/alerts/statistics?date_from=2025-01-01&date_to=2025-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 150,
  "active_count": 5,
  "by_status": [
    { "status": "active", "count": 5 },
    { "status": "acknowledged", "count": 10 },
    { "status": "resolved", "count": 130 },
    { "status": "escalated", "count": 5 }
  ],
  "by_severity": [
    { "severity": "info", "count": 50 },
    { "severity": "warning", "count": 80 },
    { "severity": "critical", "count": 18 },
    { "severity": "emergency", "count": 2 }
  ],
  "avg_resolution_time_minutes": 45.5
}
```

---

## Уведомления

При срабатывании оповещения отправляются уведомления:

```typescript
private async sendAlertNotifications(
  rule: AlertRule,
  alert: AlertHistory
): Promise<void> {
  const priorityMap: Record<AlertSeverity, NotificationPriority> = {
    [AlertSeverity.INFO]: NotificationPriority.LOW,
    [AlertSeverity.WARNING]: NotificationPriority.NORMAL,
    [AlertSeverity.CRITICAL]: NotificationPriority.HIGH,
    [AlertSeverity.EMERGENCY]: NotificationPriority.URGENT,
  };

  const priority = priorityMap[alert.severity];
  const channels = rule.notification_channels || ['in_app'];
  const userIds = rule.notify_user_ids || [];

  for (const userId of userIds) {
    for (const channel of channels) {
      await this.notificationsService.create({
        type: NotificationType.SYSTEM_ALERT,
        channel,
        recipient_id: userId,
        title: alert.title,
        message: alert.message,
        priority,
        data: {
          alert_id: alert.id,
          alert_rule_id: rule.id,
          severity: alert.severity,
          machine_id: alert.machine_id,
        },
        action_url: `/dashboard/alerts/${alert.id}`,
      });
    }
  }
}
```

---

## Метки метрик

```typescript
const metricLabels: Record<AlertMetric, string> = {
  low_stock_percentage: 'Уровень заполнения',
  machine_error_count: 'Количество ошибок',
  task_overdue_hours: 'Просрочка задачи (часов)',
  incident_count: 'Количество инцидентов',
  collection_due_days: 'Дней до инкассации',
  component_lifetime_percentage: 'Ресурс компонента',
  washing_overdue_days: 'Просрочка мойки (дней)',
  daily_sales_drop_percentage: 'Падение продаж',
  machine_offline_hours: 'Офлайн (часов)',
  spare_part_low_stock: 'Запас запчастей',
};
```

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ALR-01 | 10 типов метрик |
| REQ-ALR-02 | 6 операторов сравнения |
| REQ-ALR-03 | 4 уровня важности |
| REQ-ALR-04 | 5 статусов жизненного цикла |
| REQ-ALR-10 | Создание правил оповещений |
| REQ-ALR-11 | Cooldown между срабатываниями |
| REQ-ALR-12 | Фильтрация по machines/locations |
| REQ-ALR-20 | История срабатываний |
| REQ-ALR-21 | Снимок метрики при срабатывании |
| REQ-ALR-30 | Подтверждение оповещений |
| REQ-ALR-31 | Разрешение оповещений |
| REQ-ALR-32 | Эскалация |
| REQ-ALR-40 | Интеграция с уведомлениями |
| REQ-ALR-41 | Множественные каналы уведомлений |
| REQ-ALR-50 | Статистика оповещений |

---

## Примеры правил

### Низкий уровень заполнения

```json
{
  "name": "Низкий уровень заполнения",
  "metric": "low_stock_percentage",
  "operator": "<",
  "threshold": 20,
  "severity": "warning",
  "cooldown_minutes": 240,
  "escalation_minutes": 120
}
```

### Просрочка задачи

```json
{
  "name": "Просроченная задача",
  "metric": "task_overdue_hours",
  "operator": ">",
  "threshold": 4,
  "severity": "critical",
  "cooldown_minutes": 60,
  "notification_channels": ["telegram", "in_app"]
}
```

### Падение продаж

```json
{
  "name": "Резкое падение продаж",
  "metric": "daily_sales_drop_percentage",
  "operator": ">",
  "threshold": 30,
  "severity": "warning",
  "cooldown_minutes": 1440,
  "notify_roles": ["MANAGER", "ADMIN"]
}
```
