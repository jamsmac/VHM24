# VendHub OS - API Contract

> **Version:** 2.0.0
> **Base URL:** `/api/v1`
> **Authentication:** Bearer JWT Token

## 1. Authentication

### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "email": "operator@vendhub.uz",
  "password": "string"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 604800,
  "user": {
    "id": "uuid",
    "email": "operator@vendhub.uz",
    "name": "Иван Оператор",
    "role": "operator",
    "telegramId": "123456789"
  }
}
```

### POST /auth/telegram
Authenticate via Telegram.

**Request:**
```json
{
  "telegramId": "123456789",
  "initData": "query_id=AAHdF6IQAAA..."  // Optional: Telegram WebApp initData
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### POST /auth/webapp-token
Generate short-lived token for WebApp (called by bot).

**Request:**
```json
{
  "telegramId": "123456789",
  "expiresIn": 7200  // seconds, default 2h
}
```

**Response (200):**
```json
{
  "token": "webapp_abc123...",
  "url": "https://app.vendhub.uz/webapp?token=webapp_abc123...",
  "expiresAt": "2024-12-13T12:00:00Z"
}
```

### POST /auth/refresh
Refresh access token.

### GET /auth/me
Get current user info.

---

## 2. Users

### GET /users
List users (Admin/Manager only).

**Query params:**
- `role` - Filter by role
- `search` - Search by name/email
- `page`, `limit` - Pagination

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@vendhub.uz",
      "name": "Имя Фамилия",
      "phone": "+998901234567",
      "role": "operator",
      "telegramId": "123456789",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActiveAt": "2024-12-13T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

### POST /users
Create user (Admin only).

### GET /users/:id
Get user by ID.

### PATCH /users/:id
Update user.

### DELETE /users/:id
Soft delete user.

### POST /users/:id/assign-role
Assign role to user.

**Request:**
```json
{
  "role": "operator",
  "reason": "Назначен оператором"
}
```

---

## 3. Machines

### GET /machines
List machines.

**Query params:**
- `locationId` - Filter by location
- `status` - Filter by status (active, maintenance, offline)
- `search` - Search by name/serial

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "machineNumber": "M-001",
      "name": "Кофе Автомат 1",
      "serialNumber": "SN123456",
      "model": "Necta Korinto",
      "status": "active",
      "location": {
        "id": "uuid",
        "name": "ТЦ Samarqand Darvoza",
        "address": "ул. Шота Руставели, 1"
      },
      "lastMaintenance": "2024-12-01T00:00:00Z",
      "nextServiceDue": "2024-12-15T00:00:00Z",
      "totalRevenue": 1500000,
      "totalSales": 450
    }
  ],
  "meta": { ... }
}
```

### POST /machines
Create machine.

### GET /machines/:id
Get machine details.

### PATCH /machines/:id
Update machine.

### GET /machines/:id/qr
Get QR code for machine.

**Response (200):**
```json
{
  "qrCode": "data:image/png;base64,...",
  "machineNumber": "M-001"
}
```

### GET /machines/:id/inventory
Get machine inventory levels.

### GET /machines/:id/tasks
Get tasks for machine.

### GET /machines/:id/sales
Get sales history for machine.

---

## 4. Tasks

### GET /tasks
List tasks.

**Query params:**
- `status` - created, assigned, in_progress, completed, cancelled
- `type` - refill, collection, maintenance, repair, cleaning, inspection
- `assignedTo` - User ID
- `machineId` - Machine ID
- `dateFrom`, `dateTo` - Date range
- `priority` - low, normal, urgent

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "refill",
      "status": "assigned",
      "priority": "normal",
      "title": "Пополнение ингредиентов",
      "description": "Пополнить кофе и молоко",
      "machine": {
        "id": "uuid",
        "machineNumber": "M-001",
        "name": "Кофе Автомат 1"
      },
      "assignedTo": {
        "id": "uuid",
        "name": "Иван Оператор"
      },
      "createdBy": {
        "id": "uuid",
        "name": "Менеджер"
      },
      "checklist": [
        {
          "id": "uuid",
          "title": "Проверить уровень кофе",
          "isCompleted": false,
          "photoRequired": true
        }
      ],
      "photoBefore": null,
      "photoAfter": null,
      "dueDate": "2024-12-14T18:00:00Z",
      "createdAt": "2024-12-13T10:00:00Z",
      "completedAt": null
    }
  ],
  "meta": { ... }
}
```

