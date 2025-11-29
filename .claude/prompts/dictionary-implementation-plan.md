# Dictionary Implementation Plan

> **Purpose**: Step-by-step plan to implement missing dictionaries
> **Priority**: P0 (Critical for system completeness)
> **Estimated Time**: 2-3 days
> **Due Date**: End of current sprint

---

## 🎯 Objectives

1. **Add 8 missing critical dictionaries** to system
2. **Ensure Uzbekistan compliance** (VAT groups, fiscal codes)
3. **Improve data quality** with proper validation
4. **Optimize performance** with caching and indexes
5. **Document dictionary usage** for team

---

## 📋 Missing Dictionaries Checklist

### Priority P0 - Critical (Must Have)

- [ ] **spare_part_types** - Equipment spare parts classification
  - **Blocks**: Spare parts module
  - **Impact**: Cannot track spare parts inventory
  - **Effort**: 30 min

- [ ] **writeoff_reasons** - Inventory writeoff tracking
  - **Blocks**: Proper financial reporting
  - **Impact**: No audit trail for losses
  - **Effort**: 30 min

- [ ] **postpone_reasons** - Task delay tracking
  - **Blocks**: Task analytics
  - **Impact**: Cannot analyze delays
  - **Effort**: 20 min

- [ ] **complaint_sources** - Complaint origin tracking
  - **Blocks**: Multi-channel complaint management
  - **Impact**: Cannot track QR vs manual complaints
  - **Effort**: 20 min

### Priority P1 - High (Important)

- [ ] **vat_groups** - Uzbekistan VAT rates
  - **Blocks**: Tax calculations
  - **Impact**: Incorrect tax reporting
  - **Effort**: 30 min

- [ ] **user_roles** - User role classification
  - **Blocks**: Flexible role management
  - **Impact**: Roles are hardcoded
  - **Effort**: 1 hour (+ migration)

### Priority P2 - Medium (Nice to Have)

- [ ] **income_categories** - Income classification
  - **Blocks**: Financial reporting granularity
  - **Impact**: Limited income analysis
  - **Effort**: 20 min

- [ ] **inventory_movement_types** - Movement classification
  - **Blocks**: Advanced inventory analytics
  - **Impact**: Limited movement tracking
  - **Effort**: 20 min

---

## 📅 Implementation Timeline

### Day 1: Critical Dictionaries (4 hours)

#### Morning (2 hours)
- [ ] **09:00-09:30** - Add `spare_part_types` dictionary
- [ ] **09:30-10:00** - Add `writeoff_reasons` dictionary
- [ ] **10:00-10:20** - Add `postpone_reasons` dictionary
- [ ] **10:20-10:40** - Add `complaint_sources` dictionary
- [ ] **10:40-11:00** - Test seeder with new dictionaries

#### Afternoon (2 hours)
- [ ] **14:00-14:30** - Add `vat_groups` dictionary (Uzbekistan)
- [ ] **14:30-15:00** - Add foreign key constraints
- [ ] **15:00-15:30** - Add validation to DTOs
- [ ] **15:30-16:00** - Write unit tests

### Day 2: Enum Migration & Optimization (6 hours)

#### Morning (3 hours)
- [ ] **09:00-10:00** - Create `user_roles` dictionary
- [ ] **10:00-11:00** - Migrate User entity to use dictionary
- [ ] **11:00-12:00** - Update all role checks in codebase

#### Afternoon (3 hours)
- [ ] **14:00-15:00** - Add dictionary caching (Redis)
- [ ] **15:00-16:00** - Optimize queries with indexes
- [ ] **16:00-17:00** - Performance testing

### Day 3: Documentation & Cleanup (4 hours)

#### Morning (2 hours)
- [ ] **09:00-10:00** - Add `income_categories` dictionary
- [ ] **10:00-11:00** - Add `inventory_movement_types` dictionary

#### Afternoon (2 hours)
- [ ] **14:00-15:00** - Write API documentation
- [ ] **15:00-15:30** - Update README with new dictionaries
- [ ] **15:30-16:00** - Final testing and code review

