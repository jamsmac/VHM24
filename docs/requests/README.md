# Requests Module

## Overview

The Requests module manages material purchase requests for VendHub Manager. It enables operators to request supplies through Telegram or web interface, with approval workflow and supplier integration.

## Key Features

- Material purchase request management
- Approval workflow with manager review
- Supplier and material catalog
- Priority-based request handling
- Telegram bot integration
- Request tracking from creation to delivery

## Entities

### Request

**File**: `backend/src/modules/requests/entities/request.entity.ts`

```typescript
@Entity('material_requests')
@Index(['status'])
@Index(['created_by_user_id'])
@Index(['approved_by_user_id'])
@Index(['priority'])
@Index(['request_number'], { unique: true })
export class Request extends BaseEntity {
  request_number: string;           // Unique number (REQ-YYYY-NNNNNN)
  status: RequestStatus;            // Current status
  priority: RequestPriority;        // Request priority

  // Creator
  created_by_user_id: string;
  created_by: User;

  // Approval
  approved_by_user_id: string | null;
  approved_by: User | null;
  approved_at: Date | null;

  // Rejection
  rejected_by_user_id: string | null;
  rejected_by: User | null;
  rejected_at: Date | null;
  rejection_reason: string | null;

  // Supplier communication
  sent_at: Date | null;
  sent_message_id: string | null;   // Telegram message ID

  // Completion
  completed_at: Date | null;
  completed_by_user_id: string | null;
  completed_by: User | null;

  // Notes
  comment: string | null;           // Requester comment
  admin_notes: string | null;       // Manager notes
  completion_notes: string | null;  // Completion notes

  // Delivery
  desired_delivery_date: Date | null;
  actual_delivery_date: Date | null;

  // Totals
  total_amount: number | null;      // Calculated total

  // Relations
  items: RequestItem[];
}
```

### Request Statuses

```
┌──────┐     ┌──────────┐     ┌────────┐     ┌───────────┐
│ NEW  │────>│ APPROVED │────>│  SENT  │────>│ COMPLETED │
└──────┘     └──────────┘     └────────┘     └───────────┘
    │                              │
    │                              ▼
    │                    ┌───────────────────┐
    │                    │ PARTIAL_DELIVERED │
    │                    └───────────────────┘
    │
    ├────────────────────────────────────────┐
    ▼                                        ▼
┌──────────┐                          ┌───────────┐
│ REJECTED │                          │ CANCELLED │
└──────────┘                          └───────────┘
```

| Status | Value | Description |
|--------|-------|-------------|
| New | `new` | Just created, awaiting approval |
| Approved | `approved` | Manager approved |
| Rejected | `rejected` | Manager rejected |
| Sent | `sent` | Sent to supplier |
| Partial Delivered | `partial_delivered` | Partially received |
| Completed | `completed` | Fully received |
| Cancelled | `cancelled` | Cancelled by user |

### Request Priority

| Priority | Value | Description |
|----------|-------|-------------|
| Low | `low` | Non-urgent, can wait |
| Normal | `normal` | Standard priority |
| High | `high` | Should be processed soon |
| Urgent | `urgent` | Immediate attention needed |

### RequestItem

**File**: `backend/src/modules/requests/entities/request-item.entity.ts`

```typescript
@Entity('request_items')
export class RequestItem extends BaseEntity {
  request_id: string;               // Parent request
  material_id: string;              // Material reference
  material: Material;
  quantity: number;                 // Requested quantity
  unit: string;                     // Unit of measure
  unit_price: number | null;        // Price per unit
  total_price: number | null;       // Line total
  received_quantity: number;        // Actually received
  notes: string | null;             // Item-specific notes
}
```

### Material

**File**: `backend/src/modules/requests/entities/material.entity.ts`

```typescript
@Entity('materials')
export class Material extends BaseEntity {
  code: string;                     // Material code (unique)
  name: string;                     // Material name
  description: string | null;       // Description
  category: string;                 // Category
  unit: string;                     // Default unit
  default_price: number | null;     // Default unit price
  default_supplier_id: string | null; // Preferred supplier
  min_order_quantity: number;       // Minimum order
  is_active: boolean;               // Active status
}
```

### Supplier

**File**: `backend/src/modules/requests/entities/supplier.entity.ts`

```typescript
@Entity('suppliers')
export class Supplier extends BaseEntity {
  name: string;                     // Supplier name
  code: string;                     // Supplier code
  contact_person: string | null;    // Contact name
  phone: string | null;             // Phone number
  email: string | null;             // Email
  telegram_id: string | null;       // Telegram for orders
  address: string | null;           // Address
  payment_terms: string | null;     // Payment terms
  delivery_time_days: number;       // Typical delivery time
  is_active: boolean;               // Active status
  rating: number | null;            // Supplier rating (1-5)
}
```

## API Endpoints

### Requests

```
POST   /api/requests                 Create request
GET    /api/requests                 List requests
GET    /api/requests/:id             Get request
PUT    /api/requests/:id             Update request
DELETE /api/requests/:id             Cancel request
POST   /api/requests/:id/approve     Approve request
POST   /api/requests/:id/reject      Reject request
POST   /api/requests/:id/send        Send to supplier
POST   /api/requests/:id/complete    Mark as completed
```

