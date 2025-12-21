# Maintenance System - Система Обслуживания

> **Модуль**: `backend/src/modules/equipment/services/maintenance.service.ts`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система обслуживания отслеживает все работы по техническому обслуживанию компонентов: чистку, ремонт, калибровку, замену и профилактику. Включает графики мойки (WashingSchedule) для компонентов требующих регулярной очистки.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MAINTENANCE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   ComponentMaintenance                        │  │
│  │  ├── 8 типов обслуживания (MaintenanceType)                   │  │
│  │  ├── Учёт затрат (labor + parts = total)                      │  │
│  │  ├── Длительность работ                                       │  │
│  │  ├── Использованные запчасти                                  │  │
│  │  └── Результат (success/failure)                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    WashingSchedule                             │  │
│  │  ├── 5 частот мойки (WashingFrequency)                        │  │
│  │  ├── Привязка к машине                                        │  │
│  │  ├── Автосоздание задач                                       │  │
│  │  └── Уведомления                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: ComponentMaintenance

```typescript
export enum MaintenanceType {
  CLEANING = 'cleaning',         // Чистка
  INSPECTION = 'inspection',     // Осмотр/проверка
  REPAIR = 'repair',             // Ремонт
  REPLACEMENT = 'replacement',   // Замена (частей)
  CALIBRATION = 'calibration',   // Калибровка
  SOFTWARE_UPDATE = 'software_update', // Обновление ПО
  PREVENTIVE = 'preventive',     // Профилактика
  OTHER = 'other',               // Прочее
}

@Entity('component_maintenance')
@Index(['component_id'])
@Index(['performed_at'])
@Index(['maintenance_type'])
export class ComponentMaintenance extends BaseEntity {
  @Column({ type: 'uuid' })
  component_id: string;

  @Column({ type: 'enum', enum: MaintenanceType })
  maintenance_type: MaintenanceType;

  @Column({ type: 'timestamp' })
  performed_at: Date;

  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null;

  // Детали работы
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', nullable: true })
  duration_minutes: number | null;

  // Затраты
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  labor_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  parts_cost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_cost: number;  // labor_cost + parts_cost (рассчитывается автоматически)

  // Использованные запчасти
  @Column({ type: 'jsonb', nullable: true })
  parts_used: {
    spare_part_id: string;
    quantity: number;
    unit_price: number;
  }[] | null;

  // Результат
  @Column({ type: 'boolean', default: true })
  is_successful: boolean;

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  // Связи
  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @ManyToOne(() => EquipmentComponent)
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by_user_id' })
  performed_by: User;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
```

---

## Типы обслуживания (MaintenanceType)

| Тип | Описание | Типичная длительность | Примеры |
|-----|----------|----------------------|---------|
| `cleaning` | Чистка компонента | 15-30 мин | Мойка бункера, чистка кофемолки |
| `inspection` | Осмотр/проверка | 10-15 мин | Проверка износа жерновов |
| `repair` | Ремонт | 30-120 мин | Замена уплотнителей |
| `replacement` | Замена частей | 15-60 мин | Замена жерновов |
| `calibration` | Калибровка | 15-30 мин | Настройка помола |
| `software_update` | Обновление ПО | 10-30 мин | Прошивка терминала |
| `preventive` | Профилактика | 30-60 мин | Смазка механизмов |
| `other` | Прочее | Varies | Нестандартные работы |

---

## Сервис MaintenanceService

### Создание записи обслуживания

```typescript
async create(dto: CreateMaintenanceDto): Promise<ComponentMaintenance> {
  const maintenance = this.maintenanceRepository.create({
    ...dto,
    performed_at: new Date(),
  });

  // Автоматический расчёт total_cost
  const laborCost = dto.labor_cost || 0;
  const partsCost = dto.parts_cost || 0;
  maintenance.total_cost = laborCost + partsCost;

  return this.maintenanceRepository.save(maintenance);
}
```

### Фильтрация и поиск

```typescript
async findAll(filters: MaintenanceFiltersDto): Promise<ComponentMaintenance[]> {
  const query = this.maintenanceRepository
    .createQueryBuilder('maintenance')
    .leftJoinAndSelect('maintenance.component', 'component')
    .leftJoinAndSelect('component.machine', 'machine')
    .leftJoinAndSelect('maintenance.performed_by', 'user');

  // Фильтры
  if (filters.component_id) { /* ... */ }
  if (filters.maintenance_type) { /* ... */ }
  if (filters.from_date && filters.to_date) { /* ... */ }

  return query.orderBy('maintenance.performed_at', 'DESC').getMany();
}
```

