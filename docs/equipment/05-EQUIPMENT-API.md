# Equipment API Reference

> **Base URL**: `/api/equipment`
> **Версия**: 1.0.0
> **Авторизация**: Bearer JWT Token

---

## Аутентификация

Все endpoints требуют JWT токен:

```http
Authorization: Bearer <access_token>
```

---

## Components - Компоненты

### Создать компонент

```http
POST /equipment/components
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Request Body:**
```json
{
  "component_type": "hopper",
  "name": "Бункер кофе 1.5кг",
  "serial_number": "HOP-2024-001",
  "machine_id": "uuid",
  "expected_lifetime_hours": 5000,
  "maintenance_interval_days": 14,
  "notes": "Установлен новым"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "component_type": "hopper",
  "name": "Бункер кофе 1.5кг",
  "serial_number": "HOP-2024-001",
  "status": "in_stock",
  "current_location_type": "warehouse",
  "created_at": "2024-12-20T10:00:00Z"
}
```

---

### Получить список компонентов

```http
GET /equipment/components
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| machineId | uuid | Фильтр по аппарату |
| componentType | enum | Тип компонента |
| status | enum | Статус компонента |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "component_type": "hopper",
    "name": "Бункер кофе 1.5кг",
    "status": "active",
    "machine": {
      "id": "uuid",
      "machine_number": "M-001",
      "name": "Кофемашина Офис"
    }
  }
]
```

---

### Получить статистику

```http
GET /equipment/components/stats
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| machineId | uuid | Фильтр по аппарату (опционально) |

**Response:** `200 OK`
```json
{
  "total": 150,
  "by_type": [
    { "type": "hopper", "count": 45 },
    { "type": "grinder", "count": 30 },
    { "type": "brewer", "count": 28 }
  ],
  "by_status": [
    { "status": "active", "count": 120 },
    { "status": "in_stock", "count": 20 },
    { "status": "needs_maintenance", "count": 10 }
  ],
  "needing_maintenance": 10
}
```

---

### Компоненты требующие обслуживания

```http
GET /equipment/components/needs-maintenance
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Кофемолка",
    "next_maintenance_date": "2024-12-15",
    "machine": { "machine_number": "M-001" }
  }
]
```

---

### Компоненты близкие к выработке ресурса

```http
GET /equipment/components/nearing-lifetime
```

Возвращает компоненты с `working_hours >= expected_lifetime_hours * 0.9`

---

### Получить компонент по ID

```http
GET /equipment/components/:id
```

**Response:** `200 OK` или `404 Not Found`

---

### Обновить компонент

```http
PATCH /equipment/components/:id
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Request Body:**
```json
{
  "status": "needs_maintenance",
  "notes": "Требуется чистка"
}
```

---

### Заменить компонент

```http
POST /equipment/components/:id/replace
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Request Body:**
```json
{
  "new_component_id": "uuid-нового-компонента",
  "reason": "Износ жерновов"
}
```

**Response:** Новый компонент с обновлённым статусом

---

### Удалить компонент (soft delete)

```http
DELETE /equipment/components/:id
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Response:** `204 No Content`

---

## Component Movements - Перемещения

### Переместить компонент

```http
POST /equipment/components/:id/move
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Request Body:**
```json
{
  "to_location_type": "washing",
  "to_location_ref": "WH-WASH-01",
  "movement_type": "send_to_wash",
  "related_machine_id": "uuid",
  "task_id": "uuid",
  "comment": "Плановая мойка"
}
```

**Response:** `200 OK` - ComponentMovement

---

### Установить в машину

```http
POST /equipment/components/:id/install
```

**Request Body:**
```json
{
  "machine_id": "uuid",
  "task_id": "uuid",
  "comment": "Установка после мойки"
}
```

---

### Снять с машины

```http
POST /equipment/components/:id/remove
```

**Request Body:**
```json
{
  "target_location": "washing",
  "target_location_ref": "WH-WASH-01",
  "task_id": "uuid",
  "comment": "Снятие для мойки"
}
```

---

### История перемещений

```http
GET /equipment/components/:id/movements
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "from_location_type": "warehouse",
    "to_location_type": "machine",
    "movement_type": "install",
    "moved_at": "2024-12-20T10:00:00Z",
    "comment": "Установка нового бункера",
    "performed_by": { "full_name": "Иван Петров" }
  }
]
```

---

### Текущее местоположение

```http
GET /equipment/components/:id/location
```

**Response:** `200 OK`
```json
{
  "component": {
    "id": "uuid",
    "current_location_type": "machine",
    "current_location_ref": "M-001"
  },
  "lastMovement": {
    "movement_type": "install",
    "moved_at": "2024-12-20T10:00:00Z"
  }
}
```

---

## Maintenance - Обслуживание

### Создать запись обслуживания

```http
POST /equipment/maintenance
```

**Роли**: Admin, Manager, SuperAdmin, Technician

**Request Body:**
```json
{
  "component_id": "uuid",
  "maintenance_type": "cleaning",
  "description": "Полная чистка бункера",
  "duration_minutes": 25,
  "labor_cost": 50000,
  "parts_cost": 0,
  "parts_used": [
    {
      "spare_part_id": "uuid",
      "quantity": 1,
      "unit_price": 0
    }
  ],
  "is_successful": true,
  "task_id": "uuid"
}
```

---

### Получить историю обслуживания

```http
GET /equipment/maintenance
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| component_id | uuid | Фильтр по компоненту |
| maintenance_type | enum | Тип обслуживания |
| from_date | date | Начало периода (YYYY-MM-DD) |
| to_date | date | Конец периода |

---

### Статистика обслуживания

```http
GET /equipment/maintenance/stats
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| componentId | uuid | Фильтр по компоненту |
| fromDate | date | Начало периода |
| toDate | date | Конец периода |

