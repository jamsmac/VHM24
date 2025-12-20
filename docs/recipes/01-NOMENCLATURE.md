# Nomenclature - Номенклатура

> **Модуль**: `backend/src/modules/nomenclature/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Справочник номенклатуры - единый каталог товаров и ингредиентов. Разделяется на две категории по флагу `is_ingredient`:

- **Товары** (`is_ingredient = false`) - продаваемые позиции (кофе, снэки)
- **Ингредиенты** (`is_ingredient = true`) - компоненты для рецептов (кофе в зёрнах, сахар)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NOMENCLATURE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     PRODUCTS (товары)                          │  │
│  │  ├── SKU: уникальный артикул                                  │  │
│  │  ├── Категория: coffee, snacks, drinks...                     │  │
│  │  ├── Цены: purchase_price, selling_price                      │  │
│  │  └── Используется в: продажи, меню, заказы                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   INGREDIENTS (ингредиенты)                    │  │
│  │  ├── SKU: уникальный артикул                                  │  │
│  │  ├── Категория: beans, dairy, sugar...                        │  │
│  │  ├── Цена: purchase_price (закупочная)                        │  │
│  │  └── Используется в: рецепты, складской учёт                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Nomenclature

```typescript
@Entity('nomenclature')
@Index(['sku'], { unique: true })
@Index(['category_code'])
export class Nomenclature extends BaseEntity {
  // Идентификация
  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;  // Stock Keeping Unit - уникальный артикул

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category_code: string;  // from dictionaries: product_categories

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string;  // from dictionaries: units_of_measure

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Цены (в UZS)
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchase_price: number | null;  // Закупочная цена

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  selling_price: number | null;  // Продажная цена

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  // Физические характеристики
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight: number | null;  // Вес единицы

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode: string | null;

  // Складской учёт
  @Column({ type: 'integer', default: 0 })
  min_stock_level: number;  // Минимум для уведомления

  @Column({ type: 'integer', default: 0 })
  max_stock_level: number;

  @Column({ type: 'integer', nullable: true })
  shelf_life_days: number | null;  // Срок годности

  // Поставщик
  @Column({ type: 'uuid', nullable: true })
  default_supplier_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_sku: string | null;

  // Флаги
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_ingredient: boolean;  // true = ингредиент

  @Column({ type: 'boolean', default: false })
  requires_temperature_control: boolean;

  // Изображения
  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  images: string[] | null;

  // Теги для поиска
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  // Метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
```

---

## Структура SKU

Рекомендуемый формат артикула:

```
{CATEGORY}-{SUBCATEGORY}-{SEQUENCE}

Примеры товаров:
COFFEE-ESP-001     # Эспрессо
COFFEE-CAP-002     # Капучино
SNACK-CHIP-001     # Чипсы
DRINK-COLA-001     # Кола

Примеры ингредиентов:
ING-BEANS-001      # Кофе в зёрнах
ING-MILK-002       # Сухое молоко
ING-SUGAR-001      # Сахар
ING-CHOCO-001      # Шоколадный порошок
```

---

## Категории (category_code)

### Товары

| Код | Описание |
|-----|----------|
| coffee | Кофейные напитки |
| tea | Чаи |
| cold_drinks | Холодные напитки |
| snacks | Снэки |
| sandwiches | Сэндвичи |
| fresh | Свежая еда |

### Ингредиенты

| Код | Описание |
|-----|----------|
| beans | Кофе в зёрнах |
| ground_coffee | Молотый кофе |
| dairy | Молочные продукты |
| sugar | Сахар и подсластители |
| syrups | Сиропы |
| toppings | Топпинги |
| disposables | Расходники (стаканы, крышки) |

---

## Единицы измерения (unit_of_measure_code)

| Код | Описание | Для категорий |
|-----|----------|---------------|
| pcs | Штуки | snacks, sandwiches |
| kg | Килограммы | beans, sugar |
| g | Граммы | рецепты |
| l | Литры | dairy, syrups |
| ml | Миллилитры | рецепты |
| portions | Порции | готовые напитки |

---

## Сервис NomenclatureService

### Основные методы

```typescript
@Injectable()
export class NomenclatureService {
  // Создание позиции
  async create(dto: CreateNomenclatureDto): Promise<Nomenclature>;

