# VendHub Manager - API Reference

> **Version**: 1.0.0
> **Last Updated**: 2025-12-19
> **Base URL**: `/api/v1`

Complete API reference for VendHub Manager REST API.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Machines](#3-machines)
4. [Machine Access](#4-machine-access)
5. [Tasks](#5-tasks)
6. [Inventory](#6-inventory)
7. [Transactions](#7-transactions)
8. [Incidents](#8-incidents)
9. [Files](#9-files)
10. [Notifications](#10-notifications)
11. [Client Platform](#11-client-platform)
12. [Common Responses](#12-common-responses)

---

## Overview

### Base URL

```
Production: https://api.vendhub.com/api/v1
Development: http://localhost:3000/api/v1
```

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Rate Limiting

| Tier | Limit | Applies To |
|------|-------|------------|
| Default | 100 req/min | Most endpoints |
| Short | 3 req/sec | Login, password reset |
| Medium | 20 req/10sec | File uploads |
| Long | 100 req/min | Standard operations |

### Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

Error responses:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

---

## 1. AUTHENTICATION

### POST /auth/login

Login to the staff platform.

**Request Body:**

```json
{
  "email": "admin@vendhub.com",
  "password": "Admin123!"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "admin@vendhub.com",
    "role": "ADMIN",
    "name": "Admin User"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Account disabled
- `429` - Too many attempts

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "expires_in": 900
}
```

---

### POST /auth/logout

Logout and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/2fa/setup

Setup two-factor authentication.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code_url": "otpauth://totp/VendHub:admin@vendhub.com?secret=..."
}
```

---

### POST /auth/2fa/verify

Verify 2FA code during login.

**Request Body:**

```json
{
  "code": "123456",
  "temp_token": "eyJhbGciOiJIUzI1..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1..."
}
```

---

### POST /auth/password/reset

Request password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "message": "Reset email sent if account exists"
}
```

---

## 2. USERS

### GET /users

List all users (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| role | string | Filter by role |
| status | string | Filter by status |
| search | string | Search by name/email |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "operator@vendhub.com",
      "name": "John Operator",
      "role": "OPERATOR",
      "status": "active",
      "telegram_id": "123456789",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /users/me

Get current authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "uuid",
  "email": "admin@vendhub.com",
  "name": "Admin User",
  "role": "ADMIN",
  "status": "active",
  "two_factor_enabled": true,
  "permissions": ["machines:read", "machines:write", "tasks:manage"]
}
```

---

### POST /users

Create a new user (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "email": "newuser@vendhub.com",
  "password": "SecurePass123!",
  "name": "New User",
  "role": "OPERATOR",
  "telegram_id": "123456789"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "email": "newuser@vendhub.com",
  "name": "New User",
  "role": "OPERATOR",
  "status": "active"
}
```

---

### PATCH /users/:id

Update user details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "name": "Updated Name",
  "role": "MANAGER"
}
```

**Response (200):** Updated user object

---

## 3. MACHINES

### GET /machines

List all machines accessible to user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | Filter by status |
| location_id | uuid | Filter by location |
| search | string | Search by name/number |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "machine_number": "M-001",
      "name": "Coffee Machine Lobby",
      "status": "active",
      "location": {
        "id": "uuid",
        "name": "Office Building A"
      },
      "last_refill_at": "2025-01-15T10:00:00Z",
      "inventory_status": "normal"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /machines/:id

Get machine details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "uuid",
  "machine_number": "M-001",
  "name": "Coffee Machine Lobby",
  "serial_number": "SN12345678",
  "status": "active",
  "location": {
    "id": "uuid",
    "name": "Office Building A",
    "address": "123 Main St"
  },
  "settings": {
    "payment_methods": ["cash", "card"],
    "operating_hours": {
      "start": "08:00",
      "end": "20:00"
    }
  },
  "stats": {
    "tasks_pending": 2,
    "last_collection": "2025-01-10T14:00:00Z",
    "daily_average_sales": 150.00
  }
}
```

---

### POST /machines

Create a new machine.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER

**Request Body:**

```json
{
  "machine_number": "M-002",
  "name": "Snack Machine Floor 2",
  "location_id": "uuid",
  "serial_number": "SN87654321",
  "settings": {
    "payment_methods": ["cash", "card", "qr"]
  }
}
```

**Response (201):** Created machine object

---

### PATCH /machines/:id

Update machine details.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER

**Request Body:**

```json
{
  "name": "Updated Machine Name",
  "status": "maintenance"
}
```

**Response (200):** Updated machine object

---

### DELETE /machines/:id

Soft delete a machine.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN

**Response (200):**

```json
{
  "message": "Machine deleted successfully"
}
```

---

### GET /machines/:id/qr

Get QR code for machine.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "qr_code_url": "https://storage.vendhub.com/qr/M-001.png",
  "machine_number": "M-001",
  "public_menu_url": "https://vendhub.com/menu/M-001"
}
```

---

## 4. MACHINE ACCESS

### GET /machines/:id/access

List users with access to a machine.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "John Operator",
        "email": "john@vendhub.com"
      },
      "role": "operator",
      "created_at": "2025-01-01T00:00:00Z",
      "created_by": {
        "id": "uuid",
        "name": "Admin User"
      }
    }
  ]
}
```

---

### POST /machines/:id/access

Assign user access to a machine.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER, machine owner/admin

**Request Body:**

```json
{
  "user_id": "uuid",
  "role": "operator"
}
```

**Roles Available:** `owner`, `admin`, `manager`, `operator`, `technician`, `viewer`

**Response (201):**

```json
{
  "id": "uuid",
  "machine_id": "uuid",
  "user_id": "uuid",
  "role": "operator",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### DELETE /machines/:id/access/:userId

Remove user access from a machine.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER, machine owner/admin

**Response (200):**

```json
{
  "message": "Access removed successfully"
}
```

---

## 5. TASKS

### GET /tasks

List tasks accessible to user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | pending, assigned, in_progress, completed, rejected |
| type | string | refill, collection, cleaning, repair, etc. |
| machine_id | uuid | Filter by machine |
| assigned_to_id | uuid | Filter by assignee |
| priority | string | low, normal, high, urgent |
| due_before | datetime | Due date filter |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "refill",
      "status": "pending",
      "priority": "high",
      "machine": {
        "id": "uuid",
        "machine_number": "M-001",
        "name": "Coffee Machine Lobby"
      },
      "assigned_to": null,
      "due_date": "2025-01-16T18:00:00Z",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

---

### GET /tasks/:id

Get task details.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "uuid",
  "type": "refill",
  "status": "in_progress",
  "priority": "high",
  "description": "Low stock on coffee beans",
  "machine": {
    "id": "uuid",
    "machine_number": "M-001",
    "name": "Coffee Machine Lobby",
    "location": {
      "name": "Office Building A"
    }
  },
  "assigned_to": {
    "id": "uuid",
    "name": "John Operator"
  },
  "items": [
    {
      "nomenclature_id": "uuid",
      "nomenclature_name": "Coffee Beans",
      "quantity": 5,
      "actual_quantity": null,
      "unit": "kg"
    }
  ],
  "photos_before": [],
  "photos_after": [],
  "due_date": "2025-01-16T18:00:00Z",
  "started_at": "2025-01-16T14:00:00Z",
  "completed_at": null,
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### POST /tasks

Create a new task.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER

**Request Body:**

```json
{
  "type": "refill",
  "machine_id": "uuid",
  "priority": "high",
  "description": "Low stock alert",
  "due_date": "2025-01-16T18:00:00Z",
  "assigned_to_id": "uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 5
    }
  ]
}
```

**Task Types:** `refill`, `collection`, `cleaning`, `repair`, `install`, `removal`, `audit`, `inspection`

**Response (201):** Created task object

---

### POST /tasks/:id/assign

Assign task to operator.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER

**Request Body:**

```json
{
  "user_id": "uuid"
}
```

**Response (200):** Updated task with status `assigned`

---

### POST /tasks/:id/start

Start working on a task.

**Headers:** `Authorization: Bearer <token>`
**Roles:** Assigned operator

**Response (200):** Updated task with status `in_progress`

---

### POST /tasks/:id/complete

Complete a task (requires photos!).

**Headers:** `Authorization: Bearer <token>`
**Roles:** Assigned operator

**Request Body:**

```json
{
  "notes": "Refilled all products",
  "actual_items": [
    {
      "nomenclature_id": "uuid",
      "actual_quantity": 5
    }
  ]
}
```

**Prerequisites:**
- At least one photo with category `task_photo_before`
- At least one photo with category `task_photo_after`

**Response (200):** Updated task with status `completed`

**Error Responses:**
- `400` - Missing required photos

---

### POST /tasks/:id/reject

Reject a task with reason.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "reason": "Machine location not accessible"
}
```

**Response (200):** Updated task with status `rejected`

---

## 6. INVENTORY

### GET /inventory/warehouse

Get warehouse inventory.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| category_id | uuid | Filter by category |
| low_stock | boolean | Show only low stock items |

**Response (200):**

```json
{
  "data": [
    {
      "nomenclature_id": "uuid",
      "nomenclature": {
        "name": "Coffee Beans",
        "sku": "CB-001",
        "unit": "kg"
      },
      "quantity": 100,
      "reserved_quantity": 15,
      "available_quantity": 85,
      "min_threshold": 20,
      "is_low_stock": false
    }
  ]
}
```

---

### GET /inventory/operator/:userId

Get operator's personal inventory.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "data": [
    {
      "nomenclature_id": "uuid",
      "nomenclature": {
        "name": "Coffee Beans",
        "sku": "CB-001"
      },
      "quantity": 10
    }
  ],
  "operator": {
    "id": "uuid",
    "name": "John Operator"
  }
}
```

---

### GET /inventory/machine/:machineId

Get machine inventory.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "data": [
    {
      "nomenclature_id": "uuid",
      "nomenclature": {
        "name": "Coffee Beans",
        "sku": "CB-001"
      },
      "quantity": 3,
      "slot_number": 1,
      "capacity": 5,
      "fill_percentage": 60
    }
  ],
  "machine": {
    "id": "uuid",
    "machine_number": "M-001"
  }
}
```

---

### POST /inventory/transfer

Transfer inventory between levels.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "from_type": "warehouse",
  "from_id": null,
  "to_type": "operator",
  "to_id": "user-uuid",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 10
    }
  ],
  "notes": "Daily route preparation"
}
```

**Transfer Types:** `warehouse`, `operator`, `machine`

**Response (200):**

```json
{
  "id": "uuid",
  "status": "completed",
  "items_transferred": 1,
  "created_at": "2025-01-15T08:00:00Z"
}
```

---

### POST /inventory/adjustment

Make inventory adjustment.

**Headers:** `Authorization: Bearer <token>`
**Roles:** ADMIN, MANAGER

**Request Body:**

```json
{
  "inventory_type": "warehouse",
  "inventory_id": null,
  "nomenclature_id": "uuid",
  "adjustment_quantity": -5,
  "reason": "Damaged goods",
  "notes": "Found during stocktaking"
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "previous_quantity": 100,
  "new_quantity": 95,
  "adjustment": -5,
  "reason": "Damaged goods"
}
```

---

## 7. TRANSACTIONS

### GET /transactions

List financial transactions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| type | string | income, expense, refund, adjustment, transfer |
| machine_id | uuid | Filter by machine |
| date_from | date | Start date |
| date_to | date | End date |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "income",
      "amount": 500.00,
      "description": "Daily collection",
      "machine": {
        "id": "uuid",
        "machine_number": "M-001"
      },
      "task_id": "uuid",
      "created_by": {
        "id": "uuid",
        "name": "John Operator"
      },
      "created_at": "2025-01-15T14:00:00Z"
    }
  ],
  "summary": {
    "total_income": 5000.00,
    "total_expense": 1500.00,
    "net": 3500.00
  }
}
```

