# Inventory API Reference

> **Модуль**: `backend/src/modules/inventory/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20
> **Base URL**: `/api/inventory`

---

## Содержание

1. [Общая информация](#общая-информация)
2. [Аутентификация и авторизация](#аутентификация-и-авторизация)
3. [Warehouse Inventory API](#warehouse-inventory-api)
4. [Operator Inventory API](#operator-inventory-api)
5. [Machine Inventory API](#machine-inventory-api)
6. [Transfer API](#transfer-api)
7. [Movements API](#movements-api)
8. [Reservations API](#reservations-api)
9. [Adjustments API](#adjustments-api)
10. [Inventory Counts API](#inventory-counts-api)
11. [Коды ошибок](#коды-ошибок)
12. [Примеры использования](#примеры-использования)

---

## Общая информация

### Контроллеры

| Контроллер | Base Path | Описание |
|------------|-----------|----------|
| `InventoryController` | `/api/inventory` | Основные операции с инвентарём |
| `InventoryAdjustmentsController` | `/api/inventory-adjustments` | Корректировки остатков |
| `InventoryCountsController` | `/api/inventory-counts` | Фактические замеры (инвентаризация) |

### Swagger документация

```
GET /api/docs
```

---

## Аутентификация и авторизация

### Заголовки

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Роли и права доступа

| Роль | Чтение | Трансферы | Корректировки | Одобрение |
|------|--------|-----------|---------------|-----------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ✅ | ✅ | ✅ | ✅ |
| OPERATOR | ✅ (свой) | ❌ | Создание | ❌ |

---

## Warehouse Inventory API

### GET /inventory/warehouse

Получить весь инвентарь склада.

**Требуемые роли**: любая авторизованная

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "id": "uuid",
      "name": "Кофе Арабика 1кг",
      "sku": "COFFEE-001",
      "unit_of_measure": "kg"
    },
    "current_quantity": 150.5,
    "reserved_quantity": 20.0,
    "min_stock_level": 50.0,
    "max_stock_level": 300.0,
    "last_replenishment_at": "2025-12-15T10:00:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-20T12:00:00Z"
  }
]
```

### GET /inventory/warehouse/low-stock

Получить товары с низким уровнем запаса (ниже min_stock_level).

**Требуемые роли**: любая авторизованная

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "id": "uuid",
      "name": "Молоко 1л",
      "sku": "MILK-001"
    },
    "current_quantity": 10.0,
    "min_stock_level": 50.0,
    "deficit": 40.0
  }
]
```

### GET /inventory/warehouse/:nomenclatureId

Получить остаток конкретного товара на складе.

**Параметры**:
- `nomenclatureId` (UUID) - ID товара

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "nomenclature": {
    "id": "uuid",
    "name": "Кофе Арабика 1кг",
    "sku": "COFFEE-001"
  },
  "current_quantity": 150.5,
  "reserved_quantity": 20.0,
  "available_quantity": 130.5,
  "min_stock_level": 50.0,
  "max_stock_level": 300.0
}
```

### POST /inventory/warehouse/add

Добавить товар на склад (поступление).

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "nomenclature_id": "uuid",
  "quantity": 100.5,
  "document_number": "ПП-2025-001234",
  "notes": "Поступление от поставщика"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 250.5,
  "reserved_quantity": 20.0,
  "movement": {
    "id": "uuid",
    "movement_type": "warehouse_in",
    "quantity": 100.5,
    "document_number": "ПП-2025-001234"
  }
}
```

### POST /inventory/warehouse/remove

Списать товар со склада.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "nomenclature_id": "uuid",
  "quantity": 5.0,
  "reason": "expiry",
  "notes": "Просроченный товар"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 145.5,
  "movement": {
    "id": "uuid",
    "movement_type": "warehouse_out",
    "quantity": -5.0,
    "notes": "Списание: Просроченный товар"
  }
}
```

### PATCH /inventory/warehouse/:nomenclatureId

Обновить настройки складского инвентаря.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "min_stock_level": 100.0,
  "max_stock_level": 500.0
}
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "min_stock_level": 100.0,
  "max_stock_level": 500.0
}
```

---

## Operator Inventory API

### GET /inventory/operator/:operatorId

Получить весь инвентарь оператора.

**Параметры**:
- `operatorId` (UUID) - ID оператора

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "operator_id": "uuid",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "id": "uuid",
      "name": "Кофе Арабика 1кг",
      "sku": "COFFEE-001"
    },
    "current_quantity": 25.5,
    "reserved_quantity": 10.0,
    "available_quantity": 15.5,
    "updated_at": "2025-12-20T12:00:00Z"
  }
]
```

