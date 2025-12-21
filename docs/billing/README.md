# Billing Module

## Overview

The Billing module manages invoices and payments for VendHub Manager. It handles the complete invoicing lifecycle from draft creation through payment collection, with full support for Uzbekistan's financial regulations including НДС (VAT) at 15%.

## Key Features

- Invoice generation and management
- Payment tracking and reconciliation
- Multi-line item support
- Tax calculations (НДС 15%)
- Overdue invoice detection
- Currency support (UZS)

## Entities

### Invoice

The `Invoice` entity tracks all invoices issued to customers.

**File**: `backend/src/modules/billing/entities/invoice.entity.ts`

```typescript
@Entity('invoices')
export class Invoice extends BaseEntity {
  invoice_number: string;      // Unique invoice number (e.g., "INV-2025-001")
  customer_id: string;         // UUID of customer (User)
  issue_date: Date;            // Invoice issue date
  due_date: Date;              // Payment due date
  status: InvoiceStatus;       // Current status
  subtotal: number;            // Amount before tax
  tax_amount: number;          // НДС 15%
  discount_amount: number;     // Applied discounts
  total_amount: number;        // Final amount
  paid_amount: number;         // Amount paid so far
  currency: string;            // Default: 'UZS'
  notes: string;               // Additional notes
  line_items: LineItem[];      // Invoice line items (JSONB)
  paid_at: Date;               // Payment timestamp
  metadata: Record<string, any>;
}
```

#### Invoice Status Flow

```
┌─────────┐     ┌────────┐     ┌────────┐
│  DRAFT  │────>│  SENT  │────>│  PAID  │
└─────────┘     └────────┘     └────────┘
                   │               ▲
                   │               │
                   ▼               │
              ┌─────────┐         │
              │ OVERDUE │─────────┘
              └─────────┘
                   │
                   ▼
              ┌───────────┐
              │ CANCELLED │
              └───────────┘
```

#### Invoice Statuses

| Status | Value | Description |
|--------|-------|-------------|
| DRAFT | `draft` | Invoice created, not yet sent |
| SENT | `sent` | Invoice sent to customer |
| PAID | `paid` | Fully paid |
| OVERDUE | `overdue` | Past due date, not fully paid |
| CANCELLED | `cancelled` | Invoice cancelled |

### Payment

The `Payment` entity records all payments received.

```typescript
@Entity('payments')
export class Payment extends BaseEntity {
  invoice_id: string;          // Reference to invoice
  payment_date: Date;          // Date of payment
  amount: number;              // Payment amount
  payment_method: string;      // cash, card, transfer, etc.
  reference_number: string;    // Bank/transaction reference
  notes: string;               // Additional notes
  confirmed_by_id: string;     // Who confirmed the payment
  confirmed_at: Date;          // Confirmation timestamp
}
```

### Line Items Structure

Each invoice can contain multiple line items stored as JSONB:

```typescript
interface LineItem {
  description: string;    // Item description
  quantity: number;       // Quantity
  unit_price: number;     // Price per unit (UZS)
  total: number;          // Line total (quantity * unit_price)
}
```

## Tax Calculations

### НДС (VAT) in Uzbekistan

The system uses 15% VAT rate as standard for Uzbekistan:

```typescript
const subtotal = 1000000;  // 1,000,000 UZS
const taxAmount = subtotal * 0.15;  // 150,000 UZS
const totalAmount = subtotal + taxAmount;  // 1,150,000 UZS
```

## API Endpoints

### Invoices

```
POST   /api/billing/invoices           Create new invoice
GET    /api/billing/invoices           List invoices
GET    /api/billing/invoices/:id       Get invoice by ID
PUT    /api/billing/invoices/:id       Update invoice
DELETE /api/billing/invoices/:id       Delete invoice
POST   /api/billing/invoices/:id/send  Mark invoice as sent
```

### Payments

```
POST   /api/billing/payments           Record payment
GET    /api/billing/payments           List payments
GET    /api/billing/payments/:id       Get payment by ID
POST   /api/billing/payments/:id/confirm  Confirm payment
```

## DTOs

### CreateInvoiceDto

```typescript
class CreateInvoiceDto {
  @IsUUID()
  customer_id: string;

  @IsDate()
  issue_date: Date;

  @IsDate()
  due_date: Date;

  @IsArray()
  @ValidateNested({ each: true })
  line_items: CreateLineItemDto[];

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

## Service Methods

### InvoiceService

| Method | Description |
|--------|-------------|
| `create()` | Create new invoice |
| `findAll()` | List invoices with filters |
| `findOne()` | Get single invoice |
| `update()` | Update invoice |
| `remove()` | Soft delete invoice |
| `sendInvoice()` | Mark as sent, notify customer |
| `markAsPaid()` | Mark fully paid |
| `checkOverdue()` | Update overdue status |
| `calculateTotals()` | Recalculate invoice totals |

### PaymentService

| Method | Description |
|--------|-------------|
| `recordPayment()` | Record new payment |
| `confirmPayment()` | Confirm payment received |
| `getPaymentsForInvoice()` | Get all payments for invoice |
| `calculateBalance()` | Get remaining balance on invoice |

## Scheduled Tasks

### Overdue Invoice Detection

A cron job runs daily to detect and mark overdue invoices:

```typescript
@Cron('0 9 * * *')  // Every day at 9 AM
async checkOverdueInvoices() {
  const overdueInvoices = await this.invoiceRepository
    .createQueryBuilder('invoice')
    .where('invoice.status = :status', { status: InvoiceStatus.SENT })
    .andWhere('invoice.due_date < :now', { now: new Date() })
    .andWhere('invoice.paid_amount < invoice.total_amount')
    .getMany();

  for (const invoice of overdueInvoices) {
    invoice.status = InvoiceStatus.OVERDUE;
    await this.invoiceRepository.save(invoice);
    await this.notifyCustomerOverdue(invoice);
  }
}
```

## Integration with Other Modules

### Counterparty

- Links invoices to counterparty contracts
- Validates customer exists

### Notifications

- Sends invoice via email when sent
- Overdue payment reminders
- Payment confirmation notifications

### Audit Logs

- All invoice status changes logged
- Payment confirmations tracked

## Currency Support

Default currency is UZS (Uzbekistan Som). The currency field allows for future multi-currency support.

```typescript
@Column({ type: 'varchar', length: 3, default: 'UZS' })
currency: string;
```

## Best Practices

1. **Always Create Draft First**: Create invoices as drafts, review, then send
2. **Tax Calculation**: Let the system calculate tax, don't set manually
3. **Payment Reconciliation**: Verify payments against bank statements
4. **Overdue Handling**: Process overdue invoices promptly

## Related Modules

- [Counterparty](../counterparty/README.md) - Customer/contract management
- [Transactions](../transactions/README.md) - Financial transactions
- [Notifications](../notifications/README.md) - Invoice notifications
- [Audit Logs](../audit-logs/README.md) - Change tracking
