# VendHub Manager - Руководство по тестированию

## 🎯 Цели тестирования

1. **Качество**: Обеспечить надёжность системы
2. **Регрессия**: Предотвратить поломку существующего функционала
3. **Документация**: Тесты как спецификация поведения
4. **Уверенность**: Можно безопасно рефакторить

---

## 📊 Целевые метрики

| Тип тестов | Минимальный coverage | Цель |
|------------|---------------------|------|
| Unit tests | 70% | 80%+ |
| Integration tests | Все критичные API | 100% |
| E2E tests | Основные потоки | 100% |

---

## 🧪 Типы тестов

### 1. Unit Tests

**Что тестируем:**
- Бизнес-логику в services
- Утилиты и helpers
- Валидаторы
- Трансформеры данных

**Что НЕ тестируем в unit:**
- БД запросы (это integration)
- HTTP endpoints (это integration)
- External API calls

**Инструменты:**
- **Backend**: Jest / Pytest
- **Frontend**: Jest + React Testing Library

#### Пример unit теста (Backend)

```typescript
// task.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { BadRequestException } from '@nestjs/common';

describe('TaskService', () => {
  let service: TaskService;
  let mockTaskRepo;
  let mockFileRepo;
  let mockInventoryService;

  beforeEach(async () => {
    mockTaskRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn()
    };

    mockFileRepo = {
      find: jest.fn()
    };

    mockInventoryService = {
      updateAfterRefill: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: 'TaskRepository', useValue: mockTaskRepo },
        { provide: 'FileRepository', useValue: mockFileRepo },
        { provide: 'InventoryService', useValue: mockInventoryService }
      ]
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('completeTask', () => {
    it('должен выбросить ошибку если нет фото ДО', async () => {
      // Arrange
      const taskId = 'task-123';
      mockTaskRepo.findOne.mockResolvedValue({
        id: taskId,
        type: 'refill'
      });
      mockFileRepo.find.mockResolvedValue([]); // Нет фото

      // Act & Assert
      await expect(service.completeTask(taskId))
        .rejects
        .toThrow('Обязательно фото ДО выполнения');
    });

    it('должен выбросить ошибку если нет фото ПОСЛЕ', async () => {
      // Arrange
      const taskId = 'task-123';
      mockTaskRepo.findOne.mockResolvedValue({
        id: taskId,
        type: 'refill'
      });
      mockFileRepo.find.mockResolvedValue([
        { category: 'task_photo_before' } // Только ДО
      ]);

      // Act & Assert
      await expect(service.completeTask(taskId))
        .rejects
        .toThrow('Обязательно фото ПОСЛЕ выполнения');
    });

    it('должен обновить остатки после пополнения', async () => {
      // Arrange
      const task = {
        id: 'task-123',
        type: 'refill',
        items: [
          { nomenclatureId: 'nom-1', actualQuantity: 50 }
        ]
      };

      mockTaskRepo.findOne.mockResolvedValue(task);
      mockFileRepo.find.mockResolvedValue([
        { category: 'task_photo_before' },
        { category: 'task_photo_after' }
      ]);

      // Act
      await service.completeTask(task.id);

      // Assert
      expect(mockInventoryService.updateAfterRefill).toHaveBeenCalledWith(task);
    });

    it('должен создать инцидент при большом расхождении инкассации', async () => {
      // Arrange
      const task = {
        id: 'task-456',
        type: 'collection',
        expectedAmount: 100000,
        actualAmount: 80000 // Расхождение 20%
      };

      mockTaskRepo.findOne.mockResolvedValue(task);
      mockFileRepo.find.mockResolvedValue([
        { category: 'task_photo_before' },
        { category: 'task_photo_after' }
      ]);

      // Act
      await service.completeTask(task.id);

      // Assert
      expect(mockIncidentService.create).toHaveBeenCalledWith({
        type: 'money_discrepancy',
        taskId: task.id,
        description: expect.stringContaining('20%')
      });
    });
  });

  describe('createRefillTask', () => {
    it('должен зарезервировать товары на складе', async () => {
      // Arrange
      const dto = {
        machineId: 'machine-1',
        items: [
          { nomenclatureId: 'nom-1', plannedQuantity: 50 }
        ]
      };

      mockWarehouseInventory.findOne.mockResolvedValue({
        availableQuantity: 100
      });

      // Act
      await service.createRefillTask(dto);

      // Assert
      expect(mockWarehouseInventory.update).toHaveBeenCalledWith(
        expect.anything(),
        { reservedQuantity: expect.any(Number) }
      );
    });

    it('должен выбросить ошибку если недостаточно товаров', async () => {
      // Arrange
      const dto = {
        machineId: 'machine-1',
        items: [
          { nomenclatureId: 'nom-1', plannedQuantity: 150 }
        ]
      };

      mockWarehouseInventory.findOne.mockResolvedValue({
        availableQuantity: 100 // Недостаточно
      });

      // Act & Assert
      await expect(service.createRefillTask(dto))
        .rejects
        .toThrow('Недостаточно товара на складе');
    });
  });
});
```

