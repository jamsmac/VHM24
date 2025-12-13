# VendHub OS - Migration Plan

> **Version:** 1.0.0
> **Last Updated:** 2024-12-13

## 1. Overview

This document details the migration strategy for consolidating functionality from:
- **VHM24R_1** (FastAPI Reports/Files)
- **VHM24R_2** (Reconciliation PWA)
- **vendhub-bot** (Python Telegram Bot)
- **vendbot_manager** (React Admin Panel)

Into the canonical **VHM24** system.

---

## 2. Migration Inventory

### 2.1 From vendhub-bot (Python → Node.js)

| Component | Source | Target | Priority |
|-----------|--------|--------|----------|
| **FSM States** | `handlers/catalog.py` | `telegram/fsm/catalog.fsm.ts` | P0 |
| **Cart Flow** | `handlers/cart.py` | `telegram/fsm/cart.fsm.ts` | P0 |
| **Admin Commands** | `handlers/admin.py` | `telegram/handlers/admin.handler.ts` | P0 |
| **Warehouse Flow** | `handlers/warehouse.py` | `telegram/fsm/warehouse.fsm.ts` | P1 |
| **Accountant Flow** | `handlers/accountant.py` | `telegram/handlers/accountant.handler.ts` | P1 |
| **Reports** | `handlers/reports.py` | `telegram/handlers/reports.handler.ts` | P2 |
| **Models** | `models/__init__.py` | TypeORM entities | P0 |
| **Keyboards** | `keyboards/` | `telegram/keyboards/` | P0 |
| **Services** | `services/` | `telegram/services/` | P1 |

**Data Migration:**
```sql
-- vendhub-bot SQLite → VHM24 PostgreSQL

-- Users (merge by telegram_id)
INSERT INTO users (telegram_id, username, name, role, created_at)
SELECT id, username, full_name, role, created_at
FROM vendhub_bot.users
ON CONFLICT (telegram_id) DO UPDATE SET
  username = EXCLUDED.username,
  name = COALESCE(users.name, EXCLUDED.name);

-- Materials
INSERT INTO materials (name, category, unit, supplier_id, is_active)
SELECT name, category, unit, supplier_id, is_active
FROM vendhub_bot.materials;

-- Suppliers
INSERT INTO suppliers (name, telegram_id, phone, categories, is_active)
SELECT name, telegram_id, phone, categories, is_active
FROM vendhub_bot.suppliers;

-- Material Requests
INSERT INTO requests (user_id, status, comment, created_at, approved_at, approved_by)
SELECT user_id, status, comment, created_at, approved_at, approved_by
FROM vendhub_bot.material_requests;
```

### 2.2 From VHM24R_1 (FastAPI → NestJS)

| Component | Source | Target | Priority |
|-----------|--------|--------|----------|
| **SimpleDynamicAuth** | `app/telegram_webapp.py` | `telegram/services/webapp-auth.service.ts` | P0 |
| **Telegram Auth** | `app/telegram_auth.py` | `auth/strategies/telegram.strategy.ts` | P0 |
| **File Upload** | `app/crud.py` (file ops) | `files/services/upload.service.ts` | P1 |
| **Order Processing** | `app/models.py` (Order) | `requests/entities/` | P1 |
| **CRUD Operations** | `app/crud_optimized.py` | Services layer | P2 |

**Code Migration Example:**

```python
# VHM24R_1/backend/app/telegram_webapp.py (ORIGINAL)
class SimpleDynamicAuth:
    def generate_token(self, telegram_id: int, expires_in: int = 7200) -> str:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        # Store in DB
        return token
```

```typescript
// VHM24/backend/src/modules/telegram/services/webapp-auth.service.ts (TARGET)
@Injectable()
export class WebAppAuthService {
  constructor(
    @InjectRepository(WebAppToken)
    private tokenRepo: Repository<WebAppToken>,
  ) {}

  async generateToken(telegramId: string, expiresIn = 7200): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.tokenRepo.save({
      token,
      telegramId,
      expiresAt,
      isActive: true,
    });

    return token;
  }

  async validateToken(token: string): Promise<WebAppToken | null> {
    return this.tokenRepo.findOne({
      where: { token, isActive: true },
    });
  }
}
```