### POST /tasks
Create task.

**Request:**
```json
{
  "type": "refill",
  "machineId": "uuid",
  "assignedTo": "uuid",
  "priority": "normal",
  "title": "Пополнение ингредиентов",
  "description": "Пополнить кофе и молоко",
  "dueDate": "2024-12-14T18:00:00Z",
  "checklist": [
    { "title": "Проверить уровень кофе", "photoRequired": true },
    { "title": "Залить молоко", "photoRequired": true },
    { "title": "Очистить лоток", "photoRequired": false }
  ]
}
```

### GET /tasks/:id
Get task details.

### PATCH /tasks/:id
Update task.

### POST /tasks/:id/accept
Accept assigned task (Operator).

### POST /tasks/:id/start
Start task execution.

### POST /tasks/:id/complete
Complete task.

**Request:**
```json
{
  "comment": "Выполнено без замечаний",
  "inventoryUsed": [
    { "ingredientId": "uuid", "quantity": 2 }
  ]
}
```

### POST /tasks/:id/photo
Upload task photo.

**Request (multipart/form-data):**
- `photo` - Image file
- `type` - "before" | "after" | "checklist"
- `checklistItemId` - Optional, for checklist photos

### POST /tasks/:id/checklist/:itemId/complete
Complete checklist item.

**Request:**
```json
{
  "notes": "Готово",
  "photoUrl": "https://storage.vendhub.uz/photos/abc.jpg"
}
```

---

## 5. Inventory

### GET /inventory
List inventory by level.

**Query params:**
- `level` - warehouse, operator, machine
- `locationId` - For warehouse/machine level
- `userId` - For operator level
- `ingredientId` - Filter by ingredient

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "level": "warehouse",
      "ingredient": {
        "id": "uuid",
        "name": "Кофе в зёрнах",
        "unit": "кг",
        "sku": "COFFEE-001"
      },
      "quantity": 50,
      "minQuantity": 10,
      "location": {
        "id": "uuid",
        "name": "Основной склад"
      },
      "updatedAt": "2024-12-13T10:00:00Z"
    }
  ],
  "meta": { ... }
}
```

### POST /inventory/transfer
Transfer inventory between levels.

**Request:**
```json
{
  "fromLevel": "warehouse",
  "toLevel": "operator",
  "fromLocationId": "uuid",
  "toUserId": "uuid",
  "items": [
    { "ingredientId": "uuid", "quantity": 5 }
  ],
  "notes": "Выдача для маршрута"
}
```

### POST /inventory/adjustment
Adjust inventory (damage, correction, etc.).

**Request:**
```json
{
  "inventoryId": "uuid",
  "adjustmentType": "damage",
  "quantityChange": -2,
  "reason": "Просрочен срок годности",
  "photoUrl": "https://..."
}
```

### GET /inventory/bags
List bags.

### POST /inventory/bags
Create bag.

### POST /inventory/bags/:id/issue
Issue bag to operator.

### POST /inventory/bags/:id/return
Return bag from operator.

---

## 6. Requests (Material Orders)

### GET /requests
List material requests.

**Query params:**
- `status` - new, approved, rejected, sent, completed
- `createdBy` - User ID
- `supplierId` - Supplier ID
- `dateFrom`, `dateTo` - Date range

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "requestNumber": "REQ-2024-001",
      "status": "new",
      "createdBy": {
        "id": "uuid",
        "name": "Оператор"
      },
      "items": [
        {
          "id": "uuid",
          "material": {
            "id": "uuid",
            "name": "Кофе Arabica",
            "unit": "кг"
          },
          "quantity": 10,
          "supplier": {
            "id": "uuid",
            "name": "ООО Поставщик"
          }
        }
      ],
      "totalItems": 3,
      "comment": "Срочно нужно",
      "priority": "urgent",
      "createdAt": "2024-12-13T10:00:00Z",
      "approvedAt": null,
      "approvedBy": null
    }
  ],
  "meta": { ... }
}
```

