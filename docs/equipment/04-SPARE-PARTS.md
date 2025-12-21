# Spare Parts & Hopper Types - Запчасти и Типы Бункеров

> **Модуль**: `backend/src/modules/equipment/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система управления запчастями и справочник типов бункеров для вендинговых аппаратов. Запчасти связаны с компонентами и используются при обслуживании.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPARE PARTS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      SparePart                                 │  │
│  │  ├── Артикул (part_number) - уникальный                       │  │
│  │  ├── Привязка к ComponentType                                 │  │
│  │  ├── Складской учёт (min/max stock)                           │  │
│  │  ├── Цены и поставщики                                        │  │
│  │  └── Местоположение на складе                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      HopperType                                │  │
│  │  ├── Код типа (code) - уникальный                             │  │
│  │  ├── Категория ингредиента                                    │  │
│  │  ├── Требования к хранению                                    │  │
│  │  └── Типичная вместимость                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: SparePart

Справочник запасных частей.

```typescript
@Entity('spare_parts')
@Index(['part_number'], { unique: true })
@Index(['component_type'])
export class SparePart extends BaseEntity {
  // Идентификация
  @Column({ type: 'varchar', length: 100, unique: true })
  part_number: string;  // Артикул: "GR-001", "HP-SEAL-02"

  @Column({ type: 'varchar', length: 200 })
  name: string;  // "Жернова кофемолки 64mm"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ComponentType })
  component_type: ComponentType;  // Для какого типа компонента

  // Совместимость
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null;  // "Rhea", "Necta"

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_compatibility: string | null;  // "Rhea Vendors, Luce"

  // Складской учёт
  @Column({ type: 'integer', default: 0 })
  quantity_in_stock: number;

  @Column({ type: 'integer', default: 0 })
  min_stock_level: number;  // Мин. уровень для заказа

  @Column({ type: 'integer', default: 0 })
  max_stock_level: number;  // Макс. уровень хранения

  @Column({ type: 'varchar', length: 50, default: 'pcs' })
  unit: string;  // шт, компл, л, кг

  // Цены
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unit_price: number;  // Цена за единицу в UZS

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  // Поставщик
  @Column({ type: 'varchar', length: 200, nullable: true })
  supplier_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_part_number: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_contact: string | null;

  @Column({ type: 'integer', nullable: true })
  lead_time_days: number | null;  // Срок поставки

  // Хранение
  @Column({ type: 'varchar', length: 100, nullable: true })
  storage_location: string | null;  // "Склад-1"

  @Column({ type: 'varchar', length: 100, nullable: true })
  shelf_number: string | null;  // "Полка A-12"

  // Статус
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  discontinued_date: Date | null;  // Дата снятия с производства

