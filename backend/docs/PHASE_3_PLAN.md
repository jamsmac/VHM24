# 📋 Phase 3: Commission Automation & Integration

**Priority**: P1 - CRITICAL FOR BILLING
**Estimated Effort**: 40 hours
**Status**: 🚧 IN PROGRESS

---

## 🎯 Objectives

Integrate the counterparty/contract system from Phase 2 with the existing transaction and machine management system to:
1. **Automate commission calculations** - Scheduled jobs that calculate commissions based on actual revenue
2. **Link revenue to contracts** - Track which transactions belong to which contracts
3. **Enable commission reporting** - Provide dashboards and reports for commission payments
4. **Track payment obligations** - Monitor overdue commission payments

---

## 📦 Deliverables

### 1. Commission Scheduler Service ✅
**File**: `backend/src/modules/counterparty/services/commission-scheduler.service.ts`

**Responsibilities**:
- Run daily/weekly/monthly commission calculations
- Aggregate revenue from transactions by contract
- Create CommissionCalculation records automatically
- Set payment due dates based on contract terms
- Auto-escalate overdue payments to OVERDUE status

**Key Methods**:
```typescript
- calculateDailyCommissions(): Promise<number>
- calculateWeeklyCommissions(): Promise<number>
- calculateMonthlyCommissions(): Promise<number>
- calculateForContract(contractId: string, periodStart: Date, periodEnd: Date): Promise<CommissionCalculation>
- checkAndUpdateOverduePayments(): Promise<number>
```

**Integration Points**:
- Uses `CommissionService` for calculation logic
- Queries `Transaction` entity for revenue data
- Creates `CommissionCalculation` records
- Uses BullMQ for scheduled jobs

---

### 2. Contract-Revenue Integration
**Updates**: Link machines and locations to contracts

**Machine Entity Enhancement**:
```typescript
// Add to machine.entity.ts
@Column({ type: 'uuid', nullable: true })
contract_id: string | null;

@ManyToOne(() => Contract)
@JoinColumn({ name: 'contract_id' })
contract: Contract | null;
```

**Transaction Entity Enhancement**:
```typescript
// Add to transaction.entity.ts
@Column({ type: 'uuid', nullable: true })
contract_id: string | null;

@ManyToOne(() => Contract)
@JoinColumn({ name: 'contract_id' })
contract: Contract | null;
```

**Migration**:
- Add `contract_id` to `machines` table (nullable, with FK)
- Add `contract_id` to `transactions` table (nullable, with FK)
- Add index on `transactions.contract_id`
- Add index on `transactions.sale_date` for efficient aggregation

---

### 3. Commission Reporting API
**Controller**: `backend/src/modules/counterparty/commission.controller.ts`

**Endpoints**:
```typescript
GET    /commissions                          // List all commission calculations
GET    /commissions/pending                  // Get pending payments
GET    /commissions/overdue                  // Get overdue payments
GET    /commissions/:id                      // Get single calculation details
GET    /commissions/contract/:contractId     // Get all calculations for a contract
GET    /commissions/stats                    // Dashboard statistics

PATCH  /commissions/:id/mark-paid            // Mark commission as paid
PATCH  /commissions/:id/update-payment       // Update payment details
POST   /commissions/calculate-now            // Trigger manual calculation (admin only)
```

**DTOs**:
- `CommissionQueryDto` - Filters for listing (status, date range, contract)
- `MarkPaidDto` - Payment transaction ID and date
- `UpdatePaymentDto` - Payment details update
- `CommissionStatsResponseDto` - Dashboard statistics

**Response Examples**:
```typescript
// GET /commissions/stats
{
  total_pending: 15,
  total_pending_amount: 125_000_000, // UZS
  total_overdue: 3,
  total_overdue_amount: 18_500_000, // UZS
  total_paid_this_month: 8,
  total_paid_amount_this_month: 67_000_000, // UZS
  average_days_to_payment: 12.5,
  by_contract: [
    { contract_id: '...', contract_number: 'DOG-001', pending_count: 2, pending_amount: 5_000_000 }
  ]
}
```

---

### 4. Revenue Aggregation Service
**File**: `backend/src/modules/counterparty/services/revenue-aggregation.service.ts`

**Purpose**: Efficiently aggregate transaction revenue for commission calculations

**Key Methods**:
```typescript
- getRevenueForContract(contractId: string, startDate: Date, endDate: Date): Promise<RevenueAggregation>
- getRevenueForMachine(machineId: string, startDate: Date, endDate: Date): Promise<RevenueAggregation>
- getRevenueForLocation(locationId: string, startDate: Date, endDate: Date): Promise<RevenueAggregation>
```

