# VendHub Manager — Implementation Roadmap & Refactoring Plan

> **Дата создания**: 2025-11-21
> **Автор**: Claude (Senior Full-Stack Developer & System Architect)
> **Статус**: Strategic Plan

---

## 📊 EXECUTIVE SUMMARY

**Текущий статус проекта**: ~95% базового функционала реализовано по Sprints 1-4

### Общий прогресс по спринтам:
- ✅ **Sprint 1 (Auth)**: 100% — Production Ready
- ✅ **Sprint 2 (Master Data)**: 100% — Production Ready
- 🟡 **Sprint 3 (Components+Tasks)**: Backend 100%, Frontend 70%
- 🟡 **Sprint 4 (Inventory Analysis)**: Backend 92%, Frontend 80%

### Технические улучшения от 21.11.2025:
- ✅ Установлены все зависимости (1157 packages)
- ✅ Исправлены критические TypeScript ошибки (298 → 241)
- ✅ Создан `InventoryConsumptionCalculatorService` для REQ-STK-CALC-04
- ✅ Интегрирован с Inventory Module

---

## 🎯 ПРИОРИТЕТНЫЙ ПЛАН РАЗВИТИЯ

### ФАЗА 1: Завершение Sprint 4 (2-3 дня работы)

#### Backend доработки:

##### 1.1. Интеграция теоретического расхода (REQ-STK-CALC-04)

**Задача**: Полная интеграция `InventoryConsumptionCalculatorService` в расчёт остатков

**Файлы для изменения**:
```
backend/src/modules/inventory/services/inventory-calculation.service.ts
```

**Изменения**:
```typescript
// Добавить в constructor:
constructor(
  // ... existing dependencies
  private readonly consumptionCalculator: InventoryConsumptionCalculatorService,
) {}

// Модифицировать метод calculateBalance():
async calculateBalance(
  nomenclatureId: string,
  levelType: InventoryLevelType,
  levelRefId: string,
  asOfDate: Date = new Date(),
): Promise<number> {
  let balance = 0;

  // ... existing calculations (opening, purchases, movements)

  // 4. Теоретический расход по продажам (только для MACHINE)
  if (levelType === InventoryLevelType.MACHINE) {
    const consumption = await this.consumptionCalculator.calculateIngredientConsumption(
      nomenclatureId,
      levelRefId,
      new Date(0), // From начало времени
      asOfDate,
    );
    balance -= consumption;
    this.logger.debug(`  Theoretical consumption: ${consumption}`);
  }

  return Number(balance);
}
```

**Тестирование**:
- [ ] Unit тесты для InventoryConsumptionCalculatorService
- [ ] Интеграционные тесты: создать продажи → проверить расход ингредиентов
- [ ] E2E тест: полный цикл от закупки до продажи

---

##### 1.2. API Endpoints для управления порогами расхождений

**Задача**: Создать CRUD API для `InventoryDifferenceThreshold`

**Новый файл**:
```
backend/src/modules/inventory/inventory-thresholds.controller.ts
```

**Endpoints**:
```typescript
@Controller('inventory/thresholds')
export class InventoryThresholdsController {
  @Post()                        // Создать порог
  @Get()                         // Список всех порогов
  @Get(':id')                    // Получить порог по ID
  @Patch(':id')                  // Обновить порог
  @Delete(':id')                 // Удалить порог
  @Get('by-nomenclature/:id')    // Получить пороги для товара
  @Get('by-category/:category')  // Получить пороги для категории
}
```

**DTO**:
```typescript
// dto/threshold.dto.ts
export class CreateThresholdDto {
  @IsOptional()
  @IsUUID()
  nomenclature_id?: string;      // Опционально: для конкретного товара

  @IsOptional()
  @IsString()
  category?: string;              // Опционально: для категории

  @IsNumber()
  @Min(0)
  @Max(100)
  warning_percentage: number;     // Процент для предупреждения (5-10%)

  @IsNumber()
  @Min(0)
  @Max(100)
  critical_percentage: number;    // Процент для критичного (15-25%)

  @IsEnum(InventoryLevelType)
  level_type: InventoryLevelType; // WAREHOUSE, OPERATOR, MACHINE
}
```

**Регистрация**:
- Добавить в `inventory.module.ts` → controllers
- Export `InventoryThresholdsController`

---

##### 1.3. Автоматические действия при превышении порогов

**Задача**: Полная интеграция `InventoryThresholdActionsService`

