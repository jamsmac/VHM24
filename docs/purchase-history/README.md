# Purchase History Module

## Overview

The Purchase History module tracks all product purchases from suppliers in VendHub Manager. It maintains a complete record of procurement including prices, quantities, batches, VAT calculations, and supplier information.

## Key Features

- Complete purchase record tracking
- Supplier and product linkage
- Batch and expiry tracking
- VAT calculations (15% Uzbekistan)
- Multi-currency support (UZS default)
- Import from Excel/CSV
- Purchase analytics

## Entity

### PurchaseHistory

**File**: `backend/src/modules/purchase-history/entities/purchase-history.entity.ts`

```typescript
@Entity('purchase_history')
@Index(['purchase_date'])
@Index(['supplier_id'])
@Index(['nomenclature_id'])
@Index(['invoice_number'])
export class PurchaseHistory extends BaseEntity {
  // Purchase info
  purchase_date: Date;              // Purchase date
  invoice_number: string | null;    // Invoice/счёт-фактура number

  // Supplier
  supplier_id: string;
  supplier: Counterparty;           // Supplier reference

  // Product
  nomenclature_id: string;
  nomenclature: Nomenclature;       // Product reference

  // Destination
  warehouse_id: string | null;
  warehouse: Warehouse;             // Target warehouse

  // Quantities
  quantity: number;                 // Quantity purchased
  unit: string | null;              // Unit of measure

  // Pricing (UZS)
  unit_price: number;               // Price per unit (excl. VAT)
  vat_rate: number;                 // VAT rate (default 15%)
  vat_amount: number;               // VAT amount
  total_amount: number;             // Total with VAT

  // Batch tracking
  batch_number: string | null;      // Batch/lot number
  production_date: Date | null;     // Production date
  expiry_date: Date | null;         // Expiry date

  // Status
  status: PurchaseStatus;           // Purchase status

  // Delivery
  delivery_date: Date | null;       // Actual delivery date
  delivery_note_number: string | null; // Delivery note

  // Currency
  currency: string;                 // Currency code (default UZS)
  exchange_rate: number | null;     // Exchange rate to UZS

  // Payment
  payment_method: string | null;    // Payment method
  payment_date: Date | null;        // Payment date

  // Tracking
  created_by_id: string | null;
  created_by: User;
  import_source: string | null;     // manual, csv, excel
  import_session_id: string | null;

  notes: string | null;
}
```

### Purchase Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Pending | `pending` | Awaiting delivery |
| Received | `received` | Fully received |
| Partial | `partial` | Partially received |
| Cancelled | `cancelled` | Order cancelled |
| Returned | `returned` | Goods returned |

## API Endpoints

```
POST   /api/purchase-history           Create purchase record
GET    /api/purchase-history           List purchases
GET    /api/purchase-history/:id       Get purchase by ID
PUT    /api/purchase-history/:id       Update purchase
DELETE /api/purchase-history/:id       Delete purchase
GET    /api/purchase-history/summary   Get purchase summary
GET    /api/purchase-history/by-supplier/:id  Purchases by supplier
GET    /api/purchase-history/by-product/:id   Purchases by product
```

### Query Filters

```
GET /api/purchase-history?supplier_id={uuid}&from=2025-01-01&to=2025-12-31
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `supplier_id` | uuid | Filter by supplier |
| `nomenclature_id` | uuid | Filter by product |
| `warehouse_id` | uuid | Filter by warehouse |
| `from` | date | Purchase date from |
| `to` | date | Purchase date to |
| `status` | string | Filter by status |
| `batch_number` | string | Filter by batch |

## DTOs

### CreatePurchaseDto

```typescript
class CreatePurchaseDto {
  @IsDate()
  purchase_date: Date;

  @IsOptional()
  @IsString()
  invoice_number?: string;

  @IsUUID()
  supplier_id: string;

  @IsUUID()
  nomenclature_id: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vat_rate?: number;  // Default 15%

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsDate()
  production_date?: Date;