### Статистика

```typescript
async getStats(componentId?: string, fromDate?: string, toDate?: string) {
  return {
    total: number,                    // Всего записей
    by_type: [{ type, count }],       // По типам
    total_cost: number,               // Общая стоимость
    total_labor_cost: number,         // Стоимость работ
    total_parts_cost: number,         // Стоимость запчастей
    avg_duration_minutes: number,     // Средняя длительность
    success_rate: number,             // % успешных (0-100)
  };
}
```

---

## Entity: WashingSchedule

Графики регулярной мойки компонентов.

```typescript
export enum WashingFrequency {
  DAILY = 'daily',         // Ежедневно
  WEEKLY = 'weekly',       // Еженедельно
  BIWEEKLY = 'biweekly',   // Раз в 2 недели
  MONTHLY = 'monthly',     // Ежемесячно
  CUSTOM = 'custom',       // Настраиваемый интервал
}

export enum WashingStatus {
  SCHEDULED = 'scheduled', // Запланирована
  OVERDUE = 'overdue',     // Просрочена
  COMPLETED = 'completed', // Выполнена
  SKIPPED = 'skipped',     // Пропущена
}

@Entity('washing_schedules')
@Index(['machine_id'])
@Index(['next_wash_date'])
export class WashingSchedule extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;  // "Ежедневная мойка бункера"

  @Column({ type: 'enum', enum: WashingFrequency })
  frequency: WashingFrequency;

  @Column({ type: 'integer', nullable: true })
  interval_days: number | null;  // Для CUSTOM

  @Column({ type: 'simple-array' })
  component_types: ComponentType[];  // Какие компоненты мыть

  @Column({ type: 'text', nullable: true })
  instructions: string | null;  // Инструкция по мойке

  // Отслеживание
  @Column({ type: 'date', nullable: true })
  last_wash_date: Date | null;

  @Column({ type: 'date' })
  next_wash_date: Date;

  @Column({ type: 'uuid', nullable: true })
  last_washed_by_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  last_wash_task_id: string | null;

  // Настройки
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  auto_create_tasks: boolean;  // Автосоздание задач

  @Column({ type: 'integer', default: 1 })
  notification_days_before: number;  // За сколько дней уведомлять

  // Материалы
  @Column({ type: 'simple-array', nullable: true })
  required_materials: string[] | null;  // Моющие средства

  @Column({ type: 'integer', nullable: true })
  estimated_duration_minutes: number | null;

  // Связь
  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;
}
```

---

## Логика расчёта дат

### Следующая дата мойки

```typescript
function calculateNextWashDate(
  frequency: WashingFrequency,
  intervalDays: number | null,
  lastWashDate: Date
): Date {
  const next = new Date(lastWashDate);

  switch (frequency) {
    case WashingFrequency.DAILY:
      next.setDate(next.getDate() + 1);
      break;
    case WashingFrequency.WEEKLY:
      next.setDate(next.getDate() + 7);
      break;
    case WashingFrequency.BIWEEKLY:
      next.setDate(next.getDate() + 14);
      break;
    case WashingFrequency.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      break;
    case WashingFrequency.CUSTOM:
      next.setDate(next.getDate() + (intervalDays || 7));
      break;
  }

  return next;
}
```

### Проверка просроченных

```typescript
// Cron job каждый час
@Cron('0 * * * *')
async checkOverdueWashings() {
  const overdue = await this.washingScheduleRepository.find({
    where: {
      next_wash_date: LessThan(new Date()),
      is_active: true,
    },
    relations: ['machine'],
  });

  for (const schedule of overdue) {
    // Отправить уведомление
    await this.notificationsService.send({
      type: 'washing_overdue',
      title: 'Просроченная мойка',
      message: `Мойка "${schedule.name}" для ${schedule.machine.machine_number} просрочена`,
    });
  }
}
```

---

## API Endpoints

### Maintenance

```http
# Создать запись обслуживания
POST /api/equipment/maintenance
Authorization: Bearer <token>
{
  "component_id": "uuid",
  "maintenance_type": "cleaning",
  "description": "Полная чистка бункера кофе",
  "duration_minutes": 25,
  "labor_cost": 50000,
  "parts_cost": 0,
  "is_successful": true
}

# Получить историю с фильтрами
GET /api/equipment/maintenance?component_id=uuid&maintenance_type=cleaning&from_date=2024-01-01

# Получить статистику
GET /api/equipment/maintenance/stats?componentId=uuid

# История компонента
GET /api/equipment/maintenance/component/:componentId

# История аппарата
GET /api/equipment/maintenance/machine/:machineId?maintenanceType=cleaning

# Получить запись по ID
GET /api/equipment/maintenance/:id
```