### POST /requests
Create request.

**Request:**
```json
{
  "items": [
    { "materialId": "uuid", "quantity": 10 },
    { "materialId": "uuid", "quantity": 5 }
  ],
  "priority": "normal",
  "comment": "Для пополнения склада"
}
```

### GET /requests/:id
Get request details.

### POST /requests/:id/approve
Approve request (Manager).

**Request:**
```json
{
  "notes": "Одобрено"
}
```

### POST /requests/:id/reject
Reject request.

**Request:**
```json
{
  "reason": "Недостаточно бюджета"
}
```

### POST /requests/:id/send
Mark as sent to supplier.

### POST /requests/:id/complete
Mark as completed (goods received).

**Request:**
```json
{
  "receivedItems": [
    { "itemId": "uuid", "receivedQuantity": 10 }
  ],
  "notes": "Все получено"
}
```

---

## 7. Sales

### GET /sales
List sales.

**Query params:**
- `machineId` - Filter by machine
- `dateFrom`, `dateTo` - Date range
- `paymentMethod` - cash, card, payme, click, uzum

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "machine": {
        "id": "uuid",
        "machineNumber": "M-001"
      },
      "product": {
        "id": "uuid",
        "name": "Капучино"
      },
      "amount": 15000,
      "paymentMethod": "payme",
      "transactionId": "TXN123456",
      "createdAt": "2024-12-13T10:30:00Z"
    }
  ],
  "meta": { ... }
}
```

### GET /sales/summary
Get sales summary.

**Query params:**
- `machineId` - Optional
- `dateFrom`, `dateTo` - Required

**Response (200):**
```json
{
  "totalRevenue": 5000000,
  "totalSales": 350,
  "averageCheck": 14286,
  "byPaymentMethod": {
    "cash": 2000000,
    "payme": 1500000,
    "click": 1000000,
    "uzum": 500000
  },
  "byMachine": [
    { "machineId": "uuid", "name": "M-001", "revenue": 1200000, "sales": 80 }
  ]
}
```

---

## 8. Payments

### GET /payments
List payment transactions.

### GET /payments/methods
List available payment methods.

**Response (200):**
```json
{
  "data": [
    { "code": "cash", "name": "Наличные", "isActive": true },
    { "code": "payme", "name": "Payme", "isActive": true },
    { "code": "click", "name": "Click", "isActive": true },
    { "code": "uzum", "name": "Uzum", "isActive": true }
  ]
}
```

---

## 9. Files & Imports

### POST /files/upload
Upload file.

**Request (multipart/form-data):**
- `file` - File (CSV, XLSX)
- `type` - "sales_report", "hw_export", "payme", "click", "uzum", "fiscal"

**Response (200):**
```json
{
  "id": "uuid",
  "filename": "sales_2024-12.xlsx",
  "originalName": "report.xlsx",
  "fileType": "sales_report",
  "size": 102400,
  "status": "pending",
  "uploadedAt": "2024-12-13T10:00:00Z"
}
```

### GET /files
List uploaded files.

### GET /files/:id
Get file details and processing status.

**Response (200):**
```json
{
  "id": "uuid",
  "filename": "sales_2024-12.xlsx",
  "status": "completed",
  "totalRows": 1500,
  "processedRows": 1500,
  "newRows": 1200,
  "updatedRows": 300,
  "errorRows": 0,
  "processingTime": 5200,
  "completedAt": "2024-12-13T10:05:00Z"
}
```

### POST /files/:id/process
Start file processing.

### GET /files/:id/errors
Get processing errors.

---

## 10. Reconciliation

### POST /reconciliation/run
Start reconciliation run.

**Request:**
```json
{
  "dateFrom": "2024-12-01",
  "dateTo": "2024-12-13",
  "sources": ["hw", "sales_report", "payme", "click", "uzum"],
  "machineIds": ["uuid", "uuid"],  // Optional, all if empty
  "timeTolerance": 5,  // seconds, default 5
  "amountTolerance": 100  // sum, default 100
}
```

**Response (200):**
```json
{
  "runId": "uuid",
  "status": "started",
  "startedAt": "2024-12-13T10:00:00Z"
}
```

### GET /reconciliation/runs
List reconciliation runs.

### GET /reconciliation/runs/:id
Get run details.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "completed",
  "dateRange": {
    "from": "2024-12-01",
    "to": "2024-12-13"
  },
  "summary": {
    "totalOrders": 5000,
    "matchedOrders": 4800,
    "unmatchedOrders": 200,
    "matchRate": 96.0,
    "scoreDistribution": {
      "6": 3500,
      "5": 800,
      "4": 300,
      "3": 150,
      "2": 50,
      "1": 0
    },
    "totalRevenue": 75000000,
    "matchedRevenue": 72000000,
    "discrepancyAmount": 3000000
  },
  "completedAt": "2024-12-13T10:15:00Z"
}
```