#### Пример unit теста (Frontend)

```typescript
// TaskCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-123',
    type: 'refill',
    title: 'Пополнение MAC-001',
    status: 'assigned',
    machineCode: 'MAC-001',
    deadline: '2025-11-15T18:00:00Z'
  };

  it('должен отображать информацию о задаче', () => {
    render(<TaskCard task={mockTask} onComplete={jest.fn()} />);

    expect(screen.getByText('Пополнение MAC-001')).toBeInTheDocument();
    expect(screen.getByText('MAC-001')).toBeInTheDocument();
  });

  it('должен вызвать onComplete при нажатии кнопки', async () => {
    const mockOnComplete = jest.fn();
    render(<TaskCard task={mockTask} onComplete={mockOnComplete} />);

    const completeButton = screen.getByRole('button', { name: /завершить/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockTask.id);
    });
  });

  it('должен показать loading состояние', () => {
    render(<TaskCard task={mockTask} onComplete={jest.fn()} />);

    const completeButton = screen.getByRole('button', { name: /завершить/i });
    fireEvent.click(completeButton);

    expect(completeButton).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

---

### 2. Integration Tests

**Что тестируем:**
- API endpoints (полный flow)
- Взаимодействие с БД
- Middleware/Guards
- File uploads
- Транзакции БД

**Setup:**
- Используем тестовую БД
- Перед каждым тестом: очистка БД
- После каждого теста: rollback транзакций

#### Пример integration теста

```typescript
// tasks.controller.integration.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { getConnection } from 'typeorm';