---

### POST /transactions

Create a transaction.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "type": "expense",
  "amount": 150.00,
  "category_id": "uuid",
  "machine_id": "uuid",
  "description": "Repair parts",
  "date": "2025-01-15"
}
```

**Response (201):** Created transaction object

---

## 8. INCIDENTS

### GET /incidents

List incidents.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| status | string | created, in_progress, resolved, closed |
| type | string | low_stock, error, cash_discrepancy, offline, vandalism |
| machine_id | uuid | Filter by machine |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "error",
      "status": "created",
      "severity": "high",
      "description": "Payment terminal not responding",
      "machine": {
        "id": "uuid",
        "machine_number": "M-001"
      },
      "created_at": "2025-01-15T10:00:00Z",
      "resolved_at": null
    }
  ]
}
```

---

### POST /incidents

Create an incident.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "type": "error",
  "machine_id": "uuid",
  "severity": "high",
  "description": "Payment terminal not responding"
}
```

**Response (201):** Created incident object

---

### PATCH /incidents/:id/resolve

Resolve an incident.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "resolution_notes": "Replaced payment terminal"
}
```

**Response (200):** Updated incident with status `resolved`

---

## 9. FILES

### POST /files/upload

Upload a file/photo.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**

| Field | Type | Description |
|-------|------|-------------|
| file | file | The file to upload |
| entity_type | string | tasks, machines, incidents |
| entity_id | uuid | Associated entity ID |
| category | string | task_photo_before, task_photo_after, machine_photo, etc. |