### GET /reconciliation/runs/:id/mismatches
Get mismatches from run.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-123456",
      "machineCode": "M-001",
      "orderTime": "2024-12-13T10:30:00Z",
      "amount": 15000,
      "sources": {
        "hw": { "found": true, "amount": 15000 },
        "sales": { "found": true, "amount": 15000 },
        "payme": { "found": false, "amount": null },
        "click": { "found": false, "amount": null }
      },
      "mismatchType": "payment_not_found",
      "discrepancy": 15000
    }
  ],
  "meta": { ... }
}
```

### GET /reconciliation/runs/:id/export
Export reconciliation results.

**Query params:**
- `format` - csv, xlsx

---

## 11. Reports

### GET /reports/daily
Get daily report.

**Query params:**
- `date` - Date (YYYY-MM-DD)

**Response (200):**
```json
{
  "date": "2024-12-13",
  "revenue": {
    "total": 5000000,
    "cash": 2000000,
    "card": 3000000
  },
  "sales": {
    "total": 350,
    "byMachine": [...]
  },
  "tasks": {
    "created": 15,
    "completed": 12,
    "overdue": 3
  },
  "incidents": {
    "new": 2,
    "resolved": 5
  }
}
```

### GET /reports/period
Get period report.

**Query params:**
- `dateFrom`, `dateTo` - Date range

### POST /reports/export
Generate report export.

**Request:**
```json
{
  "type": "sales",
  "dateFrom": "2024-12-01",
  "dateTo": "2024-12-13",
  "format": "xlsx",
  "filters": {
    "machineIds": ["uuid"]
  }
}
```

**Response (200):**
```json
{
  "exportId": "uuid",
  "status": "generating",
  "estimatedTime": 30
}
```

### GET /reports/exports/:id
Get export status and download URL.

---

## 12. Notifications

### GET /notifications
Get user notifications.

### POST /notifications/mark-read
Mark notifications as read.

### GET /notifications/settings
Get notification settings.

### PATCH /notifications/settings
Update notification settings.

---

## 13. Health & System

### GET /health
Health check.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-12-13T10:00:00Z",
  "version": "2.0.0",
  "services": {
    "database": "ok",
    "redis": "ok",
    "telegram": "ok",
    "storage": "ok"
  }
}
```

### GET /health/ready
Readiness check.

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Business logic error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Authenticated: 300 requests per minute per user
- File uploads: 10 per minute

---

## Pagination

All list endpoints support pagination:

```
GET /resources?page=1&limit=20
```

Response includes `meta`:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

**Document Version:** 2.0.0
**Last Updated:** 2024-12-13