describe('TasksController (integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Логин для получения токена
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await getConnection().close();
    await app.close();
  });

  beforeEach(async () => {
    // Очистка тестовых данных
    await getConnection().query('TRUNCATE tasks CASCADE');
  });

  describe('POST /tasks/refill', () => {
    it('должен создать задачу пополнения', async () => {
      // Arrange
      const dto = {
        machineId: 'machine-1',
        assignedTo: 'operator-1',
        items: [
          { nomenclatureId: 'nom-1', plannedQuantity: 50 }
        ]
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/tasks/refill')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: 'refill',
        status: 'created',
        machineId: dto.machineId,
        items: expect.arrayContaining([
          expect.objectContaining({
            nomenclatureId: 'nom-1',
            plannedQuantity: 50
          })
        ])
      });

      // Проверка в БД
      const task = await getConnection()
        .getRepository('tasks')
        .findOne(response.body.id);

      expect(task).toBeDefined();
      expect(task.type).toBe('refill');
    });

    it('должен вернуть 400 если нет товаров', async () => {
      const dto = {
        machineId: 'machine-1',
        assignedTo: 'operator-1',
        items: [] // Пусто!
      };

      await request(app.getHttpServer())
        .post('/tasks/refill')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(400);
    });

    it('должен вернуть 401 без токена', async () => {
      const dto = {
        machineId: 'machine-1',
        items: [{ nomenclatureId: 'nom-1', plannedQuantity: 50 }]
      };

      await request(app.getHttpServer())
        .post('/tasks/refill')
        .send(dto)
        .expect(401);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('должен завершить задачу с фото', async () => {
      // Arrange - создаём задачу
      const task = await createTestTask({ type: 'refill' });

      // Загружаем фото ДО
      await request(app.getHttpServer())
        .post(`/tasks/${task.id}/photos`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-image'), 'before.jpg')
        .field('category', 'task_photo_before')
        .expect(201);

      // Загружаем фото ПОСЛЕ
      await request(app.getHttpServer())
        .post(`/tasks/${task.id}/photos`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-image'), 'after.jpg')
        .field('category', 'task_photo_after')
        .expect(201);

      // Заполняем фактические количества
      await request(app.getHttpServer())
        .patch(`/tasks/${task.id}/items/${task.items[0].id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ actualQuantity: 48 })
        .expect(200);

      // Act - завершаем задачу
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.status).toBe('completed');
      expect(response.body.completedAt).toBeDefined();

      // Проверка обновления остатков в БД
      const inventory = await getConnection()
        .getRepository('machine_inventory')
        .findOne({
          machineId: task.machineId,
          nomenclatureId: task.items[0].nomenclatureId
        });

      expect(inventory.currentQuantity).toBeGreaterThan(0);
    });

    it('должен вернуть 400 если нет фото ДО', async () => {
      const task = await createTestTask({ type: 'refill' });

      await request(app.getHttpServer())
        .patch(`/tasks/${task.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('фото ДО');
        });
    });
  });
});
```

---

### 3. E2E Tests

**Что тестируем:**
- Полные пользовательские сценарии
- Frontend + Backend + БД
- Реальный браузер

**Инструменты:**
- **Playwright** (recommended) или Cypress

#### Пример E2E теста

```typescript
// refill-task-flow.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Refill Task Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Логин
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('должен создать и выполнить задачу пополнения', async ({ page }) => {
    // 1. Создание задачи
    await page.click('text=Задачи');
    await page.click('text=Создать задачу');
    await page.selectOption('select[name="type"]', 'refill');
    await page.selectOption('select[name="machineId"]', { label: 'MAC-001' });
    await page.selectOption('select[name="assignedTo"]', { label: 'Иван Иванов' });

    // Добавление товара
    await page.click('text=Добавить товар');
    await page.fill('input[name="items.0.nomenclatureId"]', 'Капучино');
    await page.fill('input[name="items.0.plannedQuantity"]', '50');

    await page.click('button:has-text("Создать")');

    // Проверка создания
    await expect(page.locator('text=Задача создана')).toBeVisible();

    const taskId = await page.locator('[data-testid="task-id"]').textContent();

    // 2. Переключаемся на оператора (в новой вкладке/сессии)
    // Для простоты тестируем через web, но реально это будет Telegram

    await page.goto(`http://localhost:3000/tasks/${taskId}`);

    // 3. Выполнение задачи
    await page.click('text=Начать выполнение');

    // Загрузка фото ДО
    const beforePhotoInput = page.locator('input[type="file"][name="photoBefore"]');
    await beforePhotoInput.setInputFiles('tests/fixtures/before.jpg');
    await expect(page.locator('img[alt="Preview before"]')).toBeVisible();

    // Заполнение фактических количеств
    await page.fill('input[name="items.0.actualQuantity"]', '48');

    // Чек-лист
    await page.check('input[type="checkbox"][name="checklist.0"]');
    await page.check('input[type="checkbox"][name="checklist.1"]');
    await page.check('input[type="checkbox"][name="checklist.2"]');

    // Загрузка фото ПОСЛЕ
    const afterPhotoInput = page.locator('input[type="file"][name="photoAfter"]');
    await afterPhotoInput.setInputFiles('tests/fixtures/after.jpg');
    await expect(page.locator('img[alt="Preview after"]')).toBeVisible();

    // Завершение
    await page.click('button:has-text("Завершить задачу")');

    // Проверка завершения
    await expect(page.locator('text=Задача выполнена')).toBeVisible();
    await expect(page.locator('[data-testid="task-status"]')).toHaveText('Выполнена');

    // 4. Проверка остатков
    await page.goto('http://localhost:3000/inventory/machines/MAC-001');

    const cappuccinoQuantity = await page.locator(
      '[data-nomenclature="Капучино"] [data-testid="quantity"]'
    ).textContent();

    expect(parseInt(cappuccinoQuantity)).toBeGreaterThan(0);
  });

  test('не должен позволить завершить задачу без фото', async ({ page }) => {
    // Создаём задачу (упрощённо)
    const taskId = await createTaskViaAPI('refill');

    await page.goto(`http://localhost:3000/tasks/${taskId}`);
    await page.click('text=Начать выполнение');

    // Пытаемся завершить без фото
    await page.fill('input[name="items.0.actualQuantity"]', '50');
    await page.click('button:has-text("Завершить задачу")');

    // Должна быть ошибка
    await expect(page.locator('text=Обязательно фото ДО выполнения')).toBeVisible();
  });
});
```

---

## 🧩 Тестовые утилиты и fixtures

### Test Helpers

```typescript
// tests/helpers/test-helpers.ts

