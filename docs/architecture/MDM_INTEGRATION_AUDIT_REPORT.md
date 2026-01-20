# VHM24 MDM Integration Audit Report

> **Version**: 1.0.0
> **Date**: 2025-01-20
> **Author**: Claude Code AI Architect
> **Status**: COMPLETE

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Detailed Analysis](#2-detailed-analysis)
3. [Integration Plan by Module](#3-integration-plan-by-module)
4. [SQL Migration Strategy](#4-sql-migration-strategy)
5. [Phase Checklists](#5-phase-checklists)
6. [Risk Assessment](#6-risk-assessment)
7. [Recommendations](#7-recommendations)

---

## 1. Executive Summary

### 1.1 Scope

This audit evaluates the integration of Master Data Management (MDM) capabilities into the existing VHM24 codebase. The analysis covers:

- **48+ existing modules** in the backend
- **89 database migrations**
- **18 reference data entities** identified
- **150+ foreign key relationships**
- **40+ predefined dictionary items**

### 1.2 Current State Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Reference Data Foundation | **PARTIAL** | Basic Dictionary/DictionaryItem pattern exists |
| Flexible Field System | **NEW** | directories-v2 provides EAV pattern |
| External Source Sync | **NEW** | directories-v2 provides sync infrastructure |
| Origin Tracking | **NEW** | directories-v2 supports OFFICIAL/LOCAL |
| RBAC Integration | **EXISTING** | Roles/Permissions system in place |
| Audit Trail | **EXISTING** | AuditLog module operational |

### 1.3 Key Findings

#### Strengths
1. **Solid Foundation**: Existing Dictionary/DictionaryItem pattern covers enumerated values
2. **Clean Architecture**: NestJS module pattern allows isolated implementation
3. **directories-v2 Ready**: New module provides MDM infrastructure
4. **No Breaking Changes Required**: Additive approach possible

#### Gaps Identified
1. **No External Source Integration**: Current dictionaries are static
2. **No Origin Tracking**: Cannot distinguish official vs local entries
3. **Limited Field Flexibility**: Current entities have fixed schemas
4. **No Sync Automation**: Manual updates only
5. **No Quality Control**: Missing approval workflows

### 1.4 Effort Estimate

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: Foundation | 2-3 sprints | Medium |
| Phase 2: Migration | 2-3 sprints | High |
| Phase 3: External Sources | 2 sprints | Medium |
| Phase 4: Quality Control | 1-2 sprints | Low |
| **Total** | **7-10 sprints** | - |

### 1.5 Risk Level

**MEDIUM** - Migration is feasible with careful planning. Main risks:
- Data migration complexity (RESTRICT constraints)
- Business continuity during transition
- Backward compatibility requirements

### 1.6 Recommendation

**PROCEED WITH PHASED APPROACH**

The directories-v2 infrastructure is well-designed and can coexist with existing systems during transition. Recommend:
1. Deploy directories-v2 as parallel system
2. Migrate reference data incrementally
3. Add external sources after core stabilization
4. Deprecate old dictionaries module last

---

## 2. Detailed Analysis

### 2.1 Existing Reference Data Inventory

#### 2.1.1 Classification by MDM Type

| Entity | Current Location | MDM Type | Records Est. | Migration Priority |
|--------|-----------------|----------|--------------|-------------------|
| **PARAM (Enumerated Values)** |
| DictionaryItem | dictionaries module | PARAM | 40+ | P1 |
| MachineStatus | machines/entities | PARAM (enum) | 6 values | P2 |
| TaskType | tasks/entities | PARAM (enum) | 6 values | P2 |
| **MANUAL (User-Managed)** |
| Nomenclature | nomenclature module | MANUAL | 100-1000 | P1 |
| Location | locations module | MANUAL | 50-500 | P1 |
| Machine | machines module | MANUAL | 100-500 | P2 |
| Counterparty | counterparty module | MANUAL | 20-200 | P1 |
| Warehouse | warehouse module | MANUAL | 5-50 | P2 |
| EquipmentComponent | equipment module | MANUAL | 50-500 | P3 |
| SparePart | requests module | MANUAL | 20-200 | P3 |
| Recipe | recipes module | MANUAL | 50-200 | P3 |
| Department | hr module | MANUAL | 5-20 | P4 |
| Position | hr module | MANUAL | 10-50 | P4 |
| Material | requests module | MANUAL | 20-100 | P4 |
| Supplier | requests module | MANUAL | 10-50 | P4 |
| **MIXED (External + Local)** |
| Contract | counterparty module | MIXED | 20-100 | P2 |

#### 2.1.2 Existing Dictionary Semantic Blocks

Current seeded dictionary items (10 blocks, 40+ items):

```
1. machine_types (4 items)
   - coffee_machine, snack_machine, combo_machine, water_cooler

2. machine_statuses (6 items)
   - active, inactive, maintenance, offline, decommissioned, pending_setup

3. task_types (6 items)
   - refill, collection, maintenance, repair, inspection, cleaning

4. task_statuses (6 items)
   - created, assigned, in_progress, completed, cancelled, rejected

5. incident_types (4 items)
   - malfunction, vandalism, stock_out, other

6. incident_priorities (3 items)
   - low, medium, high

7. payment_methods (4 items)
   - cash, card, qr_code, mixed

8. units_of_measure (5 items)
   - piece, kg, liter, gram, ml

9. product_categories (4 items)
   - hot_drinks, cold_drinks, snacks, other

10. container_types (4 items)
    - cup, bottle, can, bag
```

### 2.2 Directories-V2 vs Existing Comparison

#### 2.2.1 Feature Matrix

| Feature | Existing Dictionaries | directories-v2 | Gap |
|---------|---------------------|----------------|-----|
| Fixed schema | Yes | No (JSONB) | **NEW** |
| Custom fields | No | Yes (16 types) | **NEW** |
| External sources | No | Yes (4 types) | **NEW** |
| Auto-sync | No | Yes (cron) | **NEW** |
| Origin tracking | No | Yes (OFFICIAL/LOCAL) | **NEW** |
| Approval workflow | No | Yes | **NEW** |
| Full-text search | No | Yes (tsvector) | **NEW** |
| File attachments | No | Yes | **NEW** |
| Templates | No | Yes | **NEW** |
| Soft delete | Yes | Yes | MATCH |
| Audit fields | Yes | Yes | MATCH |
| RBAC | Yes | Yes | MATCH |

#### 2.2.2 Schema Comparison

**Current Dictionary Model:**
```typescript
// Simple key-value pattern
Dictionary: { id, code, name_ru, name_en, description, is_active }
DictionaryItem: { id, dictionary_id, code, value_ru, value_en, sort_order, is_active }
```

**directories-v2 Model:**
```typescript
// Flexible EAV pattern with rich metadata
Directory: {
  id, code, name_ru, name_en, description,
  type (5 types), scope (3 scopes),
  settings (JSONB), template_code,
  organization_id, location_id,
  icon, color, is_system, sort_order,
  audit fields...
}

DirectoryField: {
  id, directory_id, code, name_ru, name_en,
  field_type (16 types),
  reference_directory_id,
  options (JSONB), validation (JSONB),
  default_value, is_required, is_unique, is_searchable,
  show_in_table, show_in_card, sort_order,
  is_system, is_active
}

DirectoryEntry: {
  id, directory_id, code, name_ru, name_en,
  origin (OFFICIAL/LOCAL),
  source_id, external_id,
  data (JSONB),
  status (3 states),
  approval_status, approved_by_id, approved_at,
  search_vector (tsvector),
  sort_order, audit fields...
}
```

### 2.3 Dependency Graph Analysis

#### 2.3.1 Critical Path Dependencies

```
Level 0 (No Dependencies - Migrate First):
├── Dictionary/DictionaryItem (foundation)
├── Organization (self-ref only)
├── Counterparty (no FK deps)
└── Nomenclature (dict codes only)

Level 1 (Depends on Level 0):
├── User → Organization
├── Location → Counterparty
└── Contract → Counterparty

Level 2 (Depends on Level 1):
├── Warehouse → Location
├── Machine → Location, Organization, Contract
└── Recipe → Nomenclature

Level 3 (Depends on Level 2):
├── Task → Machine, User, Nomenclature
├── Equipment → Machine
└── Inventory → Machine, Warehouse, Nomenclature

Level 4 (Depends on Level 3):
├── Transaction → Machine, User, Contract
├── Incident → Machine, User
└── All remaining modules
```

#### 2.3.2 RESTRICT Constraints (High Risk)

These FK constraints prevent deletion if referenced:

| Child Entity | Parent Entity | Column | Impact |
|--------------|---------------|--------|--------|
| Machine | Location | location_id | **CRITICAL** - Cannot delete locations with machines |
| TaskItem | Nomenclature | nomenclature_id | **HIGH** - Cannot delete products with tasks |
| RecipeIngredient | Nomenclature | nomenclature_id | **HIGH** - Cannot delete ingredients in recipes |
| Contract | Counterparty | counterparty_id | **MEDIUM** - Cannot delete counterparties with contracts |
| MachineLocationHistory | Location | from/to_location_id | **MEDIUM** - History preservation |
| InventoryActualCount | Nomenclature | nomenclature_id | **MEDIUM** - Audit preservation |
| PurchaseHistory | Nomenclature, Counterparty | multiple | **MEDIUM** - History preservation |

### 2.4 MDM Specification Gap Analysis

Based on the provided MDM specification (25 sections), here is the gap analysis:

| MDM Section | directories-v2 Status | Gap Level |
|-------------|----------------------|-----------|
| 1. Directory Types | **COMPLETE** | None |
| 2. Entry Cards | **COMPLETE** | None |
| 3. Field Types (16) | **COMPLETE** | None |
| 4. Validation Rules | **COMPLETE** | None |
| 5. Origin Tracking | **COMPLETE** | None |
| 6. External Sources | **COMPLETE** | None |
| 7. Sync Engine | **PARTIAL** | Need BullMQ job |
| 8. Field Mapping | **COMPLETE** | None |
| 9. Directory Builder | **DESIGN** | Frontend needed |
| 10. Inline Create | **DESIGN** | Frontend needed |
| 11. Templates | **COMPLETE** | Seed data needed |
| 12. Approval Workflow | **COMPLETE** | None |
| 13. Full-text Search | **COMPLETE** | None |
| 14. File Attachments | **COMPLETE** | None |
| 15. Import/Export | **MISSING** | Need implementation |
| 16. Webhooks | **MISSING** | Need implementation |
| 17. RBAC Integration | **PARTIAL** | Need guards |
| 18. Audit Logging | **PARTIAL** | Need interceptor |
| 19. Multi-tenant Scope | **COMPLETE** | None |
| 20. Soft Delete | **COMPLETE** | None |
| 21. API Endpoints | **MISSING** | Need controllers |
| 22. DTO Validation | **MISSING** | Need DTOs |
| 23. Swagger Docs | **MISSING** | Need decorators |
| 24. Frontend Screens | **DESIGN** | Need implementation |
| 25. Mobile Support | **MISSING** | Phase 4+ |

---

## 3. Integration Plan by Module

### 3.1 Phase 1: Foundation (directories-v2 Core)

#### 3.1.1 directories-v2 Module Setup

**Files to Create:**

```
backend/src/modules/directories-v2/
├── directories-v2.module.ts           # Module definition
├── directories-v2.controller.ts       # REST endpoints
├── directories-v2.service.ts          # Business logic
├── entries/
│   ├── entries.controller.ts          # Entry CRUD
│   └── entries.service.ts             # Entry logic
├── fields/
│   ├── fields.controller.ts           # Field CRUD
│   └── fields.service.ts              # Field logic
├── sources/
│   ├── sources.controller.ts          # Source CRUD
│   ├── sources.service.ts             # Source logic
│   └── sync.service.ts                # Sync engine
├── templates/
│   ├── templates.controller.ts        # Template CRUD
│   └── templates.service.ts           # Template logic
├── dto/
│   ├── create-directory.dto.ts
│   ├── update-directory.dto.ts
│   ├── create-entry.dto.ts
│   ├── update-entry.dto.ts
│   ├── create-field.dto.ts
│   ├── create-source.dto.ts
│   ├── sync-request.dto.ts
│   └── directory-query.dto.ts
├── guards/
│   └── directory-access.guard.ts      # RBAC for directories
├── decorators/
│   └── directory-permission.decorator.ts
└── entities/                          # Already created
```

**Affected Modules:**
- None (new parallel module)

**Estimated Effort:** 3-4 weeks

#### 3.1.2 DTOs Implementation

```typescript
// create-directory.dto.ts
export class CreateDirectoryDto {
  @IsString() @MinLength(2) @MaxLength(100)
  code: string;

  @IsString() @MinLength(2) @MaxLength(200)
  name_ru: string;

  @IsOptional() @IsString() @MaxLength(200)
  name_en?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsEnum(DirectoryType)
  type: DirectoryType;

  @IsEnum(DirectoryScope)
  @IsOptional()
  scope?: DirectoryScope = DirectoryScope.GLOBAL;

  @IsOptional() @IsUUID()
  organization_id?: string;

  @IsOptional() @IsUUID()
  location_id?: string;

  @IsOptional() @IsString() @MaxLength(50)
  icon?: string;

  @IsOptional() @IsString() @MaxLength(20)
  color?: string;

  @IsOptional() @ValidateNested()
  @Type(() => DirectorySettingsDto)
  settings?: DirectorySettingsDto;
}
```

### 3.2 Phase 2: Data Migration

#### 3.2.1 Dictionary → directories-v2 Migration

**Migration Strategy:**

1. **Create Parametric Directories** from existing dictionary codes
2. **Migrate DictionaryItems** to DirectoryEntries
3. **Keep dictionaries module** for backward compatibility
4. **Add deprecation warnings** to old endpoints

**Mapping Table:**

| Dictionary Code | New Directory Code | Type | Fields |
|-----------------|-------------------|------|--------|
| machine_types | sys_machine_types | PARAMETRIC | code, name_ru, name_en |
| machine_statuses | sys_machine_statuses | PARAMETRIC | code, name_ru, name_en, color |
| task_types | sys_task_types | PARAMETRIC | code, name_ru, name_en, icon |
| task_statuses | sys_task_statuses | PARAMETRIC | code, name_ru, name_en, color |
| incident_types | sys_incident_types | PARAMETRIC | code, name_ru, name_en |
| incident_priorities | sys_incident_priorities | PARAMETRIC | code, name_ru, name_en, color |
| payment_methods | sys_payment_methods | PARAMETRIC | code, name_ru, name_en |
| units_of_measure | sys_units | PARAMETRIC | code, name_ru, name_en, symbol |
| product_categories | sys_product_categories | PARAMETRIC | code, name_ru, name_en, icon |
| container_types | sys_container_types | PARAMETRIC | code, name_ru, name_en |

#### 3.2.2 Reference Entity Migration Plan

| Entity | Migration Strategy | New Directory Code | Priority |
|--------|-------------------|-------------------|----------|
| Nomenclature | **HYBRID** - Keep entity, link to directory | products | P1 |
| Location | **HYBRID** - Keep entity, link to directory | locations | P1 |
| Counterparty | **HYBRID** - Keep entity, link to directory | counterparties | P1 |
| Machine | NO MIGRATION - Complex operational entity | - | - |
| User | NO MIGRATION - Auth entity | - | - |
| Contract | **HYBRID** - Keep entity, add directory fields | contracts | P2 |
| Warehouse | **HYBRID** - Keep entity, link to directory | warehouses | P2 |
| Recipe | NO MIGRATION - Complex relationships | - | - |

### 3.3 Phase 3: External Sources

#### 3.3.1 Sync Engine Implementation

**Components:**

```typescript
// sync.service.ts - Core sync logic
@Injectable()
export class DirectorySyncService {
  constructor(
    @InjectQueue('directory-sync') private syncQueue: Queue,
    private sourcesService: SourcesService,
    private entriesService: EntriesService,
    private syncLogService: SyncLogService,
  ) {}

  async triggerSync(sourceId: string, triggeredBy: string, userId?: string) {
    const job = await this.syncQueue.add('sync', {
      sourceId,
      triggeredBy,
      userId,
    });
    return { jobId: job.id };
  }

  @Process('sync')
  async processSync(job: Job<SyncJobData>) {
    const { sourceId, triggeredBy, userId } = job.data;
    const source = await this.sourcesService.findOne(sourceId);

    const log = await this.syncLogService.create({
      source_id: sourceId,
      directory_id: source.directory_id,
      triggered_by: triggeredBy,
      triggered_by_user_id: userId,
      status: SyncStatus.RUNNING,
    });

    try {
      const data = await this.fetchSourceData(source);
      const results = await this.processSourceData(source, data, log.id);

      await this.syncLogService.complete(log.id, results);
    } catch (error) {
      await this.syncLogService.fail(log.id, error);
      throw error;
    }
  }
}
```

**BullMQ Job Queue Setup:**

```typescript
// directories-v2.module.ts
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'directory-sync',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Directory,
      DirectoryField,
      DirectoryEntry,
      DirectorySource,
      DirectorySyncLog,
      DirectoryEntryFile,
      DirectoryTemplate,
    ]),
  ],
  // ...
})
```

### 3.4 Phase 4: Quality Control

#### 3.4.1 Approval Workflow

```typescript
// entries.service.ts - Approval methods
async submitForApproval(entryId: string, userId: string): Promise<DirectoryEntry> {
  const entry = await this.findOne(entryId);

  if (entry.origin !== EntryOrigin.LOCAL) {
    throw new BadRequestException('Only LOCAL entries can be submitted for approval');
  }

  return this.entriesRepository.save({
    ...entry,
    status: EntryStatus.PENDING_APPROVAL,
    approval_status: ApprovalStatus.PENDING,
  });
}

async approveEntry(entryId: string, approverId: string): Promise<DirectoryEntry> {
  const entry = await this.findOne(entryId);

  return this.entriesRepository.save({
    ...entry,
    status: EntryStatus.ACTIVE,
    approval_status: ApprovalStatus.APPROVED,
    approved_by_id: approverId,
    approved_at: new Date(),
  });
}

async rejectEntry(entryId: string, approverId: string, reason: string): Promise<DirectoryEntry> {
  const entry = await this.findOne(entryId);

  return this.entriesRepository.save({
    ...entry,
    approval_status: ApprovalStatus.REJECTED,
    approved_by_id: approverId,
    approved_at: new Date(),
    // Store reason in data or separate field
  });
}
```

---

## 4. SQL Migration Strategy

### 4.1 Migration Files Overview

The directories-v2 tables have been created in migration `1751200000000-CreateDirectoriesV2Tables.ts`. Additional migrations needed:

### 4.2 Data Migration Script

```sql
-- Migration: Seed system directories from existing dictionaries
-- File: 1751200001000-SeedSystemDirectories.ts

-- Create system directories for each dictionary code
INSERT INTO directories_v2 (
  id, code, name_ru, name_en, type, scope,
  is_system, is_active, sort_order, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'sys_' || d.code,
  d.name_ru,
  d.name_en,
  'parametric'::directory_type_enum,
  'global'::directory_scope_enum,
  true,
  d.is_active,
  ROW_NUMBER() OVER (ORDER BY d.created_at),
  NOW(),
  NOW()
FROM dictionaries d
WHERE d.deleted_at IS NULL
ON CONFLICT (code) DO NOTHING;

-- Create default fields for parametric directories
INSERT INTO directory_fields (
  id, directory_id, code, name_ru, name_en,
  field_type, is_required, is_unique, is_searchable,
  show_in_table, show_in_card, sort_order, is_system, is_active,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  d.id,
  'value',
  'Значение',
  'Value',
  'text'::directory_field_type_enum,
  true,
  true,
  true,
  true,
  true,
  1,
  true,
  true,
  NOW(),
  NOW()
FROM directories_v2 d
WHERE d.type = 'parametric' AND d.is_system = true
ON CONFLICT DO NOTHING;

-- Migrate dictionary items to directory entries
INSERT INTO directory_entries (
  id, directory_id, code, name_ru, name_en,
  origin, status, data, sort_order,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  d.id,
  di.code,
  di.value_ru,
  di.value_en,
  'official'::entry_origin_enum,
  'active'::entry_status_enum,
  jsonb_build_object('value', di.value_ru),
  di.sort_order,
  di.created_at,
  di.updated_at
FROM dictionary_items di
JOIN dictionaries dict ON di.dictionary_id = dict.id
JOIN directories_v2 d ON d.code = 'sys_' || dict.code
WHERE di.deleted_at IS NULL
ON CONFLICT DO NOTHING;
```

### 4.3 Rollback Strategy

```sql
-- Rollback: Remove migrated data (preserves original dictionaries)
-- File: 1751200001000-SeedSystemDirectories.ts (down method)

-- Remove migrated entries
DELETE FROM directory_entries
WHERE directory_id IN (
  SELECT id FROM directories_v2 WHERE is_system = true AND code LIKE 'sys_%'
);

-- Remove default fields
DELETE FROM directory_fields
WHERE directory_id IN (
  SELECT id FROM directories_v2 WHERE is_system = true AND code LIKE 'sys_%'
);

-- Remove system directories
DELETE FROM directories_v2
WHERE is_system = true AND code LIKE 'sys_%';
```

### 4.4 Backward Compatibility View

```sql
-- Create view for backward compatibility
-- Old code using dictionaries can use this view

CREATE OR REPLACE VIEW dictionary_items_compat AS
SELECT
  de.id,
  d.id as dictionary_id,
  de.code,
  de.name_ru as value_ru,
  de.name_en as value_en,
  de.sort_order,
  CASE WHEN de.status = 'active' THEN true ELSE false END as is_active,
  de.created_at,
  de.updated_at,
  de.deleted_at
FROM directory_entries de
JOIN directories_v2 d ON de.directory_id = d.id
WHERE d.type = 'parametric' AND d.is_system = true;

-- Grant access
GRANT SELECT ON dictionary_items_compat TO app_user;
```

---

## 5. Phase Checklists

### 5.1 Phase 1 Checklist: Foundation

#### Pre-Implementation
- [ ] Review directories-v2 entities for completeness
- [ ] Confirm migration file runs successfully
- [ ] Set up development environment with clean database
- [ ] Create feature branch: `feature/mdm-phase1-foundation`

#### Implementation
- [ ] Create `directories-v2.module.ts` with imports
- [ ] Implement `directories-v2.service.ts` with CRUD
- [ ] Implement `directories-v2.controller.ts` with REST endpoints
- [ ] Create all DTOs with validation
- [ ] Implement `entries.service.ts` and `entries.controller.ts`
- [ ] Implement `fields.service.ts` and `fields.controller.ts`
- [ ] Add Swagger decorators to all endpoints
- [ ] Create `directory-access.guard.ts` for RBAC
- [ ] Add module to `app.module.ts` imports

#### Testing
- [ ] Write unit tests for services (>80% coverage)
- [ ] Write integration tests for controllers
- [ ] Test CRUD operations manually via Swagger
- [ ] Verify foreign key constraints work
- [ ] Test soft delete functionality

#### Documentation
- [ ] Update API documentation
- [ ] Add endpoint examples to Swagger
- [ ] Document directory types and their usage

#### Deployment
- [ ] Run migration on staging
- [ ] Verify no conflicts with existing modules
- [ ] Deploy to production (off-hours)
- [ ] Monitor for errors

### 5.2 Phase 2 Checklist: Data Migration

#### Pre-Migration
- [ ] Backup production database
- [ ] Document current dictionary usage across codebase
- [ ] Create rollback script
- [ ] Test migration on staging with production data copy

#### Implementation
- [ ] Create seed migration for system directories
- [ ] Run dictionary → directories-v2 migration
- [ ] Verify all dictionary items migrated correctly
- [ ] Create backward compatibility view
- [ ] Update dictionaries module to mark as deprecated

#### Testing
- [ ] Verify all dictionary codes accessible via new endpoints
- [ ] Test backward compatibility view
- [ ] Run existing tests to ensure no regressions
- [ ] Verify foreign key references still work

#### Documentation
- [ ] Update CLAUDE.md with new directory system
- [ ] Add deprecation notice to dictionaries endpoints
- [ ] Document migration path for consuming code

### 5.3 Phase 3 Checklist: External Sources

#### Pre-Implementation
- [ ] Set up BullMQ with Redis
- [ ] Design source configuration UI mockups
- [ ] Identify test external data sources

#### Implementation
- [ ] Implement `sources.service.ts` with CRUD
- [ ] Implement `sync.service.ts` with BullMQ processor
- [ ] Add sync scheduling with @nestjs/schedule
- [ ] Implement sync log tracking
- [ ] Create source configuration DTOs
- [ ] Add sync endpoints to controller

#### Testing
- [ ] Test URL source sync
- [ ] Test API source sync with auth
- [ ] Test file upload and parse
- [ ] Test scheduled sync execution
- [ ] Verify sync logs recorded correctly

#### Documentation
- [ ] Document source configuration options
- [ ] Add sync troubleshooting guide
- [ ] Document field mapping syntax

### 5.4 Phase 4 Checklist: Quality Control

#### Pre-Implementation
- [ ] Define approval workflow requirements
- [ ] Design approval UI mockups
- [ ] Identify users with approval permissions

#### Implementation
- [ ] Add approval methods to entries service
- [ ] Create approval endpoints
- [ ] Add email/notification on approval request
- [ ] Implement duplicate detection for inline create

#### Testing
- [ ] Test full approval workflow
- [ ] Test rejection with reason
- [ ] Verify notifications sent
- [ ] Test duplicate detection accuracy

#### Documentation
- [ ] Document approval process
- [ ] Add approval permissions to RBAC docs
- [ ] Create user guide for approvers

---

## 6. Risk Assessment

### 6.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Full backup, rollback script, staging test |
| Breaking existing features | Medium | High | Backward compat views, gradual rollout |
| Performance degradation | Medium | Medium | Index optimization, query analysis |
| Sync failures (external) | High | Low | Retry logic, alerting, manual fallback |
| RBAC conflicts | Low | Medium | Thorough testing, permission audit |
| Frontend compatibility | Medium | Medium | API versioning, deprecation period |

### 6.2 Contingency Plans

#### Data Migration Failure
1. Stop migration immediately
2. Execute rollback script
3. Restore from backup if needed
4. Investigate root cause
5. Fix and re-attempt in next maintenance window

#### Performance Issues
1. Enable query logging
2. Analyze slow queries
3. Add missing indexes
4. Consider read replicas for heavy queries
5. Implement caching layer if needed

#### External Source Unavailable
1. Sync job retries automatically (3x)
2. Alert sent to admins
3. Manual sync available
4. Local data remains accessible
5. Investigate source issue

---

## 7. Recommendations

### 7.1 Immediate Actions

1. **Run Existing Migration**
   - Verify `1751200000000-CreateDirectoriesV2Tables.ts` executes cleanly
   - Check all indexes and constraints created

2. **Complete directories-v2 Module**
   - Implement services and controllers
   - Add comprehensive DTO validation
   - Integrate with RBAC

3. **Create Seed Templates**
   - Add predefined templates for common directories
   - Include machine_types, products, locations templates

### 7.2 Architecture Decisions

1. **Keep Existing Entities**
   - Do NOT migrate Machine, User, Task entities to directories-v2
   - These have complex operational relationships
   - Use directories-v2 for reference/lookup data only

2. **Hybrid Approach for Reference Entities**
   - Keep Nomenclature, Location, Counterparty as entities
   - Add optional `directory_entry_id` column for extended fields
   - Allows gradual migration without breaking changes

3. **Deprecation Timeline**
   - Phase 1-2: directories-v2 deployed, dictionaries unchanged
   - Phase 3: Add deprecation warnings to dictionaries endpoints
   - Phase 4+: Evaluate removal based on usage metrics

### 7.3 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration completion | 100% dictionaries migrated | Query count comparison |
| Zero downtime | No production incidents | Monitoring alerts |
| API response time | <200ms p95 | APM metrics |
| Test coverage | >80% new code | Jest coverage report |
| User adoption | 50% using new system | API usage analytics |

---

## Appendices

### A. Entity Relationship Summary

```
directories-v2 Schema
├── directories_v2 (1)
│   ├── directory_fields (N)
│   ├── directory_entries (N)
│   │   └── directory_entry_files (N)
│   ├── directory_sources (N)
│   │   └── directory_sync_logs (N)
│   └── Based on: directory_templates (optional)
```

### B. API Endpoint Summary

```
Directories:
  GET    /api/v2/directories
  POST   /api/v2/directories
  GET    /api/v2/directories/:id
  PATCH  /api/v2/directories/:id
  DELETE /api/v2/directories/:id
  GET    /api/v2/directories/code/:code

Fields:
  GET    /api/v2/directories/:id/fields
  POST   /api/v2/directories/:id/fields
  PATCH  /api/v2/directories/:id/fields/:fieldId
  DELETE /api/v2/directories/:id/fields/:fieldId

Entries:
  GET    /api/v2/directories/:id/entries
  POST   /api/v2/directories/:id/entries
  GET    /api/v2/directories/:id/entries/:entryId
  PATCH  /api/v2/directories/:id/entries/:entryId
  DELETE /api/v2/directories/:id/entries/:entryId
  POST   /api/v2/directories/:id/entries/quick
  GET    /api/v2/directories/:id/entries/search

Sources:
  GET    /api/v2/directories/:id/sources
  POST   /api/v2/directories/:id/sources
  POST   /api/v2/directories/:id/sources/:srcId/sync
  GET    /api/v2/directories/:id/sources/:srcId/logs

Templates:
  GET    /api/v2/directory-templates
  POST   /api/v2/directory-templates/:code/create

Lookup (Quick):
  GET    /api/v2/lookup/:directoryCode
  GET    /api/v2/lookup/:directoryCode/search
```

### C. Files Created During Audit

1. `/home/user/VHM24/docs/architecture/DIRECTORIES_SYSTEM.md` - Technical specification
2. `/home/user/VHM24/docs/architecture/DIRECTORIES_FRONTEND_SCREENS.md` - Frontend screens
3. `/home/user/VHM24/backend/src/modules/directories-v2/entities/` - 7 entity files
4. `/home/user/VHM24/backend/src/database/migrations/1751200000000-CreateDirectoriesV2Tables.ts`
5. `/home/user/VHM24/docs/architecture/MDM_INTEGRATION_AUDIT_REPORT.md` - This report

---

*Report Version: 1.0.0*
*Generated: 2025-01-20*
*Author: Claude Code AI Architect*