### Materials

```
POST   /api/materials                Create material
GET    /api/materials                List materials
GET    /api/materials/:id            Get material
PUT    /api/materials/:id            Update material
DELETE /api/materials/:id            Delete material
```

### Suppliers

```
POST   /api/suppliers                Create supplier
GET    /api/suppliers                List suppliers
GET    /api/suppliers/:id            Get supplier
PUT    /api/suppliers/:id            Update supplier
DELETE /api/suppliers/:id            Delete supplier
```

## DTOs

### CreateRequestDto

```typescript
class CreateRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  items: CreateRequestItemDto[];

  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsDate()
  desired_delivery_date?: Date;
}

class CreateRequestItemDto {
  @IsUUID()
  material_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

## Service Methods

### RequestsService

| Method | Description |
|--------|-------------|
| `create()` | Create new request |
| `findAll()` | List requests with filters |
| `findOne()` | Get request by ID |
| `update()` | Update request (if NEW) |
| `approve()` | Approve request |
| `reject()` | Reject with reason |
| `sendToSupplier()` | Send order to supplier |
| `receiveDelivery()` | Record received items |
| `complete()` | Mark as completed |
| `cancel()` | Cancel request |
| `generateRequestNumber()` | Generate unique number |

### MaterialsService

| Method | Description |
|--------|-------------|
| `create()` | Create material |
| `findAll()` | List materials |
| `findByCategory()` | Get by category |
| `update()` | Update material |
| `deactivate()` | Deactivate material |

### SuppliersService

| Method | Description |
|--------|-------------|
| `create()` | Create supplier |
| `findAll()` | List suppliers |
| `findActive()` | Get active suppliers |
| `update()` | Update supplier |
| `updateRating()` | Update supplier rating |

## Workflow

### Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST WORKFLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Operator creates request (via Telegram or Web)               │
│         │                                                        │
│         ▼                                                        │
│  2. Request status = NEW                                         │
│         │ (Notification sent to manager)                         │
│         ▼                                                        │
│  3. Manager reviews request                                      │
│         │                                                        │
│         ├─── Approve → status = APPROVED                        │
│         │                                                        │
│         └─── Reject → status = REJECTED (with reason)           │
│                  │                                               │
│                  ▼ (if approved)                                │
│  4. Send to supplier                                             │
│         │ (via Telegram if configured)                           │
│         ▼                                                        │
│  5. status = SENT                                                │
│         │                                                        │
│         ▼                                                        │
│  6. Record delivery                                              │
│         │                                                        │
│         ├─── Full → status = COMPLETED                          │
│         │                                                        │
│         └─── Partial → status = PARTIAL_DELIVERED               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Telegram Bot Integration

```typescript
// Operator sends request via Telegram
/request Кофе 50кг, Сахар 20кг

// Bot creates request and notifies manager
// Manager approves in web dashboard or via bot
// Bot sends order to supplier Telegram
// Supplier confirms receipt
// Operator confirms delivery
```

## Request Number Generation

```typescript
async generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const lastRequest = await this.requestRepository
    .createQueryBuilder('r')
    .where('r.request_number LIKE :pattern', { pattern: `REQ-${year}-%` })
    .orderBy('r.created_at', 'DESC')
    .getOne();

  let sequence = 1;
  if (lastRequest) {
    const lastNumber = parseInt(lastRequest.request_number.split('-')[2]);
    sequence = lastNumber + 1;
  }

  return `REQ-${year}-${sequence.toString().padStart(6, '0')}`;
}
```

## Notifications

### Request Created

```typescript
// To manager
{
  title: 'Новая заявка на материалы',
  body: 'REQ-2025-000123: 3 позиции от Иванов И.',
  priority: 'high',
}
```

### Request Approved/Rejected

```typescript
// To requester
{
  title: 'Заявка одобрена',
  body: 'REQ-2025-000123 одобрена. Ожидайте доставку.',
}
```

### Delivery Reminder

```typescript
// To supplier
{
  title: 'Напоминание о доставке',
  body: 'Заказ REQ-2025-000123 ожидает доставки. Срок: завтра.',
}
```

## Reports

### Request Summary

```typescript
interface RequestSummary {
  period: { from: Date; to: Date };
  total_requests: number;
  by_status: Record<RequestStatus, number>;
  by_priority: Record<RequestPriority, number>;
  total_amount: number;
  avg_processing_time_hours: number;
  top_materials: {
    material_name: string;
    total_quantity: number;
    total_amount: number;
  }[];
}
```

## Integration with Other Modules

### Users

- Requester and approver tracking
- Role-based access

### Telegram

- Request submission via bot
- Order sending to suppliers

### Notifications

- Status change notifications

### Inventory

- Received items update inventory

## Best Practices

1. **Set Priority Appropriately**: Use urgent only when necessary
2. **Complete Item Notes**: Add context for special requirements
3. **Track Deliveries**: Always record received quantities
4. **Rate Suppliers**: Update ratings based on performance
5. **Regular Review**: Review pending requests daily

## Related Modules

- [Telegram](../TELEGRAM_BOT.md) - Bot integration
- [Users](../users/README.md) - User management
- [Inventory](../inventory/README.md) - Stock updates
- [Notifications](../notifications/README.md) - Alerts
