# Система инвентаря VendHub Manager - Обзор

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/inventory/`

---

## Содержание

1. [Введение](#введение)
2. [Архитектура 3-уровневой системы](#архитектура-3-уровневой-системы)
3. [Модель данных](#модель-данных)
4. [Типы движений (MovementType)](#типы-движений-movementtype)
5. [Резервирование](#резервирование)
6. [Корректировки (Adjustments)](#корректировки-adjustments)
7. [Интеграция с модулем задач](#интеграция-с-модулем-задач)
8. [Файловая структура модуля](#файловая-структура-модуля)

---

## Введение

Система инвентаря VendHub Manager реализует **3-уровневую модель учета** товаров и ингредиентов:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    3-УРОВНЕВАЯ СИСТЕМА ИНВЕНТАРЯ                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  УРОВЕНЬ 1              УРОВЕНЬ 2              УРОВЕНЬ 3               │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐           │
│  │   СКЛАД     │──────>│  ОПЕРАТОР   │──────>│   АППАРАТ   │           │
│  │ (Warehouse) │       │ (Operator)  │       │  (Machine)  │           │
│  │             │       │             │       │             │           │
│  │ Центральное │       │ Персональный│       │ Загруженные │           │
│  │ хранилище   │       │ инвентарь   │       │ ингредиенты │           │
│  └─────────────┘       └─────────────┘       └─────────────┘           │
│         │                    │                     │                   │
│    warehouse_         operator_            machine_                    │
│    inventory          inventory            inventory                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ключевые принципы

1. **Полная прослеживаемость** — каждое движение товара записывается в `inventory_movements`
2. **Pessimistic Locking** — транзакции с блокировками для предотвращения race conditions
3. **Резервирование** — товары резервируются при создании задач
4. **Workflow корректировок** — согласование изменений при инвентаризации

---

## Архитектура 3-уровневой системы

### Уровень 1: Склад (Warehouse)

**Сущность**: `WarehouseInventory`

Центральное хранилище всех товаров и ингредиентов компании.

```typescript
// Файл: backend/src/modules/inventory/entities/warehouse-inventory.entity.ts

@Entity('warehouse_inventory')
@Unique(['nomenclature_id']) // Один товар = одна запись
export class WarehouseInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  nomenclature_id: string;             // ID товара/ингредиента

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;            // Текущее количество

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;           // Зарезервировано для задач

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;             // Минимум для уведомлений

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_stock_level: number | null;      // Максимальный запас

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_restocked_at: Date | null;      // Последнее поступление

  @Column({ type: 'varchar', length: 200, nullable: true })
  location_in_warehouse: string | null; // Место на складе

  // Вычисляемое свойство
  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
```

### Уровень 2: Оператор (Operator)

**Сущность**: `OperatorInventory`

Персональный инвентарь оператора — товары, которые он взял со склада для пополнения аппаратов.

```typescript
// Файл: backend/src/modules/inventory/entities/operator-inventory.entity.ts

@Entity('operator_inventory')
@Unique(['operator_id', 'nomenclature_id']) // Оператор + товар уникальны
export class OperatorInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  operator_id: string;                 // ID оператора (User)

  @Column({ type: 'uuid' })
  nomenclature_id: string;             // ID товара

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;            // Текущее количество

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;           // Зарезервировано для задач

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_received_at: Date | null;       // Последнее получение со склада

  @Column({ type: 'uuid', nullable: true })
  last_task_id: string | null;         // Последняя задача

  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
```

### Уровень 3: Аппарат (Machine)

**Сущность**: `MachineInventory`

Ингредиенты, загруженные в конкретный вендинговый аппарат.

```typescript
// Файл: backend/src/modules/inventory/entities/machine-inventory.entity.ts