**Response (201):**

```json
{
  "id": "uuid",
  "filename": "original-name.jpg",
  "url": "https://storage.vendhub.com/files/uuid.jpg",
  "mimetype": "image/jpeg",
  "size": 102400,
  "entity_type": "tasks",
  "entity_id": "uuid",
  "category": "task_photo_before",
  "uploaded_by": "uuid",
  "created_at": "2025-01-15T14:30:00Z"
}
```

---

### GET /files/:id

Get file metadata and download URL.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "uuid",
  "filename": "photo.jpg",
  "url": "https://storage.vendhub.com/files/uuid.jpg",
  "download_url": "https://storage.vendhub.com/files/uuid.jpg?token=...",
  "mimetype": "image/jpeg",
  "size": 102400
}
```

---

### DELETE /files/:id

Delete a file.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "message": "File deleted successfully"
}
```

---

## 10. NOTIFICATIONS

### GET /notifications

Get user's notifications.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| unread_only | boolean | Filter unread only |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "task_assigned",
      "title": "New Task Assigned",
      "message": "You have been assigned a refill task for M-001",
      "read": false,
      "data": {
        "task_id": "uuid",
        "machine_id": "uuid"
      },
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "unread_count": 5
}
```

---

### PATCH /notifications/:id/read

Mark notification as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": "uuid",
  "read": true
}
```

