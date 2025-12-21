# Трансферы инвентаря

> **Версия**: 2.0
> **Последнее обновление**: 2025-12-20
> **Исходный код**: `backend/src/modules/inventory/services/inventory-transfer.service.ts`

---

## Содержание

1. [Обзор системы трансферов](#обзор-системы-трансферов)
2. [Pessimistic Locking](#pessimistic-locking)
3. [Warehouse → Operator](#warehouse--operator)
4. [Operator → Warehouse](#operator--warehouse)
5. [Operator → Machine](#operator--machine)
6. [Machine → Operator](#machine--operator)
7. [Обработка ошибок](#обработка-ошибок)
8. [Примеры использования](#примеры-использования)

---

## Обзор системы трансферов

### Архитектура InventoryTransferService

```typescript
// Файл: backend/src/modules/inventory/services/inventory-transfer.service.ts

@Injectable()
export class InventoryTransferService {
  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseInventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorInventoryRepository: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineInventoryRepository: Repository<MachineInventory>,
    private readonly dataSource: DataSource,
  ) {}
}
```

### Доступные типы трансферов

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ТИПЫ ТРАНСФЕРОВ                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                      ┌─────────────┐                  │
│  │   СКЛАД     │<────────────────────>│  ОПЕРАТОР   │                  │
│  │             │  transferWarehouse   │             │                  │
│  │             │  ToOperator()        │             │                  │
│  │             │                      │             │                  │
│  │             │  transferOperator    │             │                  │
│  │             │  ToWarehouse()       │             │                  │
│  └─────────────┘                      └──────┬──────┘                  │
│                                              │                          │
│                                              │                          │
│                                              ▼                          │
│                                       ┌─────────────┐                  │
│                                       │   АППАРАТ   │                  │
│                                       │             │                  │
│                                       │ transferOpe-│                  │
│                                       │ ratorTo     │                  │
│                                       │ Machine()   │                  │
│                                       │             │                  │
│                                       │ transferMa- │                  │
│                                       │ chineTo     │                  │
│                                       │ Operator()  │                  │
│                                       └─────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pessimistic Locking

### Зачем нужна блокировка

При параллельных запросах на изменение одного инвентаря может возникнуть race condition:

```
Поток A: читает quantity = 100
Поток B: читает quantity = 100
Поток A: записывает quantity = 100 - 20 = 80
Поток B: записывает quantity = 100 - 30 = 70  ← НЕВЕРНО! Должно быть 50
```

### Решение: Pessimistic Write Lock

```typescript
// Блокировка записи в TypeORM
const inventory = await manager.findOne(WarehouseInventory, {
  where: { nomenclature_id: dto.nomenclature_id },
  lock: { mode: 'pessimistic_write' },  // FOR UPDATE в SQL
});
```

**SQL эквивалент**:
```sql
SELECT * FROM warehouse_inventory
WHERE nomenclature_id = $1
FOR UPDATE;  -- Блокирует строку до конца транзакции
```

### Паттерн использования

```typescript
async transfer(dto: TransferDto, userId: string): Promise<Result> {
  // Вся операция в одной транзакции
  return await this.dataSource.transaction(async (manager) => {
    // 1. Блокируем источник
    const source = await manager.findOne(SourceInventory, {
      where: { id: dto.sourceId },
      lock: { mode: 'pessimistic_write' },
    });

    // 2. Проверяем доступность
    if (source.quantity < dto.quantity) {
      throw new BadRequestException('Недостаточно товара');
    }

    // 3. Списываем с источника
    source.quantity -= dto.quantity;
    await manager.save(SourceInventory, source);

    // 4. Блокируем получателя
    let destination = await manager.findOne(DestInventory, {
      where: { id: dto.destId },
      lock: { mode: 'pessimistic_write' },
    });

    // 5. Добавляем получателю
    destination.quantity += dto.quantity;
    await manager.save(DestInventory, destination);

    // 6. Создаем запись движения
    const movement = manager.create(InventoryMovement, { ... });
    await manager.save(InventoryMovement, movement);

    return { source, destination };
  });
}
```

---

## Warehouse → Operator

### Описание

Выдача товара со склада оператору для последующего пополнения аппаратов.

### DTO

```typescript
// Файл: backend/src/modules/inventory/dto/transfer-inventory.dto.ts

export class TransferWarehouseToOperatorDto {
  @IsUUID()
  operator_id: string;        // ID оператора

  @IsUUID()
  nomenclature_id: string;    // ID товара

  @IsNumber()
  @Min(0.001)
  quantity: number;           // Количество

  @IsOptional()
  @IsString()
  notes?: string;             // Примечания
}
```

### Реализация

```typescript
// Файл: backend/src/modules/inventory/services/inventory-transfer.service.ts:44-106

async transferWarehouseToOperator(
  dto: TransferWarehouseToOperatorDto,
  userId: string,
): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Блокируем и получаем складской инвентарь
    const warehouseInventory = await manager.findOne(WarehouseInventory, {
      where: { nomenclature_id: dto.nomenclature_id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!warehouseInventory) {
      throw new NotFoundException(
        `Товар ${dto.nomenclature_id} не найден на складе`
      );
    }

    // 2. Проверяем достаточность
    const warehouseQty = Number(warehouseInventory.current_quantity);
    const requestedQty = Number(dto.quantity);

    if (warehouseQty < requestedQty) {
      throw new BadRequestException(
        `Недостаточно товара на складе. ` +
        `Доступно: ${warehouseQty}, запрошено: ${requestedQty}`
      );
    }

    // 3. Списываем со склада
    warehouseInventory.current_quantity = warehouseQty - requestedQty;
    await manager.save(WarehouseInventory, warehouseInventory);

    // 4. Находим или создаем инвентарь оператора
    let operatorInventory = await manager.findOne(OperatorInventory, {
      where: {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!operatorInventory) {
      operatorInventory = manager.create(OperatorInventory, {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
        current_quantity: 0,
        reserved_quantity: 0,
      });
    }

    // 5. Добавляем оператору
    operatorInventory.current_quantity =
      Number(operatorInventory.current_quantity) + requestedQty;
    operatorInventory.last_received_at = new Date();
    await manager.save(OperatorInventory, operatorInventory);

    // 6. Создаем запись движения
    const movement = manager.create(InventoryMovement, {
      movement_type: MovementType.WAREHOUSE_TO_OPERATOR,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      operator_id: dto.operator_id,
      notes: dto.notes || `Выдано оператору со склада: ${dto.quantity}`,
    });
    await manager.save(InventoryMovement, movement);

    return {
      warehouse: warehouseInventory,
      operator: operatorInventory,
    };
  });
}
```

### Диаграмма

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  WAREHOUSE → OPERATOR TRANSFER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ДО:                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │     СКЛАД       │         │    ОПЕРАТОР     │                       │
│  │  Кофе: 100 кг   │         │   Кофе: 0 кг    │                       │
│  └─────────────────┘         └─────────────────┘                       │
│                                                                         │
│  ОПЕРАЦИЯ: transferWarehouseToOperator(кофе, 20 кг)                    │
│                                                                         │
│  ПОСЛЕ:                                                                │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │     СКЛАД       │  ───>   │    ОПЕРАТОР     │                       │
│  │  Кофе: 80 кг    │  20 кг  │   Кофе: 20 кг   │                       │
│  └─────────────────┘         └─────────────────┘                       │
│                                                                         │
│  + inventory_movement: WAREHOUSE_TO_OPERATOR, quantity: 20              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Operator → Warehouse

### Описание

Возврат неиспользованного товара от оператора на склад.

### DTO

```typescript
export class TransferOperatorToWarehouseDto {
  @IsUUID()
  operator_id: string;        // ID оператора

  @IsUUID()
  nomenclature_id: string;    // ID товара

  @IsNumber()
  @Min(0.001)
  quantity: number;           // Количество

  @IsOptional()
  @IsString()
  notes?: string;             // Примечания
}
```

### Реализация

```typescript
// Файл: backend/src/modules/inventory/services/inventory-transfer.service.ts:108-172

async transferOperatorToWarehouse(
  dto: TransferOperatorToWarehouseDto,
  userId: string,
): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Блокируем инвентарь оператора
    const operatorInventory = await manager.findOne(OperatorInventory, {
      where: {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!operatorInventory) {
      throw new NotFoundException(
        `Товар ${dto.nomenclature_id} не найден у оператора ${dto.operator_id}`
      );
    }

    // 2. Проверяем достаточность
    const operatorQty = Number(operatorInventory.current_quantity);
    const requestedQty = Number(dto.quantity);

    if (operatorQty < requestedQty) {
      throw new BadRequestException(
        `Недостаточно товара у оператора. ` +
        `Доступно: ${operatorQty}, запрошено: ${requestedQty}`
      );
    }

    // 3. Списываем у оператора
    operatorInventory.current_quantity = operatorQty - requestedQty;
    await manager.save(OperatorInventory, operatorInventory);

    // 4. Добавляем на склад
    const warehouseInventory = await manager.findOne(WarehouseInventory, {
      where: { nomenclature_id: dto.nomenclature_id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!warehouseInventory) {
      throw new NotFoundException(
        `Товар ${dto.nomenclature_id} не найден на складе`
      );
    }

    warehouseInventory.current_quantity =
      Number(warehouseInventory.current_quantity) + requestedQty;
    await manager.save(WarehouseInventory, warehouseInventory);

    // 5. Создаем запись движения
    const movement = manager.create(InventoryMovement, {
      movement_type: MovementType.OPERATOR_TO_WAREHOUSE,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      operator_id: dto.operator_id,
      notes: dto.notes || `Возврат на склад от оператора: ${dto.quantity}`,
    });
    await manager.save(InventoryMovement, movement);

    return {
      warehouse: warehouseInventory,
      operator: operatorInventory,
    };
  });
}
```

---

## Operator → Machine

### Описание

**КРИТИЧЕСКИЙ ТРАНСФЕР**: Пополнение аппарата товаром от оператора. Вызывается автоматически при завершении задач типа `REFILL`.

### DTO

```typescript
export class TransferOperatorToMachineDto {
  @IsUUID()
  operator_id: string;        // ID оператора

  @IsUUID()
  machine_id: string;         // ID аппарата

  @IsUUID()
  nomenclature_id: string;    // ID товара

  @IsNumber()
  @Min(0.001)
  quantity: number;           // Количество

  @IsOptional()
  @IsUUID()
  task_id?: string;           // ID задачи пополнения

  @IsOptional()
  @IsString()
  notes?: string;             // Примечания

  @IsOptional()
  @IsDateString()
  operation_date?: string;    // Фактическая дата (для офлайн)
}
```

### Реализация

```typescript
// Файл: backend/src/modules/inventory/services/inventory-transfer.service.ts:174-256

async transferOperatorToMachine(
  dto: TransferOperatorToMachineDto,
  userId: string,
): Promise<{ operator: OperatorInventory; machine: MachineInventory }> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Блокируем инвентарь оператора
    const operatorInventory = await manager.findOne(OperatorInventory, {
      where: {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!operatorInventory) {
      throw new NotFoundException(
        `Товар ${dto.nomenclature_id} не найден у оператора ${dto.operator_id}`
      );
    }

    // 2. Проверяем достаточность
    const operatorQty = Number(operatorInventory.current_quantity);
    const requestedQty = Number(dto.quantity);

    if (operatorQty < requestedQty) {
      throw new BadRequestException(
        `Недостаточно товара у оператора. ` +
        `Доступно: ${operatorQty}, запрошено: ${requestedQty}`
      );
    }

    // 3. Списываем у оператора
    operatorInventory.current_quantity = operatorQty - requestedQty;
    if (dto.task_id) {
      operatorInventory.last_task_id = dto.task_id;
    }
    await manager.save(OperatorInventory, operatorInventory);

    // 4. Находим или создаем инвентарь машины
    let machineInventory = await manager.findOne(MachineInventory, {
      where: {
        machine_id: dto.machine_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!machineInventory) {
      machineInventory = manager.create(MachineInventory, {
        machine_id: dto.machine_id,
        nomenclature_id: dto.nomenclature_id,
        current_quantity: 0,
        min_stock_level: 0,
      });
    }

    // 5. Добавляем в машину
    machineInventory.current_quantity =
      Number(machineInventory.current_quantity) + requestedQty;
    machineInventory.last_refilled_at = new Date();
    if (dto.task_id) {
      machineInventory.last_refill_task_id = dto.task_id;
    }
    await manager.save(MachineInventory, machineInventory);

    // 6. Создаем запись движения
    const movement = manager.create(InventoryMovement, {
      movement_type: MovementType.OPERATOR_TO_MACHINE,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      operator_id: dto.operator_id,
      machine_id: dto.machine_id,
      task_id: dto.task_id,
      operation_date: dto.operation_date ? new Date(dto.operation_date) : new Date(),
      notes: dto.notes || `Пополнение аппарата оператором: ${dto.quantity}`,
    });
    await manager.save(InventoryMovement, movement);

    return {
      operator: operatorInventory,
      machine: machineInventory,
    };
  });
}
```

### Особенности

1. **Связь с задачей** — `task_id` записывается для отслеживания
2. **operation_date** — поддержка офлайн режима (фактическая дата)
3. **Автоматическое создание** — `MachineInventory` создается автоматически
4. **Обновление статистики** — `last_refilled_at`, `last_refill_task_id`

---

## Machine → Operator

### Описание

Изъятие товара из аппарата. Используется при:
- Просрочке товара
- Браке
- Отклонении задачи (компенсирующая транзакция)

### DTO

```typescript
export class TransferMachineToOperatorDto {
  @IsUUID()
  operator_id: string;        // ID оператора

  @IsUUID()
  machine_id: string;         // ID аппарата

  @IsUUID()
  nomenclature_id: string;    // ID товара

  @IsNumber()
  @Min(0.001)
  quantity: number;           // Количество

  @IsOptional()
  @IsString()
  notes?: string;             // Примечания
}
```

### Реализация

```typescript
// Файл: backend/src/modules/inventory/services/inventory-transfer.service.ts:258-331

async transferMachineToOperator(
  dto: TransferMachineToOperatorDto,
  userId: string,
): Promise<{ machine: MachineInventory; operator: OperatorInventory }> {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Блокируем инвентарь машины
    const machineInventory = await manager.findOne(MachineInventory, {
      where: {
        machine_id: dto.machine_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!machineInventory) {
      throw new NotFoundException(
        `Товар ${dto.nomenclature_id} не найден в аппарате ${dto.machine_id}`
      );
    }

    // 2. Проверяем достаточность
    const machineQty = Number(machineInventory.current_quantity);
    const requestedQty = Number(dto.quantity);

    if (machineQty < requestedQty) {
      throw new BadRequestException(
        `Недостаточно товара в аппарате. ` +
        `Доступно: ${machineQty}, запрошено: ${requestedQty}`
      );
    }

    // 3. Списываем из машины
    machineInventory.current_quantity = machineQty - requestedQty;
    await manager.save(MachineInventory, machineInventory);

    // 4. Находим или создаем инвентарь оператора
    let operatorInventory = await manager.findOne(OperatorInventory, {
      where: {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (!operatorInventory) {
      operatorInventory = manager.create(OperatorInventory, {
        operator_id: dto.operator_id,
        nomenclature_id: dto.nomenclature_id,
        current_quantity: 0,
        reserved_quantity: 0,
      });
    }

    // 5. Добавляем оператору
    operatorInventory.current_quantity =
      Number(operatorInventory.current_quantity) + requestedQty;
    await manager.save(OperatorInventory, operatorInventory);

    // 6. Создаем запись движения
    const movement = manager.create(InventoryMovement, {
      movement_type: MovementType.MACHINE_TO_OPERATOR,
      nomenclature_id: dto.nomenclature_id,
      quantity: dto.quantity,
      performed_by_user_id: userId,
      operator_id: dto.operator_id,
      machine_id: dto.machine_id,
      notes: dto.notes || `Изъятие из аппарата оператором: ${dto.quantity}`,
    });
    await manager.save(InventoryMovement, movement);

    return {
      machine: machineInventory,
      operator: operatorInventory,
    };
  });
}
```

---

## Обработка ошибок

### Типичные ошибки

| Ситуация | Исключение | HTTP код |
|----------|------------|----------|
| Товар не найден | `NotFoundException` | 404 |
| Недостаточно товара | `BadRequestException` | 400 |
| Deadlock | `QueryFailedError` | 500 (retry) |

### Обработка deadlock

```typescript
// Рекомендуемый паттерн для повторных попыток
async transferWithRetry(dto: TransferDto, userId: string, maxRetries = 3) {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.transfer(dto, userId);
    } catch (error) {
      lastError = error;

      // Проверяем, это deadlock?
      if (error.code === '40P01') { // PostgreSQL deadlock code
        this.logger.warn(`Deadlock detected, attempt ${attempt}/${maxRetries}`);
        await this.delay(attempt * 100); // Экспоненциальная задержка
        continue;
      }

      // Другие ошибки — пробрасываем сразу
      throw error;
    }
  }

  throw lastError;
}
```

---

## Примеры использования

### API вызовы

```bash
# Выдача со склада оператору
POST /api/inventory/transfer/warehouse-to-operator
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operator_id": "550e8400-e29b-41d4-a716-446655440001",
  "nomenclature_id": "550e8400-e29b-41d4-a716-446655440002",
  "quantity": 10.5,
  "notes": "Выдано для маршрута #5"
}

# Возврат на склад
POST /api/inventory/transfer/operator-to-warehouse
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operator_id": "550e8400-e29b-41d4-a716-446655440001",
  "nomenclature_id": "550e8400-e29b-41d4-a716-446655440002",
  "quantity": 2.5,
  "notes": "Возврат неиспользованного"
}

# Пополнение аппарата (обычно автоматически при завершении задачи)
POST /api/inventory/transfer/operator-to-machine
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operator_id": "550e8400-e29b-41d4-a716-446655440001",
  "machine_id": "550e8400-e29b-41d4-a716-446655440003",
  "nomenclature_id": "550e8400-e29b-41d4-a716-446655440002",
  "quantity": 5.0,
  "task_id": "550e8400-e29b-41d4-a716-446655440004",
  "notes": "Пополнение по задаче #123"
}

# Изъятие из аппарата
POST /api/inventory/transfer/machine-to-operator
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "operator_id": "550e8400-e29b-41d4-a716-446655440001",
  "machine_id": "550e8400-e29b-41d4-a716-446655440003",
  "nomenclature_id": "550e8400-e29b-41d4-a716-446655440002",
  "quantity": 1.0,
  "notes": "Изъятие просроченного товара"
}
```

### Ответ успешного трансфера

```json
{
  "warehouse": {
    "id": "uuid",
    "nomenclature_id": "uuid",
    "current_quantity": 89.5,
    "reserved_quantity": 0,
    "min_stock_level": 20,
    "updated_at": "2025-12-20T12:00:00.000Z"
  },
  "operator": {
    "id": "uuid",
    "operator_id": "uuid",
    "nomenclature_id": "uuid",
    "current_quantity": 10.5,
    "reserved_quantity": 0,
    "last_received_at": "2025-12-20T12:00:00.000Z",
    "updated_at": "2025-12-20T12:00:00.000Z"
  }
}
```

---

## Навигация

- **Назад**: [01-INVENTORY-OVERVIEW.md](./01-INVENTORY-OVERVIEW.md) — Обзор системы
- **Далее**: [03-INVENTORY-RESERVATIONS.md](./03-INVENTORY-RESERVATIONS.md) — Резервирование
- **Также**: [04-INVENTORY-API.md](./04-INVENTORY-API.md) — REST API

---

*Документация создана на основе исходного кода: `backend/src/modules/inventory/services/inventory-transfer.service.ts`*