@Entity('machine_inventory')
@Unique(['machine_id', 'nomenclature_id']) // Аппарат + товар уникальны
export class MachineInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;                  // ID аппарата

  @Column({ type: 'uuid' })
  nomenclature_id: string;             // ID товара

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;            // Текущее количество

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;             // Минимум для пополнения

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_capacity: number | null;         // Максимальная вместимость

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refilled_at: Date | null;       // Последнее пополнение

  @Column({ type: 'uuid', nullable: true })
  last_refill_task_id: string | null;  // ID последней задачи

  @Column({ type: 'varchar', length: 50, nullable: true })
  slot_number: string | null;          // Номер слота/бункера
}
```

---

## Модель данных

### Диаграмма связей

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         МОДЕЛЬ ДАННЫХ                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐        ┌───────────────────┐                      │
│  │  Nomenclature   │<───────│ WarehouseInventory│                      │
│  │  (товар)        │        │                   │                      │
│  └────────┬────────┘        └───────────────────┘                      │
│           │                          │                                  │
│           │                          ▼                                  │
│           │                 ┌───────────────────┐                      │
│           │<────────────────│ OperatorInventory │                      │
│           │                 │                   │                      │
│           │                 └─────────┬─────────┘                      │
│           │                           │                                 │
│           │                           ▼                                 │
│           │                 ┌───────────────────┐                      │
│           │<────────────────│  MachineInventory │                      │
│           │                 │                   │                      │
│           │                 └───────────────────┘                      │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐        ┌───────────────────┐                      │
│  │ InventoryMovement│        │InventoryReservation│                    │
│  │ (все движения)  │        │ (резервации)      │                     │
│  └─────────────────┘        └───────────────────┘                      │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐        ┌───────────────────┐                      │
│  │InventoryAdjust- │        │ InventoryActual-  │                     │
│  │ ment (коррект.) │<───────│ Count (замер)     │                     │
│  └─────────────────┘        └───────────────────┘                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Таблицы базы данных

| Таблица | Описание | Уникальный ключ |
|---------|----------|-----------------|
| `warehouse_inventory` | Склад | `nomenclature_id` |
| `operator_inventory` | Оператор | `operator_id, nomenclature_id` |
| `machine_inventory` | Аппарат | `machine_id, nomenclature_id` |
| `inventory_movements` | История движений | `id` |
| `inventory_reservations` | Резервации | `reservation_number` |
| `inventory_adjustments` | Корректировки | `id` |
| `inventory_actual_counts` | Замеры инвентаризации | `id` |
| `inventory_difference_thresholds` | Пороги расхождений | `nomenclature_id` |

---

## Типы движений (MovementType)

### Enum MovementType

```typescript
// Файл: backend/src/modules/inventory/entities/inventory-movement.entity.ts

export enum MovementType {
  // === ПОСТУПЛЕНИЯ НА СКЛАД ===
  WAREHOUSE_IN = 'warehouse_in',           // Приход (закупка)
  WAREHOUSE_OUT = 'warehouse_out',         // Списание со склада

  // === СКЛАД <-> ОПЕРАТОР ===
  WAREHOUSE_TO_OPERATOR = 'warehouse_to_operator', // Выдача оператору
  OPERATOR_TO_WAREHOUSE = 'operator_to_warehouse', // Возврат на склад

  // === ОПЕРАТОР <-> АППАРАТ ===
  OPERATOR_TO_MACHINE = 'operator_to_machine', // Пополнение аппарата
  MACHINE_TO_OPERATOR = 'machine_to_operator', // Изъятие (брак, просрочка)

  // === ПРОДАЖИ ===
  MACHINE_SALE = 'machine_sale',           // Расход на продукцию

  // === КОРРЕКТИРОВКИ ===
  ADJUSTMENT = 'adjustment',               // Инвентаризация
  WRITE_OFF = 'write_off',                 // Списание (брак)

  // === РЕЗЕРВИРОВАНИЕ ===
  WAREHOUSE_RESERVATION = 'warehouse_reservation',         // Резервирование
  WAREHOUSE_RESERVATION_RELEASE = 'warehouse_reservation_release', // Освобождение
}
```

### Схема потоков движений

```
                         WAREHOUSE_IN
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          СКЛАД                                          │
│                     current_quantity: 100                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
              WAREHOUSE_TO_OPERATOR (выдача: 20)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ОПЕРАТОР                                         │
│                     current_quantity: 20                                │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
               OPERATOR_TO_MACHINE (пополнение: 10)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         АППАРАТ                                         │
│                     current_quantity: 10                                │
│                              │                                          │
│                       MACHINE_SALE (продажи)                           │
│                              │                                          │
│                     current_quantity: 5                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Сущность InventoryMovement

```typescript
// Файл: backend/src/modules/inventory/entities/inventory-movement.entity.ts

@Entity('inventory_movements')
@Index(['movement_type'])
@Index(['nomenclature_id'])
@Index(['task_id'])
@Index(['operator_id'])
@Index(['machine_id'])
@Index(['created_at'])
@Index(['operation_date'])
export class InventoryMovement extends BaseEntity {
  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;         // Тип движения

  @Column({ type: 'uuid' })
  nomenclature_id: string;             // ID товара

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;                    // Количество

  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null; // Кто выполнил

  @Column({ type: 'uuid', nullable: true })
  operator_id: string | null;          // Связанный оператор

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;           // Связанный аппарат

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;              // Связанная задача

  @Column({ type: 'timestamp with time zone', nullable: true })
  operation_date: Date | null;         // Фактическая дата

  @Column({ type: 'text', nullable: true })
  notes: string | null;                // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Доп. данные
}
```

