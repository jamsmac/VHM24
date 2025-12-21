# Nomenclature Module

## Overview

The Nomenclature module manages the product catalog for VendHub Manager. It handles all products (SKUs) that can be stocked in vending machines, including pricing, inventory levels, and supplier information.

## Key Features

- Complete product catalog management
- SKU-based product identification
- Multi-level pricing (purchase/selling)
- Inventory level tracking (min/max)
- Barcode support
- Ingredient tracking for recipes
- Category classification
- Supplier information

## Entity

### Nomenclature

**File**: `backend/src/modules/nomenclature/entities/nomenclature.entity.ts`

```typescript
@Entity('nomenclature')
export class Nomenclature extends BaseEntity {
  // Identification
  sku: string;                     // Stock Keeping Unit (unique)
  name: string;                    // Product name
  description: string;             // Product description
  barcode: string;                 // Barcode (EAN-13, UPC, etc.)

  // Classification
  category_code: string;           // Category code (e.g., "BEV", "SNACK")
  subcategory_code: string;        // Subcategory code

  // Units
  unit_of_measure_code: string;    // Unit code (шт, кг, л)

  // Pricing (UZS)
  purchase_price: number;          // Cost price
  selling_price: number;           // Retail price
  margin_percent: number;          // Calculated margin

  // Inventory Levels
  min_stock_level: number;         // Minimum stock (trigger reorder)
  max_stock_level: number;         // Maximum stock capacity
  reorder_quantity: number;        // Default reorder amount

  // Product Properties
  shelf_life_days: number;         // Shelf life in days
  weight: number;                  // Weight in grams
  dimensions: Dimensions;          // L x W x H (JSONB)

  // Flags
  is_ingredient: boolean;          // Used in recipes (not sold directly)
  is_active: boolean;              // Currently available

  // Supplier
  primary_supplier_id: string;     // Primary supplier
  supplier_sku: string;            // Supplier's product code

  // Images
  image_url: string;               // Primary product image
  thumbnail_url: string;           // Thumbnail image

  // Metadata
  metadata: Record<string, any>;   // Additional properties
}
```

## Category System

### Standard Categories

| Code | Name | Description |
|------|------|-------------|
| BEV | Beverages | Drinks (cold/hot) |
| SNACK | Snacks | Chips, crackers, etc. |
| CANDY | Confectionery | Chocolate, sweets |
| COFFEE | Coffee | Coffee products |
| WATER | Water | Bottled water |
| DAIRY | Dairy | Milk products |
| INGR | Ingredients | Recipe ingredients |
| OTHER | Other | Miscellaneous items |

### Subcategories Example

```
BEV
├── BEV-COLD     (Cold beverages)
├── BEV-HOT      (Hot beverages)
├── BEV-JUICE    (Juices)
└── BEV-ENERGY   (Energy drinks)

SNACK
├── SNACK-CHIPS  (Chips/Crisps)
├── SNACK-NUTS   (Nuts)
├── SNACK-BARS   (Protein/Energy bars)
└── SNACK-CRACK  (Crackers)
```

## API Endpoints

```
POST   /api/nomenclature           Create product
GET    /api/nomenclature           List products
GET    /api/nomenclature/:id       Get product by ID
GET    /api/nomenclature/sku/:sku  Get product by SKU
PUT    /api/nomenclature/:id       Update product
DELETE /api/nomenclature/:id       Delete product
```

### Query Filters

```
GET /api/nomenclature?category=BEV&is_active=true&min_price=1000&max_price=50000
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category code |
| `subcategory` | string | Filter by subcategory |
| `is_active` | boolean | Active products only |
| `is_ingredient` | boolean | Filter ingredients |
| `min_price` | number | Minimum selling price |
| `max_price` | number | Maximum selling price |
| `search` | string | Search by name/SKU |
| `supplier_id` | uuid | Filter by supplier |

## DTOs

### CreateNomenclatureDto

```typescript
class CreateNomenclatureDto {
  @IsString()
  @MinLength(2)
  sku: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category_code: string;

  @IsOptional()
  @IsString()
  subcategory_code?: string;

  @IsString()
  unit_of_measure_code: string;

  @IsNumber()
  @Min(0)
  purchase_price: number;

  @IsNumber()
  @Min(0)
  selling_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_stock_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_stock_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  shelf_life_days?: number;