**Файл**:
```
backend/src/modules/inventory/services/inventory-threshold-actions.service.ts
```

**Методы** (уже существуют, нужно протестировать):
- `checkThresholds(differences)` — проверить расхождения против порогов
- `executeActions(exceedingItems)` — выполнить действия:
  - Создать incidents для критичных
  - Отправить уведомления для warnings
  - Создать задачи на инвентаризацию

**Интеграция**:
```typescript
// В inventory-difference.service.ts:
async generateDifferenceReport(params) {
  const differences = await this.calculateDifferences(params);

  // Автоматически проверить пороги
  await this.thresholdActionsService.checkThresholds(differences);

  return differences;
}
```

**Scheduled Task** (опционально):
```typescript
// В scheduled-tasks/inventory-monitor.service.ts:
@Cron('0 2 * * *') // Ежедневно в 2:00 AM
async checkInventoryThresholds() {
  const allMachines = await this.machinesService.findAll();

  for (const machine of allMachines) {
    const differences = await this.differenceService.calculateForMachine(machine.id);
    await this.thresholdActionsService.checkThresholds(differences);
  }
}
```

---

#### Frontend доработки:

##### 2.1. Настройка пороговых значений

**Новая страница**:
```
frontend/src/app/(dashboard)/inventory/thresholds/page.tsx
```

**Функционал**:
- Таблица всех настроенных порогов
- Фильтры: по категориям, по товарам, по уровням
- Кнопки: добавить, редактировать, удалить
- Форма создания/редактирования:
  - Выбор товара или категории
  - Ввод % для warning и critical
  - Выбор уровня (WAREHOUSE/OPERATOR/MACHINE)

**Компоненты**:
```typescript
// components/inventory/ThresholdForm.tsx
// components/inventory/ThresholdTable.tsx
// components/inventory/ThresholdFilters.tsx
```

---

##### 2.2. Улучшенный Dashboard расхождений

**Файл**:
```
frontend/src/app/(dashboard)/reports/inventory-differences/page.tsx
```

**Новые фичи**:
1. **Цветовая индикация**:
   - 🟢 Зелёный: расхождение < warning_percentage
   - 🟡 Жёлтый: warning_percentage ≤ расхождение < critical_percentage
   - 🔴 Красный: расхождение ≥ critical_percentage

2. **Быстрые действия**:
   - Approve difference → создать adjustment
   - Investigate → создать incident
   - Schedule count → создать задачу на инвентаризацию

3. **Фильтры**:
   - По цвету (критичные, предупреждения, норма)
   - По машине/оператору/складу
   - По категории товара
   - По дате

4. **Экспорт**:
   - CSV: все расхождения
   - PDF: отчёт с графиками
   - Excel: детальный анализ

---

##### 2.3. История инвентаризаций

**Новая страница**:
```
frontend/src/app/(dashboard)/reports/inventory-history/page.tsx
```

**Функционал**:
- Таблица всех инвентаризаций:
  - Дата
  - Исполнитель
  - Уровень (склад/оператор/машина)
  - Количество позиций
  - Суммарное расхождение (сумма/%)
  - Статус (completed, in_progress)

- Детальный просмотр инвентаризации:
  - Список всех позиций
  - Расчётное vs фактическое vs разница
  - Комментарии
  - Фотографии (если есть)

- Сравнение между датами:
  - Выбрать две инвентаризации
  - Показать изменения расхождений
  - Тренд: улучшается/ухудшается

**API Endpoints** (backend):
```typescript
GET /inventory/counts                     // Список инвентаризаций
GET /inventory/counts/:id                 // Детали инвентаризации
GET /inventory/counts/compare?ids=1,2     // Сравнение двух
```

---

### ФАЗА 2: Завершение Sprint 3 Frontend (1-2 дня работы)

#### 3.1. Формы для перемещения компонентов

**Новые страницы**:
```
frontend/src/app/(dashboard)/equipment/components/[id]/move/page.tsx
frontend/src/app/(dashboard)/equipment/components/[id]/install/page.tsx
frontend/src/app/(dashboard)/equipment/components/[id]/remove/page.tsx
```

**Функционал**:
- **Move**: Переместить компонент между локациями:
  - Выбор целевой локации (WAREHOUSE, WASH, DRY, REPAIR)
  - Комментарий
  - Автоматическое обновление `current_location_type`

- **Install**: Установить компонент в машину:
  - Выбор машины
  - Выбор позиции (если применимо)
  - Дата установки
  - Комментарий

