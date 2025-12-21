# Recipes & Nomenclature Documentation

> **Модули**: `backend/src/modules/nomenclature/`, `backend/src/modules/recipes/`
> **Версия**: 1.0.0
> **Последнее обновление**: 2025-12-20

---

## Обзор

Два связанных модуля для управления товарами и рецептами:

- **Nomenclature** - Справочник товаров и ингредиентов
- **Recipes** - Рецепты напитков с расчётом себестоимости

```
┌─────────────────────────────────────────────────────────────────────┐
│               NOMENCLATURE & RECIPES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      NOMENCLATURE                              │  │
│  │                                                                │  │
│  │  ┌─────────────┐          ┌─────────────┐                     │  │
│  │  │  PRODUCTS   │          │ INGREDIENTS │                     │  │
│  │  │  (товары)   │          │(ингредиенты)│                     │  │
│  │  │             │          │             │                     │  │
│  │  │ SKU, Name   │          │ SKU, Name   │                     │  │
│  │  │ sell_price  │◀─────────│ purch_price │                     │  │
│  │  └─────────────┘          └─────────────┘                     │  │
│  │         │                       │                             │  │
│  │         │ has recipes           │ used in recipes             │  │
│  │         ▼                       ▼                             │  │
│  │  ┌──────────────────────────────────────────────────────┐    │  │
│  │  │                    RECIPES                            │    │  │
│  │  │  ├── product_id → Nomenclature (product)              │    │  │
│  │  │  ├── ingredients[] → Nomenclature (ingredients)       │    │  │
│  │  │  ├── total_cost (auto-calculated)                     │    │  │
│  │  │  └── snapshots[] (version history)                    │    │  │
│  │  └──────────────────────────────────────────────────────┘    │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Документация

| Документ | Описание |
|----------|----------|
| [01-NOMENCLATURE.md](./01-NOMENCLATURE.md) | Справочник товаров и ингредиентов |
| [02-RECIPES.md](./02-RECIPES.md) | Рецепты, ингредиенты, версионирование |

---

## Быстрый старт

### Создание ингредиента

```bash
POST /api/nomenclature
{
  "sku": "ING-BEANS-001",
  "name": "Кофе Арабика 100%",
  "category_code": "beans",
  "unit_of_measure_code": "kg",
  "purchase_price": 500000,
  "is_ingredient": true
}
```

### Создание товара

```bash
POST /api/nomenclature
{
  "sku": "COFFEE-CAP-001",
  "name": "Капучино",
  "category_code": "coffee",
  "unit_of_measure_code": "portions",
  "selling_price": 25000,
  "is_ingredient": false
}
```

### Создание рецепта

```bash
POST /api/recipes
{
  "product_id": "uuid-капучино",
  "name": "Капучино классический",
  "type_code": "primary",
  "ingredients": [
    { "ingredient_id": "uuid-кофе", "quantity": 15, "unit_of_measure_code": "g" },
    { "ingredient_id": "uuid-молоко", "quantity": 150, "unit_of_measure_code": "ml" }
  ]
}
```

---

## Ключевые концепции

### Товары vs Ингредиенты

| Характеристика | Товары | Ингредиенты |
|----------------|--------|-------------|
| Флаг | `is_ingredient = false` | `is_ingredient = true` |
| Цена | `selling_price` | `purchase_price` |
| Использование | Продажи, меню | Рецепты, склад |
| Примеры | Капучино, Снэки | Кофе в зёрнах, Сахар |

### Типы рецептов

| Тип | Назначение |
|-----|------------|
| primary | Основной рецепт (по умолчанию) |
| alternative | Альтернативный вариант |
| test | Тестовый (эксперименты) |

### Автоматический расчёт себестоимости

```
Себестоимость = Σ (цена_ингредиента × количество)

С учётом конвертации единиц:
- kg → g (÷ 1000)
- l → ml (÷ 1000)

Пример:
Кофе: 500,000 UZS/kg × 15g = 500,000 × 0.015 = 7,500 UZS
```

---

## Связи между модулями

```
Nomenclature (product)
       │
       │ has
       ▼
    Recipe
       │
       │ contains
       ▼
RecipeIngredient → Nomenclature (ingredient)
       │
       │ versioned by
       ▼
RecipeSnapshot
```

---

## Интеграции

- **Inventory** - остатки товаров и ингредиентов
- **Transactions** - продажи списывают ингредиенты по рецепту
- **MachineInventory** - наличие в аппаратах
- **Dictionaries** - категории, единицы измерения
- **Suppliers** - поставщики ингредиентов

---

## Права доступа

| Операция | Nomenclature | Recipes |
|----------|--------------|---------|
| Просмотр | Все авторизованные | Все авторизованные |
| Создание | Admin, Manager | Admin, Manager |
| Редактирование | Admin, Manager | Admin, Manager |
| Удаление | Admin | Admin |

---

## Requirements

| REQ ID | Описание |
|--------|----------|
| REQ-NOM-01 | Единый справочник товаров и ингредиентов |
| REQ-NOM-02 | Уникальный SKU |
| REQ-NOM-10 | Цены в UZS |
| REQ-RCP-01 | Рецепты с ингредиентами |
| REQ-RCP-03 | Автоматический расчёт себестоимости |
| REQ-RCP-10 | Версионирование (snapshots) |
