# 🎫 VendHub Backend - Action Plan Tickets

**Total Tickets**: 47
**Total Effort**: 240 hours (6 weeks)
**Team Size**: 2 Backend Developers + 1 QA (part-time)

---

## 📋 Ticket Status Legend

- 🔴 **P0 - Critical** - Blocks production deployment
- 🟠 **P1 - High** - Important for production quality
- 🟡 **P2 - Medium** - Nice to have, improves maintainability
- 🟢 **P3 - Low** - Future improvements

**Effort Estimates:**
- XS: 1-2 hours
- S: 2-4 hours
- M: 4-8 hours
- L: 1-2 days (8-16 hours)
- XL: 3-5 days (24-40 hours)

---

# SPRINT 1: Critical Blockers (Weeks 1-2)

**Goal**: Fix build, security, and critical performance issues
**Total Tickets**: 14
**Total Effort**: 80 hours

---

## Week 1: Security & Build Fixes

### 🔴 BKD-001: Fix Broken Build - audit-log Import Mismatch

**Priority**: P0 - BLOCKER
**Effort**: XS (5 minutes)
**Assignee**: Any Developer
**Sprint**: Sprint 1, Week 1, Day 1

**Description:**
Build fails due to module import mismatch. Module exists as `audit-logs` (plural) but imported as `audit-log` (singular).

**Error:**
```
src/app.module.ts:35:32 - error TS2307:
Cannot find module './modules/audit-log/audit-log.module'
```

**Files to Fix:**
- `src/app.module.ts:35`
- `src/modules/auth/auth.module.ts` (if importing)

**Steps:**
1. Find all imports of `audit-log`
2. Replace with `audit-logs`
3. Verify build: `npm run build`
4. Run tests: `npm test`

**Acceptance Criteria:**
- [ ] `npm run build` succeeds without errors
- [ ] All tests pass
- [ ] No compilation errors

**Commands:**
```bash
# Find and replace
grep -r "audit-log" src/
sed -i '' 's/audit-log/audit-logs/g' src/app.module.ts

# Verify
npm run build
npm test
```

**Dependencies:** None
**Blocks:** All development work

---

### 🔴 BKD-002: Increase bcrypt Salt Rounds (10 → 12)

**Priority**: P0 - CRITICAL SECURITY
**Effort**: XS (15 minutes)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 1, Day 1

**Description:**
Current bcrypt salt rounds are set to 10, which is below the recommended 12 for production. This makes password hashes more vulnerable to brute-force attacks.

**Security Impact:**
- CVSS Score: 7.0 (High)
- Attack Vector: Brute-force password cracking
- Recommendation: NIST recommends 12+ rounds

**Files to Fix:**
- `src/modules/users/users.service.ts:50`
- `src/modules/auth/auth.service.ts:702`

**Changes:**
```typescript
// BEFORE
const salt = await bcrypt.genSalt(10);

// AFTER
const salt = await bcrypt.genSalt(12);
```

**Steps:**
1. Update users.service.ts
2. Update auth.service.ts
3. Test user registration
4. Test password reset
5. Update documentation

**Acceptance Criteria:**
- [ ] All bcrypt.genSalt calls use 12 rounds minimum
- [ ] User registration works
- [ ] Login works
- [ ] Password reset works
- [ ] No performance regression (hash time <500ms)

**Testing:**
```bash
# Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!@#","email":"test@test.com"}'

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Test123!@#"}'
```

**Dependencies:** BKD-001 (build must work)

---

### 🔴 BKD-003: Fix npm Vulnerabilities (15 issues, 8 high severity)

