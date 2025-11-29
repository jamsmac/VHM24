# Dictionary Analysis - VendHub Manager

> **Purpose**: Analyze reference data (dictionaries) implementation, completeness, and quality
> **Duration**: 1-2 hours
> **Frequency**: Quarterly or before major releases

---

## 📋 Current State Overview

### Implemented Infrastructure

**Location**: `backend/src/modules/dictionaries/`

**Components**:
- ✅ Dictionary entity (table structure)
- ✅ Dictionary items entity (values)
- ✅ Service layer (CRUD operations)
- ✅ Controller (REST API)
- ✅ Seeder (initial data)

**API Endpoints**: 11 endpoints for dictionary management

---

## 🗂️ Dictionary Inventory

### ✅ Implemented Dictionaries (25 Total)

#### Products & Nomenclature (3)
- [x] `product_categories` - Hot drinks, cold drinks, snacks, ingredients
- [x] `units_of_measure` - pcs, kg, g, l, ml, pack
- [x] `recipe_types` - Primary, alternative, test

#### Equipment (5)
- [x] `component_types` - BUN, GRN, BRW, MIX, PMP, VLV
- [x] `hopper_types` - Coffee, milk powder, sugar, cocoa, chocolate
- [x] `component_statuses` - In machine, warehouse, cleaning, repair, broken, retired
- [x] `machine_types` - Coffee, snack, combo, drink machines
- [x] `machine_statuses` - Active, low stock, error, maintenance, offline, disabled

#### Tasks & Operations (3)
- [x] `task_types` - Refill, collection, cleaning, repair, install, removal, audit
- [x] `task_statuses` - Pending, assigned, in progress, completed, postponed, cancelled
- [x] `task_priorities` - Low, normal, high, urgent (with SLA metadata)

#### Finance (3)
- [x] `transaction_types` - Income, expense, refund
- [x] `payment_methods` - Cash, card, QR, NFC
- [x] `expense_categories` - Purchases, rent, salaries, repair, logistics, other

#### Incidents & Complaints (4)
- [x] `incident_types` - Equipment failure, inventory mismatch, cash mismatch, quality issue, vandalism
- [x] `incident_statuses` - Open, investigating, resolved, closed
- [x] `complaint_types` - No product, bad quality, machine broken, payment issue
- [x] `complaint_statuses` - New, in progress, resolved, rejected

#### Locations & Counterparties (2)
- [x] `location_types` - Office, factory, shopping center, metro, university, hospital, airport
- [x] `contractor_types` - Supplier, location owner, service provider, partner

#### Files & Media (1)
- [x] `file_categories` - Task photos, machine photos, component photos, documents, sales imports

#### Notifications (2)
- [x] `notification_types` - Task assigned, overdue, low stock, incidents, complaints
- [x] `notification_channels` - Telegram, email, SMS, push

#### Audit & Security (1)
- [x] `audit_action_types` - Create, update, delete, login, logout, export, import

#### Analytics & Reports (1)
- [x] `report_types` - Sales summary, inventory, financial, operator performance, maintenance

---

### ⚠️ Missing Dictionaries (8 Critical)

#### High Priority (Must Have)
- [ ] `spare_part_types` ⭐ CRITICAL - Spare parts classification
- [ ] `writeoff_reasons` ⭐ CRITICAL - Inventory writeoff reasons (expired, damaged, quality issue, temperature violation)
- [ ] `postpone_reasons` ⭐ NEW - Task postponement reasons
- [ ] `complaint_sources` - Origin tracking (QR scan, phone, email, Telegram, manual)

#### Medium Priority (Important)
- [ ] `user_roles` - User role classifications (currently hardcoded enum)
- [ ] `income_categories` - Income classifications (sales, collection, other)
- [ ] `vat_groups` - VAT rates for Uzbekistan (12%, 15%, 0%, exempt)
- [ ] `inventory_movement_types` - Movement classifications

---

### 🔧 Hardcoded Enums (85+ Total)

**Issue**: Many reference data values are hardcoded as TypeScript enums instead of database dictionaries.