### GET /inventory/operator/:operatorId/:nomenclatureId

Получить остаток конкретного товара у оператора.

**Параметры**:
- `operatorId` (UUID) - ID оператора
- `nomenclatureId` (UUID) - ID товара

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "operator_id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 25.5,
  "reserved_quantity": 10.0,
  "available_quantity": 15.5
}
```

---

## Machine Inventory API

### GET /inventory/machine/:machineId

Получить весь инвентарь аппарата.

**Параметры**:
- `machineId` (UUID) - ID аппарата

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "machine_id": "uuid",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "id": "uuid",
      "name": "Кофе Арабика 1кг",
      "sku": "COFFEE-001"
    },
    "current_quantity": 5.0,
    "min_stock_level": 2.0,
    "max_capacity": 10.0,
    "slot_number": "A1",
    "is_low_stock": false,
    "updated_at": "2025-12-20T12:00:00Z"
  }
]
```

### GET /inventory/machine/:machineId/:nomenclatureId

Получить остаток конкретного товара в аппарате.

**Параметры**:
- `machineId` (UUID) - ID аппарата
- `nomenclatureId` (UUID) - ID товара

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "machine_id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 5.0,
  "min_stock_level": 2.0,
  "max_capacity": 10.0,
  "fill_percentage": 50.0
}
```

### GET /inventory/machines/low-stock

Получить все позиции с низким уровнем запаса во всех аппаратах.

**Response** `200 OK`:
```json
[
  {
    "machine_id": "uuid",
    "machine": {
      "id": "uuid",
      "machine_number": "M-001",
      "name": "Кофе-машина главный офис"
    },
    "nomenclature_id": "uuid",
    "nomenclature": {
      "name": "Молоко 1л"
    },
    "current_quantity": 1.0,
    "min_stock_level": 3.0,
    "deficit": 2.0
  }
]
```

### PATCH /inventory/machine/:machineId/:nomenclatureId

Обновить настройки инвентаря аппарата.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "min_stock_level": 5.0,
  "max_capacity": 20.0,
  "slot_number": "B2"
}
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "machine_id": "uuid",
  "nomenclature_id": "uuid",
  "min_stock_level": 5.0,
  "max_capacity": 20.0,
  "slot_number": "B2"
}
```

### POST /inventory/machine/:machineId/:nomenclatureId/adjust

Корректировка инвентаря аппарата (инвентаризация).

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "actual_quantity": 3.0,
  "reason": "inventory_difference",
  "notes": "Фактический замер при инвентаризации"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "machine_id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 3.0,
  "previous_quantity": 5.0,
  "adjustment": -2.0,
  "movement": {
    "id": "uuid",
    "movement_type": "adjustment",
    "quantity": -2.0
  }
}
```

### POST /inventory/sale

Зарегистрировать продажу (расход ингредиента).

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "machine_id": "uuid",
  "nomenclature_id": "uuid",
  "quantity": 0.5,
  "transaction_id": "uuid"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "machine_id": "uuid",
  "nomenclature_id": "uuid",
  "current_quantity": 4.5,
  "movement": {
    "id": "uuid",
    "movement_type": "machine_sale",
    "quantity": -0.5
  }
}
```

---

## Transfer API

### POST /inventory/transfer/warehouse-to-operator

Выдать товар оператору со склада.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "operator_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 10.0
    },
    {
      "nomenclature_id": "uuid",
      "quantity": 5.0
    }
  ],
  "notes": "Выдача на неделю"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "transfers": [
    {
      "nomenclature_id": "uuid",
      "quantity": 10.0,
      "warehouse_remaining": 140.5,
      "operator_new_balance": 35.5
    }
  ],
  "movements": [
    {
      "id": "uuid",
      "movement_type": "warehouse_to_operator",
      "quantity": 10.0
    }
  ]
}
```

### POST /inventory/transfer/operator-to-warehouse

Вернуть товар на склад от оператора.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "operator_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 5.0
    }
  ],
  "reason": "excess",
  "notes": "Возврат неиспользованного товара"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "transfers": [
    {
      "nomenclature_id": "uuid",
      "quantity": 5.0,
      "operator_remaining": 20.5,
      "warehouse_new_balance": 155.5
    }
  ]
}
```

