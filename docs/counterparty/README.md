# Counterparty Module

## Overview

The Counterparty module manages business relationships, contracts, and commission calculations for VendHub Manager. It handles clients, suppliers, partners, and location owners with full support for Uzbekistan's business regulations.

## Key Features

- Counterparty management (clients, suppliers, partners)
- Contract lifecycle management
- Commission calculation and tracking
- Uzbekistan-specific tax handling (НДС 15%)
- Tiered commission structures
- Automatic commission calculations
- Payment tracking

## Entities

### Counterparty

**File**: `backend/src/modules/counterparty/entities/counterparty.entity.ts`

```typescript
@Entity('counterparties')
export class Counterparty extends BaseEntity {
  // Basic Info
  name: string;                    // Company/individual name
  legal_name: string;              // Official legal name
  type: CounterpartyType;          // client, supplier, partner, location_owner

  // Contact
  phone: string;                   // Primary phone
  email: string;                   // Primary email
  address: string;                 // Legal address
  contact_person: string;          // Contact person name

  // Uzbekistan-Specific Fields
  inn: string;                     // ИНН - 9 digits
  mfo: string;                     // МФО - 5 digits (bank code)
  oked: string;                    // ОКЭД - activity code
  vat_rate: number;                // НДС rate (default 15%)
  bank_account: string;            // Bank account number
  bank_name: string;               // Bank name

  // Status
  is_active: boolean;              // Active status

  // Metadata
  metadata: Record<string, any>;   // Additional fields
}
```

### Counterparty Types

| Type | Value | Description |
|------|-------|-------------|
| Client | `client` | Customers who pay for services |
| Supplier | `supplier` | Vendors who supply products |
| Partner | `partner` | Business partners |
| Location Owner | `location_owner` | Owners of locations where machines are placed |

### Contract

**File**: `backend/src/modules/counterparty/entities/contract.entity.ts`

```typescript
@Entity('contracts')
export class Contract extends BaseEntity {
  // Parties
  counterparty_id: string;         // Counterparty reference
  contract_number: string;         // Contract number (unique)

  // Dates
  start_date: Date;                // Contract start
  end_date: Date;                  // Contract end
  signed_date: Date;               // When signed

  // Status
  status: ContractStatus;          // Current status

  // Commission Settings
  commission_type: CommissionType; // How commission is calculated
  commission_rate: number;         // Base rate (percentage)
  fixed_commission: number;        // Fixed amount (if applicable)
  commission_tiers: CommissionTier[]; // Tiered structure (JSONB)

  // Terms
  payment_terms_days: number;      // Net payment days
  minimum_guarantee: number;       // Minimum monthly payment
  currency: string;                // Contract currency (UZS)

  // Document
  document_file_id: string;        // Uploaded contract document
  notes: string;                   // Additional notes
}
```

### Contract Statuses

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│  DRAFT  │────>│ ACTIVE  │────>│ EXPIRED │
└─────────┘     └─────────┘     └─────────┘
                    │
                    ├──────────────────┐
                    ▼                  ▼
              ┌───────────┐     ┌────────────┐
              │ SUSPENDED │     │ TERMINATED │
              └───────────┘     └────────────┘
```

| Status | Value | Description |
|--------|-------|-------------|
| Draft | `draft` | Contract being prepared |
| Active | `active` | Currently active |
| Suspended | `suspended` | Temporarily suspended |
| Expired | `expired` | Past end date |
| Terminated | `terminated` | Cancelled before end |

### Commission Types

| Type | Value | Description |
|------|-------|-------------|
| Percentage | `percentage` | % of revenue |
| Fixed | `fixed` | Fixed monthly amount |
| Tiered | `tiered` | Percentage varies by volume |
| Hybrid | `hybrid` | Fixed + percentage |

### Tiered Commission Structure

```typescript
interface CommissionTier {
  from_amount: number;    // Revenue from
  to_amount: number;      // Revenue to (null = unlimited)
  rate: number;           // Commission rate %
}

// Example: Higher volume = lower commission
const tiers: CommissionTier[] = [
  { from_amount: 0, to_amount: 10000000, rate: 20 },      // 0-10M: 20%
  { from_amount: 10000001, to_amount: 50000000, rate: 15 }, // 10-50M: 15%
  { from_amount: 50000001, to_amount: null, rate: 10 },    // 50M+: 10%
];
```

### Commission Calculation

**File**: `backend/src/modules/counterparty/entities/commission-calculation.entity.ts`

```typescript
@Entity('commission_calculations')
export class CommissionCalculation extends BaseEntity {
  contract_id: string;             // Contract reference

  // Period
  period_start: Date;              // Period start
  period_end: Date;                // Period end

  // Amounts
  total_revenue: number;           // Revenue in period
  commission_amount: number;       // Calculated commission
  vat_amount: number;              // НДС on commission

  // Status
  payment_status: PaymentStatus;   // Payment tracking
  paid_at: Date;                   // When paid
  payment_reference: string;       // Payment reference

