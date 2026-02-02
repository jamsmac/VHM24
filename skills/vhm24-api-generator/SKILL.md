---
name: vhm24-api-generator
description: |
  VendHub tRPC API Generator - создаёт типобезопасные API роуты для VendHub.
  Генерирует tRPC процедуры, Zod валидацию, типы TypeScript.
  Использовать при создании новых API endpoints, CRUD операций, бизнес-логики.
---

# VendHub tRPC API Generator

Генератор типобезопасных API на основе tRPC для VendHub OS.

## Назначение

- Создание tRPC роутеров и процедур
- Zod схемы валидации
- Типизированные CRUD операции
- Бизнес-логика серверной части

## Когда использовать

- Создание нового API endpoint
- CRUD операции для сущности
- Агрегирующие запросы (статистика, отчёты)
- Бизнес-логика (расчёты, валидации)

## Структура API VendHub

```
src/server/api/
├── root.ts              # Корневой роутер
├── trpc.ts              # Настройка tRPC
└── routers/
    ├── users.ts
    ├── machines.ts
    ├── products.ts
    ├── orders.ts
    ├── ingredients.ts
    └── ...
```

## Шаблон роутера

### Базовая структура

```typescript
// src/server/api/routers/entityName.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { entityName } from "~/db/schema";
import { eq, desc, and, like, gte, lte } from "drizzle-orm";

// Zod схемы
const createEntitySchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  // ... остальные поля
});

const updateEntitySchema = createEntitySchema.partial().extend({
  id: z.number(),
});

const filterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

export const entityNameRouter = createTRPCRouter({
  // LIST - Получить список с фильтрацией и пагинацией
  list: protectedProcedure
    .input(filterSchema)
    .query(async ({ ctx, input }) => {
      const { search, status, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (search) {
        conditions.push(like(entityName.name, `%${search}%`));
      }
      if (status) {
        conditions.push(eq(entityName.status, status));
      }

      const [items, [{ count }]] = await Promise.all([
        ctx.db.query.entityName.findMany({
          where: conditions.length ? and(...conditions) : undefined,
          orderBy: [desc(entityName.createdAt)],
          limit,
          offset,
          with: {
            // связи если нужны
          },
        }),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(entityName)
          .where(conditions.length ? and(...conditions) : undefined),
      ]);

      return {
        items,
        total: count,
        page,
        pages: Math.ceil(count / limit),
      };
    }),

  // GET BY ID - Получить одну запись
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.query.entityName.findFirst({
        where: eq(entityName.id, input.id),
        with: {
          // все связи для детального просмотра
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Запись не найдена",
        });
      }

      return item;
    }),

  // CREATE - Создать запись
  create: protectedProcedure
    .input(createEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const [result] = await ctx.db.insert(entityName).values({
        ...input,
        createdBy: ctx.session.user.id,
      });

      return { id: result.insertId };
    }),

  // UPDATE - Обновить запись
  update: protectedProcedure
    .input(updateEntitySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      await ctx.db
        .update(entityName)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(entityName.id, id));

      return { success: true };
    }),

  // DELETE - Удалить запись
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(entityName).where(eq(entityName.id, input.id));
      return { success: true };
    }),
});
```

## Паттерны процедур

### Агрегирующие запросы

```typescript
// Статистика
getStats: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
    machineId: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const conditions = [
      gte(orders.createdAt, input.startDate),
      lte(orders.createdAt, input.endDate),
    ];

    if (input.machineId) {
      conditions.push(eq(orders.machineId, input.machineId));
    }

    const [stats] = await ctx.db
      .select({
        totalOrders: count(orders.id),
        totalAmount: sum(orders.totalAmount),
        avgOrderValue: avg(orders.totalAmount),
      })
      .from(orders)
      .where(and(...conditions));

    return stats;
  }),
```

### Bulk операции

