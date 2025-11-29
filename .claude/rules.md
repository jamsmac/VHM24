# VendHub Manager - Правила разработки для Claude Code

## 🎯 Главная цель

Разработать профессиональную систему управления вендинговой сетью **БЕЗ прямой интеграции с аппаратами**, используя подход "контроль через операции персонала".

---

## 📋 Основные принципы

### 1. Архитектурные принципы

#### ✅ ВСЕГДА ПОМНИ:
- **Нет прямого подключения к аппаратам** - все данные через операторов и импорт файлов
- **Фото - обязательны** - ключевой механизм контроля
- **Задачи - центральный механизм** - всё взаимодействие через задачи
- **3 уровня остатков** - склады → операторы → аппараты
- **Валидация везде** - нельзя закрыть задачу без фото/данных

#### ❌ НИКОГДА НЕ:
- Не создавай функции для прямого подключения к аппаратам
- Не делай автоматическое обновление статусов аппаратов (они обновляются вручную)
- Не пропускай обязательные фото при закрытии задач
- Не игнорируй валидацию данных
- Не создавай сложные абстракции там, где можно проще

---

## 🏗️ Структура проекта

```
VendHub/
├── backend/                    # Backend (NestJS/FastAPI)
│   ├── src/
│   │   ├── modules/           # Модули по доменам
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── machines/
│   │   │   ├── tasks/
│   │   │   ├── nomenclature/
│   │   │   ├── inventory/
│   │   │   └── ...
│   │   ├── common/            # Общие утилиты
│   │   ├── database/          # Миграции и сиды
│   │   └── config/            # Конфигурация
│   ├── test/                  # Тесты
│   └── package.json
│
├── frontend/                   # Frontend (Next.js)
│   ├── app/                   # App Router
│   ├── components/            # React компоненты
│   ├── lib/                   # Утилиты
│   ├── public/
│   └── package.json
│
├── telegram-bot/              # Telegram Bot
│   ├── src/
│   │   ├── handlers/         # Обработчики команд
│   │   ├── keyboards/        # Inline клавиатуры
│   │   └── utils/
│   └── package.json
│
├── database/                  # Миграции и схема
│   ├── migrations/
│   └── seeds/
│
├── docs/                      # Документация
│   ├── architecture/
│   ├── dictionaries/
│   ├── guides/
│   └── api/
│
├── .claude/                   # Правила Claude Code
├── docker-compose.yml
└── README.md
```

---

## 💻 Стандарты кодирования

### Backend (Node.js/TypeScript или Python)

#### Именование:
```typescript
// Файлы: kebab-case
user.service.ts
task.controller.ts
machine.entity.ts

// Классы: PascalCase
class UserService {}
class TaskController {}

// Функции/методы: camelCase
async createTask() {}
async getUserById() {}

// Константы: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5_000_000;
const DEFAULT_PAGE_SIZE = 20;

// Interfaces/Types: PascalCase с I prefix для интерфейсов
interface IUser {}
type TaskStatus = 'created' | 'in_progress' | 'completed';
```

#### Структура модуля:
```typescript
// users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
├── entities/
│   └── user.entity.ts
├── users.controller.ts
├── users.service.ts
├── users.module.ts
└── users.service.spec.ts
```

#### Обязательные комментарии:
```typescript
/**
 * Создаёт новую задачу пополнения
 *
 * ВАЖНО: Автоматически резервирует товары на складе
 *
 * @param createTaskDto - Данные для создания задачи
 * @param userId - ID пользователя-создателя
 * @returns Созданная задача
 * @throws BadRequestException если товары недоступны на складе
 */
async createRefillTask(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
  // Реализация
}
```

### Frontend (React/Next.js)

#### Компоненты:
```typescript
// Файлы: PascalCase.tsx
TaskList.tsx
MachineCard.tsx

// Хуки: camelCase, начинаются с use
useAuth.ts
useTasks.ts

// Утилиты: camelCase
formatDate.ts
validatePhone.ts
```

#### Структура компонента:
```typescript
'use client';

import { useState } from 'react';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

/**
 * Карточка задачи с возможностью завершения
 *
 * Используется в списке задач оператора
 */
export function TaskCard({ task, onComplete }: TaskCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await onComplete(task.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="task-card">
      {/* JSX */}
    </div>
  );
}
```