  // Calculation Details
  calculation_details: object;     // Breakdown (JSONB)
}
```

### Payment Statuses

| Status | Value | Description |
|--------|-------|-------------|
| Pending | `pending` | Not yet paid |
| Paid | `paid` | Fully paid |
| Overdue | `overdue` | Past payment terms |
| Cancelled | `cancelled` | Cancelled |

## API Endpoints

### Counterparties

```
POST   /api/counterparties         Create counterparty
GET    /api/counterparties         List counterparties
GET    /api/counterparties/:id     Get counterparty
PUT    /api/counterparties/:id     Update counterparty
DELETE /api/counterparties/:id     Delete counterparty
```

### Contracts

```
POST   /api/contracts              Create contract
GET    /api/contracts              List contracts
GET    /api/contracts/:id          Get contract
PUT    /api/contracts/:id          Update contract
POST   /api/contracts/:id/activate Activate contract
POST   /api/contracts/:id/suspend  Suspend contract
POST   /api/contracts/:id/terminate Terminate contract
```

### Commissions

```
GET    /api/commissions                    List calculations
GET    /api/commissions/:id                Get calculation
POST   /api/commissions/calculate          Calculate commission
POST   /api/commissions/:id/pay            Mark as paid
GET    /api/commissions/report/:contractId Commission report
```

## DTOs

### CreateCounterpartyDto

```typescript
class CreateCounterpartyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  legal_name?: string;

  @IsEnum(['client', 'supplier', 'partner', 'location_owner'])
  type: string;

  @IsString()
  @Length(9, 9)
  inn: string;  // ИНН exactly 9 digits

  @IsOptional()
  @IsString()
  @Length(5, 5)
  mfo?: string;  // МФО exactly 5 digits

  @IsOptional()
  @IsString()
  oked?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  vat_rate?: number;  // Default 15%

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

### CreateContractDto

```typescript
class CreateContractDto {
  @IsUUID()
  counterparty_id: string;

  @IsString()
  contract_number: string;

  @IsDate()
  start_date: Date;

  @IsDate()
  end_date: Date;

  @IsEnum(CommissionType)
  commission_type: CommissionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commission_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixed_commission?: number;

  @IsOptional()
  @IsArray()
  commission_tiers?: CommissionTier[];

  @IsNumber()
  @Min(1)
  payment_terms_days: number;
}
```

## Commission Calculation Logic

### Percentage Commission

```typescript
const revenue = 10000000;  // 10M UZS
const rate = 15;           // 15%
const commission = revenue * (rate / 100);  // 1,500,000 UZS
```

### Tiered Commission

```typescript
function calculateTieredCommission(
  revenue: number,
  tiers: CommissionTier[]
): number {
  let commission = 0;
  let remaining = revenue;

  for (const tier of tiers.sort((a, b) => a.from_amount - b.from_amount)) {
    const tierSize = tier.to_amount
      ? tier.to_amount - tier.from_amount
      : Infinity;

    const applicable = Math.min(remaining, tierSize);
    commission += applicable * (tier.rate / 100);
    remaining -= applicable;

    if (remaining <= 0) break;
  }

  return commission;
}
```

### Hybrid Commission

```typescript
const fixedAmount = 500000;   // 500K UZS fixed
const rate = 5;               // 5% of revenue
const revenue = 10000000;     // 10M UZS

const commission = fixedAmount + (revenue * rate / 100);
// 500,000 + 500,000 = 1,000,000 UZS
```

## Scheduled Tasks

### Monthly Commission Calculation

```typescript
@Cron('0 2 1 * *')  // 1st of every month at 2 AM
async calculateMonthlyCommissions() {
  const activeContracts = await this.contractRepository.find({
    where: { status: ContractStatus.ACTIVE }
  });

  for (const contract of activeContracts) {
    const lastMonth = this.getLastMonthRange();
    await this.commissionService.calculate(
      contract.id,
      lastMonth.start,
      lastMonth.end
    );
  }
}
```

### Contract Expiration Check

```typescript
@Cron('0 9 * * *')  // Daily at 9 AM
async checkExpiringContracts() {
  const expiringIn30Days = await this.contractRepository
    .createQueryBuilder('c')
    .where('c.status = :status', { status: ContractStatus.ACTIVE })
    .andWhere('c.end_date BETWEEN NOW() AND NOW() + INTERVAL \'30 days\'')
    .getMany();

  for (const contract of expiringIn30Days) {
    await this.notifyContractExpiring(contract);
  }
}
```

## Uzbekistan-Specific Features

### ИНН Validation

```typescript
function validateINN(inn: string): boolean {
  // ИНН must be exactly 9 digits
  return /^\d{9}$/.test(inn);
}
```

### МФО Validation

```typescript
function validateMFO(mfo: string): boolean {
  // МФО must be exactly 5 digits
  return /^\d{5}$/.test(mfo);
}
```

### НДС Calculation

```typescript
const commissionAmount = 1000000;  // 1M UZS commission
const vatRate = 15;                // 15% НДС
const vatAmount = commissionAmount * (vatRate / 100);  // 150,000 UZS
const totalWithVat = commissionAmount + vatAmount;     // 1,150,000 UZS
```

## WebSocket Integration

Commission calculations emit real-time events:

```typescript
// Event emitted when commission calculated
this.realtimeGateway.emitCommissionCalculated({
  id: calculation.id,
  contractId: contract.id,
  commissionAmount: calculation.commission_amount,
  totalRevenue: calculation.total_revenue,
  period: `${periodStart} - ${periodEnd}`
});
```

## Reports

### Contract Performance Report

```typescript
interface ContractPerformanceReport {
  contract_id: string;
  contract_number: string;
  counterparty_name: string;
  total_revenue: number;
  total_commission: number;
  avg_monthly_revenue: number;
  months_active: number;
  payment_compliance: number;  // % paid on time
}
```

## Best Practices

1. **INN Verification**: Always verify ИНН before creating counterparty
2. **Contract Review**: Review contracts before activation
3. **Commission Audit**: Monthly audit of commission calculations
4. **Payment Terms**: Set realistic payment terms
5. **Tiered Incentives**: Use tiered commissions to incentivize growth

## Related Modules

- [Billing](../billing/README.md) - Invoicing
- [Transactions](../transactions/README.md) - Payment tracking
- [Machines](../machines/README.md) - Machine-location relationships
- [WebSocket](../websocket/README.md) - Real-time updates