### 2.3 From VHM24R_2 (PWA → NestJS Module)

| Component | Source | Target | Priority |
|-----------|--------|--------|----------|
| **Matching Algorithm** | `index.html` (JS) | `reconciliation/services/matching.service.ts` | P0 |
| **Scoring Logic** | `index.html` (JS) | `reconciliation/services/scoring.service.ts` | P0 |
| **Table Schemas** | `index.html` (schemas) | TypeORM entities | P0 |
| **UI Components** | `index.html` (React) | `frontend/src/pages/reconciliation/` | P1 |

**Algorithm Migration:**

```javascript
// VHM24R_2/index.html (ORIGINAL - embedded JS)
function matchOrders(hwOrder, payments, options = {}) {
  const TIME_TOLERANCE = options.timeTolerance || 5; // seconds
  const AMOUNT_TOLERANCE = options.amountTolerance || 100; // sum

  for (const payment of payments) {
    const timeDiff = Math.abs(hwOrder.time - payment.time) / 1000;
    const amountDiff = Math.abs(hwOrder.amount - payment.amount);

    if (timeDiff <= TIME_TOLERANCE && amountDiff <= AMOUNT_TOLERANCE) {
      return { matched: true, payment, score: calculateScore(...) };
    }
  }
  return { matched: false };
}
```

```typescript
// VHM24/backend/src/modules/reconciliation/services/matching.service.ts (TARGET)
@Injectable()
export class MatchingService {
  constructor(
    private scoringService: ScoringService,
  ) {}

  matchOrder(
    hwOrder: HardwareOrder,
    payments: Payment[],
    options: MatchOptions = {},
  ): MatchResult {
    const timeTolerance = options.timeTolerance ?? 5;
    const amountTolerance = options.amountTolerance ?? 100;

    for (const payment of payments) {
      const timeDiff = Math.abs(
        hwOrder.createdAt.getTime() - payment.createdAt.getTime()
      ) / 1000;
      const amountDiff = Math.abs(hwOrder.amount - payment.amount);

      if (timeDiff <= timeTolerance && amountDiff <= amountTolerance) {
        return {
          matched: true,
          payment,
          score: this.scoringService.calculate(hwOrder, payment),
        };
      }
    }

    return { matched: false, score: 0 };
  }
}
```

### 2.4 From vendbot_manager (React → Next.js)

| Component | Source | Target | Priority |
|-----------|--------|--------|----------|
| **Dashboard Charts** | `src/pages/Dashboard/` | `frontend/src/app/dashboard/` | P1 |
| **Routes Config** | `src/Routes.jsx` | `frontend/src/app/` | P1 |
| **UI Components** | `src/components/` | `frontend/src/components/` | P2 |
| **Redux Store** | `src/store/` | React Context / Zustand | P2 |

---

## 3. Entity Migration

### 3.1 New Entities to Create

```typescript
// backend/src/modules/requests/entities/material.entity.ts
@Entity('materials')
export class Material extends BaseEntity {
  @Column()
  name: string;

  @Column()
  category: string;

  @Column({ default: 'шт' })
  unit: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ default: true })
  isActive: boolean;
}

// backend/src/modules/requests/entities/supplier.entity.ts
@Entity('suppliers')
export class Supplier extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  telegramId: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'simple-array', nullable: true })
  categories: string[];

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Material, (m) => m.supplier)
  materials: Material[];
}

// backend/src/modules/requests/entities/request.entity.ts
@Entity('requests')
export class Request extends BaseEntity {
  @Column()
  requestNumber: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.NEW,
  })
  status: RequestStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  comment: string;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.NORMAL,
  })
  priority: Priority;

  @OneToMany(() => RequestItem, (item) => item.request)
  items: RequestItem[];
}

// backend/src/modules/requests/entities/request-item.entity.ts
@Entity('request_items')
export class RequestItem extends BaseEntity {
  @ManyToOne(() => Request)
  @JoinColumn({ name: 'request_id' })
  request: Request;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  receivedQuantity: number;
}

// backend/src/modules/reconciliation/entities/reconciliation-run.entity.ts
@Entity('reconciliation_runs')
export class ReconciliationRun extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ type: 'date' })
  dateFrom: Date;

  @Column({ type: 'date' })
  dateTo: Date;

  @Column({ type: 'simple-array' })
  sources: string[];

  @Column({ default: 5 })
  timeTolerance: number;

  @Column({ default: 100 })
  amountTolerance: number;

  @Column({ type: 'jsonb', nullable: true })
  summary: ReconciliationSummary;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ nullable: true })
  completedAt: Date;

  @OneToMany(() => ReconciliationMismatch, (m) => m.run)
  mismatches: ReconciliationMismatch[];
}
```