**Response:** `200 OK`
```json
{
  "total": 150,
  "by_type": [
    { "type": "cleaning", "count": 80 },
    { "type": "repair", "count": 30 }
  ],
  "total_cost": 5000000,
  "total_labor_cost": 3000000,
  "total_parts_cost": 2000000,
  "avg_duration_minutes": 28,
  "success_rate": 94.5
}
```

---

### История обслуживания компонента

```http
GET /equipment/maintenance/component/:componentId
```

---

### История обслуживания аппарата

```http
GET /equipment/maintenance/machine/:machineId
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| maintenanceType | enum | Фильтр по типу |

---

## Washing Schedules - Графики мойки

### Создать график

```http
POST /equipment/washing-schedules
```

**Request Body:**
```json
{
  "machine_id": "uuid",
  "name": "Ежедневная мойка бункеров",
  "frequency": "daily",
  "interval_days": null,
  "component_types": ["hopper", "mixer"],
  "instructions": "Снять бункеры, промыть...",
  "auto_create_tasks": true,
  "notification_days_before": 0,
  "required_materials": ["Моющее средство"],
  "estimated_duration_minutes": 30
}
```

---

### Получить графики

```http
GET /equipment/washing-schedules
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| machineId | uuid | Фильтр по аппарату |
| is_active | boolean | Только активные |

---

### Обновить график

```http
PATCH /equipment/washing-schedules/:id
```

---

### Отметить мойку выполненной

```http
POST /equipment/washing-schedules/:id/complete
```

**Request Body:**
```json
{
  "task_id": "uuid"
}
```

Автоматически:
- Обновляет `last_wash_date`
- Рассчитывает `next_wash_date`
- Сохраняет `last_washed_by_user_id`

---

### Удалить график

```http
DELETE /equipment/washing-schedules/:id
```

---

## Spare Parts - Запчасти

### Создать запчасть

```http
POST /equipment/spare-parts
```

**Роли**: Admin, Manager

**Request Body:**
```json
{
  "part_number": "GR-BURR-001",
  "name": "Жернова кофемолки 64mm",
  "component_type": "grinder",
  "manufacturer": "Rhea",
  "model_compatibility": "Rhea Vendors",
  "quantity_in_stock": 5,
  "min_stock_level": 2,
  "max_stock_level": 10,
  "unit": "pcs",
  "unit_price": 150000,
  "currency": "UZS",
  "supplier_name": "TechParts",
  "lead_time_days": 14,
  "storage_location": "Склад-1",
  "shelf_number": "A-12"
}
```

---

### Получить список запчастей

```http
GET /equipment/spare-parts
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| component_type | enum | Тип компонента |
| in_stock | boolean | Только в наличии |
| supplier | string | Фильтр по поставщику |

---

### Найти по артикулу

```http
GET /equipment/spare-parts/by-number/:partNumber
```

---

### Обновить запчасть

```http
PATCH /equipment/spare-parts/:id
```

---

### Изменить остаток

```http
PATCH /equipment/spare-parts/:id/stock
```

**Request Body:**
```json
{
  "quantity_change": -2,
  "reason": "Использовано при ремонте"
}
```

---

### Удалить (soft delete)

```http
DELETE /equipment/spare-parts/:id
```

**Роли**: Admin

---

## Hopper Types - Типы бункеров

### Создать тип

```http
POST /equipment/hopper-types
```

**Роли**: Admin, Manager

**Request Body:**
```json
{
  "code": "matcha_powder",
  "name": "Порошок матча",
  "name_en": "Matcha Powder",
  "category": "beverages",
  "requires_refrigeration": false,
  "shelf_life_days": 180,
  "typical_capacity_kg": 0.5,
  "unit_of_measure": "kg"
}
```

---

### Получить список

```http
GET /equipment/hopper-types
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| category | string | Категория (beverages, ingredients) |

---

### Обновить

```http
PATCH /equipment/hopper-types/:id
```

---

### Удалить

```http
DELETE /equipment/hopper-types/:id
```

**Роли**: Admin

---

## Коды ошибок

| HTTP код | Описание |
|----------|----------|
| 400 | Bad Request - невалидные данные или недопустимая операция |
| 401 | Unauthorized - требуется авторизация |
| 403 | Forbidden - недостаточно прав |
| 404 | Not Found - ресурс не найден |
| 409 | Conflict - дублирование (serial_number, part_number) |
| 500 | Internal Server Error |

### Примеры ошибок

```json
// 400 - Невалидное перемещение
{
  "statusCode": 400,
  "message": "Component is already in machine. Cannot move to the same location.",
  "error": "Bad Request"
}

// 404 - Компонент не найден
{
  "statusCode": 404,
  "message": "Component uuid not found",
  "error": "Not Found"
}

// 409 - Дублирование артикула
{
  "statusCode": 409,
  "message": "Spare part with part_number GR-BURR-001 already exists",
  "error": "Conflict"
}
```

---

## Enums Reference

### ComponentType
```
hopper, grinder, brewer, mixer, cooling_unit,
payment_terminal, dispenser, pump, water_filter,
coin_acceptor, bill_acceptor, display, other
```

### ComponentStatus
```
active, in_stock, needs_maintenance, needs_replacement,
in_repair, replaced, retired, broken
```

### ComponentLocationType
```
machine, warehouse, washing, drying, repair
```

### MovementType
```
install, remove, send_to_wash, return_from_wash,
send_to_drying, return_from_drying, move_to_warehouse,
move_to_machine, send_to_repair, return_from_repair
```

### MaintenanceType
```
cleaning, inspection, repair, replacement,
calibration, software_update, preventive, other
```

### WashingFrequency
```
daily, weekly, biweekly, monthly, custom
```
