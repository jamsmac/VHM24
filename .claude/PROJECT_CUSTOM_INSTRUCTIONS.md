# VHM24 Claude Project Custom Instructions

> **Version**: 2.0.0
> **Updated**: 2026-01-02
> **Target**: Claude Code, AI Assistants

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VHM24 QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GOLDEN RULE: НИКОГДА НЕ ЛОМАЙ, ТОЛЬКО ДОБАВЛЯЙ                            │
│                                                                             │
│  🚨 EXISTING MODULES (НЕ СОЗДАВАТЬ НОВЫЕ!):                                 │
│  ├── recipes        → ENHANCE with new services                             │
│  ├── nomenclature   → ENHANCE with new services                             │
│  ├── telegram       → 13 submodules, ENHANCE only                           │
│  ├── inventory      → 3-level system, ENHANCE                               │
│  ├── machines       → ENHANCE with new services                             │
│  └── tasks          → Photo validation, ENHANCE                             │
│                                                                             │
│  ✅ NEW MODULES (SAFE TO CREATE):                                           │
│  ├── containers     → Bunker management (from VH24)                         │
│  ├── ingredient-batches → Batch tracking                                    │
│  ├── ai-engine      → Multi-model AI                                        │
│  └── workflows      → Workflow automation                                   │
│                                                                             │
│  ⚠️ INCOMPATIBLE (НЕ КОПИРОВАТЬ):                                          │
│  ├── Drizzle ORM    → VHM24 uses TypeORM                                    │
│  ├── Grammy         → VHM24 uses Telegraf                                   │
│  ├── tRPC           → VHM24 uses REST API                                   │
│  └── Supabase Auth  → VHM24 uses JWT                                        │
│                                                                             │
│  KEY FILES:                                                                 │
│  • CLAUDE.md                      → Main project guide                      │
│  • INTEGRATION_INSTRUCTIONS.md    → Detailed integration rules              │
│  • .claude/agents/                → Specialized agents                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Critical Warnings

### ⛔ STOP! Before ANY Integration

```
╔══════════════════════════════════════════════════════════════════════════╗
║  🛑 CHECK BEFORE CREATING ANY TABLE OR MODULE                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  RUN THIS FIRST:                                                         ║
║  $ ls backend/src/modules/[module-name]/                                 ║
║  $ psql -d vendhub -c "\d [table_name]"                                  ║
║                                                                          ║
║  IF MODULE EXISTS → Use ADD COLUMN, ADD SERVICE                          ║
║  IF MODULE NOT EXISTS → Safe to CREATE TABLE                             ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### Technology Stack Constraints

| Component | VHM24 Uses | DON'T Use |
|-----------|------------|-----------|
| ORM | **TypeORM 0.3.x** | Drizzle, Prisma |
| Telegram | **Telegraf 4.x** | Grammy, node-telegram-bot-api |
| API | **NestJS REST** | tRPC, GraphQL |
| Auth | **JWT + RBAC** | Supabase Auth, Firebase Auth |
| DB | **PostgreSQL 14+** | MySQL, MongoDB |
| Queue | **BullMQ** | Agenda, Bull (old) |

---

## 2. Source Projects for Integration

### Priority Matrix

| Source | Key Features | Priority | Complexity |
|--------|--------------|----------|------------|
| **VH24** | Containers, Recipe Consumption, Batch Tracking | HIGH | Medium |
| **data-parse-desk** | AI Column Mapping, Formula Engine | HIGH | Medium |
| **vendify-menu-maps** | Map Components, shadcn/ui | MEDIUM | Low |
| **AIAssistant** | Multi-model AI, Workflows, Caching | MEDIUM | High |
| **vhm24v2** | Code patterns, Testing patterns | LOW | Low |

### What to Take from Each

**VH24** (tRPC + Drizzle + Grammy):
- ✅ Business logic for containers (bunkers)
- ✅ Recipe consumption calculation algorithms
- ✅ Batch tracking logic
- ❌ tRPC routers (convert to REST)
- ❌ Drizzle schemas (convert to TypeORM)
- ❌ Grammy bot handlers (convert to Telegraf)

**data-parse-desk** (React + Supabase + AI):
- ✅ AI column mapping algorithms
- ✅ Formula engine logic
- ✅ ExcelJS/Papa Parse patterns
- ❌ Supabase edge functions (convert to NestJS)

**vendify-menu-maps** (React + Supabase):
- ✅ Map components (Leaflet integration)
- ✅ shadcn/ui components
- ✅ Public menu patterns
- ❌ Supabase auth (use JWT)

**AIAssistant** (FastAPI + Multi-model):
- ✅ Multi-model routing logic
- ✅ Caching strategies
- ✅ Workflow automation patterns
- ❌ FastAPI code (convert to NestJS)

---

## 3. Safe Integration Rules

### Rule 1: New Module Pattern

```typescript
// ✅ SAFE: Create isolated new module
// backend/src/modules/containers/containers.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Container]),
    forwardRef(() => MachinesModule), // Only if needed
  ],
  controllers: [ContainersController],
  providers: [ContainersService],
  exports: [ContainersService],
})
export class ContainersModule {}
```

### Rule 2: Extending Existing Module

```typescript
// ✅ SAFE: Add NEW service to existing module
// backend/src/modules/recipes/services/recipe-consumption.service.ts
// (Create NEW file, don't modify recipes.service.ts!)