---

## Резервирование

### Назначение

Резервирование гарантирует, что при создании задачи необходимые товары будут доступны для выполнения.

### Жизненный цикл резервации

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ PENDING │───>│ CONFIRMED │───>│ FULFILLED │    │ CANCELLED │
└────┬────┘    └───────────┘    └───────────┘    └───────────┘
     │                                                ▲
     │                                                │
     └────────────────────────────────────────────────┘
                         │
                         ▼
                   ┌───────────┐
                   │  EXPIRED  │
                   └───────────┘
```

### Enum ReservationStatus

```typescript
export enum ReservationStatus {
  PENDING = 'pending',                   // Ожидает
  CONFIRMED = 'confirmed',               // Подтверждено
  PARTIALLY_FULFILLED = 'partially_fulfilled', // Частично выполнено
  FULFILLED = 'fulfilled',               // Выполнено
  CANCELLED = 'cancelled',               // Отменено
  EXPIRED = 'expired',                   // Истекло
}

export enum InventoryLevel {
  WAREHOUSE = 'warehouse',               // Резервация на складе
  OPERATOR = 'operator',                 // Резервация у оператора
}
```

### Сущность InventoryReservation

```typescript
@Entity('inventory_reservations')
export class InventoryReservation extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  reservation_number: string;          // RSV-1734567890-0001

  @Column({ type: 'uuid' })
  task_id: string;                     // Связь с задачей

  @Column({ type: 'uuid' })
  nomenclature_id: string;             // Товар

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_reserved: number;           // Зарезервировано

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_fulfilled: number;          // Выполнено

  @Column({ type: 'enum', enum: ReservationStatus })
  status: ReservationStatus;           // Статус

  @Column({ type: 'varchar', length: 20 })
  inventory_level: InventoryLevel;     // Уровень (warehouse/operator)

  @Column({ type: 'uuid' })
  reference_id: string;                // ID склада или оператора

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;             // Срок истечения (24ч)

  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilled_at: Date | null;           // Когда выполнено

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date | null;           // Когда отменено
}
```

---

## Корректировки (Adjustments)

### Workflow согласования

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐
│ PENDING │───>│ APPROVED │───>│ APPLIED │    │REJECTED │
└────┬────┘    └──────────┘    └─────────┘    └─────────┘
     │                                             ▲
     └─────────────────────────────────────────────┘
```

### Enum AdjustmentStatus

```typescript
export enum AdjustmentStatus {
  PENDING = 'pending',       // Ожидает рассмотрения
  APPROVED = 'approved',     // Одобрено
  REJECTED = 'rejected',     // Отклонено
  APPLIED = 'applied',       // Применено к инвентарю
  CANCELLED = 'cancelled',   // Отменено
}

export enum AdjustmentReason {
  INVENTORY_DIFFERENCE = 'inventory_difference', // Расхождение
  DAMAGE = 'damage',                             // Повреждение
  THEFT = 'theft',                               // Кража
  EXPIRY = 'expiry',                             // Просрочка
  RETURN = 'return',                             // Возврат
  CORRECTION = 'correction',                     // Исправление ошибки
  OTHER = 'other',                               // Другое
}
```

### Сущность InventoryAdjustment

```typescript
@Entity('inventory_adjustments')
export class InventoryAdjustment extends BaseEntity {
  @Column({ type: 'uuid' })
  nomenclature_id: string;             // Товар

  @Column({ type: 'enum', enum: InventoryLevelType })
  level_type: InventoryLevelType;      // Уровень (WAREHOUSE/OPERATOR/MACHINE)

  @Column({ type: 'uuid' })
  level_ref_id: string;                // ID объекта уровня

  @Column({ type: 'uuid', nullable: true })
  actual_count_id: string | null;      // Связь с замером

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  old_quantity: number;                // Было в системе

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  new_quantity: number;                // Стало

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adjustment_quantity: number;         // Разница (new - old)

  @Column({ type: 'enum', enum: AdjustmentReason })
  reason: AdjustmentReason;            // Причина

  @Column({ type: 'text', nullable: true })
  comment: string | null;              // Комментарий

  @Column({ type: 'enum', enum: AdjustmentStatus, default: AdjustmentStatus.PENDING })
  status: AdjustmentStatus;            // Статус

  @Column({ type: 'boolean', default: true })
  requires_approval: boolean;          // Требует ли согласования

  @Column({ type: 'uuid' })
  created_by_user_id: string;          // Кто создал

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;  // Кто одобрил

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;            // Когда одобрено

  @Column({ type: 'timestamp', nullable: true })
  applied_at: Date | null;             // Когда применено
}
```