  // Получение списка с фильтрацией
  async findAll(
    category?: string,
    isIngredient?: boolean,
    isActive?: boolean,
    search?: string,
  ): Promise<Nomenclature[]>;

  // Получение по ID
  async findOne(id: string): Promise<Nomenclature>;

  // Получение по SKU
  async findBySKU(sku: string): Promise<Nomenclature>;

  // Обновление
  async update(id: string, dto: UpdateNomenclatureDto): Promise<Nomenclature>;

  // Удаление (soft delete)
  async remove(id: string): Promise<void>;

  // Только товары
  async findProducts(category?: string): Promise<Nomenclature[]>;

  // Только ингредиенты
  async findIngredients(category?: string): Promise<Nomenclature[]>;

  // Поиск по штрих-коду
  async findByBarcode(barcode: string): Promise<Nomenclature | null>;

  // Статистика
  async getStats(): Promise<NomenclatureStats>;
}
```

---

## API Endpoints

### Создать позицию

```http
POST /api/nomenclature
Authorization: Bearer <token>

{
  "sku": "COFFEE-CAP-001",
  "name": "Капучино",
  "category_code": "coffee",
  "unit_of_measure_code": "portions",
  "purchase_price": 5000,
  "selling_price": 15000,
  "is_ingredient": false,
  "tags": ["горячие", "молочные"]
}
```

### Получить список

```http
GET /api/nomenclature?category=coffee&isIngredient=false&isActive=true&search=капучино
Authorization: Bearer <token>
```

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| category | string | Код категории |
| isIngredient | boolean | true = ингредиенты |
| isActive | boolean | Только активные |
| search | string | Поиск по name, sku, tags |

### Получить только товары

```http
GET /api/nomenclature/products?category=coffee
Authorization: Bearer <token>
```

### Получить только ингредиенты

```http
GET /api/nomenclature/ingredients?category=beans
Authorization: Bearer <token>
```

### Получить по SKU

```http
GET /api/nomenclature/sku/:sku
Authorization: Bearer <token>
```

### Поиск по штрих-коду

```http
GET /api/nomenclature/barcode/:barcode
Authorization: Bearer <token>
```

### Получить статистику

```http
GET /api/nomenclature/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 150,
  "products": 50,
  "ingredients": 100,
  "active": 140,
  "inactive": 10
}
```

---

## Связи

- **Recipe** - товар может иметь рецепты
- **RecipeIngredient** - ингредиенты используются в рецептах
- **WarehouseInventory** - остатки на складе
- **MachineInventory** - остатки в аппаратах
- **Transactions** - продажи

---

## Права доступа

| Операция | Роли |
|----------|------|
| Просмотр | Все авторизованные |
| Создание | Admin, Manager |
| Редактирование | Admin, Manager |
| Удаление | Admin |

---

## Валидация

- `sku` - уникальный, обязательный
- `name` - обязательный, 2-200 символов
- `category_code` - из справочника dictionaries
- `unit_of_measure_code` - из справочника dictionaries
- `purchase_price` - >= 0 (для ингредиентов)
- `selling_price` - >= 0 (для товаров)

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-NOM-01 | Единый справочник товаров и ингредиентов |
| REQ-NOM-02 | Уникальный SKU |
| REQ-NOM-03 | Категоризация |
| REQ-NOM-10 | Цены в UZS |
| REQ-NOM-11 | Поддержка штрих-кодов |
| REQ-NOM-20 | Складские параметры (min/max stock) |
| REQ-NOM-30 | Поиск и фильтрация |