---

## 💻 Implementation Details

### Step 1: Update Seeder File

**File**: `backend/src/database/seeds/dictionaries.seed.ts`

**Add to `dictionariesData` array:**

```typescript
// SPARE PART TYPES
{
  code: 'spare_part_types',
  name: 'Типы запчастей',
  name_en: 'Spare Part Types',
  description: 'Classification of equipment spare parts',
  is_active: true,
  sort_order: 26,
  items: [
    { code: 'MECHANICAL', name: 'Механические детали', name_en: 'Mechanical Parts', sort_order: 1, is_active: true },
    { code: 'ELECTRICAL', name: 'Электрические компоненты', name_en: 'Electrical Components', sort_order: 2, is_active: true },
    { code: 'ELECTRONIC', name: 'Электронные компоненты', name_en: 'Electronic Components', sort_order: 3, is_active: true },
    { code: 'PNEUMATIC', name: 'Пневматические компоненты', name_en: 'Pneumatic Components', sort_order: 4, is_active: true },
    { code: 'HYDRAULIC', name: 'Гидравлические компоненты', name_en: 'Hydraulic Components', sort_order: 5, is_active: true },
    { code: 'FILTER', name: 'Фильтры', name_en: 'Filters', sort_order: 6, is_active: true },
    { code: 'SEAL', name: 'Уплотнители', name_en: 'Seals', sort_order: 7, is_active: true },
    { code: 'SENSOR', name: 'Датчики', name_en: 'Sensors', sort_order: 8, is_active: true },
    { code: 'MOTOR', name: 'Моторы', name_en: 'Motors', sort_order: 9, is_active: true },
    { code: 'PUMP', name: 'Насосы', name_en: 'Pumps', sort_order: 10, is_active: true },
  ],
},

// WRITEOFF REASONS
{
  code: 'writeoff_reasons',
  name: 'Причины списания',
  name_en: 'Writeoff Reasons',
  description: 'Reasons for inventory and equipment writeoffs',
  is_active: true,
  sort_order: 27,
  items: [
    {
      code: 'EXPIRED',
      name: 'Истек срок годности',
      name_en: 'Expired',
      metadata: { tax_deductible: true, requires_photo: true },
      sort_order: 1,
      is_active: true
    },
    {
      code: 'DAMAGED',
      name: 'Повреждено',
      name_en: 'Damaged',
      metadata: { tax_deductible: true, requires_photo: true },
      sort_order: 2,
      is_active: true
    },
    {
      code: 'QUALITY_ISSUE',
      name: 'Проблема качества',
      name_en: 'Quality Issue',
      metadata: { tax_deductible: false, requires_photo: true },
      sort_order: 3,
      is_active: true
    },
    {
      code: 'TEMPERATURE_VIOLATION',
      name: 'Нарушение температурного режима',
      name_en: 'Temperature Violation',
      metadata: { tax_deductible: true, requires_photo: true },
      sort_order: 4,
      is_active: true
    },
    {
      code: 'CONTAMINATION',
      name: 'Загрязнение',
      name_en: 'Contamination',
      metadata: { tax_deductible: true, requires_photo: true },
      sort_order: 5,
      is_active: true
    },
    {
      code: 'OBSOLETE',
      name: 'Устарело',
      name_en: 'Obsolete',
      metadata: { tax_deductible: false, requires_photo: false },
      sort_order: 6,
      is_active: true
    },
    {
      code: 'BEYOND_REPAIR',
      name: 'Не подлежит ремонту',
      name_en: 'Beyond Repair',
      metadata: { tax_deductible: true, requires_photo: true },
      sort_order: 7,
      is_active: true
    },
    {
      code: 'THEFT',
      name: 'Кража/утеря',
      name_en: 'Theft/Loss',
      metadata: { tax_deductible: true, requires_photo: false, requires_police_report: true },
      sort_order: 8,
      is_active: true
    },
  ],
},

// POSTPONE REASONS
{
  code: 'postpone_reasons',
  name: 'Причины переноса',
  name_en: 'Postpone Reasons',
  description: 'Reasons for postponing tasks',
  is_active: true,
  sort_order: 28,
  items: [
    { code: 'LOCATION_CLOSED', name: 'Локация закрыта', name_en: 'Location Closed', sort_order: 1, is_active: true },
    { code: 'NO_ACCESS', name: 'Нет доступа', name_en: 'No Access', sort_order: 2, is_active: true },
    { code: 'EQUIPMENT_UNAVAILABLE', name: 'Оборудование недоступно', name_en: 'Equipment Unavailable', sort_order: 3, is_active: true },
    { code: 'WEATHER', name: 'Погодные условия', name_en: 'Weather Conditions', sort_order: 4, is_active: true },
    { code: 'PARTS_MISSING', name: 'Нет запчастей', name_en: 'Parts Missing', sort_order: 5, is_active: true },
    { code: 'OPERATOR_SICK', name: 'Оператор болен', name_en: 'Operator Sick', sort_order: 6, is_active: true },
    { code: 'PRIORITY_CHANGED', name: 'Изменен приоритет', name_en: 'Priority Changed', sort_order: 7, is_active: true },
    { code: 'OTHER', name: 'Другое', name_en: 'Other', sort_order: 8, is_active: true },
  ],
},

// COMPLAINT SOURCES
{
  code: 'complaint_sources',
  name: 'Источники жалоб',
  name_en: 'Complaint Sources',
  description: 'Origin channels for complaints',
  is_active: true,
  sort_order: 29,
  items: [
    { code: 'QR_SCAN', name: 'QR-код на аппарате', name_en: 'QR Code Scan', sort_order: 1, is_active: true },
    { code: 'PHONE', name: 'Телефонный звонок', name_en: 'Phone Call', sort_order: 2, is_active: true },
    { code: 'EMAIL', name: 'Email', name_en: 'Email', sort_order: 3, is_active: true },
    { code: 'TELEGRAM', name: 'Telegram бот', name_en: 'Telegram Bot', sort_order: 4, is_active: true },
    { code: 'MANUAL', name: 'Ручной ввод', name_en: 'Manual Entry', sort_order: 5, is_active: true },
    { code: 'MOBILE_APP', name: 'Мобильное приложение', name_en: 'Mobile App', sort_order: 6, is_active: true },
    { code: 'SOCIAL_MEDIA', name: 'Социальные сети', name_en: 'Social Media', sort_order: 7, is_active: true },
  ],
},

// VAT GROUPS (Uzbekistan-specific)
{
  code: 'vat_groups',
  name: 'Группы НДС',
  name_en: 'VAT Groups',
  description: 'VAT rates for Uzbekistan tax system',
  is_active: true,
  sort_order: 30,
  items: [
    {
      code: 'VAT_12',
      name: '12% НДС',
      name_en: '12% VAT',
      metadata: { rate: 0.12, applies_to: ['basic goods', 'services'] },
      sort_order: 1,
      is_active: true
    },
    {
      code: 'VAT_15',
      name: '15% НДС (стандартная ставка)',
      name_en: '15% VAT (Standard Rate)',
      metadata: { rate: 0.15, applies_to: ['most goods', 'premium services'], is_default: true },
      sort_order: 2,
      is_active: true
    },
    {
      code: 'VAT_0',
      name: '0% НДС',
      name_en: '0% VAT',
      metadata: { rate: 0.00, applies_to: ['exports', 'specific goods'] },
      sort_order: 3,
      is_active: true
    },
    {
      code: 'VAT_EXEMPT',
      name: 'Без НДС',
      name_en: 'VAT Exempt',
      metadata: { rate: 0.00, applies_to: ['medical', 'educational', 'social services'] },
      sort_order: 4,
      is_active: true
    },
  ],
},

// USER ROLES (migrate from enum)
{
  code: 'user_roles',
  name: 'Роли пользователей',
  name_en: 'User Roles',
  description: 'System user roles and permissions',
  is_active: true,
  sort_order: 31,
  items: [
    {
      code: 'SUPER_ADMIN',
      name: 'Суперадминистратор',
      name_en: 'Super Administrator',
      metadata: { level: 1, can_manage_users: true, can_manage_system: true },
      sort_order: 1,
      is_active: true
    },
    {
      code: 'ADMIN',
      name: 'Администратор',
      name_en: 'Administrator',
      metadata: { level: 2, can_manage_users: true, can_view_all: true },
      sort_order: 2,
      is_active: true
    },
    {
      code: 'MANAGER',
      name: 'Менеджер',
      name_en: 'Manager',
      metadata: { level: 3, can_assign_tasks: true, can_view_reports: true },
      sort_order: 3,
      is_active: true
    },
    {
      code: 'OPERATOR',
      name: 'Оператор',
      name_en: 'Operator',
      metadata: { level: 4, can_refill: true, can_collect: true },
      sort_order: 4,
      is_active: true
    },
    {
      code: 'COLLECTOR',
      name: 'Инкассатор',
      name_en: 'Collector',
      metadata: { level: 4, can_collect: true },
      sort_order: 5,
      is_active: true
    },
    {
      code: 'TECHNICIAN',
      name: 'Техник',
      name_en: 'Technician',
      metadata: { level: 4, can_repair: true, can_maintain: true },
      sort_order: 6,
      is_active: true
    },
    {
      code: 'VIEWER',
      name: 'Наблюдатель',
      name_en: 'Viewer',
      metadata: { level: 5, readonly: true },
      sort_order: 7,
      is_active: true
    },
  ],
},

// INCOME CATEGORIES
{
  code: 'income_categories',
  name: 'Категории доходов',
  name_en: 'Income Categories',
  description: 'Classification of income sources',
  is_active: true,
  sort_order: 32,
  items: [
    { code: 'SALES', name: 'Продажи', name_en: 'Sales', sort_order: 1, is_active: true },
    { code: 'COLLECTION', name: 'Инкассация', name_en: 'Collection', sort_order: 2, is_active: true },
    { code: 'REFUND_REVERSAL', name: 'Возврат возврата', name_en: 'Refund Reversal', sort_order: 3, is_active: true },
    { code: 'INTEREST', name: 'Проценты', name_en: 'Interest', sort_order: 4, is_active: true },
    { code: 'OTHER', name: 'Прочее', name_en: 'Other', sort_order: 5, is_active: true },
  ],
},

// INVENTORY MOVEMENT TYPES
{
  code: 'inventory_movement_types',
  name: 'Типы движения запасов',
  name_en: 'Inventory Movement Types',
  description: 'Types of inventory movements',
  is_active: true,
  sort_order: 33,
  items: [
    { code: 'REFILL', name: 'Пополнение', name_en: 'Refill', sort_order: 1, is_active: true },
    { code: 'WRITEOFF', name: 'Списание', name_en: 'Writeoff', sort_order: 2, is_active: true },
    { code: 'TRANSFER', name: 'Перемещение', name_en: 'Transfer', sort_order: 3, is_active: true },
    { code: 'ADJUSTMENT', name: 'Корректировка', name_en: 'Adjustment', sort_order: 4, is_active: true },
    { code: 'RETURN', name: 'Возврат', name_en: 'Return', sort_order: 5, is_active: true },
    { code: 'RESERVE', name: 'Резервирование', name_en: 'Reservation', sort_order: 6, is_active: true },
    { code: 'UNRESERVE', name: 'Снятие резерва', name_en: 'Unreservation', sort_order: 7, is_active: true },
  ],
},
```