/**
 * Создаёт тестового пользователя
 */
export async function createTestUser(overrides = {}) {
  return await getConnection()
    .getRepository('users')
    .save({
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 12),
      fullName: 'Test User',
      role: 'operator',
      isActive: true,
      ...overrides
    });
}

/**
 * Создаёт тестовую задачу
 */
export async function createTestTask(overrides = {}) {
  const machine = await createTestMachine();
  const operator = await createTestUser({ role: 'operator' });

  return await getConnection()
    .getRepository('tasks')
    .save({
      code: `TSK-${Date.now()}`,
      type: 'refill',
      status: 'created',
      machineId: machine.id,
      assignedTo: operator.id,
      scheduledDate: new Date(),
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12 часов
      ...overrides
    });
}

/**
 * Создаёт тестовую машину
 */
export async function createTestMachine(overrides = {}) {
  const location = await createTestLocation();

  return await getConnection()
    .getRepository('machines')
    .save({
      code: `MAC-${Date.now()}`,
      name: 'Test Machine',
      locationId: location.id,
      status: 'active',
      isActive: true,
      ...overrides
    });
}

/**
 * Логин и получение токена
 */
export async function getAuthToken(app: INestApplication, email = 'test@example.com') {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'password123' });

  return response.body.accessToken;
}

/**
 * Загрузка тестового фото
 */
export async function uploadTestPhoto(
  app: INestApplication,
  taskId: string,
  category: string,
  token: string
) {
  const testImage = Buffer.from('fake-image-data');

  const response = await request(app.getHttpServer())
    .post(`/tasks/${taskId}/photos`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', testImage, 'test.jpg')
    .field('category', category);

  return response.body;
}
```

### Fixtures

```typescript
// tests/fixtures/tasks.fixture.ts

export const REFILL_TASK_FIXTURE = {
  code: 'TSK-001',
  type: 'refill',
  status: 'created',
  title: 'Пополнение MAC-001',
  description: 'Плановое пополнение',
  items: [
    {
      nomenclatureId: 'nom-cappuccino',
      nomenclatureName: 'Капучино',
      plannedQuantity: 50,
      unitId: 'unit-pcs'
    },
    {
      nomenclatureId: 'nom-latte',
      nomenclatureName: 'Латте',
      plannedQuantity: 40,
      unitId: 'unit-pcs'
    }
  ]
};

export const COLLECTION_TASK_FIXTURE = {
  code: 'TSK-002',
  type: 'collection',
  status: 'created',
  title: 'Инкассация MAC-001',
  expectedAmount: 500000
};
```

---

## 📋 Чек-лист перед каждым PR

### Обязательно:
- [ ] Все новые функции покрыты unit тестами
- [ ] Все новые API endpoints покрыты integration тестами
- [ ] Критичные потоки покрыты E2E тестами
- [ ] `npm run test` проходит успешно
- [ ] Coverage не ниже 70%
- [ ] Нет ошибок линтера
- [ ] Нет типовых ошибок (TypeScript)

### Для критичных изменений:
- [ ] Ручное тестирование полного потока
- [ ] Проверка на staging
- [ ] Performance testing (если затрагивает производительность)

---

## 🔄 Continuous Testing

### Pre-commit hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:affected"
    }
  }
}
```

### CI Pipeline (GitHub Actions)
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Полезные ресурсы

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Хорошие тесты = Уверенность в коде = Быстрая разработка** 🚀
