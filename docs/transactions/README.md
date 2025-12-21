# Transactions Module

## Overview

The Transactions module tracks all financial operations in VendHub Manager: sales, collections, expenses, and refunds. It provides complete financial visibility across the vending machine fleet.

## Key Features

- Multi-type transaction tracking
- Payment method recording
- Expense categorization
- Machine-linked transactions
- Recipe versioning for sales
- Task-linked collections
- Contract-based commission tracking
- Counterparty expense tracking

## Entity

### Transaction

**File**: `backend/src/modules/transactions/entities/transaction.entity.ts`

```typescript
@Entity('transactions')
@Index(['transaction_type'])
@Index(['machine_id'])
@Index(['user_id'])
@Index(['transaction_date'])
export class Transaction extends BaseEntity {
  // Type and timing
  transaction_type: TransactionType;
  transaction_date: Date;          // When transaction occurred
  sale_date: Date | null;          // For sales: actual sale time

  // Amount
  amount: number;                  // In UZS
  currency: string;                // Default: 'UZS'
  payment_method: PaymentMethod | null;

  // Links
  machine_id: string | null;
  machine: Machine | null;
  user_id: string | null;
  user: User | null;
  contract_id: string | null;      // For commission calculation
  contract: Contract | null;
  counterparty_id: string | null;  // For expenses

  // For Sales
  recipe_id: string | null;
  recipe_snapshot_id: string | null;
  recipe_version: number | null;
  quantity: number | null;

  // For Expenses
  expense_category: ExpenseCategory | null;

  // For Collections
  collection_task_id: string | null;

  // Metadata
  description: string | null;
  metadata: Record<string, any> | null;
  transaction_number: string | null;  // "TXN-20241114-001"
}
```

## Transaction Types

```typescript
export enum TransactionType {
  SALE = 'sale',              // Product sale
  COLLECTION = 'collection',  // Cash collection
  EXPENSE = 'expense',        // Business expense
  REFUND = 'refund',          // Customer refund
}
```

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `sale` | Product sale from machine | machine_id, recipe_id, quantity |
| `collection` | Cash collection from machine | machine_id, collection_task_id |
| `expense` | Business expense | expense_category |
| `refund` | Customer refund | original transaction reference |

## Payment Methods

```typescript
export enum PaymentMethod {
  CASH = 'cash',           // Cash payment
  CARD = 'card',           // Bank card
  MOBILE = 'mobile',       // Apple Pay, Google Pay
  QR = 'qr',               // QR code payment
}
```

## Expense Categories

```typescript
export enum ExpenseCategory {
  RENT = 'rent',                 // Location rent
  PURCHASE = 'purchase',         // Product purchase
  REPAIR = 'repair',             // Machine repair
  SALARY = 'salary',             // Employee salary
  UTILITIES = 'utilities',       // Utilities
  DEPRECIATION = 'depreciation', // Equipment depreciation
  WRITEOFF = 'writeoff',         // Equipment/product writeoff
  OTHER = 'other',               // Other expenses
}
```

## API Endpoints

```
POST   /api/transactions              Create transaction
GET    /api/transactions              List transactions
GET    /api/transactions/:id          Get transaction by ID
PUT    /api/transactions/:id          Update transaction
DELETE /api/transactions/:id          Delete transaction
GET    /api/transactions/summary      Get financial summary
GET    /api/transactions/by-machine/:id   Transactions for machine
GET    /api/transactions/by-type/:type    Transactions by type
```

### Query Filters

```
GET /api/transactions?machine_id={uuid}&type=sale&from=2025-01-01&to=2025-12-31
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `machine_id` | uuid | Filter by machine |
| `type` | string | Transaction type |
| `from` | date | Start date |
| `to` | date | End date |
| `payment_method` | string | Payment method |
| `expense_category` | string | Expense category |

## DTOs

### CreateTransactionDto

```typescript
class CreateTransactionDto {
  @IsEnum(TransactionType)
  transaction_type: TransactionType;

  @IsOptional()
  @IsDate()
  transaction_date?: Date;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  machine_id?: string;

  @IsOptional()
  @IsUUID()
  recipe_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  expense_category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  description?: string;
}
```

## Service Methods

### TransactionsService

| Method | Description |
|--------|-------------|
| `create()` | Create transaction |
| `findAll()` | List with filters |
| `findOne()` | Get by ID |
| `update()` | Update transaction |
| `remove()` | Delete transaction |
| `getByMachine()` | Machine transactions |
| `getByType()` | Transactions by type |
| `getSummary()` | Financial summary |
| `getRevenueByMachine()` | Revenue per machine |
| `getExpensesByCategory()` | Expenses breakdown |

## Sales Tracking

### Sale Transaction

```typescript
// Created when product is sold (via import or manual entry)
const sale: Partial<Transaction> = {
  transaction_type: TransactionType.SALE,
  machine_id: machine.id,
  recipe_id: recipe.id,
  recipe_snapshot_id: recipeSnapshot.id,  // Historical accuracy
  recipe_version: recipe.version,
  quantity: 1,
  amount: recipe.price,
  payment_method: PaymentMethod.CASH,
  sale_date: new Date(),
};
```

### Recipe Versioning

Sales link to recipe snapshots for historical accuracy:

```typescript
// When recipe price changes, old sales still show original price
const transaction = await this.transactionRepository.findOne({
  where: { id: transactionId },
  relations: ['recipe_snapshot'],
});