---

## 🔒 Обязательные валидации

### 1. Задачи

```typescript
// ❌ ПЛОХО - можно закрыть без фото
async completeTask(taskId: string) {
  await this.taskRepository.update(taskId, { status: 'completed' });
}

// ✅ ХОРОШО - валидация обязательных условий
async completeTask(taskId: string) {
  const task = await this.taskRepository.findOne(taskId);

  // Проверка фото
  const photos = await this.fileRepository.find({
    entityType: 'task',
    entityId: taskId
  });

  const photosBefore = photos.filter(p => p.category === 'task_photo_before');
  const photosAfter = photos.filter(p => p.category === 'task_photo_after');

  if (photosBefore.length === 0) {
    throw new BadRequestException('Обязательно фото ДО выполнения');
  }

  if (photosAfter.length === 0) {
    throw new BadRequestException('Обязательно фото ПОСЛЕ выполнения');
  }

  // Проверка фактических количеств для пополнения
  if (task.type === 'refill') {
    const items = await this.taskItemRepository.find({ taskId });
    const missingQuantities = items.filter(i => !i.actualQuantity);

    if (missingQuantities.length > 0) {
      throw new BadRequestException('Укажите фактические количества для всех товаров');
    }
  }

  // Проверка суммы для инкассации
  if (task.type === 'collection' && !task.actualAmount) {
    throw new BadRequestException('Укажите собранную сумму');
  }

  // Закрытие задачи
  await this.taskRepository.update(taskId, {
    status: 'completed',
    completedAt: new Date()
  });

  // Обновление остатков (если пополнение)
  if (task.type === 'refill') {
    await this.updateInventoryAfterRefill(task);
  }
}
```

### 2. Остатки

```typescript
// ✅ ВСЕГДА проверяй доступность товаров перед созданием задачи
async createRefillTask(dto: CreateRefillTaskDto) {
  // Проверка остатков на складе
  for (const item of dto.items) {
    const inventory = await this.warehouseInventoryRepository.findOne({
      warehouseId: dto.warehouseId,
      nomenclatureId: item.nomenclatureId
    });

    if (!inventory || inventory.availableQuantity < item.plannedQuantity) {
      throw new BadRequestException(
        `Недостаточно товара на складе: ${item.nomenclatureName}`
      );
    }
  }

  // Создание задачи
  const task = await this.taskRepository.save(dto);

  // Резервирование товаров
  await this.reserveInventory(task);

  return task;
}
```

---

## 📸 Работа с файлами

### Обязательные правила:

```typescript
/**
 * Загрузка фото к задаче
 *
 * ПРАВИЛА:
 * - Максимальный размер: 5 МБ
 * - Форматы: JPG, PNG, WEBP
 * - Обязательны теги для поиска
 * - Сохранять EXIF (GPS, дата)
 */
async uploadTaskPhoto(
  file: Express.Multer.File,
  taskId: string,
  category: 'task_photo_before' | 'task_photo_after'
) {
  // Валидация размера
  if (file.size > 5_000_000) {
    throw new BadRequestException('Файл слишком большой (макс 5 МБ)');
  }

  // Валидация формата
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    throw new BadRequestException('Неподдерживаемый формат файла');
  }

  // Извлечение EXIF
  const exif = await this.extractExif(file);

  // Генерация уникального имени
  const filename = `task-${taskId}-${Date.now()}-${randomUUID()}.${ext}`;

  // Сохранение файла
  const path = await this.storage.save(file, filename);

  // Создание записи в БД
  const savedFile = await this.fileRepository.save({
    filename,
    originalFilename: file.originalname,
    path,
    url: `/uploads/${filename}`,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    categoryId: await this.getCategoryId(category),
    entityType: 'task',
    entityId: taskId,
    tags: this.generateTags(taskId, category), // ['пополнение', 'MAC-001', 'до']
    geolocation: exif.gps,
    takenAt: exif.dateTime,
    uploadedBy: userId
  });

  return savedFile;
}
```

---

## 🧪 Тестирование

### Обязательные тесты для каждого модуля:

```typescript
describe('TaskService', () => {
  describe('completeTask', () => {
    it('должен выбросить ошибку если нет фото ДО', async () => {
      // Arrange
      const taskId = 'test-task-id';
      mockFileRepository.find.mockResolvedValue([]); // Нет фото

      // Act & Assert
      await expect(
        service.completeTask(taskId)
      ).rejects.toThrow('Обязательно фото ДО выполнения');
    });

    it('должен обновить остатки после пополнения', async () => {
      // Arrange
      const task = createMockRefillTask();
      const photos = createMockPhotos(task.id);

      // Act
      await service.completeTask(task.id);

      // Assert
      expect(mockInventoryService.updateAfterRefill).toHaveBeenCalledWith(task);
    });

    it('должен создать финансовую операцию после инкассации', async () => {
      // Arrange
      const task = createMockCollectionTask();

      // Act
      await service.completeTask(task.id);

      // Assert
      expect(mockFinanceService.createOperation).toHaveBeenCalledWith({
        type: 'income',
        amount: task.actualAmount,
        taskId: task.id
      });
    });
  });
});
```

### Coverage требования:
- **Unit tests**: минимум 70% coverage
- **Integration tests**: все критичные потоки
- **E2E tests**: основные пользовательские сценарии

---

## 🔄 Git workflow

### Commit messages (обязательный формат):

```bash
# Формат
<type>(<scope>): <subject>

<body>

<footer>

# Примеры
feat(tasks): add photo validation before task completion

Implemented mandatory photo check for refill and collection tasks.
Tasks cannot be completed without before/after photos.

Closes #123

fix(inventory): correct 3-level inventory update logic

Fixed bug where operator inventory wasn't updated after refill.
Now properly tracks: warehouse → operator → machine.

Refs #456

docs(architecture): update manual operations guide

Added detailed flow for component cleaning process.
```

### Types:
- **feat**: Новая функция
- **fix**: Исправление бага
- **docs**: Документация
- **style**: Форматирование кода
- **refactor**: Рефакторинг
- **test**: Тесты
- **chore**: Рутинные задачи

### Branch naming:
```bash
feature/task-photo-validation
fix/inventory-update-bug
docs/add-api-documentation
refactor/simplify-auth-logic
```

---

## 🚨 Критичные проверки перед каждым коммитом

### Pre-commit checklist:

```bash
# 1. Линтинг
npm run lint

# 2. Форматирование
npm run format

# 3. Типы (TypeScript)
npm run type-check

# 4. Тесты
npm run test

# 5. Build
npm run build
```

### Автоматические хуки (используй husky):

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## 📝 Документация кода

### JSDoc для всех публичных методов:

```typescript
/**
 * Импортирует продажи из Excel/CSV файла
 *
 * Формат файла: 20 колонок (дата, аппарат, товар, цена, количество, ...)
 *
 * Автоматически:
 * - Сопоставляет аппараты по коду
 * - Сопоставляет товары по названию
 * - Создаёт транзакции
 * - Обновляет остатки
 *
 * @param file - Загруженный файл (Excel или CSV)
 * @param userId - ID пользователя, выполняющего импорт
 * @returns Результат импорта (количество строк, ошибки)
 *
 * @throws BadRequestException если формат файла неверный
 * @throws NotFoundException если не найдены аппараты/товары
 *
 * @example
 * const result = await salesService.importFromFile(file, userId);
 * console.log(`Импортировано ${result.successfulRows} строк`);
 *
 * @see docs/guides/sales-import-guide.md
 */
async importSalesFromFile(
  file: Express.Multer.File,
  userId: string
): Promise<ImportResult> {
  // Реализация
}
```

---

## 🎯 Приоритеты разработки

### Фаза 1: MVP (Недели 1-4)
**Приоритет: КРИТИЧНЫЙ**

Функционал:
1. ✅ Аутентификация и пользователи
2. ✅ Аппараты и локации (CRUD)
3. ✅ Номенклатура (товары, ингредиенты, рецепты)
4. ✅ Задачи с фото и валидацией
5. ✅ Telegram бот (базовый)
6. ✅ Audit logs

**Критерий готовности:**
- Оператор может выполнить пополнение через Telegram с фото
- Админ видит выполненную задачу с фото в web-панели
- Остатки обновляются автоматически

### Фаза 2: Important (Недели 5-8)
**Приоритет: ВЫСОКИЙ**

Функционал:
1. ✅ Импорт продаж
2. ✅ 3-уровневая система остатков
3. ✅ Компоненты с автоматической мойкой
4. ✅ Инциденты
5. ✅ Клиентские жалобы