**Return Type**:
```typescript
interface RevenueAggregation {
  total_revenue: number;        // UZS
  transaction_count: number;
  average_transaction: number;  // UZS
  period_start: Date;
  period_end: Date;
  breakdown?: {                 // Optional detailed breakdown
    by_date: { date: string; revenue: number }[];
    by_machine?: { machine_id: string; revenue: number }[];
  };
}
```

**Optimization**:
- Use PostgreSQL aggregate functions (SUM, COUNT)
- Indexed queries on sale_date and contract_id
- Efficient date range queries

---

### 5. Scheduled Jobs (BullMQ)
**File**: `backend/src/modules/counterparty/jobs/commission-calculation.processor.ts`

**Jobs**:
1. **Daily Commission Calculation**
   - Cron: `0 2 * * *` (2 AM daily)
   - Calculates commissions for contracts with `commission_fixed_period = 'daily'`

2. **Weekly Commission Calculation**
   - Cron: `0 3 * * 1` (Monday 3 AM)
   - Calculates commissions for weekly contracts

3. **Monthly Commission Calculation**
   - Cron: `0 4 1 * *` (1st of month, 4 AM)
   - Calculates commissions for monthly/quarterly contracts

4. **Overdue Payment Check**
   - Cron: `0 6 * * *` (6 AM daily)
   - Updates status to 'overdue' for unpaid commissions past due date

**Job Configuration**:
```typescript
@Processor('commission-calculations')
export class CommissionCalculationProcessor {
  @Process('calculate-daily')
  async handleDailyCalculation(job: Job) { ... }

  @Process('calculate-weekly')
  async handleWeeklyCalculation(job: Job) { ... }

  @Process('calculate-monthly')
  async handleMonthlyCalculation(job: Job) { ... }

  @Process('check-overdue')
  async handleOverdueCheck(job: Job) { ... }
}
```

**Module Registration**:
```typescript
// counterparty.module.ts
BullModule.registerQueue({
  name: 'commission-calculations',
}),
```

---

### 6. Automated Transaction Linking
**Enhancement**: Automatically link transactions to contracts when created

**Sales Import Enhancement**:
```typescript
// sales-import.processor.ts
async processImportJob(job: Job<SalesImportJobData>) {
  // ... existing logic ...

  // NEW: Link transaction to contract if machine has one
  const machine = await this.machineRepository.findOne({
    where: { machine_number: row.machine_number },
    relations: ['contract'],
  });

  if (machine?.contract_id) {
    transaction.contract_id = machine.contract_id;
  }

  await manager.save(Transaction, transaction);
}
```

**Manual Sale Creation**:
```typescript
// transactions.service.ts
async create(createDto: CreateTransactionDto) {
  // ... existing logic ...

  // NEW: Auto-link to contract if machine has one
  if (createDto.machine_id) {
    const machine = await this.machineRepository.findOne({
      where: { id: createDto.machine_id },
      select: ['contract_id'],
    });

    if (machine?.contract_id) {
      transaction.contract_id = machine.contract_id;
    }
  }
}
```

---

### 7. Comprehensive Testing

**Unit Tests**:
- `commission-scheduler.service.spec.ts` (150+ lines)
  - Test daily/weekly/monthly calculation logic
  - Test revenue aggregation
  - Test overdue detection
  - Test payment due date calculation

- `revenue-aggregation.service.spec.ts` (100+ lines)
  - Test revenue calculation accuracy
  - Test date range queries
  - Test breakdown generation

**Integration Tests**:
- `commission-calculation.e2e-spec.ts` (200+ lines)
  - Full workflow: Create contract → Import sales → Calculate commission → Mark paid
  - Test automatic transaction linking
  - Test scheduler job execution
  - Test overdue escalation

**Test Coverage Target**: 80%+

---

## 🗂️ File Structure

```
backend/src/modules/counterparty/
├── controllers/
│   └── commission.controller.ts           # NEW
├── dto/
│   ├── commission-query.dto.ts            # NEW
│   ├── mark-paid.dto.ts                   # NEW
│   └── update-payment.dto.ts              # NEW
├── entities/
│   ├── commission-calculation.entity.ts   # Existing
│   ├── contract.entity.ts                 # Existing
│   └── counterparty.entity.ts             # Existing
├── jobs/
│   └── commission-calculation.processor.ts # NEW
├── services/
│   ├── commission.service.ts              # Existing
│   ├── commission-scheduler.service.ts    # NEW
│   ├── contract.service.ts                # Existing
│   ├── counterparty.service.ts            # Existing
│   └── revenue-aggregation.service.ts     # NEW
├── tests/
│   ├── commission-scheduler.service.spec.ts  # NEW
│   ├── revenue-aggregation.service.spec.ts   # NEW
│   └── commission-calculation.e2e-spec.ts    # NEW
└── counterparty.module.ts                 # Updated
```

