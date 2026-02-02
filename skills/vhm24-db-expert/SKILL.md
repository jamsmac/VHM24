---
name: vhm24-db-expert
description: |
  VendHub Database Expert - специалист по Drizzle ORM, MySQL и схеме данных VendHub.
  Создаёт схемы таблиц, миграции, оптимизирует запросы.
  Использовать при работе с базой данных, создании новых таблиц, связей между сущностями.
---

# VendHub Database Expert

Эксперт по базе данных VendHub: Drizzle ORM, MySQL, схема данных, миграции.

## Назначение

- Проектирование схемы базы данных
- Создание Drizzle ORM таблиц и relations
- Оптимизация запросов
- Работа с миграциями

## Когда использовать

- Создание новой таблицы
- Изменение существующей схемы
- Оптимизация запросов
- Добавление связей между таблицами
- Вопросы по структуре данных

## Структура проекта VendHub

```
src/
├── db/
│   ├── schema.ts       # Все таблицы Drizzle
│   ├── index.ts        # Экспорт db клиента
│   └── migrations/     # SQL миграции
├── server/
│   └── api/
│       └── routers/    # tRPC роутеры
```

## Drizzle ORM паттерны

### Создание таблицы

```typescript
import { mysqlTable, int, varchar, datetime, boolean, decimal, text } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Базовая таблица
export const tableName = mysqlTable("table_name", {
  id: int("id").primaryKey().autoincrement(),

  // Строки
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Числа
  quantity: int("quantity").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }),

  // Булевы
  isActive: boolean("is_active").notNull().default(true),

  // Даты
  createdAt: datetime("created_at").notNull().defaultNow(),
  updatedAt: datetime("updated_at").notNull().defaultNow().onUpdateNow(),

  // Внешние ключи
  userId: int("user_id").notNull().references(() => users.id),
});
```

### Связи (Relations)

```typescript
// One-to-Many
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  machines: many(machines),
}));

// Many-to-One
export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  machine: one(machines, {
    fields: [orders.machineId],
    references: [machines.id],
  }),
}));

// Many-to-Many (через junction table)
export const productIngredients = mysqlTable("product_ingredients", {
  productId: int("product_id").notNull().references(() => products.id),
  ingredientId: int("ingredient_id").notNull().references(() => ingredients.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
});
```

### Enum поля

```typescript
import { mysqlEnum } from "drizzle-orm/mysql-core";

// Определение enum
const statusEnum = mysqlEnum("status", ["pending", "active", "completed", "cancelled"]);

// Использование в таблице
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  status: statusEnum.notNull().default("pending"),
});
```

## Существующие таблицы VendHub

### Основные сущности

| Таблица | Назначение |
|---------|-----------|
| `users` | Пользователи системы |
| `machines` | Вендинговые автоматы |
| `products` | Товары/напитки |
| `orders` | Заказы/продажи |
| `employees` | Сотрудники |

### Склад и ингредиенты

| Таблица | Назначение |
|---------|-----------|
| `ingredients` | Ингредиенты для напитков |
| `bunkers` | Бункеры с ингредиентами |
| `mixers` | Микшеры для смешивания |
| `warehouseInventory` | Остатки на складе |
| `stockMovements` | Движение товаров |

### Операции

| Таблица | Назначение |
|---------|-----------|
| `tasks` | Задачи для сотрудников |
| `workLogs` | Рабочие логи |
| `spareParts` | Запасные части |
| `maintenanceSchedule` | График обслуживания |

### Финансы

| Таблица | Назначение |
|---------|-----------|
| `payments` | Платежи |
| `cashCollections` | Инкассации |
| `paymentMethods` | Способы оплаты |

Полная схема: `references/database-schema.md`

## Workflow создания таблицы

### Шаг 1: Анализ требований

Определить:
- Какие поля нужны
- Типы данных
- Связи с другими таблицами
- Индексы

### Шаг 2: Создание схемы

```typescript
// src/db/schema.ts

export const newEntity = mysqlTable("new_entity", {
  id: int("id").primaryKey().autoincrement(),
  // ... поля
}, (table) => ({
  // Индексы
  nameIdx: index("name_idx").on(table.name),
}));

export const newEntityRelations = relations(newEntity, ({ one, many }) => ({
  // Связи
}));
```

### Шаг 3: Генерация миграции

```bash
npx drizzle-kit generate:mysql
```

### Шаг 4: Применение миграции

```bash
npx drizzle-kit push:mysql
```

## Паттерны запросов

### SELECT с relations

```typescript
// Получить с связями
const result = await db.query.orders.findMany({
  with: {
    user: true,
    machine: true,
    items: {
      with: {
        product: true,
      },
    },
  },
  where: eq(orders.status, "pending"),
  orderBy: [desc(orders.createdAt)],
  limit: 10,
});
```

### Агрегации

```typescript
import { sql, sum, count, avg } from "drizzle-orm";

// Сумма продаж по автоматам
const sales = await db
  .select({
    machineId: orders.machineId,
    totalAmount: sum(orders.totalAmount),
    orderCount: count(orders.id),
  })
  .from(orders)
  .where(
    and(
      gte(orders.createdAt, startDate),
      lte(orders.createdAt, endDate)
    )
  )
  .groupBy(orders.machineId);
```

### Транзакции

```typescript
await db.transaction(async (tx) => {
  // Создать заказ
  const [order] = await tx.insert(orders).values({
    userId: input.userId,
    machineId: input.machineId,
    totalAmount: input.total,
  });

  // Добавить позиции
  await tx.insert(orderItems).values(
    input.items.map(item => ({
      orderId: order.insertId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
    }))
  );

  // Обновить остатки
  for (const item of input.items) {
    await tx
      .update(bunkers)
      .set({ currentLevel: sql`current_level - ${item.quantity}` })
      .where(eq(bunkers.productId, item.productId));
  }
});
```

## Рекомендации

### Именование

- Таблицы: `snake_case`, множественное число (`orders`, `users`)
- Колонки: `camelCase` в TypeScript, `snake_case` в SQL
- Индексы: `{table}_{column}_idx`
- FK: `{column}_id`

### Типы данных

| Данные | Тип Drizzle |
|--------|-------------|
| ID | `int().primaryKey().autoincrement()` |
| UUID | `varchar({ length: 36 })` |
| Деньги | `decimal({ precision: 10, scale: 2 })` |
| Статус | `mysqlEnum()` |
| JSON | `json()` |
| Дата | `datetime()` |
| Boolean | `boolean()` |

### Индексы

Создавать для:
- Частых WHERE условий
- ORDER BY полей
- JOIN колонок (FK автоматически)
- Уникальных значений

## Ссылки

- `references/database-schema.md` - Полная схема всех таблиц
- `references/query-patterns.md` - Примеры сложных запросов