  // Изображения
  @Column({ type: 'simple-array', nullable: true })
  image_urls: string[] | null;

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Структура артикула (part_number)

Рекомендуемый формат:

```
{COMPONENT_PREFIX}-{CATEGORY}-{SEQUENCE}

Примеры:
GR-BURR-001    # Grinder - Burrs (жернова)
GR-MTR-002     # Grinder - Motor (мотор)
HP-SEAL-001    # Hopper - Seal (уплотнитель)
HP-LID-003     # Hopper - Lid (крышка)
BR-PIST-001    # Brewer - Piston (поршень)
PM-VALVE-002   # Pump - Valve (клапан)
PT-NFC-001     # Payment Terminal - NFC reader
```

### Префиксы по типам компонентов

| Префикс | ComponentType | Описание |
|---------|---------------|----------|
| HP | hopper | Бункеры |
| GR | grinder | Кофемолки |
| BR | brewer | Заварочные узлы |
| MX | mixer | Миксеры |
| CU | cooling_unit | Охлаждение |
| PT | payment_terminal | Платежи |
| DS | dispenser | Дозаторы |
| PM | pump | Насосы |
| WF | water_filter | Фильтры воды |
| CA | coin_acceptor | Монетоприёмники |
| BA | bill_acceptor | Купюроприёмники |
| DP | display | Дисплеи |
| OT | other | Прочее |

---

## Entity: HopperType

Справочник типов бункеров для ингредиентов (REQ-ASSET-BH-01).

```typescript
@Entity('hopper_types')
@Index(['code'], { unique: true })
export class HopperType extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;  // "milk_powder", "sugar", "tea_fruit"

  @Column({ type: 'varchar', length: 200 })
  name: string;  // "Сухое молоко"

  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;  // "Milk Powder"

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Категория
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;  // "beverages", "ingredients"

  // Требования хранения
  @Column({ type: 'boolean', default: false })
  requires_refrigeration: boolean;

  @Column({ type: 'integer', nullable: true })
  shelf_life_days: number | null;

  // Характеристики
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  typical_capacity_kg: number | null;  // 1.5, 2.0

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  unit_of_measure: string;  // kg, g, l, ml

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Стандартные типы бункеров

| code | name | category | requires_refrigeration | typical_capacity_kg |
|------|------|----------|------------------------|---------------------|
| coffee_beans | Кофе в зёрнах | beverages | false | 1.5 |
| coffee_ground | Молотый кофе | beverages | false | 1.0 |
| milk_powder | Сухое молоко | ingredients | false | 1.5 |
| sugar | Сахар | ingredients | false | 2.0 |
| tea_fruit | Чай фруктовый | beverages | false | 0.8 |
| tea_lemon | Чай лимонный | beverages | false | 0.8 |
| hot_chocolate | Горячий шоколад | beverages | false | 1.2 |
| cappuccino_mix | Капучино микс | beverages | false | 1.5 |
| fresh_milk | Свежее молоко | ingredients | true | 5.0 |
| cream | Сливки | ingredients | true | 3.0 |
| decaf_coffee | Кофе без кофеина | beverages | false | 1.0 |
| vanilla_mix | Ванильный микс | ingredients | false | 0.8 |

---

## API Endpoints

### Spare Parts

```http
# Создать запчасть
POST /api/equipment/spare-parts
Authorization: Bearer <token>
{
  "part_number": "GR-BURR-001",
  "name": "Жернова кофемолки 64mm",
  "component_type": "grinder",
  "manufacturer": "Rhea",
  "model_compatibility": "Rhea Vendors, Luce",
  "quantity_in_stock": 5,
  "min_stock_level": 2,
  "max_stock_level": 10,
  "unit": "pcs",
  "unit_price": 150000,
  "supplier_name": "TechParts Tashkent",
  "lead_time_days": 14,
  "storage_location": "Склад-1",
  "shelf_number": "A-12"
}

# Получить список
GET /api/equipment/spare-parts?component_type=grinder&in_stock=true

# Получить по ID
GET /api/equipment/spare-parts/:id

# Обновить
PATCH /api/equipment/spare-parts/:id
{
  "quantity_in_stock": 10,
  "unit_price": 160000
}

# Списать (soft delete)
DELETE /api/equipment/spare-parts/:id

# Поиск по артикулу
GET /api/equipment/spare-parts/by-number/:partNumber
```

### Hopper Types

```http
# Создать тип бункера
POST /api/equipment/hopper-types
{
  "code": "matcha_powder",
  "name": "Порошок матча",
  "name_en": "Matcha Powder",
  "category": "beverages",
  "requires_refrigeration": false,
  "typical_capacity_kg": 0.5
}

# Получить список
GET /api/equipment/hopper-types?category=beverages

# Обновить
PATCH /api/equipment/hopper-types/:id

# Удалить
DELETE /api/equipment/hopper-types/:id
```

---

## Складской учёт

### Проверка минимального запаса

```typescript
@Cron('0 8 * * *') // Каждый день в 8:00
async checkLowStock() {
  const lowStock = await this.sparePartRepository.find({
    where: {
      quantity_in_stock: LessThan(Raw(alias => `${alias}."min_stock_level"`)),
      is_active: true,
    },
  });

  for (const part of lowStock) {
    await this.notificationsService.send({
      type: 'low_stock',
      title: 'Низкий запас запчастей',
      message: `${part.name} (${part.part_number}): осталось ${part.quantity_in_stock} шт, минимум ${part.min_stock_level}`,
      recipients: ['manager', 'admin'],
    });
  }
}
```

### Использование запчастей при обслуживании

```typescript
// При создании записи обслуживания
async createMaintenanceWithParts(dto: CreateMaintenanceDto) {
  const maintenance = await this.maintenanceService.create(dto);

  // Списать запчасти со склада
  if (dto.parts_used) {
    for (const part of dto.parts_used) {
      await this.sparePartsService.decreaseStock(
        part.spare_part_id,
        part.quantity
      );
    }
  }

  return maintenance;
}
```

---

## Интеграция с компонентами

### Рекомендуемые запчасти для компонента

```typescript
async getRecommendedParts(componentId: string): Promise<SparePart[]> {
  const component = await this.componentRepository.findOne({
    where: { id: componentId },
  });

  return this.sparePartRepository.find({
    where: {
      component_type: component.component_type,
      is_active: true,
      quantity_in_stock: MoreThan(0),
    },
  });
}
```

### Связь с поставщиками

```typescript
interface SupplierInfo {
  supplier_name: string;
  supplier_part_number: string;
  supplier_contact: string;
  lead_time_days: number;
}

// Получить запчасти от конкретного поставщика
async getPartsBySupplier(supplierName: string): Promise<SparePart[]> {
  return this.sparePartRepository.find({
    where: { supplier_name: supplierName },
  });
}
```

---

## Отчёты

### Стоимость запасов

```sql
SELECT
  component_type,
  SUM(quantity_in_stock * unit_price) as total_value,
  COUNT(*) as part_count
FROM spare_parts
WHERE is_active = true
GROUP BY component_type
ORDER BY total_value DESC;
```

### Оборачиваемость запчастей

```sql
WITH usage AS (
  SELECT
    (jsonb_array_elements(parts_used)->>'spare_part_id')::uuid as spare_part_id,
    SUM((jsonb_array_elements(parts_used)->>'quantity')::int) as used_qty
  FROM component_maintenance
  WHERE performed_at > NOW() - INTERVAL '90 days'
  GROUP BY 1
)
SELECT
  sp.part_number,
  sp.name,
  sp.quantity_in_stock,
  COALESCE(u.used_qty, 0) as used_last_90_days
FROM spare_parts sp
LEFT JOIN usage u ON sp.id = u.spare_part_id
ORDER BY used_qty DESC NULLS LAST;
```

---

## Права доступа

| Операция | Spare Parts | Hopper Types |
|----------|-------------|--------------|
| Просмотр | Все авторизованные | Все авторизованные |
| Создание | Admin, Manager | Admin, Manager |
| Редактирование | Admin, Manager | Admin, Manager |
| Удаление | Admin | Admin |
| Изменение остатков | Admin, Manager, Technician | - |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-ASSET-BH-01 | Справочник типов бункеров |
| REQ-ASSET-SP-01 | Каталог запасных частей |
| REQ-ASSET-SP-02 | Складской учёт запчастей |
| REQ-ASSET-SP-03 | Уведомления о низком запасе |
| REQ-ASSET-SP-04 | Связь запчастей с обслуживанием |
| REQ-ASSET-SP-05 | Информация о поставщиках |