### Step 2: Run Seeder

```bash
cd backend

# Dry run to check syntax
npm run seed:dictionaries -- --dry-run

# Apply changes
npm run seed:dictionaries

# Verify
psql -d vendhub -c "SELECT code, name FROM dictionaries ORDER BY sort_order;"
```

### Step 3: Add Validation

**Create validator**: `backend/src/common/validators/dictionary-code.validator.ts`

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictionaryItem } from '@modules/dictionaries/entities/dictionary-item.entity';

@ValidatorConstraint({ name: 'IsDictionaryCode', async: true })
@Injectable()
export class IsDictionaryCodeConstraint implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(DictionaryItem)
    private readonly dictionaryItemRepository: Repository<DictionaryItem>,
  ) {}

  async validate(code: string, args: ValidationArguments): Promise<boolean> {
    if (!code) return true; // Let @IsOptional handle empty values

    const dictionaryCode = args.constraints[0];
    const item = await this.dictionaryItemRepository
      .createQueryBuilder('di')
      .innerJoin('di.dictionary', 'd')
      .where('d.code = :dictionaryCode', { dictionaryCode })
      .andWhere('di.code = :code', { code })
      .andWhere('di.is_active = :isActive', { isActive: true })
      .getOne();

    return !!item;
  }

  defaultMessage(args: ValidationArguments): string {
    const dictionaryCode = args.constraints[0];
    return `${args.property} must be a valid code from ${dictionaryCode} dictionary`;
  }
}

