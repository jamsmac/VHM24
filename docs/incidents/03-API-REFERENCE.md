# Incidents & Complaints API Reference

> **Base URLs**: `/api/incidents`, `/api/complaints`
> **Версия**: 1.0.0

---

## Аутентификация

Большинство endpoints требуют JWT токен:

```http
Authorization: Bearer <access_token>
```

Исключения (публичные):
- `POST /complaints` - создание жалобы
- `POST /complaints/public/qr` - создание через QR-код

---

## Incidents API

### Создать инцидент

```http
POST /incidents
Authorization: Bearer <token>

{
  "incident_type": "technical_failure",
  "machine_id": "uuid",
  "title": "Не работает купюроприёмник",
  "description": "Аппарат не принимает купюры",
  "priority": "high",
  "reported_by_user_id": "uuid"
}
```

**Роли**: Admin, Manager, SuperAdmin

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "incident_type": "technical_failure",
  "status": "open",
  "priority": "high",
  "title": "Не работает купюроприёмник",
  "reported_at": "2024-12-20T10:00:00Z"
}
```

---

### Получить список инцидентов

```http
GET /incidents
Authorization: Bearer <token>
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| status | enum | open, in_progress, resolved, closed |
| type | enum | technical_failure, out_of_stock, etc. |
| machineId | uuid | Фильтр по аппарату |
| priority | enum | low, medium, high, critical |
| assignedToUserId | uuid | Фильтр по исполнителю |

**Response:** `200 OK` - массив инцидентов

---

### Получить статистику

```http
GET /incidents/stats
Authorization: Bearer <token>
```

**Response:** `200 OK`
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

---

### Критические инциденты

```http
GET /incidents/critical
Authorization: Bearer <token>
```

Возвращает открытые инциденты с приоритетом CRITICAL.

---

### Получить инцидент по ID

```http
GET /incidents/:id
Authorization: Bearer <token>
```

**Response:** `200 OK` или `404 Not Found`

---

### Обновить инцидент

```http
PATCH /incidents/:id
Authorization: Bearer <token>

{
  "priority": "critical",
  "description": "Дополнительные детали..."
}
```

**Роли**: Admin, Manager, SuperAdmin

---

### Назначить исполнителя

```http
POST /incidents/:id/assign
Authorization: Bearer <token>

{
  "userId": "uuid"
}
```

**Роли**: Admin, Manager, SuperAdmin

Автоматически меняет статус на `IN_PROGRESS`.

---

### Решить инцидент

```http
POST /incidents/:id/resolve
Authorization: Bearer <token>

{
  "resolution_notes": "Заменён модуль купюроприёмника",
  "repair_cost": 150000,
  "repair_task_id": "uuid"
}
```

**Роли**: Admin, Manager, SuperAdmin

---

### Закрыть инцидент

```http
POST /incidents/:id/close
Authorization: Bearer <token>
```

**Роли**: Admin, Manager, SuperAdmin

Только для инцидентов в статусе `RESOLVED`.

---

### Переоткрыть инцидент

```http
POST /incidents/:id/reopen
Authorization: Bearer <token>

{
  "reason": "Проблема повторилась"
}
```

**Роли**: Admin, Manager, SuperAdmin

Только для закрытых инцидентов.

---

### Удалить инцидент

```http
DELETE /incidents/:id
Authorization: Bearer <token>
```

**Роли**: Admin, Manager, SuperAdmin

**Response:** `204 No Content`

---

## Complaints API

### Создать жалобу (публичный)

```http
POST /complaints

{
  "machine_id": "uuid",
  "complaint_type": "product_not_dispensed",
  "description": "Заплатил за кофе, но ничего не получил",
  "customer_name": "Иван Иванов",
  "customer_phone": "+998901234567"
}
```

**Rate Limit**: 10 запросов/минуту

**Response:** `201 Created`

---

### Создать жалобу через QR-код (публичный)

```http
POST /complaints/public/qr

{
  "qr_code": "QR-M7K3F92A8B1C",
  "complaint_type": "product_not_dispensed",
  "description": "Заплатил за кофе, но ничего не получил",
  "customer_name": "Иван Иванов",
  "customer_phone": "+998901234567",
  "rating": 1
}
```

**Rate Limit**: 10 запросов/минуту

**Response:** `201 Created` или `404 Not Found` (QR-код не найден)

---

### Получить список жалоб

```http
GET /complaints
Authorization: Bearer <token>
```

**Query Parameters:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| status | enum | new, in_review, resolved, rejected |
| type | enum | product_quality, no_change, etc. |
| machineId | uuid | Фильтр по аппарату |

---

### Получить статистику

```http
GET /complaints/stats
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "total": 250,
  "by_status": [
    { "status": "new", "count": 15 },
    { "status": "in_review", "count": 5 },
    { "status": "resolved", "count": 200 },
    { "status": "rejected", "count": 30 }
  ],
  "by_type": [
    { "type": "product_not_dispensed", "count": 70 },
    { "type": "no_change", "count": 60 }
  ],
  "avg_resolution_time_hours": 2.5,
  "total_refunds": 5000000,
  "avg_rating": 2.3
}
```

---

### Новые жалобы

```http
GET /complaints/new
Authorization: Bearer <token>
```

Возвращает жалобы в статусе NEW.

---

### Получить жалобу по ID

```http
GET /complaints/:id
Authorization: Bearer <token>
```

---

### Взять в обработку

```http
POST /complaints/:id/take
Authorization: Bearer <token>
```

Текущий пользователь становится обработчиком.

---

### Решить жалобу

```http
POST /complaints/:id/resolve
Authorization: Bearer <token>

{
  "response": "Приносим извинения. Возврат выполнен.",
  "refund_amount": 15000,
  "refund_transaction_id": "uuid"
}
```

---

### Отклонить жалобу

```http
POST /complaints/:id/reject
Authorization: Bearer <token>

{
  "reason": "Невозможно подтвердить факт оплаты"
}
```

---

### Удалить жалобу

```http
DELETE /complaints/:id
Authorization: Bearer <token>
```

**Роли**: Admin, Manager

**Response:** `204 No Content`

---

## Коды ошибок

| HTTP | Описание |
|------|----------|
| 400 | Bad Request - невалидные данные или недопустимое действие |
| 401 | Unauthorized - требуется авторизация |
| 403 | Forbidden - недостаточно прав |
| 404 | Not Found - ресурс не найден |
| 429 | Too Many Requests - превышен лимит запросов |

### Примеры ошибок

```json
// 400 - Недопустимое действие
{
  "statusCode": 400,
  "message": "Можно назначить только открытые инциденты",
  "error": "Bad Request"
}

// 404 - QR-код не найден
{
  "statusCode": 404,
  "message": "Machine with QR code QR-XXX not found",
  "error": "Not Found"
}

// 429 - Превышен лимит
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Enums Reference

### IncidentType
```
technical_failure, out_of_stock, cash_full,
cash_discrepancy, vandalism, power_outage, other
```

### IncidentStatus
```
open, in_progress, resolved, closed
```

### IncidentPriority
```
low, medium, high, critical
```

### ComplaintType
```
product_quality, no_change, product_not_dispensed,
machine_dirty, other
```

### ComplaintStatus
```
new, in_review, resolved, rejected
```
