---
name: vhm24-testing
description: |
  VendHub Testing Expert - тестирование React компонентов, tRPC API, интеграционные тесты.
  Создаёт unit, integration, e2e тесты для VendHub приложения.
  Использовать при написании тестов, настройке тестовой инфраструктуры, TDD.
---

# VendHub Testing Expert

Тестирование VendHub OS: React компоненты, tRPC API, интеграционные тесты.

## Назначение

- Unit тесты для компонентов
- Тесты tRPC процедур
- Интеграционные тесты
- E2E тесты
- Mock данные и fixtures

## Когда использовать

- Написание тестов для новой функциональности
- TDD разработка
- Проверка критических путей
- Регрессионное тестирование

## Инструменты

### Stack тестирования

```
vitest          - Test runner (совместим с Jest API)
@testing-library/react - Тестирование React
@testing-library/user-event - Симуляция действий пользователя
msw             - Mock Service Worker для API
@trpc/server    - Тестирование tRPC
playwright      - E2E тестирование
```

### Структура тестов

```
src/
├── components/
│   └── MyComponent/
│       ├── MyComponent.tsx
│       └── MyComponent.test.tsx    # Unit тесты
├── server/api/routers/
│   └── users.ts
│       └── users.test.ts           # API тесты
├── __tests__/
│   ├── integration/                # Интеграционные
│   └── e2e/                        # E2E тесты
└── test/
    ├── setup.ts                    # Настройка
    ├── mocks/                      # Моки
    └── fixtures/                   # Фикстуры
```

## Тестирование React компонентов

### Базовый тест компонента

```typescript
// components/Button/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders with correct text", () => {
    render(<Button>Нажми меня</Button>);

    expect(screen.getByRole("button")).toHaveTextContent("Нажми меня");
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Кнопка</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Кнопка</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant styles correctly", () => {
    render(<Button variant="primary">Primary</Button>);

    expect(screen.getByRole("button")).toHaveClass("bg-amber-600");
  });
});
```

### Тест формы

```typescript
// components/UserForm/UserForm.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "./UserForm";

describe("UserForm", () => {
  it("submits form with valid data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<UserForm onSubmit={onSubmit} />);

    // Заполняем поля
    await user.type(screen.getByLabelText("Имя"), "Иван Петров");
    await user.type(screen.getByLabelText("Email"), "ivan@test.com");
    await user.type(screen.getByLabelText("Телефон"), "+998901234567");

    // Отправляем
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Иван Петров",
        email: "ivan@test.com",
        phone: "+998901234567",
      });
    });
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();

    render(<UserForm onSubmit={vi.fn()} />);

    // Пытаемся отправить пустую форму
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByText("Обязательное поле")).toBeInTheDocument();
  });

  it("validates email format", async () => {
    const user = userEvent.setup();

    render(<UserForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "invalid-email");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByText("Некорректный email")).toBeInTheDocument();
  });
});
```

### Тест с API (MSW)

```typescript
// components/UserList/UserList.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserList } from "./UserList";

// Mock сервер
const server = setupServer(
  http.get("/api/trpc/users.list", () => {
    return HttpResponse.json({
      result: {
        data: {
          items: [
            { id: 1, name: "Иван", email: "ivan@test.com" },
            { id: 2, name: "Мария", email: "maria@test.com" },
          ],
          total: 2,
        },
      },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("UserList", () => {
  it("displays loading state initially", () => {
    render(<UserList />, { wrapper: createWrapper() });

    expect(screen.getByText("Загрузка...")).toBeInTheDocument();
  });

  it("displays users after loading", async () => {
    render(<UserList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Иван")).toBeInTheDocument();
      expect(screen.getByText("Мария")).toBeInTheDocument();
    });
  });

  it("displays error message on API failure", async () => {
    server.use(
      http.get("/api/trpc/users.list", () => {
        return HttpResponse.error();
      })
    );

    render(<UserList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/ошибка/i)).toBeInTheDocument();
    });
  });
});
```

## Тестирование tRPC API

### Unit тесты роутера