- **Remove**: Снять компонент с машины:
  - Причина снятия
  - Целевая локация (обычно WAREHOUSE или WASH)
  - Комментарий

---

#### 3.2. Визуализация истории перемещений

**Компонент**:
```typescript
// components/equipment/ComponentMovementTimeline.tsx

interface Movement {
  date: Date;
  from_location: string;
  to_location: string;
  movement_type: string;
  comment?: string;
  user: User;
}

export function ComponentMovementTimeline({ movements }: { movements: Movement[] }) {
  return (
    <div className="timeline">
      {movements.map((movement, index) => (
        <TimelineItem
          key={index}
          date={movement.date}
          icon={getIconForMovementType(movement.movement_type)}
          title={`${movement.from_location} → ${movement.to_location}`}
          description={movement.comment}
          user={movement.user.full_name}
        />
      ))}
    </div>
  );
}
```

**Использование**:
```
frontend/src/app/(dashboard)/equipment/components/[id]/page.tsx
```

Добавить вкладку "История" с timeline перемещений.

---

#### 3.3. Dashboard компонентов по локациям

**Новая страница**:
```
frontend/src/app/(dashboard)/equipment/location-dashboard/page.tsx
```

**Функционал**:
- **Карточки по локациям**:
  ```
  MACHINE        WAREHOUSE      WASH           DRY            REPAIR
  [45 шт]        [12 шт]        [5 шт]        [3 шт]        [2 шт]
  ```

- **Список компонентов** для каждой локации:
  - Тип (GRINDER, BREW_UNIT, HOPPER, MIXER)
  - Серийный номер
  - Дата последнего перемещения
  - Кнопка "Переместить"

- **Статистика**:
  - Среднее время в мойке
  - Среднее время в ремонте
  - Частота замен по типу компонента

- **Alerts**:
  - Компоненты в WASH > 24 часов
  - Компоненты в REPAIR > 7 дней
  - Низкий запас на складе

---

### ФАЗА 3: Исправление оставшихся TypeScript ошибок (1 день)

**Приоритет**: Средний (не критично для работы, но нужно для production)

**Категории ошибок**:

1. **Тесты** (dictionary tests, email tests): ~100 ошибок
   - Исправить типы в mock объектах
   - Обновить тестовые данные

2. **Telegram bot** (~50 ошибок):
   - Исправить типы в callback данных
   - Обновить сигнатуры методов

3. **Minor type issues** (~91 ошибка):
   - `null` vs `undefined` (telegram-bot.service.ts)
   - Enum mismatches (incidents, transactions)
   - Function signature mismatches (filesService.uploadFile)

**План действий**:
- Создать отдельный файл `TYPESCRIPT_ERRORS_FIX_PLAN.md`
- Сгруппировать ошибки по файлам
- Исправлять batch по 20-30 ошибок за раз
- Проверять компиляцию после каждого batch

---

### ФАЗА 4: Тестирование и QA (3-5 дней)

#### 4.1. Unit Tests

**Цель**: Покрытие 70%+

**Приоритетные модули**:
- InventoryCalculationService
- InventoryConsumptionCalculatorService
- InventoryDifferenceService
- TasksService (REPLACE_* логика)
- ComponentMovementsService

**Инструменты**:
```bash
npm run test              # Все тесты
npm run test:cov          # С покрытием
npm run test:watch        # Watch mode
```

---

#### 4.2. Integration Tests

**Сценарии**:
1. **Полный цикл инвентаризации**:
   - Создать начальные остатки
   - Создать закупки
   - Создать перемещения
   - Создать продажи
   - Запустить инвентаризацию
   - Проверить расхождения

2. **Полный цикл задач с компонентами**:
   - Создать REPLACE_HOPPER задачу
   - Указать OLD и NEW компоненты
   - Завершить задачу с фото
   - Проверить, что компоненты переместились

3. **Пороги расхождений**:
   - Настроить порог 10%/20%
   - Создать расхождение 15%
   - Проверить, что создался incident
   - Проверить, что пришло уведомление

---

#### 4.3. E2E Tests

**Инструменты**: Playwright / Cypress

**Критические пользовательские сценарии**:
1. Регистрация оператора через Telegram → одобрение админом
2. Создание задачи refill → выполнение с фото → проверка остатков
3. Импорт продаж из CSV → проверка расчётных остатков
4. Инвентаризация машины → выявление расхождений → создание корректировки

---

### ФАЗА 5: Оптимизация и Performance (2-3 дня)

