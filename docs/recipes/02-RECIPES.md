# Recipes - Рецепты

> **Модуль**: `backend/src/modules/recipes/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Система рецептов определяет состав напитков и блюд. Каждый рецепт связан с товаром из номенклатуры и содержит список ингредиентов с количествами. Поддерживается версионирование через snapshots.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECIPE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        RECIPE                                  │  │
│  │  ├── Связан с Product (Nomenclature)                          │  │
│  │  ├── Тип: primary, alternative, test                          │  │
│  │  ├── Ингредиенты с количествами                               │  │
│  │  └── Автоматический расчёт себестоимости                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RECIPE INGREDIENTS                          │  │
│  │  ├── Ссылка на ингредиент (Nomenclature)                      │  │
│  │  ├── Количество и единица измерения                           │  │
│  │  └── Порядок добавления (sort_order)                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RECIPE SNAPSHOTS                            │  │
│  │  ├── Неизменяемые версии рецепта                              │  │
│  │  ├── Используется для исторических отчётов                    │  │
│  │  └── valid_from / valid_to                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity: Recipe

```typescript
@Entity('recipes')
@Index(['product_id'])
@Index(['product_id', 'type_code'], { unique: true })
export class Recipe extends BaseEntity {
  @Column({ type: 'uuid' })
  product_id: string;  // ID товара из nomenclature

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE' })
  product: Nomenclature;

  @Column({ type: 'varchar', length: 200 })
  name: string;  // Название рецепта

  @Column({ type: 'varchar', length: 50 })
  type_code: string;  // primary, alternative, test

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Параметры приготовления
  @Column({ type: 'integer', nullable: true })
  preparation_time_seconds: number | null;

  @Column({ type: 'integer', nullable: true })
  temperature_celsius: number | null;

  @Column({ type: 'integer', default: 1 })
  serving_size_ml: number;  // Объём порции

  // Себестоимость (кешируется)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cost: number;

  // Дополнительные настройки
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null;

  // Связь с ингредиентами
  @OneToMany(() => RecipeIngredient, (i) => i.recipe, { cascade: true })
  ingredients: RecipeIngredient[];
}
```

---

## Entity: RecipeIngredient

```typescript
@Entity('recipe_ingredients')
@Index(['recipe_id'])
@Index(['ingredient_id'])
export class RecipeIngredient extends BaseEntity {
  @Column({ type: 'uuid' })
  recipe_id: string;

  @ManyToOne(() => Recipe, (r) => r.ingredients, { onDelete: 'CASCADE' })
  recipe: Recipe;

  @Column({ type: 'uuid' })
  ingredient_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  ingredient: Nomenclature;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;  // Количество

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string;  // g, ml, pcs

  @Column({ type: 'integer', default: 1 })
  sort_order: number;  // Порядок добавления
}
```

---

## Entity: RecipeSnapshot

Неизменяемые версии рецепта для исторических данных.

```typescript
@Entity('recipe_snapshots')
@Index(['recipe_id', 'version'])
@Index(['valid_from'])
@Index(['valid_to'])
export class RecipeSnapshot extends BaseEntity {
  @Column({ type: 'uuid' })
  recipe_id: string;

  @Column({ type: 'integer' })
  version: number;  // Номер версии

  @Column({ type: 'jsonb' })
  snapshot: {
    name: string;
    description: string | null;
    category_code: string;
    base_cost: number;
    base_price: number;
    items: Array<{
      nomenclature_id: string;
      nomenclature_name: string;
      quantity: number;
      unit_of_measure_code: string;
    }>;
    metadata: Record<string, any> | null;
  };

  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date | null;  // null = текущая версия

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @Column({ type: 'text', nullable: true })
  change_reason: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;
}
```

---

## Типы рецептов (type_code)

| Код | Описание | Использование |
|-----|----------|---------------|
| primary | Основной рецепт | По умолчанию для продаж |
| alternative | Альтернативный | Для вариаций |
| test | Тестовый | Для экспериментов |

Ограничение: один продукт может иметь только один рецепт каждого типа.

---

## Расчёт себестоимости

Себестоимость рассчитывается автоматически с учётом единиц измерения:

```typescript
async recalculateCost(recipeId: string): Promise<number> {
  const recipe = await this.findOne(recipeId);
  let totalCost = 0;

  for (const recipeIngredient of recipe.ingredients) {
    const ingredient = recipeIngredient.ingredient;

    if (ingredient.purchase_price && recipeIngredient.quantity) {
      // Конвертация единиц: kg→g, l→ml
      const cost = this.unitConversionService.calculateCost(
        Number(ingredient.purchase_price),    // Цена (напр. 500,000 UZS/kg)
        ingredient.unit_of_measure_code,      // Единица цены (kg)
        Number(recipeIngredient.quantity),    // Количество в рецепте (15)
        recipeIngredient.unit_of_measure_code // Единица рецепта (g)
      );
      // Результат: 500,000 * 0.015 = 7,500 UZS

      totalCost += cost;
    }
  }

  return Math.round(totalCost * 100) / 100;
}
```

### Пример расчёта

Рецепт "Капучино":
| Ингредиент | Цена закупки | Количество | Стоимость |
|------------|--------------|------------|-----------|
| Кофе зёрна | 500,000 UZS/kg | 15g | 7,500 UZS |
| Молоко сухое | 200,000 UZS/kg | 30g | 6,000 UZS |
| Сахар | 50,000 UZS/kg | 10g | 500 UZS |
| **Итого** | | | **14,000 UZS** |

---

## Сервис RecipesService

### Основные методы

```typescript
@Injectable()
export class RecipesService {
  // Создание рецепта
  async create(dto: CreateRecipeDto): Promise<Recipe>;

