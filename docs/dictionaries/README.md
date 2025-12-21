# Dictionaries Module

## Overview

The Dictionaries module provides centralized management of reference data (справочники) for VendHub Manager. It stores configurable key-value pairs for dropdowns, statuses, categories, and other system-wide constants with multilingual support.

## Key Features

- Centralized reference data management
- Multilingual support (Russian/English)
- System and custom dictionaries
- Caching for performance
- Sort ordering
- Active/inactive status

## Entities

### Dictionary

**File**: `backend/src/modules/dictionaries/entities/dictionary.entity.ts`

```typescript
@Entity('dictionaries')
@Index(['code'], { unique: true })
export class Dictionary extends BaseEntity {
  code: string;              // Unique identifier (e.g., 'task_types')
  name_ru: string;           // Russian name
  name_en: string | null;    // English name
  description: string | null; // Description
  is_system: boolean;        // System dictionary (non-deletable)
  is_active: boolean;        // Active status
  sort_order: number;        // Display order
  items: DictionaryItem[];   // Dictionary entries
}
```

### DictionaryItem

**File**: `backend/src/modules/dictionaries/entities/dictionary-item.entity.ts`

```typescript
@Entity('dictionary_items')
@Index(['dictionary_id', 'code'], { unique: true })
export class DictionaryItem extends BaseEntity {
  dictionary_id: string;     // Parent dictionary
  dictionary: Dictionary;
  code: string;              // Item code
  value_ru: string;          // Russian value
  value_en: string | null;   // English value
  description: string | null; // Description
  is_active: boolean;        // Active status
  sort_order: number;        // Display order
  metadata: Record<string, any>; // Additional data
}
```

## Standard System Dictionaries

| Code | Name | Description |
|------|------|-------------|
| `task_types` | Типы задач | Task type options |
| `task_statuses` | Статусы задач | Task status options |
| `machine_statuses` | Статусы автоматов | Machine statuses |
| `incident_types` | Типы инцидентов | Incident categories |
| `complaint_types` | Типы жалоб | Complaint categories |
| `payment_methods` | Способы оплаты | Payment methods |
| `units_of_measure` | Единицы измерения | Units (шт, кг, л) |
| `product_categories` | Категории товаров | Product categories |
| `priority_levels` | Уровни приоритета | Priority levels |
| `user_roles` | Роли пользователей | User roles |

## API Endpoints

### Dictionaries

```
POST   /api/dictionaries           Create dictionary
GET    /api/dictionaries           List dictionaries
GET    /api/dictionaries/:id       Get dictionary by ID
GET    /api/dictionaries/code/:code Get dictionary by code
PUT    /api/dictionaries/:id       Update dictionary
DELETE /api/dictionaries/:id       Delete dictionary
```

### Dictionary Items

```
POST   /api/dictionaries/:id/items     Add item
GET    /api/dictionaries/:id/items     List items
PUT    /api/dictionaries/:id/items/:itemId Update item
DELETE /api/dictionaries/:id/items/:itemId Delete item
```

## DTOs

### CreateDictionaryDto

```typescript
class CreateDictionaryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  code: string;

  @IsString()
  @MinLength(2)
  name_ru: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}
```

### CreateDictionaryItemDto

```typescript
class CreateDictionaryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @IsString()
  @MinLength(1)
  value_ru: string;

  @IsOptional()
  @IsString()
  value_en?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

## Service Methods

### DictionariesService

| Method | Description |
|--------|-------------|
| `create()` | Create new dictionary |
| `findAll()` | List all dictionaries |
| `findOne()` | Get dictionary by ID |
| `findByCode()` | Get dictionary by code |
| `update()` | Update dictionary |
| `remove()` | Delete dictionary (non-system only) |
| `addItem()` | Add item to dictionary |
| `updateItem()` | Update dictionary item |
| `removeItem()` | Remove dictionary item |
| `getItemsByCode()` | Get items by dictionary code |

### DictionaryCacheService

| Method | Description |
|--------|-------------|
| `get()` | Get dictionary from cache |
| `set()` | Cache dictionary |
| `invalidate()` | Invalidate cache |
| `warmUp()` | Pre-load all dictionaries |

## Caching

Dictionaries are cached in Redis for fast access:

```typescript
@Injectable()
export class DictionaryCacheService {
  private readonly CACHE_PREFIX = 'dict:';
  private readonly CACHE_TTL = 3600; // 1 hour

  async get(code: string): Promise<Dictionary | null> {
    const cached = await this.redis.get(`${this.CACHE_PREFIX}${code}`);
    return cached ? JSON.parse(cached) : null;
  }

  async set(dictionary: Dictionary): Promise<void> {
    await this.redis.set(
      `${this.CACHE_PREFIX}${dictionary.code}`,
      JSON.stringify(dictionary),
      'EX',
      this.CACHE_TTL
    );
  }

  async invalidate(code: string): Promise<void> {
    await this.redis.del(`${this.CACHE_PREFIX}${code}`);
  }
}
```

## Usage Examples

### Get Dictionary Items

```typescript
// In a service
const taskTypes = await this.dictionariesService.findByCode('task_types');
const activeItems = taskTypes.items.filter(item => item.is_active);

// Use in dropdown
const options = activeItems.map(item => ({
  value: item.code,
  label: item.value_ru,
}));
```

### Create Custom Dictionary

```typescript
await this.dictionariesService.create({
  code: 'machine_brands',
  name_ru: 'Бренды автоматов',
  name_en: 'Machine Brands',
  is_system: false,
});

await this.dictionariesService.addItem('machine_brands', {
  code: 'necta',
  value_ru: 'Necta',
  value_en: 'Necta',
  metadata: { country: 'Italy' },
});
```

## Frontend Integration

### React Hook

```typescript
function useDictionary(code: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['dictionary', code],
    queryFn: () => api.get(`/dictionaries/code/${code}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getLabel = (itemCode: string, lang = 'ru') => {
    const item = data?.items?.find(i => i.code === itemCode);
    return lang === 'en' ? item?.value_en || item?.value_ru : item?.value_ru;
  };

  return { items: data?.items || [], isLoading, getLabel };
}
```

### Dropdown Component

```tsx
function DictionarySelect({ dictionaryCode, value, onChange }) {
  const { items, isLoading } = useDictionary(dictionaryCode);

  return (
    <Select value={value} onChange={onChange} loading={isLoading}>
      {items.filter(i => i.is_active).map(item => (
        <Option key={item.code} value={item.code}>
          {item.value_ru}
        </Option>
      ))}
    </Select>
  );
}
```

## Best Practices

1. **Use Codes**: Reference items by code, not ID
2. **System Dictionaries**: Don't delete system dictionaries
3. **Caching**: Dictionary data is cached - invalidate on update
4. **Multilingual**: Always provide Russian value, English optional
5. **Ordering**: Use sort_order for consistent display

## Related Modules

- [Tasks](../tasks/README.md) - Uses task_types, task_statuses
- [Machines](../MACHINES.md) - Uses machine_statuses
- [Incidents](../incidents/README.md) - Uses incident_types
- [Nomenclature](../nomenclature/README.md) - Uses product_categories
