# Critical Issues - Quick Fix Guide
**Print this and post in your team chat** 🚨

---

## CRITICAL FIXES (Must Complete Before Deployment)

### 🔴 #1: Add Authentication Guards
**Status**: NOT FIXED
**Impact**: 🔥 ANYONE CAN MODIFY ALL DATA

**Quick Fix**:
```typescript
// Add to ALL controllers
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('module-name')
export class MyController {
  @Post()
  @Roles('ADMIN', 'MANAGER')
  create() { }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR')
  findAll() { }
}
```

**Files to fix**:
- [ ] `dictionaries/dictionaries.controller.ts` - ALL 13 endpoints
- [ ] `telegram/telegram-settings.controller.ts` - PUT endpoint

**Test**: `curl http://localhost:3000/dictionaries` → should be 401

---

### 🔴 #2: Crypto Secure Codes
**Status**: NOT FIXED
**Impact**: 🔥 ACCOUNTS EASILY HIJACKED

**Quick Fix**:
```typescript
// Replace this:
const code = Math.random().toString(36).substring(2, 8);

// With this:
import { randomBytes } from 'crypto';
const code = randomBytes(6).toString('hex').toUpperCase();
```

**File**: `telegram-users.service.ts:63`

**Also add rate limiting**:
- Max 5 attempts per 15 minutes
- Code expires after 15 minutes

---

### 🔴 #3: Transactional Task Updates
**Status**: NOT FIXED
**Impact**: 🔥 TASK DATA LOSS DUE TO RACE CONDITIONS

**Quick Fix Pattern**:
```typescript
import { DataSource } from 'typeorm';

// In service:
constructor(private dataSource: DataSource) {}

async updateTaskState(taskId: string, state: any) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const task = await queryRunner.manager.findOne(Task, {
      where: { id: taskId },
      lock: { mode: 'pessimistic_write' } // CRITICAL!
    });
    task.metadata = state;
    await queryRunner.manager.save(task);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

**File**: `telegram-bot.service.ts:1315-1333` (updateExecutionState method)

---

### 🔴 #4: Photo Upload Validation
**Status**: NOT FIXED
**Impact**: 🔥 DOS ATTACK + FILE UPLOAD EXPLOITS

**Quick Fix Checklist**:
- [ ] Validate MIME type (whitelist: JPEG, PNG, WebP only)
- [ ] Check file size (max 5MB)
- [ ] Verify user owns task
- [ ] Add 30-second timeout to fetch
- [ ] Verify task is in "in_progress" status

**Template**:
```typescript
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5_000_000;

if (!ALLOWED_MIMES.includes(contentType)) {
  throw new BadRequestException('Invalid file type');
}
if (buffer.length > MAX_SIZE) {
  throw new BadRequestException('File too large');
}
const task = await this.tasksService.findOne(taskId);
if (task.assigned_to_user_id !== userId) {
  throw new ForbiddenException('Cannot upload to this task');
}
```

**File**: `telegram-bot.service.ts:800-840` (handlePhotoUpload)

---

### 🔴 #5: Step Index Bounds
**Status**: NOT FIXED
**Impact**: 🔥 TASK STATE CORRUPTION FROM RAPID CLICKS

**Quick Fix**:
```typescript
// Add bounds check
const checklist = task.metadata?.checklist || [];
if (stepIndex + 1 > checklist.length) {
  throw new BadRequestException('Step overflow');
}
state.current_step = Math.min(stepIndex + 1, checklist.length - 1);
```

**File**: `telegram-bot.service.ts:1479` (handleStepCompletion)

---

### 🔴 #6: Protect System Dictionaries
**Status**: NOT FIXED
**Impact**: 🔥 SYSTEM REFERENCE DATA CORRUPTION

**Quick Fix**:
```typescript
async removeDictionaryItem(id: string) {
  const item = await this.findOne(id);
  // ADD THIS CHECK:
  if (item.dictionary.is_system) {
    throw new ForbiddenException('Cannot modify system dictionary');
  }
  await this.remove(id);
}
```

**Also add to**: updateDictionaryItem()

**File**: `dictionaries/dictionaries.service.ts`

---

## HIGH PRIORITY FIXES (Next Week)

### 🟠 Task Ownership Verification
```typescript
// Before modifying any task:
const task = await this.tasksService.findOne(taskId);
if (task.assigned_to_user_id !== userId) {
  throw new ForbiddenException('Not assigned to task');
}
```

### 🟠 Query Performance (N+1)
```typescript
// BAD: Loop makes N queries
for (const item of items) {
  const machine = await this.machinesService.findOne(item.machine_id);
}

