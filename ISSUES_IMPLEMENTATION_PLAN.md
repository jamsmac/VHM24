# Implementation Plan: Code Review Issues
**Target Completion**: 4 weeks
**Priority**: CRITICAL - Production Blocker

---

## WEEK 1: CRITICAL SECURITY FIXES (Estimated: 25 hours)

### Issue #1: Missing Authentication Guards on All Endpoints
**Modules**: Dictionaries + Telegram
**Priority**: CRITICAL 🔴
**Estimated Time**: 6 hours

#### Dictionaries Module (`dictionaries.controller.ts`)
```typescript
// BEFORE (Lines 1-50 - ALL endpoints)
@Controller('dictionaries')
export class DictionariesController {
  @Post()
  create(@Body() createDictionaryDto: CreateDictionaryDto) { ... }

// AFTER
@Controller('dictionaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DictionariesController {
  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() createDictionaryDto: CreateDictionaryDto) { ... }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'OPERATOR') // Readers can view
  findAll() { ... }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateDto) { ... }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) { ... }
}
```

**Steps**:
1. [ ] Add `@UseGuards(JwtAuthGuard, RolesGuard)` to DictionariesController class
2. [ ] Add `@Roles('ADMIN', 'MANAGER')` to POST/PATCH/DELETE endpoints
3. [ ] Add `@Roles('ADMIN', 'MANAGER', 'OPERATOR')` to GET endpoints
4. [ ] Import guards: `import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';`
5. [ ] Import decorator: `import { Roles } from '@modules/auth/decorators/roles.decorator';`
6. [ ] Test: Run `npm test` - should not break existing tests

#### Telegram Module (`telegram-settings.controller.ts`)
```typescript
// Line 14 - ADD GUARDS
@Controller('telegram/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TelegramSettingsController {
  @Put()
  @Roles('ADMIN') // Only admins can change bot token
  async updateSettings(@Body() dto: UpdateTelegramSettingsDto) { ... }
}
```

**Steps**:
1. [ ] Add `@UseGuards(JwtAuthGuard, RolesGuard)` to controller
2. [ ] Add `@Roles('ADMIN')` to updateSettings() method
3. [ ] Test: Verify non-admin users get 403 Forbidden

**Verification**:
```bash
# Test without auth
curl http://localhost:3000/dictionaries
# Should return 401 Unauthorized

# Test with user role (should fail)
curl -H "Authorization: Bearer $TOKEN_OPERATOR" \
  -X POST http://localhost:3000/dictionaries
# Should return 403 Forbidden

# Test with admin role (should succeed)
curl -H "Authorization: Bearer $TOKEN_ADMIN" \
  -X POST http://localhost:3000/dictionaries
# Should return 201 Created
```

---

### Issue #2: Weak Verification Code Generation
**Module**: Telegram
**File**: `telegram-users.service.ts`
**Lines**: 55-82
**Priority**: CRITICAL 🔴
**Estimated Time**: 4 hours

#### Current Code (VULNERABLE)
```typescript
// Line 63
private generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

#### Fixed Code
```typescript
import { randomBytes } from 'crypto';

private generateVerificationCode(): string {
  // Cryptographically secure 6-digit hex code
  return randomBytes(6).toString('hex').toUpperCase();
}