export function IsDictionaryCode(
  dictionaryCode: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [dictionaryCode],
      validator: IsDictionaryCodeConstraint,
    });
  };
}
```

**Usage in DTOs**:

```typescript
// Example: CreateInventoryWriteoffDto
import { IsDictionaryCode } from '@/common/validators/dictionary-code.validator';

export class CreateInventoryWriteoffDto {
  @ApiProperty({ example: 'EXPIRED' })
  @IsString()
  @IsDictionaryCode('writeoff_reasons', {
    message: 'Invalid writeoff reason code',
  })
  reason_code: string;

  // ... other fields
}
```

### Step 4: Add Caching

**Update DictionariesService**: `backend/src/modules/dictionaries/dictionaries.service.ts`

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DictionariesService {
  constructor(
    @InjectRepository(Dictionary)
    private readonly dictionaryRepository: Repository<Dictionary>,
    @InjectRepository(DictionaryItem)
    private readonly dictionaryItemRepository: Repository<DictionaryItem>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async findByCode(code: string): Promise<Dictionary> {
    // Try cache first
    const cacheKey = `dictionary:${code}`;
    const cached = await this.cacheManager.get<Dictionary>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from DB
    const dictionary = await this.dictionaryRepository.findOne({
      where: { code, is_active: true },
      relations: ['items'],
    });

    if (!dictionary) {
      throw new NotFoundException(`Dictionary ${code} not found`);
    }

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, dictionary, 3600);

    return dictionary;
  }

  async update(id: string, updateDictionaryDto: UpdateDictionaryDto): Promise<Dictionary> {
    const dictionary = await this.findOne(id);

    // Update
    Object.assign(dictionary, updateDictionaryDto);
    const updated = await this.dictionaryRepository.save(dictionary);

    // Invalidate cache
    await this.cacheManager.del(`dictionary:${updated.code}`);

    return updated;
  }
}
```