```typescript
// server/api/routers/users.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createInnerTRPCContext } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { db } from "~/db";

describe("users router", () => {
  // Создаём caller для тестов
  const createCaller = () => {
    const ctx = createInnerTRPCContext({
      session: {
        user: { id: 1, name: "Test User" },
        expires: new Date().toISOString(),
      },
    });
    return appRouter.createCaller(ctx);
  };

  beforeEach(async () => {
    // Очистка тестовых данных
    await db.delete(users);
  });

  describe("list", () => {
    it("returns empty list when no users exist", async () => {
      const caller = createCaller();

      const result = await caller.users.list({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns paginated users", async () => {
      const caller = createCaller();

      // Создаём тестовые данные
      await db.insert(users).values([
        { name: "User 1", email: "user1@test.com" },
        { name: "User 2", email: "user2@test.com" },
        { name: "User 3", email: "user3@test.com" },
      ]);

      const result = await caller.users.list({ page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.pages).toBe(2);
    });

    it("filters users by search query", async () => {
      const caller = createCaller();

      await db.insert(users).values([
        { name: "Иван Петров", email: "ivan@test.com" },
        { name: "Мария Иванова", email: "maria@test.com" },
      ]);

      const result = await caller.users.list({ search: "Иван" });

      expect(result.items).toHaveLength(2); // Оба содержат "Иван"
    });
  });

  describe("create", () => {
    it("creates a new user", async () => {
      const caller = createCaller();

      const result = await caller.users.create({
        name: "Новый пользователь",
        email: "new@test.com",
      });

      expect(result.id).toBeDefined();

      const created = await db.query.users.findFirst({
        where: eq(users.id, result.id),
      });

      expect(created?.name).toBe("Новый пользователь");
    });

    it("throws error for duplicate email", async () => {
      const caller = createCaller();

      await db.insert(users).values({
        name: "Existing",
        email: "existing@test.com",
      });

      await expect(
        caller.users.create({
          name: "Duplicate",
          email: "existing@test.com",
        })
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("deletes an existing user", async () => {
      const caller = createCaller();

      const [user] = await db.insert(users).values({
        name: "To Delete",
        email: "delete@test.com",
      });

      await caller.users.delete({ id: user.insertId });

      const deleted = await db.query.users.findFirst({
        where: eq(users.id, user.insertId),
      });

      expect(deleted).toBeUndefined();
    });
  });
});
```

## Fixtures и моки

### Фикстуры

```typescript
// test/fixtures/users.ts
import { faker } from "@faker-js/faker/locale/ru";

export const createUserFixture = (overrides = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: `+998${faker.string.numeric(9)}`,
  status: "active" as const,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createUsersFixture = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createUserFixture(overrides));

// Использование
const user = createUserFixture({ name: "Конкретное имя" });
const users = createUsersFixture(10, { status: "inactive" });
```

### Моки tRPC

```typescript
// test/mocks/trpc.ts
import { vi } from "vitest";

export const mockTRPC = {
  users: {
    list: {
      useQuery: vi.fn(() => ({
        data: { items: [], total: 0 },
        isLoading: false,
        error: null,
      })),
    },
    create: {
      useMutation: vi.fn(() => ({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
      })),
    },
  },
};

// В тесте
vi.mock("~/utils/api", () => ({
  api: mockTRPC,
}));
```

## E2E тесты (Playwright)

```typescript
// e2e/users.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Users page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
  });

  test("displays users list", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("can create new user", async ({ page }) => {
    // Открыть форму
    await page.getByRole("button", { name: "Добавить" }).click();

    // Заполнить форму
    await page.getByLabel("Имя").fill("Тестовый пользователь");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Телефон").fill("+998901234567");

    // Отправить
    await page.getByRole("button", { name: "Сохранить" }).click();

    // Проверить результат
    await expect(page.getByText("Успешно создано")).toBeVisible();
    await expect(page.getByText("Тестовый пользователь")).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.getByRole("button", { name: "Добавить" }).click();
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Обязательное поле")).toBeVisible();
  });
});
```

## Конфигурация

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "test/"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
```

### test/setup.ts

```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

## Ссылки

- `references/testing-patterns.md` - Паттерны тестирования
- `references/mocking-guide.md` - Руководство по мокам
