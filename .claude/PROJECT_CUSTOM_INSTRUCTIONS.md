# VHM24 Claude Project Custom Instructions

> **For**: Claude Code, GitHub Copilot, and AI Assistants
> **Version**: 1.0.0
> **Created**: 2026-01-02
> **Purpose**: Safe enhancement of VHM24 with features from related projects

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────────┐
│                     VHM24 INTEGRATION QUICK GUIDE                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  GOLDEN RULE: NEVER BREAK, ALWAYS ADD                                  │
│                                                                        │
│  Source Projects to Integrate:                                         │
│  ├── data-parse-desk  → AI Import, ML Mapping, Formula Engine          │
│  ├── VH24             → Raw Materials, Recipe Consumption, Bunkers     │
│  ├── vendify-menu-maps→ Public Menus, Maps, QR Codes                   │
│  ├── AIAssistant      → Multi-model AI, Workflows, Caching             │
│  └── vhm24v2          → Code patterns, Testing patterns                │
│                                                                        │
│  Priority Commands:                                                    │
│  • npm run test       → Run before AND after every change              │
│  • npm run lint       → Must pass with zero errors                     │
│  • npm run build      → Must succeed before commit                     │
│                                                                        │
│  Key Files:                                                            │
│  • CLAUDE.md          → Main project guide                             │
│  • INTEGRATION_INSTRUCTIONS.md → Detailed integration guide            │
│  • .claude/agents/    → Specialized agent instructions                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Project Context

### What is VHM24?

VendHub Manager (VHM24) is a production-grade ERP/CRM/CMMS for vending machine operations:

- **50+ NestJS backend modules**
- **645+ REST API endpoints**
- **114 database entities**
- **82 TypeORM migrations**
- **Next.js 16 frontend**
- **Expo 54 mobile app**
- **Telegram bot integration**

### Core Architecture Principles

1. **Manual Operations** - NO direct machine connectivity
2. **Photo Validation** - Mandatory for all task completion
3. **3-Level Inventory** - Warehouse → Operator → Machine
4. **Dual Platform** - Staff (internal) + Client (public)
5. **Non-Destructive** - All changes must be additive

---

## 2. Integration Source Projects

### 2.1 data-parse-desk (AI + Excel + ML)

**Repository**: https://github.com/jamsmac/data-parse-desk

**Features to Integrate**:

| Feature | Description | Target Module |
|---------|-------------|---------------|
| AI Column Mapping | ML-based automatic column detection | intelligent-import |
| Formula Engine | Math, string, logical, date operations | NEW: formula-engine |
| OCR Processing | Extract text from images | files module |
| NL Query Bot | Natural language queries via Telegram | telegram module |
| Rollup Calculator | Aggregations (sum, avg, min, max, etc.) | data-parser |

**Technologies to Adopt**:
- ExcelJS 4.4 patterns
- Papa Parse 5.5 patterns
- Gemini 2.5 / GPT-5 integration

### 2.2 VH24 (tRPC + Raw Materials)

**Repository**: https://github.com/jamsmac/VH24

**Features to Integrate**:

| Feature | Description | Target Module |
|---------|-------------|---------------|
| Raw Material Tracking | Automatic consumption calculation | NEW: raw-material |
| Recipe Consumption | Deduction based on formulations | recipes (enhance) |
| Bunker Management | Container/hopper level tracking | equipment (enhance) |
| Task Checklists | Step-by-step task completion | tasks (enhance) |
| Manager Approvals | Approval workflows | tasks (enhance) |

**Technologies to Evaluate**:
- Grammy (alternative to Telegraf) - evaluate only
- tRPC patterns - optional addition

### 2.3 vendify-menu-maps (Menus + Maps)

**Repository**: https://github.com/jamsmac/vendify-menu-maps

**Features to Integrate**:

| Feature | Description | Target Module |
|---------|-------------|---------------|
| Public Menu Display | Customer-facing product menu | client module |
| Machine Map View | Leaflet map with machine locations | frontend |
| QR Menu Scan | QR code to menu redirect | machines module |
| Admin Manual | Help documentation system | help module |

### 2.4 AIAssistant (Multi-model + Workflows)

