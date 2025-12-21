# Reconciliation Module

## Overview

The Reconciliation module provides payment matching and verification for VendHub Manager. It compares sales data from multiple sources (hardware exports, payment systems, fiscal receipts) to identify discrepancies and ensure financial accuracy.

## Key Features

- Multi-source payment matching
- Time and amount tolerance matching
- Discrepancy detection and reporting
- Support for Uzbekistan payment systems (Payme, Click, Uzum)
- Hardware export (HW.xlsx) comparison
- Score-based matching confidence
- Machine-level reconciliation

## Entities

### ReconciliationRun

**File**: `backend/src/modules/reconciliation/entities/reconciliation-run.entity.ts`

```typescript
@Entity('reconciliation_runs')
@Index(['status'])
@Index(['created_by_user_id'])
@Index(['date_from', 'date_to'])
export class ReconciliationRun extends BaseEntity {
  status: ReconciliationStatus;     // Run status
  date_from: Date;                  // Period start
  date_to: Date;                    // Period end
  sources: ReconciliationSource[];  // Data sources to compare
  machine_ids: string[] | null;     // Specific machines (null = all)
  time_tolerance: number;           // Time tolerance (seconds)
  amount_tolerance: number;         // Amount tolerance (UZS)
  started_at: Date | null;          // Processing start
  completed_at: Date | null;        // Processing end
  processing_time_ms: number;       // Duration
  summary: ReconciliationSummary;   // Results summary
  error_message: string | null;     // Error if failed
  created_by_user_id: string;       // Who started the run
  mismatches: ReconciliationMismatch[]; // Found discrepancies
}
```

### Reconciliation Sources

| Source | Value | Description |
|--------|-------|-------------|
| HW | `hw` | Hardware export files (HW.xlsx) |
| Sales Report | `sales_report` | VendHub internal sales |
| Fiscal | `fiscal` | Fiscal receipt data |
| Payme | `payme` | Payme payment system |
| Click | `click` | Click payment system |
| Uzum | `uzum` | Uzum payment system |

### Reconciliation Statuses

```
┌─────────┐     ┌────────────┐     ┌───────────┐
│ PENDING │────>│ PROCESSING │────>│ COMPLETED │
└─────────┘     └────────────┘     └───────────┘
                      │
                      ├────────────────┐
                      ▼                ▼
                ┌────────┐      ┌───────────┐
                │ FAILED │      │ CANCELLED │
                └────────┘      └───────────┘
```

| Status | Value | Description |
|--------|-------|-------------|
| Pending | `pending` | Awaiting processing |
| Processing | `processing` | Currently running |
| Completed | `completed` | Successfully completed |
| Failed | `failed` | Error occurred |
| Cancelled | `cancelled` | User cancelled |

### ReconciliationMismatch

**File**: `backend/src/modules/reconciliation/entities/reconciliation-mismatch.entity.ts`

```typescript
@Entity('reconciliation_mismatches')
export class ReconciliationMismatch extends BaseEntity {
  run_id: string;                   // Reconciliation run reference
  machine_id: string;               // Machine where mismatch occurred
  transaction_time: Date;           // Transaction timestamp
  amount: number;                   // Transaction amount
  found_in_sources: string[];       // Sources where transaction found
  missing_from_sources: string[];   // Sources missing the transaction
  match_score: number;              // Confidence score (0-6)
  status: MismatchStatus;           // Resolution status
  resolved_by_id: string | null;    // Who resolved it
  resolved_at: Date | null;         // Resolution timestamp
  resolution_notes: string | null;  // Resolution explanation
  metadata: object;                 // Additional data
}
```

### Match Score Explanation

The matching algorithm uses a 6-point scoring system:

| Score | Description |
|-------|-------------|
| 6 | Perfect match across all sources |
| 5 | Match with minor time variance |
| 4 | Match with minor amount variance |
| 3 | Match in most sources, missing in one |
| 2 | Partial match, significant variance |
| 1 | Weak match, manual review needed |
| 0 | No match found |

### Reconciliation Summary

```typescript
interface ReconciliationSummary {
  totalOrders: number;              // Total transactions analyzed
  matchedOrders: number;            // Successfully matched
  unmatchedOrders: number;          // Unmatched transactions
  matchRate: number;                // Match percentage
  scoreDistribution: {
    '6': number;                    // Perfect matches
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
    '0': number;                    // No matches
  };
  totalRevenue: number;             // Total revenue in period
  matchedRevenue: number;           // Matched revenue
  discrepancyAmount: number;        // Unaccounted amount
  bySource: Record<string, {
    found: number;
    missing: number;
  }>;
  byMachine: Array<{
    machineId: string;
    machineName: string;
    matched: number;
    unmatched: number;
    revenue: number;
  }>;
}
```

## API Endpoints

```
POST   /api/reconciliation/runs          Create new run
GET    /api/reconciliation/runs          List runs
GET    /api/reconciliation/runs/:id      Get run details
DELETE /api/reconciliation/runs/:id      Cancel run
GET    /api/reconciliation/runs/:id/mismatches  Get mismatches
POST   /api/reconciliation/mismatches/:id/resolve  Resolve mismatch
GET    /api/reconciliation/summary       Get period summary
```

## DTOs

### CreateReconciliationRunDto

```typescript
class CreateReconciliationRunDto {
  @IsDate()
  date_from: Date;

  @IsDate()
  date_to: Date;

  @IsArray()
  @IsEnum(ReconciliationSource, { each: true })
  sources: ReconciliationSource[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  machine_ids?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  time_tolerance?: number;  // Default: 5 seconds

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  amount_tolerance?: number;  // Default: 100 UZS
}
```

