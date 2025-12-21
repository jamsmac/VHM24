# Система резервирования и корректировок инвентаря

> **Модуль**: `backend/src/modules/inventory/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Содержание

1. [Обзор системы резервирования](#обзор-системы-резервирования)
2. [InventoryReservation Entity](#inventoryreservation-entity)
3. [Жизненный цикл резервации](#жизненный-цикл-резервации)
4. [Сервис резервирования](#сервис-резервирования)
5. [Система корректировок](#система-корректировок)
6. [InventoryAdjustment Entity](#inventoryadjustment-entity)
7. [Workflow корректировок](#workflow-корректировок)
8. [Автоматическое истечение](#автоматическое-истечение)
9. [Интеграция с задачами](#интеграция-с-задачами)

---

## Обзор системы резервирования

### Назначение

Система резервирования инвентаря решает критическую проблему **race conditions** при создании нескольких задач одновременно. Когда создаётся задача на пополнение, система должна гарантировать, что у оператора есть достаточно товара для её выполнения.

### Проблема без резервирования

```
┌─────────────────────────────────────────────────────────────────┐
│                    БЕЗ РЕЗЕРВИРОВАНИЯ                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Оператор: 100 ед. кофе                                         │
│                                                                 │
│  [Менеджер 1]              [Менеджер 2]                         │
│       │                          │                              │
│       ├─ Проверяет: 100 ед. ✓    ├─ Проверяет: 100 ед. ✓        │
│       │                          │                              │
│       ├─ Создаёт Task A: 60 ед.  │                              │
│       │                          ├─ Создаёт Task B: 60 ед.      │
│       │                          │                              │
│       ▼                          ▼                              │
│  ❌ Невозможно выполнить обе задачи (60 + 60 = 120 > 100)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Решение с резервированием