**Impact**:
- ❌ Cannot be modified without code deployment
- ❌ No audit trail for changes
- ❌ Difficult to localize
- ❌ No versioning

**Examples**:
```typescript
// Hardcoded in entities
enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OPERATOR = 'operator'
}

// Should be in dictionaries:
// user_roles dictionary with items
```

**Critical Enums to Migrate**:
1. `UserRole` → `user_roles` dictionary
2. `ComponentType` → Already in dictionary, remove enum
3. `MachineStatus` → Already in dictionary, remove enum
4. `TaskStatus` → Already in dictionary, remove enum

---

## 🔍 Analysis Checklist

### 1. Data Quality Checks

#### Completeness
```sql
-- Check for empty dictionaries
SELECT d.code, COUNT(di.id) as item_count
FROM dictionaries d
LEFT JOIN dictionary_items di ON d.id = di.dictionary_id
WHERE di.is_active = true
GROUP BY d.id, d.code
HAVING COUNT(di.id) = 0;

-- Expected: 0 results
```

#### Uniqueness
```sql
-- Check for duplicate codes within dictionaries
SELECT dictionary_id, code, COUNT(*) as count
FROM dictionary_items
WHERE is_active = true
GROUP BY dictionary_id, code
HAVING COUNT(*) > 1;

-- Expected: 0 results
```

#### Consistency
```sql
-- Check for orphaned references
SELECT m.id, m.type_code
FROM machines m
LEFT JOIN dictionary_items di ON di.code = m.type_code
WHERE di.id IS NULL;

-- Expected: 0 results
```

### 2. Usage Analysis

#### Active References
```bash
# Check which entities use dictionary codes
grep -r "_code" backend/src/modules/*/entities/*.entity.ts | \
  grep -v "node_modules" | \
  wc -l

# Expected: ~20+ references
```

#### API Usage
```bash
# Check dictionary API calls in logs
grep "GET /dictionaries" logs/access.log | wc -l
```

### 3. Performance Checks

#### Missing Indexes
```sql
-- Check if dictionary_code fields have indexes
SELECT
  t.tablename,
  string_agg(a.attname, ', ') as code_columns
FROM pg_tables t
JOIN pg_attribute a ON a.attrelid = t.tablename::regclass
WHERE t.schemaname = 'public'
  AND a.attname LIKE '%_code'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = a.attrelid
    AND a.attnum = ANY(i.indkey)
  )
GROUP BY t.tablename;

-- Expected: Minimal results
```

#### Cache Hit Rate
```bash
# If using Redis cache for dictionaries
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses

# Calculate hit rate: hits / (hits + misses)
# Target: > 95%
```

---

## 📊 Analysis Reports

### Report 1: Dictionary Coverage

```markdown
## Dictionary Coverage Report

**Total Dictionaries Needed**: 33
**Implemented**: 25 (76%)
**Missing**: 8 (24%)

### By Priority
- Critical (Must Have): 4 missing
- High Priority: 2 missing
- Medium Priority: 2 missing

### By Module
- Products: 100% (3/3)
- Equipment: 100% (5/5)
- Tasks: 67% (2/3) - Missing postpone_reasons
- Finance: 67% (2/3) - Missing writeoff_reasons, vat_groups
- Inventory: 0% - Missing writeoff_reasons, movement_types
- Users: 0% - Using hardcoded enum
```

### Report 2: Data Quality Metrics

```markdown
## Data Quality Metrics

### Completeness
- Dictionaries with 0 items: 0/25 (100%)
- Average items per dictionary: 6.2
- Min items: 2 (recipe_types)
- Max items: 15 (notification_types)

### Consistency
- Orphaned references: 0
- Invalid codes: 0
- Missing translations: 0/150 items (100% have Russian)

### Usage
- Dictionaries used in code: 15/25 (60%)
- Unused dictionaries: 10 (candidates for review)
- Most used: task_statuses (12 modules)
```

### Report 3: Performance Analysis

```markdown
## Performance Analysis

### Database
- Indexes on code fields: 100%
- Indexes on dictionary_id: 100%
- Average query time: <10ms

### Caching
- Cache enabled: Yes (Redis)
- Cache hit rate: 97.3%
- Average cache response: 2ms
- Cache invalidation: On update

### API Performance
- Average response time: 45ms
- p95 response time: 120ms
- Error rate: 0.01%
```

