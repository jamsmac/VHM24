# Machine Management - VendHub Manager

> **Version**: 1.0.0
> **Last Updated**: 2025-12-20
> **Module**: `backend/src/modules/machines/`

This document provides comprehensive documentation for the Machine Management system, including QR codes, access control, and depreciation tracking.

---

## Table of Contents

1. [Overview](#overview)
2. [Machine Entity](#machine-entity)
3. [Machine Statuses](#machine-statuses)
4. [Machine Identifiers](#machine-identifiers)
5. [QR Code System](#qr-code-system)
6. [Machine Access Control](#machine-access-control)
7. [Location Management](#location-management)
8. [Financial Tracking](#financial-tracking)
9. [Connectivity Monitoring](#connectivity-monitoring)
10. [Machine Writeoff](#machine-writeoff)
11. [Statistics and Metrics](#statistics-and-metrics)
12. [API Reference](#api-reference)
13. [Integration Points](#integration-points)

---

## Overview

### Architecture Principle

Machine management in VendHub Manager follows the **Manual Operations Architecture**:

```
┌────────────────────────────────────────────────────────────────────┐
│                    MACHINE MANAGEMENT PRINCIPLE                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  NO direct machine connectivity/telemetry                          │
│  NO automated status updates from machines                         │
│  NO real-time data synchronization                                 │
│                                                                     │
│  ALL machine data comes from:                                      │
│  ├── Manual operator entry via tasks                               │
│  ├── Admin/manager updates via dashboard                          │
│  ├── Sales data import (Excel/CSV)                                │
│  └── Scheduled status checks                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
machines/
├── entities/
│   ├── machine.entity.ts              # Main machine entity
│   └── machine-location-history.entity.ts  # Location change tracking
├── dto/
│   ├── create-machine.dto.ts
│   ├── update-machine.dto.ts
│   ├── move-machine.dto.ts
│   ├── writeoff-machine.dto.ts
│   └── writeoff-job-status.dto.ts
├── processors/
│   └── writeoff.processor.ts          # Background writeoff jobs
├── machines.service.ts                # Main service
├── machines.controller.ts             # REST API
├── qr-code.service.ts                # QR code generation
└── machines.module.ts

machine-access/
├── entities/
│   ├── machine-access.entity.ts       # Per-machine user access
│   ├── access-template.entity.ts      # Access templates
│   └── access-template-row.entity.ts
├── guards/
│   └── machine-access.guard.ts        # Access control guard
├── machine-access.service.ts
├── machine-access.controller.ts
└── machine-access.module.ts
```

---

## Machine Entity

### Entity Definition

```typescript
@Entity('machines')
@Index(['location_id'])
@Index(['machine_number'], { unique: true })
@Index(['qr_code'], { unique: true })
export class Machine extends BaseEntity {
  // PRIMARY IDENTIFIER
  @Column({ type: 'varchar', length: 50, unique: true })
  machine_number: string;              // "M-001", "A-123"

  @Column({ type: 'varchar', length: 200 })
  name: string;                        // Display name

  @Column({ type: 'varchar', length: 50 })
  type_code: string;                   // From dictionaries

  @Column({ type: 'enum', enum: MachineStatus })
  status: MachineStatus;

  // Location
  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location)
  location: Location;

  // Optional contract (Phase 3)
  @Column({ type: 'uuid', nullable: true })
  contract_id: string | null;

  // Machine details
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string | null;

  @Column({ type: 'integer', nullable: true })
  year_of_manufacture: number | null;

  // Installation & maintenance
  @Column({ type: 'date', nullable: true })
  installation_date: Date | null;

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date | null;

  @Column({ type: 'date', nullable: true })
  next_maintenance_date: Date | null;

  // Capacity
  @Column({ type: 'integer', default: 0 })
  max_product_slots: number;

  @Column({ type: 'integer', default: 0 })
  current_product_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cash_capacity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_cash_amount: number;         // Updated by collection tasks

  // Payment methods
  @Column({ type: 'boolean', default: true })
  accepts_cash: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_card: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_qr: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_nfc: boolean;

  // QR Code for complaints
  @Column({ type: 'varchar', length: 100, unique: true })
  qr_code: string;

  @Column({ type: 'text', nullable: true })
  qr_code_url: string | null;

  // Assigned personnel
  @Column({ type: 'uuid', nullable: true })
  assigned_operator_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  assigned_technician_id: string | null;

  // Statistics (cached)
  @Column({ type: 'integer', default: 0 })
  total_sales_count: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refill_date: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_collection_date: Date | null;

  // Connectivity
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_ping_at: Date | null;

  @Column({ type: 'boolean', default: false })
  is_online: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  connectivity_status: string | null;

  // Financial tracking
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchase_price: number | null;

  @Column({ type: 'date', nullable: true })
  purchase_date: Date | null;

  @Column({ type: 'integer', nullable: true })
  depreciation_years: number | null;

  @Column({ type: 'varchar', length: 20, default: 'linear' })
  depreciation_method: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  accumulated_depreciation: number;

  // Disposal
  @Column({ type: 'boolean', default: false })
  is_disposed: boolean;

  @Column({ type: 'date', nullable: true })
  disposal_date: Date | null;

  @Column({ type: 'text', nullable: true })
  disposal_reason: string | null;

  // Flexible data
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
```

---

## Machine Statuses

### Status Definitions

```typescript
export enum MachineStatus {
  ACTIVE = 'active',           // Working normally
  LOW_STOCK = 'low_stock',     // Below stock threshold
  ERROR = 'error',             // Has reported error
  MAINTENANCE = 'maintenance', // Under maintenance
  OFFLINE = 'offline',         // Not responding/communicating
  DISABLED = 'disabled',       // Manually disabled
}
```

### Status Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      MACHINE STATUS FLOW                           │
└────────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  ACTIVE  │◄────────────────────────────────┐
                    └────┬─────┘                                 │
                         │                                       │
        ┌────────────────┼────────────────────┐                 │
        │                │                    │                 │
        ▼                ▼                    ▼                 │
  ┌───────────┐   ┌───────────┐        ┌───────────┐           │
  │ LOW_STOCK │   │   ERROR   │        │  OFFLINE  │           │
  └─────┬─────┘   └─────┬─────┘        └─────┬─────┘           │
        │               │                    │                 │
        │               │                    │                 │
        └───────────────┼────────────────────┘                 │
                        │                                       │
                        ▼                                       │
                ┌─────────────────┐                            │
                │   MAINTENANCE   │                            │
                └────────┬────────┘                            │
                         │                                     │
                         └─────────────────────────────────────┘

                        ┌───────────┐
                        │ DISABLED  │ ──► (Manual toggle only)
                        └───────────┘
```

### Status Update Triggers

| Status | Trigger | Updated By |
|--------|---------|------------|
| ACTIVE | Maintenance complete, issue resolved | Admin/Task |
| LOW_STOCK | Inventory below threshold | Inventory System |
| ERROR | Incident reported | Operator/System |
| MAINTENANCE | Maintenance task started | Task System |
| OFFLINE | No ping for 30+ minutes | Scheduled Job |
| DISABLED | Admin manual disable | Admin |

---

## Machine Identifiers

### Primary Identifier: `machine_number`

The `machine_number` is the **primary human-readable identifier**:

```
┌────────────────────────────────────────────────────────────────────┐
│                      IDENTIFIER USAGE                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  machine_number (PRIMARY)                                          │
│  ├── Format: "M-001", "A-123", "COFFEE-01"                        │
│  ├── Used in: UI, reports, QR codes, operator communication       │
│  ├── Unique: Yes                                                   │
│  └── Human-readable: Yes                                          │
│                                                                     │
│  id (UUID)                                                         │
│  ├── Format: "550e8400-e29b-41d4-a716-446655440000"               │
│  ├── Used in: API requests, database relations                    │
│  ├── Unique: Yes                                                   │
│  └── Human-readable: No                                           │
│                                                                     │
│  serial_number (Optional)                                          │
│  ├── Format: Manufacturer's serial                                │
│  ├── Used in: Warranty, service records                           │
│  └── May not be unique                                            │
│                                                                     │
│  qr_code (Generated)                                               │
│  ├── Format: "QR-L7K3X2P1-A4B5C6D7E8F9"                          │
│  ├── Used in: Public complaint URLs                               │
│  └── Unique, regeneratable                                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Resolution Logic

```typescript
async findByIdentifier(identifier: string): Promise<Machine> {
  // Try UUID first
  if (isUUID(identifier)) {
    return this.findOne(identifier);
  }

  // Then try machine_number
  return this.findByMachineNumber(identifier);
}

async findByMachineNumber(machineNumber: string): Promise<Machine> {
  const machine = await this.machineRepository.findOne({
    where: { machine_number: machineNumber },
    relations: ['location'],
  });

  if (!machine) {
    throw new NotFoundException(`Machine with number ${machineNumber} not found`);
  }

  return machine;
}
```

---

## QR Code System

### Overview

Each machine has a unique QR code for public complaint submissions:

```
┌────────────────────────────────────────────────────────────────────┐
│                      QR CODE SYSTEM                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  QR Code → URL → Public Complaint Form → Complaint Created         │
│                                                                     │
│  Format: QR-{timestamp}-{random}                                   │
│  Example: QR-L7K3X2P1-A4B5C6D7E8F9                                 │
│                                                                     │
│  URL: {FRONTEND_URL}/public/complaint/{qr_code}                    │
│  Example: https://app.vendhub.uz/public/complaint/QR-L7K3X2P1-...  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### QR Code Generation

```typescript
@Injectable()
export class QrCodeService {
  /**
   * Generate unique QR code string
   */
  generateUniqueQrCode(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `QR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get public complaint URL
   */
  getComplaintUrl(qrCode: string): string {
    return `${this.frontendUrl}/public/complaint/${qrCode}`;
  }

  /**
   * Generate QR code image as base64 PNG
   */
  async generateQrCodeImage(machineId: string): Promise<string> {
    const machine = await this.findMachine(machineId);
    const url = this.getComplaintUrl(machine.qr_code);

    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 400,
      margin: 2,
    });
  }

  /**
   * Generate QR code as downloadable buffer
   */
  async generateQrCodeBuffer(machineId: string): Promise<Buffer> {
    const machine = await this.findMachine(machineId);
    const url = this.getComplaintUrl(machine.qr_code);

    return await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 400,
      margin: 2,
    });
  }
}
```

### QR Code API

```
# Get QR code image (PNG)
GET /api/machines/{id}/qr-code/image
→ Returns: PNG buffer with Content-Type: image/png

# Get QR code data URL (base64)
GET /api/machines/{id}/qr-code
→ Returns: { "qrCode": "QR-...", "url": "https://...", "imageDataUrl": "data:image/png;base64,..." }

# Regenerate QR code
POST /api/machines/{id}/qr-code/regenerate
→ Returns: { "qrCode": "QR-NEW-...", "url": "https://..." }
```

---

## Machine Access Control

### Overview

Per-machine role-based access control (RBAC):

```
┌────────────────────────────────────────────────────────────────────┐
│                    MACHINE ACCESS CONTROL                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  System Roles (global)     vs    Machine Access Roles (per-machine)│
│  ├── SUPER_ADMIN                ├── owner                         │
│  ├── ADMIN                      ├── admin                         │
│  ├── MANAGER                    ├── manager                       │
│  ├── OPERATOR                   ├── operator                      │
│  ├── TECHNICIAN                 ├── technician                    │
│  └── VIEWER                     └── viewer                        │
│                                                                     │
│  Machine Access = Additional layer on top of system roles          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Machine Access Entity

```typescript
export enum MachineAccessRole {
  OWNER = 'owner',         // Full control
  ADMIN = 'admin',         // Administrative access
  MANAGER = 'manager',     // Management access
  OPERATOR = 'operator',   // Operational access
  TECHNICIAN = 'technician', // Technical access
  VIEWER = 'viewer',       // Read-only access
}

@Entity('machine_access')
@Unique(['machine_id', 'user_id'])
@Index(['machine_id'])
@Index(['user_id'])
export class MachineAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  machine: Machine;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: MachineAccessRole, default: MachineAccessRole.VIEWER })
  role: MachineAccessRole;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string;

  @ManyToOne(() => User)
  created_by: User;
}
```

### Access Templates

For bulk assignment:

```typescript
@Entity('access_templates')
class AccessTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;                        // "Operator Team A"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => AccessTemplateRow, row => row.template)
  rows: AccessTemplateRow[];
}

@Entity('access_template_rows')
class AccessTemplateRow extends BaseEntity {
  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'enum', enum: MachineAccessRole })
  role: MachineAccessRole;
}
```

### Access Control Guard

```typescript
@Injectable()
export class MachineAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const machineId = request.params.machineId || request.body.machine_id;

    // Super admins bypass machine access checks
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check machine-specific access
    const access = await this.machineAccessService.getUserAccess(user.id, machineId);

    if (!access) {
      throw new ForbiddenException('No access to this machine');
    }

    // Store access info for later use
    request.machineAccess = access;

    return true;
  }
}
```

### Access API

```
# Get user's access to a machine
GET /api/machine-access/{machineId}/user/{userId}

# Grant access
POST /api/machine-access
{
  "machine_id": "uuid",
  "user_id": "uuid",
  "role": "operator"
}

# Bulk assign from template
POST /api/machine-access/apply-template
{
  "template_id": "uuid",
  "machine_ids": ["uuid1", "uuid2"]
}

# Get all users with access to machine
GET /api/machine-access/{machineId}/users

# Get all machines user has access to
GET /api/machine-access/user/{userId}/machines
```

---

## Location Management

### Location History

Every location change is tracked:

```typescript
@Entity('machine_location_history')
class MachineLocationHistory extends BaseEntity {
  @ManyToOne(() => Machine)
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  from_location_id: string | null;

  @ManyToOne(() => Location)
  from_location: Location | null;

  @Column({ type: 'uuid' })
  to_location_id: string;

  @ManyToOne(() => Location)
  to_location: Location;

  // created_at = timestamp of move
}
```

### Location Change Tracking

```typescript
async update(id: string, updateMachineDto: UpdateMachineDto): Promise<Machine> {
  const machine = await this.findOne(id);

  // If location is changing, record in history
  if (updateMachineDto.location_id && updateMachineDto.location_id !== machine.location_id) {
    await this.recordLocationChange(id, machine.location_id, updateMachineDto.location_id);
  }

  await this.machineRepository.update(id, updateMachineDto);
  return await this.findOne(id);
}

private async recordLocationChange(
  machineId: string,
  oldLocationId: string | null,
  newLocationId: string,
): Promise<void> {
  const history = this.locationHistoryRepository.create({
    machine: { id: machineId },
    from_location_id: oldLocationId,
    to_location_id: newLocationId,
  });

  await this.locationHistoryRepository.save(history);
}
```

### Location API

```
# Get location history
GET /api/machines/{id}/location-history

Response: 200 OK
[
  {
    "id": "uuid",
    "from_location": { "id": "uuid", "name": "Office Building A" },
    "to_location": { "id": "uuid", "name": "Shopping Mall B" },
    "created_at": "2025-12-20T10:00:00Z"
  }
]

# Move machine to new location
PATCH /api/machines/{id}
{
  "location_id": "new-location-uuid"
}
```

---

## Financial Tracking

### Depreciation

Machines support linear depreciation tracking:

```typescript
interface DepreciationData {
  purchase_price: number;            // Original cost
  purchase_date: Date;               // When purchased
  depreciation_years: number;        // e.g., 5 years
  depreciation_method: 'linear';     // Only linear supported
  accumulated_depreciation: number;  // Total depreciated so far
  last_depreciation_date: Date;      // Last calculation date
}

// Book value = purchase_price - accumulated_depreciation
```

### Monthly Depreciation Calculation

```typescript
async calculateDepreciation(): Promise<{ updated: number; totalDepreciation: number }> {
  const machines = await this.machineRepository.find({
    where: { is_disposed: false },
  });

  let updated = 0;
  let totalDepreciation = 0;

  for (const machine of machines) {
    const monthlyDepreciation = machine.metadata?.monthly_depreciation;
    if (!monthlyDepreciation) continue;

    const newDepreciation = Number(machine.accumulated_depreciation) + monthlyDepreciation;
    const bookValue = Number(machine.purchase_price) - newDepreciation;

    // Don't depreciate below 0
    if (bookValue >= 0) {
      await this.machineRepository.update(machine.id, {
        accumulated_depreciation: newDepreciation,
      });

      machine.metadata = {
        ...machine.metadata,
        last_depreciation_date: new Date().toISOString(),
        book_value: bookValue,
      };
      await this.machineRepository.save(machine);

      updated++;
      totalDepreciation += monthlyDepreciation;
    }
  }

  return { updated, totalDepreciation };
}
```

---

## Connectivity Monitoring

### Online Status Tracking

```typescript
async updateConnectivityStatus(offlineThresholdMinutes: number = 30): Promise<{
  total: number;
  online: number;
  offline: number;
  updated: number;
}> {
  const offlineThreshold = new Date(Date.now() - offlineThresholdMinutes * 60 * 1000);

  // Find machines that should be marked offline
  const machinesToMarkOffline = await this.machineRepository.find({
    where: [
      { is_online: true, last_ping_at: LessThan(offlineThreshold) },
      { is_online: true, last_ping_at: IsNull() },
    ],
  });

  // Mark as offline
  const offlineMachineIds = machinesToMarkOffline.map(m => m.id);
  if (offlineMachineIds.length > 0) {
    await this.machineRepository.update(
      { id: In(offlineMachineIds) },
      { is_online: false, connectivity_status: 'offline', status: MachineStatus.OFFLINE }
    );
  }

  // Return stats
  return {
    total: await this.machineRepository.count(),
    online: await this.machineRepository.count({ where: { is_online: true } }),
    offline: await this.machineRepository.count({ where: { is_online: false } }),
    updated: offlineMachineIds.length,
  };
}
```

---

## Machine Writeoff

### Overview

Machine writeoff (disposal) is processed asynchronously using Bull queue:

```
┌────────────────────────────────────────────────────────────────────┐
│                    WRITEOFF FLOW                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Request: POST /machines/{id}/writeoff                          │
│  2. Validation: Check machine exists, not already disposed         │
│  3. Queue: Add job to 'machine-writeoff' queue                    │
│  4. Return: Job ID for tracking                                   │
│                                                                     │
│  Background Processing:                                            │
│  5. Calculate final depreciation                                   │
│  6. Create disposal transaction                                    │
│  7. Update machine (is_disposed=true)                             │
│  8. Log audit entry                                               │
│                                                                     │
│  Job States:                                                       │
│  PENDING → PROCESSING → COMPLETED / FAILED                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Writeoff API

```
# Request writeoff (async)
POST /api/machines/{id}/writeoff
{
  "reason": "End of useful life",
  "disposal_date": "2025-12-20"
}

Response: 202 Accepted
{
  "jobId": "writeoff-123",
  "message": "Writeoff operation queued",
  "statusUrl": "/api/machines/writeoff/job/writeoff-123"
}

# Check job status
GET /api/machines/writeoff/job/{jobId}

Response: 200 OK
{
  "jobId": "writeoff-123",
  "status": "completed",
  "progress": 100,
  "createdAt": "2025-12-20T10:00:00Z",
  "completedAt": "2025-12-20T10:00:05Z",
  "result": {
    "machineNumber": "M-001",
    "disposalAmount": 15000.00
  }
}

# Bulk writeoff
POST /api/machines/writeoff/bulk
{
  "machineIds": ["uuid1", "uuid2"],
  "reason": "Fleet replacement",
  "disposal_date": "2025-12-20"
}

Response: 202 Accepted
{
  "total": 2,
  "queued": 2,
  "failed": 0,
  "jobIds": ["writeoff-124", "writeoff-125"]
}

# Cancel pending writeoff
DELETE /api/machines/writeoff/job/{jobId}
```

---

## Statistics and Metrics

### Machine Stats

```typescript
async getMachineStatsByLocation(locationId: string): Promise<{
  total: number;
  active: number;
  offline: number;
  error: number;
  maintenance: number;
}> {
  const machines = await this.findAll({ location_id: locationId });

  return {
    total: machines.length,
    active: machines.filter(m => m.status === MachineStatus.ACTIVE).length,
    offline: machines.filter(m => m.status === MachineStatus.OFFLINE).length,
    error: machines.filter(m => m.status === MachineStatus.ERROR).length,
    maintenance: machines.filter(m => m.status === MachineStatus.MAINTENANCE).length,
  };
}
```

### Stats Update (via Tasks)

```typescript
async updateStats(machineId: string, stats: {
  current_cash_amount?: number;
  last_refill_date?: Date;
  last_collection_date?: Date;
  total_sales_count?: number;
  total_revenue?: number;
}): Promise<void> {
  const updates: Partial<Machine> = {};

  if (stats.current_cash_amount !== undefined) {
    updates.current_cash_amount = stats.current_cash_amount;
  }
  if (stats.last_refill_date) {
    updates.last_refill_date = stats.last_refill_date;
  }
  if (stats.last_collection_date) {
    updates.last_collection_date = stats.last_collection_date;
  }

  await this.machineRepository.update(machineId, updates);
}
```

---

## API Reference

### Machine CRUD

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| `POST` | `/machines` | Create machine | ADMIN |
| `GET` | `/machines` | List machines (with filters) | All |
| `GET` | `/machines/:id` | Get machine by ID | All |
| `GET` | `/machines/number/:machineNumber` | Get by machine_number | All |
| `PATCH` | `/machines/:id` | Update machine | ADMIN, MANAGER |
| `DELETE` | `/machines/:id` | Soft delete | ADMIN |

### QR Codes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/machines/:id/qr-code` | Get QR code data |
| `GET` | `/machines/:id/qr-code/image` | Get QR code PNG |
| `POST` | `/machines/:id/qr-code/regenerate` | Regenerate QR |

### Machine Access

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/machine-access/:machineId/users` | Get users with access |
| `POST` | `/machine-access` | Grant access |
| `PATCH` | `/machine-access/:id` | Update access role |
| `DELETE` | `/machine-access/:id` | Revoke access |

### Writeoff

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/machines/:id/writeoff` | Queue writeoff |
| `POST` | `/machines/writeoff/bulk` | Bulk writeoff |
| `GET` | `/machines/writeoff/job/:jobId` | Get job status |
| `DELETE` | `/machines/writeoff/job/:jobId` | Cancel job |

---

## Integration Points

### Task System

- Tasks are created for specific machines
- Task completion updates machine stats
- Collection tasks reset `current_cash_amount`
- Refill tasks update `last_refill_date`

### Inventory System

- Machine inventory tracked per machine
- Low stock triggers `LOW_STOCK` status
- Refill tasks transfer inventory to machine

### Complaints System

- QR code links to public complaint form
- Complaints linked to machine by QR code
- Machine location shown on complaint

### Incidents System

- Incidents created for machine issues
- Status updated based on incidents
- Offline detection creates incidents

---

**Last Updated**: 2025-12-20
**Version**: 1.0.0
**Maintained By**: VendHub Development Team