```
┌─────────────────────────────────────────────────────────────────┐
│                    С РЕЗЕРВИРОВАНИЕМ                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Оператор: 100 ед. кофе (current_quantity)                      │
│            0 ед. зарезервировано (reserved_quantity)            │
│            100 ед. доступно (available)                         │
│                                                                 │
│  [Менеджер 1]                                                   │
│       │                                                         │
│       ├─ Проверяет доступно: 100 ед. ✓                          │
│       ├─ Создаёт Task A: 60 ед.                                 │
│       ├─ Резервирует 60 ед.                                     │
│       │                                                         │
│  Состояние: current=100, reserved=60, available=40              │
│                                                                 │
│  [Менеджер 2]                                                   │
│       │                                                         │
│       ├─ Проверяет доступно: 40 ед.                             │
│       ├─ Пытается создать Task B: 60 ед.                        │
│       └─ ❌ Ошибка: недостаточно товара (40 < 60)               │
│                                                                 │
│  ✅ Система предотвратила конфликт                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## InventoryReservation Entity

### Файл

`backend/src/modules/inventory/entities/inventory-reservation.entity.ts`

### Схема таблицы

```sql
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Уникальный номер резервации
    reservation_number VARCHAR(50) UNIQUE NOT NULL,

    -- Связь с задачей
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- Связь с номенклатурой
    nomenclature_id UUID NOT NULL REFERENCES nomenclature(id) ON DELETE RESTRICT,

    -- Количества
    quantity_reserved DECIMAL(10, 3) NOT NULL,
    quantity_fulfilled DECIMAL(10, 3) DEFAULT 0,

    -- Статус
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    -- Уровень инвентаря (warehouse/operator)
    inventory_level VARCHAR(20) NOT NULL,

    -- ID склада или оператора
    reference_id UUID NOT NULL,

    -- Временные метки
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Примечания
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы
CREATE INDEX idx_reservations_task ON inventory_reservations(task_id);
CREATE INDEX idx_reservations_nomenclature ON inventory_reservations(nomenclature_id);
CREATE INDEX idx_reservations_status ON inventory_reservations(status);
CREATE INDEX idx_reservations_level_ref ON inventory_reservations(inventory_level, reference_id);
CREATE INDEX idx_reservations_expires ON inventory_reservations(expires_at);
```

### ReservationStatus Enum

```typescript
export enum ReservationStatus {
  PENDING = 'pending',                    // Резервация создана, ожидает
  CONFIRMED = 'confirmed',                // Резервация подтверждена
  PARTIALLY_FULFILLED = 'partially_fulfilled',  // Частично выполнена
  FULFILLED = 'fulfilled',                // Полностью выполнена
  CANCELLED = 'cancelled',                // Отменена
  EXPIRED = 'expired',                    // Истекла
}
```

### InventoryLevel Enum

```typescript
export enum InventoryLevel {
  WAREHOUSE = 'warehouse',   // Резервация на складе
  OPERATOR = 'operator',     // Резервация у оператора
}
```

### Entity TypeScript

```typescript
@Entity('inventory_reservations')
@Index(['task_id'])
@Index(['nomenclature_id'])
@Index(['status'])
@Index(['inventory_level', 'reference_id'])
@Index(['expires_at'])
export class InventoryReservation extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  reservation_number: string;   // RSV-{timestamp}-{random}

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_reserved: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_fulfilled: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ type: 'varchar', length: 20 })
  inventory_level: InventoryLevel;

  @Column({ type: 'uuid' })
  reference_id: string;   // warehouse_id или operator_id

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  reserved_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilled_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Вычисляемые свойства
  get quantity_remaining(): number {
    return Number(this.quantity_reserved) - Number(this.quantity_fulfilled);
  }

  get is_expired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > new Date(this.expires_at);
  }

  get is_active(): boolean {
    return (
      this.status === ReservationStatus.PENDING ||
      this.status === ReservationStatus.CONFIRMED ||
      this.status === ReservationStatus.PARTIALLY_FULFILLED
    );
  }
}
```

### Генерация номера резервации

```typescript
@BeforeInsert()
generateReservationNumber() {
  if (!this.reservation_number) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.reservation_number = `RSV-${timestamp}-${random}`;
  }
}
```

**Формат номера**: `RSV-1703068800000-0042`

---

## Жизненный цикл резервации

### Диаграмма состояний

```
                    ┌───────────────┐
                    │   PENDING     │ ◄── Создание резервации
                    │  (ожидает)    │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
     ┌────────────┐  ┌───────────┐  ┌───────────┐
     │ CONFIRMED  │  │ CANCELLED │  │  EXPIRED  │
     │(подтв.)    │  │(отменена) │  │(истекла)  │
     └─────┬──────┘  └───────────┘  └───────────┘
           │                ▲             ▲
           │                │             │
           ▼                │             │
  ┌────────────────┐        │             │
  │ PARTIALLY_     │────────┘             │
  │ FULFILLED      │──────────────────────┘
  │(частичн.)      │
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │   FULFILLED    │
  │  (выполнена)   │
  └────────────────┘