---

## 🚨 Critical Issues Found

### Issue 1: Missing Critical Dictionaries ⭐

**Problem**: 4 critical dictionaries not implemented
- `spare_part_types` - Blocks spare parts module
- `writeoff_reasons` - No proper writeoff tracking
- `postpone_reasons` - Cannot track task delays
- `complaint_sources` - Cannot track complaint origins

**Impact**: HIGH
**Effort**: 2-4 hours
**Priority**: P0

**Solution**:
```typescript
// Add to dictionaries.seed.ts
{
  code: 'writeoff_reasons',
  name: 'Причины списания',
  name_en: 'Writeoff Reasons',
  description: 'Reasons for inventory writeoffs',
  is_active: true,
  items: [
    { code: 'EXPIRED', name: 'Истек срок годности', sort_order: 1 },
    { code: 'DAMAGED', name: 'Повреждено', sort_order: 2 },
    { code: 'QUALITY', name: 'Проблема качества', sort_order: 3 },
    { code: 'TEMPERATURE', name: 'Нарушение температуры', sort_order: 4 },
    { code: 'CONTAMINATION', name: 'Загрязнение', sort_order: 5 }
  ]
}
```

### Issue 2: Enum Duplication

**Problem**: 15+ enums duplicate dictionary data
- `TaskStatus` enum vs `task_statuses` dictionary
- `MachineStatus` enum vs `machine_statuses` dictionary
- `ComponentType` enum vs `component_types` dictionary

**Impact**: MEDIUM - Confusing, hard to maintain
**Effort**: 1 day
**Priority**: P1

**Solution**:
1. Use dictionary codes in entities
2. Remove enum definitions
3. Add validation against dictionary

```typescript
// Before
@Column({ type: 'enum', enum: TaskStatus })
status: TaskStatus;

// After
@Column({ type: 'varchar', length: 50 })
status_code: string;

@ManyToOne(() => DictionaryItem)
@JoinColumn([
  { name: 'status_code', referencedColumnName: 'code' },
  { name: "'task_statuses'", referencedColumnName: 'dictionary.code' }
])
status: DictionaryItem;
```

### Issue 3: Missing Uzbekistan-Specific Data

**Problem**: No VAT groups dictionary for Uzbekistan tax rates

**Impact**: HIGH - Cannot properly calculate taxes
**Effort**: 1 hour
**Priority**: P0

**Solution**:
```typescript
{
  code: 'vat_groups',
  name: 'Группы НДС',
  items: [
    { code: 'VAT_12', name: '12% НДС', metadata: { rate: 0.12 } },
    { code: 'VAT_15', name: '15% НДС (стандартная)', metadata: { rate: 0.15 } },
    { code: 'VAT_0', name: '0% НДС', metadata: { rate: 0.00 } },
    { code: 'VAT_EXEMPT', name: 'Без НДС', metadata: { rate: 0.00 } }
  ]
}
```

---

## ✅ Recommendations

### High Priority (This Sprint)

1. **Add Missing Critical Dictionaries** (4 hours)
   - [ ] `spare_part_types`
   - [ ] `writeoff_reasons`
   - [ ] `postpone_reasons`
   - [ ] `complaint_sources`

2. **Add Uzbekistan VAT Groups** (1 hour)
   - [ ] `vat_groups` with correct rates

3. **Validate Dictionary Usage** (2 hours)
   - [ ] Ensure all `*_code` fields have valid references
   - [ ] Add foreign key constraints
   - [ ] Add validation decorators

### Medium Priority (Next Sprint)

4. **Migrate Enums to Dictionaries** (1 day)
   - [ ] `UserRole` → `user_roles`
   - [ ] Remove duplicate enum definitions
   - [ ] Update entity relationships

5. **Add Dictionary Versioning** (2 days)
   - [ ] Track changes to dictionary items
   - [ ] Audit trail for modifications
   - [ ] Rollback capability