### Step 5: Write Tests

**File**: `backend/src/modules/dictionaries/dictionaries.service.spec.ts`

```typescript
describe('DictionariesService - New Dictionaries', () => {
  it('should find spare_part_types dictionary', async () => {
    const dict = await service.findByCode('spare_part_types');
    expect(dict).toBeDefined();
    expect(dict.items.length).toBeGreaterThan(0);
  });

  it('should find writeoff_reasons dictionary', async () => {
    const dict = await service.findByCode('writeoff_reasons');
    expect(dict).toBeDefined();
    expect(dict.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'EXPIRED' }),
        expect.objectContaining({ code: 'DAMAGED' }),
      ]),
    );
  });

  it('should validate VAT rates in vat_groups', async () => {
    const dict = await service.findByCode('vat_groups');
    const vat15 = dict.items.find((item) => item.code === 'VAT_15');

    expect(vat15).toBeDefined();
    expect(vat15.metadata.rate).toBe(0.15);
    expect(vat15.metadata.is_default).toBe(true);
  });
});
```

---

## ✅ Acceptance Criteria

### Functionality
- [ ] All 8 dictionaries added to seeder
- [ ] Seeder runs without errors
- [ ] All dictionaries have at least 2 active items
- [ ] Dictionary codes follow naming convention
- [ ] Metadata fields populated where needed

