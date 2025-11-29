# VendHub Manager API Documentation

## Overview

VendHub Manager provides a comprehensive REST API for managing vending machine operations, tasks, inventory, equipment, and analytics.

**Base URL**: `http://localhost:3000/api/v1`
**API Documentation (Swagger)**: `http://localhost:3000/api/docs`

## Authentication

All API endpoints (except public access requests) require JWT authentication.

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@vendhub.local",
  "password": "AdminPassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@vendhub.local",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

### Using the Token

Include the token in the `Authorization` header for all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Core Entities

### Tasks

Tasks are the central mechanism for all vending machine operations.

#### Task Types

- `REFILL` - Пополнение товара
- `COLLECTION` - Инкассация
- `MAINTENANCE` - Техническое обслуживание
- `INSPECTION` - Проверка
- `REPAIR` - Ремонт
- `CLEANING` - Мойка компонента
- `REPLACE_HOPPER` - Замена бункера
- `REPLACE_GRINDER` - Замена гриндера
- `REPLACE_BREWER` - Замена варочной группы
- `REPLACE_MIXER` - Замена миксера

#### Create Task

**Basic Task (Refill):**
```http
POST /api/v1/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "type_code": "REFILL",
  "priority": "NORMAL",
  "machine_id": "machine-uuid",
  "assigned_to_user_id": "operator-uuid",
  "created_by_user_id": "admin-uuid",
  "scheduled_date": "2025-11-21T10:00:00Z",
  "description": "Пополнить кофе и молоко",
  "items": [
    {
      "nomenclature_id": "coffee-uuid",
      "planned_quantity": 10,
      "unit_of_measure_code": "kg"
    },
    {
      "nomenclature_id": "milk-uuid",
      "planned_quantity": 5,
      "unit_of_measure_code": "l"
    }
  ]
}
```

**Component Replacement Task (REPLACE_GRINDER):**
```http
POST /api/v1/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "type_code": "REPLACE_GRINDER",
  "priority": "HIGH",
  "machine_id": "machine-uuid",
  "assigned_to_user_id": "operator-uuid",
  "created_by_user_id": "admin-uuid",
  "scheduled_date": "2025-11-21T14:00:00Z",
  "description": "Replace worn out grinder",
  "components": [
    {
      "component_id": "old-grinder-uuid",
      "role": "OLD",
      "notes": "Worn out after 2 years of operation"
    },
    {
      "component_id": "new-grinder-uuid",
      "role": "NEW",
      "notes": "New grinder from warehouse"
    }
  ]
}
```

**Component Cleaning Task:**
```http
POST /api/v1/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "type_code": "CLEANING",
  "priority": "NORMAL",
  "machine_id": "machine-uuid",
  "assigned_to_user_id": "operator-uuid",
  "created_by_user_id": "admin-uuid",
  "scheduled_date": "2025-11-21T16:00:00Z",
  "description": "Monthly brewer cleaning",
  "components": [
    {
      "component_id": "brewer-uuid",
      "role": "TARGET",
      "notes": "Monthly maintenance cleaning"
    }
  ]
}
```

#### Complete Task

```http
POST /api/v1/tasks/{taskId}/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "completion_notes": "Task completed successfully",
  "actual_cash_amount": 15000,
  "items": [
    {
      "nomenclature_id": "coffee-uuid",
      "actual_quantity": 9.5
    }
  ]
}
```

**Notes:**
- Photos (before/after) must be uploaded separately via `/api/v1/files`
- For offline mode, use `skip_photos: true` and upload photos later
- Component replacement tasks automatically update component locations and statuses

#### List Tasks with Filters

```http
GET /api/v1/tasks?status=IN_PROGRESS&type=REFILL&machineId=machine-uuid
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `POSTPONED`
- `type`: Task type enum
- `machineId`: Filter by machine
- `assignedToUserId`: Filter by operator
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `dateFrom`, `dateTo`: Date range filter

### Equipment & Components

#### List Components

```http
GET /api/v1/equipment/components?machine_id=machine-uuid&status=ACTIVE
Authorization: Bearer {token}
```

**Query Parameters:**
- `machine_id`: Filter by machine
- `status`: `ACTIVE`, `IN_STOCK`, `RETIRED`, `IN_REPAIR`, `NEEDS_MAINTENANCE`
- `component_type`: `GRINDER`, `BREWER`, `HOPPER`, `MIXER`, etc.
- `current_location_type`: `MACHINE`, `WAREHOUSE`, `WASHING`, `DRYING`, `REPAIR`

#### Create Component

```http
POST /api/v1/equipment/components
Authorization: Bearer {token}
Content-Type: application/json