@Injectable()
export class RecipeConsumptionService {
  // New functionality here
}

// Register in recipes.module.ts (ADD to providers, don't replace)
```

### Rule 3: Migration Safety

```typescript
// ✅ SAFE: CREATE TABLE for new modules
await queryRunner.createTable(new Table({
  name: 'containers',
  columns: [/* ... */],
}), true);

// ✅ SAFE: ADD COLUMN (nullable or with default)
await queryRunner.addColumn('machines', new TableColumn({
  name: 'new_field',
  type: 'varchar',
  isNullable: true, // ALWAYS nullable!
}));

// ❌ FORBIDDEN:
// - DROP TABLE, DROP COLUMN
// - ALTER COLUMN (type change)
// - RENAME COLUMN
```

### Rule 4: API Backward Compatibility

```typescript
// ✅ SAFE: Add new endpoint
@Get(':id/extended')
async getExtended(@Param('id') id: string) {
  // New endpoint - OK
}

// ❌ FORBIDDEN: Change existing endpoint response
@Get(':id')
async getOne(@Param('id') id: string) {
  // DON'T change what this returns!
}
```

---

## 4. Feature Flags

```bash
# .env
FEATURE_CONTAINERS=true
FEATURE_RECIPE_CONSUMPTION=true
FEATURE_BATCH_TRACKING=false
FEATURE_AI_ENGINE=false
FEATURE_WORKFLOWS=false
```

```typescript
// Usage in controller
@Controller('containers')
@UseGuards(FeatureFlagGuard)
@FeatureFlag('CONTAINERS_ENABLED')
export class ContainersController {}
```

---

## 5. Testing Requirements

| Type | Coverage | Required |
|------|----------|----------|
| Unit Tests | 80%+ | All new services |
| Integration | 100% | All new endpoints |
| Regression | 100% | ALL existing tests must pass |

```bash
# Run before and after EVERY change
npm run test
npm run lint
npm run build
```

---

## 6. Commit Format

```
<type>(<scope>): <subject>

Types: feat, enhance, fix, docs, refactor, test, chore
```

Examples:
```bash
feat(containers): add container management module
enhance(recipes): add consumption calculation service
fix(inventory): resolve batch tracking issue
```

---

## 7. Checklists

### Before Integration

- [ ] Read CLAUDE.md
- [ ] Read INTEGRATION_INSTRUCTIONS.md
- [ ] Check if module exists: `ls backend/src/modules/[name]/`
- [ ] Create feature branch
- [ ] Run baseline tests: `npm run test > baseline.txt`

### After Integration

- [ ] All tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Swagger docs updated
- [ ] Feature flag documented

---

## 8. Forbidden Actions

```
⛔ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:

• DROP TABLE, DROP COLUMN
• ALTER COLUMN (type changes)
• Remove existing endpoints
• Change existing API responses
• Modify existing services directly
• Commit to main branch directly
• Deploy without testing
• CREATE TABLE for existing tables
• Use Drizzle, Grammy, tRPC, Supabase Auth
```

---

## 9. Decision Matrix

```
Что делать?                          Решение
───────────────────────────────────────────────────
Добавить функцию в модуль          → Модуль существует?
  ├── ДА                           → Добавить НОВЫЙ сервис
  └── НЕТ                          → Создать новый модуль

Добавить поле в таблицу            → ADD COLUMN (nullable!)

Изменить существующее поле         → СТОП! Нужен план миграции

Удалить функционал                 → СТОП! Только deprecation
```

---

## 10. Quick Commands

```bash
# Development
npm run start:dev         # Backend
cd frontend && npm run dev # Frontend

# Testing
npm run test              # Unit tests
npm run test:cov          # Coverage
npm run test:e2e          # E2E tests

# Database
npm run migration:generate -- -n Name
npm run migration:run
npm run migration:revert

# Build
npm run build
npm run lint
```

---

## 11. Key Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Main project documentation |
| `.claude/INTEGRATION_INSTRUCTIONS.md` | Detailed integration rules |
| `.claude/agents/` | 10 specialized agents |
| `backend/src/modules/` | All NestJS modules |
| `backend/src/database/migrations/` | TypeORM migrations |

---

## 12. Specialized Agents

| Agent | Use For |
|-------|---------|
| `vendhub-dev-architect` | Architecture, Sprint planning |
| `vendhub-api-developer` | REST endpoints, DTOs |
| `vendhub-database-expert` | Migrations, queries |
| `vendhub-frontend-specialist` | React, Next.js |
| `vendhub-telegram-bot` | Telegram integration |
| `vendhub-auth-security` | JWT, RBAC, 2FA |
| `vendhub-tester` | Tests |
| `vendhub-mobile` | Expo, React Native |
| `vendhub-devops` | Docker, CI/CD |
| `vendhub-qa-lead` | Quality, releases |

---

**Remember: When in doubt — ADD, don't MODIFY**

**Last Updated**: 2026-01-02
**Version**: 2.0.0