**Repository**: https://github.com/jamsmac/AIAssistant

**Features to Integrate**:

| Feature | Description | Target Module |
|---------|-------------|---------------|
| Multi-model AI | Gemini, GPT, Claude routing | NEW: ai-engine |
| Context Memory | Conversation history (10 messages) | ai-engine |
| Smart Caching | Response caching (920x speedup) | common/cache |
| Workflow Engine | Multi-step automated processes | NEW: workflows |
| Cost Tracking | Token usage and cost monitoring | ai-engine |

### 2.5 vhm24v2 (Patterns + Testing)

**Repository**: https://github.com/jamsmac/vhm24v2

**Patterns to Adopt**:
- Shared code architecture (client/server/shared)
- Vitest testing patterns
- TypeScript strict mode patterns

---

## 3. Critical Rules for AI Assistants

### ABSOLUTE PROHIBITIONS

```
❌ NEVER modify existing API response structures
❌ NEVER drop or rename database columns
❌ NEVER remove enum values
❌ NEVER change method signatures of public APIs
❌ NEVER skip photo validation for tasks
❌ NEVER bypass inventory flow
❌ NEVER add machine connectivity features
❌ NEVER commit without running tests
❌ NEVER force push to main branches
❌ NEVER mix staff and client authentication
```

### REQUIRED PRACTICES

```
✅ ALWAYS run tests before and after changes
✅ ALWAYS use feature flags for new integrations
✅ ALWAYS create migrations with up() AND down()
✅ ALWAYS extend BaseEntity for new entities
✅ ALWAYS validate inputs with DTOs
✅ ALWAYS write tests for new code (80% min)
✅ ALWAYS use snake_case for database columns
✅ ALWAYS add @ApiProperty for Swagger docs
✅ ALWAYS check .claude/INTEGRATION_INSTRUCTIONS.md
✅ ALWAYS preserve backward compatibility
```

---

## 4. Integration Workflow

### Before Starting Any Integration

```bash
# 1. Ensure clean working state
git status

# 2. Create feature branch
git checkout -b feature/integrate-{feature-name}

# 3. Capture test baseline
npm run test > tests/baseline-$(date +%Y%m%d).txt

# 4. Check current build
npm run build
```

### During Integration

```typescript
// Pattern: Extension Service (DON'T modify originals)
@Injectable()
export class TasksEnhancedService {
  constructor(
    private readonly tasksService: TasksService,  // Existing
    private readonly newFeatureService: NewFeatureService,  // New
  ) {}

  // New method that composes existing + new
  async completeWithNewFeature(taskId: string) {
    const result = await this.tasksService.complete(taskId);
    await this.newFeatureService.process(result);
    return result;
  }
}
```

### After Integration

```bash
# 1. Run all tests
npm run test

# 2. Check types
npm run type-check

# 3. Lint code
npm run lint

# 4. Build
npm run build

# 5. Compare with baseline
diff tests/baseline-*.txt <(npm run test 2>&1)
# Must show NO new failures
```

---

## 5. Module Creation Templates

### New Backend Module

```
src/modules/{module-name}/
├── dto/
│   ├── create-{entity}.dto.ts
│   └── update-{entity}.dto.ts
├── entities/
│   └── {entity}.entity.ts
├── {module-name}.controller.ts
├── {module-name}.service.ts
├── {module-name}.service.spec.ts
└── {module-name}.module.ts
```

### New Entity Template

```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('{table_name}')
@Index(['{indexed_field}'])
export class {EntityName} extends BaseEntity {
  @ApiProperty({ description: 'Description' })
  @Column({ type: 'varchar', length: 255 })
  field_name: string;

  @ApiProperty({ description: 'Foreign key' })
  @Column({ type: 'uuid' })
  related_id: string;

  @ManyToOne(() => RelatedEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_id' })
  related: RelatedEntity;
}
```