---

## Интеграция с модулем задач

### Связь с REFILL задачами

При завершении задачи пополнения происходит:

1. Резервация освобождается (`fulfillReservation`)
2. Инвентарь переносится (`transferOperatorToMachine`)
3. Создается запись в `inventory_movements`

```typescript
// При завершении REFILL задачи
async processRefillCompletion(task: Task, dto: CompleteTaskDto, userId: string) {
  // 1. Выполняем резервацию
  await this.inventoryReservationService.fulfillReservation(task.id);

  // 2. Переносим инвентарь для каждого товара
  for (const taskItem of task.items) {
    await this.inventoryTransferService.transferOperatorToMachine({
      operator_id: task.assigned_to_user_id,
      machine_id: task.machine_id,
      nomenclature_id: taskItem.nomenclature_id,
      quantity: taskItem.actual_quantity || taskItem.planned_quantity,
      task_id: task.id,
    }, userId);
  }
}
```

### Связь с отклонением задач

При отклонении REFILL задачи:

1. Инвентарь возвращается оператору (`transferMachineToOperator`)
2. Создается компенсирующее движение

```typescript
// При отклонении REFILL задачи
async rollbackRefillInventory(task: Task, userId: string, reason: string) {
  for (const taskItem of task.items) {
    await this.inventoryTransferService.transferMachineToOperator({
      operator_id: task.assigned_to_user_id,
      machine_id: task.machine_id,
      nomenclature_id: taskItem.nomenclature_id,
      quantity: taskItem.actual_quantity || taskItem.planned_quantity,
      notes: `ОТКАТ задачи ${task.id}. Причина: ${reason}`,
    }, userId);
  }
}
```

---

## Файловая структура модуля

```
backend/src/modules/inventory/
├── dto/
│   ├── transfer-inventory.dto.ts      # DTO для трансферов
│   ├── warehouse-inventory.dto.ts     # DTO для склада
│   ├── machine-inventory.dto.ts       # DTO для аппаратов
│   ├── inventory-adjustment.dto.ts    # DTO для корректировок
│   ├── inventory-count.dto.ts         # DTO для инвентаризации
│   ├── inventory-threshold.dto.ts     # DTO для порогов
│   └── inventory-report-preset.dto.ts # DTO для отчетов
├── entities/
│   ├── warehouse-inventory.entity.ts  # Склад
│   ├── operator-inventory.entity.ts   # Оператор
│   ├── machine-inventory.entity.ts    # Аппарат
│   ├── inventory-movement.entity.ts   # Движения
│   ├── inventory-reservation.entity.ts# Резервации
│   ├── inventory-adjustment.entity.ts # Корректировки
│   ├── inventory-actual-count.entity.ts # Замеры
│   ├── inventory-difference-threshold.entity.ts # Пороги
│   └── inventory-report-preset.entity.ts # Пресеты отчетов
├── services/
│   ├── inventory-transfer.service.ts  # Трансферы (333 строки)
│   ├── inventory-reservation.service.ts # Резервации (325 строк)
│   ├── inventory-adjustment.service.ts  # Корректировки
│   ├── inventory-movement.service.ts    # Движения
│   ├── inventory-count.service.ts       # Инвентаризация
│   ├── inventory-difference.service.ts  # Расхождения
│   ├── warehouse-inventory.service.ts   # Склад
│   ├── operator-inventory.service.ts    # Оператор
│   ├── machine-inventory.service.ts     # Аппарат
│   ├── inventory-threshold.service.ts   # Пороги
│   ├── inventory-calculation.service.ts # Расчеты
│   ├── inventory-consumption-calculator.service.ts # Расход
│   ├── inventory-export.service.ts      # Экспорт
│   └── inventory-pdf.service.ts         # PDF отчеты
├── controllers/
│   ├── inventory-thresholds.controller.ts
│   └── inventory-report-presets.controller.ts
├── inventory.controller.ts            # Основной контроллер (480 строк)
├── inventory-adjustments.controller.ts
├── inventory-counts.controller.ts
├── inventory-differences.controller.ts
├── inventory.service.ts               # Основной сервис
└── inventory.module.ts
```

---

## Навигация

- **Далее**: [02-INVENTORY-TRANSFERS.md](./02-INVENTORY-TRANSFERS.md) — Трансферы между уровнями
- **Также**: [03-INVENTORY-RESERVATIONS.md](./03-INVENTORY-RESERVATIONS.md) — Резервирование
- **Также**: [04-INVENTORY-API.md](./04-INVENTORY-API.md) — REST API

---

*Документация создана на основе исходного кода: `backend/src/modules/inventory/`*
