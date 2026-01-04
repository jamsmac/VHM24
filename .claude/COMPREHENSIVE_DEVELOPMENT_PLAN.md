# VendHub Manager - Комплексный План Доработок и Интеграций

> **Версия**: 1.0.0
> **Дата создания**: 2026-01-04
> **Общий объём работ**: ~720 часов
> **Горизонт планирования**: 16 недель (4 месяца)

---

## Оглавление

1. [Обзор текущего состояния](#обзор-текущего-состояния)
2. [Критические блокеры (Sprint 0)](#sprint-0-критические-блокеры)
3. [Фаза 1: Стабилизация](#фаза-1-стабилизация-недели-1-2)
4. [Фаза 2: UI/UX и Офисные функции](#фаза-2-uiux-и-офисные-функции-недели-3-4)
5. [Фаза 3: Mobile App](#фаза-3-mobile-app-недели-5-8)
6. [Фаза 4: Интеграции с репозиториями](#фаза-4-интеграции-с-репозиториями-недели-9-12)
7. [Фаза 5: Advanced Features](#фаза-5-advanced-features-недели-13-16)
8. [Матрица зависимостей](#матрица-зависимостей)
9. [Риски и митигация](#риски-и-митигация)
10. [Метрики успеха](#метрики-успеха)

---

## Обзор текущего состояния

### Готовность компонентов

| Компонент | Готовность | Статус | Блокеры |
|-----------|------------|--------|---------|
| Backend API | 95% | ✅ Production Ready | - |
| Frontend Web | 62% | 🔴 Active Dev | TypeScript ошибки, роли |
| Mobile App | 25% | 🟠 Foundation | Нет экранов задач |
| Telegram Bot | 80% | 🟡 Needs Commands | /commissions, /sales |
| Commission System | 100% | ✅ Complete | - |
| DevOps/Infra | 90% | ✅ Railway Ready | - |
| Testing | 65% | 🟠 Needs E2E | Playwright не настроен |
| Documentation | 85% | ✅ Good | - |

### Источники нереализованных планов

| Документ | Количество задач | Приоритет |
|----------|------------------|-----------|
| `.claude/ACTION_PLAN_100.md` | 45+ задач | HIGH |
| `.claude/phase-1-mvp-checklist.md` | 30+ задач | HIGH |
| `docs/231225/VHM24-MASTER-PLAN.md` | 50+ задач | MEDIUM |
| `docs/architecture/roadmap.md` | 60+ задач | LOW |
| `.claude/INTEGRATION_INSTRUCTIONS.md` | 25+ интеграций | MEDIUM |
| `docs/telegram/TELEGRAM_ANALYSIS_PROMPT.md` | 15+ интеграций | MEDIUM |

---

## Sprint 0: Критические Блокеры

**Срок**: 1-2 дня
**Трудозатраты**: 5 часов
**Приоритет**: 🔴 BLOCKER

### B.1 Несоответствие ролей Frontend/Backend

**Проблема**: Frontend имеет 5 ролей, Backend - 7 ролей

| Backend (правильно) | Frontend (текущее) |
|---------------------|-------------------|
| Owner | ❌ Отсутствует |
| Admin | ✅ Admin |
| Manager | ✅ Manager |
| Operator | ✅ Operator |
| Collector | ❌ Отсутствует |
| Technician | ❌ Отсутствует |
| Viewer | ✅ Viewer |
| - | ❌ Accountant (лишний) |

**Файл**: `frontend/src/types/users.ts`

**Решение**:
```typescript
// Было:
export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer' | 'accountant';

// Должно быть:
export type UserRole = 'owner' | 'admin' | 'manager' | 'operator' | 'collector' | 'technician' | 'viewer';
```

**Задачи**:
- [ ] Обновить `frontend/src/types/users.ts` (15 мин)
- [ ] Найти и заменить все использования Accountant (30 мин)
- [ ] Добавить labels и colors для новых ролей (15 мин)
- [ ] Обновить селекторы ролей в формах (30 мин)

**Трудозатраты**: 1.5 часа

---

### B.2 Неправильная валюта (RUB → UZS)

**Проблема**: Frontend использует RUB (₽), нужно UZS (сум)

**Файл**: `frontend/src/lib/utils.ts` (строки 26-31)

**Решение**:
```typescript
// Было:
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
}

// Должно быть:
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(amount);
}
```

**Задачи**:
- [ ] Обновить `formatCurrency()` в utils.ts (15 мин)
- [ ] Найти все ₽ символы и заменить на "сум" (30 мин)
- [ ] Обновить константы валют (15 мин)

**Трудозатраты**: 1 час

---

### B.3 Sidebar без группировки

**Проблема**: 25 пунктов меню не сгруппированы

**Файл**: `frontend/src/components/layout/Sidebar.tsx`

**Требуемые группы**:
```
📊 Обзор
  - Dashboard
  - Аналитика

🏭 Автоматы
  - Список автоматов
  - Карта
  - QR-коды

📋 Операции
  - Задачи
  - Инциденты
  - Жалобы

📦 Склад
  - Остатки
  - Товары
  - Рецепты
  - Оборудование

💰 Финансы
  - Транзакции
  - Комиссии
  - Отчёты

🔔 Уведомления
  - Алерты
  - Telegram

⚙️ Администрирование
  - Пользователи
  - Настройки
  - Аудит
```

**Задачи**:
- [ ] Создать компонент SidebarGroup (1 час)
- [ ] Реструктурировать навигацию (1 час)
- [ ] Добавить collapse/expand с localStorage (30 мин)

**Трудозатраты**: 2.5 часа

---

## Фаза 1: Стабилизация (Недели 1-2)

**Срок**: 2 недели
**Трудозатраты**: 40 часов
**Приоритет**: 🔴 HIGH

### 1.1 Backend Стабилизация

| Задача | Часы | Приоритет |
|--------|------|-----------|
| Запустить полный test suite | 2 | HIGH |
| Исправить все failing tests | 4 | HIGH |
| Проверить API endpoints через Swagger | 2 | HIGH |
| Валидация BullMQ jobs | 2 | HIGH |
| Проверить commission calculations | 2 | HIGH |

**Команды**:
```bash
cd backend
npm run test
npm run test:cov
npm run build
```

**Acceptance Criteria**:
- [ ] Все тесты проходят (0 failures)
- [ ] Coverage > 70%
- [ ] Build успешный
- [ ] Swagger доступен на /api/docs

---

### 1.2 Frontend Стабилизация

| Задача | Часы | Приоритет |
|--------|------|-----------|
| npm run build без ошибок | 2 | HIGH |
| Исправить TypeScript ошибки | 4 | HIGH |
| Проверить все роуты | 2 | MEDIUM |
| Валидация форм | 2 | MEDIUM |
| Real-time updates | 2 | MEDIUM |

**Команды**:
```bash
cd frontend
npm run build
npm run lint
npm run type-check
```

**Acceptance Criteria**:
- [ ] Build проходит без ошибок
- [ ] 0 TypeScript errors
- [ ] Все страницы загружаются

---

### 1.3 Security Audit

| Задача | Часы | Приоритет |
|--------|------|-----------|
| npm audit backend | 1 | HIGH |
| npm audit frontend | 1 | HIGH |
| Проверить auth на всех endpoints | 2 | HIGH |
| Тест rate limiting | 1 | HIGH |
| Проверить CORS | 1 | MEDIUM |

**Команды**:
```bash
cd backend && npm audit
cd frontend && npm audit
```

**Acceptance Criteria**:
- [ ] 0 high/critical vulnerabilities
- [ ] Все endpoints требуют auth (кроме public)
- [ ] Rate limiting работает (429 при превышении)

---

### 1.4 Environment Setup

| Задача | Часы | Приоритет |
|--------|------|-----------|
| Актуализировать .env.production | 2 | HIGH |
| Проверить secrets в Railway | 1 | HIGH |
| Применить все миграции | 1 | HIGH |
| Настроить Redis | 1 | MEDIUM |

**Acceptance Criteria**:
- [ ] .env.production содержит все переменные
- [ ] Railway secrets синхронизированы
- [ ] Миграции применены успешно

---

## Фаза 2: UI/UX и Офисные функции (Недели 3-4)

**Срок**: 2 недели
**Трудозатраты**: 50 часов
**Приоритет**: 🟠 MEDIUM-HIGH

### 2.1 Excel Export Component

**Файл**: `frontend/src/components/ui/ExportButton.tsx`

```typescript
// Функционал:
interface ExportButtonProps {
  data: any[];
  columns: ColumnDef[];
  filename: string;
  formats?: ('xlsx' | 'csv')[];
}
```

**Зависимости**: `npm install xlsx`

**Интеграция**:
- [ ] Страница машин
- [ ] Страница транзакций
- [ ] Страница задач
- [ ] Страница пользователей

**Трудозатраты**: 4 часа

---

### 2.2 InlineCreateSelect Component

**Файл**: `frontend/src/components/ui/InlineCreateSelect.tsx`

```typescript
// Функционал:
interface InlineCreateSelectProps<T> {
  options: T[];
  onSelect: (value: T) => void;
  onCreate: (name: string) => Promise<T>;
  placeholder?: string;
  createLabel?: string; // "+ Создать новый"
}
```

**Интеграция**:
- [ ] Форма создания машины (локации)
- [ ] Форма создания задачи (машины)
- [ ] Форма создания товара (категории)

**Трудозатраты**: 4 часа

---

### 2.3 Product Tour / Onboarding

**Файл**: `frontend/src/components/onboarding/ProductTour.tsx`

**Шаги тура**:
1. Sidebar навигация
2. Добавление первой машины
3. Создание первой задачи
4. Просмотр отчётов
5. Поиск и фильтрация

**Зависимости**: `npm install driver.js` или `react-joyride`

**Трудозатраты**: 6 часов

---

### 2.4 Русская локализация

**Задачи**:
- [ ] Проверить все UI тексты на русском
- [ ] Перевести оставшиеся английские тексты
- [ ] Локализовать даты и числа
- [ ] Проверить формы ошибок

**Трудозатраты**: 8 часов

---

### 2.5 Клиентская зона (/my/*)

**Новые страницы**:

| Страница | URL | Описание | Часы |
|----------|-----|----------|------|
| Dashboard | `/my/` | Личный кабинет клиента | 4 |
| История | `/my/history` | История покупок | 3 |
| Бонусы | `/my/bonuses` | Баланс и начисления | 3 |
| Избранное | `/my/favorites` | Избранные напитки | 2 |
| Настройки | `/my/settings` | Профиль и уведомления | 2 |
| Акции | `/promotions` | Текущие акции | 2 |

**Backend API (нужно создать)**:
```
GET  /api/client/me/stats
GET  /api/client/me/history
GET  /api/client/me/bonuses
POST /api/client/bonuses/redeem
GET  /api/client/me/favorites
POST /api/client/me/favorites
GET  /api/promotions
```

**Трудозатраты**: 16 часов

---

## Фаза 3: Mobile App (Недели 5-8)

**Срок**: 4 недели
**Трудозатраты**: 90 часов
**Приоритет**: 🟠 HIGH

### 3.1 Экраны задач

| Экран | Файл | Часы | Описание |
|-------|------|------|----------|
| TaskListScreen | `screens/Staff/TaskListScreen.tsx` | 8 | Список с фильтрами |
| TaskDetailScreen | `screens/Staff/TaskDetailScreen.tsx` | 8 | Детали и действия |
| TaskCameraScreen | `screens/Staff/TaskCameraScreen.tsx` | 12 | Фото до/после |
| TaskChecklistScreen | `screens/Staff/TaskChecklistScreen.tsx` | 6 | Чек-лист выполнения |

**Функционал TaskListScreen**:
- [ ] Pull-to-refresh
- [ ] Фильтры по статусу (pending, in_progress, completed)
- [ ] Фильтры по типу (refill, collection, maintenance)
- [ ] Поиск по машине
- [ ] Сортировка по дате/приоритету

**Функционал TaskCameraScreen**:
- [ ] Expo Camera интеграция
- [ ] Сжатие изображений
- [ ] Предпросмотр перед отправкой
- [ ] Геолокация в метаданных
- [ ] Watermark с датой/временем

**Трудозатраты**: 34 часа

---

### 3.2 Карта и локации

| Экран | Файл | Часы | Описание |
|-------|------|------|----------|
| EquipmentMapScreen | `screens/Staff/EquipmentMapScreen.tsx` | 10 | Карта машин |
| RouteScreen | `screens/Staff/RouteScreen.tsx` | 6 | Маршрут на день |

**Функционал карты**:
- [ ] React Native Maps или Leaflet
- [ ] Кластеризация маркеров
- [ ] Фильтры по статусу машин
- [ ] Навигация к машине
- [ ] Информация о машине в popup

**Трудозатраты**: 16 часов

---

### 3.3 Профиль и настройки

| Экран | Файл | Часы | Описание |
|-------|------|------|----------|
| ProfileScreen | `screens/Staff/ProfileScreen.tsx` | 4 | Профиль пользователя |
| SettingsScreen | `screens/Staff/SettingsScreen.tsx` | 4 | Настройки приложения |

**Функционал**:
- [ ] Отображение профиля
- [ ] Смена языка
- [ ] Push notification settings
- [ ] Logout
- [ ] Версия приложения

**Трудозатраты**: 8 часов

---

### 3.4 Offline Mode

**Файлы**:
- `services/offline/OfflineQueueService.ts`
- `services/offline/SyncService.ts`
- `hooks/useNetworkStatus.ts`

**Функционал**:
- [ ] Определение состояния сети
- [ ] Очередь offline операций
- [ ] Автоматическая синхронизация
- [ ] Конфликт-резолюция
- [ ] Индикатор offline режима

**Технологии**:
- AsyncStorage для очереди
- NetInfo для определения сети
- Background fetch для синхронизации

**Трудозатраты**: 16 часов

---

### 3.5 Push Notifications

**Файлы**:
- `services/notifications/PushService.ts`
- `services/notifications/NotificationHandler.ts`

**Функционал**:
- [ ] Expo Notifications setup
- [ ] Регистрация токена на backend
- [ ] Обработка foreground уведомлений
- [ ] Deep linking из уведомлений
- [ ] Настройки уведомлений

**Backend API**:
```
POST /api/mobile/push-token
DELETE /api/mobile/push-token
```

**Трудозатраты**: 8 часов

---

### 3.6 Тестирование и сборка

| Задача | Часы | Описание |
|--------|------|----------|
| Unit тесты | 4 | Jest для компонентов |
| Integration тесты | 4 | API интеграция |
| Performance | 2 | Профилирование |
| iOS build | 2 | EAS Build |
| Android build | 2 | EAS Build |

**Трудозатраты**: 14 часа

---

## Фаза 4: Интеграции с Репозиториями (Недели 9-12)

**Срок**: 4 недели
**Трудозатраты**: 120 часов
**Приоритет**: 🟡 MEDIUM

### 4.1 VH24 Integration (Containers & Recipes)

**Источник**: https://github.com/jamsmac/VH24

#### 4.1.1 Containers Module (Бункеры)

**Новые файлы**:
```
backend/src/modules/containers/
├── entities/
│   ├── container.entity.ts
│   └── container-refill.entity.ts
├── dto/
│   ├── create-container.dto.ts
│   └── update-container.dto.ts
├── containers.service.ts
├── containers.controller.ts
└── containers.module.ts
```

**Entity структура**:
```typescript
@Entity('containers')
export class Container extends BaseEntity {
  machine_id: string;           // FK → machines
  nomenclature_id: string;      // FK → nomenclature (ингредиент)
  slot_number: number;          // Номер слота в машине
  name: string;                 // Название бункера
  capacity: number;             // Максимальная ёмкость
  current_quantity: number;     // Текущий уровень
  unit: string;                 // Единица измерения (г, мл)
  min_level: number;            // Минимальный уровень для алерта
  last_refill_date: Date;       // Дата последней заправки
  status: 'active' | 'empty' | 'maintenance';
}
```

**API Endpoints**:
```
GET    /containers                    # Список всех
GET    /containers/:id                # По ID
GET    /containers/machine/:machineId # По машине
POST   /containers                    # Создать
PATCH  /containers/:id                # Обновить
POST   /containers/:id/refill         # Заправить
DELETE /containers/:id                # Удалить
```

**Миграция**:
```typescript
// migrations/XXXXXX-AddContainers.ts
await queryRunner.createTable(new Table({
  name: 'containers',
  columns: [
    { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
    { name: 'machine_id', type: 'uuid' },
    { name: 'nomenclature_id', type: 'uuid', isNullable: true },
    { name: 'slot_number', type: 'int' },
    { name: 'name', type: 'varchar', length: '100', isNullable: true },
    { name: 'capacity', type: 'decimal', precision: 10, scale: 3 },
    { name: 'current_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 },
    { name: 'unit', type: 'varchar', length: '20', default: "'г'" },
    { name: 'min_level', type: 'decimal', precision: 10, scale: 3, isNullable: true },
    { name: 'last_refill_date', type: 'timestamp', isNullable: true },
    { name: 'status', type: 'varchar', length: '20', default: "'active'" },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
    { name: 'deleted_at', type: 'timestamp', isNullable: true },
  ],
  indices: [
    { columnNames: ['machine_id'] },
    { columnNames: ['nomenclature_id'] },
  ],
  foreignKeys: [
    { columnNames: ['machine_id'], referencedTableName: 'machines', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
    { columnNames: ['nomenclature_id'], referencedTableName: 'nomenclature', referencedColumnNames: ['id'], onDelete: 'SET NULL' },
  ],
  uniques: [
    { columnNames: ['machine_id', 'slot_number'] },
  ],
}));
```

**Трудозатраты**: 16 часов

---

#### 4.1.2 Recipe Consumption Service

**Файл**: `backend/src/modules/recipes/services/recipe-consumption.service.ts`

> ⚠️ ВАЖНО: Добавить КАК НОВЫЙ СЕРВИС, не модифицировать recipes.service.ts!

**Функционал**:
```typescript
@Injectable()
export class RecipeConsumptionService {
  // Рассчитать расход ингредиентов для N порций
  async calculateConsumption(recipeId: string, quantity: number): Promise<IngredientConsumption[]>;

  // Списать ингредиенты после продажи (атомарно)
  async deductIngredients(recipeId: string, machineId: string, quantity: number): Promise<void>;

  // Проверить достаточность ингредиентов
  async checkAvailability(recipeId: string, machineId: string, quantity: number): Promise<{
    available: boolean;
    missing: IngredientConsumption[];
  }>;
}
```

**Интеграция**:
- [ ] При импорте продаж автоматически списывать ингредиенты
- [ ] Добавить проверку перед созданием заказа
- [ ] Уведомления при недостатке ингредиентов

**Трудозатраты**: 12 часов

---

#### 4.1.3 Batch Tracking (Партии)

**Новые файлы**:
```
backend/src/modules/ingredient-batches/
├── entities/
│   └── ingredient-batch.entity.ts
├── dto/
│   ├── create-batch.dto.ts
│   └── update-batch.dto.ts
├── ingredient-batches.service.ts
├── ingredient-batches.controller.ts
└── ingredient-batches.module.ts
```

**Entity структура**:
```typescript
@Entity('ingredient_batches')
export class IngredientBatch extends BaseEntity {
  nomenclature_id: string;       // FK → nomenclature
  batch_number: string;          // Номер партии
  quantity: number;              // Количество
  purchase_price: number;        // Закупочная цена
  supplier_id: string;           // FK → counterparties
  manufacture_date: Date;        // Дата производства
  expiry_date: Date;             // Срок годности
  received_date: Date;           // Дата получения
  status: 'in_stock' | 'depleted' | 'expired' | 'returned';
}
```

**FIFO логика**:
```typescript
// При списании использовать партии в порядке поступления
async deductWithFIFO(nomenclatureId: string, quantity: number): Promise<void> {
  const batches = await this.repository.find({
    where: { nomenclature_id: nomenclatureId, status: 'in_stock' },
    order: { received_date: 'ASC' }, // FIFO
  });

  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    batch.quantity -= deduct;
    remaining -= deduct;
    if (batch.quantity === 0) batch.status = 'depleted';
    await this.repository.save(batch);
  }
}
```

**Трудозатраты**: 16 часов

---

#### 4.1.4 Sales Reporting via Telegram

**Новые команды бота**:
```
/sales              → Начать ввод продаж
/sales [machine]    → Продажи для конкретной машины
```

**FSM Flow**:
```
IDLE → /sales → SELECT_MACHINE → ENTER_CASH → ENTER_CARD → CONFIRM → IDLE
```

**Реализация**:
```typescript
// telegram/core/services/telegram-sales.service.ts
@Injectable()
export class TelegramSalesService {
  async startSalesFlow(ctx: Context): Promise<void>;
  async handleMachineSelection(ctx: Context, machineId: string): Promise<void>;
  async handleCashAmount(ctx: Context, amount: number): Promise<void>;
  async handleCardAmount(ctx: Context, amount: number): Promise<void>;
  async confirmSales(ctx: Context): Promise<void>;
}
```

**Трудозатраты**: 8 часов

---

### 4.2 data-parse-desk Integration (AI & Formulas)

**Источник**: https://github.com/jamsmac/data-parse-desk

#### 4.2.1 AI Column Mapping Enhancement

**Файл**: `backend/src/modules/intelligent-import/services/ai-column-mapper.service.ts`

**Улучшения**:
- [ ] Multi-model routing (Gemini → GPT fallback)
- [ ] Confidence scoring для маппинга
- [ ] Кэширование успешных маппингов
- [ ] Learning от пользовательских корректировок

**Трудозатраты**: 12 часов

---

#### 4.2.2 Formula Engine

**Новый модуль**: `backend/src/modules/formula-engine/`

**Поддерживаемые функции**:
```typescript
// Математические
SUM, AVG, MIN, MAX, COUNT, ROUND, ABS

// Строковые
CONCAT, LEFT, RIGHT, TRIM, UPPER, LOWER

// Логические
IF, AND, OR, NOT, SWITCH

// Даты
TODAY, NOW, DATEDIFF, DATEADD

// Специальные
LOOKUP, VLOOKUP, INDEX, MATCH
```

**Использование**:
```typescript
// В комиссиях
formula: "=revenue * commission_rate / 100"

// В отчётах
formula: "=SUM(sales) - SUM(expenses)"

// В алертах
formula: "=IF(stock < min_level, 'LOW', 'OK')"
```

**Трудозатраты**: 16 часов

---

#### 4.2.3 Natural Language Queries

**Новая команда бота**: `/ask [вопрос]`

**Примеры**:
```
/ask Покажи машины с низким остатком
/ask Сколько продаж за эту неделю
/ask Какие задачи просрочены
```

**Реализация**:
```typescript
// telegram/core/services/telegram-nlp.service.ts
@Injectable()
export class TelegramNlpService {
  async parseQuery(query: string): Promise<StructuredQuery>;
  async executeQuery(query: StructuredQuery): Promise<QueryResult>;
  async formatResponse(result: QueryResult): Promise<string>;
}
```

**Трудозатраты**: 20 часов

---

### 4.3 AIAssistant Integration (Caching & Workflows)

**Источник**: https://github.com/jamsmac/AIAssistant

#### 4.3.1 Advanced Caching System

**Файл**: `backend/src/common/services/ai-cache.service.ts`

**Стратегия кэширования**:
```typescript
interface CacheConfig {
  simple_query: { ttl: 3600 };      // 1 час
  complex_analysis: { ttl: 604800 }; // 1 неделя
  realtime_data: { ttl: 0 };         // Без кэша
}

// Hash-based ключи
const key = MD5(JSON.stringify({ prompt, model, params }));
```

**Ожидаемый результат**: до 920x speedup для повторных запросов

**Трудозатраты**: 8 часов

---

#### 4.3.2 Workflow Automation Engine

**Новый модуль**: `backend/src/modules/workflows/`

**Структура workflow**:
```typescript
interface Workflow {
  id: string;
  name: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  is_active: boolean;
}

type WorkflowTrigger =
  | { type: 'event', event: 'low_stock' | 'task_created' | 'incident_reported' }
  | { type: 'schedule', cron: string }
  | { type: 'manual' };

interface WorkflowStep {
  action: 'notify' | 'create_task' | 'assign_user' | 'update_status' | 'send_email';
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}
```

**Примеры workflows**:
```yaml
# Low Stock Alert Workflow
trigger: { type: 'event', event: 'low_stock' }
steps:
  - action: notify
    config: { channel: 'telegram', recipients: 'managers' }
  - action: create_task
    config: { type: 'refill', priority: 'high' }
  - action: assign_user
    config: { strategy: 'nearest_operator' }
```

**Трудозатраты**: 24 часа

---

### 4.4 vendify-menu-maps Integration

**Источник**: https://github.com/jamsmac/vendify-menu-maps

#### 4.4.1 Enhanced Map Components

**Компоненты для frontend**:
```
frontend/src/components/map/
├── MachineMap.tsx           # Карта с машинами
├── MachineMarker.tsx        # Кастомный маркер
├── MachineCluster.tsx       # Кластеризация
├── MachinePopup.tsx         # Информация о машине
├── RouteLayer.tsx           # Маршрут
└── SearchOnMap.tsx          # Поиск по карте
```

**Трудозатраты**: 12 часов

---

### 4.5 vhm24v2 Integration

**Источник**: https://github.com/jamsmac/vhm24v2

#### 4.5.1 Shared Types Structure

**Создать**: `shared/` папку для общих типов

```
shared/
├── types/
│   ├── machine.types.ts
│   ├── task.types.ts
│   ├── user.types.ts
│   └── transaction.types.ts
├── constants/
│   ├── roles.ts
│   ├── statuses.ts
│   └── currencies.ts
└── utils/
    ├── validation.ts
    └── formatting.ts
```

**Трудозатраты**: 8 часов

---

## Фаза 5: Advanced Features (Недели 13-16)

**Срок**: 4 недели
**Трудозатраты**: 140 часов
**Приоритет**: 🟢 MEDIUM-LOW

### 5.1 E2E Testing

**Технология**: Playwright

**Setup**:
```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

**Тесты**:
```
tests/e2e/
├── auth/
│   ├── login.spec.ts
│   ├── logout.spec.ts
│   └── 2fa.spec.ts
├── machines/
│   ├── list.spec.ts
│   ├── create.spec.ts
│   └── edit.spec.ts
├── tasks/
│   ├── create.spec.ts
│   ├── complete.spec.ts
│   └── photo-upload.spec.ts
├── commissions/
│   ├── calculation.spec.ts
│   └── payout.spec.ts
└── reports/
    └── generate.spec.ts
```

**Трудозатраты**: 40 часов

---

### 5.2 Telegram Bot Enhancement

#### Новые команды:

| Команда | Описание | Часы |
|---------|----------|------|
| `/commissions` | Просмотр комиссий | 4 |
| `/overdue` | Просроченные задачи | 3 |
| `/calculate` | Калькулятор комиссий | 4 |
| `/operation` | Логировать операцию | 4 |
| `/ask` | NLP запрос | 8 |

**Inline keyboards**:
- [ ] Комиссии по периодам
- [ ] Quick actions для операторов
- [ ] Уведомления о просрочке

**Трудозатраты**: 23 часа

---

### 5.3 Operator Ratings System

**Entity**:
```typescript
@Entity('operator_ratings')
export class OperatorRating extends BaseEntity {
  user_id: string;
  period_start: Date;
  period_end: Date;
  timeliness_score: number;       // 30% - Своевременность
  photo_quality_score: number;    // 25% - Качество фото
  data_accuracy_score: number;    // 20% - Точность данных
  customer_feedback_score: number; // 15% - Отзывы клиентов
  discipline_score: number;       // 10% - Дисциплина
  total_score: number;            // Общий балл
  rank: 'bronze' | 'silver' | 'gold' | 'platinum';
}
```

**Автоматический расчёт**:
```typescript
@Cron('0 0 * * 0') // Каждое воскресенье
async calculateWeeklyRatings() {
  // Агрегация метрик за неделю
  // Расчёт баллов по критериям
  // Обновление рангов
}
```

**Трудозатраты**: 20 часов

---

### 5.4 Advanced Reports

| Отчёт | Описание | Часы |
|-------|----------|------|
| Продажи по машинам | Детализация по периодам | 4 |
| Эффективность операторов | Рейтинги и метрики | 4 |
| Инвентаризация | Остатки и движения | 4 |
| Финансовый | Доходы, расходы, комиссии | 6 |
| Техобслуживание | Статистика ремонтов | 4 |
| Инциденты | Анализ проблем | 3 |

**PDF Generation**: PDFKit с шаблонами

**Трудозатраты**: 25 часа

---

### 5.5 Multi-tenant / Franchise System

**Новая таблица**: `organizations`

```typescript
@Entity('organizations')
export class Organization extends BaseEntity {
  name: string;
  code: string;               // Уникальный код
  owner_id: string;           // FK → users
  settings: Record<string, any>;
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  is_active: boolean;
}
```

**Изменения в существующих таблицах**:
```sql
-- Добавить organization_id (nullable для обратной совместимости)
ALTER TABLE machines ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE transactions ADD COLUMN organization_id UUID REFERENCES organizations(id);
```

**Middleware для изоляции данных**:
```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const organizationId = req.user?.organization_id;
    req.tenantScope = { organization_id: organizationId };
    next();
  }
}
```

**Трудозатраты**: 32 часа

---

## Матрица зависимостей

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         МАТРИЦА ЗАВИСИМОСТЕЙ                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sprint 0 (Блокеры)                                                         │
│       │                                                                     │
│       ▼                                                                     │
│  Фаза 1 (Стабилизация) ──────────────────────────────────┐                  │
│       │                                                  │                  │
│       ├─────────────────┬─────────────────┐              │                  │
│       ▼                 ▼                 ▼              │                  │
│  Фаза 2 (UI/UX)    Фаза 3 (Mobile)   Фаза 4.1-4.2       │                  │
│       │                 │             (VH24)             │                  │
│       │                 │                 │              │                  │
│       └─────────────────┼─────────────────┘              │                  │
│                         ▼                                ▼                  │
│                    Фаза 4.3-4.5                    Фаза 5 (Advanced)        │
│                   (AI, Workflows)                        │                  │
│                         │                                │                  │
│                         └────────────────────────────────┘                  │
│                                      │                                      │
│                                      ▼                                      │
│                              🚀 PRODUCTION                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Критический путь

1. **Sprint 0** → Без этого frontend нерабочий
2. **Фаза 1.1-1.2** → Backend и Frontend стабилизация
3. **Фаза 3** → Mobile App (большой блок)
4. **Фаза 4.1** → Containers (зависимость для рецептов)
5. **Фаза 5.1** → E2E тесты (validation перед production)

---

## Риски и митигация

### Технические риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| TypeScript ошибки блокируют build | HIGH | HIGH | Включить strict mode постепенно |
| Миграции ломают production | MEDIUM | CRITICAL | Всегда тестировать на staging |
| Mobile app не проходит App Store | MEDIUM | HIGH | Заранее изучить guidelines |
| AI интеграции дорогие | MEDIUM | MEDIUM | Кэширование, rate limiting |
| Grammy миграция сложная | HIGH | LOW | Отложить, использовать Telegraf |

### Организационные риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Нехватка времени | HIGH | HIGH | Приоритизация по бизнес-ценности |
| Scope creep | HIGH | MEDIUM | Строгий change management |
| Технический долг | MEDIUM | MEDIUM | 20% времени на рефакторинг |

---

## Метрики успеха

### Технические метрики

| Метрика | Текущее | Целевое | Срок |
|---------|---------|---------|------|
| Test Coverage | 65% | 80% | Фаза 1 |
| Build Success Rate | 85% | 99% | Фаза 1 |
| API Response Time (p95) | 500ms | 200ms | Фаза 4 |
| Mobile App Crashes | N/A | <1% | Фаза 3 |
| Telegram Bot Response | 2s | 500ms | Фаза 4 |

### Бизнес-метрики

| Метрика | Текущее | Целевое | Срок |
|---------|---------|---------|------|
| Feature Completeness | 73% | 95% | Фаза 5 |
| Mobile App Downloads | 0 | 1000+ | +2 месяца |
| Daily Active Users | N/A | 50+ | +3 месяца |
| Operator Efficiency | N/A | +30% | +4 месяца |

---

## Сводная таблица

| Фаза | Название | Недели | Часы | Приоритет |
|------|----------|--------|------|-----------|
| 0 | Критические блокеры | 0 | 5 | 🔴 BLOCKER |
| 1 | Стабилизация | 1-2 | 40 | 🔴 HIGH |
| 2 | UI/UX и Офисные функции | 3-4 | 50 | 🟠 MEDIUM-HIGH |
| 3 | Mobile App | 5-8 | 90 | 🟠 HIGH |
| 4 | Интеграции | 9-12 | 120 | 🟡 MEDIUM |
| 5 | Advanced Features | 13-16 | 140 | 🟢 MEDIUM-LOW |
| **ИТОГО** | | **16 недель** | **445 часов** | |

> Примечание: Дополнительные ~275 часов из Phase 2-3 roadmap.md (продажи, склад, рейтинги) запланированы после Фазы 5.

---

## Чек-лист готовности к Production

### Pre-Launch (Фаза 1-3)
- [ ] Все блокеры исправлены
- [ ] Test coverage > 80%
- [ ] Build успешен во всех окружениях
- [ ] Security audit пройден
- [ ] Mobile apps в stores

### Launch (Фаза 4)
- [ ] Staging smoke tests пройдены
- [ ] Load testing выполнен
- [ ] Rollback план документирован
- [ ] Monitoring настроен
- [ ] On-call rotation определён

### Post-Launch (Фаза 5)
- [ ] Метрики отслеживаются
- [ ] User feedback собирается
- [ ] Hot fixes процесс работает
- [ ] Documentation актуальна

---

## Приложения

### A. Ссылки на репозитории

| Репозиторий | URL | Статус |
|-------------|-----|--------|
| VHM24 (текущий) | https://github.com/jamsmac/VHM24 | Active |
| VH24 | https://github.com/jamsmac/VH24 | Reference |
| data-parse-desk | https://github.com/jamsmac/data-parse-desk | Reference |
| AIAssistant | https://github.com/jamsmac/AIAssistant | Reference |
| vendify-menu-maps | https://github.com/jamsmac/vendify-menu-maps | Reference |
| vhm24v2 | https://github.com/jamsmac/vhm24v2 | Reference |

### B. Документы-источники

| Документ | Путь |
|----------|------|
| ACTION_PLAN_100 | `.claude/ACTION_PLAN_100.md` |
| MVP Checklist | `.claude/phase-1-mvp-checklist.md` |
| Master Plan | `docs/231225/VHM24-MASTER-PLAN.md` |
| Roadmap | `docs/architecture/roadmap.md` |
| Integration Instructions | `.claude/INTEGRATION_INSTRUCTIONS.md` |
| Telegram Analysis | `docs/telegram/TELEGRAM_ANALYSIS_PROMPT.md` |

### C. Feature Flags

```bash
# .env
FEATURE_CONTAINERS=false          # Фаза 4.1
FEATURE_RECIPE_CONSUMPTION=false  # Фаза 4.1
FEATURE_BATCH_TRACKING=false      # Фаза 4.1
FEATURE_FORMULA_ENGINE=false      # Фаза 4.2
FEATURE_NLP_QUERIES=false         # Фаза 4.2
FEATURE_AI_CACHE=false            # Фаза 4.3
FEATURE_WORKFLOWS=false           # Фаза 4.3
FEATURE_OPERATOR_RATINGS=false    # Фаза 5.3
FEATURE_MULTI_TENANT=false        # Фаза 5.5
```

---

**Версия документа**: 1.0.0
**Дата создания**: 2026-01-04
**Автор**: VendHub Development Team
**Следующий review**: После Sprint 0