---

## 4. Migration Steps

### Step 1: Prepare Target Environment

```bash
# 1. Create new migration
cd backend
npm run migration:generate -- -n AddRequestsAndReconciliation

# 2. Review and run migration
npm run migration:run

# 3. Create seed data
npm run seed:run
```

### Step 2: Migrate Data

```bash
# 1. Export from vendhub-bot SQLite
sqlite3 vendhub.db ".dump" > vendhub_dump.sql

# 2. Convert to PostgreSQL format
python scripts/convert_sqlite_to_postgres.py vendhub_dump.sql > vendhub_pg.sql

# 3. Import to VHM24 PostgreSQL
psql $DATABASE_URL < vendhub_pg.sql

# 4. Run data validation
npm run validate:migration
```

### Step 3: Deploy New Modules

```bash
# 1. Deploy backend with new modules
git push origin main

# 2. Run post-deploy migrations
railway run npm run migration:run

# 3. Verify health
curl https://api.vendhub.uz/api/health
```

### Step 4: Switch Bot to New Backend

```bash
# 1. Update bot configuration
export VHM24_API_URL=https://api.vendhub.uz/api/v1

# 2. Deploy bot update
railway up

# 3. Test bot functionality
# Send /start to bot, verify response
```

### Step 5: Redirect Frontend

```bash
# 1. Update frontend API endpoints
# frontend/.env
NEXT_PUBLIC_API_URL=https://api.vendhub.uz/api/v1

# 2. Deploy frontend
vercel --prod
```

---

## 5. Rollback Procedures

### If Backend Migration Fails

```bash
# 1. Revert database migration
npm run migration:revert

# 2. Restore from backup
pg_restore -d vendhub backup_before_migration.dump

# 3. Redeploy previous version
git checkout previous-tag
railway up
```

### If Bot Migration Fails

```bash
# 1. Switch back to vendhub-bot
# Update DNS/webhook to point to old bot

# 2. Verify old bot is working
curl https://api.telegram.org/bot$TOKEN/getWebhookInfo
```

---

## 6. Validation Checklist

### Data Integrity

- [ ] User count matches between systems
- [ ] All materials migrated
- [ ] All suppliers migrated
- [ ] Request history preserved
- [ ] No orphaned records

### Functionality

- [ ] Bot responds to /start
- [ ] Catalog navigation works
- [ ] Cart operations work
- [ ] Request creation works
- [ ] Admin commands work
- [ ] WebApp authentication works

### Performance

- [ ] API response time < 200ms
- [ ] Bot response time < 1s
- [ ] No memory leaks
- [ ] Database queries optimized

---

## 7. Timeline

| Week | Activity | Owner |
|------|----------|-------|
| Week 1 | Entity creation, migrations | Backend |
| Week 2 | Data migration scripts | Backend |
| Week 3 | Bot handler porting | Bot Dev |
| Week 4 | Integration testing | QA |
| Week 5 | Production migration | DevOps |
| Week 6 | Monitoring & fixes | All |

---

## 8. Contacts

| Role | Name | Contact |
|------|------|---------|
| Migration Lead | TBD | @lead |
| Backend Dev | TBD | @backend |
| Bot Dev | TBD | @botdev |
| DevOps | TBD | @devops |

---

**Document Version:** 1.0.0
**Last Updated:** 2024-12-13