### New Service Template

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class {ServiceName}Service {
  constructor(
    @InjectRepository({Entity})
    private readonly repository: Repository<{Entity}>,
  ) {}

  async create(dto: CreateDto): Promise<{Entity}> {
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async findOne(id: string): Promise<{Entity}> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`{Entity} with ID ${id} not found`);
    }
    return entity;
  }
}
```

---

## 6. Feature Integration Examples

### Example 1: Adding AI Column Mapping

```typescript
// 1. Create new service (don't modify existing)
// src/modules/intelligent-import/services/ai-column-mapper.service.ts

@Injectable()
export class AIColumnMapperService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async mapColumns(
    headers: string[],
    targetSchema: ColumnSchema[],
  ): Promise<ColumnMapping[]> {
    // Check feature flag
    if (!this.configService.get('FEATURE_AI_COLUMN_MAPPING')) {
      return this.fallbackMapping(headers, targetSchema);
    }

    // AI-powered mapping
    const prompt = this.buildPrompt(headers, targetSchema);
    const response = await this.callAI(prompt);
    return this.parseResponse(response);
  }

  private fallbackMapping(headers: string[], schema: ColumnSchema[]): ColumnMapping[] {
    // Existing logic preserved as fallback
    return headers.map((h, i) => ({
      source: h,
      target: schema[i]?.name || null,
      confidence: 0.5,
    }));
  }
}

// 2. Register in module
@Module({
  providers: [
    IntelligentImportService,     // Existing
    AIColumnMapperService,        // New
  ],
})
export class IntelligentImportModule {}
```

### Example 2: Adding Raw Material Tracking

```typescript
// 1. Create new module
// src/modules/raw-material/raw-material.module.ts

@Module({
  imports: [
    TypeOrmModule.forFeature([RawMaterial, RawMaterialMovement, Bunker]),
    forwardRef(() => InventoryModule),
    forwardRef(() => RecipesModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [RawMaterialController],
  providers: [
    RawMaterialService,
    BunkerService,
    ConsumptionCalculatorService,
  ],
  exports: [RawMaterialService, BunkerService],
})
export class RawMaterialModule {}

// 2. Create entity
// src/modules/raw-material/entities/raw-material.entity.ts

@Entity('raw_materials')
export class RawMaterial extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: RawMaterialType })
  type: RawMaterialType;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  min_threshold: number;

  @Column({ type: 'date', nullable: true })
  expiration_date: Date;
}

// 3. Create migration
// npm run migration:generate -- -n AddRawMaterialModule
```

### Example 3: Adding Workflow Engine

```typescript
// 1. Create new module
// src/modules/workflows/workflows.module.ts

@Module({
  imports: [
    BullModule.registerQueue({ name: 'workflows' }),
    TypeOrmModule.forFeature([Workflow, WorkflowExecution, WorkflowStep]),
    TasksModule,
    NotificationsModule,
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowEngineService,
    WorkflowExecutorProcessor,
    WorkflowTriggerService,
  ],
  exports: [WorkflowEngineService],
})
export class WorkflowsModule {}