// GOOD: Batch query
const machineIds = items.map(i => i.machine_id);
const machines = await this.machinesService.findByIds(machineIds);
```

### 🟠 Event Listener Cleanup
```typescript
// Add to telegram-bot.service.ts
async onModuleDestroy() {
  if (this.bot) {
    await this.bot.stop();
  }
}
```

---

## VERIFICATION TESTS

### Test #1: Authentication
```bash
# Should be 401
curl http://localhost:3000/dictionaries

# Should be 403 if OPERATOR role
curl -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -X POST http://localhost:3000/dictionaries
```

### Test #2: Photo Validation
```bash
# Upload non-image file → should be rejected
# Upload > 5MB file → should be rejected
# Upload by non-owner → should be 403
```

### Test #3: Concurrent Updates
```bash
# 2 rapid clicks on "Done" button → step should be correct
# Task state should not be corrupted
```

### Test #4: Verification Code
```bash
# Generate code → try 6 wrong codes
# Should be rate limited on 6th attempt
# After 15 min, should be expired
```

---

## DANGER ZONES ⚠️

**NEVER DO THIS**:
```typescript
❌ const code = Math.random().toString(36);     // NOT SECURE
❌ const buffer = await response.arrayBuffer();  // NO VALIDATION
❌ await this.filesService.upload(data);        // NO OWNERSHIP CHECK
❌ state.current_step = index + 1;              // NO BOUNDS CHECK
❌ @Get() findAll() { }                         // NO AUTH GUARD
❌ await this.taskRepository.update();          // NO TRANSACTION
```

**ALWAYS DO THIS**:
```typescript
✅ import { randomBytes } from 'crypto';
✅ const code = randomBytes(6).toString('hex');
✅ Validate MIME type + size + ownership
✅ Use pessimistic_write lock for concurrent updates
✅ Add bounds: if (index > max) throw error
✅ Add @UseGuards(JwtAuthGuard, RolesGuard)
✅ Use QueryRunner for transactions
```

---

## DEBUGGING COMMANDS

```bash
# Check which endpoints lack guards
grep -r "@Post\|@Put\|@Delete" backend/src --include="*.ts" | \
  grep -v "@UseGuards" | head -20

# Find all Math.random() usage (should be randomBytes)
grep -r "Math.random()" backend/src --include="*.ts"

# Find all unvalidated buffer operations
grep -rn "arrayBuffer()" backend/src --include="*.ts"

# Find all task updates without locks
grep -rn "tasksService.update" backend/src --include="*.ts"
```

---

## DEPLOYMENT BLOCKER CHECKLIST

Before you deploy, verify ALL are FIXED:

- [ ] All endpoints have `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Photo uploads validate MIME type
- [ ] Photo uploads check file size (max 5MB)
- [ ] Photo uploads verify task ownership
- [ ] Task state updates use transactions with pessimistic_write lock
- [ ] Verification codes use randomBytes (not Math.random)
- [ ] Verification attempts rate limited (max 5 per 15 min)
- [ ] System dictionaries protected from modification
- [ ] Task step index bounded (no overflow)
- [ ] All @Get endpoints have @Roles decorator
- [ ] Network calls have 30-second timeout
- [ ] Event listeners cleanup on module destroy

**If ANY are unchecked: DO NOT DEPLOY**

---

## HELP! ISSUES?

**Test failing?**
1. Check if guards are imported: `import { JwtAuthGuard }`
2. Check if decorators are applied in correct order
3. Run `npm run lint` to catch import errors

**Photos still not validating?**
1. Check if filesService.uploadFile() exists
2. Check if response.headers.get() returns content-type
3. Add console.log() to debug validation flow

**Race condition still happening?**
1. Verify pessimistic_write lock is set
2. Verify queryRunner is properly released
3. Check for parallel task updates elsewhere

**Rate limiting not working?**
1. Check if Redis is connected
2. Verify redis.get/incr/expire are called
3. Add logging to rate limit check

---

## REVIEW THESE FILES FIRST

1. **`CODE_REVIEW_SUMMARY.md`** - Overview of all issues
2. **`ISSUES_IMPLEMENTATION_PLAN.md`** - Detailed fixes with code examples
3. **This file** - Quick reference for critical fixes

---

**Status**: 🚨 PRODUCTION BLOCKER
**Timeline**: 4 weeks to production-ready
**Team**: Assign 2-3 developers

*Last Updated: 2025-11-16*
*Questions? Check the detailed implementation plan.*