### Фаза 3: Advanced (Недели 9-16)
**Приоритет: СРЕДНИЙ**

Функционал:
1. ✅ Склад и партии
2. ✅ Рейтинг операторов
3. ✅ Все отчёты
4. ✅ Оптимизация

---

## ⚠️ Общие ошибки и как их избежать

### ❌ Ошибка 1: Забыть про валидацию фото
```typescript
// ПЛОХО
async completeTask(taskId: string) {
  await this.taskRepo.update(taskId, { status: 'completed' });
}

// ХОРОШО
async completeTask(taskId: string) {
  await this.validatePhotos(taskId); // Выбросит ошибку если нет фото
  await this.taskRepo.update(taskId, { status: 'completed' });
}
```

### ❌ Ошибка 2: Не обновить остатки после задачи
```typescript
// ПЛОХО
async completeRefillTask(task: Task) {
  await this.taskRepo.update(task.id, { status: 'completed' });
  // Забыли обновить остатки!
}

// ХОРОШО
async completeRefillTask(task: Task) {
  await this.taskRepo.update(task.id, { status: 'completed' });
  await this.inventoryService.updateAfterRefill(task); // Обязательно!
}
```

### ❌ Ошибка 3: Создать API для подключения к аппаратам
```typescript
// ПЛОХО - в проекте НЕТ прямого подключения!
async getMachineOnlineStatus(machineId: string) {
  return await this.machineAPI.getStatus(machineId); // Такого API нет!
}

// ХОРОШО - статус обновляется вручную через задачи
async updateMachineStatus(machineId: string, status: string) {
  return await this.machineRepo.update(machineId, { status });
}
```

### ❌ Ошибка 4: Сложная абстракция где можно проще
```typescript
// ПЛОХО - излишняя абстракция
abstract class BaseInventoryStrategy {
  abstract updateInventory(): Promise<void>;
}
class WarehouseInventoryStrategy extends BaseInventoryStrategy { ... }
class UserInventoryStrategy extends BaseInventoryStrategy { ... }

// ХОРОШО - просто и понятно
async updateWarehouseInventory(data) { ... }
async updateUserInventory(data) { ... }
async updateMachineInventory(data) { ... }
```

---

## 📚 Обязательное чтение перед началом

1. **README.md** - общее описание проекта
2. **docs/architecture/manual-operations.md** - КРИТИЧНО! Концепция системы
3. **docs/architecture/database-schema.md** - схема БД
4. **docs/architecture/roadmap.md** - план разработки
5. **docs/dictionaries/system-dictionaries.md** - все справочники

---

## 🎓 Для новых разработчиков

### Шаг 1: Изучи архитектуру (2 часа)
- Прочитай manual-operations.md полностью
- Пойми почему НЕТ прямого подключения к аппаратам
- Изучи основные потоки (пополнение, инкассация, мойка)

### Шаг 2: Настрой окружение (1 час)
```bash
# Clone repo
git clone https://github.com/jamsmac/VendHub.git
cd VendHub

# Setup backend
cd backend
cp .env.example .env
npm install
docker-compose up -d postgres redis
npm run migration:run
npm run seed:dictionaries

# Setup frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### Шаг 3: Начни с малого (первая задача)
- Создай CRUD для простой сущности (например, локации)
- Добавь тесты
- Создай PR для review
- Получи фидбек

---

## 🔥 Золотые правила

1. **Фото обязательны** - нельзя закрыть задачу без фото ДО/ПОСЛЕ
2. **Валидация везде** - проверяй все входные данные
3. **Тесты пиши сразу** - не откладывай на потом
4. **Документируй публичные методы** - JSDoc обязателен
5. **Следуй roadmap** - не делай функции из фазы 3 в фазе 1
6. **Простота > абстракция** - не усложняй без необходимости
7. **Git commits читаемые** - используй conventional commits
8. **Code review обязателен** - никогда не мержи без review

---

## 📞 Когда нужна помощь

Если не уверен в архитектурном решении:
1. Проверь docs/architecture/manual-operations.md
2. Спроси в команде
3. Создай issue с вопросом
4. Не придумывай сам - можешь пойти не в ту сторону

---

**Успешной разработки! 🚀**

_Последнее обновление: 2025-11-14_
