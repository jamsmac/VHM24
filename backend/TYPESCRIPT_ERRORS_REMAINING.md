# TypeScript Compilation Errors - Remaining Issues

## Summary
- **Initial errors**: 282
- **Fixed errors**: 54
- **Remaining errors**: 228

## Latest Updates (Session 3)
- ✅ Fixed test fixtures (fixtures.ts) - Task, Transaction, Location entities (37 errors)
- ✅ Fixed PaymentStatus string literals in commission module (5 errors)
- ✅ Added role to CreateUserDto in access-requests.service
- ✅ Fixed telegram_user_id type conversion in notifications.service
- ✅ Fixed integration stats undefined checks
- ✅ Fixed webhook.service async return type
- ✅ Fixed Date to string conversion in machines.service

## Previous Updates (Sessions 1-2)
- ✅ Fixed PaymentStatus enum in commission-calculation.entity
- ✅ Fixed PurchaseStatus enum in purchase-history.entity
- ✅ Added UserStatus import to equipment-notifications.service
- ✅ Added UserRole import to machines.controller

## What Was Fixed ✅

1. ✅ **Missing Dependencies**: Installed `@aws-sdk/s3-request-presigner` and `moment`
2. ✅ **Missing Entity Imports**:
   - Removed TaskChecklistItem references (doesn't exist - checklist stored as JSONB)
   - Fixed FinancialOperation import (module not implemented)
   - Changed Equipment to EquipmentComponent
3. ✅ **Task Property Names**:
   - `expected_amount` → `expected_cash_amount`
   - `actual_amount` → `actual_cash_amount`
   - `deadline` → `due_date`
4. ✅ **String Literals to Enums**: Converted many status/role literals to enum values
5. ✅ **Type Conversions**: Fixed some Date to string conversions

## Critical Remaining Issues

### 1. Missing Enum Imports
**Files**: counterparty, equipment, machines, telegram modules
**Issue**: Files use `TaskStatus`, `UserStatus`, `UserRole` but don't import them
**Fix**: Add imports at top of files:
```typescript
import { TaskStatus } from '../tasks/entities/task.entity';
import { UserStatus, UserRole } from '../users/entities/user.entity';
```

### 2. Missing Required DTO Properties
**File**: `src/modules/access-requests/access-requests.service.ts:175`
**Issue**: CreateUserDto requires `role` property
**Fix**:
```typescript
const user = await this.usersService.create({
  full_name: this.buildFullName(request),
  email: request.email,
  password: hashedPassword,
  phone: undefined,
  telegram_user_id: request.telegram_user_id,
  telegram_username: request.telegram_username,
  status: UserStatus.ACTIVE,
  role: UserRole.OPERATOR, // ADD THIS LINE
});
```

### 3. Recipe Entity Property Mismatches
**File**: `src/modules/recipes/recipes-snapshot.helper.ts`
**Issue**: Recipe entity doesn't have these properties:
- `category_code`, `base_cost`, `base_price`, `metadata`
- RecipeIngredient doesn't have `nomenclature_id`, `nomenclature`
**Fix**: Comment out or update to match actual entity structure

### 4. File Entity Category Property
**Files**: `operator-ratings.service.ts`, multiple reports services
**Issue**: File entity doesn't have `category` column
**Fix**: Query files by related entity ID and type instead:
```typescript
// Instead of: where: { category: 'task_photo_before' }
// Use: where: { entity_type: 'task', entity_id: taskId, file_type: 'photo_before' }
```

### 5. Type Mismatches (Date vs String)
**Files**: `machines.service.ts`, `equipment-scheduled-tasks.service.ts`
**Issue**: Passing Date objects where string expected
**Fix**: Add `.toISOString()`:
```typescript
transaction_date: disposalDate.toISOString(),
```

### 6. Null vs Undefined
**Files**: `washing-schedules.service.ts`, `attendance.service.ts`
**Issue**: Passing `null` where `undefined` expected or vice versa
**Fix**: Use null coalescing:
```typescript
schedule.interval_days ?? undefined
```

### 7. Telegram User ID Type Mismatch
**File**: `notifications.service.ts`
**Issue**: telegram_user_id is string in User entity but number expected in telegram service
**Fix**: Convert types:
```typescript
parseInt(telegramUserId)
```

### 8. Integration Service Stats
**File**: `integration.service.ts:126-130`
**Issue**: Stats properties possibly undefined
**Fix**: Initialize or use optional chaining:
```typescript
stats.total_calls = (stats.total_calls ?? 0) + 1;
```

### 9. Async Function Return Type
**File**: `webhook.service.ts:89`
**Issue**: Async function returns boolean instead of Promise<boolean>
**Fix**:
```typescript
async someMethod(): Promise<boolean> {
  return true;
}
```

### 10. Test Files (Can be skipped for now)
- `email.service.spec.ts`
- `file-intake.agent.spec.ts`
These are test files - can be fixed later

## Quick Fix Script

Run this to add missing imports automatically:

```bash
#!/bin/bash
# Add TaskStatus import where missing
for file in $(grep -l "TaskStatus\." src/**/*.ts | xargs grep -L "import.*TaskStatus"); do
  sed -i '' '1i\
import { TaskStatus } from '\''../tasks/entities/task.entity'\'';
' "$file"
done

# Add UserStatus/UserRole imports where missing
for file in $(grep -l "UserStatus\|UserRole" src/**/*.ts | xargs grep -L "import.*UserStatus\|import.*UserRole"); do
  sed -i '' '1i\
import { UserStatus, UserRole } from '\''../users/entities/user.entity'\'';
' "$file"
done
```

## Recommended Next Steps

1. **Add missing enum imports** (most critical - affects 50+ errors)
2. **Fix Recipe entity mismatches** (comment out snapshot features temporarily)
3. **Update File queries** (remove category references)
4. **Add missing DTO properties** (role in CreateUserDto)
5. **Fix remaining type conversions** (Date to string, null to undefined)

After these fixes, you should have <100 errors remaining, mostly in test files and edge cases.