```

### Переходы состояний

| Из статуса | В статус | Триггер | Действие |
|------------|----------|---------|----------|
| - | PENDING | Создание задачи | Увеличить reserved_quantity |
| PENDING | CONFIRMED | Подтверждение | Опционально |
| PENDING | FULFILLED | Завершение задачи | Уменьшить reserved_quantity |
| PENDING | CANCELLED | Отмена задачи | Освободить reserved_quantity |
| PENDING | EXPIRED | CRON job | Освободить reserved_quantity |
| CONFIRMED | FULFILLED | Завершение задачи | Уменьшить reserved_quantity |
| CONFIRMED | CANCELLED | Отмена задачи | Освободить reserved_quantity |
| PARTIALLY_FULFILLED | FULFILLED | Полное выполнение | Финализация |
| PARTIALLY_FULFILLED | CANCELLED | Отмена | Освободить остаток |

---

## Сервис резервирования

### Файл

`backend/src/modules/inventory/services/inventory-reservation.service.ts`

### Метод createReservation

Создаёт резервации для задачи. Используется при создании задачи на пополнение.

```typescript
async createReservation(
  taskId: string,
  operatorId: string,
  items: Array<{ nomenclature_id: string; quantity: number }>,
  expiresInHours: number = 24,
): Promise<InventoryReservation[]> {
  return await this.dataSource.transaction(async (manager) => {
    const reservations: InventoryReservation[] = [];

    for (const item of items) {
      // 1. Найти инвентарь оператора
      const operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: operatorId,
          nomenclature_id: item.nomenclature_id,
        },
      });

      if (!operatorInventory) {
        throw new BadRequestException(
          `У оператора нет товара ${item.nomenclature_id}`
        );
      }

      // 2. Проверить доступное количество
      const available =
        Number(operatorInventory.current_quantity) -
        Number(operatorInventory.reserved_quantity);

      if (available < item.quantity) {
        throw new BadRequestException(
          `Недостаточно товара ${item.nomenclature_id}. ` +
          `Доступно: ${available}, требуется: ${item.quantity}`,
        );
      }

      // 3. Увеличить reserved_quantity
      operatorInventory.reserved_quantity =
        Number(operatorInventory.reserved_quantity) + item.quantity;
      await manager.save(OperatorInventory, operatorInventory);

      // 4. Рассчитать время истечения
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      // 5. Создать запись резервации
      const reservation = manager.create(InventoryReservation, {
        task_id: taskId,
        nomenclature_id: item.nomenclature_id,
        quantity_reserved: item.quantity,
        quantity_fulfilled: 0,
        status: ReservationStatus.PENDING,
        inventory_level: InventoryLevel.OPERATOR,
        reference_id: operatorId,
        expires_at: expiresAt,
        notes: `Автоматическая резервация при создании задачи`,
      });

      const savedReservation = await manager.save(reservation);
      reservations.push(savedReservation);
    }

    return reservations;
  });
}
```

### Метод fulfillReservation

Выполняет резервации при завершении задачи.

```typescript
async fulfillReservation(taskId: string): Promise<InventoryReservation[]> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Найти все PENDING резервации для задачи
    const reservations = await manager.find(InventoryReservation, {
      where: {
        task_id: taskId,
        status: ReservationStatus.PENDING,
      },
    });

    if (!reservations.length) {
      return [];
    }

    for (const reservation of reservations) {
      // 2. Обновить статус резервации
      reservation.status = ReservationStatus.FULFILLED;
      reservation.quantity_fulfilled = reservation.quantity_reserved;
      reservation.fulfilled_at = new Date();
      await manager.save(InventoryReservation, reservation);

      // 3. Уменьшить reserved_quantity у оператора
      const operatorInventory = await manager.findOne(OperatorInventory, {
        where: {
          operator_id: reservation.reference_id,
          nomenclature_id: reservation.nomenclature_id,
        },
      });

      if (operatorInventory) {
        operatorInventory.reserved_quantity = Math.max(
          0,
          Number(operatorInventory.reserved_quantity) -
          Number(reservation.quantity_reserved),
        );
        await manager.save(OperatorInventory, operatorInventory);
      }
    }

    return reservations;
  });
}
```

### Метод cancelReservation

Отменяет резервации при отмене задачи. Освобождает зарезервированное количество.

```typescript
async cancelReservation(taskId: string): Promise<InventoryReservation[]> {
  return await this.dataSource.transaction(async (manager) => {
    const reservations = await manager.find(InventoryReservation, {
      where: {
        task_id: taskId,
        status: ReservationStatus.PENDING,
      },
    });

    if (!reservations.length) {
      return [];
    }

    for (const reservation of reservations) {
      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelled_at = new Date();
      await manager.save(InventoryReservation, reservation);

      // Освободить reserved_quantity в зависимости от уровня
      if (reservation.inventory_level === InventoryLevel.OPERATOR) {
        const operatorInventory = await manager.findOne(OperatorInventory, {
          where: {
            operator_id: reservation.reference_id,
            nomenclature_id: reservation.nomenclature_id,
          },
        });

        if (operatorInventory) {
          operatorInventory.reserved_quantity = Math.max(
            0,
            Number(operatorInventory.reserved_quantity) -
            Number(reservation.quantity_reserved),
          );
          await manager.save(OperatorInventory, operatorInventory);
        }
      } else if (reservation.inventory_level === InventoryLevel.WAREHOUSE) {
        const warehouseInventory = await manager.findOne(WarehouseInventory, {
          where: {
            nomenclature_id: reservation.nomenclature_id,
          },
        });

        if (warehouseInventory) {
          warehouseInventory.reserved_quantity = Math.max(
            0,
            Number(warehouseInventory.reserved_quantity) -
            Number(reservation.quantity_reserved),
          );
          await manager.save(WarehouseInventory, warehouseInventory);
        }
      }
    }

    return reservations;
  });
}
```

### Метод expireOldReservations

CRON-задача для автоматического истечения забытых резерваций.

```typescript
async expireOldReservations(): Promise<number> {
  return await this.dataSource.transaction(async (manager) => {
    // Найти все просроченные PENDING резервации
    const expiredReservations = await manager.find(InventoryReservation, {
      where: {
        status: ReservationStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
    });

    if (!expiredReservations.length) {
      return 0;
    }

    for (const reservation of expiredReservations) {
      reservation.status = ReservationStatus.EXPIRED;
      reservation.cancelled_at = new Date();
      await manager.save(InventoryReservation, reservation);

      // Освободить reserved_quantity аналогично cancelReservation
      if (reservation.inventory_level === InventoryLevel.OPERATOR) {
        const operatorInventory = await manager.findOne(OperatorInventory, {
          where: {
            operator_id: reservation.reference_id,
            nomenclature_id: reservation.nomenclature_id,
          },
        });

        if (operatorInventory) {
          operatorInventory.reserved_quantity = Math.max(
            0,
            Number(operatorInventory.reserved_quantity) -
            Number(reservation.quantity_reserved),
          );
          await manager.save(OperatorInventory, operatorInventory);
        }
      }
      // ... аналогично для warehouse
    }

    return expiredReservations.length;
  });
}
```

### Запросы резерваций

```typescript
// Резервации по задаче
async getReservationsByTask(taskId: string): Promise<InventoryReservation[]> {
  return this.reservationRepository.find({
    where: { task_id: taskId },
    order: { created_at: 'DESC' },
  });
}

// Активные резервации оператора
async getActiveReservationsByOperator(
  operatorId: string
): Promise<InventoryReservation[]> {
  return this.reservationRepository.find({
    where: {
      reference_id: operatorId,
      inventory_level: InventoryLevel.OPERATOR,
      status: ReservationStatus.PENDING,
    },
    order: { created_at: 'DESC' },
  });
}

// Все активные резервации в системе
async getActiveReservations(): Promise<InventoryReservation[]> {
  return this.reservationRepository.find({
    where: {
      status: ReservationStatus.PENDING,
    },
    order: { created_at: 'DESC' },
  });
}
```

---

## Система корректировок

### Назначение

Система корректировок (adjustments) позволяет исправлять расхождения между учётными и фактическими остатками. Используется при:

- Инвентаризации
- Обнаружении повреждённого товара
- Списании просроченного товара
- Исправлении ошибок ввода

### Workflow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   PENDING     │────▶│   APPROVED    │────▶│   APPLIED     │
│  (ожидает)    │     │  (одобрено)   │     │ (применено)   │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│   REJECTED    │     │  CANCELLED    │
│  (отклонено)  │     │  (отменено)   │
└───────────────┘     └───────────────┘
```

---

## InventoryAdjustment Entity

### Файл

`backend/src/modules/inventory/entities/inventory-adjustment.entity.ts`

### Схема таблицы

```sql
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Связь с товаром
    nomenclature_id UUID NOT NULL REFERENCES nomenclature(id) ON DELETE RESTRICT,

    -- Уровень учёта
    level_type VARCHAR(20) NOT NULL,  -- warehouse, operator, machine
    level_ref_id UUID NOT NULL,       -- warehouse_id, operator_id, machine_id

    -- Связь с инвентаризацией (опционально)
    actual_count_id UUID REFERENCES inventory_actual_counts(id) ON DELETE SET NULL,

    -- Количества
    old_quantity DECIMAL(10, 2) NOT NULL,
    new_quantity DECIMAL(10, 2) NOT NULL,
    adjustment_quantity DECIMAL(10, 2) NOT NULL,  -- new - old

    -- Причина и описание
    reason VARCHAR(30) NOT NULL,
    comment TEXT,

    -- Статус
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requires_approval BOOLEAN DEFAULT TRUE,

    -- Пользователи
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Временные метки
    approved_at TIMESTAMP,
    applied_at TIMESTAMP,

    -- Метаданные
    metadata JSONB,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы
CREATE INDEX idx_adjustments_status ON inventory_adjustments(status);
CREATE INDEX idx_adjustments_nomenclature ON inventory_adjustments(nomenclature_id);
CREATE INDEX idx_adjustments_level ON inventory_adjustments(level_type, level_ref_id);
CREATE INDEX idx_adjustments_created_by ON inventory_adjustments(created_by_user_id);
CREATE INDEX idx_adjustments_approved_by ON inventory_adjustments(approved_by_user_id);
```

### AdjustmentStatus Enum

```typescript
export enum AdjustmentStatus {
  PENDING = 'pending',      // Ожидает рассмотрения
  APPROVED = 'approved',    // Одобрено
  REJECTED = 'rejected',    // Отклонено
  APPLIED = 'applied',      // Применено к инвентарю
  CANCELLED = 'cancelled',  // Отменено
}
```

### AdjustmentReason Enum

```typescript
export enum AdjustmentReason {
  INVENTORY_DIFFERENCE = 'inventory_difference',  // Расхождение при инвентаризации
  DAMAGE = 'damage',                              // Повреждение товара
  THEFT = 'theft',                                // Кража
  EXPIRY = 'expiry',                              // Истечение срока годности
  RETURN = 'return',                              // Возврат
  CORRECTION = 'correction',                      // Исправление ошибки
  OTHER = 'other',                                // Другое
}
```

### InventoryLevelType Enum

```typescript
export enum InventoryLevelType {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
  MACHINE = 'machine',
}
```

### Entity TypeScript

```typescript
@Entity('inventory_adjustments')
@Index(['status'])
@Index(['nomenclature_id'])
@Index(['level_type', 'level_ref_id'])
@Index(['created_by_user_id'])
@Index(['approved_by_user_id'])
export class InventoryAdjustment extends BaseEntity {
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @Column({ type: 'enum', enum: InventoryLevelType })
  level_type: InventoryLevelType;

  @Column({ type: 'uuid' })
  level_ref_id: string;

  @Column({ type: 'uuid', nullable: true })
  actual_count_id: string | null;

  @ManyToOne(() => InventoryActualCount, { nullable: true })
  @JoinColumn({ name: 'actual_count_id' })
  actual_count: InventoryActualCount | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  old_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  new_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adjustment_quantity: number;  // new_quantity - old_quantity

  @Column({ type: 'enum', enum: AdjustmentReason })
  reason: AdjustmentReason;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.PENDING,
  })
  status: AdjustmentStatus;

  @Column({ type: 'boolean', default: true })
  requires_approval: boolean;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by_user_id' })
  approved_by: User | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  applied_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Workflow корректировок

### 1. Создание корректировки

```typescript
async createAdjustment(dto: CreateAdjustmentDto, userId: string): Promise<InventoryAdjustment> {
  // Получить текущее количество
  const currentQuantity = await this.getCurrentQuantity(
    dto.level_type,
    dto.level_ref_id,
    dto.nomenclature_id,
  );

  const adjustment = this.adjustmentRepository.create({
    nomenclature_id: dto.nomenclature_id,
    level_type: dto.level_type,
    level_ref_id: dto.level_ref_id,
    old_quantity: currentQuantity,
    new_quantity: dto.new_quantity,
    adjustment_quantity: dto.new_quantity - currentQuantity,
    reason: dto.reason,
    comment: dto.comment,
    status: AdjustmentStatus.PENDING,
    requires_approval: dto.requires_approval ?? true,
    created_by_user_id: userId,
  });

  return this.adjustmentRepository.save(adjustment);
}
```

### 2. Одобрение корректировки

```typescript
async approveAdjustment(
  adjustmentId: string,
  approverId: string
): Promise<InventoryAdjustment> {
  const adjustment = await this.adjustmentRepository.findOne({
    where: { id: adjustmentId },
  });

  if (adjustment.status !== AdjustmentStatus.PENDING) {
    throw new BadRequestException('Корректировка не в статусе ожидания');
  }

  adjustment.status = AdjustmentStatus.APPROVED;
  adjustment.approved_by_user_id = approverId;
  adjustment.approved_at = new Date();

  return this.adjustmentRepository.save(adjustment);
}
```

### 3. Применение корректировки

```typescript
async applyAdjustment(adjustmentId: string): Promise<InventoryAdjustment> {
  return await this.dataSource.transaction(async (manager) => {
    const adjustment = await manager.findOne(InventoryAdjustment, {
      where: { id: adjustmentId },
    });

    if (adjustment.status !== AdjustmentStatus.APPROVED) {
      throw new BadRequestException('Корректировка не одобрена');
    }

    // Применить изменение к соответствующему уровню
    switch (adjustment.level_type) {
      case InventoryLevelType.WAREHOUSE:
        await this.applyToWarehouse(manager, adjustment);
        break;
      case InventoryLevelType.OPERATOR:
        await this.applyToOperator(manager, adjustment);
        break;
      case InventoryLevelType.MACHINE:
        await this.applyToMachine(manager, adjustment);
        break;
    }

    // Создать запись движения
    await this.createMovementRecord(manager, adjustment);

    adjustment.status = AdjustmentStatus.APPLIED;
    adjustment.applied_at = new Date();

    return manager.save(InventoryAdjustment, adjustment);
  });
}
```

### 4. Отклонение корректировки

```typescript
async rejectAdjustment(
  adjustmentId: string,
  approverId: string,
  comment: string
): Promise<InventoryAdjustment> {
  const adjustment = await this.adjustmentRepository.findOne({
    where: { id: adjustmentId },
  });

  if (adjustment.status !== AdjustmentStatus.PENDING) {
    throw new BadRequestException('Корректировка не в статусе ожидания');
  }

  adjustment.status = AdjustmentStatus.REJECTED;
  adjustment.approved_by_user_id = approverId;
  adjustment.approved_at = new Date();
  adjustment.metadata = {
    ...adjustment.metadata,
    rejection_reason: comment,
  };

  return this.adjustmentRepository.save(adjustment);
}
```

---

## Автоматическое истечение

### CRON конфигурация

```typescript
// scheduled-tasks/scheduled-tasks.service.ts

@Cron('0 */4 * * *') // Каждые 4 часа
async expireReservations() {
  const expired = await this.inventoryReservationService.expireOldReservations();
  if (expired > 0) {
    this.logger.log(`Expired ${expired} reservations`);
  }
}
```

### Параметры истечения

| Параметр | Значение | Описание |
|----------|----------|----------|
| Время жизни резервации | 24 часа | По умолчанию |
| Проверка истечения | Каждые 4 часа | CRON schedule |
| Буфер времени | 0 | Истекает сразу после expires_at |

---

## Интеграция с задачами

### При создании задачи на пополнение

```typescript
// tasks.service.ts

async createRefillTask(dto: CreateTaskDto): Promise<Task> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Создать задачу
    const task = await manager.save(Task, {
      ...dto,
      status: TaskStatus.PENDING,
    });

    // 2. Создать элементы задачи
    for (const item of dto.items) {
      await manager.save(TaskItem, {
        task_id: task.id,
        nomenclature_id: item.nomenclature_id,
        quantity: item.quantity,
      });
    }

    // 3. Создать резервации
    await this.inventoryReservationService.createReservation(
      task.id,
      dto.assigned_operator_id,
      dto.items,
      24, // expires in 24 hours
    );

    return task;
  });
}
```

### При завершении задачи

```typescript
async completeRefillTask(taskId: string): Promise<Task> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Выполнить резервации
    await this.inventoryReservationService.fulfillReservation(taskId);

    // 2. Перенести товар (operator → machine)
    await this.inventoryTransferService.transferOperatorToMachine(
      taskId,
      manager,
    );

    // 3. Обновить статус задачи
    return manager.save(Task, {
      id: taskId,
      status: TaskStatus.COMPLETED,
      completed_at: new Date(),
    });
  });
}
```

### При отмене задачи

```typescript
async cancelTask(taskId: string): Promise<Task> {
  // 1. Отменить резервации (освобождает reserved_quantity)
  await this.inventoryReservationService.cancelReservation(taskId);

  // 2. Обновить статус задачи
  return this.taskRepository.save({
    id: taskId,
    status: TaskStatus.CANCELLED,
    cancelled_at: new Date(),
  });
}
```

### Диаграмма интеграции

```
┌──────────────────────────────────────────────────────────────────┐
│                     СОЗДАНИЕ ЗАДАЧИ                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Менеджер] ──▶ POST /tasks                                      │
│                    │                                             │
│                    ▼                                             │
│              ┌───────────┐                                       │
│              │ TasksService│                                     │
│              └─────┬─────┘                                       │
│                    │                                             │
│        ┌───────────┴───────────┐                                 │
│        ▼                       ▼                                 │
│  ┌───────────┐         ┌──────────────┐                          │
│  │ Создаёт   │         │ Резервирует  │                          │
│  │ Task      │         │ товары       │                          │
│  └───────────┘         └──────────────┘                          │
│                              │                                   │
│                              ▼                                   │
│                   ┌──────────────────┐                           │
│                   │ OperatorInventory│                           │
│                   │ reserved_qty += N│                           │
│                   └──────────────────┘                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   ЗАВЕРШЕНИЕ ЗАДАЧИ                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Оператор] ──▶ POST /tasks/:id/complete                         │
│                    │                                             │
│                    ▼                                             │
│              ┌───────────┐                                       │
│              │ TasksService│                                     │
│              └─────┬─────┘                                       │
│                    │                                             │
│        ┌───────────┴───────────┬───────────────────┐             │
│        ▼                       ▼                   ▼             │
│  ┌───────────┐         ┌──────────────┐    ┌─────────────┐       │
│  │ Выполняет │         │ Переносит    │    │ Обновляет   │       │
│  │ резервацию│         │ товар в авт. │    │ статус      │       │
│  └───────────┘         └──────────────┘    └─────────────┘       │
│        │                       │                                 │
│        ▼                       ▼                                 │
│  ┌──────────────┐       ┌───────────────────────┐                │
│  │ reserved -= N│       │ OperatorInventory -= N│                │
│  │ status=FULFILL│      │ MachineInventory += N │                │
│  └──────────────┘       └───────────────────────┘                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Мониторинг и алерты

### Метрики для мониторинга

| Метрика | Описание | Порог алерта |
|---------|----------|--------------|
| pending_reservations_count | Количество активных резерваций | > 100 |
| expired_reservations_24h | Истёкших за 24 часа | > 10 |
| avg_reservation_lifetime_hours | Среднее время жизни резервации | > 48 |
| pending_adjustments_count | Ожидающих корректировок | > 50 |

### Логирование

```typescript
// При создании резервации
this.logger.log(`Created reservation ${reservation.reservation_number} ` +
  `for task ${taskId}, items: ${items.length}`);

// При истечении
this.logger.warn(`Expired ${count} reservations`);

// При ошибке
this.logger.error(`Failed to create reservation for task ${taskId}`, error);
```

---

## См. также

- [01-INVENTORY-OVERVIEW.md](./01-INVENTORY-OVERVIEW.md) - Обзор 3-уровневой системы
- [02-INVENTORY-TRANSFERS.md](./02-INVENTORY-TRANSFERS.md) - Трансферы и блокировки
- [04-INVENTORY-API.md](./04-INVENTORY-API.md) - REST API документация
- [../tasks/README.md](../tasks/README.md) - Документация системы задач