---

### POST /notifications/read-all

Mark all notifications as read.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "message": "All notifications marked as read",
  "count": 5
}
```

---

## 11. CLIENT PLATFORM

### POST /client/auth

Authenticate client via Telegram.

**Request Body:**

```json
{
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "client": {
    "id": "uuid",
    "telegram_id": "123456789",
    "first_name": "John",
    "last_name": "Doe",
    "points_balance": 150,
    "level": "silver"
  }
}
```

---

### GET /client/menu/:machineNumber

Get public menu for a machine (no auth required).

**Response (200):**

```json
{
  "machine": {
    "machine_number": "M-001",
    "name": "Coffee Machine",
    "status": "active",
    "location": {
      "name": "Office Building A",
      "address": "123 Main St"
    }
  },
  "menu": [
    {
      "id": "uuid",
      "name": "Espresso",
      "price": 3.50,
      "description": "Strong Italian coffee",
      "image_url": "https://...",
      "available": true,
      "category": "Hot Drinks"
    }
  ],
  "operating_hours": {
    "start": "08:00",
    "end": "20:00"
  }
}
```

---

### GET /client/loyalty

Get client's loyalty status.

**Headers:** `X-Telegram-Init-Data: <init_data>`

**Response (200):**

```json
{
  "points_balance": 150,
  "level": "silver",
  "next_level": "gold",
  "points_to_next_level": 350,
  "benefits": [
    "5% discount on all purchases",
    "Priority support"
  ],
  "recent_transactions": [
    {
      "type": "earned",
      "points": 10,
      "description": "Purchase at M-001",
      "date": "2025-01-15"
    }
  ]
}
```

---

### POST /client/orders

Create a client order.

**Headers:** `X-Telegram-Init-Data: <init_data>`

**Request Body:**

```json
{
  "machine_number": "M-001",
  "items": [
    {
      "nomenclature_id": "uuid",
      "quantity": 2
    }
  ],
  "use_points": 50,
  "notes": "Extra sugar please"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "order_number": "ORD-001234",
  "status": "pending",
  "pickup_code": "1234",
  "items": [...],
  "subtotal": 7.00,
  "points_discount": 0.50,
  "total": 6.50,
  "estimated_ready_at": "2025-01-15T14:15:00Z"
}
```

---

### GET /client/orders/:id

Get order status.

**Headers:** `X-Telegram-Init-Data: <init_data>`

**Response (200):**

```json
{
  "id": "uuid",
  "order_number": "ORD-001234",
  "status": "preparing",
  "pickup_code": "1234",
  "machine": {
    "machine_number": "M-001",
    "location": "Office Building A"
  },
  "items": [...],
  "total": 6.50,
  "created_at": "2025-01-15T14:00:00Z",
  "estimated_ready_at": "2025-01-15T14:15:00Z"
}
```

---

## 12. COMMON RESPONSES

### Success Responses

| Code | Description |
|------|-------------|
| 200 | Request successful |
| 201 | Resource created |
| 204 | No content (successful delete) |

### Error Responses

| Code | Description |
|------|-------------|
| 400 | Bad request - validation failed |
| 401 | Unauthorized - invalid or missing token |
| 403 | Forbidden - insufficient permissions |
| 404 | Not found - resource doesn't exist |
| 409 | Conflict - duplicate resource |
| 422 | Unprocessable entity |
| 429 | Too many requests - rate limited |
| 500 | Internal server error |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "field": "email",
      "constraints": {
        "isEmail": "email must be a valid email"
      }
    }
  ]
}
```

### Pagination

All list endpoints support pagination:

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Interactive Documentation

Full interactive API documentation is available at:

```
Development: http://localhost:3000/api/docs
```

The Swagger UI provides:
- Interactive endpoint testing
- Request/response examples
- Schema definitions
- Authentication testing

---

**Version**: 1.0.0
**Last Updated**: 2025-12-19
**Project**: VendHub Manager (VHM24)
