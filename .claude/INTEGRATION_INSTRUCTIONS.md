# Claude Integration Instructions for VHM24

> **Version**: 1.0.0
> **Created**: 2026-01-02
> **Purpose**: Safe integration of features from related VendHub projects into VHM24
> **Critical**: All changes MUST be non-destructive and additive

---

## Table of Contents

1. [Integration Philosophy](#integration-philosophy)
2. [Source Projects Overview](#source-projects-overview)
3. [Integration Priorities](#integration-priorities)
4. [Feature Integration Matrix](#feature-integration-matrix)
5. [Non-Destructive Development Rules](#non-destructive-development-rules)
6. [Integration Procedures](#integration-procedures)
7. [Technology Adoption Guidelines](#technology-adoption-guidelines)
8. [Testing Requirements](#testing-requirements)
9. [Rollback Procedures](#rollback-procedures)
10. [Specific Integration Tasks](#specific-integration-tasks)

---

## Integration Philosophy

### Core Principles

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION GOLDEN RULES                         │
├─────────────────────────────────────────────────────────────────────┤
│ 1. NEVER break existing functionality                               │
│ 2. ALWAYS add, never replace (unless deprecated)                    │
│ 3. PRESERVE all existing APIs and contracts                         │
│ 4. TEST before and after every integration                          │
│ 5. DOCUMENT all changes with migration paths                        │
│ 6. ROLLBACK capability for every change                             │
│ 7. INCREMENTAL integration - small steps, frequent commits          │
└─────────────────────────────────────────────────────────────────────┘
```

### Integration Strategy

```
Source Projects                        VHM24 (Target)
┌───────────────┐                     ┌────────────────┐
│   vhm24v2     │──── Drizzle ORM ───▶│                │
│               │     patterns        │                │
├───────────────┤                     │                │
│vendify-menu   │──── Menu/Maps  ────▶│   Additive     │
│   -maps       │     features        │   Integration  │
├───────────────┤                     │   Layer        │
│     VH24      │──── tRPC, Raw  ────▶│                │
│               │     Material        │                │
├───────────────┤                     │                │
│data-parse-desk│──── AI Import  ────▶│                │
│               │     ML Mapping      │                │
├───────────────┤                     │                │
│ AIAssistant   │──── Multi-model────▶│                │
│               │     MCP, Cache      │                │
└───────────────┘                     └────────────────┘
```

---

## Source Projects Overview

### 1. vhm24v2 (TypeScript + Drizzle + Manus)

**Repository**: https://github.com/jamsmac/vhm24v2

**What to Take**:
- Drizzle ORM patterns (as alternative/complement to TypeORM)
- Vitest testing patterns
- pnpm workspace configuration
- Shared code architecture (client/server/shared)

**What NOT to Take**:
- Manus-specific integrations (not applicable)
- Complete database schema replacement

### 2. vendify-menu-maps (Vite + React + Supabase)

**Repository**: https://github.com/jamsmac/vendify-menu-maps

**What to Take**:
- Public menu display components
- Map integration for machine locations
- QR code scanning for machine menus
- Admin manual features
- Vercel deployment patterns

**What NOT to Take**:
- Supabase as main backend (keep PostgreSQL + TypeORM)
- Lovable-specific patterns

### 3. VH24 (tRPC + Express + Grammy)

**Repository**: https://github.com/jamsmac/VH24

**What to Take**:
- Raw material tracking algorithms
- Recipe-based consumption calculation
- Bunker/container management
- Task checklist patterns
- Manager approval workflows
- Grammy Telegram bot patterns (evaluate vs Telegraf)

**What NOT to Take**:
- tRPC replacement of REST (optional addition only)
- MySQL/TiDB specifics (keep PostgreSQL)

### 4. data-parse-desk (AI + Excel + ML)

**Repository**: https://github.com/jamsmac/data-parse-desk

**What to Take**:
- AI-powered column mapping (ML Column Mapping)
- ExcelJS 4.4 + Papa Parse 5.5 patterns
- Formula engine (math, string, logical, date operations)
- Rollup calculator (aggregations)
- OCR text extraction from images
- Natural language query patterns
- Gemini/GPT integration for data parsing

**What NOT to Take**:
- Supabase edge functions (adapt to NestJS)
- Complete frontend replacement

### 5. AIAssistant (Multi-model + MCP + FastAPI)

**Repository**: https://github.com/jamsmac/AIAssistant

**What to Take**:
- Multi-model AI routing (Gemini, Grok, OpenRouter)
- MCP (Model Context Protocol) integration for Claude
- Context memory patterns
- Intelligent caching strategies
- Cost tracking and token monitoring
- Workflow automation engine
- Rate limiting tiers

**What NOT to Take**:
- FastAPI backend (adapt to NestJS)
- Complete auth replacement

---

## Integration Priorities

### Phase 1: High Priority (Immediate Value)

| Feature | Source | Impact | Risk |
|---------|--------|--------|------|
| AI Import Enhancement | data-parse-desk | High | Low |
| Raw Material Tracking | VH24 | High | Medium |
| Public Menu Display | vendify-menu-maps | High | Low |
| ML Column Mapping | data-parse-desk | High | Low |

### Phase 2: Medium Priority (Near-term)

| Feature | Source | Impact | Risk |
|---------|--------|--------|------|
| Multi-model AI | AIAssistant | Medium | Medium |
| Recipe Consumption Calc | VH24 | Medium | Medium |
| Workflow Automation | AIAssistant | Medium | Medium |
| Map Integration | vendify-menu-maps | Medium | Low |

### Phase 3: Low Priority (Future Enhancement)

| Feature | Source | Impact | Risk |
|---------|--------|--------|------|
| tRPC Endpoints | VH24 | Low | High |
| Drizzle ORM Option | vhm24v2 | Low | High |
| MCP Integration | AIAssistant | Low | Medium |
| Grammy Bot Option | VH24 | Low | Medium |

---

## Feature Integration Matrix

### Detailed Feature Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE INTEGRATION MATRIX                           │
├─────────────────────┬──────────────┬─────────────────┬─────────────────────┤
│ Feature             │ Source       │ Target Module   │ Integration Type    │
├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
│ AI Column Mapping   │data-parse    │intelligent-imp  │ ENHANCE             │
│ ML Data Parsing     │data-parse    │intelligent-imp  │ ENHANCE             │
│ Formula Engine      │data-parse    │data-parser      │ ADD NEW             │
│ OCR Image Parse     │data-parse    │files            │ ADD NEW             │
│ NL Query Bot        │data-parse    │telegram         │ ENHANCE             │
├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
│ Raw Material Track  │VH24          │inventory        │ ADD NEW             │
│ Recipe Consumption  │VH24          │recipes          │ ENHANCE             │
│ Bunker Management   │VH24          │equipment        │ ADD NEW             │
│ Task Checklists     │VH24          │tasks            │ ENHANCE             │
│ Manager Approvals   │VH24          │tasks            │ ENHANCE             │
├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
│ Public Menu Page    │vendify-menu  │client           │ ENHANCE             │
│ Machine Map View    │vendify-menu  │locations        │ ENHANCE             │
│ QR Menu Scan        │vendify-menu  │machines         │ ENHANCE             │
├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
│ Multi-model AI      │AIAssistant   │NEW: ai-engine   │ ADD NEW MODULE      │
│ AI Context Memory   │AIAssistant   │ai-engine        │ ADD NEW             │
│ Smart Caching       │AIAssistant   │common/cache     │ ENHANCE             │
│ Workflow Engine     │AIAssistant   │NEW: workflows   │ ADD NEW MODULE      │
│ Cost Tracking       │AIAssistant   │ai-engine        │ ADD NEW             │
├─────────────────────┼──────────────┼─────────────────┼─────────────────────┤
│ Shared Code Pattern │vhm24v2       │common           │ REFACTOR            │
│ Vitest Patterns     │vhm24v2       │test             │ OPTIONAL            │
└─────────────────────┴──────────────┴─────────────────┴─────────────────────┘
```

### Integration Types Explained

- **ENHANCE**: Improve existing module with new capabilities
- **ADD NEW**: Create new service/feature within existing module
- **ADD NEW MODULE**: Create entirely new module
- **REFACTOR**: Reorganize without changing behavior
- **OPTIONAL**: Nice-to-have, not mandatory

---

## Non-Destructive Development Rules

### Rule 1: API Preservation

```typescript
// ❌ FORBIDDEN: Changing existing response structure
// Before:
@Get('machines')
async findAll() {
  return this.machinesService.findAll(); // Returns Machine[]
}

// ❌ WRONG: Breaking change
@Get('machines')
async findAll() {
  return { data: this.machinesService.findAll() }; // Changed structure!
}

// ✅ CORRECT: Add new endpoint for new structure
@Get('machines')
async findAll() {
  return this.machinesService.findAll(); // Keep original
}

@Get('v2/machines')
async findAllV2() {
  return { data: this.machinesService.findAll() }; // New endpoint
}
```

### Rule 2: Database Migration Safety

```typescript
// ❌ FORBIDDEN: Dropping or renaming columns
export class UnsafeMigration implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('machines', 'old_field'); // NEVER!
    await queryRunner.renameColumn('machines', 'a', 'b'); // NEVER!
  }
}

// ✅ CORRECT: Additive only
export class SafeMigration implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add new column
    await queryRunner.addColumn('machines', new TableColumn({
      name: 'raw_material_tracking_enabled',
      type: 'boolean',
      default: false,
      isNullable: true, // Always nullable for new columns
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Must have rollback
    await queryRunner.dropColumn('machines', 'raw_material_tracking_enabled');
  }
}
```

### Rule 3: Enum Extension Safety

```typescript
// ❌ FORBIDDEN: Changing enum values
export enum TaskType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  // CLEANING = 'cleaning', // Don't remove!
  MAINTENANCE = 'maintenance', // Don't rename!
}

// ✅ CORRECT: Only add new values
export enum TaskType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  INSTALL = 'install',
  // New additions
  RAW_MATERIAL_CHECK = 'raw_material_check', // Added from VH24
  BUNKER_REFILL = 'bunker_refill',           // Added from VH24
}
```

### Rule 4: Service Extension Pattern

```typescript
// ❌ FORBIDDEN: Modifying core service logic
@Injectable()
export class TasksService {
  async complete(id: string) {
    // Changed existing logic - WRONG!
  }
}

// ✅ CORRECT: Create extension service
@Injectable()
export class TasksRawMaterialService {
  constructor(
    private readonly tasksService: TasksService, // Inject existing
    private readonly rawMaterialService: RawMaterialService,
  ) {}

  // New methods that compose with existing
  async completeWithRawMaterialUpdate(id: string) {
    // First use existing service
    const task = await this.tasksService.complete(id);

    // Then add new functionality
    if (task.type === TaskType.BUNKER_REFILL) {
      await this.rawMaterialService.updateFromTask(task);
    }

    return task;
  }
}
```

### Rule 5: Feature Flags

```typescript
// ✅ CORRECT: Use feature flags for new integrations
@Injectable()
export class FeatureFlagsService {
  isEnabled(feature: string): boolean {
    return this.configService.get(`FEATURE_${feature}`, false);
  }
}

// Usage in new integration
@Injectable()
export class AIImportService {
  async processImport(data: any) {
    if (this.featureFlags.isEnabled('AI_COLUMN_MAPPING')) {
      return this.aiColumnMapping(data);
    }
    // Fallback to existing logic
    return this.manualColumnMapping(data);
  }
}
```

### Rule 6: Dependency Injection Over Modification

```typescript
// ✅ CORRECT: Inject new capabilities
@Module({
  imports: [
    TasksModule,           // Existing module
    RawMaterialModule,     // New module from VH24
  ],
  providers: [
    TasksRawMaterialService, // Composition service
  ],
})
export class TasksEnhancedModule {}
```

---

## Integration Procedures

### Step-by-Step Integration Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. ANALYZE         → Study source code, identify components        │
│       ↓                                                             │
│  2. PLAN            → Create integration plan, identify risks       │
│       ↓                                                             │
│  3. BRANCH          → Create feature branch: feature/integrate-X    │
│       ↓                                                             │
│  4. TEST BASELINE   → Run all existing tests, capture results       │
│       ↓                                                             │
│  5. IMPLEMENT       → Add new code WITHOUT modifying existing       │
│       ↓                                                             │
│  6. TEST NEW        → Write tests for new functionality             │
│       ↓                                                             │
│  7. TEST REGRESSION → Ensure all original tests still pass          │
│       ↓                                                             │
│  8. DOCUMENT        → Update docs, add migration guide              │
│       ↓                                                             │
│  9. REVIEW          → Code review focusing on non-destruction       │
│       ↓                                                             │
│  10. MERGE          → Merge only if all tests pass                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Pre-Integration Checklist

Before starting any integration:

```markdown
## Pre-Integration Checklist

- [ ] Source code analyzed and understood
- [ ] Target module identified (or new module planned)
- [ ] Breaking changes assessment complete (must be ZERO)
- [ ] Test baseline captured (`npm run test > baseline.txt`)
- [ ] Feature branch created
- [ ] Database migration plan reviewed
- [ ] Rollback procedure documented
- [ ] Feature flag configuration planned
- [ ] Documentation update scope defined
```

### Post-Integration Checklist

After completing integration:

```markdown
## Post-Integration Checklist

- [ ] All original tests pass (`npm run test`)
- [ ] New tests written and passing
- [ ] Test coverage not decreased
- [ ] API contracts unchanged (Swagger diff check)
- [ ] Database migrations have up() and down()
- [ ] Feature flag documented
- [ ] CHANGELOG updated
- [ ] Documentation updated
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
```

---

## Technology Adoption Guidelines

### When to Keep Existing Technology

| Scenario | Action | Reason |
|----------|--------|--------|
| TypeORM vs Drizzle | Keep TypeORM | 82 migrations, stable |
| Telegraf vs Grammy | Keep Telegraf | 57 files, working |
| REST vs tRPC | Keep REST | 645 endpoints, stable |
| PostgreSQL vs MySQL | Keep PostgreSQL | Production deployed |

### When to Add New Technology

| Scenario | Action | Implementation |
|----------|--------|----------------|
| AI models | ADD | New ai-engine module |
| ML parsing | ADD | Enhance intelligent-import |
| Caching | ENHANCE | Add to existing Redis |
| Workflows | ADD | New workflows module |

### Technology Coexistence Pattern

```typescript
// ✅ CORRECT: Multiple technologies coexisting
@Module({
  imports: [
    TypeOrmModule.forFeature([Task]), // Existing ORM
    // DrizzleModule.forFeature([...]), // Optional new ORM
  ],
  providers: [
    TasksService,           // Uses TypeORM
    // TasksDrizzleService, // Could use Drizzle (optional)
  ],
})
export class TasksModule {}
```

---

## Testing Requirements

### Minimum Test Coverage for Integrations

```
New Feature Integration:
├── Unit Tests          → 80% coverage minimum
├── Integration Tests   → All new endpoints
├── E2E Tests           → Critical user flows
└── Regression Tests    → All existing tests must pass
```

### Test File Naming

```
src/modules/raw-material/
├── raw-material.service.ts
├── raw-material.service.spec.ts          # Unit tests
├── raw-material.controller.spec.ts       # Controller tests
└── raw-material.e2e-spec.ts              # E2E tests
```

### Regression Test Command

```bash
# Before integration
npm run test > tests/baseline-$(date +%Y%m%d).txt

# After integration
npm run test > tests/after-integration.txt

# Compare
diff tests/baseline-*.txt tests/after-integration.txt
# Must show NO failures in original tests
```

---

## Rollback Procedures

### Database Rollback

```bash
# Revert last migration
npm run migration:revert

# Revert specific migration
npm run migration:revert -- -n MigrationName
```

### Feature Flag Rollback

```typescript
// Disable feature in production
// .env
FEATURE_AI_COLUMN_MAPPING=false
FEATURE_RAW_MATERIAL_TRACKING=false
```

### Code Rollback

```bash
# Revert merge commit
git revert <merge-commit-hash>

# Or reset to previous state (caution!)
git reset --hard <previous-commit>
```

---

## Specific Integration Tasks

### Task 1: AI-Powered Import Enhancement

**Source**: data-parse-desk
**Target**: backend/src/modules/intelligent-import

```typescript
// New file: intelligent-import/services/ai-column-mapper.service.ts
@Injectable()
export class AIColumnMapperService {
  constructor(
    @Inject('AI_CLIENT') private aiClient: AIClient,
  ) {}

  async mapColumns(headers: string[], targetSchema: string[]): Promise<ColumnMapping[]> {
    // ML-based column mapping from data-parse-desk
    const prompt = this.buildMappingPrompt(headers, targetSchema);
    const response = await this.aiClient.complete(prompt);
    return this.parseMapping(response);
  }
}
```

**Integration Steps**:
1. Create new service file (don't modify existing)
2. Add AI client configuration
3. Register in intelligent-import.module.ts
4. Add feature flag: `FEATURE_AI_COLUMN_MAPPING`
5. Write tests
6. Update documentation

### Task 2: Raw Material Tracking

**Source**: VH24
**Target**: New module + inventory enhancement

```typescript
// New module: backend/src/modules/raw-material/
@Module({
  imports: [
    TypeOrmModule.forFeature([RawMaterial, RawMaterialMovement, Bunker]),
    InventoryModule, // Compose with existing
    RecipesModule,   // For consumption calculation
  ],
  controllers: [RawMaterialController],
  providers: [
    RawMaterialService,
    BunkerService,
    ConsumptionCalculatorService,
  ],
  exports: [RawMaterialService],
})
export class RawMaterialModule {}
```

**Entities to Add**:
```typescript
// raw-material.entity.ts
@Entity('raw_materials')
export class RawMaterial extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'enum', enum: RawMaterialType })
  type: RawMaterialType;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  current_quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string; // kg, L, pcs

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  min_threshold: number;

  @Column({ type: 'date', nullable: true })
  expiration_date: Date;
}

// bunker.entity.ts
@Entity('bunkers')
export class Bunker extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'uuid' })
  raw_material_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  capacity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  current_level: number;
}
```

### Task 3: Public Menu Enhancement

**Source**: vendify-menu-maps
**Target**: frontend/src/app/(public)/menu + backend/src/modules/client

```typescript
// Enhanced menu page with map
// frontend/src/app/(public)/menu/[machineNumber]/page.tsx
export default async function PublicMenuPage({
  params
}: {
  params: { machineNumber: string }
}) {
  const machine = await getMachineByNumber(params.machineNumber);

  return (
    <div className="min-h-screen">
      {/* Machine location map - from vendify-menu-maps */}
      <MachineLocationMap
        lat={machine.location.latitude}
        lng={machine.location.longitude}
      />

      {/* Product menu - enhanced */}
      <PublicMenu machineId={machine.id} />

      {/* QR for sharing - from vendify-menu-maps */}
      <ShareQRCode machineNumber={params.machineNumber} />
    </div>
  );
}
```

### Task 4: Multi-Model AI Engine

**Source**: AIAssistant
**Target**: New module backend/src/modules/ai-engine

```typescript
// New module structure
ai-engine/
├── dto/
│   ├── ai-request.dto.ts
│   └── ai-response.dto.ts
├── interfaces/
│   ├── ai-provider.interface.ts
│   └── model-config.interface.ts
├── providers/
│   ├── gemini.provider.ts
│   ├── openai.provider.ts
│   └── anthropic.provider.ts
├── services/
│   ├── ai-router.service.ts        # Model selection logic
│   ├── ai-cache.service.ts         # Response caching
│   ├── ai-cost-tracker.service.ts  # Token/cost tracking
│   └── ai-context.service.ts       # Conversation memory
├── ai-engine.controller.ts
├── ai-engine.module.ts
└── ai-engine.service.ts
```

### Task 5: Workflow Automation Engine

**Source**: AIAssistant
**Target**: New module backend/src/modules/workflows

```typescript
// Workflow engine for automated task sequences
@Module({
  imports: [
    BullModule.registerQueue({ name: 'workflows' }),
    TasksModule,
    NotificationsModule,
  ],
  providers: [
    WorkflowEngineService,
    WorkflowExecutorService,
    WorkflowTriggerService,
  ],
})
export class WorkflowsModule {}

// Example workflow definition
interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
}

// Example: Auto-create refill task when bunker low
const autoRefillWorkflow: WorkflowDefinition = {
  id: 'auto-refill-on-low-bunker',
  name: 'Автоматическое создание задачи при низком уровне бункера',
  trigger: {
    type: 'event',
    event: 'bunker.level.low',
  },
  steps: [
    {
      action: 'create_task',
      params: {
        type: TaskType.BUNKER_REFILL,
        priority: 'high',
        assignTo: 'nearest_operator',
      },
    },
    {
      action: 'send_notification',
      params: {
        channels: ['telegram', 'push'],
        template: 'bunker_low_alert',
      },
    },
  ],
};
```

---

## Migration Path Summary

### From data-parse-desk

```
data-parse-desk                    VHM24
┌─────────────────┐               ┌─────────────────┐
│ AI Schema       │──────────────▶│ intelligent-    │
│ Creator         │               │ import module   │
├─────────────────┤               ├─────────────────┤
│ ML Column       │──────────────▶│ New service:    │
│ Mapping         │               │ ai-column-map   │
├─────────────────┤               ├─────────────────┤
│ Formula Engine  │──────────────▶│ New module:     │
│                 │               │ formula-engine  │
├─────────────────┤               ├─────────────────┤
│ OCR Processing  │──────────────▶│ files module    │
│                 │               │ enhancement     │
├─────────────────┤               ├─────────────────┤
│ NL Query Bot    │──────────────▶│ telegram module │
│                 │               │ enhancement     │
└─────────────────┘               └─────────────────┘
```

### From VH24

```
VH24                               VHM24
┌─────────────────┐               ┌─────────────────┐
│ Raw Material    │──────────────▶│ New module:     │
│ Tracking        │               │ raw-material    │
├─────────────────┤               ├─────────────────┤
│ Recipe-based    │──────────────▶│ recipes module  │
│ Consumption     │               │ enhancement     │
├─────────────────┤               ├─────────────────┤
│ Bunker Mgmt     │──────────────▶│ equipment mod   │
│                 │               │ + raw-material  │
├─────────────────┤               ├─────────────────┤
│ Task Checklists │──────────────▶│ tasks module    │
│                 │               │ enhancement     │
├─────────────────┤               ├─────────────────┤
│ Manager         │──────────────▶│ tasks module    │
│ Approvals       │               │ enhancement     │
└─────────────────┘               └─────────────────┘
```

### From AIAssistant

```
AIAssistant                        VHM24
┌─────────────────┐               ┌─────────────────┐
│ Multi-model AI  │──────────────▶│ New module:     │
│ Routing         │               │ ai-engine       │
├─────────────────┤               ├─────────────────┤
│ Context Memory  │──────────────▶│ ai-engine       │
│                 │               │ context service │
├─────────────────┤               ├─────────────────┤
│ Smart Caching   │──────────────▶│ common/cache    │
│                 │               │ enhancement     │
├─────────────────┤               ├─────────────────┤
│ Workflow Engine │──────────────▶│ New module:     │
│                 │               │ workflows       │
├─────────────────┤               ├─────────────────┤
│ Cost Tracking   │──────────────▶│ ai-engine       │
│                 │               │ cost service    │
└─────────────────┘               └─────────────────┘
```

### From vendify-menu-maps

```
vendify-menu-maps                  VHM24
┌─────────────────┐               ┌─────────────────┐
│ Public Menu     │──────────────▶│ client module   │
│ Display         │               │ + frontend      │
├─────────────────┤               ├─────────────────┤
│ Machine Map     │──────────────▶│ locations       │
│ View            │               │ + frontend      │
├─────────────────┤               ├─────────────────┤
│ QR Menu Scan    │──────────────▶│ machines        │
│                 │               │ enhancement     │
├─────────────────┤               ├─────────────────┤
│ Admin Manual    │──────────────▶│ help module     │
│ Features        │               │ + frontend      │
└─────────────────┘               └─────────────────┘
```

---

## Environment Variables for New Features

```bash
# AI Engine Configuration
AI_ENGINE_ENABLED=true
AI_GEMINI_API_KEY=your-gemini-key
AI_OPENAI_API_KEY=your-openai-key
AI_ANTHROPIC_API_KEY=your-anthropic-key
AI_DEFAULT_MODEL=gemini-2.0-flash
AI_CACHE_TTL=3600
AI_MAX_TOKENS=4096

# Feature Flags
FEATURE_AI_COLUMN_MAPPING=true
FEATURE_RAW_MATERIAL_TRACKING=true
FEATURE_WORKFLOW_ENGINE=true
FEATURE_MULTI_MODEL_AI=true
FEATURE_OCR_IMPORT=true
FEATURE_NL_QUERY_BOT=true

# Raw Material Module
RAW_MATERIAL_LOW_THRESHOLD_PERCENT=20
BUNKER_AUTO_REFILL_ENABLED=true

# Workflow Engine
WORKFLOW_MAX_STEPS=50
WORKFLOW_TIMEOUT_MS=300000
```

---

## Summary

This integration guide ensures:

1. **Zero Breaking Changes**: All existing functionality preserved
2. **Additive Development**: Only new modules and services added
3. **Feature Flags**: Gradual rollout capability
4. **Full Rollback**: Every change can be reverted
5. **Test Coverage**: Minimum 80% for new code
6. **Documentation**: Complete migration paths

**Critical Rule**: When in doubt, ADD rather than MODIFY.

---

**Last Updated**: 2026-01-02
**Maintained By**: VendHub Development Team