### POST /inventory/transfer/operator-to-machine

Пополнить аппарат товаром от оператора.

> **Примечание**: Обычно вызывается автоматически при завершении задачи REFILL.

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "operator_id": "uuid",
  "machine_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 5.0
    }
  ],
  "task_id": "uuid"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "transfers": [
    {
      "nomenclature_id": "uuid",
      "quantity": 5.0,
      "operator_remaining": 15.5,
      "machine_new_balance": 10.0
    }
  ]
}
```

### POST /inventory/transfer/machine-to-operator

Изъять товар из аппарата (брак, просрочка).

**Требуемые роли**: ADMIN, MANAGER, SUPER_ADMIN

**Request Body**:
```json
{
  "operator_id": "uuid",
  "machine_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 2.0
    }
  ],
  "reason": "damaged",
  "notes": "Повреждённые товары"
}
```

**Response** `201 Created`:
```json
{
  "success": true,
  "transfers": [
    {
      "nomenclature_id": "uuid",
      "quantity": 2.0,
      "machine_remaining": 3.0,
      "operator_new_balance": 17.5
    }
  ]
}
```

---

## Movements API

### GET /inventory/movements

Получить историю движений инвентаря с фильтрацией.

**Query параметры**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `movementType` | enum | Тип движения (см. MovementType) |
| `nomenclatureId` | UUID | Фильтр по товару |
| `machineId` | UUID | Фильтр по аппарату |
| `operatorId` | UUID | Фильтр по оператору |
| `dateFrom` | ISO8601 | Начальная дата |
| `dateTo` | ISO8601 | Конечная дата |

**MovementType enum**:
- `warehouse_in` - Поступление на склад
- `warehouse_out` - Списание со склада
- `warehouse_to_operator` - Выдача оператору
- `operator_to_warehouse` - Возврат на склад
- `operator_to_machine` - Загрузка в аппарат
- `machine_to_operator` - Изъятие из аппарата
- `machine_sale` - Продажа
- `adjustment` - Корректировка
- `write_off` - Списание
- `warehouse_reservation` - Резервирование
- `warehouse_reservation_release` - Освобождение резервации

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "movement_type": "warehouse_to_operator",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "name": "Кофе Арабика 1кг"
    },
    "quantity": 10.0,
    "operator_id": "uuid",
    "operator": {
      "first_name": "Иван",
      "last_name": "Петров"
    },
    "machine_id": null,
    "task_id": null,
    "document_number": null,
    "notes": "Выдача на неделю",
    "created_by_id": "uuid",
    "operation_date": "2025-12-20T10:00:00Z",
    "created_at": "2025-12-20T10:00:00Z"
  }
]
```

### GET /inventory/movements/stats

Получить статистику движений.

**Query параметры**:
- `dateFrom` (ISO8601) - Начальная дата
- `dateTo` (ISO8601) - Конечная дата

**Response** `200 OK`:
```json
{
  "period": {
    "from": "2025-12-01T00:00:00Z",
    "to": "2025-12-20T23:59:59Z"
  },
  "by_type": {
    "warehouse_in": {
      "count": 15,
      "total_quantity": 500.0
    },
    "warehouse_to_operator": {
      "count": 45,
      "total_quantity": 320.0
    },
    "operator_to_machine": {
      "count": 120,
      "total_quantity": 280.0
    },
    "machine_sale": {
      "count": 1500,
      "total_quantity": 250.0
    }
  },
  "top_items": [
    {
      "nomenclature_id": "uuid",
      "nomenclature_name": "Кофе Арабика 1кг",
      "movements_count": 89,
      "total_quantity": 150.0
    }
  ]
}
```

---

## Reservations API

### GET /inventory/reservations/active

Получить все активные резервации.

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "reservation_number": "RSV-1703068800000-0042",
    "task_id": "uuid",
    "nomenclature_id": "uuid",
    "nomenclature": {
      "name": "Кофе Арабика 1кг"
    },
    "quantity_reserved": 10.0,
    "quantity_fulfilled": 0,
    "status": "pending",
    "inventory_level": "operator",
    "reference_id": "uuid",
    "reserved_at": "2025-12-20T08:00:00Z",
    "expires_at": "2025-12-21T08:00:00Z"
  }
]
```

### GET /inventory/reservations/task/:taskId

Получить резервации для конкретной задачи.

**Параметры**:
- `taskId` (UUID) - ID задачи

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "reservation_number": "RSV-1703068800000-0042",
    "task_id": "uuid",
    "nomenclature_id": "uuid",
    "quantity_reserved": 10.0,
    "quantity_fulfilled": 0,
    "status": "pending",
    "inventory_level": "operator",
    "reference_id": "uuid"
  }
]
```

