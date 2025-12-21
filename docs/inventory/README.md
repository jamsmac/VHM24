# Inventory System Documentation

> **Модуль**: `backend/src/modules/inventory/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система инвентаря VendHub Manager реализует **3-уровневую архитектуру** учёта товаров:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│     СКЛАД        │────▶│    ОПЕРАТОР      │────▶│    АВТОМАТ       │
│   (Warehouse)    │     │   (Operator)     │     │   (Machine)      │
│                  │     │                  │     │                  │
│  Центральный     │     │  Персональный    │     │  Загруженный     │
│  запас           │     │  запас           │     │  в аппарат       │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   warehouse_         operator_           machine_
   inventory          inventory           inventory
```

---

## Документация

### Основные разделы

| Документ | Описание |
|----------|----------|
| [01-INVENTORY-OVERVIEW.md](./01-INVENTORY-OVERVIEW.md) | Архитектура 3-уровневой системы, сущности, MovementType enum |
| [02-INVENTORY-TRANSFERS.md](./02-INVENTORY-TRANSFERS.md) | Трансферы между уровнями, pessimistic locking, race conditions |
| [03-INVENTORY-RESERVATIONS.md](./03-INVENTORY-RESERVATIONS.md) | Система резервирования и корректировок (adjustments) |
| [04-INVENTORY-API.md](./04-INVENTORY-API.md) | REST API reference с примерами запросов |

---

## Быстрый старт

### Основные концепции

1. **Warehouse Inventory** - Центральный склад, откуда товар выдаётся операторам
2. **Operator Inventory** - Персональный запас оператора для пополнения аппаратов
3. **Machine Inventory** - Товары, загруженные в конкретный аппарат
4. **Inventory Movement** - Запись о любом движении товара между уровнями
5. **Inventory Reservation** - Резервирование товара для задачи (предотвращает race conditions)
6. **Inventory Adjustment** - Корректировка остатков с workflow согласования

### Ключевые потоки

```
Поступление товара:
  Поставщик → Warehouse (WAREHOUSE_IN)

Выдача оператору:
  Warehouse → Operator (WAREHOUSE_TO_OPERATOR)

Пополнение аппарата (при завершении задачи REFILL):
  Operator → Machine (OPERATOR_TO_MACHINE)

Продажа:
  Machine → [списание] (MACHINE_SALE)

Возврат на склад:
  Operator → Warehouse (OPERATOR_TO_WAREHOUSE)
  Machine → Operator (MACHINE_TO_OPERATOR)
```

---

## Архитектура модуля

### Структура файлов

```
backend/src/modules/inventory/
├── entities/
│   ├── warehouse-inventory.entity.ts      # Уровень 1 - Склад
│   ├── operator-inventory.entity.ts       # Уровень 2 - Оператор
│   ├── machine-inventory.entity.ts        # Уровень 3 - Автомат
│   ├── inventory-movement.entity.ts       # История движений
│   ├── inventory-reservation.entity.ts    # Резервации
│   ├── inventory-adjustment.entity.ts     # Корректировки
│   ├── inventory-actual-count.entity.ts   # Фактические замеры
│   └── inventory-difference.entity.ts     # Расхождения
├── services/
│   ├── inventory.service.ts               # Основные операции
│   ├── inventory-transfer.service.ts      # Трансферы с блокировками
│   ├── inventory-reservation.service.ts   # Резервирование
│   ├── inventory-adjustment.service.ts    # Корректировки
│   ├── inventory-count.service.ts         # Инвентаризация
│   └── inventory-difference.service.ts    # Расхождения
├── controllers/
│   ├── inventory.controller.ts            # Основной API
│   ├── inventory-adjustments.controller.ts
│   ├── inventory-counts.controller.ts
│   └── inventory-differences.controller.ts
├── dto/
│   ├── warehouse-inventory.dto.ts
│   ├── transfer-inventory.dto.ts
│   ├── machine-inventory.dto.ts
│   ├── inventory-adjustment.dto.ts
│   └── inventory-count.dto.ts
└── inventory.module.ts
```

---

## Ключевые особенности

### 1. Pessimistic Locking

Все трансферы используют `pessimistic_write` блокировку для предотвращения race conditions:

