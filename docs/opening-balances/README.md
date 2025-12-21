# Opening Balances Module

## Overview

The Opening Balances module manages initial stock inventory for VendHub Manager. It handles the setup of starting inventory quantities and costs for warehouses, enabling accurate inventory tracking from day one.

## Key Features

- Initial stock quantity setup
- Cost and pricing entry
- Batch number tracking
- Expiry date management
- Import from Excel/CSV
- Apply balances to live inventory
- Audit trail for changes

## Entity

### StockOpeningBalance

**File**: `backend/src/modules/opening-balances/entities/opening-balance.entity.ts`

```typescript
@Entity('stock_opening_balances')
@Index(['nomenclature_id', 'warehouse_id', 'balance_date'], { unique: true })
@Index(['balance_date'])
@Index(['is_applied'])
export class StockOpeningBalance extends BaseEntity {
  // Product reference
  nomenclature_id: string;         // Reference to nomenclature
  nomenclature: Nomenclature;

  // Location
  warehouse_id: string | null;     // Warehouse (null = default/central)
  warehouse: Warehouse;

  // Balance details
  balance_date: Date;              // Start date for accounting
  quantity: number;                // Opening quantity
  unit: string;                    // Unit of measure (шт, кг, л)
  unit_cost: number;               // Cost per unit (UZS)
  total_cost: number;              // Total value (quantity * unit_cost)

  // Batch tracking
  batch_number: string | null;     // Batch/lot number
  expiry_date: Date | null;        // Expiration date
  location: string | null;         // Storage location in warehouse

  // Application status
  is_applied: boolean;             // Applied to inventory
  applied_at: Date | null;         // When applied
  applied_by_id: string | null;    // Who applied
  applied_by: User;

  // Import tracking
  import_source: string | null;    // manual, csv, excel
  import_session_id: string | null; // Import session reference

  notes: string | null;            // Additional notes
}
```

## Workflow

### Opening Balance Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                 OPENING BALANCE WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Create Opening Balances                                      │
│         │                                                        │
│         ├─── Manual Entry (single item)                         │
│         │                                                        │
│         └─── Import (Excel/CSV - bulk)                          │
│                  │                                               │
│                  ▼                                               │
│  2. Review & Validate                                            │
│         │                                                        │
│         ├─── Check totals                                       │
│         ├─── Verify nomenclature matches                         │
│         └─── Correct errors                                      │
│                  │                                               │
│                  ▼                                               │
│  3. Apply to Inventory                                           │
│         │                                                        │
│         ├─── Creates warehouse_inventory records                 │
│         ├─── Sets is_applied = true                             │
│         └─── Records applied_at, applied_by                     │
│                  │                                               │
│                  ▼                                               │
│  4. Normal Operations Begin                                      │
│         │                                                        │
│         └─── Inventory tracking continues from opening balance  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

```
POST   /api/opening-balances           Create single balance
GET    /api/opening-balances           List all balances
GET    /api/opening-balances/:id       Get balance by ID
PUT    /api/opening-balances/:id       Update balance
DELETE /api/opening-balances/:id       Delete balance (if not applied)
POST   /api/opening-balances/import    Import from file
POST   /api/opening-balances/apply     Apply balances to inventory
GET    /api/opening-balances/summary   Get summary by warehouse
```

### Query Filters