  // Получение списка
  async findAll(
    productId?: string,
    typeCode?: string,
    isActive?: boolean,
  ): Promise<Recipe[]>;

  // Получение по ID
  async findOne(id: string): Promise<Recipe>;

  // Обновление
  async update(id: string, dto: UpdateRecipeDto): Promise<Recipe>;

  // Удаление (soft delete)
  async remove(id: string): Promise<void>;

  // Пересчёт себестоимости
  async recalculateCost(recipeId: string): Promise<number>;

  // Рецепты продукта
  async findByProduct(productId: string): Promise<Recipe[]>;

  // PRIMARY рецепт продукта
  async findPrimaryRecipe(productId: string): Promise<Recipe | null>;

  // Статистика
  async getStats(): Promise<RecipeStats>;
}
```

---

## API Endpoints

### Создать рецепт

```http
POST /api/recipes
Authorization: Bearer <token>

{
  "product_id": "uuid-товара",
  "name": "Капучино классический",
  "type_code": "primary",
  "description": "Классический итальянский капучино",
  "preparation_time_seconds": 45,
  "temperature_celsius": 85,
  "serving_size_ml": 200,
  "ingredients": [
    {
      "ingredient_id": "uuid-кофе",
      "quantity": 15,
      "unit_of_measure_code": "g",
      "sort_order": 1
    },
    {
      "ingredient_id": "uuid-молоко",
      "quantity": 150,
      "unit_of_measure_code": "ml",
      "sort_order": 2
    }
  ]
}
```

### Получить список

```http
GET /api/recipes?productId=uuid&typeCode=primary&isActive=true
Authorization: Bearer <token>
```

### Получить рецепт

```http
GET /api/recipes/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Капучино классический",
  "type_code": "primary",
  "total_cost": 14000,
  "serving_size_ml": 200,
  "product": {
    "id": "uuid",
    "sku": "COFFEE-CAP-001",
    "name": "Капучино",
    "selling_price": 25000
  },
  "ingredients": [
    {
      "ingredient": {
        "id": "uuid",
        "sku": "ING-BEANS-001",
        "name": "Кофе Арабика",
        "purchase_price": 500000,
        "unit_of_measure_code": "kg"
      },
      "quantity": 15,
      "unit_of_measure_code": "g",
      "sort_order": 1
    }
  ]
}
```

### Обновить рецепт

```http
PATCH /api/recipes/:id
Authorization: Bearer <token>

{
  "ingredients": [
    {
      "ingredient_id": "uuid",
      "quantity": 18,
      "unit_of_measure_code": "g",
      "sort_order": 1
    }
  ]
}
```

При обновлении ингредиентов автоматически:
- Удаляются старые ингредиенты
- Создаются новые
- Пересчитывается себестоимость

### PRIMARY рецепт продукта

```http
GET /api/recipes/product/:productId/primary
Authorization: Bearer <token>
```

### Статистика

```http
GET /api/recipes/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 50,
  "active": 45,
  "inactive": 5,
  "average_cost": 12500
}
```

---

## Версионирование (Snapshots)

При изменении рецепта создаётся snapshot предыдущей версии:

```typescript
// Пример использования в отчётах
async getRecipeAtDate(recipeId: string, date: Date): Promise<RecipeSnapshot> {
  return this.snapshotRepository.findOne({
    where: {
      recipe_id: recipeId,
      valid_from: LessThanOrEqual(date),
      valid_to: IsNull() || MoreThan(date),
    },
  });
}
```

### Зачем нужны snapshots?

- Исторические отчёты показывают актуальный на момент продажи состав
- Можно отследить изменения себестоимости во времени
- Аудит изменений рецептов

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

- `product_id` - должен существовать в nomenclature
- `type_code` - primary, alternative, test
- `ingredients` - минимум 1 ингредиент
- Каждый `ingredient_id` должен существовать и иметь `is_ingredient = true`
- Уникальность: один product_id + type_code

---

## Связи

- **Nomenclature (product)** - товар, к которому относится рецепт
- **Nomenclature (ingredients)** - ингредиенты рецепта
- **RecipeSnapshot** - версии рецепта
- **Transactions** - продажи используют рецепт для списания ингредиентов

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-RCP-01 | Рецепты с ингредиентами |
| REQ-RCP-02 | Типы: primary, alternative, test |
| REQ-RCP-03 | Автоматический расчёт себестоимости |
| REQ-RCP-04 | Конвертация единиц измерения |
| REQ-RCP-10 | Версионирование (snapshots) |
| REQ-RCP-11 | Параметры приготовления |
| REQ-RCP-20 | Связь с товарами |