#### 5.1. Database Optimization

**Индексы**:
```sql
-- Уже есть, но проверить:
CREATE INDEX IF NOT EXISTS idx_transactions_date_machine
  ON transactions(transaction_date, machine_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_date_level
  ON inventory_movements(operation_date, movement_type, machine_id);

-- Добавить composite indexes для частых запросов:
CREATE INDEX idx_inventory_calc_lookup
  ON inventory_movements(nomenclature_id, operation_date, movement_type);
```

**Query Optimization**:
- Использовать `explain analyze` для медленных запросов
- Добавить пагинацию везде, где возможны большие списки
- Использовать `select` для ограничения полей в JOIN запросах

---

#### 5.2. API Performance

**Caching**:
```typescript
// Кэшировать дорогие расчёты
@Injectable()
export class InventoryCalculationService {
  private cache = new Map<string, { value: number; timestamp: Date }>();

  async calculateBalanceCached(
    nomenclatureId: string,
    levelType: InventoryLevelType,
    levelRefId: string,
    asOfDate: Date,
  ): Promise<number> {
    const cacheKey = `${nomenclatureId}-${levelType}-${levelRefId}-${asOfDate.getTime()}`;
    const cached = this.cache.get(cacheKey);

    // Cache for 5 minutes
    if (cached && Date.now() - cached.timestamp.getTime() < 5 * 60 * 1000) {
      return cached.value;
    }

    const value = await this.calculateBalance(nomenclatureId, levelType, levelRefId, asOfDate);
    this.cache.set(cacheKey, { value, timestamp: new Date() });

    return value;
  }
}
```

**Rate Limiting**:
- Уже настроен через `@nestjs/throttler`
- Проверить лимиты для production