// 2. Create workflow definition entity
@Entity('workflows')
export class Workflow extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'jsonb' })
  trigger: WorkflowTrigger;

  @Column({ type: 'jsonb' })
  steps: WorkflowStep[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
```

---

## 7. Database Migration Rules

### Safe Migration Pattern

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRawMaterialFields1704153600000 implements MigrationInterface {
  name = 'AddRawMaterialFields1704153600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new table
    await queryRunner.createTable(
      new Table({
        name: 'raw_materials',
        columns: [
          // ... columns
        ],
      }),
      true, // ifNotExists
    );

    // 2. Add new column to existing table (ALWAYS nullable first)
    await queryRunner.addColumn(
      'machines',
      new TableColumn({
        name: 'raw_material_tracking_enabled',
        type: 'boolean',
        default: false,
        isNullable: true, // IMPORTANT: Always nullable for new columns
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // MUST have rollback
    await queryRunner.dropColumn('machines', 'raw_material_tracking_enabled');
    await queryRunner.dropTable('raw_materials');
  }
}
```

### Forbidden Migration Actions

```typescript
// ❌ NEVER do these in migrations
await queryRunner.dropColumn('existing_table', 'existing_column');
await queryRunner.renameColumn('table', 'old_name', 'new_name');
await queryRunner.dropTable('existing_table');
await queryRunner.query(`ALTER TABLE ... DROP ...`);

// ❌ NEVER add non-nullable columns without defaults
await queryRunner.addColumn('table', new TableColumn({
  name: 'new_column',
  type: 'varchar',
  isNullable: false, // WRONG without default!
}));
```

---

## 8. Testing Requirements

### Minimum Coverage

| Type | Coverage | Requirement |
|------|----------|-------------|
| Unit Tests | 80%+ | All new services |
| Integration | 100% | All new endpoints |
| E2E | Critical | Main user flows |
| Regression | 100% | All existing tests must pass |

### Test Commands

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:cov

# Run specific module
npm run test -- --testPathPattern=raw-material

# Run e2e
npm run test:e2e
```

---

## 9. Feature Flags

### Configuration

```bash
# .env
FEATURE_AI_COLUMN_MAPPING=true
FEATURE_RAW_MATERIAL_TRACKING=true
FEATURE_WORKFLOW_ENGINE=true
FEATURE_MULTI_MODEL_AI=true
FEATURE_OCR_IMPORT=true
```

### Usage Pattern

```typescript
@Injectable()
export class FeatureFlagService {
  constructor(private configService: ConfigService) {}

  isEnabled(feature: string): boolean {
    return this.configService.get(`FEATURE_${feature}`, 'false') === 'true';
  }
}

// In services
async processImport(data: ImportData) {
  if (this.featureFlags.isEnabled('AI_COLUMN_MAPPING')) {
    return this.aiColumnMapper.map(data);
  }
  return this.manualMapper.map(data);
}
```

---

## 10. Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature from integration
- `enhance`: Enhancement to existing feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples

```bash
# New feature integration
feat(raw-material): add raw material tracking module

Integrated raw material tracking from VH24 project.
Includes bunker management and consumption calculation.

Refs: VH24, INTEGRATION_INSTRUCTIONS.md

# Enhancement
enhance(intelligent-import): add AI column mapping

Added ML-based column mapping from data-parse-desk.
Feature flag: FEATURE_AI_COLUMN_MAPPING

Refs: data-parse-desk
```

---

## 11. Specialized Agents

Use these specialized agents for domain-specific tasks:

| Agent | Use For |
|-------|---------|
| `vendhub-dev-architect` | Architecture, feature planning |
| `vendhub-api-developer` | REST endpoints, DTOs |
| `vendhub-database-expert` | Migrations, queries |
| `vendhub-frontend-specialist` | React, Next.js |
| `vendhub-telegram-bot` | Telegram integration |
| `vendhub-auth-security` | JWT, RBAC, 2FA |
| `vendhub-tester` | Unit, integration tests |
| `vendhub-mobile` | Expo, React Native |
| `vendhub-devops` | Docker, CI/CD |
| `vendhub-qa-lead` | Quality, releases |

---

## 12. Quick Reference Commands

```bash
# Development
npm run start:dev          # Start backend
cd frontend && npm run dev # Start frontend

# Testing
npm run test               # Unit tests
npm run test:cov           # With coverage
npm run test:e2e           # E2E tests

# Code Quality
npm run lint               # Lint
npm run type-check         # TypeScript check
npm run format             # Prettier format

# Database
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert

# Build
npm run build              # Production build
```

---

## 13. Emergency Rollback

### If Something Breaks

```bash
# 1. Revert last migration
npm run migration:revert

# 2. Disable feature flag
echo "FEATURE_X=false" >> .env

# 3. Restart application
pm2 restart all

# 4. If needed, revert commit
git revert HEAD
```

---

## Summary Checklist

Before every integration:
- [ ] Read INTEGRATION_INSTRUCTIONS.md
- [ ] Create feature branch
- [ ] Run baseline tests
- [ ] Check for breaking changes (must be 0)

During integration:
- [ ] Use extension pattern (don't modify existing)
- [ ] Add feature flags
- [ ] Write tests
- [ ] Create reversible migrations

After integration:
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Lint passes
- [ ] Documentation updated

---

**Remember**: When in doubt, ADD rather than MODIFY.

---

**Last Updated**: 2026-01-02
**Maintained By**: VendHub Development Team