### GET /inventory/reservations/operator/:operatorId

Получить резервации оператора.

**Параметры**:
- `operatorId` (UUID) - ID оператора

**Response** `200 OK`:
```json
[
  {
    "id": "uuid",
    "reservation_number": "RSV-1703068800000-0042",
    "task_id": "uuid",
    "quantity_reserved": 10.0,
    "status": "pending"
  }
]
```

---

## Adjustments API

**Base Path**: `/api/inventory-adjustments`

### POST /inventory-adjustments

Создать корректировку остатков.

**Требуемые роли**: ADMIN, MANAGER, OPERATOR

**Request Body**:
```json
{
  "nomenclature_id": "uuid",
  "level_type": "machine",
  "level_ref_id": "uuid",
  "new_quantity": 5.0,
  "reason": "inventory_difference",
  "comment": "Расхождение при инвентаризации",
  "requires_approval": true
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "level_type": "machine",
  "level_ref_id": "uuid",
  "old_quantity": 8.0,
  "new_quantity": 5.0,
  "adjustment_quantity": -3.0,
  "reason": "inventory_difference",
  "status": "pending",
  "requires_approval": true,
  "created_by_user_id": "uuid",
  "created_at": "2025-12-20T10:00:00Z"
}
```

### GET /inventory-adjustments

Получить список корректировок с фильтрацией.

**Query параметры**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | enum | pending, approved, rejected, applied, cancelled |
| `level_type` | enum | warehouse, operator, machine |
| `level_ref_id` | UUID | ID объекта уровня |
| `nomenclature_id` | UUID | ID товара |
| `reason` | enum | Причина корректировки |
| `date_from` | ISO8601 | Начальная дата |
| `date_to` | ISO8601 | Конечная дата |
| `limit` | number | Лимит записей (default: 50) |
| `offset` | number | Смещение (default: 0) |

**Response** `200 OK`:
```json
{
  "items": [
    {
      "id": "uuid",
      "nomenclature": {
        "id": "uuid",
        "name": "Кофе Арабика 1кг"
      },
      "level_type": "machine",
      "level_ref_id": "uuid",
      "old_quantity": 8.0,
      "new_quantity": 5.0,
      "adjustment_quantity": -3.0,
      "reason": "inventory_difference",
      "status": "pending",
      "created_by": {
        "id": "uuid",
        "first_name": "Иван"
      },
      "created_at": "2025-12-20T10:00:00Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

### GET /inventory-adjustments/:id

Получить корректировку по ID.

**Параметры**:
- `id` (UUID) - ID корректировки

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "nomenclature": {
    "id": "uuid",
    "name": "Кофе Арабика 1кг"
  },
  "level_type": "machine",
  "level_ref_id": "uuid",
  "old_quantity": 8.0,
  "new_quantity": 5.0,
  "adjustment_quantity": -3.0,
  "reason": "inventory_difference",
  "comment": "Расхождение при инвентаризации",
  "status": "pending",
  "requires_approval": true,
  "created_by_user_id": "uuid",
  "created_by": {
    "id": "uuid",
    "first_name": "Иван",
    "last_name": "Петров"
  },
  "approved_by_user_id": null,
  "approved_at": null,
  "applied_at": null,
  "created_at": "2025-12-20T10:00:00Z"
}
```

### PATCH /inventory-adjustments/:id/approve

Одобрить или отклонить корректировку.

**Требуемые роли**: ADMIN, MANAGER

**Request Body**:
```json
{
  "approved": true,
  "comment": "Подтверждаю корректировку"
}
```

или для отклонения:

```json
{
  "approved": false,
  "comment": "Требуется повторная проверка"
}
```

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "status": "approved",
  "approved_by_user_id": "uuid",
  "approved_at": "2025-12-20T12:00:00Z"
}
```

### POST /inventory-adjustments/:id/apply

Применить одобренную корректировку к остаткам.

**Требуемые роли**: ADMIN, MANAGER

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "status": "applied",
  "applied_at": "2025-12-20T12:05:00Z",
  "movement": {
    "id": "uuid",
    "movement_type": "adjustment",
    "quantity": -3.0
  }
}
```