private async linkTelegramAccount(
  telegramId: string,
  code: string,
): Promise<void> {
  // Rate limit: max 5 attempts per 15 minutes
  const attempts = await this.redis.get(`verify_attempts:${telegramId}`);
  if (attempts && parseInt(attempts) >= 5) {
    throw new BadRequestException('Too many verification attempts. Try again in 15 minutes.');
  }

  // Verify code exists and is not expired (15 min lifetime)
  const storedCode = await this.telegramUserRepository.findOne({
    where: { verification_code: code, telegram_id: telegramId },
  });

  if (!storedCode) {
    await this.redis.incr(`verify_attempts:${telegramId}`);
    await this.redis.expire(`verify_attempts:${telegramId}`, 900); // 15 min
    throw new BadRequestException('Invalid or expired code');
  }

  // Check expiration (created_at + 15 min)
  const codeAge = Date.now() - storedCode.created_at.getTime();
  if (codeAge > 15 * 60 * 1000) {
    throw new BadRequestException('Code expired');
  }

  // Clear rate limit
  await this.redis.del(`verify_attempts:${telegramId}`);

  // Link account
  storedCode.is_verified = true;
  await this.telegramUserRepository.save(storedCode);
}
```

**Steps**:
1. [ ] Add `import { randomBytes } from 'crypto';`
2. [ ] Replace generateVerificationCode() with crypto version
3. [ ] Add Redis rate limiting (needs REDIS_URL env var)
4. [ ] Add code expiration check (15 minutes)
5. [ ] Update DTO: `verification_code: string @Length(12, 12)` (hex = 12 chars)
6. [ ] Add unit tests for rate limiting
7. [ ] Test: Try to verify with wrong code 6 times → should rate limit

---

### Issue #3: Transactional Task State Updates
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Lines**: 1315-1333
**Priority**: CRITICAL 🔴
**Estimated Time**: 6 hours

#### Current Code (RACE CONDITION)
```typescript
// Lines 1315-1333 - UNSAFE
private async updateExecutionState(
  taskId: string,
  state: TaskExecutionState,
): Promise<void> {
  try {
    const task = await this.tasksService.findOne(taskId);
    const metadata = task.metadata || {};
    metadata.telegram_execution_state = {
      ...state,
      last_interaction_at: new Date().toISOString(),
    };
    // RACE CONDITION HERE - another request could modify simultaneously
    await this.tasksService.update(taskId, { metadata });
  } catch (error) {
    this.logger.warn(`Failed to update execution state: ${error.message}`);
  }
}
```

#### Fixed Code (With Transactions)
```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class TelegramBotService {
  constructor(
    private readonly dataSource: DataSource, // Add this
    // ... other dependencies
  ) {}

  private async updateExecutionState(
    taskId: string,
    state: TaskExecutionState,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Read with exclusive lock to prevent other transactions
      const task = await queryRunner.manager.findOne(Task, {
        where: { id: taskId },
        lock: { mode: 'pessimistic_write' } // Prevents concurrent reads
      });

      if (!task) {
        throw new NotFoundException(`Task ${taskId} not found`);
      }

      // Update within transaction
      const metadata = task.metadata || {};
      metadata.telegram_execution_state = {
        ...state,
        last_interaction_at: new Date().toISOString(),
      };

      task.metadata = metadata;
      await queryRunner.manager.save(task);

      // Commit transaction atomically
      await queryRunner.commitTransaction();
      this.logger.log(`Updated execution state for task ${taskId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update execution state: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Steps**:
1. [ ] Add DataSource injection to constructor
2. [ ] Replace updateExecutionState() with transaction version
3. [ ] Add error handling with rollback
4. [ ] Add unit tests with concurrent request simulation
5. [ ] Test: Send 2 simultaneous updates → verify both applied correctly

---

### Issue #4: Photo Upload Validation
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Lines**: 800-840
**Priority**: CRITICAL 🔴
**Estimated Time**: 5 hours

#### Current Code (VULNERABLE)
```typescript
// Lines 809-838 - UNSAFE
const fileLink = await ctx.telegram.getFileLink(photo.file_id);
const response = await fetch(fileLink.href);
const buffer = Buffer.from(await response.arrayBuffer());

await this.filesService.uploadFile({
  file: {
    buffer,
    originalname: `telegram_${Date.now()}.jpg`,
    mimetype: 'image/jpeg', // Hardcoded!
    size: buffer.length,
  } as any,
  category,
  user_id: user.id,
  task_id: taskId, // No validation!
});
```

#### Fixed Code
```typescript
// Photo categories enum
enum PhotoCategory {
  TASK_PHOTO_BEFORE = 'task_photo_before',
  TASK_PHOTO_AFTER = 'task_photo_after',
}

// Add to telegram-bot.service.ts
private async validateAndUploadPhoto(
  fileLink: any,
  taskId: string,
  userId: string,
  category: PhotoCategory,
): Promise<void> {
  const MAX_FILE_SIZE = 5_000_000; // 5MB
  const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

  try {
    // 1. Fetch file with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s

    let response: Response;
    try {
      response = await fetch(fileLink.href, {
        signal: controller.signal,
        timeout: 30000,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new BadRequestException(`Failed to download photo: HTTP ${response.status}`);
    }

    // 2. Validate MIME type from response headers
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_MIMES.includes(contentType)) {
      throw new BadRequestException(`Invalid file type: ${contentType}. Allowed: JPEG, PNG, WebP`);
    }

    // 3. Check file size before reading
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`);
    }

    // 4. Read buffer and validate size
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large: ${buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
    }

    // 5. Verify task exists and user owns it
    const task = await this.tasksService.findOne(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (task.assigned_to_user_id !== userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    // 6. Verify task is in correct status
    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(`Task must be in progress to upload photos (current: ${task.status})`);
    }

    // 7. Upload file
    await this.filesService.uploadFile({
      file: {
        buffer,
        originalname: `telegram_photo_${taskId}_${Date.now()}.jpg`,
        mimetype: contentType,
        size: buffer.length,
      } as any,
      category,
      user_id: userId,
      task_id: taskId,
    });

    this.logger.log(`Uploaded ${category} for task ${taskId}`);
  } catch (error) {
    this.logger.error(`Photo upload error: ${error.message}`);
    throw error;
  }
}

// Update handlePhotoUpload to use new validation
this.bot.on('photo', async (ctx) => {
  try {
    const caption = 'caption' in ctx.message ? ctx.message.caption : '';
    const category = this.getPhotoCategory(caption);

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);

    // Extract task ID from caption
    const taskIdMatch = caption?.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    if (!taskIdMatch) {
      await ctx.reply('❌ No task ID found in caption. Format: "до/before {task_id}"');
      return;
    }

    const taskId = taskIdMatch[1];

    // Validate and upload
    await this.validateAndUploadPhoto(fileLink, taskId, user.id, category);

    // Update execution state
    const state = this.getExecutionState(task);
    state.photos_uploaded[category === 'task_photo_before' ? 'before' : 'after'] = true;
    await this.updateExecutionState(taskId, state);

    await ctx.reply(`✅ Photo uploaded for task ${taskId}`);
  } catch (error) {
    await ctx.reply(`❌ ${error.message}`);
  }
});
```

**Steps**:
1. [ ] Add photo validation constants (ALLOWED_MIMES, MAX_FILE_SIZE)
2. [ ] Create validateAndUploadPhoto() method with full validation
3. [ ] Add timeout handling with AbortController
4. [ ] Validate MIME type from response headers
5. [ ] Verify task ownership and status
6. [ ] Update photo upload handler to use validation
7. [ ] Add unit tests for all validation cases
8. [ ] Test: Upload non-image file → should reject

---

### Issue #5: Concurrent Step Overflow
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Lines**: 1447-1503
**Priority**: CRITICAL 🔴
**Estimated Time**: 3 hours

#### Fix: Add Bounds Checking
```typescript
// In handleStepCompletion()
private async handleStepCompletion(
  ctx: BotContext,
  taskId: string,
  action: 'done' | 'skip',
): Promise<void> {
  const task = await this.tasksService.findOne(taskId);
  const state = this.getExecutionState(task);

  if (!state) {
    throw new BadRequestException('Task execution not initialized');
  }

  // CRITICAL: Validate step index
  if (!state.checklist_progress) {
    state.checklist_progress = {};
  }

  const checklist = task.metadata?.checklist || [];
  const nextStep = state.current_step + 1;

  // ✅ ADD BOUNDS CHECK
  if (nextStep > checklist.length) {
    await ctx.reply('✅ All steps completed! You can now submit the task.');
    return;
  }

  if (nextStep >= checklist.length) {
    state.current_step = checklist.length - 1; // Cap at last step
  } else {
    state.current_step = nextStep;
  }

  // Mark step as done/skipped
  state.checklist_progress[state.current_step] = {
    completed: action === 'done',
    skipped: action === 'skip',
    completed_at: new Date().toISOString(),
  };

  await this.updateExecutionState(taskId, state);
  await this.showCurrentStep(ctx, task, state.current_step);
}
```

**Steps**:
1. [ ] Add bounds validation: `if (nextStep > checklist.length) throw error`
2. [ ] Cap step index at checklist.length - 1
3. [ ] Add unit tests: test rapid clicks → verify state integrity

---

### Issue #6: System Dictionary Protection
**Module**: Dictionaries
**File**: `dictionaries.service.ts`
**Priority**: CRITICAL 🔴
**Estimated Time**: 3 hours

#### Current Code (INCOMPLETE)
```typescript
// Line 90-100 - Only protects dictionary, not items!
async removeDictionary(id: string): Promise<void> {
  const dictionary = await this.dictionaryRepository.findOne({ where: { id } });

  if (dictionary.is_system) {
    throw new ForbiddenException('Cannot delete system dictionary');
  }

  await this.dictionaryRepository.softDelete(id);
}

// VULNERABLE - No check!
async removeDictionaryItem(id: string): Promise<void> {
  await this.dictionaryItemRepository.softDelete(id); // No validation!
}
```

#### Fixed Code
```typescript
async removeDictionaryItem(id: string): Promise<void> {
  const item = await this.dictionaryItemRepository.findOne({
    where: { id },
    relations: ['dictionary'],
  });

  if (!item) {
    throw new NotFoundException(`Dictionary item ${id} not found`);
  }

  // ✅ CRITICAL: Check if parent is system dictionary
  if (item.dictionary.is_system) {
    throw new ForbiddenException('Cannot delete items from system dictionary');
  }

  await this.dictionaryItemRepository.softDelete(id);
}

// Also protect item updates
async updateDictionaryItem(
  id: string,
  updateDictionaryItemDto: UpdateDictionaryItemDto,
): Promise<DictionaryItem> {
  const item = await this.dictionaryItemRepository.findOne({
    where: { id },
    relations: ['dictionary'],
  });

  if (!item) {
    throw new NotFoundException(`Dictionary item ${id} not found`);
  }

  // ✅ Check if parent is system dictionary
  if (item.dictionary.is_system) {
    throw new ForbiddenException('Cannot modify items in system dictionary');
  }

  await this.dictionaryItemRepository.update(id, updateDictionaryItemDto);
  return this.findOneDictionaryItem(id);
}
```

**Steps**:
1. [ ] Add relation loading to removeDictionaryItem()
2. [ ] Add system dictionary check
3. [ ] Also add same check to updateDictionaryItem()
4. [ ] Test: Try to delete item from system dictionary → should reject

---

## WEEK 2: HIGH PRIORITY FIXES (Estimated: 18 hours)

### Issue #7: Task Ownership Verification
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Lines**: 314-345, 747-765
**Priority**: HIGH 🟠
**Estimated Time**: 4 hours

```typescript
// VULNERABLE - Line 314
this.bot.action(/task_start_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);

  // NO VERIFICATION!
  const task = await this.tasksService.startTask(taskId, user.id);
});

// ✅ FIXED
this.bot.action(/task_start_(.+)/, async (ctx) => {
  const taskId = ctx.match[1];
  const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);

  const task = await this.tasksService.findOne(taskId);
  if (!task) {
    throw new NotFoundException(`Task ${taskId} not found`);
  }

  // ✅ VERIFY OWNERSHIP
  if (task.assigned_to_user_id !== user.id) {
    await ctx.reply('❌ You are not assigned to this task');
    return;
  }

  const result = await this.tasksService.startTask(taskId, user.id);
  await ctx.reply(`✅ Task started: ${result.title}`);
});
```

**Steps**:
1. [ ] Add task ownership check to task_start callback
2. [ ] Add task ownership check to task_step callbacks
3. [ ] Add task ownership check to task_complete callback
4. [ ] Add unit tests for unauthorized access scenarios
5. [ ] Test: User A tries to complete User B's task → should reject

---

### Issue #8-10: Performance Optimizations
**Module**: Telegram
**Time**: 6 hours

#### Issue #8: N+1 Query in Alerts Command
```typescript
// Line 476-487 - SLOW
const lowStockItems = await this.inventoryService.getMachinesLowStock();
const machineMap = new Map();

for (const item of lowStockItems.slice(0, 5)) {
  const machineId = item.machine_id;
  if (!machineMap.has(machineId)) {
    const machine = await this.machinesService.findOne(machineId); // N QUERIES
    machineMap.set(machineId, { machine: machine?.machine_number });
  }
}

// ✅ FIXED - Batch load
const lowStockItems = await this.inventoryService.getMachinesLowStock();
const machineIds = [...new Set(lowStockItems.map(i => i.machine_id))];
const machines = await this.machinesService.findByIds(machineIds); // 1 QUERY
const machineMap = new Map(machines.map(m => [m.id, m]));
```

#### Issue #9: Full Table Scan in Stats
```typescript
// Line 524-543 - LOADS ALL DATA
const allMachines = await this.machinesService.findAll();
const allTasks = await this.tasksService.findAll({});

// ✅ FIXED - Use aggregation
const machineStats = await this.machineRepository
  .createQueryBuilder('m')
  .select('COUNT(*)', 'total')
  .addSelect('SUM(CASE WHEN m.status = :active THEN 1 ELSE 0 END)', 'online')
  .setParameter('active', 'active')
  .getRawOne();

const taskStats = await this.taskRepository
  .createQueryBuilder('t')
  .select('COUNT(*)', 'total')
  .addSelect('SUM(CASE WHEN t.status = :completed THEN 1 ELSE 0 END)', 'completed')
  .setParameter('completed', 'completed')
  .getRawOne();
```

**Steps**:
1. [ ] Add `findByIds(ids: string[])` method to MachinesService if missing
2. [ ] Update handleAlertsCommand() to batch load machines
3. [ ] Update handleStatsCommand() to use QueryBuilder aggregation
4. [ ] Add unit tests verifying only 1 DB query per operation
5. [ ] Test: Check query logs → should see 1 query per command (not N)

---

### Issue #11: Memory Leak on Module Reload
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Lines**: 67-109
**Priority**: HIGH 🟠
**Estimated Time**: 3 hours

```typescript
// MISSING CLEANUP
export class TelegramBotService implements OnModuleInit {
  // ... onModuleInit code
}

// ✅ ADD OnModuleDestroy
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf<BotContext> | null = null;

  async onModuleInit() {
    await this.initializeBot();
  }

  // ✅ ADD THIS METHOD
  async onModuleDestroy() {
    await this.stopBot();
  }

  private async stopBot(): Promise<void> {
    if (this.bot) {
      try {
        await this.bot.stop('Module shutdown');
        this.logger.log('Telegram bot stopped gracefully');
      } catch (error) {
        this.logger.error('Error stopping bot:', error);
      }
    }
    this.bot = null;
    this.isInitialized = false;
  }
}
```

**Steps**:
1. [ ] Add OnModuleDestroy interface
2. [ ] Implement onModuleDestroy() method
3. [ ] Add stopBot() private method
4. [ ] Test: Restart module → verify listeners cleaned up

---

### Issue #12: Photo Validation Cross-Check
**Module**: Telegram
**File**: `telegram-bot.service.ts`
**Priority**: HIGH 🟠
**Estimated Time**: 4 hours

**Add database-level validation** in completeTask():

```typescript
// Line 746-748 - WEAK
const task = await this.tasksService.completeTask(taskId, user.id, {
  skip_photos: false,
});

// ✅ FIXED - Cross-validate with database
async handleCompleteTaskCallback(ctx: BotContext, taskId: string): Promise<void> {
  // 1. Verify task exists and user owns it
  const task = await this.tasksService.findOne(taskId);
  if (task.assigned_to_user_id !== ctx.telegramUser!.user_id) {
    throw new ForbiddenException('Not assigned to this task');
  }

  // 2. Check photos in execution state
  const state = this.getExecutionState(task);
  if (!state?.photos_uploaded?.before || !state?.photos_uploaded?.after) {
    throw new BadRequestException('Photos before and after are required');
  }

  // 3. Cross-validate with actual files in database
  const photosBefore = await this.filesService.findByTaskAndCategory(
    taskId,
    'task_photo_before'
  );
  const photosAfter = await this.filesService.findByTaskAndCategory(
    taskId,
    'task_photo_after'
  );

  if (photosBefore.length === 0 || photosAfter.length === 0) {
    throw new BadRequestException('Photos not found in database. Please re-upload.');
  }

  // 4. Verify photos are recent (within last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  if (photosBefore[0].created_at < twoHoursAgo ||
      photosAfter[0].created_at < twoHoursAgo) {
    throw new BadRequestException('Photos are too old. Please upload new photos.');
  }

  // 5. Now safe to complete
  await this.tasksService.completeTask(taskId, user.id);
  await ctx.reply('✅ Task completed successfully!');
}
```

**Steps**:
1. [ ] Add `findByTaskAndCategory()` method to FilesService
2. [ ] Add cross-validation in completeTask handler
3. [ ] Verify photo timestamps are recent
4. [ ] Test: Upload photos → wait 3 hours → try to complete → should reject

---

## WEEK 3: MEDIUM PRIORITY FIXES (Estimated: 15 hours)

### Issue #13-18: Security & Performance Improvements

**13. Unvalidated Environment Variables** (2 hours)
```typescript
// Add to main.ts or config validation
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required');
}

const frontendUrl = new URL(process.env.FRONTEND_URL);
if (!frontendUrl.protocol.startsWith('http')) {
  throw new Error('FRONTEND_URL must be valid HTTP(S) URL');
}
```

**14. Message Size Limits** (2 hours)
```typescript
const MAX_MESSAGE_LENGTH = 4096; // Telegram limit

private truncateMessage(message: string): string {
  if (message.length > MAX_MESSAGE_LENGTH) {
    return message.substring(0, MAX_MESSAGE_LENGTH - 20) + '\n\n...(truncated)';
  }
  return message;
}
```

**15. Pagination for Large Task Lists** (3 hours)
```typescript
const TASKS_PER_PAGE = 5;
const tasks = activeTasks.slice(0, TASKS_PER_PAGE);
const keyboard = Markup.inlineKeyboard([
  // Task buttons
  ...,
  // Pagination buttons if more tasks
  ...(activeTasks.length > TASKS_PER_PAGE ? [
    [Markup.button.callback('📄 Next Page', 'page_2')]
  ] : [])
]);
```

**16. RBAC Filtering for GET Endpoints** (3 hours)
```typescript
// telegram-users.controller.ts
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
async findAll() {
  return this.telegramUsersService.findAll();
}

// GET /me endpoint for current user
@Get('me')
@UseGuards(JwtAuthGuard)
async findMe(@Request() req: any) {
  return this.telegramUsersService.findByUserId(req.user.id);
}
```

**17. Generic Error Messages** (2 hours)
```typescript
// Remove detailed error messages
try {
  // ...
} catch (error) {
  this.logger.error('Detailed error:', error); // Log internally
  throw new BadRequestException('Operation failed. Please check your data and try again.');
}
```

**18. Database Indexes** (2 hours)
```
Create migration:
npm run migration:generate -- -n AddTelegramIndexes

Migration content:
CREATE INDEX idx_telegram_user_id ON telegram_users(telegram_id);
CREATE INDEX idx_telegram_user_user_id ON telegram_users(user_id);
CREATE INDEX idx_telegram_message_logs ON telegram_message_logs(telegram_user_id, created_at DESC);
CREATE INDEX idx_dictionary_code ON dictionaries(code);
CREATE INDEX idx_dictionary_item_code ON dictionary_items(dictionary_id, code);
```

---

## WEEK 4: LOW PRIORITY IMPROVEMENTS (Estimated: 10 hours)

### Issue #19-23: Code Quality

**19. Extract Magic Strings to Enums** (2 hours)
**20. Add Comprehensive JSDoc** (3 hours)
**21. Create Unit Tests** (3 hours)
**22. Code Deduplication** (1 hour)
**23. Validate Bot Token on Startup** (1 hour)

---

## Testing Checklist

### Unit Tests Required
- [ ] Verification code generation (crypto-secure, no collisions)
- [ ] Rate limiting (6+ attempts blocked)
- [ ] Task ownership validation (non-owners rejected)
- [ ] Photo validation (wrong MIME, oversized rejected)
- [ ] Step index bounds (overflow prevented)
- [ ] Transaction isolation (concurrent updates)
- [ ] Authorization guards (non-admin rejected)

### Integration Tests Required
- [ ] Complete task flow (start → upload photos → complete)
- [ ] Concurrent operations (2 users editing same task)
- [ ] Photo upload end-to-end (fetch → validate → store)
- [ ] Notification delivery
- [ ] Bot command execution

### Security Tests Required
- [ ] RBAC for all endpoints
- [ ] File upload with malicious files
- [ ] SQL injection in user inputs
- [ ] Rate limiting bypass attempts
- [ ] Token validation edge cases

---

## Deployment Checklist

- [ ] All critical issues fixed
- [ ] Unit tests passing (>70% coverage)
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Code review approval
- [ ] Database migrations created and tested
- [ ] Environment variables documented
- [ ] Rollback plan documented
- [ ] Performance baseline established
- [ ] Load testing completed

---

## Estimated Effort Summary

| Week | Focus | Hours | Issues |
|------|-------|-------|--------|
| 1 | Critical Security | 25 | 1-6 |
| 2 | High Priority | 18 | 7-12 |
| 3 | Medium Priority | 15 | 13-18 |
| 4 | Low Priority | 10 | 19-23 |
| **TOTAL** | **Production Ready** | **68** | **All 23 issues** |

**Team Capacity**: 2-3 developers × 4 weeks = Ready for production

---

*This plan assumes 2-3 developers working full-time. Adjust timeline based on actual team capacity.*
