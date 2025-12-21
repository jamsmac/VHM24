# Machines Module

## Overview

The Machines module is the core of VendHub Manager, providing comprehensive vending machine fleet management. It follows the **Manual Operations Architecture** - no direct machine connectivity, all data flows through operator actions and imports.

## Key Features

- Machine CRUD with unique identifiers
- QR code generation for complaints
- Per-machine access control (RBAC)
- Location tracking with history
- Depreciation and financial tracking
- Connectivity status monitoring
- Async writeoff processing

## Entity

### Machine

**File**: `backend/src/modules/machines/entities/machine.entity.ts`

```typescript
@Entity('machines')
@Index(['location_id'])
@Index(['machine_number'], { unique: true })
@Index(['qr_code'], { unique: true })
export class Machine extends BaseEntity {
  // Primary Identifier
  machine_number: string;        // "M-001", "A-123" (unique, human-readable)
  name: string;                  // Display name
  type_code: string;             // From dictionaries
  status: MachineStatus;         // Current status

  // Location
  location_id: string;
  location: Location;

  // Contract (for commission)
  contract_id: string | null;
  contract: Contract | null;

  // Machine details
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  year_of_manufacture: number | null;

  // Installation & maintenance
  installation_date: Date | null;
  last_maintenance_date: Date | null;
  next_maintenance_date: Date | null;

  // Capacity
  max_product_slots: number;
  current_product_count: number;
  cash_capacity: number;
  current_cash_amount: number;

  // Payment methods
  accepts_cash: boolean;
  accepts_card: boolean;
  accepts_qr: boolean;
  accepts_nfc: boolean;

  // QR Code for complaints
  qr_code: string;               // "QR-L7K3X2P1-A4B5C6D7E8F9"
  qr_code_url: string | null;

  // Assigned personnel
  assigned_operator_id: string | null;
  assigned_technician_id: string | null;

  // Statistics (cached)
  total_sales_count: number;
  total_revenue: number;
  last_refill_date: Date | null;
  last_collection_date: Date | null;

  // Connectivity
  last_ping_at: Date | null;
  is_online: boolean;
  connectivity_status: string | null;

  // Financial tracking
  purchase_price: number | null;
  purchase_date: Date | null;
  depreciation_years: number | null;
  depreciation_method: string;   // 'linear'
  accumulated_depreciation: number;

  // Disposal
  is_disposed: boolean;
  disposal_date: Date | null;
  disposal_reason: string | null;

  // Flexible data
  settings: Record<string, any> | null;
  metadata: Record<string, any> | null;
  notes: string | null;
  low_stock_threshold_percent: number;
}
```

### Machine Status

| Status | Value | Description |
|--------|-------|-------------|
| Active | `active` | Working normally |
| Low Stock | `low_stock` | Below inventory threshold |
| Error | `error` | Has reported error |
| Maintenance | `maintenance` | Under maintenance |
| Offline | `offline` | Not responding |
| Disabled | `disabled` | Manually disabled |

## API Endpoints

### Machine CRUD

```
POST   /api/machines              Create machine
GET    /api/machines              List machines (with filters)
GET    /api/machines/:id          Get machine by ID
GET    /api/machines/number/:num  Get by machine_number
PATCH  /api/machines/:id          Update machine
DELETE /api/machines/:id          Soft delete machine
```

### QR Codes

```
GET    /api/machines/:id/qr-code           Get QR code data + image
GET    /api/machines/:id/qr-code/image     Get QR code as PNG
POST   /api/machines/:id/qr-code/regenerate  Regenerate QR code
```

### Writeoff (Async)

```
POST   /api/machines/:id/writeoff         Queue machine writeoff
POST   /api/machines/writeoff/bulk        Bulk writeoff
GET    /api/machines/writeoff/job/:jobId  Check job status
DELETE /api/machines/writeoff/job/:jobId  Cancel pending job
```

### Statistics

```
GET    /api/machines/:id/stats            Machine statistics
GET    /api/machines/:id/location-history Location change history
```

## Machine Identifiers