**Priority**: P0 - CRITICAL SECURITY
**Effort**: M (4-6 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 1, Day 2

**Description:**
npm audit shows 15 vulnerabilities (8 high severity). Must fix before production deployment.

**High-Severity Vulnerabilities:**
1. `glob` - Command injection (CVSS 7.5)
2. `tar-fs` - Path traversal (CVSS 7.5)
3. `ws` - DoS vulnerability (CVSS 7.5)
4. `inquirer` - Dependency vulnerability
5. Other transitive dependencies

**Steps:**
1. Run `npm audit` to see full list
2. Run `npm audit fix` (fixes 12/15)
3. Run `npm audit fix --force` for breaking changes
4. Test all functionality after updates
5. Document any unfixable vulnerabilities

**Commands:**
```bash
# Audit
npm audit
npm audit --json > audit-report.json

# Fix
npm audit fix
npm audit fix --force

# Re-audit
npm audit

# Test
npm test
npm run build
npm run start:dev
```

**Acceptance Criteria:**
- [ ] No critical or high severity vulnerabilities
- [ ] All tests pass after updates
- [ ] Application starts successfully
- [ ] All core features work (auth, tasks, inventory)
- [ ] Document any remaining moderate/low vulnerabilities

**Known Issues:**
- Some vulnerabilities may require major version updates
- Test thoroughly after `--force` updates

**Dependencies:** BKD-001

---

### 🔴 BKD-004: Migrate from xlsx to exceljs (Security Vulnerability)

**Priority**: P0 - CRITICAL SECURITY
**Effort**: L (12-16 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 1, Day 3-4

**Description:**
The `xlsx` library has a prototype pollution vulnerability (CVSS 8.2) with **NO FIX AVAILABLE**. Must migrate to `exceljs` which is actively maintained and secure.

**Affected Files:**
- `src/modules/sales-import/sales-import.service.ts`
- `src/modules/reports/services/report-export.service.ts`
- Any other Excel parsing/generation code

**Migration Steps:**
1. Install exceljs: `npm install exceljs`
2. Uninstall xlsx: `npm uninstall xlsx`
3. Find all xlsx imports: `grep -r "xlsx" src/`
4. Replace xlsx API calls with exceljs
5. Update tests
6. Test with sample Excel files

**API Comparison:**
```typescript
// BEFORE (xlsx)
import * as XLSX from 'xlsx';
const workbook = XLSX.read(buffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

// AFTER (exceljs)
import ExcelJS from 'exceljs';
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const worksheet = workbook.worksheets[0];
const data = [];
worksheet.eachRow((row) => {
  data.push(row.values);
});
```

**Files to Update:**
```bash
# Find all uses
grep -rn "xlsx" src/ --include="*.ts"

# Common locations:
# - src/modules/sales-import/
# - src/modules/reports/
# - src/modules/data-parser/
```

**Testing:**
- [ ] Import sales from Excel works
- [ ] Export reports to Excel works
- [ ] Edge cases: empty files, invalid formats
- [ ] Performance: same or better than xlsx

**Acceptance Criteria:**
- [ ] xlsx package removed from package.json
- [ ] All Excel import/export uses exceljs
- [ ] All existing tests pass
- [ ] Manual testing with sample files successful
- [ ] npm audit shows 0 vulnerabilities for xlsx

**Dependencies:** BKD-001, BKD-003

---

### 🔴 BKD-005: Add ThrottlerGuard to Auth Endpoints

**Priority**: P0 - CRITICAL SECURITY
**Effort**: S (2-3 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 1, Day 2

**Description:**
Auth endpoints (login, register, 2FA) lack rate limiting, making them vulnerable to brute-force attacks. ThrottlerModule is configured globally but not applied to auth endpoints.

**Vulnerable Endpoints:**
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/2fa/verify
- POST /api/v1/auth/password-reset

**Files to Update:**
- `src/modules/auth/controllers/auth.controller.ts`
- `src/modules/auth/controllers/two-factor-auth.controller.ts`

**Implementation:**
```typescript
import { ThrottlerGuard } from '@nestjs/throttler';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {

  @Post('login')
  @UseGuards(ThrottlerGuard, LocalAuthGuard, IpWhitelistGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    // ...
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  async register(@Body() registerDto: RegisterDto) {
    // ...
  }
}
```

**Rate Limits:**
- Login: 5 attempts/minute per IP
- Register: 3 attempts/5 minutes per IP
- 2FA verify: 10 attempts/minute per IP
- Password reset: 3 attempts/hour per IP

**Testing:**
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done

# Should return 429 Too Many Requests after 5 attempts
```

**Acceptance Criteria:**
- [ ] All auth endpoints have @UseGuards(ThrottlerGuard)
- [ ] Rate limits set appropriately
- [ ] Brute-force attack blocked (429 response)
- [ ] Legitimate users not impacted
- [ ] Error message clear: "Too many requests, try again in X seconds"

**Dependencies:** BKD-001

---

## Week 2: Performance Optimization

### 🔴 BKD-006: Fix N+1 Query in Task Completion

**Priority**: P0 - CRITICAL PERFORMANCE
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 1

**Description:**
Task completion service has N+1 query problem: loops through task items and saves each individually. With 10 items, this creates 10+ database queries instead of 1.

**Location:**
- `src/modules/tasks/tasks.service.ts:521-536`

**Current Code (BAD):**
```typescript
// ❌ N+1 QUERY PROBLEM
for (const itemDto of completeTaskDto.items) {
  const taskItem = task.items.find(
    (ti) => ti.nomenclature_id === itemDto.nomenclature_id,
  );
  if (taskItem) {
    taskItem.actual_quantity = itemDto.actual_quantity;
    await this.taskItemRepository.save(taskItem); // Individual save in loop!
  }
}
```

**Fixed Code:**
```typescript
// ✅ BULK UPDATE - Single query
const itemsToUpdate = completeTaskDto.items
  .map(itemDto => {
    const taskItem = task.items.find(
      ti => ti.nomenclature_id === itemDto.nomenclature_id
    );
    if (taskItem) {
      taskItem.actual_quantity = itemDto.actual_quantity;
      return taskItem;
    }
  })
  .filter(Boolean);

if (itemsToUpdate.length > 0) {
  await this.taskItemRepository.save(itemsToUpdate); // Single bulk save
}
```

**Performance Impact:**
- Before: 10 items = 10 queries (~500ms)
- After: 10 items = 1 query (~50ms)
- Improvement: **10x faster**

**Testing:**
1. Enable query logging: `logging: true` in typeorm.config.ts
2. Complete task with 10 items
3. Count queries in logs
4. Should see 1 INSERT/UPDATE, not 10

**Acceptance Criteria:**
- [ ] Task completion uses bulk save
- [ ] Query count reduced from N to 1
- [ ] All task items update correctly
- [ ] Tests pass
- [ ] Performance: <100ms for 10 items

**Dependencies:** BKD-001

---

### 🔴 BKD-007: Optimize Admin Dashboard Queries

**Priority**: P0 - CRITICAL PERFORMANCE
**Effort**: M (6-8 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 1-2

**Description:**
Admin dashboard loads ALL machines into memory and filters in JavaScript. This is inefficient and won't scale. Should use database aggregation queries.

**Location:**
- `src/modules/reports/services/admin-dashboard.service.ts:184-203`

**Current Code (BAD):**
```typescript
// ❌ INEFFICIENT: Loads all machines into memory
const machines = await this.machineRepository.find(); // Loads ALL!
const activeMachines = machines.filter((m) => m.status === 'active').length;
const offlineMachines = machines.filter((m) => m.status === 'offline').length;
```

**Fixed Code:**
```typescript
// ✅ DATABASE AGGREGATION: Let PostgreSQL do the work
const statusCounts = await this.machineRepository
  .createQueryBuilder('machine')
  .select('machine.status', 'status')
  .addSelect('COUNT(*)', 'count')
  .groupBy('machine.status')
  .getRawMany();

const statusMap = statusCounts.reduce((acc, { status, count }) => {
  acc[status] = parseInt(count);
  return acc;
}, {});

return {
  total_machines: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
  active_machines: statusMap['active'] || 0,
  offline_machines: (statusMap['offline'] || 0) + (statusMap['disabled'] || 0),
  machines_with_issues: (statusMap['error'] || 0) + (statusMap['maintenance'] || 0),
};
```

**Performance Impact:**
- Before: 1000 machines = load all + filter in memory (~2s)
- After: 1000 machines = 1 aggregation query (~50ms)
- Improvement: **40x faster**

**Similar Issues to Fix:**
- `operator-dashboard.service.ts:188-236` (7 separate count queries)
- Use single aggregation query instead

**Testing:**
```bash
# Load dashboard
curl http://localhost:3000/api/v1/dashboards/admin \
  -H "Authorization: Bearer $TOKEN"

# Check query logs for COUNT queries
# Should see 1 GROUP BY query, not multiple COUNT queries
```

**Acceptance Criteria:**
- [ ] Dashboard uses aggregation queries
- [ ] No full table scans (no `.find()` without WHERE)
- [ ] Query count reduced from 50+ to <10
- [ ] Response time <200ms
- [ ] Data accuracy verified

**Dependencies:** BKD-001

---

### 🔴 BKD-008: Add Pagination to All List Endpoints

**Priority**: P0 - CRITICAL PERFORMANCE
**Effort**: L (12-16 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 2-3

**Description:**
No endpoints have pagination. All return full datasets, which will cause performance issues and memory problems with large datasets.

**Endpoints Needing Pagination:**
- GET /api/v1/machines
- GET /api/v1/tasks
- GET /api/v1/transactions
- GET /api/v1/inventory/movements
- GET /api/v1/users
- GET /api/v1/incidents
- GET /api/v1/complaints

**Implementation Steps:**

**1. Create Pagination DTO:**
```typescript
// src/common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

**2. Update Controllers:**
```typescript
// BEFORE
@Get()
findAll(@Query('status') status?: MachineStatus): Promise<Machine[]> {
  return this.machinesService.findAll(status);
}

// AFTER
@Get()
findAll(
  @Query() pagination: PaginationDto,
  @Query('status') status?: MachineStatus,
): Promise<PaginatedResponse<Machine>> {
  return this.machinesService.findAll(pagination, status);
}
```

**3. Update Services:**
```typescript
async findAll(
  pagination: PaginationDto,
  status?: MachineStatus,
): Promise<PaginatedResponse<Machine>> {
  const { page = 1, limit = 20 } = pagination;

  const queryBuilder = this.machineRepository
    .createQueryBuilder('machine')
    .leftJoinAndSelect('machine.location', 'location');

  if (status) {
    queryBuilder.where('machine.status = :status', { status });
  }

  const [data, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}
```

**4. Update Swagger Docs:**
```typescript
@ApiResponse({
  status: 200,
  description: 'Paginated list of machines',
  schema: {
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/Machine' } },
      total: { type: 'number', example: 150 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 20 },
      pages: { type: 'number', example: 8 },
    },
  },
})
```

**Acceptance Criteria:**
- [ ] PaginationDto created in common/dto/
- [ ] All 7+ list endpoints paginated
- [ ] Default limit: 20 items
- [ ] Max limit: 100 items
- [ ] Response includes total count and page info
- [ ] Swagger docs updated
- [ ] Tests updated
- [ ] Frontend integration tested

**Testing:**
```bash
# Test pagination
curl "http://localhost:3000/api/v1/machines?page=1&limit=20"
curl "http://localhost:3000/api/v1/machines?page=2&limit=20"
curl "http://localhost:3000/api/v1/machines?limit=100" # Max
curl "http://localhost:3000/api/v1/machines?limit=101" # Should fail validation
```

**Dependencies:** BKD-001

---

### 🔴 BKD-009: Implement Redis Caching Layer

**Priority**: P0 - CRITICAL PERFORMANCE
**Effort**: XL (32-40 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 3-5

**Description:**
Currently using in-memory cache which is lost on restart and not shared across instances. Need proper Redis-based caching for production.

**Current Issues:**
- `reports/interceptors/cache.interceptor.ts` - In-memory Map
- Cache lost on server restart
- No distributed caching (multi-instance deployments)
- No cache invalidation strategy

**Implementation Steps:**

**1. Install Dependencies:**
```bash
npm install cache-manager cache-manager-redis-store
npm install --save-dev @types/cache-manager
```

**2. Create Redis Cache Module:**
```typescript
// src/common/cache/redis-cache.module.ts
import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 0),
        ttl: 300, // 5 minutes default
        max: 1000, // max items in cache
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
```

**3. Update .env:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**4. Implement Caching in Services:**
```typescript
// Example: machines.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(pagination: PaginationDto, status?: MachineStatus) {
    const cacheKey = `machines:${status || 'all'}:${pagination.page}:${pagination.limit}`;

    // Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    // Query database
    const result = await this.queryDatabase(pagination, status);

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300);
    this.logger.log(`Cache SET: ${cacheKey}`);

    return result;
  }

  async update(id: string, updateDto: UpdateMachineDto) {
    const result = await this.updateInDb(id, updateDto);

    // Invalidate cache
    const keys = await this.cacheManager.store.keys('machines:*');
    await Promise.all(keys.map(key => this.cacheManager.del(key)));

    return result;
  }
}
```

**5. Priority Caching Targets:**
- Machines list (changes infrequently)
- Nomenclature list (rarely changes)
- Locations list (rarely changes)
- Dashboard data (refresh every 1 minute)
- User permissions (refresh on change)

**Cache TTL Strategy:**
```typescript
const CACHE_TTL = {
  NOMENCLATURE: 3600,    // 1 hour (rarely changes)
  LOCATIONS: 1800,       // 30 minutes
  MACHINES: 300,         // 5 minutes
  DASHBOARD: 60,         // 1 minute (real-time feel)
  USER_PERMISSIONS: 600, // 10 minutes
  REPORTS: 300,          // 5 minutes
};
```

**6. Cache Invalidation:**
```typescript
// On entity update/delete
async invalidateCache(pattern: string) {
  const keys = await this.cacheManager.store.keys(pattern);
  await Promise.all(keys.map(key => this.cacheManager.del(key)));
}

// Usage
await this.invalidateCache('machines:*');
await this.invalidateCache('dashboard:*');
```

**Testing:**
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Test caching
curl http://localhost:3000/api/v1/machines  # Cache MISS
curl http://localhost:3000/api/v1/machines  # Cache HIT

# Monitor Redis
redis-cli MONITOR

# Check cache keys
redis-cli KEYS "machines:*"
```

**Acceptance Criteria:**
- [ ] RedisCacheModule created and imported in AppModule
- [ ] Redis connection configured
- [ ] At least 5 services use caching
- [ ] Cache hit rate >50% after 10 minutes
- [ ] Cache invalidation works on updates
- [ ] Performance improvement: 5-10x faster on cache hits
- [ ] Redis monitoring in place

**Dependencies:** BKD-001
**Related:** Requires Redis instance (Docker or hosted)

---

### 🔴 BKD-010: Fix Test Coverage (13% → 50%)

**Priority**: P0 - CRITICAL QUALITY
**Effort**: XL (32-40 hours)
**Assignee**: Backend Developer + QA
**Sprint**: Sprint 1, Week 2, Throughout

**Description:**
Test coverage is critically low at 13% vs target of 70%. Must add tests for critical business logic paths.

**Current Coverage:**
```
Statements   : 13.05% ( target: 70% )
Branches     : 8.99%  ( target: 70% )
Functions    : 8.83%  ( target: 70% )
Lines        : 12.92% ( target: 70% )
```

**Priority 1: Fix Failing Tests (2 hours)**
```bash
# tasks.service.spec.ts - 2 failing tests
npm test -- tasks.service.spec.ts

# Fix mock issues
# Expected: "machine-uuid"
# Received: undefined
```

**Priority 2: Critical Business Logic (20 hours)**

Add unit tests for:
- [ ] TasksService.completeTask() - Most critical business logic
- [ ] TasksService.create()
- [ ] InventoryService.transferOperatorToMachine()
- [ ] InventoryService.transferWarehouseToOperator()
- [ ] TransactionsService.create()
- [ ] AuthService.login()
- [ ] AuthService.validateUser()
- [ ] TwoFactorAuthService.verify()

**Priority 3: API Integration Tests (10 hours)**

Add E2E tests for:
- [ ] Task completion flow (create → assign → complete)
- [ ] Inventory transfer flow
- [ ] Auth flow (register → login → 2FA → refresh token)
- [ ] Machine CRUD

**Test Template:**
```typescript
// tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';

describe('TasksService', () => {
  let service: TasksService;
  let mockTaskRepository: any;

  beforeEach(async () => {
    mockTaskRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        // Mock other dependencies
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('completeTask', () => {
    it('should complete task with valid photos', async () => {
      // Arrange
      const taskId = 'test-task-id';
      mockTaskRepository.findOne.mockResolvedValue({
        id: taskId,
        status: 'in_progress',
      });

      // Act
      const result = await service.completeTask(taskId, userId, dto);

      // Assert
      expect(result.status).toBe('completed');
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should throw error if photos missing', async () => {
      // Test photo validation
      await expect(
        service.completeTask(taskId, userId, { skip_photos: false })
      ).rejects.toThrow('Photos required');
    });
  });
});
```

**E2E Test Template:**
```typescript
// test/tasks-completion.e2e-spec.ts
describe('Task Completion Flow (E2E)', () => {
  it('should complete refill task with inventory transfer', async () => {
    // 1. Create task
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type_code: 'refill',
        machine_id: machineId,
        items: [{ nomenclature_id: productId, planned_quantity: 10 }],
      })
      .expect(201);

    const taskId = createResponse.body.id;

    // 2. Upload before photo
    await uploadPhoto(taskId, 'before');

    // 3. Start task
    await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${taskId}/start`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);

    // 4. Upload after photo
    await uploadPhoto(taskId, 'after');

    // 5. Complete task
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ items: [{ nomenclature_id: productId, actual_quantity: 10 }] })
      .expect(200);

    // 6. Verify inventory transferred
    const inventory = await getInventory(machineId, productId);
    expect(inventory.quantity).toBe(10);
  });
});
```

**Coverage Goals by Sprint:**
- Sprint 1 End: 50% coverage
- Sprint 2 End: 65% coverage
- Sprint 3 End: 70% coverage

**Commands:**
```bash
# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tasks.service.spec.ts

# Run in watch mode
npm test -- --watch

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

**Acceptance Criteria:**
- [ ] All failing tests fixed
- [ ] Coverage ≥50% (statements, branches, functions, lines)
- [ ] All critical business logic tested
- [ ] At least 5 E2E test suites
- [ ] CI/CD blocks merge if coverage drops

**Dependencies:** BKD-001

---

### 🟠 BKD-011: Replace console.log with Logger (162 instances)

**Priority**: P1 - HIGH
**Effort**: M (6-8 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 4

**Description:**
162 console.log statements bypass structured logging, making debugging harder and potentially leaking sensitive data.

**Files Affected:**
```bash
# Find all console.log
grep -rn "console.log" src/ --include="*.ts" | wc -l
# Output: 162

# Top offenders:
# - reports/interceptors/cache.interceptor.ts (10+)
# - notifications/notifications.service.ts (8+)
# - intelligent-import/intelligent-import.gateway.ts (6+)
```

**Migration Strategy:**

**1. Add Logger to Services:**
```typescript
// BEFORE
console.log(`[Cache HIT] ${cacheKey}`);
console.log(`[SMS] Sending to user ${userId}`);

// AFTER
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  someMethod() {
    this.logger.log(`Cache HIT: ${cacheKey}`);
    this.logger.debug(`SMS sending to user: ${userId}`);
    this.logger.warn(`Low stock warning: ${machineId}`);
    this.logger.error(`Failed to process: ${error.message}`, error.stack);
  }
}
```

**2. Log Levels:**
- `logger.log()` - General info (replaces most console.log)
- `logger.debug()` - Detailed debugging info
- `logger.warn()` - Warnings (potential issues)
- `logger.error()` - Errors with stack trace
- `logger.verbose()` - Very detailed info

**3. Structured Logging:**
```typescript
// Add context
this.logger.log({
  message: 'Task completed',
  taskId: task.id,
  userId: user.id,
  duration: endTime - startTime,
});

// Instead of
console.log(`Task ${task.id} completed by ${user.id} in ${duration}ms`);
```

**4. Automated Migration (90% of cases):**
```bash
# Find and replace script
find src/ -name "*.ts" -not -name "*.spec.ts" -exec sed -i '' \
  's/console\.log/this.logger.log/g' {} \;

# Manual review required for:
# - Static methods (use Logger instance parameter)
# - Constructors (use logger in ngOnInit or after construction)
# - Helper functions (pass logger as parameter)
```

**5. Winston Configuration (already in place):**
```typescript
// main.ts - Already configured
app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
```

**Testing:**
```bash
# Test logging
npm run start:dev

# Check logs output structured data
# Should see timestamps, levels, context
```

**Acceptance Criteria:**
- [ ] 0 console.log statements in src/ (except tests)
- [ ] All services have `private readonly logger = new Logger(ClassName.name)`
- [ ] Appropriate log levels used
- [ ] Sensitive data not logged (passwords, tokens)
- [ ] Winston integration working

**Dependencies:** BKD-001

---

### 🟠 BKD-012: Add Response Compression

**Priority**: P1 - HIGH
**Effort**: XS (1-2 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 5

**Description:**
Large JSON responses (dashboards, reports) are sent uncompressed, wasting bandwidth and slowing down client apps.

**Impact:**
- Dashboard response: 500KB → 50KB (90% reduction)
- Reports: 1.2MB → 120KB (90% reduction)
- Bandwidth savings: ~80% overall

**Implementation:**

**1. Install compression:**
```bash
npm install compression
npm install --save-dev @types/compression
```

**2. Update main.ts:**
```typescript
// main.ts
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add compression middleware
  app.use(compression({
    level: 6,           // Compression level (1-9, higher = smaller but slower)
    threshold: 1024,    // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression's default filter
      return compression.filter(req, res);
    },
  }));

  // ... rest of bootstrap
}
```

**3. Test Compression:**
```bash
# Without compression
curl -H "Accept-Encoding: identity" \
  http://localhost:3000/api/v1/dashboards/admin \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nSize: %{size_download} bytes\n"

# With compression (gzip)
curl -H "Accept-Encoding: gzip" \
  http://localhost:3000/api/v1/dashboards/admin \
  -H "Authorization: Bearer $TOKEN" \
  --compressed \
  -w "\nSize: %{size_download} bytes\n"
```

**Acceptance Criteria:**
- [ ] compression middleware added to main.ts
- [ ] Responses >1KB are compressed
- [ ] Content-Encoding: gzip header present
- [ ] File size reduced by 70-90% for JSON responses
- [ ] No performance regression (<10ms compression overhead)

**Dependencies:** BKD-001

---

### 🟠 BKD-013: Enable TypeScript Strict Mode

**Priority**: P1 - HIGH (moved from Sprint 2 for early detection)
**Effort**: L (12-16 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 5 (start)

**Description:**
TypeScript strict mode is not enabled, allowing type safety issues to slip through. Enable to catch bugs at compile time.

**Current tsconfig.json:**
```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    // Missing many strict checks!
  }
}
```

**Target tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,                        // Enables all strict checks
    "noImplicitReturns": true,             // Functions must return explicitly
    "noUnusedLocals": true,                // No unused variables
    "noUnusedParameters": true,            // No unused function params
    "noUncheckedIndexedAccess": true,      // Index signatures return T | undefined
    "noFallthroughCasesInSwitch": true,    // Switch must have break/return
  }
}
```

**Implementation Strategy:**

**1. Enable one flag at a time:**
```bash
# Week 2, Day 5: Enable strict
# Expected: 200-500 compilation errors
npm run build 2>&1 | tee strict-errors.txt

# Count errors by type
grep "error TS" strict-errors.txt | cut -d':' -f4 | sort | uniq -c
```

**2. Fix errors by priority:**
- P0: Blocking errors (cannot compile)
- P1: Type safety issues
- P2: Unused variables/parameters

**3. Common Fixes:**
```typescript
// Error: Object is possibly 'null'
// BEFORE
const user = await this.findUser(id);
return user.name; // Error if user is null

// AFTER
const user = await this.findUser(id);
if (!user) {
  throw new NotFoundException('User not found');
}
return user.name;

// Error: Function lacks return statement
// BEFORE
async updateMachine(id: string, dto: UpdateDto) {
  await this.machineRepository.update(id, dto);
  // Missing return!
}

// AFTER
async updateMachine(id: string, dto: UpdateDto): Promise<Machine> {
  await this.machineRepository.update(id, dto);
  return await this.findOne(id);
}

// Error: Unused parameter
// BEFORE
async findAll(status?: string, unused?: string) {
  return this.repository.find({ where: { status } });
}

// AFTER
async findAll(status?: string) {
  return this.repository.find({ where: { status } });
}
```

**4. Incremental Approach:**
```bash
# Day 1: Enable strict, fix critical files (auth, tasks)
# Day 2: Fix services (inventory, machines, users)
# Day 3: Fix controllers and DTOs
# Day 4: Fix remaining files, tests
```

**Acceptance Criteria:**
- [ ] `strict: true` in tsconfig.json
- [ ] All other strict flags enabled
- [ ] `npm run build` succeeds with 0 errors
- [ ] All tests pass
- [ ] No `@ts-ignore` comments added

**Dependencies:** BKD-001
**Note:** This is challenging but critical for long-term code quality

---

### 📊 BKD-014: Configure Sentry Error Tracking

**Priority**: P1 - HIGH
**Effort**: S (2-3 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 1, Week 2, Day 5

**Description:**
Sentry package is installed but not configured. Production errors go unnoticed without error tracking.

**Current State:**
```typescript
// package.json
"@sentry/node": "^8.55.0"  // ✅ Installed

// main.ts
// ❌ No Sentry initialization
```

**Implementation:**

**1. Get Sentry DSN:**
- Sign up at sentry.io (free tier: 5k errors/month)
- Create project: VendHub Backend
- Copy DSN: `https://xxx@sentry.io/123456`

**2. Update .env:**
```env
SENTRY_DSN=https://xxx@sentry.io/123456
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0
```

**3. Initialize Sentry:**
```typescript
// main.ts
import * as Sentry from '@sentry/node';

async function bootstrap() {
  const configService = app.get(ConfigService);

  // Initialize Sentry
  Sentry.init({
    dsn: configService.get('SENTRY_DSN'),
    environment: configService.get('SENTRY_ENVIRONMENT', 'development'),
    release: configService.get('SENTRY_RELEASE', '1.0.0'),
    tracesSampleRate: 0.1, // 10% of transactions
    integrations: [
      // Automatically instrument Node.js libraries
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],
  });

  // ... rest of bootstrap
}
```

**4. Global Exception Filter:**
```typescript
// common/filters/sentry-exception.filter.ts
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Send to Sentry
    Sentry.captureException(exception);

    // Continue with normal error handling
    super.catch(exception, host);
  }
}

// main.ts
app.useGlobalFilters(new SentryExceptionFilter());
```

**5. Manual Error Reporting:**
```typescript
// In services
import * as Sentry from '@sentry/node';

try {
  await this.criticalOperation();
} catch (error) {
  // Add context
  Sentry.setContext('task', {
    taskId: task.id,
    machineId: task.machine_id,
  });

  // Report error
  Sentry.captureException(error);

  throw error;
}
```

**6. Test Error Tracking:**
```typescript
// Create test endpoint
@Get('sentry-test')
testSentry() {
  throw new Error('Sentry test error');
}

// Trigger error
curl http://localhost:3000/api/v1/sentry-test

// Check Sentry dashboard for error
```

**Acceptance Criteria:**
- [ ] Sentry initialized in main.ts
- [ ] Global exception filter sends errors to Sentry
- [ ] Environment and release tags set
- [ ] Test error appears in Sentry dashboard
- [ ] Sensitive data filtered (passwords, tokens)
- [ ] Performance monitoring enabled

**Dependencies:** BKD-001

---

## SPRINT 1 SUMMARY

**Total Tickets**: 14
**Total Effort**: 80 hours (2 developers × 2 weeks)

**Expected Outcomes:**
- ✅ Build works
- ✅ Security hardened (bcrypt, vulnerabilities fixed)
- ✅ N+1 queries eliminated
- ✅ Pagination implemented
- ✅ Redis caching working
- ✅ Test coverage ≥50%
- ✅ TypeScript strict mode enabled (started)
- ✅ Sentry error tracking configured

**Score Improvement:**
- Before: 67/100
- After Sprint 1: **~78/100** (🟡 → 🟢)

---

# SPRINT 2: Code Quality & Testing (Weeks 3-4)

**Goal**: Improve type safety, code maintainability, and test coverage
**Total Tickets**: 18
**Total Effort**: 80 hours

---

## Week 3: TypeScript & Code Quality

### 🟠 BKD-015: Complete TypeScript Strict Mode Migration

**Priority**: P1 - HIGH
**Effort**: L (12-16 hours) - Continuation from BKD-013
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 3, Day 1-2

**Description:**
Complete the strict mode migration started in Sprint 1. Fix all remaining compilation errors.

**Remaining Work:**
- Fix controllers and DTOs
- Fix helper functions and utilities
- Fix test files
- Remove any temporary @ts-ignore

**Target:** 0 compilation errors with strict mode

**Acceptance Criteria:**
- [ ] npm run build succeeds with 0 errors
- [ ] All tests pass
- [ ] No @ts-ignore comments
- [ ] Type coverage >90%

**Dependencies:** BKD-013

---

### 🟠 BKD-016: Reduce 'any' Types from 1,188 to <500

**Priority**: P1 - HIGH
**Effort**: XL (24-32 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 3, Throughout

**Description:**
Reduce usage of `any` type by 60%. Focus on top 20 files with most `any` usage.

**Top Priority Files:**
1. `src/modules/reports/interfaces/report.interface.ts` (20+ any)
2. `src/modules/reports/builders/report-builder.service.ts` (15+ any)
3. Entity `settings` fields (all entities)
4. DTO `metadata` fields

**Fixes:**

**1. Report Interfaces:**
```typescript
// BEFORE
export interface ReportData {
  rows: any[];
  columns: ColumnDefinition[];
  totals?: any;
}

// AFTER
export interface ReportRow {
  [columnKey: string]: string | number | Date | null;
}

export interface ReportData {
  rows: ReportRow[];
  columns: ColumnDefinition[];
  totals?: Record<string, number>;
}
```

**2. Entity Settings:**
```typescript
// BEFORE
@Column({ type: 'jsonb', nullable: true })
settings: Record<string, any> | null;

// AFTER
export interface MachineSettings {
  lowStockThreshold?: number;
  maintenanceInterval?: number;
  alertEmail?: string;
  autoRefill?: boolean;
  customFields?: Record<string, string>;
}

@Column({ type: 'jsonb', nullable: true })
settings: MachineSettings | null;
```

**3. DTO Metadata:**
```typescript
// BEFORE
@IsObject()
metadata?: Record<string, any>;

// AFTER
export interface TaskMetadata {
  estimatedDuration?: number;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
}

@IsObject()
@ValidateNested()
@Type(() => TaskMetadata)
metadata?: TaskMetadata;
```

**Tracking:**
```bash
# Count any usage before
grep -r "any" src/ --include="*.ts" | wc -l
# Target: 1188 → <500

# Track progress weekly
git commit -m "Reduce any types: 1188 → 800 (-32%)"
```

**Acceptance Criteria:**
- [ ] any usage reduced from 1,188 to <500
- [ ] All report interfaces properly typed
- [ ] All entity settings have interfaces
- [ ] All DTO metadata typed
- [ ] Tests updated for new types

**Dependencies:** BKD-015 (strict mode)

---

### 🟠 BKD-017: Refactor telegram-bot.service.ts (1,951 lines → <500)

**Priority**: P1 - HIGH
**Effort**: XL (24-32 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 3-4

**Description:**
Split telegram-bot.service.ts (1,951 lines) into focused handler classes.

**Current Structure (BAD):**
```
telegram-bot.service.ts (1,951 lines)
├── Bot initialization
├── Command handlers (30+ methods)
├── Callback handlers (20+ methods)
├── Message handlers
├── Session management
├── Menu builders
└── Message formatters
```

**Target Structure (GOOD):**
```
telegram/
├── telegram-bot.service.ts (200 lines) - Core bot & lifecycle
├── handlers/
│   ├── telegram-tasks.handler.ts (200 lines)
│   ├── telegram-machines.handler.ts (150 lines)
│   ├── telegram-collections.handler.ts (150 lines)
│   ├── telegram-incidents.handler.ts (150 lines)
│   └── telegram-auth.handler.ts (100 lines)
├── services/
│   ├── telegram-session.service.ts (150 lines)
│   ├── telegram-menu.service.ts (200 lines)
│   └── telegram-message-formatter.service.ts (150 lines)
└── interfaces/
    └── telegram-context.interface.ts
```

**Implementation:**

**1. Extract Tasks Handler:**
```typescript
// handlers/telegram-tasks.handler.ts
@Injectable()
export class TelegramTasksHandler {
  constructor(
    private readonly tasksService: TasksService,
    private readonly sessionService: TelegramSessionService,
  ) {}

  async handleTasksList(ctx: TelegramContext) {
    const userId = ctx.from.id;
    const tasks = await this.tasksService.findByOperator(userId);
    // ... format and send
  }

  async handleStartTask(ctx: TelegramContext) {
    // ...
  }

  async handleCompleteTask(ctx: TelegramContext) {
    // ...
  }
}
```

**2. Update telegram-bot.service.ts:**
```typescript
// telegram-bot.service.ts
@Injectable()
export class TelegramBotService implements OnModuleInit {
  constructor(
    private readonly tasksHandler: TelegramTasksHandler,
    private readonly machinesHandler: TelegramMachinesHandler,
    private readonly collectionsHandler: TelegramCollectionsHandler,
    private readonly menuService: TelegramMenuService,
  ) {}

  async onModuleInit() {
    await this.initializeBot();
    this.setupCommands();
  }

  private setupCommands() {
    this.bot.command('tasks', (ctx) => this.tasksHandler.handleTasksList(ctx));
    this.bot.command('machines', (ctx) => this.machinesHandler.handleMachinesList(ctx));
    // ...
  }
}
```

**Refactoring Plan:**
- Day 1-2: Extract tasks handler
- Day 3: Extract machines and collections handlers
- Day 4: Extract session and menu services
- Day 5: Extract message formatter
- Day 6: Test all Telegram bot functionality

**Acceptance Criteria:**
- [ ] telegram-bot.service.ts <500 lines
- [ ] All handlers in separate files <250 lines each
- [ ] All Telegram commands work
- [ ] All tests pass
- [ ] Code coverage maintained or improved

**Dependencies:** BKD-001

---

### 🟠 BKD-018: Refactor tasks.service.ts (1,404 lines → <500)

**Priority**: P1 - HIGH
**Effort**: XL (24-32 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 4

**Description:**
Extract business logic from tasks.service.ts into focused services and domain logic.

**Current Issues:**
- 1,404 lines (should be <500)
- 12 injected dependencies
- Handles tasks, inventory, transactions, notifications
- God object anti-pattern

**Target Structure:**
```
tasks/
├── tasks.service.ts (300 lines) - CRUD only
├── services/
│   ├── task-completion.service.ts (200 lines)
│   ├── task-assignment.service.ts (150 lines)
│   ├── task-validation.service.ts (150 lines)
│   └── task-photo-validator.service.ts (100 lines)
├── orchestrators/
│   └── task-orchestrator.service.ts (250 lines)
└── entities/
    └── task.entity.ts (enriched with domain methods)
```

**Extract Task Completion Logic:**
```typescript
// services/task-completion.service.ts
@Injectable()
export class TaskCompletionService {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async completeTask(
    task: Task,
    userId: string,
    dto: CompleteTaskDto,
  ): Promise<Task> {
    // Validate task can be completed
    this.validateCompletion(task);

    // Update task status
    task.status = TaskStatus.COMPLETED;
    task.completed_at = new Date();
    task.completed_by_user_id = userId;

    // Handle inventory transfers
    if (task.type_code === TaskType.REFILL) {
      await this.handleRefillInventory(task, dto);
    }

    // Create transaction
    if (task.type_code === TaskType.COLLECTION) {
      await this.transactionsService.create({
        machine_id: task.machine_id,
        amount: dto.collected_amount,
        type: 'collection',
      });
    }

    // Send notifications
    await this.notificationsService.notifyTaskCompleted(task);

    return task;
  }

  private validateCompletion(task: Task) {
    if (!task.canBeCompleted()) {
      throw new BadRequestException('Task cannot be completed');
    }
  }
}
```

**Enrich Domain Model:**
```typescript
// entities/task.entity.ts
@Entity('tasks')
export class Task extends BaseEntity {
  // ... fields

  // Add domain methods
  canBeCompleted(): boolean {
    return this.status === TaskStatus.IN_PROGRESS;
  }

  isOverdue(): boolean {
    return this.due_date && this.due_date < new Date();
  }

  requiresPhotos(): boolean {
    return [TaskType.REFILL, TaskType.COLLECTION, TaskType.MAINTENANCE]
      .includes(this.type_code);
  }

  assign(userId: string): void {
    if (this.status !== TaskStatus.CREATED) {
      throw new TaskCannotBeAssignedException();
    }
    this.assigned_to_user_id = userId;
    this.status = TaskStatus.ASSIGNED;
  }
}
```

**Acceptance Criteria:**
- [ ] tasks.service.ts <500 lines
- [ ] Business logic in separate services
- [ ] Domain methods in Task entity
- [ ] All tests pass
- [ ] No regression in functionality

**Dependencies:** BKD-001

---

### 🟠 BKD-019: Refactor inventory.service.ts (1,284 lines → <500)

**Priority**: P1 - HIGH
**Effort**: L (16-20 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 4

**Description:**
Split inventory.service.ts into focused services for warehouse, operator, and machine inventory.

**Target Structure:**
```
inventory/
├── inventory.service.ts (200 lines) - Facade
├── services/
│   ├── warehouse-inventory.service.ts (200 lines)
│   ├── operator-inventory.service.ts (200 lines)
│   ├── machine-inventory.service.ts (200 lines)
│   └── inventory-transfer.service.ts (300 lines)
```

**Implementation:**
```typescript
// inventory.service.ts - Facade pattern
@Injectable()
export class InventoryService {
  constructor(
    private readonly warehouseInventory: WarehouseInventoryService,
    private readonly operatorInventory: OperatorInventoryService,
    private readonly machineInventory: MachineInventoryService,
    private readonly inventoryTransfer: InventoryTransferService,
  ) {}

  // Delegate to specific services
  async getWarehouseInventory(nomenclatureId?: string) {
    return this.warehouseInventory.findAll(nomenclatureId);
  }

  async transferWarehouseToOperator(dto: TransferDto) {
    return this.inventoryTransfer.warehouseToOperator(dto);
  }
}
```

**Acceptance Criteria:**
- [ ] inventory.service.ts <500 lines
- [ ] Separate services for each inventory level
- [ ] Transfer logic in dedicated service
- [ ] All tests pass

**Dependencies:** BKD-001

---

### 🟡 BKD-020: Remove Circular Dependencies (8 forwardRef)

**Priority**: P2 - MEDIUM
**Effort**: L (16-20 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 4

**Description:**
Refactor to remove all 8 instances of forwardRef using event-driven architecture.

**Current Circular Dependencies:**
1. Tasks ↔ WashingSchedules
2. Tasks ↔ ComponentMovements
3. Tasks ↔ Components
4. Auth ↔ AuditLog
5. Notifications ↔ TelegramBot
6. Machines ↔ Transactions

**Solution: Event-Driven Architecture**

**1. Create Domain Events:**
```typescript
// events/task-completed.event.ts
export class TaskCompletedEvent {
  constructor(
    public readonly taskId: string,
    public readonly machineId: string,
    public readonly completedBy: string,
    public readonly taskType: TaskType,
  ) {}
}
```

**2. Emit Events from Services:**
```typescript
// tasks.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TasksService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async completeTask(taskId: string) {
    // ... complete task

    // Emit event instead of calling service directly
    this.eventEmitter.emit(
      'task.completed',
      new TaskCompletedEvent(task.id, task.machine_id, userId, task.type_code),
    );
  }
}
```

**3. Listen to Events:**
```typescript
// washing-schedules.service.ts
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class WashingSchedulesService {
  @OnEvent('task.completed')
  async handleTaskCompleted(event: TaskCompletedEvent) {
    if (event.taskType === TaskType.WASHING) {
      await this.updateSchedule(event.machineId);
    }
  }
}
```

**Events to Implement:**
- task.created
- task.completed
- task.assigned
- machine.status.changed
- inventory.transferred
- user.logged.in

**Acceptance Criteria:**
- [ ] 0 instances of forwardRef
- [ ] Event emitter used for cross-module communication
- [ ] All tests pass
- [ ] No regression in functionality

**Dependencies:** BKD-001

---

## Week 4: Testing & Observability

### 🔴 BKD-021: Increase Test Coverage to 65%

**Priority**: P0 - CRITICAL
**Effort**: XL (32-40 hours)
**Assignee**: Backend Developer + QA
**Sprint**: Sprint 2, Week 4, Throughout

**Description:**
Continue from Sprint 1 to reach 65% coverage (target: 70% by Sprint 3).

**Focus Areas:**
- Reports module (currently 0% coverage)
- Analytics services (0% coverage)
- Security module (0% coverage)
- Warehouse module (0% coverage)

**Test Templates:** (See BKD-010)

**Acceptance Criteria:**
- [ ] Overall coverage ≥65%
- [ ] All critical business logic tested
- [ ] All controllers have basic E2E tests
- [ ] No untested P0 critical paths

**Dependencies:** BKD-010

---

### 🟠 BKD-022: Add E2E Tests for Critical Flows

**Priority**: P1 - HIGH
**Effort**: L (16-20 hours)
**Assignee**: QA Engineer
**Sprint**: Sprint 2, Week 4

**Description:**
Add comprehensive E2E tests for business-critical flows.

**Flows to Test:**

**1. Complete Task Flow:**
```typescript
describe('Complete Refill Task Flow', () => {
  it('should complete full task lifecycle', async () => {
    // 1. Admin creates task
    // 2. Operator accepts task
    // 3. Upload before photo
    // 4. Start task
    // 5. Upload after photo
    // 6. Complete with actual quantities
    // 7. Verify inventory transferred
    // 8. Verify notifications sent
  });
});
```

**2. Inventory Transfer Flow:**
```typescript
describe('3-Level Inventory Transfer', () => {
  it('should transfer warehouse → operator → machine', async () => {
    // ...
  });
});
```

**3. Auth Flow with 2FA:**
```typescript
describe('Authentication with 2FA', () => {
  it('should authenticate user with TOTP', async () => {
    // 1. Register user
    // 2. Enable 2FA
    // 3. Login with password
    // 4. Verify TOTP code
    // 5. Receive tokens
    // 6. Refresh token
    // 7. Logout
  });
});
```

**Acceptance Criteria:**
- [ ] 10+ E2E test suites
- [ ] All critical flows covered
- [ ] Tests run in CI/CD
- [ ] <5 minute total E2E test time

**Dependencies:** BKD-001

---

### 🟠 BKD-023: Implement Correlation IDs

**Priority**: P1 - HIGH
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 4

**Description:**
Add correlation IDs to all requests for better debugging and distributed tracing.

**Implementation:**

**1. Create Middleware:**
```typescript
// common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req['correlationId'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}
```

**2. Update Logger:**
```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.correlationId;

    this.logger.log({
      message: 'Request received',
      correlationId,
      method: request.method,
      url: request.url,
    });

    return next.handle();
  }
}
```

**3. Add to Sentry:**
```typescript
Sentry.setContext('request', {
  correlationId: request.correlationId,
});
```

**Acceptance Criteria:**
- [ ] All requests have correlation ID
- [ ] ID returned in response header
- [ ] ID logged with all log entries
- [ ] ID sent to Sentry
- [ ] Frontend can pass correlation ID

**Dependencies:** BKD-014 (Sentry)

---

### 🟠 BKD-024: Add Performance Monitoring Endpoint

**Priority**: P1 - HIGH
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 2, Week 4

**Description:**
Create endpoint to monitor API performance metrics.

**Implementation:**
```typescript
// modules/health/performance.controller.ts
@Controller('health/performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get()
  getMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      requests: this.performanceService.getRequestMetrics(),
      database: this.performanceService.getDatabaseMetrics(),
      cache: this.performanceService.getCacheMetrics(),
    };
  }

  @Get('slow-queries')
  getSlowQueries() {
    // Return queries >500ms
    return this.performanceService.getSlowQueries();
  }
}
```

**Metrics to Track:**
- Request count by endpoint
- Average response time by endpoint
- P50, P95, P99 latencies
- Error rate
- Database query count
- Slow queries (>500ms)
- Cache hit/miss rate

**Acceptance Criteria:**
- [ ] /health/performance endpoint
- [ ] Metrics tracked in-memory
- [ ] Slow query logging
- [ ] Dashboard-ready JSON format

**Dependencies:** BKD-009 (Redis caching for cache metrics)

---

## SPRINT 2 SUMMARY

**Total Tickets**: 10
**Total Effort**: 80 hours

**Expected Outcomes:**
- ✅ TypeScript strict mode fully enabled
- ✅ `any` types reduced by 60%
- ✅ All god classes refactored (<500 lines)
- ✅ Circular dependencies removed
- ✅ Test coverage ≥65%
- ✅ E2E tests for critical flows
- ✅ Correlation IDs implemented
- ✅ Performance monitoring

**Score Improvement:**
- Before Sprint 2: 78/100
- After Sprint 2: **~84/100** (🟢)

---

# SPRINT 3: Polish & Production Prep (Weeks 5-6)

**Goal**: Final optimizations, documentation, and production readiness
**Total Tickets**: 15
**Total Effort**: 80 hours

---

## Week 5: API & Domain Model Enhancements

### 🟠 BKD-025: Create Response DTOs for All Entities

**Priority**: P1 - HIGH
**Effort**: L (12-16 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 5, Day 1-2

**Description:**
Create proper response DTOs to control what data is exposed. Currently entities are returned directly from controllers.

**Problems:**
- Internal fields exposed (password_hash, deleted_at)
- Inconsistent response formats
- Circular reference issues with relations
- No control over serialization

**Implementation:**

**1. Create Base Response DTO:**
```typescript
// common/dto/base-response.dto.ts
export class BaseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  // Don't expose deleted_at, created_by_id, etc.
}
```

**2. Create Entity Response DTOs:**
```typescript
// modules/machines/dto/machine-response.dto.ts
export class MachineResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'M-001' })
  machine_number: string;

  @ApiProperty({ example: 'Coffee Machine Lobby' })
  name: string;

  @ApiProperty({ enum: MachineStatus })
  status: MachineStatus;

  @ApiProperty({ type: LocationSummaryDto })
  location: LocationSummaryDto; // Nested DTO, not full entity

  @ApiProperty({ example: 85 })
  stock_level_percent?: number; // Computed field

  // Don't expose internal fields like qr_code_data, settings
}

// For nested relations
export class LocationSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  // Only essential fields, not full location entity
}
```

**3. Use class-transformer:**
```typescript
// machines.controller.ts
@Get(':id')
@ApiResponse({ status: 200, type: MachineResponseDto })
async findOne(@Param('id') id: string): Promise<MachineResponseDto> {
  const machine = await this.machinesService.findOne(id);
  return plainToClass(MachineResponseDto, machine, {
    excludeExtraneousValues: true,
  });
}
```

**4. Or use Interceptor:**
```typescript
// common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Auto-transform entities to DTOs
        if (data?.constructor?.name?.endsWith('Entity')) {
          const dtoClass = this.getDtoClass(data.constructor.name);
          return plainToClass(dtoClass, data);
        }
        return data;
      }),
    );
  }
}
```

**Entities to Create DTOs For:**
- [ ] Machine → MachineResponseDto
- [ ] Task → TaskResponseDto
- [ ] User → UserResponseDto
- [ ] Transaction → TransactionResponseDto
- [ ] Inventory → InventoryResponseDto
- [ ] Incident → IncidentResponseDto
- [ ] Location → LocationResponseDto

**Acceptance Criteria:**
- [ ] Response DTOs for all 20+ entities
- [ ] No password hashes or sensitive data exposed
- [ ] Computed fields included (stock_level_percent)
- [ ] Nested relations use summary DTOs
- [ ] Swagger docs updated with response types
- [ ] Tests verify correct serialization

**Dependencies:** BKD-001

---

### 🟠 BKD-026: Enrich Domain Model with Business Logic

**Priority**: P1 - HIGH
**Effort**: L (12-16 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 5, Day 2-3

**Description:**
Move business logic from services to entities to create a rich domain model.

**Current: Anemic Domain Model**
```typescript
// task.entity.ts
@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ type: 'enum', enum: TaskStatus })
  status: TaskStatus;
  // Just data, no behavior
}

// tasks.service.ts
async completeTask(taskId: string) {
  const task = await this.findOne(taskId);
  if (task.status !== TaskStatus.IN_PROGRESS) { // Business logic in service
    throw new BadRequestException('Task not in progress');
  }
}
```

**Target: Rich Domain Model**
```typescript
// task.entity.ts
@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ type: 'enum', enum: TaskStatus })
  status: TaskStatus;

  // Business logic methods
  canBeCompleted(): boolean {
    return this.status === TaskStatus.IN_PROGRESS;
  }

  complete(userId: string): void {
    if (!this.canBeCompleted()) {
      throw new TaskCannotBeCompletedException();
    }
    this.status = TaskStatus.COMPLETED;
    this.completed_at = new Date();
    this.completed_by_user_id = userId;
  }

  isOverdue(): boolean {
    return this.due_date && this.due_date < new Date();
  }

  requiresPhotos(): boolean {
    return [TaskType.REFILL, TaskType.COLLECTION].includes(this.type_code);
  }
}

// tasks.service.ts - Much simpler
async completeTask(taskId: string, userId: string) {
  const task = await this.findOne(taskId);
  task.complete(userId); // Business logic in entity
  return await this.taskRepository.save(task);
}
```

**Domain Methods to Add:**

**Task Entity:**
- [ ] canBeCompleted(): boolean
- [ ] complete(userId): void
- [ ] assign(userId): void
- [ ] isOverdue(): boolean
- [ ] requiresPhotos(): boolean

**Machine Entity:**
- [ ] isOnline(): boolean
- [ ] needsMaintenance(): boolean
- [ ] isLowStock(): boolean
- [ ] canDispense(productId, quantity): boolean

**User Entity:**
- [ ] hasRole(role): boolean
- [ ] hasPermission(permission): boolean
- [ ] can(action, resource): boolean
- [ ] isSuperAdmin(): boolean

**Inventory Entity:**
- [ ] isLowStock(): boolean
- [ ] canFulfill(quantity): boolean
- [ ] add(quantity): void
- [ ] subtract(quantity): void

**Acceptance Criteria:**
- [ ] All business validation in entities
- [ ] Services only orchestrate, not validate
- [ ] Domain methods tested
- [ ] No regression in functionality

**Dependencies:** BKD-001

---

### 🟠 BKD-027: Create Value Objects

**Priority**: P1 - HIGH
**Effort**: M (8-12 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 5, Day 3-4

**Description:**
Create value objects to encapsulate business rules and replace primitive types.

**Value Objects to Create:**

**1. Money:**
```typescript
// common/value-objects/money.vo.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string = 'UZS',
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  static fromNumber(amount: number, currency = 'UZS'): Money {
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract different currencies');
    }
    if (this.amount < other.amount) {
      throw new Error('Insufficient funds');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  toNumber(): number {
    return this.amount;
  }

  toString(): string {
    return `${this.amount.toLocaleString()} ${this.currency}`;
  }
}

// Usage in entities
@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  private _amount: number;

  get amount(): Money {
    return Money.fromNumber(this._amount);
  }

  set amount(money: Money) {
    this._amount = money.toNumber();
  }
}
```

**2. Quantity:**
```typescript
export class Quantity {
  private constructor(private readonly value: number) {
    if (value < 0) {
      throw new Error('Quantity cannot be negative');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be integer');
    }
  }

  static fromNumber(value: number): Quantity {
    return new Quantity(value);
  }

  add(other: Quantity): Quantity {
    return new Quantity(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    if (this.value < other.value) {
      throw new InsufficientQuantityException();
    }
    return new Quantity(this.value - other.value);
  }

  isGreaterThan(other: Quantity): boolean {
    return this.value > other.value;
  }

  toNumber(): number {
    return this.value;
  }
}
```

**3. DateRange:**
```typescript
export class DateRange {
  constructor(
    private readonly start: Date,
    private readonly end: Date,
  ) {
    if (end < start) {
      throw new Error('End date cannot be before start date');
    }
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  overlaps(other: DateRange): boolean {
    return this.start <= other.end && this.end >= other.start;
  }

  getDurationInDays(): number {
    return Math.floor((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Usage in DTOs
export class ReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => DateRangeDto)
  dateRange?: DateRange;
}
```

**Acceptance Criteria:**
- [ ] Money value object created and used
- [ ] Quantity value object for inventory
- [ ] DateRange for reports and filters
- [ ] Tests for all value objects
- [ ] Domain validation in value objects

**Dependencies:** BKD-026

---

### 🟠 BKD-028: Add Sorting to All List Endpoints

**Priority**: P1 - HIGH
**Effort**: M (6-8 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 5, Day 4

**Description:**
Add sorting capability to all paginated endpoints.

**Implementation:**

**1. Create Sort DTO:**
```typescript
// common/dto/sort.dto.ts
export class SortDto {
  @ApiPropertyOptional({
    example: 'createdAt:desc,name:asc',
    description: 'Sort by field:direction pairs, comma-separated',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  parseSort(): Array<{ field: string; direction: 'ASC' | 'DESC' }> {
    if (!this.sort) return [];

    return this.sort.split(',').map(part => {
      const [field, direction = 'asc'] = part.split(':');
      return {
        field: field.trim(),
        direction: direction.toUpperCase() as 'ASC' | 'DESC',
      };
    });
  }
}
```

**2. Update Controllers:**
```typescript
@Get()
findAll(
  @Query() pagination: PaginationDto,
  @Query() sort: SortDto,
  @Query('status') status?: MachineStatus,
) {
  return this.machinesService.findAll(pagination, sort, status);
}
```

**3. Update Services:**
```typescript
async findAll(pagination: PaginationDto, sort: SortDto, status?: MachineStatus) {
  const queryBuilder = this.machineRepository.createQueryBuilder('machine');

  // Apply sorting
  const sortOptions = sort.parseSort();
  sortOptions.forEach(({ field, direction }) => {
    queryBuilder.addOrderBy(`machine.${field}`, direction);
  });

  // Default sort
  if (sortOptions.length === 0) {
    queryBuilder.orderBy('machine.created_at', 'DESC');
  }

  // ... pagination and filters
}
```

**Acceptance Criteria:**
- [ ] SortDto created
- [ ] Sorting on all list endpoints
- [ ] Multiple sort fields supported
- [ ] Default sort if none specified
- [ ] Swagger docs updated

**Dependencies:** BKD-008 (pagination)

---

### 🟠 BKD-029: Implement RFC 7807 Problem Details

**Priority**: P1 - HIGH
**Effort**: S (4-6 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 5, Day 5

**Description:**
Standardize error responses using RFC 7807 Problem Details format.

**Implementation:**

**1. Create Problem Details DTO:**
```typescript
// common/dto/problem-details.dto.ts
export class ProblemDetailsDto {
  @ApiProperty({ example: 'https://api.vendhub.uz/errors/validation-error' })
  type: string;

  @ApiProperty({ example: 'Validation Error' })
  title: string;

  @ApiProperty({ example: 400 })
  status: number;

  @ApiProperty({ example: 'One or more fields failed validation' })
  detail: string;

  @ApiProperty({ example: '/api/v1/tasks' })
  instance: string;

  @ApiProperty({ example: { machine_id: ['must be a UUID'] } })
  errors?: Record<string, string[]>;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  correlationId?: string;
}
```

**2. Update Exception Filter:**
```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = this.getHttpStatus(exception);

    const problemDetails: ProblemDetailsDto = {
      type: `https://api.vendhub.uz/errors/${this.getErrorType(exception)}`,
      title: this.getTitle(exception),
      status,
      detail: this.getDetail(exception),
      instance: request.url,
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
    };

    // Add validation errors if present
    if (exception instanceof BadRequestException) {
      const validationErrors = this.extractValidationErrors(exception);
      if (validationErrors) {
        problemDetails.errors = validationErrors;
      }
    }

    response.status(status).json(problemDetails);
  }
}
```

**Acceptance Criteria:**
- [ ] ProblemDetailsDto created
- [ ] All errors return RFC 7807 format
- [ ] Validation errors included in `errors` field
- [ ] Correlation ID included
- [ ] Swagger docs updated

**Dependencies:** BKD-023 (correlation IDs)

---

## Week 6: Final Polish & Load Testing

### 🟠 BKD-030: Optimize Remaining God Classes

**Priority**: P1 - HIGH
**Effort**: M (8-12 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 1

**Description:**
Refactor remaining files >500 lines:
- scheduled-tasks.service.ts (1,162 lines)
- reports.controller.ts (742 lines)
- admin-dashboard.service.ts (673 lines)

**Target:** All files <500 lines

**Dependencies:** BKD-017, BKD-018, BKD-019

---

### 🟠 BKD-031: Add Query Result Caching (TypeORM)

**Priority**: P1 - HIGH
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 1

**Description:**
Enable TypeORM query result caching for frequently accessed data.

**Implementation:**
```typescript
// typeorm.config.ts
export default {
  // ... other config
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    duration: 30000, // 30 seconds default
  },
};

// Usage in repositories
const machines = await this.machineRepository
  .createQueryBuilder('machine')
  .cache('machines-all', 60000) // Cache for 1 minute
  .getMany();
```

**Acceptance Criteria:**
- [ ] TypeORM cache configured
- [ ] Frequently accessed queries cached
- [ ] Cache invalidation on updates

**Dependencies:** BKD-009 (Redis)

---

### 🟠 BKD-032: Implement Database Query Monitoring

**Priority**: P1 - HIGH
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 2

**Description:**
Add PostgreSQL query monitoring to detect slow queries.

**Implementation:**
```bash
# Enable pg_stat_statements
psql -U postgres -d vendhub -c "CREATE EXTENSION pg_stat_statements;"

# Query slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 500  -- Queries slower than 500ms
ORDER BY mean_time DESC
LIMIT 20;
```

**Application Monitoring:**
```typescript
// common/interceptors/query-logger.interceptor.ts
@Injectable()
export class QueryLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 500) {
          this.logger.warn({
            message: 'Slow query detected',
            duration,
            endpoint: context.switchToHttp().getRequest().url,
          });
        }
      }),
    );
  }
}
```

**Acceptance Criteria:**
- [ ] pg_stat_statements enabled
- [ ] Slow query logging (>500ms)
- [ ] Daily reports of slow queries

**Dependencies:** None

---

### 🔴 BKD-033: Increase Test Coverage to 70%

**Priority**: P0 - CRITICAL
**Effort**: L (16-20 hours)
**Assignee**: Backend Developer + QA
**Sprint**: Sprint 3, Week 6, Day 2-4

**Description:**
Final push to reach 70% target coverage.

**Focus:** Untested modules (reports, analytics, warehouse, hr)

**Acceptance Criteria:**
- [ ] Overall coverage ≥70%
- [ ] No critical path <80% coverage

**Dependencies:** BKD-021

---

### 🟠 BKD-034: Load Testing with k6

**Priority**: P1 - HIGH
**Effort**: M (6-8 hours)
**Assignee**: QA Engineer + DevOps
**Sprint**: Sprint 3, Week 6, Day 3

**Description:**
Perform load testing to establish performance baselines.

**k6 Test Script:**
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp-up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 50 },  // Ramp-up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Spike to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests <500ms
    http_req_failed: ['rate<0.01'],    // Error rate <1%
  },
};

export default function () {
  // Test critical endpoints
  const baseUrl = 'http://localhost:3000/api/v1';
  const token = login();

  // Dashboard
  let res = http.get(`${baseUrl}/dashboards/admin`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'dashboard status 200': (r) => r.status === 200 });

  // Machines list
  res = http.get(`${baseUrl}/machines?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res, { 'machines status 200': (r) => r.status === 200 });

  sleep(1);
}

function login() {
  const res = http.post(`${baseUrl}/auth/login`, {
    username: 'test',
    password: 'test123',
  });
  return res.json('access_token');
}
```

**Run Load Test:**
```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run test
k6 run k6-load-test.js

# With results output
k6 run --out json=results.json k6-load-test.js
```

**Performance Targets:**
- P95 latency <500ms (all endpoints)
- Error rate <1%
- Support 100 concurrent users
- Dashboard loads in <200ms (with cache)

**Acceptance Criteria:**
- [ ] Load test script created
- [ ] Tests run successfully
- [ ] All thresholds pass
- [ ] Performance baselines documented

**Dependencies:** BKD-009 (Redis caching for good performance)

---

### 🟠 BKD-035: Create API Performance Report

**Priority**: P1 - HIGH
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 4

**Description:**
Document API performance metrics and baselines.

**Report Contents:**
1. Performance by endpoint (P50, P95, P99)
2. Slow queries list
3. Cache hit rates
4. Database connection pool usage
5. Memory usage trends
6. Error rates

**Acceptance Criteria:**
- [ ] Performance report generated
- [ ] Baselines documented
- [ ] Optimization recommendations

**Dependencies:** BKD-034 (load testing)

---

### 🟡 BKD-036: Update API Documentation

**Priority**: P2 - MEDIUM
**Effort**: S (3-4 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 5

**Description:**
Update Swagger docs with new features, examples, and best practices.

**Updates:**
- [ ] Add pagination examples
- [ ] Add sorting examples
- [ ] Document error responses
- [ ] Add authentication flow examples
- [ ] Update response DTOs

**Dependencies:** BKD-025, BKD-028, BKD-029

---

### 🟡 BKD-037: Code Review & Cleanup

**Priority**: P2 - MEDIUM
**Effort**: M (6-8 hours)
**Assignee**: Backend Developer
**Sprint**: Sprint 3, Week 6, Day 5

**Description:**
Final code review and cleanup before production.

**Checklist:**
- [ ] No TODO/FIXME comments remain (53 currently)
- [ ] No commented-out code
- [ ] All imports optimized
- [ ] Unused dependencies removed
- [ ] .env.example updated
- [ ] README updated

**Dependencies:** All other tickets

---

### 🟢 BKD-038: Production Deployment Checklist

**Priority**: P3 - LOW
**Effort**: S (2-3 hours)
**Assignee**: DevOps + Backend Lead
**Sprint**: Sprint 3, Week 6, Day 5

**Description:**
Create and verify production deployment checklist.

**Checklist:**
- [ ] All environment variables set
- [ ] Database migrated
- [ ] Redis running
- [ ] Sentry configured
- [ ] SSL certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring dashboards set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented

**Dependencies:** All critical tickets

---

### 🟢 BKD-039: Create Runbook for Common Issues

**Priority**: P3 - LOW
**Effort**: S (3-4 hours)
**Assignee**: Backend Lead
**Sprint**: Sprint 3, Week 6, Day 5

**Description:**
Document how to diagnose and fix common production issues.

**Runbook Sections:**
1. Application won't start
2. Database connection errors
3. Redis connection errors
4. High memory usage
5. Slow queries
6. Authentication failures
7. File upload issues

**Dependencies:** None

---

## SPRINT 3 SUMMARY

**Total Tickets**: 15
**Total Effort**: 80 hours

**Expected Outcomes:**
- ✅ Response DTOs for all entities
- ✅ Rich domain model with business logic
- ✅ Value objects implemented
- ✅ Sorting on all endpoints
- ✅ RFC 7807 error responses
- ✅ All files <500 lines
- ✅ Test coverage ≥70%
- ✅ Load testing completed
- ✅ Production-ready

**Score Improvement:**
- Before Sprint 3: 84/100
- After Sprint 3: **~88/100** (🟢 Production Ready)

---

# TICKET SUMMARY

## By Priority

| Priority | Count | Total Effort |
|----------|-------|--------------|
| P0 - Critical | 9 | 120 hours |
| P1 - High | 24 | 100 hours |
| P2 - Medium | 2 | 16 hours |
| P3 - Low | 3 | 8 hours |
| **TOTAL** | **39** | **244 hours** |

## By Sprint

| Sprint | Tickets | Effort | Focus |
|--------|---------|--------|-------|
| Sprint 1 | 14 | 80h | Security, Performance, Critical Fixes |
| Sprint 2 | 10 | 80h | Code Quality, Testing |
| Sprint 3 | 15 | 84h | Polish, Production Prep |

## Critical Path (Must Complete)

**P0 Blockers (9 tickets):**
1. BKD-001: Fix build (5 min)
2. BKD-002: Bcrypt salt rounds (15 min)
3. BKD-003: npm vulnerabilities (4-6h)
4. BKD-004: Migrate xlsx (12-16h)
5. BKD-005: Rate limiting (2-3h)
6. BKD-006: N+1 queries (3-4h)
7. BKD-007: Dashboard optimization (6-8h)
8. BKD-008: Pagination (12-16h)
9. BKD-009: Redis caching (32-40h)
10. BKD-010: Test coverage 50% (32-40h)
11. BKD-021: Test coverage 65% (32-40h)
12. BKD-033: Test coverage 70% (16-20h)

**Total Critical Path**: ~190 hours

---

# TRACKING & METRICS

## Definition of Done (DoD)

Each ticket is considered done when:
- [ ] Implementation complete
- [ ] Unit tests written and passing
- [ ] Integration/E2E tests (if applicable)
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No regression in existing functionality
- [ ] Performance impact measured
- [ ] Deployed to staging and verified

## Weekly Progress Tracking

**Week 1:**
- Tickets completed: BKD-001 to BKD-005
- Expected score: 67 → 70 (+3)

**Week 2:**
- Tickets completed: BKD-006 to BKD-014
- Expected score: 70 → 78 (+8)

**Week 3:**
- Tickets completed: BKD-015 to BKD-020
- Expected score: 78 → 82 (+4)

**Week 4:**
- Tickets completed: BKD-021 to BKD-024
- Expected score: 82 → 84 (+2)

**Week 5:**
- Tickets completed: BKD-025 to BKD-029
- Expected score: 84 → 86 (+2)

**Week 6:**
- Tickets completed: BKD-030 to BKD-039
- Expected score: 86 → 88 (+2)

## Success Metrics

**Code Quality:**
- TypeScript strict mode: ✅ Enabled
- `any` types: 1,188 → <100
- Files >500 lines: 4 → 0
- console.log: 162 → 0
- Circular dependencies: 8 → 0

**Performance:**
- Dashboard load: 2.5s → <200ms
- Task completion: 1.2s → <400ms
- Cache hit rate: 0% → >50%
- P95 latency: N/A → <500ms

**Security:**
- Bcrypt rounds: 10 → 12
- npm vulnerabilities: 15 → 0
- Rate limiting: ❌ → ✅
- Sentry: ❌ → ✅

**Testing:**
- Coverage: 13% → 70%
- E2E tests: 0 → 10+ suites
- Failing tests: 2 → 0

**Overall Score:**
- Current: 67/100
- Target: 88/100
- Improvement: +21 points

---

# TEAM ASSIGNMENTS

## Sprint 1 (Weeks 1-2)

**Developer 1 (Backend Lead):**
- BKD-001: Fix build
- BKD-002: Bcrypt
- BKD-003: npm audit
- BKD-006: N+1 queries
- BKD-007: Dashboard optimization
- BKD-009: Redis (days 3-5)

**Developer 2 (Backend):**
- BKD-004: xlsx migration
- BKD-005: Rate limiting
- BKD-008: Pagination
- BKD-010: Test coverage (assist)
- BKD-011: Logger
- BKD-012: Compression

**QA Engineer (Part-time):**
- BKD-010: Test coverage (lead)
- BKD-013: Assist with strict mode testing
- BKD-014: Sentry testing

## Sprint 2 (Weeks 3-4)

**Developer 1:**
- BKD-015: Strict mode completion
- BKD-016: Reduce `any` types
- BKD-017: Refactor telegram-bot
- BKD-020: Remove forwardRef

**Developer 2:**
- BKD-018: Refactor tasks.service
- BKD-019: Refactor inventory.service
- BKD-023: Correlation IDs
- BKD-024: Performance monitoring

**QA Engineer:**
- BKD-021: Test coverage 65%
- BKD-022: E2E tests

## Sprint 3 (Weeks 5-6)

**Developer 1:**
- BKD-025: Response DTOs
- BKD-026: Domain model
- BKD-027: Value objects
- BKD-030: Optimize god classes
- BKD-033: Test coverage 70% (assist)

**Developer 2:**
- BKD-028: Sorting
- BKD-029: RFC 7807
- BKD-031: Query caching
- BKD-032: Query monitoring
- BKD-035: Performance report

**QA Engineer:**
- BKD-033: Test coverage 70% (lead)
- BKD-034: Load testing
- BKD-036: Documentation

**DevOps:**
- BKD-038: Deployment checklist
- BKD-039: Runbook

---

**END OF ACTION PLAN TICKETS**

**Next Steps:**
1. Import tickets into project management tool (Jira, Linear, GitHub Issues)
2. Assign team members
3. Schedule sprint planning
4. Begin Sprint 1!

**Questions?** Contact Backend Lead or Product Manager.