### Validation
- [ ] `IsDictionaryCode` validator works
- [ ] Invalid codes rejected with clear error
- [ ] Optional codes handled correctly

### Performance
- [ ] Dictionary queries cached (Redis)
- [ ] Cache hit rate > 95%
- [ ] Dictionary API response < 50ms (p95)

### Testing
- [ ] Unit tests for new dictionaries
- [ ] Integration tests for validation
- [ ] E2E tests for dictionary API

### Documentation
- [ ] README updated with new dictionaries
- [ ] API docs updated (Swagger)
- [ ] Usage examples added
- [ ] Migration guide written

---

## 🚨 Potential Issues

### Issue 1: Seeder Conflicts
**Problem**: Duplicate dictionary codes
**Solution**: Check for existing dictionaries before seeding
```typescript
const existing = await dictionaryRepository.findOne({ where: { code } });
if (existing) {
  console.log(`Dictionary ${code} already exists, skipping...`);
  return;
}
```

### Issue 2: Foreign Key Violations
**Problem**: Existing data references invalid codes
**Solution**: Migrate data before adding constraints
```sql
-- Find invalid references
SELECT id, writeoff_reason_code
FROM inventory_writeoffs
WHERE writeoff_reason_code NOT IN (
  SELECT code FROM dictionary_items WHERE dictionary_id = (
    SELECT id FROM dictionaries WHERE code = 'writeoff_reasons'
  )
);

-- Update to default
UPDATE inventory_writeoffs
SET writeoff_reason_code = 'OTHER'
WHERE writeoff_reason_code IS NULL OR writeoff_reason_code NOT IN (...);
```

### Issue 3: Cache Invalidation
**Problem**: Stale data in cache after updates
**Solution**: Invalidate cache on all mutations
```typescript
// Invalidate on update
await this.cacheManager.del(`dictionary:${code}`);

// Invalidate on item update
await this.cacheManager.del(`dictionary:${item.dictionary.code}`);
```

---

## 📊 Progress Tracking

Create GitHub issue:

```markdown
Title: Implement 8 Missing Dictionaries + VAT Groups

## Checklist

### Day 1: Critical Dictionaries
- [ ] Add spare_part_types
- [ ] Add writeoff_reasons
- [ ] Add postpone_reasons
- [ ] Add complaint_sources
- [ ] Add vat_groups (Uzbekistan)
- [ ] Run seeder
- [ ] Verify data

### Day 2: Validation & Optimization
- [ ] Create IsDictionaryCode validator
- [ ] Add validation to DTOs
- [ ] Implement caching
- [ ] Add indexes
- [ ] Write tests

### Day 3: Documentation & Review
- [ ] Add income_categories
- [ ] Add inventory_movement_types
- [ ] Update documentation
- [ ] Code review
- [ ] Deploy to staging

## Metrics
- Dictionaries implemented: 0/8
- Tests passing: 0/15
- Cache hit rate: N/A
- API response time: N/A
```

---

## 📞 Support

### Questions?
- Check `docs/dictionaries/system-dictionaries.md` for specifications
- Review `backend/src/modules/dictionaries/` for implementation patterns
- Consult `.claude/rules.md` for coding conventions

### Issues?
- Check seeder logs: `logs/seed.log`
- Verify database: `psql -d vendhub -c "SELECT * FROM dictionaries"`
- Test API: `curl http://localhost:3000/dictionaries`

---

**Created**: 2025-11-17
**Owner**: VendHub Development Team
**Status**: Ready to implement
