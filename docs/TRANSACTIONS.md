# Transactions System - VendHub Manager

> **Version**: 1.0.0
> **Last Updated**: 2025-12-20
> **Module**: `backend/src/modules/transactions/`

This document provides comprehensive documentation for the Financial Transactions system, covering sales, collections, expenses, and financial reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Transaction Types](#transaction-types)
3. [Transaction Entity](#transaction-entity)
4. [Sales Recording](#sales-recording)
5. [Collection Recording](#collection-recording)
6. [Expense Recording](#expense-recording)
7. [Refund Processing](#refund-processing)
8. [Statistics and Reports](#statistics-and-reports)
9. [Audit Trail](#audit-trail)
10. [Integration Points](#integration-points)
11. [API Reference](#api-reference)

---

## Overview

### Architecture Principle

The Transactions system tracks all financial operations in VendHub Manager:

```
┌────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL TRANSACTIONS                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  INCOME (Positive)                OUTFLOW (Negative)               │
│  ├── SALE: Product sales          ├── EXPENSE: Operating costs    │
│  └── COLLECTION: Cash collected   └── REFUND: Customer refunds    │
│                                                                     │
│  All transactions:                                                 │
│  ├── Unique transaction number (TXN-YYYYMMDD-XXXX)                │
│  ├── Audit trail (logged to security audit)                       │
│  ├── Event emission (for analytics)                               │
│  └── Soft delete support                                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
transactions/
├── entities/
│   └── transaction.entity.ts       # Transaction entity
├── dto/
│   ├── create-transaction.dto.ts   # Generic + specific DTOs
│   └── update-transaction.dto.ts
├── transactions.service.ts         # Business logic
├── transactions.controller.ts      # REST API
└── transactions.module.ts
```

---

## Transaction Types

### Type Definitions

```typescript
export enum TransactionType {
  SALE = 'sale',           // Product/beverage sale
  COLLECTION = 'collection', // Cash collection from machine
  EXPENSE = 'expense',     // Operating expense
  REFUND = 'refund',       // Customer refund
}
```

### Transaction Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION FLOWS                               │
└────────────────────────────────────────────────────────────────────┘

  SALE                              COLLECTION
  ─────                             ───────────
  Customer → Machine → Sale         Machine → Operator → Office
                  │                                │
                  ▼                                ▼
  - Deduct inventory                - Create collection transaction
  - Create SALE transaction         - Reset machine cash to 0
  - Update machine stats            - Link to collection task


  EXPENSE                           REFUND
  ───────                           ──────
  Business → Supplier               Customer ← Machine
         │                                   │
         ▼                                   ▼
  - Create EXPENSE transaction      - Create REFUND transaction
  - Categorize (rent, purchase...)  - Link to original sale
  - Optional: Link to counterparty  - Update machine stats
```

---

## Transaction Entity

### Entity Definition

```typescript
@Entity('transactions')
@Index(['transaction_type'])
@Index(['machine_id'])
@Index(['user_id'])
@Index(['transaction_date'])
export class Transaction extends BaseEntity {
  // Type and Timing
  @Column({ type: 'enum', enum: TransactionType })
  transaction_type: TransactionType;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  transaction_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sale_date: Date | null;              // Original sale date (from import)

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  transaction_number: string | null;   // "TXN-20241220-0001"

  // Amount
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  // Payment Method
  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  payment_method: PaymentMethod | null;

  // Relationships
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine)
  machine: Machine | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User)
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  contract_id: string | null;          // Auto-linked from machine (Phase 3)

  @Column({ type: 'uuid', nullable: true })
  counterparty_id: string | null;      // For expenses

  // Sale-specific fields
  @Column({ type: 'uuid', nullable: true })
  recipe_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  recipe_snapshot_id: string | null;   // Historical accuracy

  @Column({ type: 'integer', nullable: true })
  recipe_version: number | null;

  @Column({ type: 'integer', nullable: true })
  quantity: number | null;

  // Expense-specific fields
  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  expense_category: ExpenseCategory | null;

  // Collection-specific fields
  @Column({ type: 'uuid', nullable: true })
  collection_task_id: string | null;

  // Additional data
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

### Payment Methods

```typescript
export enum PaymentMethod {
  CASH = 'cash',           // Cash payment
  CARD = 'card',           // Bank card
  MOBILE = 'mobile',       // Apple Pay, Google Pay
  QR = 'qr',              // QR code payment
}
```

### Expense Categories

```typescript
export enum ExpenseCategory {
  RENT = 'rent',               // Location rental
  PURCHASE = 'purchase',       // Stock purchase
  REPAIR = 'repair',           // Repair costs
  SALARY = 'salary',           // Salaries
  UTILITIES = 'utilities',     // Utilities
  DEPRECIATION = 'depreciation', // Equipment depreciation
  WRITEOFF = 'writeoff',       // Equipment/stock writeoff
  OTHER = 'other',             // Other expenses
}
```

---

## Sales Recording

### Overview

Sales recording integrates with inventory management:

```
┌────────────────────────────────────────────────────────────────────┐
│                    SALE RECORDING FLOW                             │
└────────────────────────────────────────────────────────────────────┘

  1. Create Transaction Record
     ├── Generate transaction number
     ├── Auto-link to machine contract (Phase 3)
     └── Emit 'transaction.created' event

  2. Inventory Deduction (if recipe provided)
     ├── Fetch recipe ingredients
     ├── For each ingredient:
     │   ├── Deduct from machine inventory
     │   └── On failure: Create incident (don't fail sale)
     └── Log all deductions

  3. Update Machine Stats
     └── Increment total_sales_count, total_revenue
```

### Sale Recording Code

```typescript
async recordSale(dto: RecordSaleDto): Promise<Transaction> {
  // 1. Create transaction record
  const transaction = await this.create({
    transaction_type: TransactionType.SALE,
    amount: dto.amount,
    payment_method: dto.payment_method,
    machine_id: dto.machine_id,
    recipe_id: dto.recipe_id,
    quantity: dto.quantity || 1,
    metadata: dto.metadata,
  });

  // 2. Deduct inventory if recipe provided
  if (dto.recipe_id) {
    const recipe = await this.recipesService.findOne(dto.recipe_id);

    for (const item of recipe.ingredients) {
      const quantityToDeduct = Number(item.quantity) * (dto.quantity || 1);

      try {
        await this.inventoryService.deductFromMachine(
          dto.machine_id,
          item.ingredient_id,
          quantityToDeduct,
          `Sale: ${recipe.name} x${dto.quantity || 1}`
        );
      } catch (error) {
        // Don't fail sale, but create incident
        await this.incidentsService.create({
          incident_type: IncidentType.OUT_OF_STOCK,
          priority: IncidentPriority.MEDIUM,
          machine_id: dto.machine_id,
          title: `Inventory mismatch: ${item.ingredient?.name}`,
          description: `Failed to deduct ${quantityToDeduct} units`,
        });
      }
    }
  }

  return transaction;
}
```

### Sale DTO

```typescript
interface RecordSaleDto {
  machine_id: string;              // Required
  amount: number;                   // Sale amount
  payment_method: PaymentMethod;    // How customer paid
  recipe_id?: string;              // Optional: Link to recipe for inventory
  quantity?: number;               // Default: 1
  metadata?: Record<string, any>;  // Additional data
}
```

### Sale API

```
POST /api/transactions/sale
Authorization: Bearer <token>
Content-Type: application/json

{
  "machine_id": "uuid",
  "amount": 15000,
  "payment_method": "cash",
  "recipe_id": "uuid",
  "quantity": 1
}

Response: 201 Created
{
  "id": "uuid",
  "transaction_number": "TXN-20251220-0001",
  "transaction_type": "sale",
  "amount": 15000,
  "payment_method": "cash",
  "machine": { "id": "uuid", "machine_number": "M-001" },
  "recipe_id": "uuid",
  "quantity": 1,
  "transaction_date": "2025-12-20T10:30:00Z"
}
```

---

## Collection Recording

### Overview

Collection transactions record cash removed from machines during collection tasks:

```
┌────────────────────────────────────────────────────────────────────┐
│                    COLLECTION FLOW                                 │
└────────────────────────────────────────────────────────────────────┘

  Collection Task                    Transaction Created
  ──────────────                     ───────────────────
  1. Operator starts task            4. Create COLLECTION transaction
  2. Takes photos before/after       5. Link to collection_task_id
  3. Reports actual_cash_amount      6. Update machine cash to 0
                                     7. Check for discrepancy (>10%)
                                        └── If yes: Create incident
```

### Collection Recording Code

```typescript
async recordCollection(dto: RecordCollectionDto): Promise<Transaction> {
  return this.create({
    transaction_type: TransactionType.COLLECTION,
    amount: dto.amount,
    payment_method: PaymentMethod.CASH,
    machine_id: dto.machine_id,
    user_id: dto.user_id,
    collection_task_id: dto.collection_task_id,
    description: dto.description || 'Collection',
  });
}
```

### Collection DTO

```typescript
interface RecordCollectionDto {
  machine_id: string;              // Machine collected from
  amount: number;                   // Actual cash collected
  user_id?: string;                // Operator who collected
  collection_task_id?: string;     // Link to collection task
  description?: string;            // Optional notes
}
```

### Integration with Collection Tasks

```typescript
// In TaskCompletionService.processCollectionTask()
await this.transactionsService.recordCollection({
  amount: actualCashAmount,
  machine_id: task.machine_id,
  user_id: userId,
  collection_task_id: task.id,
  description: `Collection from ${machine.machine_number}`,
});

// Reset machine cash
await this.machinesService.updateStats(task.machine_id, {
  current_cash_amount: 0,
  last_collection_date: new Date(),
});
```

---

## Expense Recording

### Overview

Expense transactions track operating costs:

```
┌────────────────────────────────────────────────────────────────────┐
│                    EXPENSE CATEGORIES                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RENT          │ Location/space rental payments                   │
│  PURCHASE      │ Stock, ingredients, supplies                     │
│  REPAIR        │ Machine repairs, spare parts                     │
│  SALARY        │ Staff salaries and wages                         │
│  UTILITIES     │ Electricity, water, internet                     │
│  DEPRECIATION  │ Monthly equipment depreciation                   │
│  WRITEOFF      │ Equipment/stock writeoff                         │
│  OTHER         │ Miscellaneous expenses                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Expense Recording Code

```typescript
async recordExpense(dto: RecordExpenseDto): Promise<Transaction> {
  return this.create({
    transaction_type: TransactionType.EXPENSE,
    amount: dto.amount,
    payment_method: dto.payment_method || PaymentMethod.CASH,
    user_id: dto.user_id,
    expense_category: dto.expense_category,
    description: dto.description,
    metadata: dto.metadata,
  });
}
```

### Expense DTO

```typescript
interface RecordExpenseDto {
  amount: number;                        // Expense amount
  expense_category: ExpenseCategory;     // Category
  payment_method?: PaymentMethod;        // How paid
  user_id?: string;                      // Who recorded
  description?: string;                  // Details
  counterparty_id?: string;              // Supplier (optional)
  metadata?: {
    invoice_number?: string;
    supplier?: string;
    receipt_url?: string;
  };
}
```

### Expense API

```
POST /api/transactions/expense
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500000,
  "expense_category": "purchase",
  "payment_method": "card",
  "description": "Coffee beans purchase from Supplier A",
  "metadata": {
    "invoice_number": "INV-2024-001",
    "supplier": "Coffee Beans Ltd"
  }
}

Response: 201 Created
{
  "id": "uuid",
  "transaction_number": "TXN-20251220-0002",
  "transaction_type": "expense",
  "amount": 500000,
  "expense_category": "purchase",
  "description": "Coffee beans purchase from Supplier A"
}
```

---

## Refund Processing

### Overview

Refund transactions compensate customers or correct errors:

```
┌────────────────────────────────────────────────────────────────────┐
│                    REFUND SCENARIOS                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Customer complaint refund                                      │
│     └── Link to original sale transaction                         │
│                                                                     │
│  2. Task rejection rollback                                        │
│     └── Created automatically when collection task rejected       │
│                                                                     │
│  3. System correction                                              │
│     └── Manual correction of incorrect transactions               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Refund Creation

```typescript
// Refund for task rejection (automatic)
await this.transactionsService.create({
  transaction_type: TransactionType.REFUND,
  machine_id: task.machine_id,
  amount: actualCashAmount,
  description: `ROLLBACK collection task ${task.id}`,
  metadata: {
    original_task_id: task.id,
    rejection_reason: reason,
  },
});
```

---

## Statistics and Reports

### Overall Statistics

```typescript
async getStats(dateFrom?: Date, dateTo?: Date) {
  return {
    total: count,                    // Total transactions
    by_type: [                       // Breakdown by type
      { type: 'sale', count: 1500, total_amount: 22500000 },
      { type: 'collection', count: 50, total_amount: 15000000 },
      { type: 'expense', count: 30, total_amount: 8000000 },
    ],
    by_payment_method: [             // Payment method breakdown
      { method: 'cash', count: 800, total_amount: 12000000 },
      { method: 'card', count: 700, total_amount: 10500000 },
    ],
    by_expense_category: [           // Expense category breakdown
      { category: 'purchase', count: 15, total_amount: 5000000 },
      { category: 'rent', count: 5, total_amount: 2500000 },
    ],
    total_revenue: 22500000,         // Sum of sales
    total_expenses: 8000000,         // Sum of expenses
    total_collections: 15000000,     // Sum of collections
    net_profit: 14500000,            // revenue - expenses
  };
}
```

### Machine Statistics

```typescript
async getMachineStats(machineId: string, dateFrom?: Date, dateTo?: Date) {
  return {
    sales_count: 250,               // Number of sales
    total_revenue: 3750000,         // Total sales amount
    total_collections: 3500000,     // Total collected
  };
}
```

### Daily Revenue

```typescript
async getDailyRevenue(dateFrom: Date, dateTo: Date) {
  return [
    { date: '2025-12-18', total: 750000 },
    { date: '2025-12-19', total: 820000 },
    { date: '2025-12-20', total: 680000 },
  ];
}
```

### Top Recipes

```typescript
async getTopRecipes(limit: number = 10) {
  return [
    { recipe_id: 'uuid1', sales_count: 450, total_revenue: 6750000 },
    { recipe_id: 'uuid2', sales_count: 380, total_revenue: 5700000 },
    // ...
  ];
}
```

### Statistics API

```
# Overall statistics
GET /api/transactions/stats?dateFrom=2025-12-01&dateTo=2025-12-31

# Machine statistics
GET /api/transactions/stats/machine/{machineId}

# Daily revenue
GET /api/transactions/daily-revenue?dateFrom=2025-12-01&dateTo=2025-12-31

# Top recipes
GET /api/transactions/top-recipes?limit=10
```

---

## Audit Trail

### Transaction Deletion Audit

All transaction deletions are logged to the audit trail:

```typescript
async remove(id: string, userId?: string): Promise<void> {
  const transaction = await this.findOne(id);

  // CRITICAL: Log to audit trail before deletion
  await this.auditLogService.log({
    event_type: AuditEventType.TRANSACTION_DELETED,
    user_id: userId,
    severity: AuditSeverity.WARNING,
    description: `Transaction ${transaction.transaction_number} deleted`,
    metadata: {
      transaction_id: transaction.id,
      transaction_number: transaction.transaction_number,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      currency: transaction.currency,
      machine_id: transaction.machine_id,
      original_date: transaction.transaction_date,
      deleted_at: new Date().toISOString(),
    },
  });

  await this.transactionRepository.softRemove(transaction);
}
```

### Event Emission

All transactions emit events for analytics:

```typescript
// Emitted on every transaction creation
this.eventEmitter.emit('transaction.created', {
  transaction: savedTransaction,
  date: savedTransaction.sale_date || savedTransaction.transaction_date,
});
```

---

## Integration Points

### Task System

```
Collection Task Completion → recordCollection() → Transaction created
Task Rejection (Collection) → Create REFUND transaction
Task Rejection (Refill) → No transaction (inventory rollback only)
```

### Inventory System

```
Sale with Recipe → recordSale() → Inventory deducted per ingredient
Inventory Deduction Failure → Create incident, sale still recorded
```

### Machine System

```
Collection → Reset machine.current_cash_amount to 0
Sale → Update machine.total_sales_count, total_revenue
```

### Analytics System

```
Transaction Created → Emit 'transaction.created' event
Event Handler → Update analytics tables
```

### Contract System (Phase 3)

```
Machine with Contract → Auto-link transaction.contract_id
Commission Calculation → Based on contract terms
```

---

## API Reference

### Transaction CRUD

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/transactions` | Create transaction | ADMIN, MANAGER |
| `GET` | `/transactions` | List with filters | All |
| `GET` | `/transactions/:id` | Get by ID | All |
| `DELETE` | `/transactions/:id` | Soft delete (audited) | ADMIN |

### Specific Transaction Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions/sale` | Record sale |
| `POST` | `/transactions/collection` | Record collection |
| `POST` | `/transactions/expense` | Record expense |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions/stats` | Overall statistics |
| `GET` | `/transactions/stats/machine/:id` | Machine statistics |
| `GET` | `/transactions/daily-revenue` | Daily revenue |
| `GET` | `/transactions/top-recipes` | Top selling recipes |

### Query Parameters

```
GET /api/transactions?
  transactionType=sale&
  machineId=uuid&
  userId=uuid&
  dateFrom=2025-12-01&
  dateTo=2025-12-31
```

---

## Transaction Number Format

```
TXN-YYYYMMDD-XXXX

Example: TXN-20251220-0001
         │   │        │
         │   │        └── Sequence (4 digits, resets daily)
         │   └── Date (YYYYMMDD)
         └── Prefix (TXN)
```

### Generation Logic

```typescript
private async generateTransactionNumber(): Promise<string> {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Count today's transactions
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await this.transactionRepository
    .createQueryBuilder('transaction')
    .where('transaction.transaction_date BETWEEN :start AND :end', {
      start: startOfDay,
      end: endOfDay,
    })
    .getCount();

  const sequence = (count + 1).toString().padStart(4, '0');

  return `TXN-${dateStr}-${sequence}`;
}
```

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintained By**: VendHub Development Team