{
  "machine_id": "machine-uuid",
  "component_type": "GRINDER",
  "name": "Coffee Grinder MX-2000",
  "model": "MX-2000",
  "serial_number": "SN123456",
  "manufacturer": "Mazzer",
  "status": "IN_STOCK",
  "current_location_type": "WAREHOUSE",
  "installation_date": "2025-01-15",
  "maintenance_interval_days": 90,
  "expected_lifetime_hours": 10000,
  "warranty_expiration_date": "2027-01-15",
  "notes": "New grinder for machine M-001"
}
```

#### Component Movement Tracking

```http
GET /api/v1/equipment/component-movements?component_id=component-uuid
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "movement-uuid",
    "component_id": "component-uuid",
    "movement_type": "TASK_BASED",
    "from_location": "MACHINE",
    "to_location": "WAREHOUSE",
    "task_id": "task-uuid",
    "performed_by_user_id": "operator-uuid",
    "notes": "Replaced due to wear",
    "created_at": "2025-11-21T10:30:00Z"
  }
]
```

### Analytics

#### Get Metrics with Filters

```http
GET /api/v1/analytics/metrics?start_date=2025-11-01&end_date=2025-11-21&group_by=DAY&metrics=REVENUE,TRANSACTIONS,UNITS_SOLD
Authorization: Bearer {token}
```

**Query Parameters:**
- `start_date`, `end_date`: Date range (ISO 8601)
- `machine_ids[]`: Array of machine IDs
- `location_ids[]`: Array of location IDs
- `metrics[]`: Array of metrics to calculate
  - `REVENUE`
  - `TRANSACTIONS`
  - `UNITS_SOLD`
  - `AVERAGE_TRANSACTION`
  - `UPTIME`
  - `DOWNTIME`
  - `AVAILABILITY`
  - `PROFIT_MARGIN`
- `group_by`: Grouping interval
  - `HOUR`, `DAY`, `WEEK`, `MONTH`
  - `MACHINE`, `LOCATION`, `PRODUCT`

**Response:**
```json
[
  {
    "metric": "REVENUE",
    "value": 450000,
    "previous_value": 420000,
    "change_percent": 7.14,
    "data": [
      {
        "date": "2025-11-01",
        "value": 15000
      },
      {
        "date": "2025-11-02",
        "value": 16500
      }
    ]
  },
  {
    "metric": "TRANSACTIONS",
    "value": 1250,
    "previous_value": 1180,
    "change_percent": 5.93,
    "data": [
      {
        "date": "2025-11-01",
        "value": 42
      }
    ]
  }
]
```

#### Top Machines

```http
GET /api/v1/analytics/top-machines?limit=10&days=30
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "machine_id": "machine-uuid",
    "machine_number": "M-001",
    "machine_name": "Coffee Machine Lobby",
    "location_name": "Main Office - Lobby",
    "revenue": 125000,
    "transaction_count": 350,
    "units_sold": 450
  }
]
```

#### Top Products

```http
GET /api/v1/analytics/top-products?limit=10&days=30
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "product_id": "product-uuid",
    "product_name": "Cappuccino",
    "units_sold": 1250,
    "revenue": 187500,
    "profit": 112500
  }
]
```

#### Machine Status Summary

```http
GET /api/v1/analytics/machine-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total": 50,
  "active": 42,
  "offline": 3,
  "error": 2,
  "maintenance": 2,
  "low_stock": 1
}
```

### Transactions

#### Record Sale

```http
POST /api/v1/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "transaction_type": "SALE",
  "machine_id": "machine-uuid",
  "recipe_id": "cappuccino-recipe-uuid",
  "amount": 150,
  "payment_method": "CARD",
  "transaction_metadata": {
    "card_last4": "1234",
    "terminal_id": "TERM-001"
  }
}
```

**Notes:**
- Automatically deducts recipe ingredients from machine inventory
- Creates incident if inventory deduction fails
- Updates analytics tables

#### Record Collection (Инкассация)

```http
POST /api/v1/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "transaction_type": "COLLECTION",
  "machine_id": "machine-uuid",
  "amount": 15000,
  "payment_method": "CASH",
  "task_id": "collection-task-uuid",
  "transaction_metadata": {
    "collected_by": "operator-name",
    "notes": "Monthly collection"
  }
}
```

### Inventory

#### Get Machine Inventory

```http
GET /api/v1/inventory/machine/{machineId}
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "inventory-uuid",
    "machine_id": "machine-uuid",
    "nomenclature_id": "coffee-uuid",
    "nomenclature": {
      "name": "Arabica Coffee Beans",
      "unit_of_measure_code": "kg"
    },
    "quantity": 8.5,
    "min_quantity": 2.0,
    "max_quantity": 15.0,
    "last_refill_date": "2025-11-20T14:00:00Z",
    "updated_at": "2025-11-21T10:30:00Z"
  }
]
```

#### Transfer Inventory

```http
POST /api/v1/inventory/transfer
Authorization: Bearer {token}
Content-Type: application/json