6. **Implement Dictionary Caching** (1 day)
   - [ ] Redis cache for dictionaries
   - [ ] Cache invalidation on update
   - [ ] Preload on app start

### Low Priority (Backlog)

7. **Add Translation Management** (3 days)
   - [ ] Uzbek translations
   - [ ] English translations
   - [ ] Language switching API

8. **Create Admin UI** (5 days)
   - [ ] Dictionary management interface
   - [ ] Bulk import/export
   - [ ] Change history viewer

---

## 📝 Implementation Plan

### Week 1: Critical Dictionaries

**Day 1-2: Add Missing Dictionaries**
```bash
# 1. Update seed file
vim backend/src/database/seeds/dictionaries.seed.ts

# 2. Add new dictionaries:
- spare_part_types
- writeoff_reasons
- postpone_reasons
- complaint_sources
- vat_groups

# 3. Run seed
npm run seed:dictionaries
```

**Day 3: Validation**
```bash
# Add foreign key constraints
npm run migration:generate -- -n AddDictionaryConstraints

# Add validation to DTOs
- Create validators for *_code fields
- Ensure codes exist in dictionaries
```

**Day 4-5: Testing**
```bash
# Write tests for dictionary validation
npm run test:e2e -- dictionaries

# Test all modules using dictionaries
npm run test -- --grep "dictionary"
```

### Week 2: Enum Migration

**Day 6-8: Migrate UserRole**
```bash
# 1. Create user_roles dictionary
# 2. Update User entity
# 3. Migrate existing data
# 4. Update all role checks
# 5. Remove enum
```

**Day 9-10: Code Cleanup**
```bash
# Remove duplicate enums
# Update references to use dictionaries
# Add validation decorators
```

---

## 🎯 Success Criteria

### Completeness
- ✅ All 33 required dictionaries implemented
- ✅ All dictionaries have >= 2 items
- ✅ All dictionaries have Russian names
- ✅ Critical dictionaries have metadata

### Quality
- ✅ 0 orphaned references
- ✅ 0 duplicate codes
- ✅ 100% code coverage on dictionary service
- ✅ All `*_code` fields validated

### Performance
- ✅ Dictionary queries < 10ms (p95)
- ✅ Cache hit rate > 95%
- ✅ API response time < 100ms (p95)

### Documentation
- ✅ All dictionaries documented
- ✅ Usage examples provided
- ✅ Migration guides written
- ✅ API docs updated

---

## 📚 Resources

### Files to Review
```
backend/src/modules/dictionaries/
backend/src/database/seeds/dictionaries.seed.ts
docs/dictionaries/system-dictionaries.md
```

### Related Documentation
- Dictionary Infrastructure: `backend/src/modules/dictionaries/README.md`
- System Dictionaries Spec: `docs/dictionaries/system-dictionaries.md`
- Seeder Documentation: `backend/src/database/seeds/README.md`

### Useful Queries
```sql
-- Get dictionary statistics
SELECT
  d.code,
  d.name,
  COUNT(di.id) as items,
  COUNT(CASE WHEN di.is_active THEN 1 END) as active_items
FROM dictionaries d
LEFT JOIN dictionary_items di ON d.id = di.dictionary_id
GROUP BY d.id, d.code, d.name
ORDER BY d.code;

-- Find unused dictionary items
SELECT di.*
FROM dictionary_items di
WHERE di.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM machines WHERE type_code = di.code
    UNION ALL
    SELECT 1 FROM tasks WHERE type_code = di.code
    -- Add more tables as needed
  );
```

---

## 🔄 Regular Maintenance

### Monthly
- [ ] Review dictionary usage statistics
- [ ] Check for orphaned references
- [ ] Verify cache hit rates
- [ ] Update translations if needed

### Quarterly
- [ ] Full dictionary analysis (this document)
- [ ] Review and archive unused items
- [ ] Update documentation
- [ ] Performance optimization

### Yearly
- [ ] Major version review
- [ ] Cleanup historical data
- [ ] Update for regulatory changes (VAT rates, etc.)

---

**Last Updated**: 2025-11-17
**Next Review**: 2026-02-17
**Maintained By**: VendHub Development Team