  @IsOptional()
  @IsBoolean()
  is_ingredient?: boolean;
}
```

## Service Methods

### NomenclatureService

| Method | Description |
|--------|-------------|
| `create()` | Create new product |
| `findAll()` | List products with filters |
| `findOne()` | Get product by ID |
| `findBySku()` | Get product by SKU |
| `findByBarcode()` | Get product by barcode |
| `update()` | Update product |
| `remove()` | Soft delete product |
| `updatePricing()` | Update purchase/selling prices |
| `getByCategory()` | Get products by category |
| `getLowStock()` | Get products below min level |
| `calculateMargin()` | Calculate margin percentage |

## Inventory Integration

### Stock Level Tracking

The nomenclature links to inventory across all levels:

```
Nomenclature
     │
     ├── Warehouse Inventory (central stock)
     │
     ├── Operator Inventory (assigned to operators)
     │
     └── Machine Inventory (loaded in machines)
```

### Low Stock Detection

```typescript
// Check products below minimum stock
async getLowStockProducts(): Promise<LowStockAlert[]> {
  return this.nomenclatureRepository
    .createQueryBuilder('n')
    .leftJoin('warehouse_inventory', 'wi', 'wi.nomenclature_id = n.id')
    .where('wi.quantity < n.min_stock_level')
    .andWhere('n.is_active = true')
    .select([
      'n.id',
      'n.sku',
      'n.name',
      'n.min_stock_level',
      'wi.quantity as current_stock',
    ])
    .getRawMany();
}
```

## Pricing Calculations

### Margin Calculation

```typescript
const purchasePrice = 5000;  // Cost: 5,000 UZS
const sellingPrice = 8000;   // Sell: 8,000 UZS

const margin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;
// margin = 60%
```

### Automatic Margin Update

When prices change, margin is automatically recalculated:

```typescript
@BeforeUpdate()
calculateMargin() {
  if (this.purchase_price > 0) {
    this.margin_percent =
      ((this.selling_price - this.purchase_price) / this.purchase_price) * 100;
  }
}
```

## Integration with Other Modules

### Recipes

Products marked as `is_ingredient: true` can be used in recipes:

```typescript
// Coffee recipe example
{
  product_id: "espresso-uuid",  // Final product
  ingredients: [
    { nomenclature_id: "coffee-beans-uuid", quantity: 18, unit: "g" },
    { nomenclature_id: "water-uuid", quantity: 30, unit: "ml" }
  ]
}
```

### Transactions

- Sales transactions reference nomenclature
- Purchase transactions track acquisition

### Intelligent Import

- Nomenclature can be imported from Excel/CSV
- Auto-matching by SKU or barcode

### Machine Slots

- Each slot in a machine links to nomenclature
- Capacity based on product dimensions

## Barcode Support

### Supported Formats

- EAN-13 (European)
- EAN-8 (Short European)
- UPC-A (US)
- Code 128 (Industrial)

### Barcode Lookup

```typescript
async findByBarcode(barcode: string): Promise<Nomenclature> {
  return this.nomenclatureRepository.findOne({
    where: { barcode },
    relations: ['supplier'],
  });
}
```

## Best Practices

1. **Unique SKU**: Always use unique, meaningful SKU codes
2. **Accurate Pricing**: Keep purchase prices updated for margin accuracy
3. **Stock Levels**: Set appropriate min/max levels for each product
4. **Shelf Life**: Track expiration for perishable items
5. **Categories**: Use consistent category codes across organization
6. **Barcodes**: Enter barcodes for quick scanning
7. **Images**: Upload quality product images

## Import/Export

### Excel Import Format

| SKU | Name | Category | Purchase Price | Selling Price | Min Stock | Barcode |
|-----|------|----------|----------------|---------------|-----------|---------|
| COF-001 | Espresso | COFFEE | 3000 | 5000 | 50 | 4607001234567 |
| SNK-001 | Chips | SNACK | 2000 | 4000 | 30 | 4607001234568 |

### Export Fields

```typescript
const exportFields = [
  'sku', 'name', 'category_code', 'purchase_price',
  'selling_price', 'margin_percent', 'min_stock_level',
  'max_stock_level', 'barcode', 'is_active'
];
```

## Related Modules

- [Inventory](../inventory/README.md) - Stock management
- [Recipes](../recipes/README.md) - Product recipes
- [Machines](../machines/README.md) - Machine slot configuration
- [Transactions](../transactions/README.md) - Sales tracking
- [Intelligent Import](../intelligent-import/README.md) - Bulk import