### ResolveMismatchDto

```typescript
class ResolveMismatchDto {
  @IsString()
  @MinLength(10)
  resolution_notes: string;

  @IsEnum(MismatchResolution)
  resolution: MismatchResolution;
}

enum MismatchResolution {
  VALID_TRANSACTION = 'valid_transaction',    // Transaction is valid
  DUPLICATE = 'duplicate',                     // Was a duplicate
  TEST_TRANSACTION = 'test_transaction',       // Test/debug transaction
  REFUND = 'refund',                          // Was refunded
  SYSTEM_ERROR = 'system_error',              // System recording error
  TIMING_ISSUE = 'timing_issue',              // Clock sync issue
  OTHER = 'other',                            // Other reason
}
```

## Matching Algorithm

### Time-Amount Matching

```typescript
async matchTransactions(
  baseTransactions: Transaction[],
  compareTransactions: Transaction[],
  timeTolerance: number,
  amountTolerance: number,
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const base of baseTransactions) {
    let bestMatch: Transaction | null = null;
    let bestScore = 0;

    for (const compare of compareTransactions) {
      // Calculate time difference in seconds
      const timeDiff = Math.abs(
        base.transaction_time.getTime() - compare.transaction_time.getTime()
      ) / 1000;

      // Calculate amount difference
      const amountDiff = Math.abs(base.amount - compare.amount);

      // Skip if outside tolerances
      if (timeDiff > timeTolerance || amountDiff > amountTolerance) {
        continue;
      }

      // Calculate match score
      const score = this.calculateMatchScore(timeDiff, amountDiff, timeTolerance, amountTolerance);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = compare;
      }
    }

    results.push({
      baseTransaction: base,
      matchedTransaction: bestMatch,
      score: bestScore,
    });
  }

  return results;
}
```

### Score Calculation

```typescript
calculateMatchScore(
  timeDiff: number,
  amountDiff: number,
  timeTolerance: number,
  amountTolerance: number,
): number {
  let score = 6;

  // Deduct for time variance
  if (timeDiff > 0) {
    const timeScore = 1 - (timeDiff / timeTolerance);
    score -= (1 - timeScore) * 2;  // Max -2 points
  }

  // Deduct for amount variance
  if (amountDiff > 0) {
    const amountScore = 1 - (amountDiff / amountTolerance);
    score -= (1 - amountScore) * 2;  // Max -2 points
  }

  return Math.max(0, Math.round(score));
}
```

## Workflow

### Reconciliation Process

```
┌─────────────────────────────────────────────────────────────────┐
│                 RECONCILIATION WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User creates reconciliation run                              │
│         │                                                        │
│         ▼                                                        │
│  2. System loads data from selected sources                      │
│         │                                                        │
│         ├─── HW.xlsx export files                               │
│         ├─── VendHub sales database                             │
│         ├─── Payme API / files                                  │
│         ├─── Click API / files                                  │
│         └─── Uzum API / files                                   │
│                  │                                               │
│                  ▼                                               │
│  3. Normalize transactions to common format                      │
│         │                                                        │
│         ▼                                                        │
│  4. Run matching algorithm with tolerances                       │
│         │                                                        │
│         ▼                                                        │
│  5. Calculate match scores for each transaction                  │
│         │                                                        │
│         ▼                                                        │
│  6. Identify mismatches (score < threshold)                      │
│         │                                                        │
│         ▼                                                        │
│  7. Generate summary report                                      │
│         │                                                        │
│         ▼                                                        │
│  8. User reviews and resolves mismatches                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Reports

### Match Rate Report

```typescript
interface MatchRateReport {
  period: { from: Date; to: Date };
  overall_match_rate: number;
  by_source: {
    source: string;
    total: number;
    matched: number;
    rate: number;
  }[];
  by_machine: {
    machine_number: string;
    match_rate: number;
    discrepancy_amount: number;
  }[];
  trends: {
    date: string;
    match_rate: number;
  }[];
}
```

### Discrepancy Report

```typescript
interface DiscrepancyReport {
  total_discrepancy_amount: number;
  by_resolution_type: {
    type: MismatchResolution;
    count: number;
    amount: number;
  }[];
  unresolved: {
    count: number;
    amount: number;
  };
  top_problem_machines: {
    machine_number: string;
    mismatch_count: number;
    discrepancy_amount: number;
  }[];
}
```

## Scheduled Tasks

### Daily Reconciliation

```typescript
@Cron('0 4 * * *')  // Daily at 4 AM
async runDailyReconciliation(): Promise<void> {
  const yesterday = this.getYesterdayRange();

  await this.reconciliationService.createRun({
    date_from: yesterday.start,
    date_to: yesterday.end,
    sources: [
      ReconciliationSource.SALES_REPORT,
      ReconciliationSource.PAYME,
      ReconciliationSource.CLICK,
    ],
  });
}
```

## Integration with Other Modules

### Transactions

- Fetches transaction data for comparison

### Sales Import

- Uses imported hardware data

### Machines

- Machine-level reconciliation

### Reports

- Generates reconciliation reports

## Best Practices

1. **Regular Runs**: Run reconciliation daily
2. **Review Mismatches**: Don't ignore low-score matches
3. **Appropriate Tolerances**: Adjust for clock sync issues
4. **Source Priority**: Define authoritative source
5. **Document Resolutions**: Always add resolution notes

## Related Modules

- [Transactions](../TRANSACTIONS.md) - Transaction data
- [Sales Import](../sales-import/README.md) - Hardware data
- [Machines](../MACHINES.md) - Machine information
- [Reports](../reports/README.md) - Report generation