### Washing Schedules

```http
# Создать график мойки
POST /api/equipment/washing-schedules
{
  "machine_id": "uuid",
  "name": "Ежедневная мойка бункеров",
  "frequency": "daily",
  "component_types": ["hopper", "mixer"],
  "instructions": "Снять бункеры, промыть тёплой водой...",
  "auto_create_tasks": true,
  "notification_days_before": 0,
  "required_materials": ["Моющее средство", "Щётка"]
}

# Получить графики аппарата
GET /api/equipment/washing-schedules?machineId=uuid

# Обновить график
PATCH /api/equipment/washing-schedules/:id

# Отметить мойку выполненной
POST /api/equipment/washing-schedules/:id/complete

# Удалить график
DELETE /api/equipment/washing-schedules/:id
```

---

## Связь с запчастями

При обслуживании можно указать использованные запчасти:

```typescript
// CreateMaintenanceDto
{
  "component_id": "uuid",
  "maintenance_type": "replacement",
  "description": "Замена жерновов кофемолки",
  "parts_used": [
    {
      "spare_part_id": "uuid-жерновов",
      "quantity": 1,
      "unit_price": 150000
    }
  ],
  "labor_cost": 30000,
  "parts_cost": 150000  // Рассчитывается автоматически из parts_used
}
```

---

## Интеграция с задачами

### Создание задачи из графика мойки

```typescript
// Scheduled job
@Cron('0 6 * * *') // Каждый день в 6:00
async createWashingTasks() {
  const schedulesForToday = await this.washingScheduleRepository.find({
    where: {
      next_wash_date: Equal(today),
      auto_create_tasks: true,
      is_active: true,
    },
  });

  for (const schedule of schedulesForToday) {
    await this.tasksService.create({
      type: TaskType.WASHING,
      machine_id: schedule.machine_id,
      title: schedule.name,
      description: schedule.instructions,
      priority: TaskPriority.HIGH,
    });
  }
}
```

### Завершение задачи → запись обслуживания

```typescript
// В TasksService при завершении задачи мойки
if (task.type === TaskType.WASHING) {
  await this.maintenanceService.create({
    component_id: task.components[0].id,
    maintenance_type: MaintenanceType.CLEANING,
    performed_by_user_id: task.assigned_to_id,
    task_id: task.id,
    description: 'Выполнено в рамках задачи мойки',
    is_successful: true,
  });
}
```

---

## Отчёты и аналитика

### Затраты на обслуживание по аппаратам

```sql
SELECT
  m.machine_number,
  m.name,
  SUM(cm.total_cost) as total_maintenance_cost,
  COUNT(cm.id) as maintenance_count
FROM component_maintenance cm
JOIN equipment_components ec ON cm.component_id = ec.id
JOIN machines m ON ec.machine_id = m.id
WHERE cm.performed_at > NOW() - INTERVAL '90 days'
GROUP BY m.id
ORDER BY total_maintenance_cost DESC;
```

### Эффективность обслуживания

```typescript
const stats = await maintenanceService.getStats();
// {
//   total: 150,
//   success_rate: 94.5,  // 94.5% успешных
//   avg_duration_minutes: 28,
//   total_cost: 5000000,
//   by_type: [
//     { type: 'cleaning', count: 80 },
//     { type: 'repair', count: 30 },
//     { type: 'preventive', count: 40 }
//   ]
// }
```

---

## Уведомления

| Событие | Получатели | Канал |
|---------|------------|-------|
| Мойка просрочена | Manager, Operator | Push, Telegram |
| Обслуживание требуется | Technician, Manager | Push |
| Компонент близок к выработке | Manager, Admin | Email |
| Неуспешное обслуживание | Manager, Admin | Push, Email |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ASSET-10 | Контроль сроков обслуживания |
| REQ-ASSET-20 | Графики мойки компонентов |
| REQ-ASSET-21 | Автоматическое создание задач мойки |
| REQ-ASSET-22 | Уведомления о просроченных мойках |
| REQ-ASSET-30 | Учёт затрат на обслуживание |
| REQ-ASSET-31 | История обслуживания компонента |