| Identifier | Format | Purpose |
|------------|--------|---------|
| `machine_number` | "M-001" | Primary human-readable ID |
| `id` | UUID | Internal database ID |
| `serial_number` | Manufacturer | Warranty, service |
| `qr_code` | "QR-..." | Public complaint URLs |

### Resolution Pattern

```typescript
async findByIdentifier(identifier: string): Promise<Machine> {
  if (isUUID(identifier)) {
    return this.findOne(identifier);
  }
  return this.findByMachineNumber(identifier);
}
```

## QR Code System

Each machine has a unique QR code for public complaint submission:

```
QR Code → URL → Public Complaint Form → Complaint Created

Format: QR-{timestamp}-{random}
URL: {FRONTEND_URL}/public/complaint/{qr_code}
```

### Generation

```typescript
@Injectable()
export class QrCodeService {
  generateUniqueQrCode(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `QR-${timestamp}-${random}`.toUpperCase();
  }

  async generateQrCodeImage(machineId: string): Promise<Buffer> {
    const machine = await this.findMachine(machineId);
    const url = this.getComplaintUrl(machine.qr_code);
    return await QRCode.toBuffer(url, { width: 400, margin: 2 });
  }
}
```

## Location Tracking

### Location History Entity

```typescript
@Entity('machine_location_history')
class MachineLocationHistory extends BaseEntity {
  machine: Machine;
  from_location_id: string | null;
  from_location: Location | null;
  to_location_id: string;
  to_location: Location;
  // created_at = timestamp of move
}
```

Every location change is automatically recorded.

## Financial Tracking

### Depreciation

```typescript
interface DepreciationData {
  purchase_price: number;       // Original cost
  depreciation_years: number;   // e.g., 5 years
  depreciation_method: 'linear';
  accumulated_depreciation: number;
}

// Book Value = purchase_price - accumulated_depreciation
```

### Monthly Calculation

```typescript
async calculateDepreciation(): Promise<{updated: number; totalDepreciation: number}> {
  // For each non-disposed machine with depreciation data:
  // 1. Calculate monthly depreciation
  // 2. Update accumulated_depreciation
  // 3. Update book_value in metadata
}
```

## Writeoff Processing

Machine disposal uses async BullMQ processing:

```
1. Request: POST /machines/{id}/writeoff
2. Validation: Check machine exists, not already disposed
3. Queue: Add job to 'machine-writeoff' queue
4. Return: Job ID for tracking

Background:
5. Calculate final depreciation
6. Create disposal transaction
7. Update machine (is_disposed=true)
8. Log audit entry
```

### Job States

| State | Description |
|-------|-------------|
| `pending` | Waiting in queue |
| `processing` | Being processed |
| `completed` | Successfully disposed |
| `failed` | Error occurred |

## Service Methods

### MachinesService

| Method | Description |
|--------|-------------|
| `create()` | Create machine with unique QR |
| `findAll()` | List with pagination/filters |
| `findOne()` | Get by ID |
| `findByMachineNumber()` | Get by machine_number |
| `update()` | Update (tracks location changes) |
| `remove()` | Soft delete |
| `updateStats()` | Update statistics from tasks |
| `updateConnectivityStatus()` | Mark offline machines |
| `calculateDepreciation()` | Monthly depreciation |
| `writeoff()` | Queue machine disposal |

## Integration Points

### Tasks

- Tasks created for specific machines
- Task completion updates machine stats
- Collection tasks reset `current_cash_amount`
- Refill tasks update `last_refill_date`

### Inventory

- Machine inventory tracked per machine
- Low stock triggers `LOW_STOCK` status
- Refill tasks transfer inventory to machine

### Complaints

- QR code links to public complaint form
- Complaints linked to machine by QR code

### Incidents

- Incidents created for machine issues
- Status updated based on incidents

## Related Modules

- [Machine Access](../machine-access/README.md) - Per-machine access control
- [Tasks](../tasks/README.md) - Machine tasks
- [Inventory](../inventory/README.md) - Machine inventory
- [Locations](../locations/README.md) - Machine locations
- [Complaints](../complaints/README.md) - Customer complaints
- [Incidents](../incidents/README.md) - Machine incidents

## Extended Documentation

For comprehensive details including diagrams, see: [MACHINES.md](../MACHINES.md)