{
  "from_type": "WAREHOUSE",
  "to_type": "OPERATOR",
  "to_user_id": "operator-uuid",
  "items": [
    {
      "nomenclature_id": "coffee-uuid",
      "quantity": 10,
      "unit_of_measure_code": "kg"
    }
  ],
  "notes": "Transfer for refill task"
}
```

### Files & Photos

#### Upload File

```http
POST /api/v1/files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary data]
entity_type: "task"
entity_id: "task-uuid"
category: "task_photo_before"
```

**Categories:**
- `task_photo_before` - Photo before task execution
- `task_photo_after` - Photo after task execution
- `incident_photo` - Incident documentation
- `machine_photo` - Machine photos
- `component_photo` - Component photos

#### Get Entity Files

```http
GET /api/v1/files?entity_type=task&entity_id=task-uuid
Authorization: Bearer {token}
```

### Incidents

#### Create Incident

```http
POST /api/v1/incidents
Authorization: Bearer {token}
Content-Type: application/json

{
  "incident_type": "OUT_OF_STOCK",
  "priority": "MEDIUM",
  "machine_id": "machine-uuid",
  "title": "Coffee beans out of stock",
  "description": "Machine reports empty coffee hopper",
  "reported_by_user_id": "operator-uuid",
  "metadata": {
    "product_name": "Arabica Coffee",
    "last_refill": "2025-11-15"
  }
}
```

**Incident Types:**
- `TECHNICAL_FAILURE` - Технический сбой
- `OUT_OF_STOCK` - Нехватка товара
- `PAYMENT_ISSUE` - Проблема с оплатой
- `CLEANING_REQUIRED` - Требуется чистка
- `COMPONENT_FAILURE` - Отказ компонента
- `OTHER` - Прочее

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-11-21T10:30:00.000Z",
  "path": "/api/v1/tasks"
}
```

### Common Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Workflow Examples

### Complete Refill Workflow

1. **Create refill task with items**
2. **Operator receives notification**
3. **Operator starts task** - `POST /tasks/{id}/start`
4. **Upload photo before** - `POST /files/upload` with `category: task_photo_before`
5. **Perform refill**
6. **Upload photo after** - `POST /files/upload` with `category: task_photo_after`
7. **Complete task** - `POST /tasks/{id}/complete`
8. **System automatically:**
   - Updates machine inventory
   - Deducts from operator inventory
   - Sends completion notification

### Component Replacement Workflow

1. **Create REPLACE_* task with old and new components**
2. **Operator starts task** - `POST /tasks/{id}/start`
3. **System automatically moves:**
   - Old component: `MACHINE` → `WASHING` (status → `IN_REPAIR`)
   - New component: stays in `WAREHOUSE`
4. **Upload photos before/after**
5. **Complete task** - `POST /tasks/{id}/complete`
6. **System automatically:**
   - Moves old component: `WASHING` → `WAREHOUSE` (status → `RETIRED`)
   - Moves new component: `WAREHOUSE` → `MACHINE` (status → `ACTIVE`)
   - Creates component movement records
   - Updates installation dates

### Sales & Inventory Deduction

1. **Customer buys Cappuccino**
2. **System receives sale transaction** - `POST /transactions`
3. **System automatically:**
   - Looks up Cappuccino recipe
   - Deducts ingredients from machine inventory (Coffee: 18g, Milk: 150ml, etc.)
   - If deduction fails → creates `OUT_OF_STOCK` incident
   - Updates analytics tables
4. **Manager views sales analytics** - `GET /analytics/metrics`

## Rate Limiting

Default rate limit: **100 requests per minute per IP**

If exceeded, you'll receive:
```json
{
  "statusCode": 429,
  "message": "Too Many Requests"
}
```

## Pagination

For endpoints that return lists, use pagination parameters:

```http
GET /api/v1/tasks?page=1&limit=20
```

**Default**: `page=1`, `limit=20`
**Max limit**: 100

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## WebSocket Events (Real-time)

### Connect to WebSocket

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to events
socket.on('task.created', (data) => {
  console.log('New task:', data);
});

socket.on('incident.created', (data) => {
  console.log('New incident:', data);
});

socket.on('machine.status_changed', (data) => {
  console.log('Machine status changed:', data);
});
```

### Available Events

- `task.created` - New task created
- `task.updated` - Task status changed
- `task.completed` - Task completed
- `incident.created` - New incident reported
- `machine.status_changed` - Machine status updated
- `notification.new` - New notification for user

## Best Practices

1. **Always include error handling** for API requests
2. **Cache frequently accessed data** (e.g., machine lists, locations)
3. **Use bulk operations** when possible to reduce requests
4. **Implement retry logic** for network errors (max 3 retries with exponential backoff)
5. **Validate data client-side** before sending to API
6. **Use query parameters for filtering** instead of fetching all data
7. **Leverage WebSockets** for real-time updates
8. **Upload photos asynchronously** to avoid blocking task completion
9. **Monitor rate limits** and implement request queuing if needed
10. **Log API errors** for debugging

## Support

For API issues or questions:
- Check API documentation: `http://localhost:3000/api/docs`
- Review error messages in response
- Check application logs
- Contact support team

---

**API Version**: 1.0.0
**Last Updated**: 2025-11-21
**Base URL**: `http://localhost:3000/api/v1`
**Documentation**: `http://localhost:3000/api/docs`