```typescript
const inventory = await manager.findOne(OperatorInventory, {
  where: { operator_id, nomenclature_id },
  lock: { mode: 'pessimistic_write' },
});
```

### 2. Система резервирования

При создании задачи товар резервируется, чтобы гарантировать его наличие при выполнении:

```
Создание задачи → createReservation()
Завершение задачи → fulfillReservation()
Отмена задачи → cancelReservation()
```

### 3. Workflow корректировок

```
PENDING → APPROVED → APPLIED
      ↓
   REJECTED/CANCELLED
```

### 4. Интеграция с задачами

Модуль тесно интегрирован с системой задач:
- `REFILL` задачи вызывают `transferOperatorToMachine`
- `COLLECTION` задачи регистрируют финансы
- Резервации привязаны к задачам

---

## Типы движений (MovementType)

| Тип | Направление | Описание |
|-----|-------------|----------|
| `WAREHOUSE_IN` | → Warehouse | Поступление на склад |
| `WAREHOUSE_OUT` | Warehouse → | Списание со склада |
| `WAREHOUSE_TO_OPERATOR` | Warehouse → Operator | Выдача оператору |
| `OPERATOR_TO_WAREHOUSE` | Operator → Warehouse | Возврат на склад |
| `OPERATOR_TO_MACHINE` | Operator → Machine | Загрузка в аппарат |
| `MACHINE_TO_OPERATOR` | Machine → Operator | Изъятие из аппарата |
| `MACHINE_SALE` | Machine → | Продажа |
| `ADJUSTMENT` | - | Корректировка |
| `WRITE_OFF` | - | Списание |

---

## API Endpoints

### Inventory Controller

| Method | Path | Описание |
|--------|------|----------|
| GET | `/inventory/warehouse` | Весь инвентарь склада |
| GET | `/inventory/warehouse/low-stock` | Товары с низким запасом |
| POST | `/inventory/warehouse/add` | Поступление на склад |
| POST | `/inventory/warehouse/remove` | Списание со склада |
| GET | `/inventory/operator/:id` | Инвентарь оператора |
| GET | `/inventory/machine/:id` | Инвентарь аппарата |
| GET | `/inventory/machines/low-stock` | Аппараты с низким запасом |
| POST | `/inventory/transfer/warehouse-to-operator` | Выдать оператору |
| POST | `/inventory/transfer/operator-to-machine` | Пополнить аппарат |
| GET | `/inventory/movements` | История движений |
| GET | `/inventory/reservations/active` | Активные резервации |

### Adjustments Controller

| Method | Path | Описание |
|--------|------|----------|
| POST | `/inventory-adjustments` | Создать корректировку |
| GET | `/inventory-adjustments` | Список корректировок |
| PATCH | `/inventory-adjustments/:id/approve` | Одобрить/отклонить |
| POST | `/inventory-adjustments/:id/apply` | Применить корректировку |

### Counts Controller

| Method | Path | Описание |
|--------|------|----------|
| POST | `/inventory-counts` | Создать замер |
| POST | `/inventory-counts/batch` | Массовая инвентаризация |
| GET | `/inventory-counts/sessions` | Список сессий |
| GET | `/inventory-counts/report/:sessionId` | Отчёт по инвентаризации |

---

## Связанные модули

- **Tasks** - Задачи вызывают трансферы при завершении
- **Nomenclature** - Справочник товаров/ингредиентов
- **Machines** - Аппараты с инвентарём
- **Users** - Операторы с персональным запасом
- **Transactions** - Финансовые операции при продажах

---

## Требования (Requirements)

| REQ ID | Описание |
|--------|----------|
| REQ-STK-01 | 3-уровневая система учёта |
| REQ-STK-02 | Трансферы между уровнями |
| REQ-STK-03 | История всех движений |
| REQ-STK-04 | Резервирование для задач |
| REQ-STK-ADJ-01 | Корректировки остатков |
| REQ-STK-ADJ-02 | Workflow согласования |
| REQ-STK-CALC-01 | Расчёт расхождений |
| REQ-STK-CALC-02 | Фактические замеры |

---

## См. также

- [Tasks Documentation](../tasks/README.md) - Система задач
- [Machines Documentation](../machines/README.md) - Управление аппаратами
- [CLAUDE.md](../../CLAUDE.md) - Общие правила разработки