```typescript
// Массовое обновление
bulkUpdate: protectedProcedure
  .input(z.object({
    ids: z.array(z.number()),
    data: z.object({
      status: z.enum(["active", "inactive"]),
    }),
  }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(entityName)
      .set(input.data)
      .where(inArray(entityName.id, input.ids));

    return { updated: input.ids.length };
  }),

// Массовое удаление
bulkDelete: protectedProcedure
  .input(z.object({ ids: z.array(z.number()) }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(entityName)
      .where(inArray(entityName.id, input.ids));

    return { deleted: input.ids.length };
  }),
```

### Транзакции

```typescript
// Сложная операция с транзакцией
createWithRelations: protectedProcedure
  .input(createComplexSchema)
  .mutation(async ({ ctx, input }) => {
    return await ctx.db.transaction(async (tx) => {
      // Создать основную сущность
      const [entity] = await tx.insert(entityName).values({
        name: input.name,
      });

      // Создать связанные записи
      if (input.items?.length) {
        await tx.insert(entityItems).values(
          input.items.map(item => ({
            entityId: entity.insertId,
            ...item,
          }))
        );
      }

      return { id: entity.insertId };
    });
  }),
```

## Zod схемы

### Базовые типы

```typescript
// Числа
z.number().int().positive()
z.number().min(0).max(100)

// Строки
z.string().min(1).max(255)
z.string().email()
z.string().url()
z.string().regex(/^\+998\d{9}$/, "Неверный формат телефона")

// Даты
z.date()
z.string().datetime()
z.coerce.date()

// Enum
z.enum(["pending", "active", "completed"])

// Опциональные
z.string().optional()
z.string().nullable()
z.string().nullish()  // optional + nullable

// Значения по умолчанию
z.boolean().default(false)
z.number().default(0)
```

### Сложные схемы

```typescript
// Вложенные объекты
const orderSchema = z.object({
  customer: z.object({
    name: z.string(),
    phone: z.string(),
  }),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    price: z.number().positive(),
  })).min(1, "Добавьте хотя бы один товар"),
});

// Условная валидация
const paymentSchema = z.object({
  method: z.enum(["cash", "card", "transfer"]),
  cardNumber: z.string().optional(),
}).refine(
  (data) => data.method !== "card" || data.cardNumber,
  { message: "Номер карты обязателен", path: ["cardNumber"] }
);

// Трансформация
const priceSchema = z.string()
  .transform(val => parseFloat(val.replace(/\s/g, "")))
  .pipe(z.number().positive());
```

## Регистрация роутера

```typescript
// src/server/api/root.ts
import { createTRPCRouter } from "~/server/api/trpc";
import { entityNameRouter } from "./routers/entityName";

export const appRouter = createTRPCRouter({
  entityName: entityNameRouter,
  // ... другие роутеры
});
```

## Использование на клиенте

```typescript
// Хуки в React компонентах
import { api } from "~/utils/api";

// Query
const { data, isLoading, error } = api.entityName.list.useQuery({
  search: searchQuery,
  page: currentPage,
});

// Query с ID
const { data: item } = api.entityName.getById.useQuery(
  { id: selectedId },
  { enabled: !!selectedId }
);

// Mutation
const createMutation = api.entityName.create.useMutation({
  onSuccess: () => {
    toast.success("Создано успешно");
    utils.entityName.list.invalidate();
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// Вызов
createMutation.mutate({ name: "Test", ... });
```

## Обработка ошибок

```typescript
import { TRPCError } from "@trpc/server";

// Не найдено
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Запись не найдена",
});

// Нет прав
throw new TRPCError({
  code: "FORBIDDEN",
  message: "Нет доступа к этой операции",
});

// Ошибка валидации
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Неверные данные",
});

// Конфликт
throw new TRPCError({
  code: "CONFLICT",
  message: "Запись с таким именем уже существует",
});
```

## Ссылки

- `references/crud-templates.md` - Готовые шаблоны CRUD
- `references/validation-patterns.md` - Паттерны Zod валидации
- `assets/router-template.ts` - Шаблон роутера
