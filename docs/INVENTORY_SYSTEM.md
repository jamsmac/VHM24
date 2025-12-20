# Inventory System - VendHub Manager

> **Version**: 1.0.0
> **Last Updated**: 2025-12-20
> **Module**: `backend/src/modules/inventory/`

This document provides comprehensive documentation of the 3-Level Inventory System, a core component of VendHub Manager's Manual Operations Architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [3-Level Architecture](#3-level-architecture)
3. [Inventory Entities](#inventory-entities)
4. [Inventory Transfers](#inventory-transfers)
5. [Inventory Movements](#inventory-movements)
6. [Inventory Reservations](#inventory-reservations)
7. [Low Stock Monitoring](#low-stock-monitoring)
8. [Inventory Adjustments](#inventory-adjustments)
9. [Sales Recording](#sales-recording)
10. [Inventory Counts](#inventory-counts)
11. [Reports and Export](#reports-and-export)
12. [API Reference](#api-reference)
13. [Integration with Tasks](#integration-with-tasks)
14. [Error Handling](#error-handling)

---

## Overview

### Architecture Principle

The VendHub Manager inventory system follows a **3-level hierarchical model** designed for Manual Operations Architecture:

```
┌────────────────────────────────────────────────────────────────────┐
│                    3-LEVEL INVENTORY SYSTEM                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   LEVEL 1: WAREHOUSE                                               │
│   ├── Central storage                                              │
│   ├── Bulk quantities                                              │
│   └── Reservation management                                       │
│                                                                     │
│             ↓ WAREHOUSE_TO_OPERATOR                                │
│             ↑ OPERATOR_TO_WAREHOUSE                                │
│                                                                     │
│   LEVEL 2: OPERATOR                                                │
│   ├── Personal stock (per operator)                                │
│   ├── Mobile inventory                                             │
│   └── Task-linked usage                                            │
│                                                                     │
│             ↓ OPERATOR_TO_MACHINE (via Refill tasks)               │
│             ↑ MACHINE_TO_OPERATOR (via Rejection/Return)           │
│                                                                     │
│   LEVEL 3: MACHINE                                                 │
│   ├── Per-machine inventory                                        │
│   ├── Slot/Hopper tracking                                         │
│   └── Sales deduction                                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **No Direct Warehouse-to-Machine Transfers** - All inventory flows through operators
2. **Task-Based Transfers** - Machine inventory changes linked to tasks
3. **Reservation System** - Prevents race conditions during task assignment
4. **Full Traceability** - Every movement logged with user and timestamp
5. **Pessimistic Locking** - Transaction-safe concurrent operations

### Module Structure

```
inventory/
├── entities/
│   ├── warehouse-inventory.entity.ts    # Level 1
│   ├── operator-inventory.entity.ts     # Level 2
│   ├── machine-inventory.entity.ts      # Level 3
│   ├── inventory-movement.entity.ts     # Movement history
│   ├── inventory-reservation.entity.ts  # Reservation tracking
│   ├── inventory-adjustment.entity.ts   # Adjustments/corrections
│   ├── inventory-actual-count.entity.ts # Physical counts
│   └── inventory-difference-threshold.entity.ts # Threshold alerts
├── services/
│   ├── warehouse-inventory.service.ts   # Warehouse operations
│   ├── operator-inventory.service.ts    # Operator operations
│   ├── machine-inventory.service.ts     # Machine operations
│   ├── inventory-transfer.service.ts    # Transfer logic
│   ├── inventory-movement.service.ts    # Movement tracking
│   ├── inventory-reservation.service.ts # Reservation management
│   ├── inventory-adjustment.service.ts  # Adjustments
│   ├── inventory-count.service.ts       # Physical counts
│   ├── inventory-difference.service.ts  # Difference detection
│   ├── inventory-threshold.service.ts   # Low stock alerts
│   ├── inventory-calculation.service.ts # Calculations
│   ├── inventory-export.service.ts      # Export functionality
│   └── inventory-pdf.service.ts         # PDF reports
├── controllers/
│   ├── inventory.controller.ts          # Main controller
│   ├── inventory-adjustments.controller.ts
│   ├── inventory-counts.controller.ts
│   ├── inventory-differences.controller.ts
│   └── inventory-thresholds.controller.ts
├── dto/
│   ├── warehouse-inventory.dto.ts
│   ├── transfer-inventory.dto.ts
│   ├── machine-inventory.dto.ts
│   ├── inventory-adjustment.dto.ts
│   ├── inventory-count.dto.ts
│   └── inventory-threshold.dto.ts
├── inventory.service.ts                  # Facade service
└── inventory.module.ts
```

---

## 3-Level Architecture

### Level 1: Warehouse Inventory

The central storage level for all products and ingredients:

```typescript
@Entity('warehouse_inventory')
class WarehouseInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  nomenclature_id: string;           // Reference to product

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;          // Total quantity on hand

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;         // Reserved for tasks

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;           // Low stock threshold

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_stock_level: number | null;    // Maximum capacity

  @Column({ type: 'varchar', length: 200, nullable: true })
  location_in_warehouse: string;     // Physical location

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_restocked_at: Date | null;

  // Computed property
  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
```

**Key Features:**
- One record per nomenclature item
- Tracks reservations separately from current quantity
- Available quantity = current - reserved
- Supports min/max stock levels for alerts

### Level 2: Operator Inventory

Personal inventory assigned to each operator:

```typescript
@Entity('operator_inventory')
@Unique(['operator_id', 'nomenclature_id'])
class OperatorInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  operator_id: string;               // Reference to user (operator)

  @Column({ type: 'uuid' })
  nomenclature_id: string;           // Reference to product

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;          // Quantity held by operator

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;         // Reserved for assigned tasks

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_received_at: Date | null;     // Last warehouse pickup

  @Column({ type: 'uuid', nullable: true })
  last_task_id: string | null;       // Last task using this item

  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
```

**Key Features:**
- One record per operator + nomenclature combination
- Tracks what each operator is carrying
- Reservations linked to assigned tasks
- Supports task tracking

### Level 3: Machine Inventory

Inventory loaded into each vending machine:

```typescript
@Entity('machine_inventory')
@Unique(['machine_id', 'nomenclature_id'])
class MachineInventory extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;                // Reference to machine

  @Column({ type: 'uuid' })
  nomenclature_id: string;           // Reference to product

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;          // Quantity in machine

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;           // Low stock alert threshold

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_capacity: number | null;       // Maximum slot/hopper capacity

  @Column({ type: 'varchar', length: 50, nullable: true })
  slot_number: string | null;        // Physical slot in machine

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refilled_at: Date | null;     // Last refill date

  @Column({ type: 'uuid', nullable: true })
  last_refill_task_id: string | null; // Link to refill task
}
```

**Key Features:**
- One record per machine + nomenclature combination
- Tracks physical location (slot number)
- Links to refill tasks
- Supports capacity limits per slot

---

## Inventory Transfers

### Transfer Types

```
┌────────────────────────────────────────────────────────────────────┐
│                      INVENTORY TRANSFERS                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WAREHOUSE ←→ OPERATOR                                             │
│  ├── WAREHOUSE_TO_OPERATOR: Issue stock to operator               │
│  └── OPERATOR_TO_WAREHOUSE: Return unused stock                   │
│                                                                     │
│  OPERATOR ←→ MACHINE                                               │
│  ├── OPERATOR_TO_MACHINE: Load machine (via refill task)         │
│  └── MACHINE_TO_OPERATOR: Remove from machine (return/reject)    │
│                                                                     │
│  NOTE: Direct WAREHOUSE → MACHINE transfers are NOT supported     │
│        All inventory must flow through operators                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Transfer Flow Diagram

```
                    WAREHOUSE
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    OPERATOR A    OPERATOR B    OPERATOR C
         │              │              │
    ┌────┼────┐    ┌────┼────┐   ┌────┼────┐
    ▼    ▼    ▼    ▼    ▼    ▼   ▼    ▼    ▼
   M-1  M-2  M-3  M-4  M-5  M-6  M-7  M-8  M-9
```

### Warehouse → Operator Transfer

```typescript
async transferWarehouseToOperator(
  dto: TransferWarehouseToOperatorDto,
  userId: string
): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }>

// DTO structure
interface TransferWarehouseToOperatorDto {
  nomenclature_id: string;  // Product to transfer
  operator_id: string;      // Receiving operator
  quantity: number;         // Amount to transfer
  notes?: string;           // Optional notes
}
```

**Process:**
1. Lock warehouse inventory (pessimistic_write)
2. Validate sufficient quantity available
3. Deduct from warehouse.current_quantity
4. Lock/create operator inventory
5. Add to operator.current_quantity
6. Record movement (WAREHOUSE_TO_OPERATOR)
7. Return updated records

**Example Request:**
```
POST /api/inventory/transfer/warehouse-to-operator
Authorization: Bearer <token>
Content-Type: application/json

{
  "nomenclature_id": "uuid",
  "operator_id": "uuid",
  "quantity": 25.5,
  "notes": "Morning stock issue"
}
```

### Operator → Warehouse Transfer (Return)

```typescript
async transferOperatorToWarehouse(
  dto: TransferOperatorToWarehouseDto,
  userId: string
): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory }>

// DTO structure
interface TransferOperatorToWarehouseDto {
  nomenclature_id: string;
  operator_id: string;
  quantity: number;
  notes?: string;
}
```

**Use Cases:**
- End of shift return of unused stock
- Product recall/expiration
- Correction of over-issue

### Operator → Machine Transfer (Refill)

```typescript
async transferOperatorToMachine(
  dto: TransferOperatorToMachineDto,
  userId: string
): Promise<{ operator: OperatorInventory; machine: MachineInventory }>

// DTO structure
interface TransferOperatorToMachineDto {
  operator_id: string;
  machine_id: string;
  nomenclature_id: string;
  quantity: number;
  task_id?: string;          // Link to refill task
  operation_date?: string;   // For historical data entry
  notes?: string;
}
```

**CRITICAL: This is called automatically when completing refill tasks**

**Process:**
1. Lock operator inventory
2. Validate sufficient quantity
3. Deduct from operator.current_quantity
4. Update operator.last_task_id
5. Lock/create machine inventory
6. Add to machine.current_quantity
7. Update machine.last_refilled_at and last_refill_task_id
8. Record movement (OPERATOR_TO_MACHINE) with task_id

### Machine → Operator Transfer (Removal)

```typescript
async transferMachineToOperator(
  dto: TransferMachineToOperatorDto,
  userId: string
): Promise<{ machine: MachineInventory; operator: OperatorInventory }>

// DTO structure
interface TransferMachineToOperatorDto {
  machine_id: string;
  operator_id: string;
  nomenclature_id: string;
  quantity: number;
  notes?: string;
}
```

**Use Cases:**
- Task rejection rollback (automatic)
- Expired product removal
- Damaged product removal
- Machine decommissioning

---

## Inventory Movements

### Movement Types

```typescript
export enum MovementType {
  // Warehouse Operations
  WAREHOUSE_IN = 'warehouse_in',           // Purchase receipt
  WAREHOUSE_OUT = 'warehouse_out',         // Write-off from warehouse

  // Level Transfers
  WAREHOUSE_TO_OPERATOR = 'warehouse_to_operator',
  OPERATOR_TO_WAREHOUSE = 'operator_to_warehouse',
  OPERATOR_TO_MACHINE = 'operator_to_machine',
  MACHINE_TO_OPERATOR = 'machine_to_operator',

  // Machine Operations
  MACHINE_SALE = 'machine_sale',           // Product sold/dispensed

  // Corrections
  ADJUSTMENT = 'adjustment',               // Inventory correction
  WRITE_OFF = 'write_off',                // Damage/expiration

  // Reservations
  WAREHOUSE_RESERVATION = 'warehouse_reservation',
  WAREHOUSE_RESERVATION_RELEASE = 'warehouse_reservation_release',
}
```

### Movement Entity

```typescript
@Entity('inventory_movements')
class InventoryMovement extends BaseEntity {
  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string;      // Who performed the action

  @Column({ type: 'uuid', nullable: true })
  operator_id: string;               // Related operator

  @Column({ type: 'uuid', nullable: true })
  machine_id: string;                // Related machine

  @Column({ type: 'uuid', nullable: true })
  task_id: string;                   // Related task

  @Column({ type: 'timestamp with time zone', nullable: true })
  operation_date: Date;              // Actual operation date

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;     // Additional data
}
```

### Movement Query Example

```
GET /api/inventory/movements?
  movementType=operator_to_machine&
  machineId=uuid&
  dateFrom=2025-12-01&
  dateTo=2025-12-31

Response: 200 OK
[
  {
    "id": "uuid",
    "movement_type": "operator_to_machine",
    "nomenclature": { "id": "uuid", "name": "Coffee Beans" },
    "quantity": 10.5,
    "operator": { "id": "uuid", "full_name": "John Doe" },
    "machine": { "id": "uuid", "machine_number": "M-001" },
    "task_id": "uuid",
    "operation_date": "2025-12-15T10:30:00Z",
    "notes": "Refill task completion"
  }
]
```

---

## Inventory Reservations

### Overview

Reservations prevent race conditions when multiple tasks are created for the same operator's inventory:

```
┌────────────────────────────────────────────────────────────────────┐
│                    RESERVATION LIFECYCLE                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  PENDING ──► CONFIRMED ──► PARTIALLY_FULFILLED ──► FULFILLED       │
│     │                              │                                │
│     ├──────────────────────────────┤                               │
│     │                              │                                │
│     ▼                              ▼                                │
│  CANCELLED                      EXPIRED                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Reservation Entity

```typescript
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum InventoryLevel {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
}

@Entity('inventory_reservations')
class InventoryReservation extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  reservation_number: string;        // "RSV-2025-001234"

  @Column({ type: 'uuid' })
  task_id: string;                   // Link to task

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_reserved: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_fulfilled: number;

  @Column({ type: 'enum', enum: ReservationStatus })
  status: ReservationStatus;

  @Column({ type: 'varchar', length: 20 })
  inventory_level: InventoryLevel;   // warehouse or operator

  @Column({ type: 'uuid' })
  reference_id: string;              // warehouse_id or operator_id

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;           // Auto-expire after this time

  @Column({ type: 'timestamp with time zone', nullable: true })
  fulfilled_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date | null;

  get quantity_remaining(): number {
    return Number(this.quantity_reserved) - Number(this.quantity_fulfilled);
  }

  get is_active(): boolean {
    return ['pending', 'confirmed', 'partially_fulfilled'].includes(this.status);
  }
}
```

### Reservation Flow with Tasks

```
┌────────────────────────────────────────────────────────────────────┐
│                    RESERVATION + TASK FLOW                         │
└────────────────────────────────────────────────────────────────────┘

1. TASK CREATION (Refill)
   ├── Create Task with items
   └── Create Reservations for each item
       ├── Reserve from operator's inventory
       ├── Set expires_at = now + 24 hours
       └── Status = PENDING

2. TASK ASSIGNMENT
   └── Reservations remain linked to task

3. TASK COMPLETION
   ├── For each reservation:
   │   ├── Mark status = FULFILLED
   │   ├── Set quantity_fulfilled
   │   └── Set fulfilled_at
   └── Transfer inventory (Operator → Machine)

4. TASK CANCELLATION
   ├── For each reservation:
   │   ├── Mark status = CANCELLED
   │   ├── Set cancelled_at
   │   └── Release reserved quantity
   └── Update operator.reserved_quantity

5. RESERVATION EXPIRY (Cron Job)
   ├── Find reservations where expires_at < NOW
   ├── Mark status = EXPIRED
   └── Release reserved quantity
```

### Reservation API

```typescript
// Create reservation (called automatically on task creation)
async createReservation(
  taskId: string,
  operatorId: string,
  items: Array<{ nomenclature_id: string; quantity: number }>,
  expiresInHours: number = 24
): Promise<InventoryReservation[]>

// Fulfill reservation (called on task completion)
async fulfillReservation(taskId: string): Promise<InventoryReservation[]>

// Cancel reservation (called on task cancellation)
async cancelReservation(taskId: string): Promise<InventoryReservation[]>

// Expire old reservations (called by cron job)
async expireOldReservations(): Promise<number>

// Query reservations
async getReservationsByTask(taskId: string): Promise<InventoryReservation[]>
async getActiveReservationsByOperator(operatorId: string): Promise<InventoryReservation[]>
```

---

## Low Stock Monitoring

### Threshold Configuration

```typescript
@Entity('inventory_difference_thresholds')
class InventoryDifferenceThreshold extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  nomenclature_id: string;           // Specific item or null for default

  @Column({ type: 'varchar', length: 50 })
  inventory_level: string;           // warehouse, operator, machine

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  min_threshold: number;             // Alert below this

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_threshold: number;             // Alert above this

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 50, default: 'medium' })
  alert_priority: 'low' | 'medium' | 'high' | 'critical';
}
```

### Low Stock Query

```
GET /api/inventory/warehouse/low-stock

Response: 200 OK
[
  {
    "id": "uuid",
    "nomenclature": {
      "id": "uuid",
      "name": "Coffee Beans",
      "sku": "CB-001"
    },
    "current_quantity": 5.5,
    "reserved_quantity": 2.0,
    "available_quantity": 3.5,
    "min_stock_level": 10.0,
    "location_in_warehouse": "Shelf A-12"
  }
]

GET /api/inventory/machines/low-stock

Response: 200 OK
[
  {
    "id": "uuid",
    "machine": {
      "id": "uuid",
      "machine_number": "M-001",
      "name": "Coffee Machine Lobby"
    },
    "nomenclature": { "id": "uuid", "name": "Sugar" },
    "current_quantity": 2.0,
    "min_stock_level": 5.0,
    "slot_number": "B-3"
  }
]
```

### Threshold Actions

```typescript
// Automatic actions when thresholds are crossed
@Injectable()
export class InventoryThresholdActionsService {
  // Check and process all low stock items
  async processLowStockAlerts(): Promise<void> {
    const warehouseLow = await this.inventoryService.getWarehouseLowStock();
    const machineLow = await this.inventoryService.getMachinesLowStock();

    for (const item of warehouseLow) {
      await this.createLowStockNotification('warehouse', item);
    }

    for (const item of machineLow) {
      await this.createLowStockNotification('machine', item);
      await this.suggestRefillTask(item);
    }
  }
}
```

---

## Inventory Adjustments

### Overview

Adjustments correct inventory discrepancies discovered during audits or counts:

```typescript
export enum AdjustmentReason {
  COUNT_CORRECTION = 'count_correction',   // Physical count difference
  DAMAGE = 'damage',                       // Damaged goods
  EXPIRATION = 'expiration',               // Expired products
  THEFT = 'theft',                         // Suspected theft
  SPILLAGE = 'spillage',                   // Accidental spillage
  SYSTEM_ERROR = 'system_error',           // System correction
  OTHER = 'other',
}

@Entity('inventory_adjustments')
class InventoryAdjustment extends BaseEntity {
  @Column({ type: 'varchar', length: 20 })
  inventory_level: 'warehouse' | 'operator' | 'machine';

  @Column({ type: 'uuid' })
  reference_id: string;              // warehouse/operator/machine id

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_before: number;           // Before adjustment

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_after: number;            // After adjustment

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  adjustment_quantity: number;       // Difference (can be negative)

  @Column({ type: 'enum', enum: AdjustmentReason })
  reason: AdjustmentReason;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid' })
  performed_by_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string;       // For large adjustments

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date;
}
```

### Adjustment API

```
POST /api/inventory/adjustments
Authorization: Bearer <token>
Content-Type: application/json

{
  "inventory_level": "machine",
  "reference_id": "machine-uuid",
  "nomenclature_id": "product-uuid",
  "quantity_after": 45.5,
  "reason": "count_correction",
  "notes": "Physical count during audit"
}

Response: 201 Created
{
  "id": "uuid",
  "inventory_level": "machine",
  "quantity_before": 50.0,
  "quantity_after": 45.5,
  "adjustment_quantity": -4.5,
  "reason": "count_correction",
  "performed_by": { "id": "uuid", "full_name": "John Doe" }
}
```

---

## Sales Recording

### Sales Deduction

When products are sold from a machine, inventory is deducted:

```typescript
async recordSale(dto: RecordSaleDto, userId: string): Promise<MachineInventory>

interface RecordSaleDto {
  machine_id: string;
  nomenclature_id: string;
  quantity: number;           // Quantity sold
  sale_amount?: number;       // Optional sale price
  transaction_id?: string;    // Link to financial transaction
}
```

**Process:**
1. Find machine inventory record
2. Validate sufficient quantity
3. Deduct sold quantity
4. Record movement (MACHINE_SALE)
5. Return updated inventory

### Integration with Sales Import

```
┌────────────────────────────────────────────────────────────────────┐
│                    SALES IMPORT FLOW                               │
└────────────────────────────────────────────────────────────────────┘

1. Sales data imported (CSV/Excel/API)
2. For each sale line:
   ├── Find machine by machine_number
   ├── Find nomenclature by SKU/name
   ├── Calculate quantity from recipe
   └── Call recordSale()
3. Update machine cash amount
4. Generate sales report
```

---

## Inventory Counts

### Physical Count Process

```typescript
@Entity('inventory_actual_counts')
class InventoryActualCount extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  count_number: string;              // "CNT-2025-001"

  @Column({ type: 'varchar', length: 20 })
  inventory_level: 'warehouse' | 'operator' | 'machine';

  @Column({ type: 'uuid' })
  reference_id: string;

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  system_quantity: number;           // What system shows

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  actual_quantity: number;           // Physical count

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  difference: number;                // Computed

  @Column({ type: 'uuid' })
  counted_by_user_id: string;

  @Column({ type: 'timestamp with time zone' })
  counted_at: Date;

  @Column({ type: 'boolean', default: false })
  adjustment_created: boolean;       // Was adjustment created?

  @Column({ type: 'uuid', nullable: true })
  adjustment_id: string;             // Link to adjustment
}
```

### Count Workflow

```
┌────────────────────────────────────────────────────────────────────┐
│                    INVENTORY COUNT WORKFLOW                         │
└────────────────────────────────────────────────────────────────────┘

1. CREATE COUNT SESSION
   POST /api/inventory/counts/start
   {
     "inventory_level": "machine",
     "reference_id": "machine-uuid"
   }
   → Returns list of items to count

2. RECORD COUNTS
   POST /api/inventory/counts
   {
     "inventory_level": "machine",
     "reference_id": "machine-uuid",
     "items": [
       { "nomenclature_id": "uuid", "actual_quantity": 45.5 },
       { "nomenclature_id": "uuid", "actual_quantity": 12.0 }
     ]
   }
   → Records counts, calculates differences

3. REVIEW DIFFERENCES
   GET /api/inventory/counts/{countId}/differences
   → Shows items with discrepancies

4. CREATE ADJUSTMENTS
   POST /api/inventory/counts/{countId}/apply-adjustments
   → Creates adjustments for all differences

5. FINALIZE COUNT
   POST /api/inventory/counts/{countId}/finalize
   → Marks count as complete
```

---

## Reports and Export

### Available Reports

| Report | Description | Format |
|--------|-------------|--------|
| Warehouse Summary | Current warehouse inventory | PDF, Excel |
| Operator Inventory | Stock by operator | PDF, Excel |
| Machine Inventory | Stock by machine | PDF, Excel |
| Movement History | All movements in period | Excel, CSV |
| Low Stock Report | Items below threshold | PDF |
| Adjustment Report | All adjustments in period | PDF, Excel |

### Report Presets

```typescript
@Entity('inventory_report_presets')
class InventoryReportPreset extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;                      // "Weekly Machine Report"

  @Column({ type: 'varchar', length: 50 })
  report_type: string;               // machine_inventory, movements, etc.

  @Column({ type: 'jsonb' })
  filters: Record<string, any>;      // Saved filter settings

  @Column({ type: 'jsonb', nullable: true })
  columns: string[];                 // Selected columns

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @Column({ type: 'boolean', default: false })
  is_public: boolean;                // Shared with team?
}
```

### Export API

```
GET /api/inventory/export/warehouse?format=excel

GET /api/inventory/export/movements?
  format=csv&
  dateFrom=2025-12-01&
  dateTo=2025-12-31&
  movementType=operator_to_machine

GET /api/inventory/export/pdf/machine/{machineId}
→ Downloads PDF report
```

---

## API Reference

### Warehouse Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/warehouse` | List all warehouse inventory |
| `GET` | `/inventory/warehouse/{nomenclatureId}` | Get specific item |
| `POST` | `/inventory/warehouse/add` | Add stock (purchase) |
| `POST` | `/inventory/warehouse/remove` | Remove stock (write-off) |
| `PATCH` | `/inventory/warehouse/{nomenclatureId}` | Update settings |
| `GET` | `/inventory/warehouse/low-stock` | Get low stock items |

### Operator Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/operator/{operatorId}` | Get operator inventory |
| `GET` | `/inventory/operator/{operatorId}/{nomenclatureId}` | Get specific item |

### Machine Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/machine/{machineId}` | Get machine inventory |
| `GET` | `/inventory/machine/{machineId}/{nomenclatureId}` | Get specific item |
| `POST` | `/inventory/machine/sale` | Record sale |
| `PATCH` | `/inventory/machine/{machineId}/{nomenclatureId}` | Update settings |
| `GET` | `/inventory/machines/low-stock` | Get low stock machines |

### Transfers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/inventory/transfer/warehouse-to-operator` | Issue to operator |
| `POST` | `/inventory/transfer/operator-to-warehouse` | Return to warehouse |
| `POST` | `/inventory/transfer/operator-to-machine` | Load machine |
| `POST` | `/inventory/transfer/machine-to-operator` | Remove from machine |

### Movements

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/movements` | Query movements |
| `GET` | `/inventory/movements/stats` | Movement statistics |

### Reservations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/reservations` | Active reservations |
| `GET` | `/inventory/reservations/task/{taskId}` | By task |
| `GET` | `/inventory/reservations/operator/{operatorId}` | By operator |

---

## Integration with Tasks

### Task Creation (Refill)

```typescript
// In TasksService.create()
if (taskData.type_code === TaskType.REFILL && taskData.assigned_to_user_id) {
  const reservationItems = items.map((item) => ({
    nomenclature_id: item.nomenclature_id,
    quantity: item.planned_quantity,
  }));

  await this.inventoryService.createReservation(
    savedTask.id,
    taskData.assigned_to_user_id,
    reservationItems,
    24, // expires in 24 hours
  );
}
```

### Task Completion (Refill)

```typescript
// In TaskCompletionService.processRefillTask()
// 1. Fulfill reservation
await this.inventoryService.fulfillReservation(task.id);

// 2. Transfer inventory
for (const taskItem of task.items) {
  await this.inventoryService.transferOperatorToMachine({
    operator_id: task.assigned_to_user_id,
    machine_id: task.machine_id,
    nomenclature_id: taskItem.nomenclature_id,
    quantity: Number(taskItem.actual_quantity || taskItem.planned_quantity),
    task_id: task.id,
    operation_date: completeTaskDto.operation_date,
  }, userId);
}
```

### Task Rejection (Refill)

```typescript
// In TaskRejectionService.rollbackRefillInventory()
for (const taskItem of task.items) {
  // Reverse: Machine → Operator
  await this.inventoryService.transferMachineToOperator({
    operator_id: task.assigned_to_user_id,
    machine_id: task.machine_id,
    nomenclature_id: taskItem.nomenclature_id,
    quantity: Number(taskItem.actual_quantity || taskItem.planned_quantity),
    notes: `ROLLBACK task ${task.id}`,
  }, userId);
}
```

### Task Cancellation

```typescript
// In TasksService.cancelTask()
await this.inventoryService.cancelReservation(task.id);
// Reservations released, operator inventory available again
```

---

## Error Handling

### Common Errors

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Insufficient quantity | 400 | "Not enough stock. Available: X, Requested: Y" |
| Item not found | 404 | "Product {id} not found in {location}" |
| Invalid transfer | 400 | "Cannot transfer to same location" |
| Reservation expired | 400 | "Reservation has expired" |
| Already fulfilled | 400 | "Reservation already fulfilled" |

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Not enough stock at warehouse. Available: 5.5, Requested: 10.0",
  "error": "Bad Request",
  "timestamp": "2025-12-20T12:00:00.000Z",
  "path": "/api/inventory/transfer/warehouse-to-operator"
}
```

### Transaction Safety

All transfers use pessimistic locking to prevent race conditions:

```typescript
return await this.dataSource.transaction(async (manager) => {
  // Lock records for update
  const warehouseInventory = await manager.findOne(WarehouseInventory, {
    where: { nomenclature_id: dto.nomenclature_id },
    lock: { mode: 'pessimistic_write' },
  });

  // Perform operations atomically
  // ...
});
```

---

## Related Documentation

- [Task System](./TASK_SYSTEM.md) - Task workflows that trigger inventory operations
- [Machines](./MACHINES.md) - Machine management
- [Transactions](./TRANSACTIONS.md) - Financial operations
- [API Reference](./API_REFERENCE.md) - Complete API documentation

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintained By**: VendHub Development Team