---

## 📊 Database Changes

**Migration**: `1731720000001-AddCommissionAutomation.ts`

**Changes**:
1. Add `contract_id` to `machines` table
2. Add `contract_id` to `transactions` table
3. Add indexes:
   - `IDX_transactions_contract_id`
   - `IDX_transactions_sale_date`
   - `IDX_commission_calculations_payment_status`
   - `IDX_commission_calculations_payment_due_date`
4. Add FK constraints with `ON DELETE SET NULL` for flexibility

**Rollback Support**: Full down() method to remove columns and indexes

---

## 🔄 Integration Points

### With Existing Modules:

1. **Machines Module**:
   - Add `contract_id` field to Machine entity
   - Add `contract` relation to Machine
   - Update machine creation/edit to optionally assign contract

2. **Transactions Module**:
   - Add `contract_id` field to Transaction entity
   - Auto-populate contract_id from machine on sale creation
   - Filter transactions by contract

3. **Sales Import**:
   - Auto-link imported transactions to contracts
   - Include contract info in import summary

4. **Locations Module**:
   - Link location's `counterparty_id` to active contract (already done in Phase 2)

---

## 📈 Business Impact

### Benefits:
1. **Automated Commission Tracking** - No manual calculation needed
2. **Transparency** - Full audit trail of commission calculations
3. **Timely Payments** - Auto-detection of overdue payments
4. **Revenue Attribution** - Clear link between sales and contract obligations
5. **Scalability** - Handles 100+ contracts automatically

### Metrics:
- **Processing Time**: < 5 minutes for monthly calculation across all contracts
- **Accuracy**: 100% (deterministic calculation based on actual transactions)
- **Audit Trail**: Every commission calculation stored with details

---

## ✅ Acceptance Criteria

Phase 3 is complete when:

1. ✅ Commission calculations run automatically on schedule
2. ✅ Transactions are auto-linked to contracts when machines have contracts
3. ✅ Commission reports are accessible via API
4. ✅ Overdue commissions are auto-detected and flagged
5. ✅ All tests pass with 80%+ coverage
6. ✅ Migration is reversible
7. ✅ Documentation is complete

---

## 🚀 Implementation Order

### Step 1: Database Schema (1 hour)
- [ ] Create migration for contract_id in machines/transactions
- [ ] Add indexes
- [ ] Test migration up/down

### Step 2: Entity Updates (1 hour)
- [ ] Update Machine entity
- [ ] Update Transaction entity
- [ ] Test entity relationships

### Step 3: Revenue Aggregation Service (3 hours)
- [ ] Implement RevenueAggregationService
- [ ] Write unit tests
- [ ] Test with real transaction data

### Step 4: Commission Scheduler Service (4 hours)
- [ ] Implement CommissionSchedulerService
- [ ] Implement calculation methods (daily/weekly/monthly)
- [ ] Implement overdue detection
- [ ] Write unit tests

### Step 5: BullMQ Jobs (2 hours)
- [ ] Create CommissionCalculationProcessor
- [ ] Register jobs with cron schedules
- [ ] Test job execution

### Step 6: API Endpoints (3 hours)
- [ ] Create CommissionController
- [ ] Implement all endpoints
- [ ] Create DTOs
- [ ] Add validation

### Step 7: Transaction Auto-Linking (2 hours)
- [ ] Update sales-import processor
- [ ] Update TransactionService.create()
- [ ] Test automatic linking

### Step 8: Integration Testing (4 hours)
- [ ] Write E2E tests
- [ ] Test full commission lifecycle
- [ ] Test edge cases

### Step 9: Documentation & Audit (2 hours)
- [ ] Create Phase 3 completion report
- [ ] Update API documentation
- [ ] Code review and cleanup

**Total Estimated Time**: 22 hours

---

## 📝 Notes

- **Backward Compatibility**: All new fields are nullable - existing data unaffected
- **Performance**: Indexed queries ensure fast aggregation even with millions of transactions
- **Flexibility**: Manual calculation endpoint allows ad-hoc commission generation
- **Security**: Only admin users can trigger manual calculations or mark payments as paid
- **Reliability**: BullMQ handles job failures with automatic retries

---

## 🎉 Success Metrics

After Phase 3 completion:
- 📊 100% of revenue automatically attributed to contracts
- ⏰ 100% of commissions calculated on time
- 💰 Zero manual commission calculation needed
- 🔍 Full audit trail for all commission payments
- 📈 Real-time dashboard for commission obligations

**Phase 3 will make VendHub's commission management fully automated and transparent!**