### DELETE /inventory-adjustments/:id

Отменить корректировку (только для статуса pending).

**Требуемые роли**: ADMIN, MANAGER

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "status": "cancelled"
}
```

### GET /inventory-adjustments/pending/count

Получить количество ожидающих согласования корректировок.

**Требуемые роли**: ADMIN, MANAGER

**Response** `200 OK`:
```json
{
  "count": 5
}
```

---

## Inventory Counts API

**Base Path**: `/api/inventory-counts`

### POST /inventory-counts

Создать фактический замер.

**Требуемые роли**: ADMIN, MANAGER, OPERATOR

**Request Body**:
```json
{
  "nomenclature_id": "uuid",
  "level_type": "machine",
  "level_ref_id": "uuid",
  "actual_quantity": 5.0,
  "notes": "Замер при инвентаризации"
}
```

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "nomenclature_id": "uuid",
  "level_type": "machine",
  "level_ref_id": "uuid",
  "expected_quantity": 8.0,
  "actual_quantity": 5.0,
  "difference": -3.0,
  "counted_by_user_id": "uuid",
  "session_id": "uuid",
  "counted_at": "2025-12-20T10:00:00Z"
}
```

### POST /inventory-counts/batch

Массовая инвентаризация (много товаров).

**Требуемые роли**: ADMIN, MANAGER, OPERATOR

**Request Body**:
```json
{
  "level_type": "machine",
  "level_ref_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "actual_quantity": 5.0
    },
    {
      "nomenclature_id": "uuid",
      "actual_quantity": 3.0
    }
  ],
  "notes": "Плановая инвентаризация"
}
```

**Response** `201 Created`:
```json
{
  "session_id": "uuid",
  "counts": [
    {
      "id": "uuid",
      "nomenclature_id": "uuid",
      "expected_quantity": 8.0,
      "actual_quantity": 5.0,
      "difference": -3.0
    },
    {
      "id": "uuid",
      "nomenclature_id": "uuid",
      "expected_quantity": 5.0,
      "actual_quantity": 3.0,
      "difference": -2.0
    }
  ],
  "summary": {
    "total_items": 2,
    "items_with_difference": 2,
    "total_difference": -5.0
  }
}
```

### GET /inventory-counts

Получить фактические замеры с фильтрацией.

**Query параметры**:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `level_type` | enum | warehouse, operator, machine |
| `level_ref_id` | UUID | ID объекта уровня |
| `nomenclature_id` | UUID | ID товара |
| `session_id` | UUID | ID сессии инвентаризации |
| `date_from` | ISO8601 | Начальная дата |
| `date_to` | ISO8601 | Конечная дата |
| `has_difference` | boolean | Только с расхождениями |

**Response** `200 OK`:
```json
{
  "items": [...],
  "total": 50
}
```

### GET /inventory-counts/sessions

Получить список сессий инвентаризации.

**Query параметры**:
- `level_type` - Тип уровня
- `level_ref_id` - ID объекта
- `date_from` - Начальная дата
- `date_to` - Конечная дата

**Response** `200 OK`:
```json
[
  {
    "session_id": "uuid",
    "level_type": "machine",
    "level_ref_id": "uuid",
    "counted_by_user_id": "uuid",
    "counted_by": {
      "first_name": "Иван"
    },
    "started_at": "2025-12-20T10:00:00Z",
    "items_count": 15,
    "items_with_difference": 3
  }
]
```

### GET /inventory-counts/:id

Получить фактический замер по ID.

### GET /inventory-counts/:id/difference

Получить расхождение для фактического замера.

**Response** `200 OK`:
```json
{
  "actual_count_id": "uuid",
  "nomenclature_id": "uuid",
  "expected_quantity": 8.0,
  "actual_quantity": 5.0,
  "difference": -3.0,
  "difference_percentage": -37.5,
  "suggested_action": "create_adjustment"
}
```

### GET /inventory-counts/report/:sessionId

Получить детальный отчёт по инвентаризации.