```
GET /api/opening-balances?warehouse_id={uuid}&is_applied=false&balance_date=2025-01-01
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `warehouse_id` | uuid | Filter by warehouse |
| `nomenclature_id` | uuid | Filter by product |
| `is_applied` | boolean | Filter by applied status |
| `balance_date` | date | Filter by balance date |
| `import_session_id` | uuid | Filter by import session |

## DTOs

### CreateOpeningBalanceDto

```typescript
class CreateOpeningBalanceDto {
  @IsUUID()
  nomenclature_id: string;

  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsDate()
  balance_date: Date;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  @Min(0)
  unit_cost: number;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsDate()
  expiry_date?: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### UpdateOpeningBalanceDto

```typescript
class UpdateOpeningBalanceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_cost?: number;

  @IsOptional()
  @IsString()
  batch_number?: string;

  @IsOptional()
  @IsDate()
  expiry_date?: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

## Service Methods

### OpeningBalancesService

| Method | Description |
|--------|-------------|
| `create()` | Create single opening balance |
| `findAll()` | List balances with filters |
| `findOne()` | Get balance by ID |
| `update()` | Update balance (if not applied) |
| `remove()` | Delete balance (if not applied) |
| `import()` | Import balances from file |
| `apply()` | Apply balances to inventory |
| `getSummary()` | Get totals by warehouse |
| `validateBeforeApply()` | Validate balances before applying |

## Import Process

### Excel Import Format

| SKU | Warehouse | Quantity | Unit | Unit Cost | Batch | Expiry Date | Location | Notes |
|-----|-----------|----------|------|-----------|-------|-------------|----------|-------|
| COF-001 | Main | 500 | шт | 3000 | LOT-2025-001 | 2025-06-30 | A-1-1 | Initial stock |
| SNK-001 | Main | 1000 | шт | 2000 | LOT-2025-002 | 2025-12-31 | A-1-2 | |

### Import Endpoint

```typescript
@Post('import')
@UseInterceptors(FileInterceptor('file'))
async import(
  @UploadedFile() file: Express.Multer.File,
  @Query('warehouse_id') warehouseId: string,
  @Query('balance_date') balanceDate: string,
  @CurrentUser() user: User,
): Promise<ImportResult> {
  return this.openingBalancesService.import(file, {
    warehouseId,
    balanceDate: new Date(balanceDate),
    userId: user.id,
  });
}
```

### Import Result

```typescript
interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    sku: string;
    message: string;
  }>;
  summary: {
    totalQuantity: number;
    totalValue: number;
    productCount: number;
  };
  importSessionId: string;
}
```

## Apply Balances

### Apply Process

```typescript
async applyBalances(
  balanceDate: Date,
  warehouseId: string | null,
  userId: string,
): Promise<ApplyResult> {
  // Get unapplied balances
  const balances = await this.repository.find({
    where: {
      balance_date: balanceDate,
      warehouse_id: warehouseId || IsNull(),
      is_applied: false,
    },
    relations: ['nomenclature'],
  });

  if (balances.length === 0) {
    throw new BadRequestException('No balances to apply');
  }

  // Validate all balances
  await this.validateBeforeApply(balances);

  // Apply in transaction
  await this.dataSource.transaction(async (manager) => {
    for (const balance of balances) {
      // Create warehouse inventory record
      await manager.save(WarehouseInventory, {
        warehouse_id: balance.warehouse_id,
        nomenclature_id: balance.nomenclature_id,
        quantity: balance.quantity,
        unit_cost: balance.unit_cost,
        batch_number: balance.batch_number,
        expiry_date: balance.expiry_date,
        location: balance.location,
        created_by_id: userId,
      });

      // Mark balance as applied
      balance.is_applied = true;
      balance.applied_at = new Date();
      balance.applied_by_id = userId;
      await manager.save(balance);
    }
  });

  return {
    success: true,
    appliedCount: balances.length,
    totalQuantity: balances.reduce((sum, b) => sum + b.quantity, 0),
    totalValue: balances.reduce((sum, b) => sum + b.total_cost, 0),
  };
}
```

### Validation Before Apply

```typescript
async validateBeforeApply(balances: StockOpeningBalance[]): Promise<void> {
  const errors: string[] = [];

  for (const balance of balances) {
    // Check nomenclature exists and is active
    if (!balance.nomenclature || !balance.nomenclature.is_active) {
      errors.push(`SKU ${balance.nomenclature_id}: Product not found or inactive`);
    }

    // Check quantity is valid
    if (balance.quantity <= 0) {
      errors.push(`SKU ${balance.nomenclature?.sku}: Quantity must be > 0`);
    }

    // Check unit cost is valid
    if (balance.unit_cost < 0) {
      errors.push(`SKU ${balance.nomenclature?.sku}: Unit cost cannot be negative`);
    }

    // Check for duplicate (same product, warehouse, date already applied)
    const existing = await this.inventoryRepository.findOne({
      where: {
        warehouse_id: balance.warehouse_id,
        nomenclature_id: balance.nomenclature_id,
      },
    });

    if (existing) {
      errors.push(`SKU ${balance.nomenclature?.sku}: Inventory already exists for this warehouse`);
    }
  }

  if (errors.length > 0) {
    throw new BadRequestException({
      message: 'Validation failed',
      errors,
    });
  }
}
```

## Summary Report

### Get Summary

```typescript
async getSummary(warehouseId?: string): Promise<OpeningBalanceSummary> {
  const query = this.repository
    .createQueryBuilder('ob')
    .select([
      'ob.warehouse_id',
      'COUNT(DISTINCT ob.nomenclature_id) as product_count',
      'SUM(ob.quantity) as total_quantity',
      'SUM(ob.total_cost) as total_value',
      'SUM(CASE WHEN ob.is_applied THEN 1 ELSE 0 END) as applied_count',
      'SUM(CASE WHEN ob.is_applied THEN 0 ELSE 1 END) as pending_count',
    ])
    .groupBy('ob.warehouse_id');

  if (warehouseId) {
    query.where('ob.warehouse_id = :warehouseId', { warehouseId });
  }

  const results = await query.getRawMany();

  return results.map(r => ({
    warehouse_id: r.warehouse_id,
    product_count: parseInt(r.product_count),
    total_quantity: parseFloat(r.total_quantity),
    total_value: parseFloat(r.total_value),
    applied_count: parseInt(r.applied_count),
    pending_count: parseInt(r.pending_count),
  }));
}
```

## Cost Calculation

### Automatic Total Cost

```typescript
@BeforeInsert()
@BeforeUpdate()
calculateTotalCost() {
  this.total_cost = this.quantity * this.unit_cost;
}
```

## Integration with Other Modules

### Nomenclature

- Links to product catalog
- Validates SKU exists

### Warehouse

- Associates with specific warehouse
- Enables per-warehouse balances

### Inventory

- Creates initial inventory records
- Sets starting quantities

### Data Parser

- Parses Excel/CSV imports

## Security

### Permission Requirements

| Action | Required Role |
|--------|---------------|
| View balances | Manager, Admin |
| Create/Update | Manager, Admin |
| Delete | Admin only |
| Import | Manager, Admin |
| Apply | Admin only |

### Audit Trail

All changes are tracked:
- Who created the balance
- Who applied it
- Import session reference

## Best Practices

1. **Single Balance Date**: Use consistent balance date for all initial entries
2. **Complete Before Apply**: Import all balances before applying
3. **Verify Totals**: Check summary matches physical inventory
4. **Backup Before Apply**: Applying is irreversible
5. **Use Batch Numbers**: Track batches for expiry management
6. **Document Notes**: Add context to unusual entries

## Error Handling

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Duplicate entry | Same product/warehouse/date | Remove duplicate |
| Product not found | Invalid SKU | Check nomenclature |
| Already applied | Trying to modify applied balance | Cannot modify |
| Inventory exists | Product already in inventory | Use adjustment instead |

## Related Modules

- [Nomenclature](../nomenclature/README.md) - Product catalog
- [Warehouse](../warehouse/README.md) - Warehouse management
- [Inventory](../inventory/README.md) - Inventory tracking
- [Data Parser](../data-parser/README.md) - File import
- [Intelligent Import](../intelligent-import/README.md) - Smart import