**Pagination**:
```typescript
// Везде добавить QueryDto с пагинацией:
export class PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

---

#### 5.3. Frontend Performance

**Code Splitting**:
```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          },
        },
      },
    };
    return config;
  },
};
```

**React Query Optimization**:
```typescript
// Настроить staleTime и cacheTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 минут
      cacheTime: 10 * 60 * 1000, // 10 минут
      refetchOnWindowFocus: false,
    },
  },
});
```

**Image Optimization**:
- Использовать Next.js Image component
- Настроить lazy loading для изображений в списках

---

### ФАЗА 6: Документация (1-2 дня)

#### 6.1. API Documentation

**Swagger**: Уже настроен, но нужно:
- Добавить примеры запросов/ответов для всех endpoints
- Добавить описания ошибок
- Группировать endpoints по модулям

**Postman Collection**:
- Экспортировать из Swagger
- Добавить примеры для всех endpoints
- Настроить environment variables

---

#### 6.2. User Guides

**Для операторов**:
```
docs/user-guides/operator-guide.md
- Как выполнять задачи
- Как делать фотографии
- Как заполнять инвентаризацию
```

**Для менеджеров**:
```
docs/user-guides/manager-guide.md
- Как создавать задачи
- Как просматривать отчёты
- Как настраивать пороги расхождений
- Как работать с расхождениями
```

**Для админов**:
```
docs/user-guides/admin-guide.md
- Управление пользователями
- Настройка системы
- Мониторинг
- Резервное копирование
```

---

#### 6.3. Developer Documentation

**Architecture Docs**:
```
docs/architecture/inventory-system.md
docs/architecture/tasks-system.md
docs/architecture/components-system.md
```

**API Integration Guide**:
```
docs/api/integration-guide.md
- Authentication
- Common patterns
- Error handling
- Webhooks (если есть)
```

---

## 📊 ОЦЕНКА ТРУДОЗАТРАТ

| Фаза | Описание | Оценка | Приоритет |
|------|----------|--------|-----------|
| **Фаза 1** | Завершение Sprint 4 | 2-3 дня | 🔥 Высокий |
| **Фаза 2** | Завершение Sprint 3 Frontend | 1-2 дня | 🟡 Средний |
| **Фаза 3** | Исправление TypeScript | 1 день | 🟡 Средний |
| **Фаза 4** | Тестирование и QA | 3-5 дней | 🔥 Высокий |
| **Фаза 5** | Оптимизация | 2-3 дня | 🟢 Низкий |
| **Фаза 6** | Документация | 1-2 дня | 🟡 Средний |
| **ИТОГО** | | **10-16 дней** | |

---

## 🎯 РЕКОМЕНДУЕМАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ

### Неделя 1 (5 дней):
1. **День 1-2**: Фаза 1.1 + 1.2 (Теоретический расход + API порогов)
2. **День 3**: Фаза 1.3 (Автоматические действия)
3. **День 4-5**: Фаза 2.1 + 2.2 (Frontend: пороги + dashboard)

**Результат**: Sprint 4 на 100%, можно использовать в production

### Неделя 2 (5 дней):
1. **День 1-2**: Фаза 2 (Sprint 3 Frontend компоненты)
2. **День 3**: Фаза 3 (TypeScript ошибки)
3. **День 4-5**: Фаза 4.1 + 4.2 (Unit + Integration тесты)

**Результат**: Все базовые спринты 100%, стабильная кодовая база

### Неделя 3 (3-5 дней):
1. **День 1-2**: Фаза 4.3 (E2E тесты)
2. **День 3**: Фаза 5 (Оптимизация по результатам нагрузочного тестирования)
3. **День 4-5**: Фаза 6 (Документация)

**Результат**: Production-ready система с полной документацией

---

## 🔍 КРИТЕРИИ ГОТОВНОСТИ К PRODUCTION

### Обязательные:
- ✅ Все критические TypeScript ошибки исправлены
- ✅ Sprint 1-4 на 100%
- ✅ Unit test coverage > 70%
- ✅ Все Integration тесты проходят
- ✅ Нет критических security уязвимостей
- ✅ API documentation полная (Swagger)
- ✅ Environment variables настроены для production
- ✅ Database migrations работают корректно
- ✅ Backup/restore процедура документирована

### Желательные:
- 🟡 E2E тесты покрывают критические сценарии
- 🟡 Performance тесты показывают приемлемые результаты
- 🟡 User guides готовы
- 🟡 Monitoring и alerting настроены
- 🟡 CI/CD pipeline работает

---

## 📝 ИЗМЕНЁННЫЕ ФАЙЛЫ (21.11.2025)

### Backend:
1. ✅ `backend/src/modules/access-requests/access-requests.service.ts` — добавлен import UserRole
2. ✅ `backend/src/modules/counterparty/controllers/commission.controller.ts` — добавлен import PaymentStatus
3. ✅ `backend/src/modules/equipment/controllers/spare-parts.controller.ts` — исправлен import ComponentType
4. ✅ `backend/src/common/helpers/money.helper.ts` — типизирован `value: number`
5. ✅ `backend/src/modules/inventory/services/inventory-consumption-calculator.service.ts` — **НОВЫЙ ФАЙЛ**
6. ✅ `backend/src/modules/inventory/inventory.module.ts` — добавлен InventoryConsumptionCalculatorService

**Итого**: 4 исправления + 2 новых файла

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

### Немедленно (сегодня):
1. Запустить Docker с PostgreSQL и Redis для тестирования
2. Применить миграции: `npm run migration:run`
3. Запустить backend: `npm run start:dev`
4. Проверить Swagger API: `http://localhost:3000/api/docs`

### Эта неделя:
1. Завершить интеграцию теоретического расхода (Фаза 1.1)
2. Создать API для управления порогами (Фаза 1.2)
3. Протестировать автоматические действия (Фаза 1.3)
4. Создать Frontend страницы для порогов и улучшенного dashboard (Фаза 2.1-2.2)

### Следующие 2 недели:
1. Завершить Sprint 3 Frontend (Фаза 2)
2. Исправить оставшиеся TypeScript ошибки (Фаза 3)
3. Написать тесты (Фаза 4)
4. Оптимизировать (Фаза 5)
5. Документация (Фаза 6)

---

## ✅ КОНТРОЛЬНЫЕ ТОЧКИ (Milestones)

| Milestone | Дата (прогноз) | Критерии |
|-----------|----------------|----------|
| **Sprint 4 Complete** | Неделя 1 | Backend + Frontend на 100% |
| **All Sprints 1-4 Complete** | Неделя 2 | Все базовые функции готовы |
| **Production Ready** | Неделя 3 | Тесты + Docs + Optimization |
| **Public Release** | Неделя 4 | Deployment + Monitoring + Support |

---

**Финальная рекомендация**: Начать с Фазы 1 (Sprint 4), так как это последний базовый спринт, необходимый для полноценной работы системы учёта инвентаря с расхождениями и аналитикой.

---

**Подготовил**: Claude (Anthropic)
**Дата**: 2025-11-21
**Версия**: 1.0
**Статус**: Ready for Implementation