**Response** `200 OK`:
```json
{
  "session_id": "uuid",
  "level_type": "machine",
  "level_ref_id": "uuid",
  "machine": {
    "id": "uuid",
    "machine_number": "M-001",
    "name": "Кофе-машина главный офис"
  },
  "counted_by": {
    "id": "uuid",
    "full_name": "Иван Петров"
  },
  "started_at": "2025-12-20T10:00:00Z",
  "completed_at": "2025-12-20T10:30:00Z",
  "items": [
    {
      "nomenclature_id": "uuid",
      "nomenclature_name": "Кофе Арабика 1кг",
      "expected": 8.0,
      "actual": 5.0,
      "difference": -3.0,
      "unit": "kg"
    }
  ],
  "summary": {
    "total_items": 15,
    "items_ok": 12,
    "items_shortage": 2,
    "items_surplus": 1,
    "total_shortage_value": 150.0,
    "total_surplus_value": 25.0
  }
}
```

---

## Коды ошибок

### HTTP статусы

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Ошибка валидации / бизнес-логики |
| 401 | Не авторизован |
| 403 | Доступ запрещён (роль) |
| 404 | Ресурс не найден |
| 409 | Конфликт (напр., недостаточно товара) |
| 500 | Внутренняя ошибка сервера |

### Типичные ошибки

```json
// 400 Bad Request - Недостаточно товара
{
  "statusCode": 400,
  "message": "Недостаточно товара COFFEE-001. Доступно: 10, требуется: 15",
  "error": "Bad Request"
}

// 404 Not Found - Товар не найден
{
  "statusCode": 404,
  "message": "Warehouse inventory for nomenclature uuid not found",
  "error": "Not Found"
}

// 409 Conflict - Резервация уже существует
{
  "statusCode": 409,
  "message": "Reservation already exists for this task and item",
  "error": "Conflict"
}
```

---

## Примеры использования

### Сценарий: Полный цикл пополнения

```bash
# 1. Проверить остатки на складе
curl -X GET "https://api.vendhub.com/api/inventory/warehouse" \
  -H "Authorization: Bearer $TOKEN"

# 2. Выдать товар оператору
curl -X POST "https://api.vendhub.com/api/inventory/transfer/warehouse-to-operator" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operator_id": "operator-uuid",
    "items": [
      {"nomenclature_id": "coffee-uuid", "quantity": 20}
    ]
  }'

# 3. Проверить инвентарь оператора
curl -X GET "https://api.vendhub.com/api/inventory/operator/operator-uuid" \
  -H "Authorization: Bearer $TOKEN"

# 4. После завершения задачи товар автоматически перейдёт в аппарат
# (POST /api/tasks/:id/complete вызывает transfer/operator-to-machine)

# 5. Проверить инвентарь аппарата
curl -X GET "https://api.vendhub.com/api/inventory/machine/machine-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

### Сценарий: Инвентаризация аппарата

```bash
# 1. Провести массовую инвентаризацию
curl -X POST "https://api.vendhub.com/api/inventory-counts/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level_type": "machine",
    "level_ref_id": "machine-uuid",
    "items": [
      {"nomenclature_id": "coffee-uuid", "actual_quantity": 5},
      {"nomenclature_id": "milk-uuid", "actual_quantity": 3}
    ],
    "notes": "Плановая инвентаризация"
  }'

# 2. Просмотреть расхождения
curl -X GET "https://api.vendhub.com/api/inventory-counts/report/session-uuid" \
  -H "Authorization: Bearer $TOKEN"

# 3. Создать корректировку при расхождении
curl -X POST "https://api.vendhub.com/api/inventory-adjustments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nomenclature_id": "coffee-uuid",
    "level_type": "machine",
    "level_ref_id": "machine-uuid",
    "new_quantity": 5,
    "reason": "inventory_difference",
    "comment": "Расхождение при инвентаризации"
  }'

# 4. Одобрить корректировку
curl -X PATCH "https://api.vendhub.com/api/inventory-adjustments/adjustment-uuid/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'

# 5. Применить корректировку
curl -X POST "https://api.vendhub.com/api/inventory-adjustments/adjustment-uuid/apply" \
  -H "Authorization: Bearer $TOKEN"
```

---

## См. также

- [01-INVENTORY-OVERVIEW.md](./01-INVENTORY-OVERVIEW.md) - Обзор архитектуры
- [02-INVENTORY-TRANSFERS.md](./02-INVENTORY-TRANSFERS.md) - Трансферы и блокировки
- [03-INVENTORY-RESERVATIONS.md](./03-INVENTORY-RESERVATIONS.md) - Система резервирования
- [Swagger UI](http://localhost:3000/api/docs) - Интерактивная документация