  @IsOptional()
  @IsDate()
  expiry_date?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

## Service Methods

### PurchaseHistoryService

| Method | Description |
|--------|-------------|
| `create()` | Create purchase record |
| `findAll()` | List purchases with filters |
| `findOne()` | Get purchase by ID |
| `update()` | Update purchase |
| `remove()` | Delete purchase |
| `getBySupplier()` | Get purchases for supplier |
| `getByProduct()` | Get purchases for product |
| `getSummary()` | Get purchase statistics |
| `calculateAverageCost()` | Calculate average cost for product |
| `import()` | Import purchases from file |

## VAT Calculation

### Uzbekistan VAT (15%)

```typescript
// Calculate VAT and totals
const unitPrice = 10000;      // 10,000 UZS per unit
const quantity = 100;         // 100 units
const vatRate = 15;           // 15%

const subtotal = unitPrice * quantity;           // 1,000,000 UZS
const vatAmount = subtotal * (vatRate / 100);    // 150,000 UZS
const totalAmount = subtotal + vatAmount;        // 1,150,000 UZS
```

### Automatic Calculation

```typescript
@BeforeInsert()
@BeforeUpdate()
calculateTotals() {
  const subtotal = this.unit_price * this.quantity;
  this.vat_amount = subtotal * (this.vat_rate / 100);
  this.total_amount = subtotal + this.vat_amount;
}
```

## Average Cost Calculation

### FIFO-based Average

```typescript
async calculateAverageCost(nomenclatureId: string): Promise<number> {
  const purchases = await this.purchaseHistoryRepository.find({
    where: {
      nomenclature_id: nomenclatureId,
      status: PurchaseStatus.RECEIVED,
    },
    order: { purchase_date: 'DESC' },
    take: 10, // Last 10 purchases
  });

  if (purchases.length === 0) return 0;

  const totalCost = purchases.reduce((sum, p) => sum + p.unit_price * p.quantity, 0);
  const totalQty = purchases.reduce((sum, p) => sum + p.quantity, 0);

  return totalCost / totalQty;
}
```

## Import from Excel

### Excel Format

| Date | Invoice | Supplier Code | SKU | Quantity | Unit Price | VAT% | Batch | Expiry |
|------|---------|---------------|-----|----------|------------|------|-------|--------|
| 2025-01-15 | INV-001 | SUP-001 | COF-001 | 100 | 3000 | 15 | LOT-001 | 2025-12-31 |

### Import Process

```typescript
async importFromExcel(file: Buffer, userId: string): Promise<ImportResult> {
  const parsed = await this.dataParser.parse(file);
  const results = { success: 0, failed: 0, errors: [] };

  for (const row of parsed.data) {
    try {
      const supplier = await this.findSupplierByCode(row.supplier_code);
      const product = await this.findProductBySku(row.sku);

      await this.create({
        purchase_date: new Date(row.date),
        invoice_number: row.invoice,
        supplier_id: supplier.id,
        nomenclature_id: product.id,
        quantity: parseFloat(row.quantity),
        unit_price: parseFloat(row.unit_price),
        vat_rate: parseFloat(row.vat_rate) || 15,
        batch_number: row.batch,
        expiry_date: row.expiry ? new Date(row.expiry) : null,
        import_source: 'excel',
        created_by_id: userId,
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ row: row.__rowNum__, message: error.message });
    }
  }

  return results;
}
```

## Analytics & Reports

### Purchase Summary

```typescript
interface PurchaseSummary {
  period: { from: Date; to: Date };
  total_purchases: number;
  total_amount: number;
  total_vat: number;
  by_supplier: {
    supplier_name: string;
    amount: number;
    count: number;
  }[];
  by_product: {
    product_name: string;
    quantity: number;
    amount: number;
  }[];
  monthly_trend: {
    month: string;
    amount: number;
  }[];
}
```

### Price History

```typescript
interface PriceHistory {
  nomenclature_id: string;
  product_name: string;
  prices: {
    date: Date;
    unit_price: number;
    supplier_name: string;
    quantity: number;
  }[];
  avg_price: number;
  min_price: number;
  max_price: number;
  price_variance: number;
}
```

## Integration with Other Modules

### Nomenclature

- Links to product catalog
- Updates average cost

### Counterparty

- Supplier information
- Payment terms

### Warehouse

- Delivery destination
- Inventory updates

### Opening Balances

- Initial stock from purchases

### Inventory

- Updates stock on receipt

## Best Practices

1. **Track All Purchases**: Record every purchase for accurate cost tracking
2. **Batch Numbers**: Use for expiry management and traceability
3. **Invoice Numbers**: Link to accounting documents
4. **VAT Accuracy**: Verify VAT calculations match invoices
5. **Regular Reconciliation**: Match purchases with supplier statements

## Related Modules

- [Nomenclature](../nomenclature/README.md) - Product catalog
- [Counterparty](../counterparty/README.md) - Suppliers
- [Warehouse](../warehouse/README.md) - Stock management
- [Inventory](../inventory/README.md) - Inventory tracking
- [Opening Balances](../opening-balances/README.md) - Initial stock