const originalPrice = transaction.recipe_snapshot?.sell_price;
```

## Collection Tracking

### Collection Transaction

```typescript
// Created when operator completes collection task
const collection: Partial<Transaction> = {
  transaction_type: TransactionType.COLLECTION,
  machine_id: task.machine_id,
  collection_task_id: task.id,
  user_id: operator.id,
  amount: collectedCashAmount,
  payment_method: PaymentMethod.CASH,
  description: `Инкассация аппарата ${machine.machine_number}`,
};
```

### Integration with Tasks

```typescript
async completeCollectionTask(taskId: string, amount: number): Promise<void> {
  const task = await this.taskRepository.findOne(taskId);

  // Create collection transaction
  await this.transactionsService.create({
    transaction_type: TransactionType.COLLECTION,
    machine_id: task.machine_id,
    collection_task_id: task.id,
    amount,
  });

  // Update machine cash amount
  await this.machinesService.update(task.machine_id, {
    current_cash_amount: 0,
    last_collection_date: new Date(),
  });
}
```

## Expense Tracking

### Expense Transaction

```typescript
const expense: Partial<Transaction> = {
  transaction_type: TransactionType.EXPENSE,
  expense_category: ExpenseCategory.PURCHASE,
  counterparty_id: supplier.id,
  amount: invoiceAmount,
  description: 'Закупка кофе - Инвойс №123',
  metadata: {
    invoice_number: 'INV-2025-001',
    invoice_date: '2025-01-15',
  },
};
```

### Depreciation Expense

```typescript
// Auto-created by monthly depreciation job
const depreciation: Partial<Transaction> = {
  transaction_type: TransactionType.EXPENSE,
  expense_category: ExpenseCategory.DEPRECIATION,
  machine_id: machine.id,
  amount: monthlyDepreciationAmount,
  description: `Амортизация ${machine.machine_number}`,
};
```

## Financial Reports

### Summary Structure

```typescript
interface TransactionSummary {
  period: { from: Date; to: Date };
  totals: {
    sales: number;
    collections: number;
    expenses: number;
    refunds: number;
    net: number;
  };
  by_machine: {
    machine_number: string;
    revenue: number;
    expenses: number;
  }[];
  by_payment_method: {
    method: PaymentMethod;
    amount: number;
    count: number;
  }[];
  by_expense_category: {
    category: ExpenseCategory;
    amount: number;
  }[];
}
```

### Revenue Calculation

```typescript
async getRevenueByMachine(machineId: string, period: DateRange): Promise<number> {
  const result = await this.transactionRepository
    .createQueryBuilder('t')
    .select('SUM(t.amount)', 'revenue')
    .where('t.machine_id = :machineId', { machineId })
    .andWhere('t.transaction_type = :type', { type: TransactionType.SALE })
    .andWhere('t.transaction_date BETWEEN :from AND :to', period)
    .getRawOne();

  return parseFloat(result?.revenue || 0);
}
```

## Commission Integration

Transactions with `contract_id` are used for commission calculation:

```typescript
// When sale is linked to contract location
const sale: Partial<Transaction> = {
  transaction_type: TransactionType.SALE,
  machine_id: machine.id,
  contract_id: machine.contract_id,  // For commission
  amount: 15000,
};

// Commission service uses this to calculate monthly commission
async calculateCommission(contractId: string, period: DateRange): Promise<number> {
  const sales = await this.transactionRepository.find({
    where: {
      contract_id: contractId,
      transaction_type: TransactionType.SALE,
      transaction_date: Between(period.from, period.to),
    },
  });

  const totalSales = sales.reduce((sum, t) => sum + t.amount, 0);
  const contract = await this.contractRepository.findOne(contractId);

  return totalSales * (contract.commission_rate / 100);
}
```

## Best Practices

1. **Always link to machine** - Sales and collections should always have machine_id
2. **Use recipe snapshots** - For historical price accuracy
3. **Link collection tasks** - Track which task created the collection
4. **Categorize expenses** - Use proper expense categories for reporting
5. **Include metadata** - Store invoice numbers, references in metadata

## Related Modules

- [Machines](../machines/README.md) - Machine revenue
- [Tasks](../tasks/README.md) - Collection tasks
- [Recipes](../recipes/README.md) - Product prices
- [Counterparty](../counterparty/README.md) - Suppliers, commissions
- [Reports](../reports/README.md) - Financial reports

## Extended Documentation

For detailed transaction documentation, see: [TRANSACTIONS.md](../TRANSACTIONS.md)
